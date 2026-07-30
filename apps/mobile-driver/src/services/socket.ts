import { EventEmitter } from 'events';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';
import { useRideStore } from '../stores/rideStore';
import { Rider } from '../types';

export interface ISocketService {
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
  removeAllListeners(event?: string): this;
  disconnect?(): void;
}

function parsePoint(geom: any): { lat: number; lng: number } {
  if (!geom) return { lat: 13.7563, lng: 100.5018 }; // Default Bangkok (Central)
  
  if (typeof geom === 'string') {
    // WKT e.g. "POINT(100.5018 13.7563)"
    const wktMatch = geom.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (wktMatch) {
      return {
        lng: parseFloat(wktMatch[1]),
        lat: parseFloat(wktMatch[2])
      };
    }
  } else if (typeof geom === 'object') {
    if (geom.coordinates && Array.isArray(geom.coordinates)) {
      return {
        lng: parseFloat(geom.coordinates[0]),
        lat: parseFloat(geom.coordinates[1])
      };
    }
    if (geom.lat !== undefined && geom.lng !== undefined) {
      return {
        lat: parseFloat(geom.lat),
        lng: parseFloat(geom.lng)
      };
    }
  }
  return { lat: 13.7563, lng: 100.5018 };
}

class SupabaseSocketService extends EventEmitter implements ISocketService {
  private newTripsChannel: any = null;
  private tripChangesChannel: any = null;
  private chatMessagesChannel: any = null;
  private chatTypingChannel: any = null;

  constructor() {
    super();
    console.log('[Supabase Socket] Initialized Supabase Realtime Socket Service.');
    
    // Periodically sync auth status
    setTimeout(() => {
      this.emit('connect');
    }, 100);

    // Watch ride store to auto-subscribe/unsubscribe from active trip updates
    useRideStore.subscribe((state) => {
      const tripId = state.currentTripId;
      if (tripId) {
        this.subscribeToTripChanges(tripId);
      } else {
        this.unsubscribeFromTripChanges();
      }
    });
  }

