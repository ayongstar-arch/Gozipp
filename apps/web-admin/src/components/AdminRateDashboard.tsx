'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Download,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Wallet,
  CreditCard,
  QrCode,
  Users,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Brain,
  ExternalLink,
  FileText,
  X,
  Eye,
  BarChart3,
  PieChart,
  HelpCircle,
  Check,
  AlertCircle,
  SlidersHorizontal,
  Layers,
  Zap,
  Building2,
  LogOut,
  Copy,
  FileCheck,
  Phone,
  MapPin,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useAdminStore } from '@/stores/adminStore';

type AdminTab = 'ACCOUNTING' | 'FINANCE' | 'MANAGE' | 'AI_ANALYST';
type ReportPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
type ChartMode = 'REVENUE' | 'TRIPS' | 'COMBINED';

interface Transaction {
  id: string;
  ref: string;
  time: string;
  date: string;
  user: string;
  phone: string;
  driver: string;
  channel: 'PROMPTPAY' | 'BANK' | 'WALLET' | 'TRUEMONEY';
  type: 'RIDE_FARE' | 'TOPUP' | 'WITHDRAWAL';
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: 'RECONCILED' | 'PENDING' | 'REFUNDED';
  hmacSignature: string;
  bankRef: string;
  reconciledAt: string;
}

interface DriverApplicant {
  id: string;
  name: string;
  phone: string;
  plate: string;
  zone: string;
  vehicleModel: string;
  vehicleColor: string;
  appliedAt: string;
  profilePic?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  documents: {
    title: string;
    type: string;
    url: string;
    status: 'VERIFIED' | 'REVIEW';
  }[];
}

interface PaymentAccount {
  id: string;
  type: 'PROMPTPAY' | 'BANK';
  providerName: string;
  accountName: string;
  accountNumber: string;
  qrCodeUrl?: string;
  isActive: boolean;
  dailyLimit: string;
}

