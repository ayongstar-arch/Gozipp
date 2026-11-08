/**
 * TrackingView.tsx — Live Ride Tracking
 * Shows real-time driver location during an active trip, In-App Chat, and Post-Trip Rating
 */
'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '../../stores/authStore';
import { useRideStore } from '../../stores/rideStore';
import { useUIStore } from '../../stores/uiStore';
import { useRide } from '../../hooks/useRide';
import { apiFetch } from '../../services/api';
import SOSButton from '@/components/SOSButton';
import ChatModal from '@/components/ChatModal';
import { MessageSquare, Phone, Star, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';

const LiveMapView = dynamic(() => import('@/components/LiveMapView'), { ssr: false });

const RATING_TAGS = [
  'ขับขี่ปลอดภัย 🛵',
  'สุภาพเรียบร้อย ✨',
  'มาถึงรวดเร็ว ⚡',
  'สวมหมวกกันน็อก 🪖',
  'เส้นทางชำนาญ 🧭',
];

const TrackingView: React.FC = () => {
  const { activeDriver, myLocation, driverLocation, rideStatus, currentTripId, resetRide } = useRideStore();
  const { user } = useAuthStore();
  const { setToastMessage } = useUIStore();
  useRide();

  // Chat State
  const [showChatModal, setShowChatModal] = useState(false);

  // Rating Modal State
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const isTripCompleted = rideStatus === 'COMPLETED';

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitRating = async () => {
    if (!currentTripId) {
      resetRide();
      return;
    }
    setIsSubmittingRating(true);
    try {
      const combinedNote = [
        ...selectedTags,
        ratingComment.trim(),
      ].filter(Boolean).join(' • ');

      await apiFetch(`/api/v1/passenger/ride/${currentTripId}/rate`, {
        method: 'POST',
        body: JSON.stringify({
          rating: ratingScore,
          note: combinedNote || undefined,
        }),
      });
      setToastMessage('⭐ ขอบคุณสำหรับคะแนนรีวิวของคุณครับ!');
    } catch (err: any) {
      console.warn('Rating submit error:', err);
      setToastMessage('ขอบคุณสำหรับการใช้บริการ GOZIPP');
    } finally {
      setIsSubmittingRating(false);
      resetRide();
    }
  };

  const handleSkipRating = () => {
    resetRide();
  };

  if (!activeDriver && !isTripCompleted) {
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
    COMPLETED: { label: 'การเดินทางเสร็จสมบูรณ์', icon: '🏁', color: 'text-emerald-700' },
  };

  const phase = phaseConfig[rideStatus || 'ACCEPTED'] || phaseConfig.ACCEPTED;

  return (
    <div className="flex flex-col h-full relative">
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
      {activeDriver && (
        <div className="bg-white p-6 rounded-t-3xl shadow-[0_-6px_20px_rgba(0,0,0,0.1)] border-t border-slate-100">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 bg-[#00e58b]/10 rounded-2xl flex items-center justify-center text-3xl border border-[#00e58b]/30">
              🛵
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">คนขับของคุณ</div>
              <div className="text-xl font-black text-slate-900">{activeDriver.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-black bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                  {activeDriver.plate || 'รถมอเตอร์ไซค์'}
                </span>
                <span className="text-xs text-amber-500 font-bold flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {activeDriver.rating?.toFixed(1) || '5.0'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Phone Call + In-App Chat */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {activeDriver.phone ? (
              <a
                href={`tel:${activeDriver.phone}`}
                className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-sm shadow-md transition-all active:scale-95"
              >
                <Phone className="w-4 h-4 text-[#00e58b]" />
                โทรหาคนขับ
              </a>
            ) : (
              <div className="py-3 px-4 bg-slate-100 text-slate-400 font-bold rounded-2xl flex items-center justify-center text-xs">
                ไม่มีเบอร์โทร
              </div>
            )}

            <button
              onClick={() => setShowChatModal(true)}
              className="py-3 px-4 bg-[#00e58b] hover:bg-[#00d075] text-[#041a12] font-black rounded-2xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#00e58b]/20 transition-all active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              แชทกับคนขับ
            </button>
          </div>

          {/* SOS Emergency Button */}
          <div>
            <SOSButton
              userId={user?.id || 'unknown'}
              userType="PASSENGER"
              tripId={currentTripId || undefined}
              currentLocation={myLocation}
              disabled={!currentTripId}
            />
          </div>
        </div>
      )}

      {/* In-App Chat Modal */}
      {currentTripId && activeDriver && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          tripId={currentTripId}
          myId={user?.id || 'passenger'}
          myType="PASSENGER"
          counterpartName={activeDriver.name}
        />
      )}

      {/* Post-Trip Rating Modal */}
      {isTripCompleted && (
        <div className="absolute inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-2xl text-center border border-slate-100">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl border border-emerald-100">
              🎉
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">ถึงจุดหมายเรียบร้อยแล้ว!</h3>
              <p className="text-xs text-slate-500 mt-1">ขอบคุณที่เดินทางกับ GOZIPP กรุณาให้คะแนนพี่วินของคุณ</p>
            </div>

            {activeDriver && (
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between text-left">
                <div>
                  <div className="text-sm font-black text-slate-900">{activeDriver.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{activeDriver.plate}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    สำเร็จแล้ว
                  </span>
                </div>
              </div>
            )}

            {/* 5-Star Interactive Rating Selector */}
            <div className="py-2">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingScore(star)}
                    className="p-1 hover:scale-125 transition-transform active:scale-95"
                  >
                    <Star
                      className={`w-9 h-9 ${
                        star <= ratingScore
                          ? 'fill-amber-400 text-amber-400 drop-shadow'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-xs font-bold text-amber-600 mt-2">
                {ratingScore === 5 ? 'ยอดเยี่ยมมาก ⭐⭐⭐⭐⭐' : ratingScore === 4 ? 'ดีมาก ⭐⭐⭐⭐' : ratingScore === 3 ? 'พอใช้ ⭐⭐⭐' : 'ต้องปรับปรุง'}
              </div>
            </div>

            {/* Quick Compliment Tags */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {RATING_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#00e58b] text-[#041a12] shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Comment Input */}
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="เขียนข้อความขอบคุณหรือข้อเสนอแนะเพิ่มเติม..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-[#00e58b] focus:ring-1 focus:ring-[#00e58b]"
            />

            {/* Submit & Skip Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleSubmitRating}
                disabled={isSubmittingRating}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-sm shadow-xl active:scale-98 transition-all disabled:opacity-50"
              >
                {isSubmittingRating ? 'กำลังส่งคะแนน...' : 'ส่งคะแนนรีวิว (Submit)'}
              </button>
              <button
                onClick={handleSkipRating}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors"
              >
                ข้ามขั้นตอนนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingView;
