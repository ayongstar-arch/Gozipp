/**
 * TrackingView.tsx — Live Ride Tracking
 * Shows real-time driver location during an active trip
 */
'use client';
import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRideStore } from '../../stores/rideStore';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL, SOCKET_URL } from '@/constants';
import { io, Socket } from 'socket.io-client';

const LiveMapView = dynamic(() => import('@/components/LiveMapView'), { ssr: false });

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
}

const TrackingView: React.FC = () => {
  const { activeDriver, myLocation, currentTripId } = useRideStore();
  const { token } = useAuthStore();
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [ridePhase, setRidePhase] = useState<'DRIVER_COMING' | 'IN_PROGRESS' | 'COMPLETED'>('DRIVER_COMING');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !currentTripId || !activeDriver) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    // Join trip room for real-time updates
    socket.emit('CHAT_JOIN_ROOM', { tripId: currentTripId });

    // Listen for driver location updates
    socket.on(`DRIVER_LOCATION_${activeDriver.id}`, (loc: DriverLocation) => {
      setDriverLocation(loc);
    });

    socket.on('TRIP_STATUS_UPDATE', (data: { tripId: string; status: string }) => {
      if (data.tripId !== currentTripId) return;
      if (data.status === 'DRIVER_ARRIVED') setRidePhase('DRIVER_COMING');
      if (data.status === 'IN_PROGRESS') setRidePhase('IN_PROGRESS');
      if (data.status === 'COMPLETED') setRidePhase('COMPLETED');
    });

    return () => {
      socket.emit('CHAT_LEAVE_ROOM', { tripId: currentTripId });
      socket.disconnect();
    };
  }, [token, currentTripId, activeDriver?.id]);

  if (!activeDriver) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center p-8">
        <div>
          <div className="text-5xl mb-4">🛵</div>
          <p className="text-slate-400 font-medium">ไม่มีการเดินทางที่กำลังดำเนินการ</p>
        </div>
      </div>
    );
  }

  const phaseConfig = {
    DRIVER_COMING: { label: 'คนขับกำลังเดินทางมา', icon: '🏍️', color: 'text-blue-600' },
    IN_PROGRESS: { label: 'กำลังเดินทาง', icon: '🛵', color: 'text-green-600' },
    COMPLETED: { label: 'ถึงจุดหมายแล้ว!', icon: '✅', color: 'text-emerald-600' },
  };

  const phase = phaseConfig[ridePhase];

  return (
    <div className="flex flex-col h-full">
      {/* Map */}
      <div className="flex-1 relative min-h-[350px]">
        <LiveMapView
          myLocation={myLocation}
          counterpartLocation={driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : null}
          userType="PASSENGER"
        />

        {/* Phase badge */}
        <div className="absolute top-4 left-4 right-4 z-[400]">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
            <span className="text-2xl">{phase.icon}</span>
            <span className={`font-black text-sm ${phase.color}`}>{phase.label}</span>
          </div>
        </div>
      </div>

      {/* Driver Info Card */}
      <div className="bg-white p-6 rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
        <div className="w-10 h-1 bg-slate-100 rounded-full mx-auto mb-5" />

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gozipp-green/10 rounded-2xl flex items-center justify-center text-3xl">🧑‍✈️</div>
          <div className="flex-1">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-widest">คนขับของคุณ</div>
            <div className="text-xl font-black text-slate-900">{activeDriver.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{activeDriver.plate}</span>
              <span className="text-[10px] text-amber-500 font-bold">⭐ {activeDriver.rating?.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Quick Messages */}
        <div className="mb-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">ส่งข้อความด่วน</p>
          <div className="flex gap-2 flex-wrap">
            {['อยู่หน้าปากซอย 🛣️', 'รอใต้ตึก 🏢', 'รีบมาก 🔥'].map(msg => (
              <button
                key={msg}
                className="text-[11px] font-bold bg-slate-50 text-slate-700 px-3 py-2 rounded-xl border border-slate-100 hover:bg-green-50 hover:border-green-200 transition-all"
              >
                {msg}
              </button>
            ))}
          </div>
        </div>

        {/* Call button */}
        <a
          href={`tel:${activeDriver.phone || ''}`}
          className="w-full bg-green-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-green-600 transition-colors"
        >
          📞 โทรหาคนขับ
        </a>
      </div>
    </div>
  );
};

export default TrackingView;
