/**
 * TrackingView.tsx — Live Ride Tracking
 * Shows real-time driver location during an active trip
 */
'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '../../stores/authStore';
import { useRideStore } from '../../stores/rideStore';
import { useRide } from '../../hooks/useRide';
import SOSButton from '@/components/SOSButton';

const LiveMapView = dynamic(() => import('@/components/LiveMapView'), { ssr: false });

const TrackingView: React.FC = () => {
  const { activeDriver, myLocation, driverLocation, rideStatus, currentTripId } = useRideStore();
  const { user } = useAuthStore();
  useRide();

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

  const phaseConfig: Record<string, { label: string; icon: string; color: string }> = {
    ACCEPTED: { label: 'คนขับกำลังเดินทางมารับคุณ', icon: '🏍️', color: 'text-blue-700' },
    DRIVER_ARRIVED: { label: 'คนขับถึงจุดรับแล้ว', icon: '📍', color: 'text-amber-700' },
    IN_PROGRESS: { label: 'กำลังเดินทางไปจุดหมาย', icon: '🛵', color: 'text-green-700' },
  };

  const phase = phaseConfig[rideStatus || 'ACCEPTED'] || phaseConfig.ACCEPTED;

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
          <div className="bg-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-3" role="status" aria-live="polite">
            <span className="text-2xl">{phase.icon}</span>
            <span className={`font-black text-sm ${phase.color}`}>{phase.label}</span>
          </div>
        </div>
      </div>

      {/* Driver Info Card */}
      <div className="bg-white p-6 rounded-t-2xl shadow-[0_-6px_8px_rgba(0,0,0,0.06)]">
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

        {/* Call button */}
        {activeDriver.phone ? (
          <a
            href={`tel:${activeDriver.phone}`}
            className="w-full min-h-11 bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-green-700 transition-colors"
          >
            📞 โทรหาคนขับ
          </a>
        ) : (
          <div className="w-full min-h-11 bg-slate-100 text-slate-500 font-medium py-3 rounded-xl flex items-center justify-center">
            ยังไม่มีหมายเลขติดต่อคนขับ
          </div>
        )}

        <div className="mt-4">
          <SOSButton
            userId={user?.id || 'unknown'}
            userType="PASSENGER"
            tripId={currentTripId || undefined}
            currentLocation={myLocation}
            disabled={!currentTripId}
          />
        </div>
      </div>
    </div>
  );
};

export default TrackingView;
