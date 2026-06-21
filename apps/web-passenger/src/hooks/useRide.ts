/**
 * useRide.ts — Production Ride Hook
 * Manages ride request lifecycle via real backend + Socket.io
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRideStore } from '../stores/rideStore';
import { useUIStore } from '../stores/uiStore';
import { SOCKET_URL } from '@/constants';
import { io, Socket } from 'socket.io-client';
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
  const socketRef = useRef<Socket | null>(null);

  // Connect to Socket.io with auth token
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Listen for ride events
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      if (currentTripId) socket.emit('TRIP_JOIN_ROOM', { tripId: currentTripId });
    });

    socket.on('STATE_RESTORED', (data: { type: string; trip?: any }) => {
      if (data.type !== 'ACTIVE_TRIP' || !data.trip) return;
      const trip = data.trip;
      setCurrentTripId(trip.id);
      setRideStatus(trip.status);
      setIsSearching(trip.status === 'SEARCHING');
      if (trip.driver) setActiveDriver(trip.driver);
      setEstimate({
        tripId: trip.id,
        fare: Number(trip.fare || 0),
        distance: `${Number(trip.distance_km || 0).toFixed(1)} กม.`,
        eta: trip.duration_mins ? `${trip.duration_mins} นาที` : '-',
      });
    });

    socket.on('TRIP_STATUS_UPDATE', (data: { tripId: string; status: string }) => {
      if (data.tripId !== currentTripId) return;
      setRideStatus(data.status);
      setIsSearching(data.status === 'SEARCHING');
    });

    socket.on('DRIVER_LOCATION_UPDATE', (data: { tripId: string; lat: number; lng: number; heading?: number }) => {
      if (data.tripId === currentTripId) setDriverLocation(data);
    });

    socket.on('TRIP_ACCEPT', (data: { tripId: string; driver: ActiveDriver }) => {
      if (data.tripId === currentTripId) {
        setActiveDriver(data.driver);
        setRideStatus('ACCEPTED');
        setIsSearching(false);
        setToastMessage('🛵 คนขับรับงานแล้ว! กำลังเดินทางมา...');
      }
    });

    socket.on('TRIP_COMPLETE', (data: { tripId: string }) => {
      if (data.tripId === currentTripId) {
        setRideStatus('COMPLETED');
        setToastMessage('✅ ถึงจุดหมายแล้ว! ขอบคุณที่ใช้บริการ GOZIPP');
        setTimeout(() => resetRide(), 3000);
      }
    });

    socket.on('RIDE_CANCEL', (data: { tripId: string; reason?: string }) => {
      if (data.tripId === currentTripId) {
        setRideStatus('CANCELLED');
        setIsSearching(false);
        setActiveDriver(null);
        setToastMessage('❌ คนขับยกเลิกการรับงาน กำลังหาคนขับใหม่...');
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentTripId, setActiveDriver, setCurrentTripId, setDriverLocation, setEstimate, setIsSearching, setRideStatus, setToastMessage, resetRide]);

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

      // Emit via Socket.io for real-time dispatch
      if (socketRef.current?.connected) {
        socketRef.current.emit('TRIP_JOIN_ROOM', { tripId: data.tripId });
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      setToastMessage('❌ ' + err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentTripId, setIsSearching, setToastMessage]);

  // Cancel a ride
  const cancelRide = useCallback(async (): Promise<void> => {
    if (!currentTripId) return;

    try {
      await apiFetch(`/api/v1/passenger/ride/${currentTripId}/cancel`, {
        method: 'POST',
      });
    } catch {
      // Silently fail on cancel
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('RIDE_CANCEL', { tripId: currentTripId });
    }

    resetRide();
    setRideStatus(null);
    setEstimate(null);
    setToastMessage('ยกเลิกการค้นหาแล้ว');
  }, [currentTripId, resetRide, setToastMessage]);

  // Poll ride status (fallback if socket misses event)
  const pollRideStatus = useCallback(async (): Promise<void> => {
    if (!currentTripId) return;
    try {
      const data = await apiFetch(`/api/v1/passenger/ride/${currentTripId}/status`);
      if (data.status) {
        setRideStatus(data.status);
        if (['TIMEOUT_NO_DRIVER', 'CANCELLED'].includes(data.status)) {
          setIsSearching(false);
          setToastMessage(data.status === 'TIMEOUT_NO_DRIVER' ? 'ยังไม่พบคนขับในขณะนี้ กรุณาลองใหม่อีกครั้ง' : 'ทริปถูกยกเลิกแล้ว');
          resetRide();
        }
      }
    } catch {
      // Ignore poll errors
    }
  }, [currentTripId, resetRide, setIsSearching, setRideStatus, setToastMessage]);

  useEffect(() => {
    if (!currentTripId || rideStatus !== 'SEARCHING') return;
    const timer = window.setInterval(() => void pollRideStatus(), 5000);
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
