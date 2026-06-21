import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DriverService } from './driver.service';
import { PassengerService } from './passenger.service';
import { ChatService } from './chat.service';
import { SosService } from './sos.service';
import { TripActionDto } from './dtos';
import { FairQueueService } from './fair-queue.service';
import Redis from 'ioredis';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AppGateway.name);

  // Map: socketId → { userId, role }
  private connectedUsers = new Map<string, { userId: string; role: string }>();
  private readonly redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  private readonly subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  constructor(
    private readonly driverService: DriverService,
    private readonly passengerService: PassengerService,
    private readonly chatService: ChatService,
    private readonly sosService: SosService,
    private readonly jwtService: JwtService,
    private readonly fairQueueService: FairQueueService,
  ) { }

  async onModuleInit() {
    await this.subscriber.subscribe('ride:requested');
    this.subscriber.on('message', (_channel, tripId) => {
      void this.offerTripToNextDriver(tripId);
    });
    const restoredTripIds = await this.passengerService.resumeSearchingTrips();
    for (const tripId of restoredTripIds) void this.offerTripToNextDriver(tripId);
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.subscriber.quit(), this.redis.quit()]);
  }

  private async offerTripToNextDriver(tripId: string) {
    const lockKey = `dispatch:${tripId}:lock`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (!acquired) return;

    try {
      const trip = await this.passengerService.getTripForDispatch(tripId);
      if (!trip || trip.status !== 'SEARCHING') return;

      let driverId: string | null = null;
      let stationId: string | null = null;
      for (const candidateStation of this.fairQueueService.rankStationsByDistance(trip.pickup.lat, trip.pickup.lng)) {
        driverId = await this.fairQueueService.popBestDriver(candidateStation);
        if (driverId) {
          stationId = candidateStation;
          break;
        }
      }

      if (!driverId) {
        this.server.to(`user:${trip.passengerId}`).emit('DISPATCH_WAITING', { tripId });
        return;
      }

      await this.redis.hset(`trip:${tripId}`, 'offeredDriverId', driverId, 'stationId', stationId || '');
      this.server.to(`user:${driverId}`).emit('RIDE_OFFER', {
        trip,
        expiresInSeconds: 15,
      });

      setTimeout(() => void this.expireDriverOffer(tripId, driverId!, stationId), 15000);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async expireDriverOffer(tripId: string, driverId: string, stationId: string | null) {
    const [status, offeredDriverId] = await this.redis.hmget(`trip:${tripId}`, 'status', 'offeredDriverId');
    if (status !== 'SEARCHING' || offeredDriverId !== driverId) return;
    await this.redis.hdel(`trip:${tripId}`, 'offeredDriverId');
    if (stationId) await this.fairQueueService.handleTimeout(stationId, driverId);
    await this.offerTripToNextDriver(tripId);
  }

  // --- CONNECTION WITH JWT AUTH ---

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '') ||
        this.getCookie(client.handshake.headers?.cookie, 'access_token');

      if (!token) throw new UnauthorizedException('No token');

      const payload = this.jwtService.verify(token);
      this.connectedUsers.set(client.id, { userId: payload.sub, role: payload.role });

      // Join personal room
      client.join(`user:${payload.sub}`);
      if (payload.role === 'ADMIN' || payload.role === 'SUPERADMIN' || payload.role === 'SUPER') {
        client.join('admin');
      }
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
          const driver = await this.driverService.getPublicDriver(activeTrip.driver_id);
          client.join(`trip:${activeTrip.id}`);
          client.emit('STATE_RESTORED', {
            type: 'ACTIVE_TRIP',
            trip: { ...activeTrip, driver },
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

  private getCookie(header: string | undefined, name: string): string | undefined {
    if (!header) return undefined;
    for (const part of header.split(';')) {
      const [key, ...value] = part.trim().split('=');
      if (key === name) return decodeURIComponent(value.join('='));
    }
    return undefined;
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
      const waitingTrips = await this.passengerService.getSearchingTripIds();
      for (const tripId of waitingTrips) void this.offerTripToNextDriver(tripId);
    }
  }

  // --- DRIVER: LOCATION (real-time broadcast) ---

  @SubscribeMessage('DRIVER_LOCATION_UPDATE')
  async handleDriverLocation(@MessageBody() data: { lat: number; lng: number; heading?: number }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'DRIVER') return;
    const trip = await this.driverService.getActiveTripForDriver(user.userId);
    if (!trip) return;
    this.server.to(`trip:${trip.id}`).emit('DRIVER_LOCATION_UPDATE', { tripId: trip.id, ...data });
  }

  // --- DRIVER: TRIP ACTIONS ---

  @SubscribeMessage('TRIP_ACCEPT')
  async handleTripAccept(@MessageBody() data: TripActionDto & { passengerId?: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'DRIVER') return;
    try {
      data.driverId = user.userId;
      const offeredDriverId = await this.redis.hget(`trip:${data.tripId}`, 'offeredDriverId');
      if (offeredDriverId !== user.userId) throw new UnauthorizedException('Trip was not offered to this driver');
      const result = await this.driverService.acceptTrip(data);
      await this.redis.hdel(`trip:${data.tripId}`, 'offeredDriverId');
      client.join(`trip:${data.tripId}`);
      this.server.to(`user:${result.passengerId}`).emit('TRIP_ACCEPT', {
        tripId: data.tripId,
        driver: result.driver,
      });
      this.server.to(`trip:${data.tripId}`).emit('TRIP_STATUS_UPDATE', { tripId: data.tripId, status: 'ACCEPTED', driver: result.driver });
    } catch (e) {
      client.emit('TRIP_ERROR', { message: e.message });
    }
  }

  @SubscribeMessage('TRIP_REJECT')
  async handleTripReject(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'DRIVER') return;
    const [offeredDriverId, stationId] = await this.redis.hmget(`trip:${data.tripId}`, 'offeredDriverId', 'stationId');
    if (offeredDriverId !== user.userId) return;
    await this.redis.hdel(`trip:${data.tripId}`, 'offeredDriverId');
    if (stationId) await this.fairQueueService.handleTimeout(stationId, user.userId);
    await this.offerTripToNextDriver(data.tripId);
  }

  @SubscribeMessage('TRIP_DRIVER_ARRIVED')
  async handleDriverArrived(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'DRIVER') return;
    try {
      await this.driverService.markDriverArrived(user.userId, data.tripId);
      this.server.to(`trip:${data.tripId}`).emit('TRIP_STATUS_UPDATE', { tripId: data.tripId, status: 'DRIVER_ARRIVED' });
    } catch (e) {
      client.emit('TRIP_ERROR', { message: e.message });
    }
  }

  @SubscribeMessage('TRIP_START')
  async handleTripStart(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'DRIVER') return;
    try {
      await this.driverService.startTrip(user.userId, data.tripId);
      this.server.to(`trip:${data.tripId}`).emit('TRIP_STATUS_UPDATE', { tripId: data.tripId, status: 'IN_PROGRESS' });
    } catch (e) {
      client.emit('TRIP_ERROR', { message: e.message });
    }
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
  async handleTripJoinRoom(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || !(await this.passengerService.canAccessTrip(data.tripId, user.userId))) {
      client.emit('TRIP_ERROR', { message: 'Trip access denied' });
      return;
    }
    client.join(`trip:${data.tripId}`);
  }

  // --- PASSENGER: CANCEL ---

  @SubscribeMessage('RIDE_CANCEL')
  async handleRideCancel(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || user.role !== 'PASSENGER' || !(await this.passengerService.canAccessTrip(data.tripId, user.userId))) return;
    this.server.to(`trip:${data.tripId}`).emit('RIDE_CANCEL', { tripId: data.tripId });
  }

  // --- CHAT ---

  @SubscribeMessage('CHAT_JOIN_ROOM')
  async handleChatJoinRoom(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || !(await this.passengerService.canAccessTrip(data.tripId, user.userId))) {
      client.emit('CHAT_ERROR', { message: 'Trip access denied' });
      return;
    }
    client.join(`trip:${data.tripId}`);
  }

  @SubscribeMessage('CHAT_LEAVE_ROOM')
  handleChatLeaveRoom(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`trip:${data.tripId}`);
  }

  @SubscribeMessage('CHAT_SEND')
  async handleChatSend(@MessageBody() data: { tripId: string; content: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || !(await this.passengerService.canAccessTrip(data.tripId, user.userId))) {
      client.emit('CHAT_ERROR', { message: 'Trip access denied' });
      return;
    }
    try {
      const content = (data.content || '').trim().slice(0, 500);
      if (!content) {
        client.emit('CHAT_ERROR', { message: 'Message cannot be empty' });
        return;
      }
      const savedMessage = await this.chatService.saveMessage({
        tripId: data.tripId,
        senderId: user.userId,
        senderType: user.role === 'DRIVER' ? 'DRIVER' : 'PASSENGER',
        content,
      });
      this.server.to(`trip:${data.tripId}`).emit('CHAT_RECEIVE', savedMessage);
    } catch {
      client.emit('CHAT_ERROR', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('CHAT_GET_HISTORY')
  async handleChatGetHistory(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    try {
      const user = this.getUser(client);
      if (!user || !(await this.passengerService.canAccessTrip(data.tripId, user.userId))) {
        client.emit('CHAT_ERROR', { message: 'Trip access denied' });
        return;
      }
      const messages = await this.chatService.getMessagesByTripId(data.tripId);
      client.emit('CHAT_HISTORY', { tripId: data.tripId, messages });
    } catch (e) {
      this.logger.error(`Chat history error: ${e.message}`);
    }
  }

  @SubscribeMessage('CHAT_TYPING')
  async handleChatTyping(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || !(await this.passengerService.canAccessTrip(data.tripId, user.userId))) return;
    client.to(`trip:${data.tripId}`).emit('CHAT_TYPING', { senderId: user.userId });
  }

  @SubscribeMessage('CHAT_MARK_READ')
  async handleChatMarkRead(@MessageBody() data: { tripId: string }, @ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    if (!user || !(await this.passengerService.canAccessTrip(data.tripId, user.userId))) return;
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

    void this.sosService.createEvent({
      userId: user.userId,
      userType: user.role === 'DRIVER' ? 'DRIVER' : 'PASSENGER',
      tripId: data.tripId,
      location: data.location,
    }).then((event) => {
      this.logger.warn(`SOS by ${user.role} ${user.userId}`);
      this.server.to('admin').emit('ADMIN_SOS_ALERT', {
        id: event.id,
        userId: user.userId,
        userType: user.role,
        tripId: data.tripId,
        location: data.location,
        timestamp: event.created_at,
        status: 'ACTIVE',
      });
      client.emit('SOS_ACKNOWLEDGED', { message: 'SOS acknowledged. Help is on the way.' });
    }).catch((err) => {
      this.logger.error(`SOS create failed: ${err.message}`);
      client.emit('SOS_ERROR', { message: 'Failed to create SOS alert' });
    });
  }
}
