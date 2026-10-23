import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export interface CustomerPointRecord {
  id: string;
  name: string;
  phone: string;
  currentPoints: number;
  welcomePoints: number;
  totalToppedUpBaht: number;
  totalPointsEarned: number;
  totalRidesUsed: number;
  registrationDate: string;
  lastTopupDate?: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

let customersList: CustomerPointRecord[] = [
  {
    id: 'P-9921',
    name: 'สมชาย พัฒนกิจ',
    phone: '089-123-4567',
    currentPoints: 170, // 60 welcome + 110 topup - 0 rides
    welcomePoints: 60,
    totalToppedUpBaht: 100,
    totalPointsEarned: 170,
    totalRidesUsed: 0,
    registrationDate: '2026-10-23T11:40:00+07:00',
    lastTopupDate: '2026-10-23T11:45:12+07:00',
    status: 'ACTIVE',
  },
  {
    id: 'P-8834',
    name: 'นริศรา สุวรรณเมธา',
    phone: '081-999-8888',
    currentPoints: 106, // 60 welcome + 50 topup - 4 rides (2 rides x 2 pts)
    welcomePoints: 60,
    totalToppedUpBaht: 50,
    totalPointsEarned: 110,
    totalRidesUsed: 2,
    registrationDate: '2026-10-23T11:10:00+07:00',
    lastTopupDate: '2026-10-23T11:32:04+07:00',
    status: 'ACTIVE',
  },
  {
    id: 'P-7712',
    name: 'กิตติศักดิ์ เจริญดี',
    phone: '062-555-4321',
    currentPoints: 274, // 60 welcome + 220 topup - 6 rides (3 rides x 2 pts)
    welcomePoints: 60,
    totalToppedUpBaht: 200,
    totalPointsEarned: 280,
    totalRidesUsed: 3,
    registrationDate: '2026-10-23T10:30:00+07:00',
    lastTopupDate: '2026-10-23T11:15:33+07:00',
    status: 'ACTIVE',
  },
  {
    id: 'P-6623',
    name: 'พิมพ์มาดา อมรรัตน์',
    phone: '090-111-2222',
    currentPoints: 102, // 60 welcome + 50 topup - 8 rides (4 rides x 2 pts)
    welcomePoints: 60,
    totalToppedUpBaht: 50,
    totalPointsEarned: 110,
    totalRidesUsed: 4,
    registrationDate: '2026-10-23T09:45:00+07:00',
    lastTopupDate: '2026-10-23T10:58:20+07:00',
    status: 'ACTIVE',
  },
  {
    id: 'P-5590',
    name: 'ธนวัฒน์ ศรีสุข',
    phone: '088-777-6666',
    currentPoints: 168, // 60 welcome + 110 topup - 2 rides (1 ride x 2 pts)
    welcomePoints: 60,
    totalToppedUpBaht: 100,
    totalPointsEarned: 170,
    totalRidesUsed: 1,
    registrationDate: '2026-10-23T09:15:00+07:00',
    lastTopupDate: '2026-10-23T10:40:15+07:00',
    status: 'ACTIVE',
  },
  {
    id: 'P-4421',
    name: 'วาสนา บุญฤทธิ์',
    phone: '086-444-3322',
    currentPoints: 86, // 60 welcome + 30 topup - 4 rides (2 rides x 2 pts)
    welcomePoints: 60,
    totalToppedUpBaht: 30,
    totalPointsEarned: 90,
    totalRidesUsed: 2,
    registrationDate: '2026-10-22T16:20:00+07:00',
    lastTopupDate: '2026-10-23T10:12:45+07:00',
    status: 'ACTIVE',
  },
  {
    id: 'P-3319',
    name: 'ชวลิต วงศ์สว่าง',
    phone: '082-333-1122',
    currentPoints: 604, // 60 welcome + 550 topup - 6 rides (3 rides x 2 pts)
    welcomePoints: 60,
    totalToppedUpBaht: 500,
    totalPointsEarned: 610,
    totalRidesUsed: 3,
    registrationDate: '2026-10-22T14:00:00+07:00',
    lastTopupDate: '2026-10-23T09:30:10+07:00',
    status: 'ACTIVE',
  },
  {
    id: 'P-2201',
    name: 'อรทัย กุลศิริ',
    phone: '085-222-1100',
    currentPoints: 60, // 60 welcome - 0 rides
    welcomePoints: 60,
    totalToppedUpBaht: 0,
    totalPointsEarned: 60,
    totalRidesUsed: 0,
    registrationDate: '2026-10-23T11:50:00+07:00',
    status: 'ACTIVE',
  },
];

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('passengers')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: CustomerPointRecord[] = data.map((p: any) => ({
            id: p.id,
            name: p.name || 'ผู้โดยสาร',
            phone: p.phone || '-',
            currentPoints: Number(p.points_balance) || 0,
            welcomePoints: 60,
            totalToppedUpBaht: Number(p.total_topped_up) || 0,
            totalPointsEarned: Number(p.points_balance) || 0,
            totalRidesUsed: Number(p.total_rides) || 0,
            registrationDate: p.created_at,
            status: 'ACTIVE',
          }));
          customersList = mapped;
        }
      } catch (dbErr) {
        // Fallback to customersList
      }
    }

    let filtered = customersList;
    if (query) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          c.id.toLowerCase().includes(query)
      );
    }

    const totalSystemPoints = customersList.reduce((acc, curr) => acc + curr.currentPoints, 0);
    const totalCustomersCount = customersList.length;

    return NextResponse.json({
      success: true,
      customers: filtered,
      summary: {
        totalCustomersCount,
        totalSystemPoints,
        avgPointsPerCustomer: Math.round(totalSystemPoints / (totalCustomersCount || 1)),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
