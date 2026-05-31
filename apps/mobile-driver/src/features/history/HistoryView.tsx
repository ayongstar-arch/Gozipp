/**
 * HistoryView.tsx — Production Trip History (Driver View)
 * - Fetches DRIVER trips from correct API endpoint
 * - Full Post-Trip Rating System with API submission
 * - Filter tabs: All | Completed | Cancelled
 * - Earnings summary header
 */
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { API_BASE_URL } from '@/constants';

interface Trip {
  id: string;
  status: string;
  fare: number;
  credits_used: number;
  distance_km: number;
  pickup_address: string;
  dest_address: string;
  passenger_name?: string;
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

type FilterTab = 'ALL' | 'COMPLETED' | 'CANCELLED';

const HistoryView: React.FC = () => {
  const { token, user } = useAuthStore();
  const { setToastMessage } = useUIStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');

  // Rating state: { [tripId]: selectedStar }
  const [ratingMap, setRatingMap] = useState<Record<string, number>>({});
  const [submittingRating, setSubmittingRating] = useState<Record<string, boolean>>({});

  // Determine if this is the Driver app context
  const isDriver = user?.role === 'DRIVER';
  const apiPath = isDriver
    ? `/api/v1/driver/trips`
    : `/api/v1/passenger/trips`;

  const fetchTrips = useCallback(async (pageNum: number, filter: FilterTab) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const statusParam = filter !== 'ALL' ? `&status=${filter}` : '';
      const res = await fetch(`${API_BASE_URL}${apiPath}?page=${pageNum}&limit=10${statusParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const newTrips: Trip[] = Array.isArray(data) ? data : data.trips || [];
      if (pageNum === 1) setTrips(newTrips);
      else setTrips((prev) => [...prev, ...newTrips]);
      setHasMore(newTrips.length === 10);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [token, apiPath]);

  useEffect(() => {
    setPage(1);
    fetchTrips(1, filterTab);
  }, [token, filterTab]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchTrips(next, filterTab);
  };

  // Handle rating submission
  const handleSubmitRating = async (tripId: string) => {
    const rating = ratingMap[tripId];
    if (!rating || !token) return;

    setSubmittingRating((prev) => ({ ...prev, [tripId]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/trips/${tripId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error('ส่งคะแนนไม่สำเร็จ');

      // Update local trip data to show rating as submitted
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId ? { ...t, passenger_rating: rating } : t
        )
      );
      setToastMessage(`⭐ ให้คะแนน ${rating} ดาวสำเร็จแล้วครับ!`);
    } catch (err: any) {
      setToastMessage('❌ ' + (err.message || 'เกิดข้อผิดพลาด'));
    } finally {
      setSubmittingRating((prev) => ({ ...prev, [tripId]: false }));
    }
  };

  // Earnings summary for drivers
  const todayEarnings = trips
    .filter((t) => {
      const today = new Date().toDateString();
      return (
        t.status === 'COMPLETED' &&
        new Date(t.requested_at).toDateString() === today
      );
    })
    .reduce((sum, t) => sum + (t.fare || 0), 0);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'ALL', label: 'ทั้งหมด' },
    { key: 'COMPLETED', label: '✅ สำเร็จ' },
    { key: 'CANCELLED', label: '❌ ยกเลิก' },
  ];

  return (
    <div className="p-6 pb-24">
      <h2 className="text-2xl font-black text-slate-800 mb-2">ประวัติการเดินทาง</h2>

      {/* Driver Earnings Summary */}
      {isDriver && (
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-5 mb-6 text-white shadow-lg shadow-emerald-200">
          <div className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">รายได้วันนี้</div>
          <div className="text-4xl font-black">
            ฿{todayEarnings.toLocaleString()}
            <span className="text-base opacity-60 ml-2">บาท</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border-2 ${
              filterTab === tab.key
                ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && trips.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">กำลังโหลดข้อมูล...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-6">🛵</div>
          <div className="text-lg font-bold mb-2 text-slate-600">
            {filterTab === 'ALL' ? 'ยังไม่มีประวัติการเดินทาง' : 'ไม่มีรายการในหมวดนี้'}
          </div>
          <p className="text-sm">
            {filterTab === 'ALL' ? (isDriver ? 'รับงานแรกของคุณได้เลย!' : 'ลองเรียกพี่วินคนแรกของคุณวันนี้!') : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
            const status = STATUS_MAP[trip.status] || {
              label: trip.status,
              color: 'bg-slate-50 text-slate-500',
            };
            const date = new Date(trip.requested_at);
            const selectedStar = ratingMap[trip.id] || 0;
            const alreadyRated = Boolean(trip.passenger_rating);
            const isSubmitting = submittingRating[trip.id] || false;

            return (
              <div key={trip.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">
                      {isDriver
                        ? trip.passenger_name || 'ผู้โดยสาร'
                        : trip.driver_name || 'คนขับ'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {date.toLocaleString('th-TH', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
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
                    {isDriver ? (
                      <span className="text-emerald-700">+฿{trip.fare || 0}</span>
                    ) : trip.credits_used === 0 ? (
                      <span className="text-amber-500">ฟรี 🎁</span>
                    ) : (
                      `-${trip.credits_used} แต้ม`
                    )}
                  </div>
                </div>

                {/* ⭐ Rating Section — Only for completed trips that haven't been rated yet */}
                {trip.status === 'COMPLETED' && !isDriver && (
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    {alreadyRated ? (
                      <div className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-xl ${star <= (trip.passenger_rating || 0) ? 'text-amber-400' : 'text-slate-200'}`}
                          >
                            ★
                          </span>
                        ))}
                        <span className="text-[10px] text-slate-400 ml-2">ให้คะแนนแล้ว</span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] text-slate-400 text-center mb-2 font-bold uppercase tracking-wider">
                          ให้คะแนนการเดินทางครั้งนี้
                        </p>
                        <div className="flex items-center justify-center gap-2 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRatingMap((prev) => ({ ...prev, [trip.id]: star }))}
                              className={`text-3xl transition-all hover:scale-125 active:scale-95 ${
                                star <= selectedStar ? 'text-amber-400' : 'text-slate-200'
                              }`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        {selectedStar > 0 && (
                          <button
                            onClick={() => handleSubmitRating(trip.id)}
                            disabled={isSubmitting}
                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-xs font-black transition-all disabled:opacity-50 shadow-lg shadow-emerald-100"
                          >
                            {isSubmitting ? 'กำลังส่ง...' : `ยืนยัน ${selectedStar} ดาว ⭐`}
                          </button>
                        )}
                      </div>
                    )}
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
