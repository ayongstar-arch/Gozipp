import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DriverService } from './driver.service';
import { PassengerService } from './passenger.service';
import { ChatService } from './chat.service';
import { TripActionDto } from './dtos';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AppGateway.name);

  // Map: socketId → { userId, role }
  private connectedUsers = new Map<string, { userId: string; role: string }>();

  constructor(
    private readonly driverService: DriverService,
    private readonly passengerService: PassengerService,
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) { }

  // --- CONNECTION WITH JWT AUTH ---

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) throw new UnauthorizedException('No token');

      const payload = this.jwtService.verify(token);
      this.connectedUsers.set(client.id, { userId: payload.sub, role: payload.role });

      // Join personal room
      client.join(`user:${payload.sub}`);
      this.logger.log(`[WS] Connected: ${client.id} (${payload.role} ${payload.sub})`);

      // Restore active state upon reconnection
      if (payload.role === 'DRIVER') {
        const activeTrip = await this.driverService.getActiveTripForDriver(payload.sub);
        if (activeTrip) {
          client.join(`trip:${activeTrip.id}`);
          client.emit('STATE_RESTORED', {
            type: 'ACTIVE_TRIP',
            trip: activeTrip,
          });
          this.logger.log(`[WS] Restored active trip ${activeTrip.id} for Driver ${payload.sub}`);
        }
      } else if (payload.role === 'PASSENGER') {
        const activeTrip = await this.passengerService.getActiveTripForPassenger(payload.sub);
        if (activeTrip) {
          client.join(`trip:${activeTrip.id}`);
          client.emit('STATE_RESTORED', {
            type: 'ACTIVE_TRIP',
            trip: activeTrip,
          });
          this.logger.log(`[WS] Restored active trip ${activeTrip.id} for Passenger ${payload.sub}`);
        }
      }
    } catch (err) {
      this.logger.warn(`[WS] Rejected unauthenticated connection: ${client.id}`);
      client.emit('AUTH_ERROR', { message: 'Authentication required' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      this.logger.log(`[WS] Disconnected: ${client.id} (${user.role} ${user.userId})`);
    }
    this.connectedUsers.delete(client.id);
  }

  private getUser(client: Socket) {
    return this.connectedUsers.get(client.id);
  }

  // --- DRIVER: STATUS ---

  @SubscribeMessage('DRIVER_UPDATE_STATUS')
  async handleDriverStatus(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'DRIVER') return;

    if (data.status === 'IDLE' && data.location) {
      const res = await this.driverService.goOnline({
        driverId: user.userId,
        lat: data.location.lat,
        lng: data.location.lng,
      });
      client.emit('SYSTEM_MESSAGE', { text: res.message, status: res.status });
    }
    this.server.emit('DRIVER_UPDATE_STATUS', { ...data, driverId: user.userId });
  }

  // --- DRIVER: LOCATION (real-time broadcast) ---

  @SubscribeMessage('DRIVER_LOCATION_UPDATE')
  handleDriverLocation(@MessageBody() data: { lat: number; lng: number; heading?: number }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'DRIVER') return;
    // Broadcast to any socket listening to this driver's location feed
    this.server.emit(`DRIVER_LOCATION_${user.userId}`, data);
  }

  // --- DRIVER: TRIP ACTIONS ---

  @SubscribeMessage('TRIP_ACCEPT')
  async handleTripAccept(@MessageBody() data: TripActionDto & { passengerId?: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'DRIVER') return;
    try {
      data.driverId = user.userId;
      await this.driverService.acceptTrip(data);
      if (data.passengerId) {
        this.server.to(`user:${data.passengerId}`).emit('TRIP_ACCEPT', { driverId: user.userId, tripId: data.tripId });
      }
      this.server.to(`trip:${data.tripId}`).emit('TRIP_STATUS_UPDATE', { tripId: data.tripId, status: 'ACCEPTED', driverId: user.userId });
    } catch (e) {
      client.emit('TRIP_ERROR', { message: e.message });
    }
  }

  @SubscribeMessage('TRIP_DRIVER_ARRIVED')
  handleDriverArrived(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'DRIVER') return;
    this.server.to(`trip:${data.tripId}`).emit('TRIP_STATUS_UPDATE', { tripId: data.tripId, status: 'DRIVER_ARRIVED' });
  }

  @SubscribeMessage('TRIP_START')
  handleTripStart(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'DRIVER') return;
    this.server.to(`trip:${data.tripId}`).emit('TRIP_STATUS_UPDATE', { tripId: data.tripId, status: 'IN_PROGRESS' });
  }

  @SubscribeMessage('TRIP_COMPLETE')
  async handleTripComplete(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'DRIVER') return;
    try {
      await this.driverService.completeTrip({ driverId: user.userId, tripId: data.tripId });
      this.server.to(`trip:${data.tripId}`).emit('TRIP_STATUS_UPDATE', { tripId: data.tripId, status: 'COMPLETED' });
      this.server.to(`trip:${data.tripId}`).emit('TRIP_COMPLETE', { tripId: data.tripId });
    } catch (e) {
      client.emit('TRIP_ERROR', { message: e.message });
    }
  }

  @SubscribeMessage('TRIP_JOIN_ROOM')
  handleTripJoinRoom(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    client.join(`trip:${data.tripId}`);
  }

  // --- PASSENGER: CANCEL ---

  @SubscribeMessage('RIDE_CANCEL')
  handleRideCancel(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user) return;
    this.server.to(`trip:${data.tripId}`).emit('RIDE_CANCEL', { tripId: data.tripId });
  }

  // --- CHAT ---

  @SubscribeMessage('CHAT_JOIN_ROOM')
  handleChatJoinRoom(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    client.join(`trip:${data.tripId}`);
  }

  @SubscribeMessage('CHAT_LEAVE_ROOM')
  handleChatLeaveRoom(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`trip:${data.tripId}`);
  }

  @SubscribeMessage('CHAT_SEND')
  async handleChatSend(@MessageBody() data: { tripId: string; content: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user) return;
    try {
      const savedMessage = await this.chatService.saveMessage({
        tripId: data.tripId,
        senderId: user.userId,
        senderType: user.role === 'DRIVER' ? 'DRIVER' : 'PASSENGER',
        content: data.content,
      });
      this.server.to(`trip:${data.tripId}`).emit('CHAT_RECEIVE', savedMessage);
    } catch {
      client.emit('CHAT_ERROR', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('CHAT_GET_HISTORY')
  async handleChatGetHistory(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    try {
      const messages = await this.chatService.getMessagesByTripId(data.tripId);
      client.emit('CHAT_HISTORY', { tripId: data.tripId, messages });
    } catch (e) {
      this.logger.error(`Chat history error: ${e.message}`);
    }
  }

  @SubscribeMessage('CHAT_TYPING')
  handleChatTyping(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user) return;
    client.to(`trip:${data.tripId}`).emit('CHAT_TYPING', { senderId: user.userId });
  }

  @SubscribeMessage('CHAT_MARK_READ')
  async handleChatMarkRead(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user) return;
    try {
      await this.chatService.markMessagesAsRead(data.tripId, user.userId);
      this.server.to(`trip:${data.tripId}`).emit('CHAT_READ_RECEIPT', { tripId: data.tripId, readerId: user.userId });
    } catch (e) {
      this.logger.error(`Mark read error: ${e.message}`);
    }
  }

  // --- SOS ---

  @SubscribeMessage('SOS_TRIGGER')
  handleSOSTrigger(@MessageBody() data: { tripId?: string; location: { lat: number; lng: number } }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user) return;
    this.logger.warn(`SOS by ${user.role} ${user.userId}`);
    this.server.to('admin').emit('ADMIN_SOS_ALERT', {
      id: `SOS-${Date.now()}`,
      userId: user.userId,
      userType: user.role,
      tripId: data.tripId,
      location: data.location,
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
    });
    client.emit('SOS_ACKNOWLEDGED', { message: 'SOS รับทราบแล้ว กำลังส่งความช่วยเหลือ' });
  }
}
