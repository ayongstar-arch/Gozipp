/**
 * useRide.ts — Production Ride Hook (Supabase Realtime Edition)
 * Manages ride request lifecycle via Supabase database + Realtime Broadcast & Postgres Changes
 */
import { useState, useCallback, useEffect } from 'react';
import { useRideStore } from '../stores/rideStore';
import { useUIStore } from '../stores/uiStore';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../services/api';

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

  // Setup Supabase Realtime subscriptions
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
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch('/api/v1/passenger/ride/request', {
        method: 'POST',
        body: JSON.stringify({
          pickupLat,
          pickupLng,
          pickupAddress,
          destLat,
          destLng,
          destAddress,
        }),
      });

      setEstimate({
        tripId: data.tripId,
        fare: data.fare,
        distance: data.distance,
        eta: data.eta,
      });
      setCurrentTripId(data.tripId);
      setIsSearching(true);
      setRideStatus('SEARCHING');

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

  // Poll ride status (fallback query using Supabase SDK)
  const pollRideStatus = useCallback(async (): Promise<void> => {
    if (!currentTripId) return;
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
  }, [currentTripId, resetRide, setIsSearching, setRideStatus, setToastMessage]);

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