  public on(event: string, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public off(event: string, listener: (...args: any[]) => void): this {
    super.removeListener(event, listener);
    return this;
  }

  public removeAllListeners(event?: string): this {
    super.removeAllListeners(event);
    return this;
  }

  public emit(event: string, ...args: any[]): boolean {
    // Dispatch locally to components listening via socket.on()
    super.emit(event, ...args);

    // Forward to Supabase Operations
    this.handleEmit(event, args).catch((err) => {
      console.error(`[Supabase Socket Emit Error] for ${event}:`, err);
    });

    return true;
  }

  public disconnect() {
    this.unsubscribeFromNewTrips();
    this.unsubscribeFromTripChanges();
    this.emit('disconnect');
  }

  private async handleEmit(event: string, args: any[]): Promise<void> {
    const data = args[0];
    const driverId = useAuthStore.getState().user?.id;
    if (!driverId) {
      console.warn(`[Supabase Socket] Skip ${event}: driver session is missing`);
      return;
    }

    if (event === 'DRIVER_UPDATE_STATUS') {
      const status = data?.status; // 'IDLE', 'BUSY', 'OFFLINE'
      const loc = data?.location;
      const dbStatus = status === 'OFFLINE' ? 'OFFLINE' : (status === 'BUSY' ? 'BUSY' : 'IDLE');

      console.log(`[Supabase Socket] Update Driver Status: ${dbStatus} for driver: ${driverId}`);
      
      const updateData: any = {
        current_status: dbStatus,
        last_seen_at: new Date().toISOString()
      };

      if (loc && loc.lat && loc.lng) {
        updateData.last_known_location = `SRID=4326;POINT(${loc.lng} ${loc.lat})`;
      }

      await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', driverId);

      // Manage new trip subscription based on status
      if (dbStatus === 'IDLE') {
        this.subscribeToNewTrips();
      } else {
        this.unsubscribeFromNewTrips();
      }

      // Broadcast real-time location to passenger if driver is busy on a trip
      const currentTripId = useRideStore.getState().currentTripId;
      if (dbStatus === 'BUSY' && currentTripId && loc) {
        const channel = supabase.channel(`trip-tracking-${currentTripId}`);
        await channel.send({
          type: 'broadcast',
          event: 'location',
          payload: {
            tripId: currentTripId,
            lat: loc.lat,
            lng: loc.lng,
            heading: loc.heading || 0
          }
        });
      }
    } 
    
    else if (event === 'TRIP_ACCEPT') {
      const tripId = data?.tripId === 'T-1' ? useRideStore.getState().currentTripId : data?.tripId;
      const acceptDriverId = data?.driverId || driverId;

      console.log(`[Supabase Socket] Accept Trip: ${tripId} by driver: ${acceptDriverId}`);

      if (tripId) {
        // 1. Update trip status
        await supabase
          .from('trips')
          .update({
            status: 'ACCEPTED',
            driver_id: acceptDriverId,
            accepted_at: new Date().toISOString()
          })
          .eq('id', tripId);

        // 2. Update driver status
        await supabase
          .from('drivers')
          .update({ current_status: 'BUSY' })
          .eq('id', acceptDriverId);

        this.subscribeToTripChanges(tripId);
      }
    } 
    
    else if (event === 'TRIP_COMPLETE') {
      const tripId = useRideStore.getState().currentTripId;
      console.log(`[Supabase Socket] Complete Trip: ${tripId}`);

      if (tripId) {
        await supabase
          .from('trips')
          .update({
            status: 'COMPLETED',
            completed_at: new Date().toISOString()
          })
          .eq('id', tripId);

        await supabase
          .from('drivers')
          .update({ current_status: 'IDLE' })
          .eq('id', driverId);

        this.emit('TRIP_COMPLETE', { tripId });
      }
    } 
    
    else if (event === 'RIDE_CANCEL') {
      const tripId = useRideStore.getState().currentTripId;
      console.log(`[Supabase Socket] Cancel Trip: ${tripId}`);

      if (tripId) {
        await supabase
          .from('trips')
          .update({
            status: 'CANCELLED',
            cancelled_at: new Date().toISOString()
          })
          .eq('id', tripId);

        await supabase
          .from('drivers')
          .update({ current_status: 'IDLE' })
          .eq('id', driverId);

        this.emit('RIDE_CANCEL', { tripId });
      }
    } 
    
    else if (event === 'RIDE_REQUEST') {
      // Simulate passenger request in mobile-driver simulator
      const { tripId, location, targetWinId, message } = data || {};
      const pickupLat = location?.lat || 13.7563;
      const pickupLng = location?.lng || 100.5018;

      console.log(`[Supabase Socket] Simulator Ride Request: ${tripId}`);

      const newTrip = {
        id: tripId && tripId.startsWith('T-') && tripId.length > 10 ? undefined : tripId,
        passenger_id: data?.passengerId || null,
        station_id: targetWinId || 'WIN-CENTRAL-01',
        pickup_location: `SRID=4326;POINT(${pickupLng} ${pickupLat})`,
        pickup_address: 'จุดรับผู้โดยสาร',
        dest_location: `SRID=4326;POINT(${pickupLng + 0.01} ${pickupLat + 0.01})`,
        dest_address: 'จุดส่งผู้โดยสาร',
        fare: 20.00,
        status: 'SEARCHING',
        passenger_note: message || ''
      };

      await supabase.from('trips').insert(newTrip);
    }

    else if (event === 'CHAT_JOIN_ROOM') {
      const tripId = data?.tripId;
      if (tripId) {
        this.subscribeToChatMessages(tripId);
      }
    } 
    
    else if (event === 'CHAT_LEAVE_ROOM') {
      const tripId = data?.tripId;
      if (tripId) {
        this.unsubscribeFromChatMessages(tripId);
      }
    } 
    
    else if (event === 'CHAT_SEND') {
      const { tripId, senderId, senderType, content } = data || {};
      if (tripId && content) {
        await supabase
          .from('chat_messages')
          .insert({
            trip_id: tripId,
            sender_id: senderId === 'driver' ? driverId : senderId,
            sender_type: senderType || 'DRIVER',
            content: content
          });
      }
    } 
    
    else if (event === 'CHAT_GET_HISTORY') {
      const tripId = data?.tripId;
      if (tripId) {
        const { data: dbMsgs } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: true });

        if (dbMsgs) {
          const messages = dbMsgs.map((m) => ({
            id: m.id,
            tripId: m.trip_id,
            senderId: m.sender_id,
            senderType: m.sender_type,
            content: m.content,
            createdAt: m.created_at,
            isRead: m.is_read
          }));
          this.emit('CHAT_HISTORY', { tripId, messages });
        }
      }
    } 
    
