'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface PromotionRule {
  id: string;
  name: string;
  code: string;
  type: 'NEW_PASSENGER' | 'REFERRAL' | 'FIRST_RIDE' | 'TOPUP_BONUS' | 'CUSTOM';
  points: number;
  description: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  maxUsageLimit?: number;
  currentUsage: number;
  updatedAt: string;
}

// Initial fallback values
const INITIAL_PROMOTIONS: PromotionRule[] = [
  {
    id: 'PROMO-NEW-PASSENGER',
    name: 'สมัครผู้โดยสารใหม่ รับแต้มฟรี',
    code: 'WELCOME50',
    type: 'NEW_PASSENGER',
    points: 50,
    description: 'ผู้โดยสารใหม่ลงทะเบียนสำเร็จ รับแต้มเข้ากระเป๋าทันทีเพื่อใช้เดินทาง',
    isActive: true,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    maxUsageLimit: 10000,
    currentUsage: 1482,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROMO-REFERRAL',
    name: 'โบนัสชวนเพื่อนเดินทาง (Referral Bonus)',
    code: 'FRIEND50',
    type: 'REFERRAL',
    points: 50,
    description: 'รับแต้ม 50 แต้ม เมื่อเพื่อนที่คุณชวนสมัครและเดินทางเที่ยวแรกสำเร็จ',
    isActive: true,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    maxUsageLimit: 50000,
    currentUsage: 860,
    updatedAt: new Date().toISOString(),
  },
];

export function useActivePromotion() {
  const [promotions, setPromotions] = useState<PromotionRule[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('gozipp_promotions_config');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return INITIAL_PROMOTIONS;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Helper: check if promotion is currently valid by date and active flag
  const isPromoActive = useCallback((p: PromotionRule) => {
    if (!p.isActive) return false;
    const today = new Date().toISOString().split('T')[0];
    if (p.startDate && today < p.startDate) return false;
    if (p.endDate && today > p.endDate) return false;
    if (typeof p.maxUsageLimit === 'number' && p.currentUsage >= p.maxUsageLimit) return false;
    return true;
  }, []);

  // Fetch promotions from API
  const fetchPromotions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/promotions', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.promotions)) {
          setPromotions(data.promotions);
          try {
            localStorage.setItem('gozipp_promotions_config', JSON.stringify(data.promotions));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Failed to fetch promotions from API, using cached state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();

    // 1. Supabase Realtime Subscription (Instant live update when admin edits)
    let channel: any = null;
    try {
      if (supabase && typeof supabase.channel === 'function') {
        channel = supabase
          .channel('public:system_settings:promotions')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'system_settings',
              filter: 'key=eq.promotions_config',
            },
            (payload: any) => {
              if (payload?.new?.value && Array.isArray(payload.new.value)) {
                setPromotions(payload.new.value);
                try {
                  localStorage.setItem('gozipp_promotions_config', JSON.stringify(payload.new.value));
                } catch {}
              }
            }
          )
          .subscribe();
      }
    } catch (realtimeErr) {
      console.warn('Supabase Realtime not subscribed:', realtimeErr);
    }

    // 2. Cross-tab Broadcast Channel (Instant sync across open browser tabs)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('gozipp_promotions_sync');
        bc.onmessage = (event) => {
          if (event?.data?.promotions && Array.isArray(event.data.promotions)) {
            setPromotions(event.data.promotions);
          }
        };
      }
    } catch {}

    // 3. Storage event listener (sync on localStorage changes)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gozipp_promotions_config' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) setPromotions(updated);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Fallback polling heartbeat (every 20 seconds)
    const interval = setInterval(fetchPromotions, 20000);

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [fetchPromotions]);

  // Active New Passenger Promotion
  const newPassengerPromo = useMemo(() => {
    return promotions.find((p) => p.type === 'NEW_PASSENGER' && isPromoActive(p)) || null;
  }, [promotions, isPromoActive]);

  const newPassengerPoints = useMemo(() => {
    return newPassengerPromo ? newPassengerPromo.points : 0;
  }, [newPassengerPromo]);

  const newPassengerBadge = useMemo(() => {
    if (!newPassengerPromo || newPassengerPoints <= 0) {
      return 'สมัครฟรี เริ่มเดินทางได้ทันที';
    }
    return `รับแต้มฟรี ${newPassengerPoints} แต้ม`;
  }, [newPassengerPromo, newPassengerPoints]);

  // Active Referral Promotion
  const referralPromo = useMemo(() => {
    return promotions.find((p) => p.type === 'REFERRAL' && isPromoActive(p)) || null;
  }, [promotions, isPromoActive]);

  const referralPoints = useMemo(() => {
    return referralPromo ? referralPromo.points : 0;
  }, [referralPromo]);

  return {
    promotions,
    isLoading,
    newPassengerPromo,
    newPassengerPoints,
    newPassengerBadge,
    referralPromo,
    referralPoints,
    refreshPromotions: fetchPromotions,
  };
}
