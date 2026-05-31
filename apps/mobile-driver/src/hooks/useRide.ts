/**
 * useRide.ts — Production Ride Hook
 * Manages ride request lifecycle via real backend + Socket.io
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRideStore } from '../stores/rideStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { API_BASE_URL, SOCKET_URL } from '@/constants';
import { io, Socket } from 'socket.io-client';

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
  const { token } = useAuthStore();
  const { myLocation, setIsSearching, setActiveDriver, setCurrentTripId, resetRide, currentTripId } = useRideStore();
  const { setToastMessage } = useUIStore();

  const [estimate, setEstimate] = useState<RideEstimate | null>(null);
  const [rideStatus, setRideStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Connect to Socket.io with auth token
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Listen for ride events
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('TRIP_ACCEPT', (data: { driverId: string; tripId: string; driverName: string; driverPlate: string; driverRating: number }) => {
      if (data.tripId === currentTripId) {
        setActiveDriver({
          id: data.driverId,
          name: data.driverName || 'คนขับ',
          plate: data.driverPlate || '???',
          phone: '',
          rating: data.driverRating || 5,
        });
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
  }, [token, currentTripId]);

  // Request a ride
  const requestRide = useCallback(async (
    pickupLat: number,
    pickupLng: number,
    pickupAddress: string,
    destLat: number,
    destLng: number,
    destAddress: string,
  ): Promise<boolean> => {
    if (!token) {
      setError('กรุณาเข้าสู่ระบบก่อน');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/passenger/ride/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickupLat,
          pickupLng,
          pickupAddress,
          destLat,
          destLng,
          destAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'ขอเรียกรถไม่สำเร็จ');

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
        socketRef.current.emit('RIDE_REQUEST', {
          tripId: data.tripId,
          location: { lat: pickupLat, lng: pickupLng },
          destination: { lat: destLat, lng: destLng },
        });
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      setToastMessage('❌ ' + err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [token, setCurrentTripId, setIsSearching, setToastMessage]);

  // Cancel a ride
  const cancelRide = useCallback(async (): Promise<void> => {
    if (!currentTripId) return;

    try {
      await fetch(`${API_BASE_URL}/api/v1/passenger/ride/${currentTripId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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
  }, [currentTripId, token, resetRide, setToastMessage]);

  // Poll ride status (fallback if socket misses event)
  const pollRideStatus = useCallback(async (): Promise<void> => {
    if (!currentTripId || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/passenger/ride/${currentTripId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status) setRideStatus(data.status);
    } catch {
      // Ignore poll errors
    }
  }, [currentTripId, token]);

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
