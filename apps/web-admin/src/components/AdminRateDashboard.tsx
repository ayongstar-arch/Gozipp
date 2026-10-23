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
  ArrowRight,
  Gift,
  Plus,
  Edit2,
  Trash2,
  Tag,
  ToggleLeft,
  ToggleRight,
  Menu,
  Coins
} from 'lucide-react';
import { useAdminStore } from '@/stores/adminStore';

type AdminTab = 'ACCOUNTING' | 'CUSTOMER_POINTS' | 'PROMOTIONS' | 'FINANCE' | 'MANAGE' | 'AI_ANALYST';
type ReportPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
type ChartMode = 'REVENUE' | 'TRIPS' | 'COMBINED';

export interface TopupTransaction {
  id: string;
  paymentRef: string;
  timestamp: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  amountBaht: number;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  paymentMethod: 'PROMPTPAY' | 'BANK_TRANSFER' | 'CREDIT_CARD';
  status: 'COMPLETED' | 'PENDING' | 'REJECTED';
  promoApplied?: string;
  bankRef?: string;
  qrPayload?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

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
  fareAmount: number; // คนขับได้รับเต็ม 100% (ไม่มีการหัก GP 15%)
  systemFeePoints: number; // ค่าบริการระบบแบบเหมาจ่ายต่อเที่ยว (เช่น 2 แต้ม = 2 บาท)
  status: 'RECONCILED' | 'PENDING' | 'REFUNDED';
  hmacSignature: string;
  bankRef: string;
  reconciledAt: string;
}

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals State
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{ title: string; url: string; driverName: string } | null>(null);
  const [rejectingDriver, setRejectingDriver] = useState<DriverApplicant | null>(null);
  const [rejectionReason, setRejectionReason] = useState('ภาพถ่ายเอกสารไม่ชัดเจน');
  const [showPromptPayQR, setShowPromptPayQR] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Promotions State (Admin Customizable Anytime)
  const [promotions, setPromotions] = useState<PromotionRule[]>([
    {
      id: 'PROMO-NEW-PASSENGER',
      name: 'สมัครผู้โดยสารใหม่ รับแต้มฟรี',
      code: 'WELCOME50',
      type: 'NEW_PASSENGER',
      points: 50,
      description: 'ผู้โดยสารใหม่ลงทะเบียนสำเร็จ รับแต้มเข้ากระเป๋าทันที 50 แต้ม เพื่อใช้เดินทาง',
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
    {
      id: 'PROMO-FIRST-RIDE',
      name: 'ของขวัญเที่ยวแรก (First Ride Bonus)',
      code: 'FIRSTRIDE20',
      type: 'FIRST_RIDE',
      points: 20,
      description: 'เดินทางเที่ยวแรกสำเร็จ รับแต้มเงินคืน 20 แต้ม',
      isActive: true,
      startDate: '2026-10-15',
      endDate: '2026-11-30',
      maxUsageLimit: 5000,
      currentUsage: 622,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'PROMO-TOPUP-BONUS',
      name: 'เติมแต้มรับเพิ่มพิเศษ (Top-up Bonus)',
      code: 'TOPUP10',
      type: 'TOPUP_BONUS',
      points: 10,
      description: 'เติมเงินตั้งแต่ 100 บาทขึ้นไป รับแต้มเพิ่มพิเศษ 10 แต้ม',
      isActive: true,
      startDate: '2026-10-01',
      maxUsageLimit: 2000,
      currentUsage: 310,
      updatedAt: new Date().toISOString(),
    },
  ]);
  const [isPromotionsLoading, setIsPromotionsLoading] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRule | null>(null);
  const [isCreatingPromotion, setIsCreatingPromotion] = useState(false);
  const [promotionToast, setPromotionToast] = useState<string | null>(null);
  const [promoTypeFilter, setPromoTypeFilter] = useState<string>('ALL');

  // Promotion Date Status Helper
  const formatDateThai = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const yearThai = parseInt(y) + 543;
        return `${parseInt(d)}/${parseInt(m)}/${yearThai}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getPromotionDateStatus = (startDate?: string, endDate?: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (startDate && today < startDate) {
      return { status: 'UPCOMING', label: `เริ่ม ${formatDateThai(startDate)}`, badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };
    }
    if (endDate && today > endDate) {
      return { status: 'EXPIRED', label: `หมดอายุแล้ว (${formatDateThai(endDate)})`, badgeClass: 'bg-red-500/15 text-red-400 border-red-500/20' };
    }
    if (startDate && endDate) {
      return { status: 'ACTIVE', label: `${formatDateThai(startDate)} - ${formatDateThai(endDate)}`, badgeClass: 'bg-white/5 text-slate-300 border-white/10' };
    }
    if (startDate) {
      return { status: 'ACTIVE', label: `ตั้งแต่ ${formatDateThai(startDate)} (ตลอดไป)`, badgeClass: 'bg-white/5 text-slate-300 border-white/10' };
    }
    if (endDate) {
      return { status: 'ACTIVE', label: `ถึง ${formatDateThai(endDate)}`, badgeClass: 'bg-white/5 text-slate-300 border-white/10' };
    }
    return { status: 'ACTIVE', label: 'ไม่มีกำหนดสิ้นสุด (ตลอดไป)', badgeClass: 'bg-white/5 text-slate-400 border-white/10' };
  };

  // AI Analyst State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiScanProgress, setAiScanProgress] = useState(0);

  // Referral State
  const [referralPoints, setReferralPoints] = useState<number>(50);
  const [isReferralSaving, setIsReferralSaving] = useState(false);
  const [referralSaveMessage, setReferralSaveMessage] = useState<string | null>(null);

  // Pricing Policy State (Flat Fee per Trip - No Commission / 0% GP)
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

  // Realtime Customer Points & Top-ups State
  const [topupFeed, setTopupFeed] = useState<TopupTransaction[]>([]);
  const [customersList, setCustomersList] = useState<CustomerPointRecord[]>([]);
  const [customerPointsTab, setCustomerPointsTab] = useState<'TOPUPS' | 'CUSTOMERS'>('TOPUPS');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [topupStatusFilter, setTopupStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'REJECTED'>('ALL');
  const [isTopupsLoading, setIsTopupsLoading] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState<TopupTransaction | null>(null);
  const [topupSummary, setTopupSummary] = useState({
    totalTransactions: 7,
    totalVolumeBaht: 1030,
    totalPointsGiven: 1120,
    totalBonusGiven: 90,
    avgTopupAmount: 147,
  });
  const [customerSummary, setCustomerSummary] = useState({
    totalCustomersCount: 8,
    totalSystemPoints: 1510,
    avgPointsPerCustomer: 189,
  });

  const fetchTopupFeed = async () => {
    try {
      const res = await fetch('/api/v1/admin/customers/topups');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.topups)) {
          setTopupFeed(data.topups);
          if (data.summary) setTopupSummary(data.summary);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch topup feed:', e);
    }
  };

  const fetchCustomersList = async () => {
    try {
      const res = await fetch('/api/v1/admin/customers/points');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.customers)) {
          setCustomersList(data.customers);
          if (data.summary) setCustomerSummary(data.summary);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch customers list:', e);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchPromotionsConfig();
    fetchReferralConfig();
    fetchPricingConfig();
    fetchPendingDrivers();
    fetchTopupFeed();
    fetchCustomersList();

    const interval = setInterval(() => {
      fetchTopupFeed();
      fetchCustomersList();
    }, 3000);

    return () => clearInterval(interval);
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

  // API Call: Fetch Promotions Config
  const fetchPromotionsConfig = async () => {
    setIsPromotionsLoading(true);
    try {
      const response = await fetch('/api/v1/admin/config/promotions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.promotions) && data.promotions.length > 0) {
          setPromotions(data.promotions);
        }
      }
    } catch (e) {
      console.warn('Using local promotions fallback');
    } finally {
      setIsPromotionsLoading(false);
    }
  };

  // API Call: Save Promotions Config
  const savePromotionsToApi = async (updatedList: PromotionRule[]) => {
    // Immediate local and cross-tab broadcast for instant Realtime sync
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gozipp_promotions_config', JSON.stringify(updatedList));
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('gozipp_promotions_sync');
          bc.postMessage({ type: 'PROMOTIONS_UPDATED', promotions: updatedList });
          bc.close();
        }
      } catch {}
    }

    try {
      await fetch('/api/v1/admin/config/promotions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ promotions: updatedList }),
      });
    } catch (e) {
      console.warn('Saved promotions to local memory');
    }
  };

  // Toggle Promotion Active
  const handleTogglePromotion = (id: string) => {
    const updated = promotions.map((p) =>
      p.id === id ? { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString() } : p
    );
    setPromotions(updated);
    savePromotionsToApi(updated);
    showToast('ปรับเปลี่ยนสถานะโปรโมชั่นสำเร็จ');
  };

  // Save Edit Promotion
  const handleSaveEditPromotion = (updatedPromo: PromotionRule) => {
    const updated = promotions.map((p) => (p.id === updatedPromo.id ? updatedPromo : p));
    setPromotions(updated);
    savePromotionsToApi(updated);
    setEditingPromotion(null);
    showToast(`บันทึกการแก้ไข "${updatedPromo.name}" สำเร็จ`);
  };

  // Create New Promotion
  const handleCreateNewPromotion = (newPromo: PromotionRule) => {
    const updated = [newPromo, ...promotions];
    setPromotions(updated);
    savePromotionsToApi(updated);
    setIsCreatingPromotion(false);
    showToast(`สร้างโปรโมชั่น "${newPromo.name}" สำเร็จ`);
  };

  // Delete Promotion
  const handleDeletePromotion = (id: string) => {
    const promo = promotions.find((p) => p.id === id);
    if (!promo) return;
    if (confirm(`คุณต้องการลบโปรโมชั่น "${promo.name}" หรือไม่?`)) {
      const updated = promotions.filter((p) => p.id !== id);
      setPromotions(updated);
      savePromotionsToApi(updated);
      showToast('ลบโปรโมชั่นสำเร็จ');
    }
  };

  const showToast = (msg: string) => {
    setPromotionToast(msg);
    setTimeout(() => setPromotionToast(null), 3500);
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
        'ผลการวิเคราะห์ AI ประจำวัน: ปริมาณความต้องการเรียกรถในเขตสุขุมวิท-อโศก และสยามสแควร์ พุ่งสูงขึ้น 34.2% ในช่วงเวลาเร่งด่วน 17:00 - 19:30 น. การกระทบยอดบัญชีรายได้ผ่าน PromptPay มีความแม่นยำ 100% ปราศจากรายการผิดปกติ นโยบายคนขับรับเต็ม 100% (ไม่หัก GP) ส่งผลให้อัตราตอบรับงานของคนขับสูงถึง 98.4% แนะนำเปิดโปรโมชั่นแจกแต้มผู้โดยสารใหม่ 50 แต้ม เพื่อกระตุ้นยอดเดินทางในเขตดังกล่าว'
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

  // Mock Ledger & Chart Data (NO 15% Platform cut - Flat Fee Base Points Only)
  const reportData = useMemo(() => {
    let kpi = {
      revenue: 12500,
      txns: 85,
      flatFeePointsCollected: 170, // 85 เที่ยว × 2 บาท
      growth: 12.4,
      avgFare: 147.05,
      successRate: 99.8,
    };

    let chartData: { label: string; revenue: number; trips: number }[] = [];

    if (reportPeriod === 'DAILY') {
      kpi = {
        revenue: 12500,
        txns: 85,
        flatFeePointsCollected: 85 * baseFarePoints,
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
        flatFeePointsCollected: 595 * baseFarePoints,
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
        flatFeePointsCollected: 2400 * baseFarePoints,
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
        flatFeePointsCollected: 28800 * baseFarePoints,
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
        fareAmount: 150.0,
        systemFeePoints: baseFarePoints,
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
        fareAmount: 85.0,
        systemFeePoints: baseFarePoints,
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
        fareAmount: 220.0,
        systemFeePoints: baseFarePoints,
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
        fareAmount: 500.0,
        systemFeePoints: 0,
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
        fareAmount: 120.0,
        systemFeePoints: baseFarePoints,
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
        fareAmount: 65.0,
        systemFeePoints: baseFarePoints,
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
        fareAmount: 180.0,
        systemFeePoints: baseFarePoints,
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
        fareAmount: 95.0,
        systemFeePoints: baseFarePoints,
        status: 'RECONCILED',
        hmacSignature: 'sha256:6e7719f9353907c08253a6a9b4317beec4b01e4a6659cf7d9037ec8a63529321',
        bankRef: 'PP-BTH-994012',
        reconciledAt: '17:15:03 (3 วินาที)',
      },
    ];

    return { kpi, chartData, transactions };
  }, [reportPeriod, selectedDate, baseFarePoints]);

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

  // Filtered Promotions
  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      const matchType = promoTypeFilter === 'ALL' || p.type === promoTypeFilter;
      const matchSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [promotions, promoTypeFilter, searchQuery]);

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
      'ยอดค่าโดยสารที่คนขับได้รับ (100%)',
      'ค่าบริการระบบเหมาจ่าย (แต้ม)',
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
      t.fareAmount.toFixed(2),
      t.systemFeePoints,
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
    <div className="flex h-screen w-full bg-slate-950 text-white font-sans select-none overflow-hidden">
      {/* ──────────────── Toast Notification ──────────────── */}
      {promotionToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-slate-950 px-5 py-3 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          <span>{promotionToast}</span>
        </div>
      )}

      {/* ──────────────── Mobile Overlay Backdrop ──────────────── */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* ──────────────── Left Sidebar Navigation (World-Class Global Standard) ──────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 xl:w-80 bg-slate-950/95 lg:bg-slate-950/90 border-r border-white/5 flex flex-col justify-between backdrop-blur-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 lg:p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/10 flex-shrink-0 p-1.5 overflow-hidden">
                <img
                  src="/logo-gozipp-symbol-transparent.png"
                  alt="GOZIPP"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(41,238,122,0.4)]"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-white leading-none">
                    GOZIPP <span className="text-emerald-400">CONTROL</span>
                  </h1>
                </div>
                <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-1">
                  ศูนย์บริหารจัดการอัจฉริยะ
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
              aria-label="ปิดเมนู"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live Status Indicator */}
          <div className="mt-4 flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-bold text-[11px]">ระบบออนไลน์ • Live Sync</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">v2.5 Pro</span>
          </div>
        </div>

        {/* Navigation Menu (Scrollable) */}
        <div className="p-4 flex-1 overflow-y-auto space-y-1.5 admin-scrollbar">
          <div className="px-3 pb-2 pt-1 text-[10px] font-black tracking-wider uppercase text-slate-500">
            เมนูหลักระบบ (MAIN MENU)
          </div>
          {[
            {
              id: 'ACCOUNTING',
              label: 'การเงินและบัญชี',
              enLabel: 'Financial & Ledger',
              icon: BarChart3,
            },
            {
              id: 'CUSTOMER_POINTS',
              label: 'ตรวจสอบแต้ม & เติมเงินสด',
              enLabel: 'Customer Points & Live Top-up',
              icon: Coins,
              badgeText: 'Live',
              badgeColor: 'emerald',
            },
            {
              id: 'PROMOTIONS',
              label: 'โปรโมชั่น & แคมเปญ',
              enLabel: 'Promotions & Points',
              icon: Gift,
              badge: promotions.filter((p) => p.isActive).length,
              badgeColor: 'emerald',
            },
            {
              id: 'FINANCE',
              label: 'บริหารการเงิน & นโยบาย',
              enLabel: 'Pricing & Policies',
              icon: Wallet,
            },
            {
              id: 'MANAGE',
              label: 'จัดการและอนุมัติคนขับ',
              enLabel: 'Driver Verification',
              icon: UserCheck,
              badge: drivers.filter((d) => d.status === 'PENDING').length,
              badgeColor: 'amber',
            },
            {
              id: 'AI_ANALYST',
              label: 'ศูนย์วิเคราะห์อัจฉริยะ AI',
              enLabel: 'AI Intelligence Core',
              icon: Sparkles,
              badgeText: 'AI Core',
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as AdminTab);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full group text-left px-3.5 py-3 rounded-2xl transition-all duration-200 flex items-center gap-3.5 relative ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-slate-950 rounded-r-full" />
                )}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                    isActive
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-white/5 text-emerald-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs truncate font-bold leading-tight">
                      {item.label}
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          isActive
                            ? 'bg-slate-950 text-emerald-400'
                            : item.badgeColor === 'amber'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.badgeText && (
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-wide ${
                          isActive
                            ? 'bg-slate-950 text-emerald-400'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {item.badgeText}
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      isActive ? 'text-slate-950/80 font-semibold' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  >
                    {item.enLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer & Profile */}
        <div className="p-4 border-t border-white/5 space-y-3 bg-slate-950/60">
          <div className="flex items-center justify-between text-[11px] px-2 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>อัปเดต: {lastUpdated}</span>
            </span>
            <button
              onClick={handleRefresh}
              className="p-1 hover:text-emerald-400 transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-xs font-black text-slate-950 ring-2 ring-emerald-500/30 flex-shrink-0">
                SA
              </div>
              <div className="text-left leading-tight truncate">
                <div className="font-bold text-white text-xs truncate">Super Admin</div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-0.5 truncate">
                  {currentRole.replace('_', ' ')}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0 ml-1"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ──────────────── Right Main Workspace ──────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-950">
        {/* Top Header Bar */}
        <header className="h-20 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl px-5 lg:px-8 flex items-center justify-between flex-shrink-0 z-20">
          {/* Left: Mobile Toggle & Page Title & Breadcrumb */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 flex-shrink-0"
              title="เปิดเมนูหลัก"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-semibold text-slate-400 truncate">
                <span>ระบบแอดมิน</span>
                <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                <span className="text-emerald-400 font-bold truncate">
                  {activeTab === 'ACCOUNTING' && 'การเงินและบัญชี'}
                  {activeTab === 'CUSTOMER_POINTS' && 'ตรวจสอบแต้ม & เติมเงินสด'}
                  {activeTab === 'PROMOTIONS' && 'โปรโมชั่น & แคมเปญ'}
                  {activeTab === 'FINANCE' && 'บริหารการเงิน & นโยบาย'}
                  {activeTab === 'MANAGE' && 'จัดการและอนุมัติคนขับ'}
                  {activeTab === 'AI_ANALYST' && 'ศูนย์วิเคราะห์อัจฉริยะ AI'}
                </span>
              </div>
              <h2 className="text-base sm:text-xl lg:text-2xl font-black text-white tracking-tight mt-0.5 truncate">
                {activeTab === 'ACCOUNTING' && 'สรุปการเงินและบัญชีแยกประเภท'}
                {activeTab === 'CUSTOMER_POINTS' && 'ตรวจสอบแต้มคงเหลือลูกค้า & รายการเติมเงิน Realtime'}
                {activeTab === 'PROMOTIONS' && 'จัดการโปรโมชั่น & กำหนดแต้มสะสม'}
                {activeTab === 'FINANCE' && 'บริหารนโยบายและโครงสร้างอัตราค่าบริการ'}
                {activeTab === 'MANAGE' && 'ตรวจสอบและอนุมัติผู้สมัครคนขับ'}
                {activeTab === 'AI_ANALYST' && 'ศูนย์จำลองและวิเคราะห์ข้อมูลอัจฉริยะ AI'}
              </h2>
            </div>
          </div>

          {/* Right: Quick Context Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Period Selector (when in ACCOUNTING) */}
            {activeTab === 'ACCOUNTING' && (
              <div className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/5 text-xs font-bold">
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
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Add Promo Button (when in PROMOTIONS) */}
            {activeTab === 'PROMOTIONS' && (
              <button
                onClick={() => setIsCreatingPromotion(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">สร้างโปรโมชั่นใหม่</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-slate-300 hover:text-white transition-all active:scale-95"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all active:scale-95 shadow-lg shadow-emerald-500/5"
              title="ดาวน์โหลดรายงานสรุปเป็น CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ส่งออก CSV</span>
            </button>
          </div>
        </header>

        {/* ── Scrollable Workspace ── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 admin-scrollbar">
          <div className="max-w-7xl mx-auto w-full space-y-8 pb-16">
            {/* Mobile Period Selector (when in ACCOUNTING) */}
            {activeTab === 'ACCOUNTING' && (
              <div className="flex md:hidden items-center justify-between gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-white/5 text-xs font-bold">
                {[
                  { id: 'DAILY', label: 'วันนี้' },
                  { id: 'WEEKLY', label: 'สัปดาห์นี้' },
                  { id: 'MONTHLY', label: 'เดือนนี้' },
                  { id: 'YEARLY', label: 'ทั้งปี' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setReportPeriod(p.id as ReportPeriod)}
                    className={`flex-1 py-1.5 rounded-xl text-xs text-center font-bold transition-all ${
                      reportPeriod === p.id
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
        {/* ═══════════════════════════════════════════════════════════════
            TAB 1: การเงินและบัญชี (Accounting & Ledger)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'ACCOUNTING' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* 4 World-Class KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Revenue (Driver 100%) */}
              <div className="bg-slate-900/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    ยอดค่าโดยสารรวม ({reportPeriod === 'DAILY' ? 'วันนี้' : reportPeriod === 'WEEKLY' ? 'สัปดาห์นี้' : reportPeriod === 'MONTHLY' ? 'เดือนนี้' : 'ทั้งปี'})
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
                  <span className="text-slate-500">คนขับได้รับเต็ม 100%</span>
                </div>
              </div>

              {/* Card 2: Transactions */}
              <div className="bg-slate-900/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    จำนวนเที่ยวสำเร็จ
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                  {reportData.kpi.txns.toLocaleString()} <span className="text-lg font-bold text-slate-400">เที่ยว</span>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                  <span>อัตราสำเร็จ {reportData.kpi.successRate}%</span>
                  <span className="font-semibold text-slate-300">เฉลี่ย ฿{reportData.kpi.avgFare.toFixed(2)}/เที่ยว</span>
                </div>
              </div>

              {/* Card 3: System Flat Fee Points (No 15% GP) */}
              <div className="bg-slate-900/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    ค่าบริการระบบ (หักแต้มต่อเที่ยว)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-black text-purple-400 tracking-tight">
                  {reportData.kpi.flatFeePointsCollected.toLocaleString()} <span className="text-lg font-bold text-slate-400">แต้ม (฿{reportData.kpi.flatFeePointsCollected})</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>เหมาจ่าย {baseFarePoints} แต้ม/เที่ยว — ไม่หัก GP คนขับ</span>
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
                    แนวโน้มค่าโดยสารและปริมาณเที่ยววิ่ง ({reportPeriod === 'DAILY' ? 'รายชั่วโมง' : reportPeriod === 'WEEKLY' ? 'รายวัน' : reportPeriod === 'MONTHLY' ? 'รายสัปดาห์' : 'รายเดือน'})
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    แสดงการกระจายตัวของค่าโดยสาร (คนขับรับเต็ม 100%) และจำนวนผู้โดยสารเรียกรถตลอดช่วงเวลา
                  </p>
                </div>

                {/* Chart Toggle */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/5 text-xs font-bold">
                  {[
                    { id: 'REVENUE', label: 'ค่าโดยสาร (฿)' },
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
                                    {entry.name === 'revenue' ? 'ยอดค่าโดยสาร:' : 'จำนวนเที่ยว:'}
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
                  <span className="text-slate-500 font-medium">นโยบายรายได้คนขับ:</span>
                  <div className="text-white font-bold text-sm mt-0.5">รับเต็ม 100% (0% GP)</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">ค่าบริการหักแต้มต่อเที่ยว:</span>
                  <div className="text-purple-400 font-bold text-sm mt-0.5">{baseFarePoints} แต้ม / เที่ยว</div>
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
                    แสดงรายการชำระเงินที่คนขับรับเต็ม 100% พร้อมบันทึกหักแต้มเหมาจ่ายต่อเที่ยว
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
                      <th className="p-4 text-right">ค่าโดยสารคนขับรับเต็ม (THB)</th>
                      <th className="p-4 text-right">ค่าบริการระบบ (หักแต้ม)</th>
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
                          <td className="p-4 font-black text-emerald-400 text-right font-mono">
                            ฿{row.fareAmount.toFixed(2)}
                          </td>
                          <td className="p-4 font-bold text-purple-400 text-right font-mono">
                            {row.systemFeePoints > 0 ? `${row.systemFeePoints} แต้ม` : '-'}
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
            TAB: ตรวจสอบแต้มลูกค้า & รายการเติมเงิน Realtime (Live Top-Up Stream)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'CUSTOMER_POINTS' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header with Live Realtime Pulse */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-3xl border border-white/5 backdrop-blur-xl">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                  <Coins className="w-6 h-6 text-emerald-400" />
                  ตรวจสอบแต้มลูกค้า & รายการเติมเงิน Realtime (Live Top-Up Stream)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ตรวจสอบยอดแต้มคงเหลือของลูกค้า และฟีดรายการเติมแต้มผ่าน PromptPay QR Code สดทันทีแบบ Realtime
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Stream • ซิงก์สดทุก 3 วินาที</span>
                </div>
                <button
                  onClick={() => {
                    fetchTopupFeed();
                    fetchCustomersList();
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/5"
                  title="รีเฟรชข้อมูลสด"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4 Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    ยอดเงินเติมเข้าวันนี้ (บาท)
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
                  ฿{topupSummary.totalVolumeBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  ยอดเฉลี่ย ฿{topupSummary.avgTopupAmount.toLocaleString()} / รายการ
                </div>
              </div>

              <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    แต้มที่เข้ากระเป๋าลูกค้า
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-400 mt-2 font-mono">
                  +{topupSummary.totalPointsGiven.toLocaleString()} แต้ม
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  รวมแต้มหลักและแต้มโบนัสโปรโมชั่น
                </div>
              </div>

              <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    แต้มโบนัสที่แจกฟรี (Promo)
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <Gift className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-cyan-400 mt-2 font-mono">
                  +{topupSummary.totalBonusGiven.toLocaleString()} แต้ม
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  จากแคมเปญ Top-up Bonus ที่กำหนด
                </div>
              </div>

              <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    แต้มคงเหลือรวมในระบบ
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
                  {customerSummary.totalSystemPoints.toLocaleString()} แต้ม
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  รวม {customerSummary.totalCustomersCount} บัญชีผู้โดยสาร
                </div>
              </div>
            </div>

            {/* Sub-tab Navigation and Search Box */}
            <div className="bg-slate-900/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-white/10 text-xs font-bold">
                  <button
                    onClick={() => setCustomerPointsTab('TOPUPS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      customerPointsTab === 'TOPUPS'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>รายการเติมแต้มสด Realtime ({topupFeed.length})</span>
                  </button>
                  <button
                    onClick={() => setCustomerPointsTab('CUSTOMERS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      customerPointsTab === 'CUSTOMERS'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>สมุดตรวจสอบแต้มลูกค้า ({customersList.length})</span>
                  </button>
                </div>

                {/* Search Box */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-80">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={
                        customerPointsTab === 'TOPUPS'
                          ? 'ค้นหาชื่อ, เบอร์โทร, รหัส Ref, ธนาคาร...'
                          : 'ค้นหาชื่อลูกค้า, เบอร์โทร, รหัส ID...'
                      }
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {customerPointsTab === 'TOPUPS' && (
                    <select
                      value={topupStatusFilter}
                      onChange={(e: any) => setTopupStatusFilter(e.target.value)}
                      className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">ทุกสถานะ</option>
                      <option value="COMPLETED">เติมสำเร็จ (Completed)</option>
                      <option value="PENDING">รอดำเนินการ (Pending)</option>
                      <option value="REJECTED">ยกเลิก/ไม่สำเร็จ</option>
                    </select>
                  )}
                </div>
              </div>

              {/* View 1: Top-ups Feed Table */}
              {customerPointsTab === 'TOPUPS' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.02] text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-white/5">
                      <tr>
                        <th className="p-4">เวลาทำรายการ</th>
                        <th className="p-4">เลขที่อ้างอิง (Ref)</th>
                        <th className="p-4">ผู้โดยสาร (ลูกค้า)</th>
                        <th className="p-4 text-right">ยอดเงินโอน (THB)</th>
                        <th className="p-4 text-right">แต้มที่ได้รับ</th>
                        <th className="p-4">โปรโมชั่นที่ได้รับ</th>
                        <th className="p-4">ช่องทาง</th>
                        <th className="p-4 text-center">สถานะ</th>
                        <th className="p-4 text-center">หลักฐานสลิป</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {topupFeed
                        .filter((t) => {
                          const matchesQuery =
                            !customerSearchQuery ||
                            t.passengerName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                            t.passengerPhone.includes(customerSearchQuery) ||
                            t.paymentRef.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                            (t.bankRef && t.bankRef.toLowerCase().includes(customerSearchQuery.toLowerCase()));
                          const matchesStatus = topupStatusFilter === 'ALL' || t.status === topupStatusFilter;
                          return matchesQuery && matchesStatus;
                        })
                        .map((row) => (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedTopup(row)}
                            className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                          >
                            <td className="p-4 text-slate-400 whitespace-nowrap">
                              {new Date(row.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              <span className="block text-[10px] text-slate-500">
                                {new Date(row.timestamp).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                              </span>
                            </td>
                            <td className="p-4 font-black text-white font-mono">{row.paymentRef}</td>
                            <td className="p-4">
                              <div className="text-slate-200 font-semibold">{row.passengerName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{row.passengerPhone}</div>
                            </td>
                            <td className="p-4 font-black text-emerald-400 text-right font-mono text-sm">
                              ฿{row.amountBaht.toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-mono">
                              <div className="font-extrabold text-purple-400">+{row.totalPoints} แต้ม</div>
                              {row.bonusPoints > 0 && (
                                <div className="text-[10px] text-cyan-400">
                                  ({row.basePoints} + โบนัส {row.bonusPoints})
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              {row.promoApplied ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                  🎁 {row.promoApplied}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <QrCode className="w-3 h-3" /> PromptPay QR
                              </span>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              {row.status === 'COMPLETED' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> เติมสำเร็จ
                                </span>
                              ) : row.status === 'PENDING' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                  <Clock className="w-3 h-3" /> รอดำเนินการ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-500/15 text-red-400 border border-red-500/20">
                                  <X className="w-3 h-3" /> ยกเลิก
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTopup(row);
                                }}
                                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 font-bold transition-all text-[11px]"
                              >
                                ดูหลักฐาน
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* View 2: Customer Directory Table */}
              {customerPointsTab === 'CUSTOMERS' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.02] text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-white/5">
                      <tr>
                        <th className="p-4">รหัสลูกค้า</th>
                        <th className="p-4">ชื่อผู้โดยสาร</th>
                        <th className="p-4">เบอร์โทรศัพท์</th>
                        <th className="p-4 text-right">แต้มคงเหลือปัจจุบัน</th>
                        <th className="p-4 text-center">แต้มสมัครใหม่</th>
                        <th className="p-4 text-right">ยอดเติมสะสม (THB)</th>
                        <th className="p-4 text-center">เที่ยวที่เดินทาง</th>
                        <th className="p-4">วันที่สมัครสมาชิก</th>
                        <th className="p-4 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {customersList
                        .filter((c) => {
                          if (!customerSearchQuery) return true;
                          const q = customerSearchQuery.toLowerCase();
                          return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.id.toLowerCase().includes(q);
                        })
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="p-4 font-mono font-bold text-slate-400">{c.id}</td>
                            <td className="p-4 font-bold text-white">{c.name}</td>
                            <td className="p-4 font-mono text-slate-300">{c.phone}</td>
                            <td className="p-4 text-right font-mono">
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl font-black text-sm bg-purple-500/15 text-purple-300 border border-purple-500/25">
                                <Coins className="w-3.5 h-3.5 text-purple-400" />
                                {c.currentPoints.toLocaleString()} แต้ม
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 text-[11px]">
                                +{c.welcomePoints} แต้ม
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-slate-200">
                              ฿{c.totalToppedUpBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-center font-bold text-slate-300">
                              {c.totalRidesUsed} เที่ยว
                            </td>
                            <td className="p-4 text-slate-400 text-[11px]">
                              {new Date(c.registrationDate).toLocaleDateString('th-TH', {
                                day: '2-digit',
                                month: 'short',
                                year: '2-digit',
                              })}
                            </td>
                            <td className="p-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ใช้งานปกติ
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: โปรโมชั่น & แคมเปญ (Promotion Management)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'PROMOTIONS' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Create Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Gift className="w-6 h-6 text-emerald-400" />
                  ระบบกำหนดและจัดการโปรโมชั่น (Promotion & Points Engine)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  กำหนดแต้มแจกผู้โดยสารใหม่ แนะนำเพื่อน และโปรโมชั่นพิเศษ แอดมินสามารถปรับเปลี่ยนชื่อและแต้มได้ตลอดเวลา
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Type Filter */}
                <select
                  value={promoTypeFilter}
                  onChange={(e) => setPromoTypeFilter(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">ทุกประเภทโปรโมชั่น</option>
                  <option value="NEW_PASSENGER">ผู้โดยสารใหม่</option>
                  <option value="REFERRAL">แนะนำเพื่อน</option>
                  <option value="FIRST_RIDE">เที่ยวเดินทางแรก</option>
                  <option value="TOPUP_BONUS">เติมเงิน</option>
                  <option value="CUSTOM">กำหนดเอง</option>
                </select>

                {/* Create Promo Button */}
                <button
                  onClick={() => setIsCreatingPromotion(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>สร้างโปรโมชั่นใหม่</span>
                </button>
              </div>
            </div>

            {/* Promotions Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold uppercase text-slate-500">โปรโมชั่นที่เปิดใช้งาน</span>
                <div className="text-2xl font-black text-white mt-1">
                  {promotions.filter((p) => p.isActive).length}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {promotions.length} แคมเปญ</span>
                </div>
              </div>
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold uppercase text-slate-500">แต้มแจกจ่ายสะสมทั้งหมด</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {promotions.reduce((sum, p) => sum + p.points * p.currentUsage, 0).toLocaleString()} แต้ม
                </div>
              </div>
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold uppercase text-slate-500">ผู้โดยสารที่ได้รับสิทธิ์สะสม</span>
                <div className="text-2xl font-black text-cyan-400 mt-1">
                  {promotions.reduce((sum, p) => sum + p.currentUsage, 0).toLocaleString()} คน
                </div>
              </div>
            </div>

            {/* Promotions List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPromotions.map((promo) => (
                <div
                  key={promo.id}
                  className={`p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                    promo.isActive
                      ? 'bg-slate-900/80 border-white/10 shadow-xl'
                      : 'bg-slate-950/60 border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              promo.type === 'NEW_PASSENGER'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : promo.type === 'REFERRAL'
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                : promo.type === 'FIRST_RIDE'
                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {promo.type === 'NEW_PASSENGER'
                              ? 'ผู้โดยสารใหม่'
                              : promo.type === 'REFERRAL'
                              ? 'แนะนำเพื่อน'
                              : promo.type === 'FIRST_RIDE'
                              ? 'เที่ยวแรก'
                              : promo.type === 'TOPUP_BONUS'
                              ? 'เติมเงิน'
                              : 'กำหนดเอง'}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                            {promo.code}
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-white mt-2">{promo.name}</h4>
                      </div>

                      {/* Toggle Active Switch */}
                      <button
                        onClick={() => handleTogglePromotion(promo.id)}
                        className={`p-1 rounded-xl transition-colors ${
                          promo.isActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={promo.isActive ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
                      >
                        {promo.isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{promo.description}</p>

                    {/* Points Highlight Box */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">แต้มที่มอบให้</span>
                        <div className="text-2xl font-black text-emerald-400 font-mono">
                          {promo.points} <span className="text-sm font-bold text-slate-400">แต้ม (฿{promo.points})</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500">มอบสิทธิ์ไปแล้ว</span>
                        <div className="text-base font-bold text-white font-mono">{promo.currentUsage.toLocaleString()} คน</div>
                      </div>
                    </div>

                    {/* Campaign Date Display */}
                    {(() => {
                      const dateInfo = getPromotionDateStatus(promo.startDate, promo.endDate);
                      return (
                        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/70 border border-white/5 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="text-[11px] font-bold">ระยะเวลาแคมเปญ:</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${dateInfo.badgeClass}`}>
                            {dateInfo.label}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                    <span className="text-[10px] text-slate-500">
                      สถานะ: {promo.isActive ? '● กำลังใช้งาน' : '○ ปิดการใช้งาน'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingPromotion(promo)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>แก้ไขชื่อ / แต้ม</span>
                      </button>
                      <button
                        onClick={() => handleDeletePromotion(promo.id)}
                        className="p-1.5 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                        title="ลบโปรโมชั่น"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 3: บริหารการเงิน & นโยบาย (Finance & Platform Policies)
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
                    กำหนดแต้มหักต่อเที่ยว และวงเงินแต้มติดลบฉุกเฉินสำหรับผู้โดยสาร (คนขับรับค่าโดยสารเต็ม 100%)
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
                    จำลองรายได้ค่าบริการระบบแบบเหมาจ่าย (Flat Fee Simulator)
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
            TAB 4: จัดการและอนุมัติคนขับ (Driver Approvals & KYC)
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
            TAB 5: ศูนย์วิเคราะห์อัจฉริยะ AI (AI Mobility Intelligence)
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
          </div>
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: ตรวจสอบหลักฐานการเติมแต้มลูกค้า (Top-up Audit Slip)
         ═══════════════════════════════════════════════════════════════ */}
      {selectedTopup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 lg:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-white text-base">ใบเสร็จตรวจสอบการเติมแต้ม</h4>
                  <p className="text-xs text-slate-400 font-mono">PromptPay Instant Top-up Audit Slip</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTopup(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-white/5 space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">รหัสอ้างอิงธุรกรรม:</span>
                <span className="text-white font-black">{selectedTopup.paymentRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">เลขอ้างอิงธนาคาร (Bank Ref):</span>
                <span className="text-emerald-400 font-bold">{selectedTopup.bankRef || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">เวลาทำรายการ:</span>
                <span className="text-slate-300">
                  {new Date(selectedTopup.timestamp).toLocaleString('th-TH')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ลูกค้าผู้โดยสาร:</span>
                <span className="text-slate-200 font-sans font-bold">
                  {selectedTopup.passengerName} ({selectedTopup.passengerPhone})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ช่องทางการชำระ:</span>
                <span className="text-blue-400 font-bold">PromptPay QR Code</span>
              </div>
              <div className="border-t border-white/5 pt-3 flex justify-between text-sm">
                <span className="text-slate-400">ยอดเงินโอนเข้า:</span>
                <span className="text-emerald-400 font-black">
                  ฿{selectedTopup.amountBaht.toFixed(2)} บาท
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">แต้มที่ได้รับเข้ากระเป๋า:</span>
                <span className="text-purple-400 font-black">
                  +{selectedTopup.totalPoints} แต้ม
                </span>
              </div>
              {selectedTopup.bonusPoints > 0 && (
                <div className="flex justify-between text-xs text-cyan-400">
                  <span>โบนัสโปรโมชั่นพิเศษ:</span>
                  <span>+{selectedTopup.bonusPoints} แต้ม</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-white/5">
                <span className="text-slate-500">สถานะการตรวจสอบ:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ตรวจสอบสำเร็จ (Auto-Reconciled)
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTopup(null)}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

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

            {/* Pricing Breakdown (Driver 100% - No GP 15%) */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>ยอดค่าโดยสาร (คนขับได้รับเต็ม 100%):</span>
                <span className="font-mono text-emerald-400 font-black">฿{selectedTxn.fareAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ค่าบริการระบบ GOZIPP (หักแต้มเหมาจ่ายต่อเที่ยว):</span>
                <span className="font-mono text-purple-400 font-bold">{selectedTxn.systemFeePoints} แต้ม (฿{selectedTxn.systemFeePoints}.00)</span>
              </div>
              <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>นโยบาย GOZIPP: ไม่หัก GP ค่าหัวคิวจากคนขับ — คนขับรับค่าโดยสารเต็มเม็ดเต็มหน่วย 100%</span>
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
          MODAL 2: Edit Promotion Modal (Customizable Anytime)
         ═══════════════════════════════════════════════════════════════ */}
      {editingPromotion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 lg:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-white text-base">ปรับเปลี่ยนโปรโมชั่นและแต้มที่ให้</h4>
                  <p className="text-xs text-slate-400">แก้ไขชื่อโปรโมชั่นและแต้มสะสมได้เสมอ</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPromotion(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">ชื่อโปรโมชั่น</label>
                <input
                  type="text"
                  value={editingPromotion.name}
                  onChange={(e) => setEditingPromotion({ ...editingPromotion, name: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                  placeholder="เช่น สมัครผู้โดยสารใหม่ ให้แต้ม 50 แต้ม"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">รหัสโปรโมชั่น (Code)</label>
                  <input
                    type="text"
                    value={editingPromotion.code}
                    onChange={(e) => setEditingPromotion({ ...editingPromotion, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">ประเภทโปรโมชั่น</label>
                  <select
                    value={editingPromotion.type}
                    onChange={(e) => setEditingPromotion({ ...editingPromotion, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="NEW_PASSENGER">ผู้โดยสารใหม่</option>
                    <option value="REFERRAL">แนะนำเพื่อน</option>
                    <option value="FIRST_RIDE">เที่ยวเดินทางแรก</option>
                    <option value="TOPUP_BONUS">เติมเงิน</option>
                    <option value="CUSTOM">กำหนดเอง</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">จำนวนแต้มที่ให้ (แต้มต่อคน)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={editingPromotion.points}
                    onChange={(e) =>
                      setEditingPromotion({ ...editingPromotion, points: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-emerald-400 font-mono font-black text-lg focus:outline-none focus:border-emerald-500 pr-24"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    แต้ม (฿{editingPromotion.points})
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">แอดมินสามารถปรับเปลี่ยนจำนวนแต้มที่แจกได้ตลอดเวลา</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">วันที่เริ่มต้นแคมเปญ (Start Date)</label>
                  <input
                    type="date"
                    value={editingPromotion.startDate || ''}
                    onChange={(e) => setEditingPromotion({ ...editingPromotion, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">วันที่สิ้นสุดแคมเปญ (End Date)</label>
                  <input
                    type="date"
                    value={editingPromotion.endDate || ''}
                    onChange={(e) => setEditingPromotion({ ...editingPromotion, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">คำอธิบายและเงื่อนไขโปรโมชั่น</label>
                <textarea
                  rows={3}
                  value={editingPromotion.description}
                  onChange={(e) => setEditingPromotion({ ...editingPromotion, description: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="ระบุเงื่อนไขการรับแต้ม..."
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="font-bold text-slate-300">เปิดใช้งานโปรโมชั่นนี้ทันที</span>
                <input
                  type="checkbox"
                  checked={editingPromotion.isActive}
                  onChange={(e) => setEditingPromotion({ ...editingPromotion, isActive: e.target.checked })}
                  className="w-5 h-5 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingPromotion(null)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleSaveEditPromotion(editingPromotion)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: Create New Promotion Modal
         ═══════════════════════════════════════════════════════════════ */}
      {isCreatingPromotion && (
        <CreatePromotionModal
          onClose={() => setIsCreatingPromotion(false)}
          onSave={handleCreateNewPromotion}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 4: PromptPay Full QR Code Modal
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

            <div className="bg-white p-6 rounded-2xl text-slate-950 shadow-inner flex flex-col items-center">
              <div className="text-xs font-black tracking-widest text-blue-900 uppercase mb-2">
                PROMPTPAY BILL PAYMENT
              </div>
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
          MODAL 5: Driver Document Viewer Modal
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
          MODAL 6: Driver Rejection Reason Modal
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

// ─────────────────────────────────────────────────────────────
// Subcomponent: Create Promotion Modal
// ─────────────────────────────────────────────────────────────
function CreatePromotionModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (promo: PromotionRule) => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<PromotionRule['type']>('NEW_PASSENGER');
  const [points, setPoints] = useState(50);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [maxUsageLimit, setMaxUsageLimit] = useState<number | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('กรุณาระบุชื่อโปรโมชั่น');
    const generatedCode = code.trim() || `PROMO${Math.floor(1000 + Math.random() * 9000)}`;

    const newPromo: PromotionRule = {
      id: `PROMO-${Date.now()}`,
      name: name.trim(),
      code: generatedCode.toUpperCase(),
      type,
      points: Math.max(0, points),
      startDate: startDate ? startDate.trim() : undefined,
      endDate: endDate ? endDate.trim() : undefined,
      description: description.trim() || `โปรโมชั่น ${name.trim()} รับทันที ${points} แต้ม`,
      isActive: true,
      maxUsageLimit: maxUsageLimit || undefined,
      currentUsage: 0,
      updatedAt: new Date().toISOString(),
    };

    onSave(newPromo);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 lg:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-white text-base">สร้างโปรโมชั่นแจกแต้มใหม่</h4>
              <p className="text-xs text-slate-400">กำหนดเงื่อนไขและแต้มสะสมสำหรับผู้โดยสาร</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">ชื่อโปรโมชั่น *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              placeholder="เช่น สมัครผู้โดยสารใหม่ ให้แต้ม 50 แต้ม"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">รหัสโปรโมชั่น (Code)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                placeholder="เช่น WELCOME50"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">ประเภทโปรโมชั่น</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="NEW_PASSENGER">ผู้โดยสารใหม่ (New Passenger)</option>
                <option value="REFERRAL">แนะนำเพื่อน (Referral)</option>
                <option value="FIRST_RIDE">เที่ยวเดินทางแรก (First Ride)</option>
                <option value="TOPUP_BONUS">เติมเงิน (Top-up)</option>
                <option value="CUSTOM">กำหนดเอง (Custom)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1.5">จำนวนแต้มที่ให้ (แต้มต่อคน) *</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                required
                value={points}
                onChange={(e) => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-emerald-400 font-mono font-black text-lg focus:outline-none focus:border-emerald-500 pr-24"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                แต้ม (฿{points})
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">วันที่เริ่มต้นแคมเปญ (Start Date)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">วันที่สิ้นสุดแคมเปญ (End Date)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                placeholder="เว้นว่างหากไม่มีกำหนดสิ้นสุด"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1.5">คำอธิบายและเงื่อนไขโปรโมชั่น</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              placeholder="เช่น เมื่อผู้โดยสารลงทะเบียนใหม่ผ่าน OTP สำเร็จ จะได้รับแต้มทันที 50 แต้ม"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
            >
              สร้างโปรโมชั่น
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}