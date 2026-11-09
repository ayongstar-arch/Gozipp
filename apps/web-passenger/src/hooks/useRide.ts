/**
 * useRide.ts — Production Ride Hook (Supabase Realtime Edition)
 * Manages ride request lifecycle via Supabase database + Realtime Broadcast & Postgres Changes
 */
import { useState, useCallback, useEffect } from 'react';
import { useRideStore } from '../stores/rideStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../services/api';
import { socket } from '../services/socket';

export interface RideEstimate {
  tripId: string;
  fare: number;
  distance: string;
  eta: string;
}

export interface ActiveDriver {
  id: string;
  name: string;
  plate: string;
  phone: string;
  rating: number;
  eta?: string;
}

export const useRide = () => {
  const {
    setIsSearching, setActiveDriver, setCurrentTripId, resetRide, currentTripId,
    estimate, setEstimate, rideStatus, setRideStatus, setDriverLocation,
  } = useRideStore();
  const { setToastMessage } = useUIStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup Real-time Socket.IO subscriptions (Primary for NestJS Backend)
  useEffect(() => {
    if (!currentTripId) return;

    socket.emit('TRIP_JOIN_ROOM', { tripId: currentTripId });

    const handleTripAccept = (data: any) => {
      console.log('[Socket] TRIP_ACCEPT received:', data);
      if (data?.driver) {
        setActiveDriver({
          id: data.driver.id,
          name: data.driver.name,
          plate: data.driver.plate,
          phone: data.driver.phone || '',
          rating: Number(data.driver.rating || 5),
        });
      }
      setRideStatus('ACCEPTED');
      setIsSearching(false);
      setToastMessage('🛵 คนขับรับงานแล้ว! กำลังเดินทางมา...');
    };

    const handleStatusUpdate = (data: any) => {
      console.log('[Socket] TRIP_STATUS_UPDATE received:', data);
      if (!data?.status) return;
      setRideStatus(data.status);

      if (data.status === 'SEARCHING') {
        setIsSearching(true);
      } else {
        setIsSearching(false);
      }

      if (data.driver) {
        setActiveDriver({
          id: data.driver.id,
          name: data.driver.name,
          plate: data.driver.plate,
          phone: data.driver.phone || '',
          rating: Number(data.driver.rating || 5),
        });
      }

      if (data.status === 'DRIVER_ARRIVED') {
        setToastMessage('📍 คนขับถึงจุดรับแล้ว กำลังรอคุณอยู่ครับ');
      } else if (data.status === 'IN_PROGRESS') {
        setToastMessage('🛵 เริ่มออกเดินทางไปจุดหมายแล้ว');
      } else if (data.status === 'COMPLETED') {
        setToastMessage('✅ ถึงจุดหมายแล้ว! ขอบคุณที่ใช้บริการ GOZIPP');
      } else if (data.status === 'CANCELLED') {
        setRideStatus('CANCELLED');
        setIsSearching(false);
        setActiveDriver(null);
        setToastMessage('❌ ทริปถูกยกเลิกแล้ว');
      }
    };

    const handleLocationUpdate = (data: any) => {
      if (data?.lat && data?.lng) {
        setDriverLocation({
          lat: Number(data.lat),
          lng: Number(data.lng),
          heading: data.heading,
        });
      }
    };

    const handleTripComplete = () => {
      setRideStatus('COMPLETED');
      setIsSearching(false);
      setToastMessage('✅ ถึงจุดหมายแล้ว! ขอบคุณที่ใช้บริการ GOZIPP');
    };

    socket.on('TRIP_ACCEPT', handleTripAccept);
    socket.on('TRIP_STATUS_UPDATE', handleStatusUpdate);
    socket.on('DRIVER_LOCATION_UPDATE', handleLocationUpdate);
    socket.on('TRIP_COMPLETE', handleTripComplete);

    return () => {
      socket.off('TRIP_ACCEPT', handleTripAccept);
      socket.off('TRIP_STATUS_UPDATE', handleStatusUpdate);
      socket.off('DRIVER_LOCATION_UPDATE', handleLocationUpdate);
      socket.off('TRIP_COMPLETE', handleTripComplete);
    };
  }, [currentTripId, setActiveDriver, setIsSearching, setRideStatus, setDriverLocation, setToastMessage]);

  // Setup Supabase Realtime subscriptions (Secondary Fallback)
  useEffect(() => {
    if (!currentTripId) return;

    console.log('[Supabase Realtime] Subscribing to trip:', currentTripId);

    // 1. Listen for Database status changes on this specific trip
    const tripChangesChannel = supabase
      .channel(`trip-changes-${currentTripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${currentTripId}`,
        },
        async (payload) => {
          const newTrip = payload.new;
          console.log('[Supabase Realtime] Trip updated:', newTrip);

          setRideStatus(newTrip.status);
          setIsSearching(newTrip.status === 'SEARCHING');

          if (newTrip.status === 'SCHEDULED') {
            setIsSearching(false);
            setToastMessage('⏱️ บันทึกการนัดหมายวินล่วงหน้าเรียบร้อยแล้ว!');
          }

          // If driver accepted the trip, fetch driver details
          if (newTrip.status === 'ACCEPTED' && newTrip.driver_id) {
            const { data: driver } = await supabase
              .from('drivers')
              .select('id, name, plate, phone, rating')
              .eq('id', newTrip.driver_id)
              .maybeSingle();

            if (driver) {
              setActiveDriver({
                id: driver.id,
                name: driver.name,
                plate: driver.plate,
                phone: driver.phone || '',
                rating: Number(driver.rating || 5),
              });
              setToastMessage('🛵 คนขับรับงานแล้ว! กำลังเดินทางมา...');
            }
          }

          if (newTrip.status === 'COMPLETED') {
            setToastMessage('✅ ถึงจุดหมายแล้ว! ขอบคุณที่ใช้บริการ GOZIPP');
            setTimeout(() => resetRide(), 3000);
          }

          if (newTrip.status === 'CANCELLED') {
            setRideStatus('CANCELLED');
            setIsSearching(false);
            setActiveDriver(null);
            setToastMessage('❌ คนขับยกเลิกการรับงาน กำลังหาคนขับใหม่...');
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Supabase Realtime] Status Updates status: ${status}`);
      });

    // 2. Listen for Driver Location Broadcasts
    const locationChannel = supabase
      .channel(`trip-tracking-${currentTripId}`)
      .on('broadcast', { event: 'location' }, (payload) => {
        const data = payload.payload;
        console.log('[Supabase Broadcast] Received location:', data);
        if (data.tripId === currentTripId) {
          setDriverLocation({
            lat: data.lat,
            lng: data.lng,
            heading: data.heading,
          });
        }
      })
      .subscribe((status) => {
        console.log(`[Supabase Realtime] Location Channel status: ${status}`);
      });

    // Clean up subscriptions on unmount/trip change
    return () => {
      console.log('[Supabase Realtime] Unsubscribing from trip:', currentTripId);
      supabase.removeChannel(tripChangesChannel);
      supabase.removeChannel(locationChannel);
    };
  }, [currentTripId, setActiveDriver, setIsSearching, setRideStatus, setDriverLocation, setToastMessage, resetRide]);

  // Request a ride
  const requestRide = useCallback(async (
    pickupLat: number,
    pickupLng: number,
    pickupAddress: string,
    destLat: number,
    destLng: number,
    destAddress: string,
    isEmergency = false,
    options?: {
      scheduledAt?: string;
      preferredDriverId?: string;
      serviceType?: string;
      taxiCategory?: string;
    }
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const currentUser = useAuthStore.getState().user;
      const rawId = (currentUser?.id && currentUser.id.trim() !== '')
        ? currentUser.id.trim()
        : (typeof window !== 'undefined'
          ? (localStorage.getItem('gozipp_passenger_id') ||
             localStorage.getItem('mywin_passenger_id') ||
             currentUser?.phone ||
             localStorage.getItem('gozipp_saved_phone') ||
             '').trim()
          : '');
      const passengerId = rawId || undefined;

      const payload: Record<string, any> = {
        pickupLat,
        pickupLng,
        pickupAddress,
        destLat,
        destLng,
        destAddress,
        isEmergency,
        serviceType: options?.serviceType || 'MOTO',
        taxiCategory: options?.taxiCategory,
        scheduledAt: options?.scheduledAt,
        preferredDriverId: options?.preferredDriverId,
      };
      if (passengerId) {
        payload.passengerId = passengerId;
      }

      const clientKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const data = await apiFetch('/api/v1/passenger/ride/request', {
        method: 'POST',
        headers: {
          'Idempotency-Key': clientKey,
        },
        body: JSON.stringify(payload),
      });

      setEstimate({
        tripId: data.tripId,
        fare: data.fare,
        distance: data.distance,
        eta: data.eta,
      });
      setCurrentTripId(data.tripId);
      const isSched = data.status === 'SCHEDULED';
      setIsSearching(!isSched);
      setRideStatus(data.status || 'SEARCHING');

      return true;
    } catch (err: any) {
      setError(err.message);
      setToastMessage('❌ ' + err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentTripId, setIsSearching, setEstimate, setRideStatus, setToastMessage]);

  // Cancel a ride
  const cancelRide = useCallback(async (): Promise<void> => {
    if (!currentTripId) return;

    try {
      await apiFetch(`/api/v1/passenger/ride/${currentTripId}/cancel`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to call cancel API:', err);
    }

    resetRide();
    setRideStatus(null);
    setEstimate(null);
    setToastMessage('ยกเลิกการค้นหาแล้ว');
  }, [currentTripId, resetRide, setToastMessage, setEstimate, setRideStatus]);

  // Poll ride status (primary via NestJS API, fallback via Supabase SDK)
  const pollRideStatus = useCallback(async (): Promise<void> => {
    if (!currentTripId) return;
    try {
      // 1. Primary: NestJS Production API
      const res = await apiFetch(`/api/v1/passenger/ride/${currentTripId}/status`);
      if (res?.status) {
        setRideStatus(res.status);
        if (res.driver) {
          setActiveDriver({
            id: res.driver.id,
            name: res.driver.name,
            plate: res.driver.plate,
            phone: res.driver.phone || '',
            rating: Number(res.driver.rating || 5),
          });
        }
        if (['TIMEOUT_NO_DRIVER', 'CANCELLED'].includes(res.status)) {
          setIsSearching(false);
          setToastMessage(res.status === 'TIMEOUT_NO_DRIVER' ? 'ยังไม่พบคนขับในขณะนี้ กรุณาลองใหม่อีกครั้ง' : 'ทริปถูกยกเลิกแล้ว');
          resetRide();
        }
        return;
      }
    } catch {
      // 2. Fallback: Supabase SDK
      try {
        const { data: trip } = await supabase
          .from('trips')
          .select('status')
          .eq('id', currentTripId)
          .maybeSingle();

        if (trip?.status) {
          setRideStatus(trip.status);
          if (['TIMEOUT_NO_DRIVER', 'CANCELLED'].includes(trip.status)) {
            setIsSearching(false);
            setToastMessage(trip.status === 'TIMEOUT_NO_DRIVER' ? 'ยังไม่พบคนขับในขณะนี้ กรุณาลองใหม่อีกครั้ง' : 'ทริปถูกยกเลิกแล้ว');
            resetRide();
          }
        }
      } catch (err) {
        console.error('Failed to poll ride status:', err);
      }
    }
  }, [currentTripId, resetRide, setIsSearching, setRideStatus, setActiveDriver, setToastMessage]);

  // Setup periodic polling fallback
  useEffect(() => {
    if (!currentTripId || rideStatus !== 'SEARCHING') return;
    const timer = window.setInterval(() => void pollRideStatus(), 7000);
    return () => window.clearInterval(timer);
  }, [currentTripId, rideStatus, pollRideStatus]);

  return {
    requestRide,
    cancelRide,
    pollRideStatus,
    estimate,
    rideStatus,
    isLoading,
    error,
  };
};
