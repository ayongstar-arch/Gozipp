/**
 * HomeView.tsx — Production Booking Home
 * Real API integration: ride request, balance check, geolocation
 */
'use client';
import React, { useMemo, useEffect, useState } from 'react';
import { useRideStore } from '../../stores/rideStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useRide } from '../../hooks/useRide';
import dynamic from 'next/dynamic';
import { STATION_ZONES, SERVICE_RADIUS_KM } from '@/constants';

const LiveMapView = dynamic(() => import('@/components/LiveMapView'), { ssr: false });

// Helper: haversine distance in km
const calcDistKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const HomeView: React.FC = () => {
  const { myLocation, stationId, setStationId, isSearching, activeDriver } = useRideStore();
  const { user } = useAuthStore();
  const { setToastMessage } = useUIStore();
  const { requestRide, cancelRide, estimate, rideStatus, isLoading, error } = useRide();

  const [destStationId, setDestStationId] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('เบราว์เซอร์ไม่รองรับ GPS');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        useRideStore.getState().setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
      },
      (err) => {
        setGeoError('ไม่สามารถระบุตำแหน่งได้: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Sorted stations by distance
  const stationsWithDist = useMemo(() => {
    if (!myLocation) return STATION_ZONES.map(s => ({ ...s, distKm: 999 }));
    return STATION_ZONES
      .map(s => ({ ...s, distKm: calcDistKm(myLocation.lat, myLocation.lng, s.lat, s.lng) }))
      .sort((a, b) => a.distKm - b.distKm);
  }, [myLocation]);

  const nearestStation = stationsWithDist[0];
  const isOutOfZone = nearestStation && nearestStation.distKm > SERVICE_RADIUS_KM;

  // Auto-select nearest station as pickup
  useEffect(() => {
    if (nearestStation && !stationId) {
      setStationId(nearestStation.id);
    }
    if (!destStationId && stationsWithDist.length > 1) {
      setDestStationId(stationsWithDist[1].id);
    }
  }, [nearestStation?.id]);

  // Show error from ride hook
  useEffect(() => {
    if (error) setToastMessage('❌ ' + error);
  }, [error]);

  const destStation = STATION_ZONES.find(s => s.id === destStationId) || stationsWithDist[1];

  const handleRequestRide = async () => {
    if ((user?.pointsBalance ?? 0) < 2 && (user?.freeRidesRemaining ?? 0) === 0) {
      setToastMessage('แต้มไม่พอ กรุณาเติมเงินก่อนครับ');
      return;
    }
    if (!myLocation) {
      setToastMessage('กำลังระบุตำแหน่ง กรุณารอสักครู่');
      return;
    }
    if (!destStation) {
      setToastMessage('กรุณาเลือกจุดหมาย');
      return;
    }

    await requestRide(
      myLocation.lat,
      myLocation.lng,
      nearestStation?.name || 'ตำแหน่งปัจจุบัน',
      destStation.lat,
      destStation.lng,
      destStation.name,
    );
  };

  const balance = user?.pointsBalance ?? 0;
  const freeRides = user?.freeRidesRemaining ?? 0;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="p-6 pb-2">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tighter">GOZIPP</h1>
            {user?.name && (
              <p className="text-xs text-slate-500 font-medium mt-0.5">สวัสดี {user.name} 👋</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="bg-gozipp-green text-slate-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gozipp-green/20 flex items-center gap-2">
              <span>💎</span> {balance} Credits
            </div>
            {freeRides > 0 && (
              <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                🎁 ฟรี {freeRides} เที่ยว
              </div>
            )}
          </div>
        </div>
        {geoError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl mb-2">
            ⚠️ {geoError}
          </div>
        )}
      </header>

      <div className="flex-1 relative min-h-[280px] mx-4 mb-4 rounded-3xl overflow-hidden shadow-inner border border-slate-200">
        <LiveMapView
          myLocation={myLocation}
          pickupLocation={nearestStation ? { lat: nearestStation.lat, lng: nearestStation.lng } : null}
          userType="PASSENGER"
        />

        {/* Searching Overlay */}
        {isSearching && !activeDriver && (
          <div className="absolute inset-0 z-[500] bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center text-white">
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl">🛵</div>
            </div>
            <h3 className="text-2xl font-black mb-2 tracking-tight">กำลังหาพี่วิน...</h3>
            <p className="text-slate-300 text-sm">แจ้งเตือนพี่วินที่จุดจอด <strong>{nearestStation?.name}</strong></p>
            {estimate && (
              <div className="mt-4 bg-white/10 rounded-2xl px-6 py-3 text-sm">
                <span className="font-bold">{estimate.distance}</span> · <span className="font-bold">{estimate.fare} Credits</span>
              </div>
            )}
            <button
              onClick={cancelRide}
              className="mt-8 px-8 py-3 bg-white/10 hover:bg-red-500/30 rounded-2xl text-xs font-bold transition-all border border-white/10"
            >
              ยกเลิกการค้นหา
            </button>
          </div>
        )}

        {/* Status: Driver arrived */}
        {rideStatus === 'DRIVER_ARRIVED' && (
          <div className="absolute bottom-4 left-4 right-4 z-[500] bg-amber-400 text-slate-900 rounded-2xl px-4 py-3 text-center font-black text-sm shadow-xl">
            🏍️ คนขับมาถึงจุดรับแล้ว!
          </div>
        )}
      </div>

      {/* Booking Panel */}
      <div className="p-6 px-8 bg-white rounded-t-[40px] relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] border-t border-slate-100">
        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6" />

        {!activeDriver ? (
          <>
            {/* Pickup */}
            <div className="mb-5">
              <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-widest">จุดรับ</label>
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl">📍</div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-sm">{nearestStation?.name || 'กำลังระบุตำแหน่ง...'}</div>
                  <div className="text-[10px] text-slate-400">
                    {nearestStation ? `${nearestStation.distKm.toFixed(2)} กม. จากคุณ` : '---'}
                  </div>
                </div>
                {isOutOfZone && (
                  <span className="text-[9px] font-black bg-red-100 text-red-500 px-2 py-1 rounded-lg">นอกเขต</span>
                )}
              </div>
            </div>

            {/* Destination */}
            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-widest">จุดหมาย</label>
              <div className="relative">
                <select
                  value={destStationId}
                  onChange={e => setDestStationId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-50 appearance-none transition-all"
                >
                  {stationsWithDist.filter(s => s.id !== nearestStation?.id).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.distKm.toFixed(1)} กม.)
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
              </div>
            </div>

            {/* Ride CTA */}
            <button
              id="btn-request-ride"
              onClick={handleRequestRide}
              disabled={isLoading || isSearching || !myLocation || Boolean(isOutOfZone)}
              className="w-full bg-gozipp-green text-slate-950 font-black py-5 rounded-2xl shadow-2xl shadow-gozipp-green/20 hover:bg-green-400 transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-4 group uppercase"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">🛵</span>
              <div className="text-left">
                <div className="text-xl leading-tight tracking-tighter">
                  {isLoading ? 'กำลังส่งคำขอ...' : 'เรียก GOZIPP เลย'}
                </div>
                <div className="text-[10px] opacity-70 font-black uppercase tracking-widest">
                  {freeRides > 0 ? `ฟรีไรด์ ${freeRides} เที่ยว` : `2 Credits · ประมาณ 5 นาที`}
                </div>
              </div>
            </button>
          </>
        ) : (
          /* Active driver matched */
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-gozipp-green/10 text-gozipp-green rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce shadow-xl">🛵</div>
            <div className="text-gozipp-green font-black mb-1 text-xs uppercase tracking-widest">คนขับกำลังมา</div>
            <div className="text-3xl font-black text-slate-950 tracking-tight uppercase">{activeDriver.name}</div>
            <div className="text-slate-500 font-bold tracking-widest mt-1 text-sm">{activeDriver.plate}</div>
            <div className="flex items-center justify-center gap-1 mt-2 text-amber-500 text-sm font-bold">
              ⭐ {activeDriver.rating?.toFixed(1)}
            </div>
            <button
              onClick={cancelRide}
              className="mt-6 text-xs text-slate-400 underline hover:text-red-500 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeView;