    else if (event === 'CHAT_TYPING') {
      const { tripId, senderId } = data || {};
      if (tripId) {
        const channel = supabase.channel(`chat-typing-${tripId}`);
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { tripId, senderId }
        });
      }
    } 
    
    else if (event === 'SOS_TRIGGER') {
      const { tripId, location, userType } = data || {};
      const insertData: any = {
        user_id: driverId,
        user_type: userType || 'DRIVER',
        status: 'ACTIVE'
      };
      if (tripId) insertData.trip_id = tripId;
      if (location && location.lat && location.lng) {
        insertData.location = `SRID=4326;POINT(${location.lng} ${location.lat})`;
      }

      await supabase.from('sos_events').insert(insertData);
      this.emit('SOS_ACKNOWLEDGED', { message: 'SOS RECEIVED & DISPATCHED' });
    }
  }

  private subscribeToNewTrips() {
    if (this.newTripsChannel) return;

    console.log('[Supabase Socket] Subscribing to matching queue (trips schema)...');
    
    this.newTripsChannel = supabase
      .channel('new-trips')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trips',
        },
        async (payload) => {
          const trip = payload.new;
          if (trip.status === 'SEARCHING') {
            const driverStation = useRideStore.getState().stationId;
            if (driverStation && trip.station_id !== driverStation) {
              console.log(`[Supabase Socket] Ignore trip ${trip.id} (Station: ${trip.station_id} != Driver Station: ${driverStation})`);
              return;
            }

            const pickup = parsePoint(trip.pickup_location);
            const destination = parsePoint(trip.dest_location);

            const rider: Rider = {
              id: trip.id,
              location: pickup,
              destination: destination,
              requestTime: new Date(trip.requested_at).getTime(),
              waitTime: 0,
              status: 'IDLE',
              priorityScore: 5,
              message: trip.passenger_note || 'เงินสด / โอน'
            };

            console.log('[Supabase Socket] Offering new ride matching to driver UI:', trip.id);
            this.emit('RIDE_OFFER', { tripId: trip.id, rider });
          }
        }
      )
      .subscribe();
  }

  private unsubscribeFromNewTrips() {
    if (this.newTripsChannel) {
      supabase.removeChannel(this.newTripsChannel);
      this.newTripsChannel = null;
    }
  }

  private subscribeToTripChanges(tripId: string) {
    if (this.tripChangesChannel) {
      supabase.removeChannel(this.tripChangesChannel);
    }

    console.log(`[Supabase Socket] Subscribing to updates on trip: ${tripId}`);

    this.tripChangesChannel = supabase
      .channel(`trip-changes-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`
        },
        async (payload) => {
          const trip = payload.new;
          console.log('[Supabase Socket] Active trip status updated:', trip.status);
          
          if (trip.status === 'CANCELLED') {
            this.emit('RIDE_CANCEL', { tripId });
            this.unsubscribeFromTripChanges();
          } else if (trip.status === 'COMPLETED') {
            this.emit('TRIP_COMPLETE', { tripId });
            this.unsubscribeFromTripChanges();
          }
        }
      )
      .subscribe();
  }

  private unsubscribeFromTripChanges() {
    if (this.tripChangesChannel) {
      supabase.removeChannel(this.tripChangesChannel);
      this.tripChangesChannel = null;
    }
  }

  private subscribeToChatMessages(tripId: string) {
    if (this.chatMessagesChannel) {
      supabase.removeChannel(this.chatMessagesChannel);
    }

    this.chatMessagesChannel = supabase
      .channel(`chat-messages-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          const m = payload.new;
          this.emit('CHAT_RECEIVE', {
            id: m.id,
            tripId: m.trip_id,
            senderId: m.sender_id,
            senderType: m.sender_type,
            content: m.content,
            createdAt: m.created_at,
            isRead: m.is_read
          });
        }
      )
      .subscribe();

    if (this.chatTypingChannel) {
      supabase.removeChannel(this.chatTypingChannel);
    }
    this.chatTypingChannel = supabase
      .channel(`chat-typing-${tripId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        this.emit('CHAT_TYPING', payload.payload);
      })
      .subscribe();
  }

  private unsubscribeFromChatMessages(tripId: string) {
    if (this.chatMessagesChannel) {
      supabase.removeChannel(this.chatMessagesChannel);
      this.chatMessagesChannel = null;
    }
    if (this.chatTypingChannel) {
      supabase.removeChannel(this.chatTypingChannel);
      this.chatTypingChannel = null;
    }
  }
}

export const socket: ISocketService = new SupabaseSocketService();
