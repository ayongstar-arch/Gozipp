/**
 * HomeView.tsx — GoZipp Passenger Home Screen
 * Real GPS Geolocation + Reverse Geocoding (Thai address) + Mobile responsive layout
 * Designed to fit perfectly without overflow on all smartphone viewports.
 */
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRideStore } from '../../stores/rideStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useRide } from '../../hooks/useRide';
import { STATION_ZONES } from '@/constants';
import {
  MapPin,
  LocateFixed,
  MessageSquare,
  Mic,
  ChevronRight,
  Bike,
  ArrowRight,
  Info,
  Bell,
  ShieldCheck,
  CheckCircle2,
  Phone,
  X,
} from 'lucide-react';

// Dynamic import for Leaflet map to prevent SSR window errors
const PassengerHomeMap = dynamic(() => import('@/components/PassengerHomeMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#07131d] flex flex-col items-center justify-center text-slate-500 gap-3">
      <div className="w-7 h-7 border-2 border-[#00e58b]/30 border-t-[#00e58b] rounded-full animate-spin" />
      <span className="text-[11px] font-medium text-slate-400">กำลังเชื่อมต่อแผนที่ GoZipp...</span>
    </div>
  ),
});

// Sukhumvit 23 fallback
const DEFAULT_COORDS = { lat: 13.738, lng: 100.562 };
const DEFAULT_ADDRESS = 'ซอยสุขุมวิท 23, คลองเตยเหนือ';

