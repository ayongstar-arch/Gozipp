'use client';

import { useState, useEffect, useCallback } from 'react';

export type ActivityEventType =
  | 'TRIP_COMPLETED'
  | 'DRIVER_JOINED'
  | 'NEW_REGISTRATION'
  | 'QUEUE_OVERRIDE'
  | 'ALERT';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  description: string;
  timestamp: Date;
  actor?: string;
}

export interface KpiData {
  activeDrivers: number;
  tripsToday: number;
  avgWaitTime: string;
  systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export interface HourlyTrip {
  hour: string;
  count: number;
}

export interface DailyRevenue {
  day: string;
  amount: number;
}

const MOCK_EVENTS: Omit<ActivityEvent, 'id' | 'timestamp'>[] = [
  { type: 'TRIP_COMPLETED', description: 'เที่ยวเสร็จสิ้น — วิน Central Plaza → ลาดพร้าว 71', actor: 'DRV-0042' },
  { type: 'DRIVER_JOINED', description: 'คนขับเข้าคิว — วินหน้าเซ็นทรัล', actor: 'DRV-0118' },
  { type: 'NEW_REGISTRATION', description: 'ผู้โดยสารใหม่ลงทะเบียนสำเร็จ', actor: 'USR-9912' },
  { type: 'QUEUE_OVERRIDE', description: 'ลัดคิว — เหตุผล: ชดเชยเที่ยวก่อนหน้า', actor: 'ADMIN' },
  { type: 'ALERT', description: 'CPU utilization สูง 87% — API Gateway', actor: 'SYSTEM' },
  { type: 'TRIP_COMPLETED', description: 'เที่ยวเสร็จสิ้น — วิน MRT สุทธิสาร → จตุจักร', actor: 'DRV-0077' },
  { type: 'DRIVER_JOINED', description: 'คนขับเข้าคิว — วินหน้า BTS อารีย์', actor: 'DRV-0201' },
  { type: 'NEW_REGISTRATION', description: 'คนขับใหม่ส่งเอกสารรอตรวจสอบ', actor: 'DRV-0305' },
  { type: 'TRIP_COMPLETED', description: 'เที่ยวเสร็จสิ้น — วิน BTS สีลม → สาทร', actor: 'DRV-0015' },
  { type: 'ALERT', description: 'Payment gateway response time > 2s', actor: 'SYSTEM' },
  { type: 'QUEUE_OVERRIDE', description: 'ปรับลำดับคิวพิเศษ — เหตุ: ลูกค้า VIP', actor: 'ADMIN' },
  { type: 'DRIVER_JOINED', description: 'คนขับกลับเข้าคิว — วินหน้า MBK', actor: 'DRV-0063' },
];

function generateHourlyTrips(): HourlyTrip[] {
  const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  return hours.map((hour) => ({
    hour,
    count: Math.floor(Math.random() * 20) + 5,
  }));
}

function generateDailyRevenue(): DailyRevenue[] {
  const days = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
  return days.map((day) => ({
    day,
    amount: Math.floor(Math.random() * 15000) + 8000,
  }));
}

function generateInitialEvents(): ActivityEvent[] {
  const now = Date.now();
  return MOCK_EVENTS.slice(0, 8).map((evt, i) => ({
    ...evt,
    id: `evt-${now}-${i}`,
    timestamp: new Date(now - i * 120000), // 2 min apart
  }));
}

export function useAdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiData>({
    activeDrivers: 42,
    tripsToday: 156,
    avgWaitTime: '3.2 min',
    systemHealth: 'HEALTHY',
  });
  const [hourlyTrips, setHourlyTrips] = useState<HourlyTrip[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setHourlyTrips(generateHourlyTrips());
      setDailyRevenue(generateDailyRevenue());
      setRecentActivity(generateInitialEvents());
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Simulate live KPI increments
  useEffect(() => {
    if (isLoading) return;
    const interval = setInterval(() => {
      setKpis((prev) => {
        const driverDelta = Math.random() > 0.5 ? 1 : -1;
        const tripDelta = Math.floor(Math.random() * 3) + 1;
        const newWait = (2.5 + Math.random() * 2).toFixed(1);
        return {
          activeDrivers: Math.max(20, prev.activeDrivers + driverDelta),
          tripsToday: prev.tripsToday + tripDelta,
          avgWaitTime: `${newWait} min`,
          systemHealth: Math.random() > 0.95 ? 'WARNING' : 'HEALTHY',
        };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Simulate new activity events
  useEffect(() => {
    if (isLoading) return;
    const interval = setInterval(() => {
      const template = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
      const newEvent: ActivityEvent = {
        ...template,
        id: `evt-${Date.now()}`,
        timestamp: new Date(),
      };
      setRecentActivity((prev) => [newEvent, ...prev].slice(0, 20));
    }, 8000);
    return () => clearInterval(interval);
  }, [isLoading]);

  return {
    kpis,
    hourlyTrips,
    dailyRevenue,
    recentActivity,
    isLoading,
  };
}
