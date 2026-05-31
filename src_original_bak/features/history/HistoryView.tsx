/**
 * HistoryView.tsx — Production Ride History
 * Fetches real trip data from backend API
 */
'use client';
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL } from '@/constants';

interface Trip {
  id: string;
  status: string;
  fare: number;
  credits_used: number;
  distance_km: number;
  pickup_address: string;
  dest_address: string;
  driver_name?: string;
  driver_plate?: string;
  driver_rating?: number;
  passenger_rating?: number;
  requested_at: string;
  completed_at?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: 'สำเร็จ', color: 'bg-emerald-50 text-emerald-600' },
  CANCELLED: { label: 'ยกเลิก', color: 'bg-red-50 text-red-500' },
  TIMEOUT_NO_DRIVER: { label: 'ไม่มีคนขับ', color: 'bg-amber-50 text-amber-600' },
  IN_PROGRESS: { label: 'กำลังเดินทาง', color: 'bg-blue-50 text-blue-600' },
  SEARCHING: { label: 'กำลังค้นหา', color: 'bg-slate-50 text-slate-500' },
};

const HistoryView: React.FC = () => {
  const { token } = useAuthStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchTrips = async (pageNum: number) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/passenger/trips?page=${pageNum}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const newTrips: Trip[] = Array.isArray(data) ? data : data.trips || [];
      if (pageNum === 1) setTrips(newTrips);
      else setTrips(prev => [...prev, ...newTrips]);
      setHasMore(newTrips.length === 10);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips(1);
  }, [token]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchTrips(next);
  };

  return (
    <div className="p-6 pb-24">
      <h2 className="text-2xl font-black text-slate-800 mb-6">ประวัติการเดินทาง</h2>

      {isLoading && trips.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">กำลังโหลดข้อมูล...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-6">🛵</div>
          <div className="text-lg font-bold mb-2 text-slate-600">ยังไม่เคยเดินทาง</div>
          <p className="text-sm">ลองเรียกพี่วินคนแรกของคุณวันนี้!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map(trip => {
            const status = STATUS_MAP[trip.status] || { label: trip.status, color: 'bg-slate-50 text-slate-500' };
            const date = new Date(trip.requested_at);
            return (
              <div key={trip.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{trip.driver_name || 'คนขับ'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {date.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {/* Route */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <div className="w-0.5 h-5 bg-slate-100" />
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  </div>
                  <div className="flex-1 text-xs space-y-2">
                    <div className="text-slate-500 truncate">{trip.pickup_address || 'จุดรับ'}</div>
                    <div className="text-slate-800 font-bold truncate">{trip.dest_address || 'จุดหมาย'}</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                    {trip.driver_plate && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                        {trip.driver_plate}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {trip.distance_km?.toFixed(1)} กม.
                    </span>
                  </div>
                  <div className="font-black text-emerald-600 text-sm">
                    {trip.credits_used === 0 ? (
                      <span className="text-amber-500">ฟรี 🎁</span>
                    ) : (
                      `-${trip.credits_used} แต้ม`
                    )}
                  </div>
                </div>

                {/* Rating prompt */}
                {trip.status === 'COMPLETED' && !trip.passenger_rating && (
                  <div className="mt-3 flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} className="text-2xl opacity-30 hover:opacity-100 transition-opacity">⭐</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="w-full py-3 text-sm font-bold text-slate-400 hover:text-green-600 transition-colors"
            >
              {isLoading ? 'กำลังโหลด...' : 'โหลดเพิ่มเติม'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