export default function HomeView() {
  const { myLocation, setMyLocation, isSearching, activeDriver, stationId, setStationId } =
    useRideStore();
  const { user } = useAuthStore();
  const { setToastMessage } = useUIStore();
  const { requestRide, cancelRide, isLoading, error } = useRide();

  // State
  const [currentAddress, setCurrentAddress] = useState(DEFAULT_ADDRESS);
  const [isGpsLocked, setIsGpsLocked] = useState(false);
  const [pickupNote, setPickupNote] = useState('');
  const [triggerRecenter, setTriggerRecenter] = useState(0);
  const [showWinDetails, setShowWinDetails] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  // Quick Chips
  const quickChips = useMemo(
    () => ['หน้าคอนโด', 'ร้านกาแฟ Amazon', 'ปากซอยสุขุมวิท 23'],
    []
  );

  // Reverse Geocoding helper (Thai Language)
  const fetchAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=th`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const addr = data.address;
        if (addr) {
          const road = addr.road || addr.pedestrian || addr.suburb || '';
          const district = addr.subdistrict || addr.district || addr.city_district || addr.city || '';
          if (road && district) {
            setCurrentAddress(`${road}, ${district}`);
            return;
          } else if (data.display_name) {
            const parts = data.display_name.split(',').map((s: string) => s.trim());
            setCurrentAddress(`${parts[0] || 'ตำแหน่งของคุณ'}, ${parts[1] || ''}`);
            return;
          }
        }
      }
    } catch {
      // Keep sensible fallback
    }
  }, []);

  // Real-time GPS Watcher
  useEffect(() => {
    if (!navigator.geolocation) {
      setToastMessage('⚠️ เบราว์เซอร์ไม่รองรับ GPS');
      return;
    }

    let isMounted = true;

    // 1. Instant check with cache
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isMounted) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyLocation({ lat, lng });
        setIsGpsLocked(true);
        fetchAddressFromCoords(lat, lng);
      },
      () => {
        // Fallback silently to default
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    );

    // 2. Active continuous watcher
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!isMounted) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyLocation({ lat, lng });
        setIsGpsLocked(true);
        fetchAddressFromCoords(lat, lng);
      },
      (err) => {
        if (err.code === 1) {
          // Permission denied
          setIsGpsLocked(false);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );

    return () => {
      isMounted = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [setMyLocation, fetchAddressFromCoords, setToastMessage]);

  // Sync nearest station
  useEffect(() => {
    if (!stationId && STATION_ZONES.length > 0) {
      setStationId(STATION_ZONES[0].id);
    }
  }, [stationId, setStationId]);

  // Error feedback
  useEffect(() => {
    if (error) {
      setToastMessage('❌ ' + error);
    }
  }, [error, setToastMessage]);

  const mapCenter = myLocation || DEFAULT_COORDS;

  // Re-center handler: triggers GPS refresh and pans map
  const handleRecenter = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMyLocation({ lat, lng });
          setIsGpsLocked(true);
          fetchAddressFromCoords(lat, lng);
          setTriggerRecenter((prev) => prev + 1);
          setToastMessage('📍 อัปเดตพิกัด GPS สำเร็จ');
        },
        () => {
          setTriggerRecenter((prev) => prev + 1);
          setToastMessage('📍 ตำแหน่งปัจจุบันของคุณ');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setTriggerRecenter((prev) => prev + 1);
    }
  }, [setMyLocation, fetchAddressFromCoords, setToastMessage]);

  // Voice note simulation / Web Speech API
  const handleVoiceInput = useCallback(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      try {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'th-TH';
        recognition.onstart = () => setToastMessage('🎙️ กำลังฟังเสียงจุดรับของคุณ...');
        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            setPickupNote(text);
            setToastMessage(`🎙️ บันทึก: "${text}"`);
          }
        };
        recognition.onerror = () => setToastMessage('⚠️ ไม่สามารถแปลงเสียงได้');
        recognition.start();
        return;
      } catch (e) {
        // Fallback
      }
    }
    const samples = ['หน้าล็อบบี้คอนโด', 'หน้าร้าน 7-Eleven', 'รอใต้ตึก'];
    const chosen = samples[Math.floor(Math.random() * samples.length)];
    setPickupNote(chosen);
    setToastMessage(`🎙️ บันทึกเสียง: "${chosen}"`);
  }, [setToastMessage]);

  // Main Call Win handler
  const handleCallWin = async () => {
    const lat = myLocation?.lat || DEFAULT_COORDS.lat;
    const lng = myLocation?.lng || DEFAULT_COORDS.lng;
    const fullPickup = pickupNote ? `${currentAddress} (${pickupNote})` : currentAddress;

    const destLat = lat + 0.006;
    const destLng = lng + 0.004;
    const destAddress = 'แจ้งคนขับเมื่อขึ้นรถ (วินใกล้คุณ)';

    await requestRide(lat, lng, fullPickup, destLat, destLng, destAddress);
  };

  return (
    <div className="relative w-full max-w-full h-full min-h-0 flex flex-col justify-between bg-[#07131d] overflow-hidden font-kanit box-border select-none">
      {/* 1. FULL BACKGROUND DARK MAP */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <PassengerHomeMap center={mapCenter} triggerRecenter={triggerRecenter} />
      </div>

      {/* 2. TOP FLOATING CARDS (Responsive & Compact to prevent mobile overflow) */}
      <div className="relative z-20 px-3 pt-2 sm:px-4 sm:pt-3 space-y-2 pointer-events-none w-full max-w-full min-w-0 box-border">
        {/* Header Bar */}
        <div className="flex items-center justify-between pointer-events-auto w-full max-w-full min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center">
              <div className="flex flex-col gap-0.5 mr-1">
                <div className="w-2 h-[2px] bg-[#00e58b] rounded-full shadow-[0_0_6px_#00e58b]" />
                <div className="w-1.5 h-[2px] bg-[#00e58b] rounded-full shadow-[0_0_6px_#00e58b]" />
              </div>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00f293] to-[#00b865] flex items-center justify-center shadow-lg shadow-[#00e58b]/20">
                <div className="w-2 h-2 rounded-full bg-white ring-2 ring-[#07131d]" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline leading-none">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white">Go</span>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-[#00e58b]">Zipp</span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">
                วินใกล้คุณ ไปได้ทุกที่
              </div>
            </div>
          </div>

          {/* Right Actions: Notification + Safety Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setToastMessage('🔔 ไม่มีแจ้งเตือนใหม่')}
              className="w-8 h-8 rounded-full bg-[#0a1e2d]/85 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-200 hover:text-white transition-colors relative shadow-lg active:scale-95 shrink-0"
              title="การแจ้งเตือน"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-[#0a1e2d]" />
            </button>

            <button
              onClick={() => setShowSafetyModal(true)}
              className="bg-[#06241b]/90 backdrop-blur-md border border-emerald-500/50 text-[#00e58b] px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 shadow-lg active:scale-95 transition-all shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#00e58b]" />
              <span>ปลอดภัย</span>
            </button>
          </div>
        </div>

        {/* Current Location Card */}
        <div className="bg-[#091b27]/85 backdrop-blur-md rounded-2xl border border-slate-700/60 p-2.5 sm:p-3 shadow-2xl flex items-center justify-between gap-2.5 pointer-events-auto w-full max-w-full min-w-0 box-border">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#00d075] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#00d075]/30">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 fill-white/20" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium leading-none">
                ตำแหน่งปัจจุบันของคุณ
              </div>
              <div className="text-xs sm:text-sm font-bold text-white tracking-tight truncate mt-0.5 max-w-[210px] sm:max-w-[260px]">
                {currentAddress}
              </div>
              <div className="text-[9px] sm:text-[10px] text-[#00e58b] font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-[#00e58b] shrink-0" />
                <span>{isGpsLocked ? 'GPS พร้อมใช้งาน (พิกัดสด)' : 'GPS กำลังตรวจจับสัญญาณ'}</span>
              </div>
            </div>
          </div>

          {/* Recenter Button */}
          <button
            onClick={handleRecenter}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#102433] border border-slate-700/60 flex items-center justify-center text-[#00e58b] hover:bg-[#163449] active:scale-95 transition-all shrink-0 shadow-md"
            title="ระบุตำแหน่งปัจจุบัน"
          >
            <LocateFixed className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>

        {/* Tell Pickup Point Card */}
        <div className="bg-[#091b27]/85 backdrop-blur-md rounded-2xl border border-[#00e58b]/30 p-2.5 sm:p-3 shadow-2xl space-y-2 pointer-events-auto w-full max-w-full min-w-0 box-border">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-300 font-medium">
            <MessageSquare className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span>บอกจุดรับ (สำหรับคนขับ)</span>
          </div>

          {/* White Input Pill */}
          <div className="bg-white rounded-full pl-3 pr-1 py-1 flex items-center justify-between shadow-md w-full max-w-full min-w-0 box-border">
            <input
              type="text"
              value={pickupNote}
              onChange={(e) => setPickupNote(e.target.value)}
              placeholder="เช่น หน้าคอนโด, ร้านกาแฟ, บริษัท..."
              className="text-xs text-slate-800 placeholder-slate-400 font-medium outline-none bg-transparent flex-1 w-full min-w-0 pr-1.5"
            />
            <button
              onClick={handleVoiceInput}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#182836] flex items-center justify-center text-white hover:bg-slate-700 active:scale-95 transition-colors shrink-0 shadow-sm"
              title="พูดบอกจุดรับ"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Chips Row (Scrollable, doesn't blowout container) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 w-full max-w-full min-w-0">
            {quickChips.map((chip, idx) => {
              const isSelected = pickupNote === chip;
              return (
                <button
                  key={idx}
                  onClick={() => setPickupNote(isSelected ? '' : chip)}
                  className={`text-[10px] sm:text-[11px] font-normal px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 transition-all active:scale-95 whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#00e58b]/20 border border-[#00e58b] text-[#00e58b] font-medium'
                      : 'bg-[#102636] hover:bg-[#17374d] text-slate-300 border border-white/5'
                  }`}
                >
                  <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  <span>{chip}</span>
                </button>
              );
            })}
            <div className="text-slate-500 pl-0.5 shrink-0">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM FLOATING CONTROLS (Positioned tightly above bottom navigation) */}
      <div className="relative z-20 px-3 pb-2 sm:px-4 sm:pb-3 space-y-2 pointer-events-none w-full max-w-full min-w-0 box-border">
        {/* Nearby Win Card */}
        <div
          onClick={() => setShowWinDetails(!showWinDetails)}
          className="bg-[#091b27]/90 backdrop-blur-md rounded-2xl border border-slate-700/60 p-2.5 sm:p-3 shadow-2xl flex items-center justify-between cursor-pointer hover:border-[#00e58b]/40 active:scale-[0.99] transition-all pointer-events-auto w-full max-w-full min-w-0 box-border"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#102a3a] border border-[#00e58b]/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight">
                วินใกล้คุณ
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                มีคนขับพร้อมให้บริการหลายคัน
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
        </div>

        {/* Main CTA Button: เรียกวินใกล้ฉัน */}
        <div className="pointer-events-auto w-full max-w-full">
          <button
            onClick={handleCallWin}
            disabled={isLoading || isSearching}
            className="w-full py-3 sm:py-3.5 px-4 rounded-full font-black text-sm sm:text-base text-[#041a12] bg-gradient-to-r from-[#00f293] via-[#00d075] to-[#00b865] shadow-[0_10px_25px_rgba(0,229,139,0.35)] flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Bike className="w-4 h-4 sm:w-5 sm:h-5 text-[#041a12] stroke-[2.5]" />
            <span className="tracking-tight font-black">
              {isLoading ? 'กำลังส่งคำขอ...' : 'เรียกวินใกล้ฉัน'}
            </span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#041a12] stroke-[2.5]" />
          </button>

          {/* Subtext info */}
          <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[10px] sm:text-xs text-slate-400 font-normal">
            <Info className="w-3 h-3 text-slate-400" />
            <span>ไม่ต้องระบุจุดหมายปลายทาง</span>
          </div>
        </div>
      </div>

      {/* 4. MODAL: SEARCHING OVERLAY */}
      {isSearching && !activeDriver && (
        <div className="absolute inset-0 z-50 bg-[#07131d]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="relative mb-5">
            <div className="w-24 h-24 border-4 border-[#00e58b]/20 border-t-[#00e58b] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">
              🛵
            </div>
          </div>
          <h3 className="text-xl font-black mb-1.5 tracking-tight">กำลังหาพี่วิน...</h3>
          <p className="text-slate-300 text-xs max-w-xs">
            กำลังแจ้งเตือนคนขับในพื้นที่ <strong className="text-[#00e58b]">{currentAddress}</strong>
          </p>
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-2.5 text-[11px] text-slate-300">
            ไม่ต้องระบุจุดหมาย · ชำระตามมิเตอร์มาตรฐาน
          </div>
          <button
            onClick={cancelRide}
            className="mt-6 px-7 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl text-xs font-bold transition-all active:scale-95"
          >
            ยกเลิกการค้นหา
          </button>
        </div>
      )}

      {/* 5. MODAL: ACTIVE DRIVER MATCHED */}
      {activeDriver && (
        <div className="absolute bottom-16 left-3 right-3 z-50 bg-[#091b27]/95 backdrop-blur-xl border border-[#00e58b]/30 rounded-3xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#00d075]/20 text-[#00d075] flex items-center justify-center text-xl border border-[#00d075]/30">
                🛵
              </div>
              <div>
                <div className="text-[10px] text-[#00e58b] font-bold uppercase tracking-wider">
                  คนขับกำลังมารับคุณ
                </div>
                <div className="text-base font-black text-white">{activeDriver.name}</div>
                <div className="text-[11px] text-slate-400 font-medium">{activeDriver.plate}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-amber-400 text-xs font-bold">
                ⭐ {activeDriver.rating?.toFixed(1) || '5.0'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
            {activeDriver.phone && (
              <a
                href={`tel:${activeDriver.phone}`}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded-xl text-xs font-bold text-center text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#00e58b]" />
                โทรหาคนขับ
              </a>
            )}
            <button
              onClick={cancelRide}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* 6. MODAL: SAFETY GUARANTEE */}
      {showSafetyModal && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-5">
          <div className="bg-[#091b27] border border-[#00e58b]/30 rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl relative">
            <button
              onClick={() => setShowSafetyModal(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#00e58b]/10 text-[#00e58b] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">มาตรฐานความปลอดภัย</h4>
                <p className="text-[11px] text-slate-400">GoZipp Safety Guarantee</p>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00e58b] shrink-0 mt-0.5" />
                <span>คนขับทุกคนมีใบขับขี่สาธารณะและตรวจสอบประวัติ</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00e58b] shrink-0 mt-0.5" />
                <span>ติดตามตำแหน่ง GPS Real-time ตลอดการเดินทาง</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00e58b] shrink-0 mt-0.5" />
                <span>มีระบบ SOS และศูนย์ช่วยเหลือฉุกเฉินในแอป</span>
              </div>
            </div>

            <button
              onClick={() => setShowSafetyModal(false)}
              className="w-full bg-[#00e58b] text-[#041a12] font-black py-2.5 rounded-xl text-xs mt-3 hover:brightness-105"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