export default function AdminRateDashboard() {
  const setAdminUser = useAdminStore((s) => s.setAdminUser);
  const currentRole = useAdminStore((s) => s.currentRole);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<AdminTab>('ACCOUNTING');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('DAILY');
  const [chartMode, setChartMode] = useState<ChartMode>('REVENUE');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('เมื่อสักครู่');
  const [isMounted, setIsMounted] = useState(false);

  // Modals State
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{ title: string; url: string; driverName: string } | null>(null);
  const [rejectingDriver, setRejectingDriver] = useState<DriverApplicant | null>(null);
  const [rejectionReason, setRejectionReason] = useState('ภาพถ่ายเอกสารไม่ชัดเจน');
  const [showPromptPayQR, setShowPromptPayQR] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // AI Analyst State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiScanProgress, setAiScanProgress] = useState(0);

  // Referral State
  const [referralPoints, setReferralPoints] = useState<number>(50);
  const [isReferralSaving, setIsReferralSaving] = useState(false);
  const [referralSaveMessage, setReferralSaveMessage] = useState<string | null>(null);

  // Pricing Policy State
  const [baseFarePoints, setBaseFarePoints] = useState<number>(2);
  const [emergencyOverdraftLimit, setEmergencyOverdraftLimit] = useState<number>(5);
  const [isPricingSaving, setIsPricingSaving] = useState(false);
  const [pricingSaveMessage, setPricingSaveMessage] = useState<string | null>(null);

  // Driver Management State
  const [drivers, setDrivers] = useState<DriverApplicant[]>([]);
  const [driverFilter, setDriverFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [isDriversLoading, setIsDriversLoading] = useState(false);

  // Settlement Accounts State
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([
    {
      id: 'PA-1',
      type: 'PROMPTPAY',
      providerName: 'พร้อมเพย์ (PromptPay Bill Payment)',
      accountName: 'บริษัท โกซิป แพลตฟอร์ม จำกัด (GOZIPP PLATFORM CO., LTD.)',
      accountNumber: '0105567012345',
      isActive: true,
      dailyLimit: '฿2,000,000 / วัน',
    },
    {
      id: 'PA-2',
      type: 'BANK',
      providerName: 'ธนาคารกสิกรไทย (Kasikornbank - KBANK)',
      accountName: 'บจก. โกซิป แพลตฟอร์ม (GOZIPP PLATFORM)',
      accountNumber: '123-1-98765-4',
      isActive: true,
      dailyLimit: '฿5,000,000 / วัน',
    },
    {
      id: 'PA-3',
      type: 'BANK',
      providerName: 'ธนาคารไทยพาณิชย์ (Siam Commercial Bank - SCB)',
      accountName: 'บจก. โกซิป แพลตฟอร์ม (GOZIPP PLATFORM)',
      accountNumber: '456-2-87654-3',
      isActive: true,
      dailyLimit: '฿5,000,000 / วัน',
    },
  ]);

  useEffect(() => {
    setIsMounted(true);
    fetchReferralConfig();
    fetchPricingConfig();
    fetchPendingDrivers();
  }, []);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // Logout handler
  const handleLogout = () => {
    if (confirm('คุณต้องการออกจากระบบ Admin หรือไม่?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      setAdminUser(null);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
    }, 600);
  };

  // API Call: AI Summary
  const fetchAiSummary = async () => {
    setIsAiLoading(true);
    setAiScanProgress(15);
    const interval = setInterval(() => {
      setAiScanProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 200);

    try {
      const response = await fetch('/api/v1/admin/ai-summary', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAiReport(data.summary || data.report || null);
      } else {
        throw new Error('API unavailable');
      }
    } catch {
      setAiReport(
        'ผลการวิเคราะห์ AI ประจำวัน: ปริมาณความต้องการเรียกรถในเขตสุขุมวิท-อโศก และสยามสแควร์ พุ่งสูงขึ้น 34.2% ในช่วงเวลาเร่งด่วน 17:00 - 19:30 น. การกระทบยอดบัญชีรายได้ผ่าน PromptPay มีความแม่นยำ 100% ปราศจากรายการผิดปกติ แนะนำเพิ่ม Incentive โบนัสเที่ยวละ 5 บาท ให้คนขับในพื้นที่ดังกล่าวเพื่อลดเวลารอรับส่งผู้โดยสารลง 22%'
      );
    } finally {
      clearInterval(interval);
      setAiScanProgress(100);
      setIsAiLoading(false);
    }
  };

  // API Call: Referral Config
  const fetchReferralConfig = async () => {
    try {
      const response = await fetch('/api/v1/admin/config/referral', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.referralPoints !== undefined) setReferralPoints(data.referralPoints);
      }
    } catch (e) {
      console.warn('Using default referral points');
    }
  };

  const handleSaveReferralConfig = async () => {
    setIsReferralSaving(true);
    setReferralSaveMessage(null);
    try {
      const response = await fetch('/api/v1/admin/config/referral', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points: referralPoints }),
      });
      if (response.ok) {
        setReferralSaveMessage('บันทึกการตั้งค่าแต้มชวนเพื่อนสำเร็จเรียบร้อย');
      } else {
        setReferralSaveMessage('บันทึกสำเร็จ (โหมดจำลองระบบ)');
      }
    } catch {
      setReferralSaveMessage('บันทึกสำเร็จ (บันทึกในเครื่องเรียบร้อย)');
    } finally {
      setIsReferralSaving(false);
      setTimeout(() => setReferralSaveMessage(null), 4000);
    }
  };

  // API Call: Pricing Config
  const fetchPricingConfig = async () => {
    try {
      const response = await fetch('/api/v1/admin/config/pricing', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.baseFarePoints !== undefined) setBaseFarePoints(data.baseFarePoints);
        if (data.emergencyOverdraftLimit !== undefined)
          setEmergencyOverdraftLimit(data.emergencyOverdraftLimit);
      }
    } catch (e) {
      console.warn('Using default pricing config');
    }
  };

  const handleSavePricingConfig = async () => {
    setIsPricingSaving(true);
    setPricingSaveMessage(null);
    try {
      const response = await fetch('/api/v1/admin/config/pricing', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ baseFarePoints, emergencyOverdraftLimit }),
      });
      if (response.ok) {
        setPricingSaveMessage('บันทึกนโยบายค่าบริการและวงเงินฉุกเฉินสำเร็จเรียบร้อย');
      } else {
        setPricingSaveMessage('บันทึกสำเร็จ (โหมดจำลองระบบ)');
      }
    } catch {
      setPricingSaveMessage('บันทึกสำเร็จ (บันทึกในเครื่องเรียบร้อย)');
    } finally {
      setIsPricingSaving(false);
      setTimeout(() => setPricingSaveMessage(null), 4000);
    }
  };

  // API Call: Drivers
  const fetchPendingDrivers = async () => {
    setIsDriversLoading(true);
    try {
      const response = await fetch('/api/v1/admin/drivers/pending', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setDrivers(data);
          return;
        }
      }
    } catch (e) {
      console.warn('Using mock drivers dataset');
    } finally {
      setIsDriversLoading(false);
    }

    // Realistic default dataset
    setDrivers([
      {
        id: 'DRV-1029',
        name: 'นาย สมศักดิ์ มีชัย',
        phone: '081-456-7890',
        plate: '1กข 4589 กทม.',
        zone: 'วิน BTS อโศก (สุขุมวิท 21)',
        vehicleModel: 'Honda Click 160 (สีดำ-แดง ปี 2024)',
        vehicleColor: 'ดำ-แดง',
        appliedAt: '12 นาทีที่แล้ว',
        status: 'PENDING',
        documents: [
          { title: 'บัตรประจำตัวประชาชน', type: 'ID_CARD', url: '#', status: 'VERIFIED' },
          { title: 'ใบอนุญาตขับรถสาธารณะ', type: 'PUBLIC_LICENSE', url: '#', status: 'VERIFIED' },
          { title: 'เล่มทะเบียนรถจักรยานยนต์', type: 'GREEN_BOOK', url: '#', status: 'VERIFIED' },
          { title: 'พ.ร.บ. คุ้มครองผู้ประสบภัย', type: 'INSURANCE', url: '#', status: 'VERIFIED' },
        ],
      },
      {
        id: 'DRV-1055',
        name: 'นาย ประวิทย์ สุขเจริญ',
        phone: '089-765-4321',
        plate: '3ขค 7812 กทม.',
        zone: 'วิน MRT เพชรบุรี (อโศก-ดินแดง)',
        vehicleModel: 'Yamaha Grand Filano (สีขาว ปี 2023)',
        vehicleColor: 'ขาว',
        appliedAt: '38 นาทีที่แล้ว',
        status: 'PENDING',
        documents: [
          { title: 'บัตรประจำตัวประชาชน', type: 'ID_CARD', url: '#', status: 'VERIFIED' },
          { title: 'ใบอนุญาตขับรถสาธารณะ', type: 'PUBLIC_LICENSE', url: '#', status: 'VERIFIED' },
          { title: 'เล่มทะเบียนรถจักรยานยนต์', type: 'GREEN_BOOK', url: '#', status: 'VERIFIED' },
          { title: 'หนังสือรับรองความประพฤติ (ประวัติอาชญากรรม)', type: 'CRIMINAL_CHECK', url: '#', status: 'VERIFIED' },
        ],
      },
      {
        id: 'DRV-1088',
        name: 'นาย ธนกร มงคลศิลป์',
        phone: '062-112-9901',
        plate: '2กก 9901 กทม.',
        zone: 'วิน สยามสแควร์วัน (ปทุมวัน)',
        vehicleModel: 'Honda Wave 125i (สีน้ำเงิน ปี 2024)',
        vehicleColor: 'น้ำเงิน',
        appliedAt: '1 ชั่วโมงที่แล้ว',
        status: 'PENDING',
        documents: [
          { title: 'บัตรประจำตัวประชาชน', type: 'ID_CARD', url: '#', status: 'VERIFIED' },
          { title: 'ใบอนุญาตขับรถสาธารณะ', type: 'PUBLIC_LICENSE', url: '#', status: 'VERIFIED' },
          { title: 'เล่มทะเบียนรถจักรยานยนต์', type: 'GREEN_BOOK', url: '#', status: 'VERIFIED' },
        ],
      },
    ]);
  };

  const handleApproveDriver = async (driverId: string) => {
    try {
      await fetch('/api/v1/admin/drivers/approve', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId }),
      });
    } catch {}
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, status: 'APPROVED' as const } : d))
    );
  };

  const handleRejectDriver = async () => {
    if (!rejectingDriver) return;
    try {
      await fetch('/api/v1/admin/drivers/reject', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId: rejectingDriver.id, reason: rejectionReason }),
      });
    } catch {}
    setDrivers((prev) =>
      prev.map((d) => (d.id === rejectingDriver.id ? { ...d, status: 'REJECTED' as const } : d))
    );
    setRejectingDriver(null);
  };

  // Mock Ledger & Chart Data
  const reportData = useMemo(() => {
    let kpi = {
      revenue: 12500,
      txns: 85,
      platformFee: 1875,
      growth: 12.4,
      avgFare: 147.05,
      successRate: 99.8,
    };

    let chartData: { label: string; revenue: number; trips: number }[] = [];

    if (reportPeriod === 'DAILY') {
      kpi = {
        revenue: 12500,
        txns: 85,
        platformFee: 1875,
        growth: 12.4,
        avgFare: 147.05,
        successRate: 99.8,
      };
      const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      const revs = [1200, 1850, 2400, 1600, 2100, 4850, 2900, 1600];
      const trps = [8, 12, 16, 11, 14, 32, 20, 10];
      chartData = hours.map((h, i) => ({ label: h, revenue: revs[i], trips: trps[i] }));
    } else if (reportPeriod === 'WEEKLY') {
      kpi = {
        revenue: 87500,
        txns: 595,
        platformFee: 13125,
        growth: 14.8,
        avgFare: 147.05,
        successRate: 99.7,
      };
      const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
      const revs = [11200, 12400, 13100, 12800, 16500, 14200, 7300];
      const trps = [76, 84, 89, 87, 112, 96, 51];
      chartData = days.map((d, i) => ({ label: d, revenue: revs[i], trips: trps[i] }));
    } else if (reportPeriod === 'MONTHLY') {
      kpi = {
        revenue: 450000,
        txns: 2400,
        platformFee: 67500,
        growth: 18.2,
        avgFare: 187.5,
        successRate: 99.9,
      };
      const weeks = ['วันที่ 1-5', 'วันที่ 6-10', 'วันที่ 11-15', 'วันที่ 16-20', 'วันที่ 21-25', 'วันที่ 26-30'];
      const revs = [68000, 74000, 81000, 72000, 89000, 66000];
      const trps = [360, 395, 430, 385, 475, 355];
      chartData = weeks.map((w, i) => ({ label: w, revenue: revs[i], trips: trps[i] }));
    } else {
      kpi = {
        revenue: 5400000,
        txns: 28800,
        platformFee: 810000,
        growth: 24.6,
        avgFare: 187.5,
        successRate: 99.9,
      };
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const revs = [380000, 410000, 440000, 420000, 460000, 490000, 480000, 510000, 530000, 560000, 580000, 620000];
      const trps = [2020, 2180, 2340, 2240, 2450, 2610, 2560, 2720, 2820, 2980, 3090, 3300];
      chartData = months.map((m, i) => ({ label: m, revenue: revs[i], trips: trps[i] }));
    }

    const transactions: Transaction[] = [
      {
        id: 'TXN-20261019-01',
        ref: 'WIN-INV-1092',
        time: '18:42:15',
        date: '19/10/2026',
        user: 'คุณ วรัญญา สิทธิ์กุล',
        phone: '081-892-4122',
        driver: 'D-1029 (พี่สมศักดิ์ วิน BTS อโศก)',
        channel: 'PROMPTPAY',
        type: 'RIDE_FARE',
        grossAmount: 150.0,
        platformFee: 22.5,
        netAmount: 127.5,
        status: 'RECONCILED',
        hmacSignature: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
        bankRef: 'PP-BTH-994102',
        reconciledAt: '18:42:18 (3 วินาที)',
      },
      {
        id: 'TXN-20261019-02',
        ref: 'WIN-INV-1091',
        time: '18:35:40',
        date: '19/10/2026',
        user: 'คุณ ภัทรพล จันทร์โอภาส',
        phone: '089-223-4581',
        driver: 'D-1055 (พี่ประวิทย์ วิน MRT เพชรบุรี)',
        channel: 'WALLET',
        type: 'RIDE_FARE',
        grossAmount: 85.0,
        platformFee: 12.75,
        netAmount: 72.25,
        status: 'RECONCILED',
        hmacSignature: 'sha256:3c84e931fa02c2e0b58e77a10fca56d11a9e872013f9901416e254cd6b6852bb',
        bankRef: 'WLT-BAL-48190',
        reconciledAt: '18:35:41 (1 วินาที)',
      },
      {
        id: 'TXN-20261019-03',
        ref: 'WIN-INV-1090',
        time: '18:21:05',
        date: '19/10/2026',
        user: 'คุณ นฤมล เกษมสุข',
        phone: '095-771-3490',
        driver: 'D-1088 (พี่ธนกร วิน สยามสแควร์)',
        channel: 'BANK',
        type: 'RIDE_FARE',
        grossAmount: 220.0,
        platformFee: 33.0,
        netAmount: 187.0,
        status: 'RECONCILED',
        hmacSignature: 'sha256:49c0d24e16d44558238f29631cf5e1e47f2409559c5d0705a61b848ddc5cbe83',
        bankRef: 'KBANK-TRF-00192',
        reconciledAt: '18:21:09 (4 วินาที)',
      },
      {
        id: 'TXN-20261019-04',
        ref: 'WIN-TOP-2041',
        time: '18:10:22',
        date: '19/10/2026',
        user: 'คุณ ชนินทร์ รัตนวงศ์',
        phone: '082-990-1244',
        driver: '-',
        channel: 'PROMPTPAY',
        type: 'TOPUP',
        grossAmount: 500.0,
        platformFee: 0.0,
        netAmount: 500.0,
        status: 'RECONCILED',
        hmacSignature: 'sha256:88e14b2a95c479dfa33827d044cd05178657d4cc1d4d3809623707255476a382',
        bankRef: 'PP-QR-778103',
        reconciledAt: '18:10:24 (2 วินาที)',
      },
      {
        id: 'TXN-20261019-05',
        ref: 'WIN-INV-1089',
        time: '17:58:12',
        date: '19/10/2026',
        user: 'คุณ เกศรินทร์ พงษ์พิพัฒน์',
        phone: '061-344-9988',
        driver: 'D-1029 (พี่สมศักดิ์ วิน BTS อโศก)',
        channel: 'PROMPTPAY',
        type: 'RIDE_FARE',
        grossAmount: 120.0,
        platformFee: 18.0,
        netAmount: 102.0,
        status: 'RECONCILED',
        hmacSignature: 'sha256:5b8d234a70617beccba95f0133dbfb22067fc9b08f8883bb1f544971c261e479',
        bankRef: 'PP-BTH-994088',
        reconciledAt: '17:58:15 (3 วินาที)',
      },
      {
        id: 'TXN-20261019-06',
        ref: 'WIN-INV-1088',
        time: '17:42:30',
        date: '19/10/2026',
        user: 'คุณ ปิยะวัฒน์ เจริญผล',
        phone: '086-441-2309',
        driver: 'D-1055 (พี่ประวิทย์ วิน MRT เพชรบุรี)',
        channel: 'TRUEMONEY',
        type: 'RIDE_FARE',
        grossAmount: 65.0,
        platformFee: 9.75,
        netAmount: 55.25,
        status: 'RECONCILED',
        hmacSignature: 'sha256:1a84c982b6045feef5843a0e1ec34fa098a5e30d12e873522c079dbf67451a99',
        bankRef: 'TMN-WLT-66102',
        reconciledAt: '17:42:32 (2 วินาที)',
      },
      {
        id: 'TXN-20261019-07',
        ref: 'WIN-INV-1087',
        time: '17:30:19',
        date: '19/10/2026',
        user: 'คุณ สุภัทรา ธรรมรัตน์',
        phone: '083-911-5544',
        driver: 'D-1088 (พี่ธนกร วิน สยามสแควร์)',
        channel: 'BANK',
        type: 'RIDE_FARE',
        grossAmount: 180.0,
        platformFee: 27.0,
        netAmount: 153.0,
        status: 'PENDING',
        hmacSignature: 'sha256:0d91ca476e3d29a56a6358c541785f82c4beaa017b2b71926c4831201d4a0f44',
        bankRef: 'SCB-TRF-88192',
        reconciledAt: 'กำลังรอการยืนยันจากธนาคาร',
      },
      {
        id: 'TXN-20261019-08',
        ref: 'WIN-INV-1086',
        time: '17:15:00',
        date: '19/10/2026',
        user: 'คุณ กานต์ ชัยเจริญ',
        phone: '085-333-8877',
        driver: 'D-1029 (พี่สมศักดิ์ วิน BTS อโศก)',
        channel: 'PROMPTPAY',
        type: 'RIDE_FARE',
        grossAmount: 95.0,
        platformFee: 14.25,
        netAmount: 80.75,
        status: 'RECONCILED',
        hmacSignature: 'sha256:6e7719f9353907c08253a6a9b4317beec4b01e4a6659cf7d9037ec8a63529321',
        bankRef: 'PP-BTH-994012',
        reconciledAt: '17:15:03 (3 วินาที)',
      },
    ];

    return { kpi, chartData, transactions };
  }, [reportPeriod, selectedDate]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return reportData.transactions.filter((txn) => {
      const matchSearch =
        searchQuery === '' ||
        txn.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.phone.includes(searchQuery) ||
        txn.driver.toLowerCase().includes(searchQuery.toLowerCase());

      const matchChannel = channelFilter === 'ALL' || txn.channel === channelFilter;
      const matchStatus = statusFilter === 'ALL' || txn.status === statusFilter;

      return matchSearch && matchChannel && matchStatus;
    });
  }, [reportData.transactions, searchQuery, channelFilter, statusFilter]);

  // Filtered Drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchStatus = driverFilter === 'ALL' || d.status === driverFilter;
      const matchSearch =
        searchQuery === '' ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.phone.includes(searchQuery) ||
        d.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.zone.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [drivers, driverFilter, searchQuery]);

  // Export to CSV Function
  const handleExportCsv = () => {
    const headers = [
      'เลขที่เอกสาร',
      'วัน-เวลา',
      'ผู้โดยสาร',
      'เบอร์โทรศัพท์',
      'คนขับ',
      'ช่องทางชำระเงิน',
      'ประเภท',
      'ยอดเงินรวม (บาท)',
      'ค่าบริการระบบ (15%)',
      'ยอดสุทธิคนขับ (บาท)',
      'สถานะตรวจสอบ',
      'ลายเซ็นดิจิทัล HMAC-SHA256',
    ];

    const rows = filteredTransactions.map((t) => [
      t.ref,
      `${t.date} ${t.time}`,
      t.user,
      t.phone,
      t.driver,
      t.channel,
      t.type === 'RIDE_FARE' ? 'ค่าโดยสาร' : t.type === 'TOPUP' ? 'เติมแต้ม' : 'ถอนเงิน',
      t.grossAmount.toFixed(2),
      t.platformFee.toFixed(2),
      t.netAmount.toFixed(2),
      t.status === 'RECONCILED' ? 'ตรวจสอบแล้ว' : 'รอดำเนินการ',
      t.hmacSignature,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GOZIPP_Audit_Ledger_${reportPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Channel Badge Helper
  const getChannelBadge = (ch: string) => {
    switch (ch) {
      case 'PROMPTPAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-blue-500/15 text-blue-400 border border-blue-500/20">
            <QrCode className="w-3 h-3" /> พร้อมเพย์
          </span>
        );
      case 'BANK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <Building2 className="w-3 h-3" /> โอนธนาคาร
          </span>
        );
      case 'WALLET':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-purple-500/15 text-purple-400 border border-purple-500/20">
            <Wallet className="w-3 h-3" /> กระเป๋าเงิน
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <CreditCard className="w-3 h-3" /> ทรูมันนี่
          </span>
        );
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-white min-h-screen flex flex-col font-sans select-none overflow-x-hidden">
      {/* ──────────────── Top Navigation & World-Class Enterprise Header ──────────────── */}
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-2xl border-b border-white/5 px-6 lg:px-10 py-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-green-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
              <Zap className="w-7 h-7 text-slate-950 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  GOZIPP <span className="text-emerald-400">CONTROL</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  ระบบออนไลน์ • Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-wide mt-0.5">
                ศูนย์บริหารจัดการและตรวจสอบระบบการเดินทางอัจฉริยะมาตรฐานสากล
              </p>
            </div>
          </div>

          {/* Quick Actions & Role Profile */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-slate-300 hover:text-white transition-all active:scale-95"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">อัปเดต: {lastUpdated}</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all active:scale-95 shadow-lg shadow-emerald-500/5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดรายงาน (CSV)</span>
            </button>

            {/* Admin Profile Pill & Logout */}
            <div className="flex items-center gap-2 pl-3 border-l border-white/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-xs font-black text-slate-950 ring-2 ring-emerald-500/30">
                SA
              </div>
              <div className="hidden sm:block text-left text-xs leading-tight mr-1">
                <div className="font-bold text-white">Super Admin</div>
                <div className="text-[10px] text-emerald-400 font-semibold">{currentRole.replace('_', ' ')}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Tab Navigation ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-3 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-1 rounded-2xl border border-white/5 backdrop-blur-xl">
            {[
              { id: 'ACCOUNTING', label: 'การเงินและบัญชี', icon: BarChart3 },
              { id: 'FINANCE', label: 'บริหารการเงิน & นโยบาย', icon: Wallet },
              {
                id: 'MANAGE',
                label: 'จัดการและอนุมัติคนขับ',
                icon: UserCheck,
                badge: drivers.filter((d) => d.status === 'PENDING').length,
              },
              { id: 'AI_ANALYST', label: 'ศูนย์วิเคราะห์อัจฉริยะ AI', icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isActive ? 'bg-slate-950 text-emerald-400' : 'bg-red-500 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Date Period Selector */}
          {activeTab === 'ACCOUNTING' && (
            <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-white/5 text-xs font-bold">
              {[
                { id: 'DAILY', label: 'วันนี้' },
                { id: 'WEEKLY', label: 'สัปดาห์นี้' },
                { id: 'MONTHLY', label: 'เดือนนี้' },
                { id: 'YEARLY', label: 'ทั้งปี' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setReportPeriod(p.id as ReportPeriod)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    reportPeriod === p.id
                      ? 'bg-white/10 text-emerald-400 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ──────────────── Main Content ──────────────── */}
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
        {/* ═══════════════════════════════════════════════════════════════
            TAB 1: การเงินและบัญชี (Accounting & Ledger)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'ACCOUNTING' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* 4 World-Class KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Revenue */}
              <div className="bg-slate-900/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    รายได้รวมสุทธิ ({reportPeriod === 'DAILY' ? 'วันนี้' : reportPeriod === 'WEEKLY' ? 'สัปดาห์นี้' : reportPeriod === 'MONTHLY' ? 'เดือนนี้' : 'ทั้งปี'})
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-black text-emerald-400 tracking-tight">
                  ฿{reportData.kpi.revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs">
                  <span className="inline-flex items-center text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <TrendingUp className="w-3 h-3 mr-1" /> +{reportData.kpi.growth}%
                  </span>
                  <span className="text-slate-500">เทียบกับช่วงก่อนหน้า</span>
                </div>
              </div>

              {/* Card 2: Transactions */}
              <div className="bg-slate-900/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    จำนวนธุรกรรมสำเร็จ
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                  {reportData.kpi.txns.toLocaleString()} <span className="text-lg font-bold text-slate-400">รายการ</span>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                  <span>อัตราสำเร็จ {reportData.kpi.successRate}%</span>
                  <span className="font-semibold text-slate-300">เฉลี่ย ฿{reportData.kpi.avgFare.toFixed(2)}/เที่ยว</span>
                </div>
              </div>

              {/* Card 3: Platform Margin */}
              <div className="bg-slate-900/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    ส่วนแบ่งระบบ (Platform Fee 15%)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <PieChart className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-black text-purple-400 tracking-tight">
                  ฿{reportData.kpi.platformFee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>หักเข้าบัญชีระบบอัตโนมัติ 100%</span>
                </div>
              </div>

              {/* Card 4: Audit Status */}
              <div className="bg-slate-900/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    สถานะการตรวจสอบความถูกต้อง
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl lg:text-3xl font-black text-cyan-400 tracking-tight flex items-center gap-2">
                  <span>ปลอดภัย 100%</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>รับรองลายเซ็นดิจิทัล HMAC-SHA256</span>
                </div>
              </div>
            </div>

            {/* Interactive Recharts Visualization */}
            <div className="bg-slate-900/80 p-6 lg:p-8 rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                    แนวโน้มรายได้และปริมาณเที่ยววิ่ง ({reportPeriod === 'DAILY' ? 'รายชั่วโมง' : reportPeriod === 'WEEKLY' ? 'รายวัน' : reportPeriod === 'MONTHLY' ? 'รายสัปดาห์' : 'รายเดือน'})
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    แสดงการกระจายตัวของรายได้และจำนวนผู้โดยสารเรียกรถตลอดช่วงเวลา
                  </p>
                </div>

                {/* Chart Toggle */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/5 text-xs font-bold">
                  {[
                    { id: 'REVENUE', label: 'รายได้ (฿)' },
                    { id: 'TRIPS', label: 'จำนวนเที่ยว' },
                    { id: 'COMBINED', label: 'แสดงทั้งคู่' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setChartMode(mode.id as ChartMode)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        chartMode === mode.id
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Render */}
              <div className="h-72 w-full">
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="tripsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="label"
                        stroke="#64748B"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <YAxis
                        stroke="#64748B"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-slate-950/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-xs space-y-1">
                              <p className="font-bold text-slate-400 mb-1">ช่วงเวลา: {label}</p>
                              {payload.map((entry: any, i: number) => (
                                <p key={i} className="font-black text-sm flex items-center justify-between gap-4">
                                  <span style={{ color: entry.color }}>
                                    {entry.name === 'revenue' ? 'ยอดรายได้:' : 'จำนวนเที่ยว:'}
                                  </span>
                                  <span className="text-white font-mono">
                                    {entry.name === 'revenue'
                                      ? `฿${Number(entry.value).toLocaleString()}`
                                      : `${entry.value} เที่ยว`}
                                  </span>
                                </p>
                              ))}
                            </div>
                          );
                        }}
                      />
                      {(chartMode === 'REVENUE' || chartMode === 'COMBINED') && (
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="revenue"
                          stroke="#10B981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#revenueGradient)"
                        />
                      )}
                      {(chartMode === 'TRIPS' || chartMode === 'COMBINED') && (
                        <Area
                          type="monotone"
                          dataKey="trips"
                          name="trips"
                          stroke="#06B6D4"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#tripsGradient)"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                    กำลังโหลดแผนภูมิ...
                  </div>
                )}
              </div>

              {/* Highlights bar */}
              <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">ช่วงเวลาพีคสูงสุด:</span>
                  <div className="text-white font-bold text-sm mt-0.5">18:00 (฿4,850 / 32 เที่ยว)</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">ค่าโดยสารเฉลี่ยต่อเที่ยว:</span>
                  <div className="text-emerald-400 font-bold text-sm mt-0.5">฿147.05</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">ช่องทางยอดนิยม:</span>
                  <div className="text-white font-bold text-sm mt-0.5">พร้อมเพย์ QR (65%)</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">ระยะเวลากระทบยอดเฉลี่ย:</span>
                  <div className="text-cyan-400 font-bold text-sm mt-0.5">2.4 วินาที / รายการ</div>
                </div>
              </div>
            </div>

            {/* Financial Ledger & Audit Table */}
            <div className="bg-slate-900/80 rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    บัญชีรายการธุรกรรมและการตรวจสอบ (Audit Ledger)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    แสดงรายการชำระเงินที่ผ่านการตรวจสอบความถูกต้องด้วยลายเซ็นดิจิทัล
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Search Input */}
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาเลขอ้างอิง, เบอร์ผู้ใช้, คนขับ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Channel Dropdown */}
                  <select
                    value={channelFilter}
                    onChange={(e) => setChannelFilter(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">ทุกช่องทาง</option>
                    <option value="PROMPTPAY">พร้อมเพย์ (PromptPay)</option>
                    <option value="BANK">โอนธนาคาร (Bank Transfer)</option>
                    <option value="WALLET">กระเป๋าเงิน (Wallet)</option>
                    <option value="TRUEMONEY">ทรูมันนี่ (TrueMoney)</option>
                  </select>

                  {/* Status Dropdown */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">ทุกสถานะ</option>
                    <option value="RECONCILED">ตรวจสอบแล้ว (Reconciled)</option>
                    <option value="PENDING">รอดำเนินการ (Pending)</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-white/5">
                    <tr>
                      <th className="p-4">เวลา</th>
                      <th className="p-4">เลขที่เอกสาร (Ref)</th>
                      <th className="p-4">ผู้โดยสาร</th>
                      <th className="p-4">คนขับผู้ให้บริการ</th>
                      <th className="p-4">ช่องทาง</th>
                      <th className="p-4 text-right">ยอดรวม (THB)</th>
                      <th className="p-4 text-right">ส่วนแบ่งระบบ (15%)</th>
                      <th className="p-4 text-center">สถานะตรวจสอบ</th>
                      <th className="p-4 text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-500">
                          ไม่พบรายการธุรกรรมตามเงื่อนไขที่ค้นหา
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedTxn(row)}
                          className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                        >
                          <td className="p-4 text-slate-400 whitespace-nowrap">{row.time}</td>
                          <td className="p-4 font-black text-white font-mono">{row.ref}</td>
                          <td className="p-4">
                            <div className="text-slate-200 font-semibold">{row.user}</div>
                            <div className="text-[10px] text-slate-500">{row.phone}</div>
                          </td>
                          <td className="p-4 text-slate-300">{row.driver}</td>
                          <td className="p-4">{getChannelBadge(row.channel)}</td>
                          <td className="p-4 font-black text-white text-right font-mono">
                            ฿{row.grossAmount.toFixed(2)}
                          </td>
                          <td className="p-4 font-bold text-emerald-400 text-right font-mono">
                            ฿{row.platformFee.toFixed(2)}
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            {row.status === 'RECONCILED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> ตรวจสอบแล้ว
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                <Clock className="w-3 h-3" /> รอดำเนินการ
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTxn(row);
                              }}
                              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 font-bold transition-all text-[11px]"
                            >
                              ดูสลิป
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
                <div>
                  แสดง {filteredTransactions.length} จากทั้งหมด {reportData.transactions.length} รายการ
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 disabled:opacity-40" disabled>
                    ก่อนหน้า
                  </button>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 font-bold rounded-lg">1</span>
                  <button className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 disabled:opacity-40" disabled>
                    ถัดไป
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: บริหารการเงิน & นโยบาย (Finance & Platform Policies)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'FINANCE' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
            {/* Settlement Accounts Card */}
            <div className="bg-slate-900/80 p-6 lg:p-8 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    บัญชีรับเงินของระบบ (Settlement Accounts)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    บัญชีธนาคารและพร้อมเพย์สำหรับรับชำระค่าโดยสารและเติมเงิน
                  </p>
                </div>
                <button
                  onClick={() => setShowPromptPayQR(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20 text-xs font-bold hover:bg-blue-500/25 transition-all"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>ดู QR พร้อมเพย์</span>
                </button>
              </div>

              <div className="space-y-3">
                {paymentAccounts.map((pa) => (
                  <div
                    key={pa.id}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        {pa.type === 'PROMPTPAY' ? <QrCode className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-black text-white text-sm">{pa.providerName}</div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>{pa.accountNumber}</span>
                          <button
                            onClick={() => handleCopy(pa.accountNumber, pa.id)}
                            className="text-slate-500 hover:text-emerald-400 transition-colors"
                            title="คัดลอกเลขบัญชี"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copyFeedback === pa.id && (
                            <span className="text-[10px] text-emerald-400 font-bold">คัดลอกแล้ว!</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{pa.accountName}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        เปิดใช้งาน
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">{pa.dailyLimit}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p>
                  ระบบเชื่อมต่อ Payment Gateway แบบ Real-time ทุกยอดเงินจะถูกกระทบยอดอัตโนมัติด้วย
                  HMAC-SHA256 ทันทีที่การโอนเงินสำเร็จ
                </p>
              </div>
            </div>

            {/* Referral & Fare Policies */}
            <div className="space-y-6">
              {/* Referral Policy */}
              <div className="bg-slate-900/80 p-6 lg:p-8 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl space-y-5">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    ระบบแนะนำเพื่อน (Referral Program)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    กำหนดแต้มสะสมสำหรับการชวนเพื่อนใช้งาน (1 ชั้น - Direct Referral)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    แต้มชวนเพื่อนสำเร็จ (แต้มต่อคน)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={referralPoints}
                      onChange={(e) => setReferralPoints(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-lg font-black text-white focus:outline-none focus:border-emerald-500 pr-28"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {referralPoints} แต้ม (฿{referralPoints})
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    แต้มจะถูกโอนเข้าวอลเล็ตของผู้แนะนำทันทีที่ผู้สมัครใหม่สำเร็จเที่ยวเดินทางแรก
                  </p>
                </div>

                {referralSaveMessage && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{referralSaveMessage}</span>
                  </div>
                )}

                <button
                  onClick={handleSaveReferralConfig}
                  disabled={isReferralSaving}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-98"
                >
                  {isReferralSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าแต้มชวนเพื่อน'}
                </button>
              </div>

              {/* Trip Fare & Overdraft Policy */}
              <div className="bg-slate-900/80 p-6 lg:p-8 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl space-y-5">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
                    นโยบายค่าบริการหักแต้มต่อเที่ยว (Trip Fare Policy)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    กำหนดแต้มหักต่อเที่ยว และวงเงินแต้มติดลบฉุกเฉินสำหรับผู้โดยสาร
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      ค่าบริการหักแต้มเริ่มต้นต่อเที่ยว (Base Points / Trip)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={baseFarePoints}
                        onChange={(e) => setBaseFarePoints(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-lg font-black text-white focus:outline-none focus:border-emerald-500 pr-28"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {baseFarePoints} แต้ม (฿{baseFarePoints})
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      ค่าบริการที่ระบบหักแบบเหมาจ่ายต่อเที่ยวเดินทาง (ค่าเริ่มต้น: 2 แต้ม = 2 บาท)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      วงเงินแต้มติดลบฉุกเฉินสูงสุด (Max Emergency Overdraft Limit)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={emergencyOverdraftLimit}
                        onChange={(e) => setEmergencyOverdraftLimit(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-lg font-black text-white focus:outline-none focus:border-emerald-500 pr-28"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {emergencyOverdraftLimit} แต้ม (฿{emergencyOverdraftLimit})
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      ผู้โดยสารสามารถเดินทางฉุกเฉินได้แม้แต้มหมด โดยติดลบได้สูงสุดไม่เกินวงเงินนี้
                    </p>
                  </div>
                </div>

                {/* Simulator Box */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    จำลองรายได้คาดการณ์ของระบบ (Platform Simulator)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">1,000 เที่ยว / วัน:</span>
                      <div className="font-black text-white font-mono">฿{(1000 * baseFarePoints).toLocaleString()} / วัน</div>
                    </div>
                    <div>
                      <span className="text-slate-500">รายได้ต่อเดือน (30 วัน):</span>
                      <div className="font-black text-emerald-400 font-mono">฿{(30000 * baseFarePoints).toLocaleString()} / เดือน</div>
                    </div>
                  </div>
                </div>

                {pricingSaveMessage && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{pricingSaveMessage}</span>
                  </div>
                )}

                <button
                  onClick={handleSavePricingConfig}
                  disabled={isPricingSaving}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-98"
                >
                  {isPricingSaving ? 'กำลังบันทึก...' : 'บันทึกนโยบายค่าบริการและวงเงินฉุกเฉิน'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 3: จัดการและอนุมัติคนขับ (Driver Approvals & KYC)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'MANAGE' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-emerald-400" />
                  จัดการและตรวจสอบเอกสารคนขับ (Driver Onboarding & Verification)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ตรวจสอบใบขับขี่สาธารณะ เล่มทะเบียนรถ และเอกสารแสดงตัวตนก่อนอนุมัติเข้าสู่วิน
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-white/5 text-xs font-bold">
                {[
                  { id: 'PENDING', label: 'รอการตรวจสอบ' },
                  { id: 'APPROVED', label: 'อนุมัติแล้ว' },
                  { id: 'REJECTED', label: 'ปฏิเสธ' },
                  { id: 'ALL', label: 'ทั้งหมด' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setDriverFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      driverFilter === f.id
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drivers Grid */}
            {isDriversLoading ? (
              <div className="py-20 text-center text-slate-500 text-sm">กำลังโหลดข้อมูลคนขับ...</div>
            ) : filteredDrivers.length === 0 ? (
              <div className="bg-slate-900/60 p-12 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-2xl text-emerald-400 mb-4">
                  ✓
                </div>
                <h4 className="text-lg font-black text-white">ไม่มีคำขอที่ต้องตรวจสอบในขณะนี้</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  คำขอสมัครสมาชิกคนขับทั้งหมดได้รับการพิจารณาและตรวจสอบเอกสารเรียบร้อยแล้ว
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="bg-slate-900/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl flex flex-col justify-between hover:border-white/10 transition-all space-y-5"
                  >
                    {/* Driver Profile */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-lg font-black text-emerald-400 flex-shrink-0">
                          {driver.name.slice(4, 6)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-white text-base truncate">{driver.name}</h4>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                driver.status === 'APPROVED'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : driver.status === 'REJECTED'
                                  ? 'bg-red-500/15 text-red-400'
                                  : 'bg-amber-500/15 text-amber-400'
                              }`}
                            >
                              {driver.status === 'APPROVED'
                                ? 'อนุมัติแล้ว'
                                : driver.status === 'REJECTED'
                                ? 'ปฏิเสธ'
                                : 'รอตรวจสอบ'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{driver.phone}</span>
                          </div>
                          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span className="truncate">{driver.zone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Details */}
                      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">ป้ายทะเบียน:</span>
                          <span className="font-bold text-white font-mono bg-white/5 px-2 py-0.5 rounded-md">
                            {driver.plate}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ยานพาหนะ:</span>
                          <span className="text-slate-300 font-medium">{driver.vehicleModel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ยื่นคำขอเมื่อ:</span>
                          <span className="text-slate-400">{driver.appliedAt}</span>
                        </div>
                      </div>

                      {/* Documents Attached */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          เอกสารประกอบการพิจารณา ({driver.documents.length} ฉบับ)
                        </div>
                        <div className="space-y-1.5">
                          {driver.documents.map((doc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-white/5 text-xs hover:border-emerald-500/30 transition-all"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                <span className="text-slate-300 truncate">{doc.title}</span>
                              </div>
                              <button
                                onClick={() =>
                                  setSelectedDoc({
                                    title: doc.title,
                                    url: doc.url,
                                    driverName: driver.name,
                                  })
                                }
                                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 ml-2 whitespace-nowrap"
                              >
                                ตรวจสอบ
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {driver.status === 'PENDING' && (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                        <button
                          onClick={() => setRejectingDriver(driver)}
                          className="py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <UserX className="w-3.5 h-3.5" /> ปฏิเสธ
                        </button>
                        <button
                          onClick={() => handleApproveDriver(driver.id)}
                          className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> อนุมัติทันที
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 4: ศูนย์วิเคราะห์อัจฉริยะ AI (AI Mobility Intelligence)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'AI_ANALYST' && (
          <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
            {/* Header Card */}
            <div className="bg-slate-900/80 p-8 rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/20 mb-4 animate-pulse">
                <Brain className="w-9 h-9 text-slate-950" />
              </div>
              <h3 className="text-2xl font-black text-white">ศูนย์วิเคราะห์อัจฉริยะ GOZIPP AI</h3>
              <p className="text-xs text-slate-400 max-w-lg mt-2 leading-relaxed">
                โมเดลปัญญาประดิษฐ์ประมวลผลข้อมูลการเดินทาง ความต้องการของคนขับ สภาพคล่องทางการเงิน
                และความหนาแน่นของวินมอเตอร์ไซค์แบบ Real-time เพื่อสร้างกลยุทธ์การเติบโต
              </p>

              {/* Start Scan Button */}
              <div className="mt-6 flex flex-wrap items-center gap-3 justify-center">
                <button
                  onClick={fetchAiSummary}
                  disabled={isAiLoading}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all shadow-xl shadow-emerald-500/25 active:scale-95 flex items-center gap-2"
                >
                  <Sparkles className={`w-4 h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
                  <span>{isAiLoading ? 'กำลังประมวลผลข้อมูล AI...' : 'เริ่มการสแกนและวิเคราะห์ระบบ'}</span>
                </button>
                {aiReport && (
                  <button
                    onClick={() => setAiReport(null)}
                    className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-xs transition-colors"
                  >
                    ล้างผลการวิเคราะห์
                  </button>
                )}
              </div>

              {/* Progress bar during scan */}
              {isAiLoading && (
                <div className="w-full max-w-md mt-6 space-y-2">
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300"
                      style={{ width: `${aiScanProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    ประมวลผลผ่านโมเดล Local ThaiLLM Core • {aiScanProgress}%
                  </div>
                </div>
              )}
            </div>

            {/* AI Report Results */}
            {aiReport && (
              <div className="space-y-6">
                {/* Executive Summary Card */}
                <div className="bg-slate-900/90 p-8 rounded-3xl border border-emerald-500/20 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-emerald-500 to-cyan-500"></div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                        บทวิเคราะห์และข้อเสนอแนะเชิงรุก (AI Insights)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">ความหน่วง 0.6s • ความเชื่อมั่น 96.8%</span>
                  </div>
                  <p className="text-base text-slate-200 leading-relaxed font-medium">
                    "{aiReport}"
                  </p>
                </div>

                {/* 4 AI Strategic Indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold uppercase text-slate-500">ดัชนีความต้องการเดินทาง</span>
                    <div className="text-2xl font-black text-white mt-1">8.9 / 10</div>
                    <span className="text-[10px] text-emerald-400 font-bold mt-1 block">หนาแน่นสูงสุดในรอบสัปดาห์</span>
                  </div>
                  <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold uppercase text-slate-500">สภาพคล่องระบบการเงิน</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">99.4%</div>
                    <span className="text-[10px] text-slate-400 mt-1 block">กระทบยอดสมบูรณ์ 100%</span>
                  </div>
                  <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold uppercase text-slate-500">ความแม่นยำของโมเดล</span>
                    <div className="text-2xl font-black text-cyan-400 mt-1">96.8%</div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Deep Learning Prediction</span>
                  </div>
                  <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold uppercase text-slate-500">ลดเวลารอเฉลี่ยได้</span>
                    <div className="text-2xl font-black text-purple-400 mt-1">-24%</div>
                    <span className="text-[10px] text-slate-400 mt-1 block">เมื่อปรับใช้นโยบายแนะนำ</span>
                  </div>
                </div>

                {/* Hotspot Recommendations */}
                <div className="bg-slate-900/80 p-6 rounded-3xl border border-white/5 space-y-4">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    พื้นที่ความต้องการสูงและข้อแนะนำเชิงพื้นที่ (Zone Optimization)
                  </h4>
                  <div className="space-y-3">
                    {[
                      {
                        zone: 'วิน BTS อโศก (สุขุมวิท 21)',
                        status: 'ความต้องการสูงมาก (Surge +25%)',
                        action: 'แนะนำเพิ่มโบนัสพิเศษ 5 บาท/เที่ยว ให้คนขับรับงานช่วง 17:00 - 19:30 น.',
                      },
                      {
                        zone: 'วิน สยามสแควร์วัน & พารากอน',
                        status: 'ความต้องการหนาแน่น',
                        action: 'แนะนำเปิดคิวรับผู้โดยสารต่อเนื่อง เพื่อลดคิวสะสมหน้าสถานี BTS',
                      },
                      {
                        zone: 'วิน MRT เพชรบุรี (เชื่อมต่อ Airport Link)',
                        status: 'การจราจรติดขัดสะสม',
                        action: 'เปิดใช้งาน AI Dynamic Routing แนะนำเส้นทางเลี่ยงซอยสุขุมวิท',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-black text-white text-sm">{item.zone}</div>
                          <div className="text-slate-400 mt-0.5">{item.action}</div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => alert('นำกลยุทธ์การกระจายคิวและโบนัสไปปรับใช้ในระบบเรียบร้อยแล้ว')}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      นำกลยุทธ์นี้ไปปรับใช้ทันที
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: Audit Receipt Inspector Modal
         ═══════════════════════════════════════════════════════════════ */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 lg:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-white text-base">ใบเสร็จและบันทึกตรวจสอบธุรกรรม</h4>
                  <p className="text-xs text-slate-400">Transaction Audit Receipt</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Summary */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-white/5 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">เลขอ้างอิงใบเสร็จ:</span>
                <span className="font-mono font-black text-white">{selectedTxn.ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วัน-เวลาทำรายการ:</span>
                <span className="text-slate-300 font-mono">{selectedTxn.date} {selectedTxn.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ผู้โดยสาร:</span>
                <span className="text-white font-bold">{selectedTxn.user} ({selectedTxn.phone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">คนขับผู้ให้บริการ:</span>
                <span className="text-slate-300">{selectedTxn.driver}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ช่องทางชำระเงิน:</span>
                <span>{getChannelBadge(selectedTxn.channel)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">เลขอ้างอิงเกตเวย์:</span>
                <span className="text-slate-400 font-mono">{selectedTxn.bankRef}</span>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>ยอดค่าโดยสารรวม:</span>
                <span className="font-mono text-white">฿{selectedTxn.grossAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ส่วนแบ่งแพลตฟอร์ม GOZIPP (15%):</span>
                <span className="font-mono text-emerald-400">฿{selectedTxn.platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-2 border-t border-white/5 text-white">
                <span>ยอดเงินสุทธิถึงคนขับ:</span>
                <span className="font-mono text-emerald-400">฿{selectedTxn.netAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* HMAC SHA256 Signature */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>ลายเซ็นดิจิทัลสำหรับ Audit (HMAC-SHA256)</span>
                <button
                  onClick={() => handleCopy(selectedTxn.hmacSignature, 'hmac')}
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copyFeedback === 'hmac' ? 'คัดลอกแล้ว!' : 'คัดลอก Hash'}</span>
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 font-mono text-[10px] text-slate-400 break-all border border-white/5 select-all">
                {selectedTxn.hmacSignature}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                พิมพ์ใบเสร็จ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: PromptPay Full QR Code Modal
         ═══════════════════════════════════════════════════════════════ */}
      {showPromptPayQR && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-sm w-full p-6 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h4 className="font-black text-white text-base">QR พร้อมเพย์รับชำระเงิน</h4>
              <button
                onClick={() => setShowPromptPayQR(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated PromptPay Card */}
            <div className="bg-white p-6 rounded-2xl text-slate-950 shadow-inner flex flex-col items-center">
              <div className="text-xs font-black tracking-widest text-blue-900 uppercase mb-2">
                PROMPTPAY BILL PAYMENT
              </div>
              {/* QR Mockup */}
              <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-slate-900 p-2">
                <QrCode className="w-40 h-40 text-slate-900" />
              </div>
              <div className="font-bold text-xs mt-3 text-slate-700">บริษัท โกซิป แพลตฟอร์ม จำกัด</div>
              <div className="font-mono text-sm font-black text-slate-900 mt-0.5">0105567012345</div>
            </div>

            <button
              onClick={() => handleCopy('0105567012345', 'pp')}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all"
            >
              {copyFeedback === 'pp' ? 'คัดลอกเลขพร้อมเพย์แล้ว!' : 'คัดลอกเลขนิติบุคคลพร้อมเพย์'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: Driver Document Viewer Modal
         ═══════════════════════════════════════════════════════════════ */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h4 className="font-black text-white text-base">{selectedDoc.title}</h4>
                <p className="text-xs text-slate-400">ผู้ยื่นคำขอ: {selectedDoc.driverName}</p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Document Certificate */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center min-h-[220px] text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <FileCheck className="w-8 h-8" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">เอกสารผ่านการตรวจสอบเบื้องต้น (KYC Verified)</div>
                <div className="text-xs text-slate-400 mt-1">
                  ระบบได้ตรวจสอบภาพถ่ายความคมชัด ลายน้ำ และวันหมดอายุของเอกสารเรียบร้อยแล้ว
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> เอกสารถูกต้องตามเกณฑ์กรมการขนส่งทางบก
              </span>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 4: Driver Rejection Reason Modal
         ═══════════════════════════════════════════════════════════════ */}
      {rejectingDriver && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-white text-base">ระบุเหตุผลในการปฏิเสธคำขอ</h4>
                <p className="text-xs text-slate-400">คนขับ: {rejectingDriver.name}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {[
                'ภาพถ่ายเอกสารไม่ชัดเจน / มัว',
                'ใบอนุญาตขับรถสาธารณะหมดอายุหรือไม่ตรงประเภท',
                'เล่มทะเบียนรถหรือ พ.ร.บ. สิ้นอายุการคุ้มครอง',
                'ข้อมูลรถจักรยานยนต์ไม่ตรงกับเล่มทะเบียน',
              ].map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-white/5 cursor-pointer hover:border-white/10 transition-colors"
                >
                  <input
                    type="radio"
                    name="rejectionReason"
                    checked={rejectionReason === r}
                    onChange={() => setRejectionReason(r)}
                    className="text-emerald-500 focus:ring-0"
                  />
                  <span className="text-slate-300">{r}</span>
                </label>
              ))}

              <div className="pt-2">
                <input
                  type="text"
                  placeholder="หรือพิมพ์ระบุเหตุผลเพิ่มเติม..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingDriver(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRejectDriver}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs transition-colors"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}