import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Rider, Location } from '../types';
import { APP_LOGO_PATH, MAP_CENTER, STATION_ZONES, IS_PRODUCTION, API_BASE_URL } from '../constants';
import { socket } from '../services/socket';
import { getCurrentPosition } from '../services/geolocation';
import { calculateDistance } from '../services/scheduler';
import InstallPwaPrompt from './InstallPwaPrompt';
import dynamic from 'next/dynamic';
import ChatModal from './ChatModal';
import SOSButton from './SOSButton';

const LiveMapView = dynamic(() => import('./LiveMapView'), { ssr: false });

interface PassengerAppProps {
    riderData: Rider | undefined;
}

type AuthStep = 'ONBOARDING' | 'LOGIN' | 'LOGIN_PIN' | 'REGISTER' | 'OTP' | 'SETUP_PIN' | 'APP_SHELL';
type AppTab = 'HOME' | 'WALLET' | 'HISTORY' | 'ACTIVITY' | 'PROFILE';

// Constant for Cost
const RIDE_POINT_COST = 2;
const MAX_FREE_RIDES = 3; // New User Promo Limit
const SERVICE_RADIUS_KM = 2.0; // Strict Zone Radius (Prevent turf wars)

// Mock Data representing data fetched from Backend (Admin Settings)
const MOCK_PROMOS = [
    { id: 'P1', title: 'เติม 50 รับ 60', desc: 'คุ้มสุดๆ สำหรับลูกค้าใหม่', minTopup: 50, bonus: 10, color: 'bg-gradient-to-r from-blue-600 to-indigo-600' },
    { id: 'P2', title: 'เติม 100 รับ 120', desc: 'รับโบนัสเพิ่ม 20%', minTopup: 100, bonus: 20, color: 'bg-gradient-to-r from-emerald-500 to-teal-600' },
    { id: 'P3', title: 'นั่งฟรี 3 ครั้ง', desc: 'สำหรับสมาชิกใหม่เท่านั้น', isRide: true, color: 'bg-gradient-to-r from-purple-500 to-pink-500' }
];

const MOCK_PAYMENT_METHODS = [
    { id: 'PM1', name: 'PromptPay', accNumber: '081-234-5678', accName: 'บจก. โกซิป แพลตฟอร์ม', icon: '📱' },
    { id: 'PM2', name: 'KBANK', accNumber: '123-4-56789-0', accName: 'บจก. โกซิป แพลตฟอร์ม', icon: '🏦' }
];

// Initial History Data - START AS NEW USER (Empty)
const INITIAL_HISTORY: any[] = [];

const PassengerApp: React.FC<PassengerAppProps> = ({ riderData }) => {
    // Auth State
    const [authStep, setAuthStep] = useState<AuthStep>('ONBOARDING');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pinCode, setPinCode] = useState(['', '', '', '', '', '']); // New: PIN State
    const [registerForm, setRegisterForm] = useState({ name: '', phone: '' });
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [authError, setAuthError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false); // Track if OTP is for register vs login
    const [otpCountdown, setOtpCountdown] = useState(0);

    // App State
    const [activeTab, setActiveTab] = useState<AppTab>('HOME');
    const [balance, setBalance] = useState(0); // Start with 0 for new user
    const [history, setHistory] = useState<any[]>(INITIAL_HISTORY);
    const [myLocation, setMyLocation] = useState<Location | null>(null);

    // User Profile State
    const [userProfile, setUserProfile] = useState({
        name: 'น้องวิน (สมาชิกใหม่)',
        email: 'newuser@example.com',
        phone: '081-234-5678',
        avatarSeed: 'Felix'
    });
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [tempProfile, setTempProfile] = useState(userProfile);

    // --- FAVORITE PLACES STATE (Phase 5) ---
    const [favorites, setFavorites] = useState<{ type: 'HOME' | 'WORK', name: string, location: Location | null }[]>([
        { type: 'HOME', name: 'บ้าน', location: null },
        { type: 'WORK', name: 'ที่ทำงาน', location: null }
    ]);

    // Load favorites from local storage
    useEffect(() => {
        const saved = localStorage.getItem('mywin_favorites');
        if (saved) {
            try {
                setFavorites(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse favorites", e);
            }
        }
    }, []);

    const saveFavorite = (type: 'HOME' | 'WORK', location: Location) => {
        const newFavorites = favorites.map(f => f.type === type ? { ...f, location } : f);
        setFavorites(newFavorites);
        localStorage.setItem('mywin_favorites', JSON.stringify(newFavorites));
        alert(`บันทึก${type === 'HOME' ? 'บ้าน' : 'ที่ทำงาน'}เรียบร้อยแล้ว`);
    };

    const handleSelectFavorite = (type: 'HOME' | 'WORK') => {
        const fav = favorites.find(f => f.type === type);
        if (fav?.location) {
            // If already set, use it as destination (simulate selection)
            // Ideally we need to setDestination here if it was exposed or handle generic selection
            alert(`เลือกจุดหมาย: ${fav.name}`); // Placeholder until we integrate deep with map input
        } else {
            // If not set, ask to set current destination or my location as favorite
            const confirmSet = window.confirm(`คุณยังไม่ได้บันทึกตำแหน่ง "${fav?.name}"\nต้องการบันทึกพิกัดปัจจุบันเป็น "${fav?.name}" หรือไม่?`);
            if (confirmSet && myLocation) {
                saveFavorite(type, myLocation);
            }
        }
    };

    const handleClearFavorite = (e: React.MouseEvent, type: 'HOME' | 'WORK') => {
        e.stopPropagation();
        if (window.confirm(`ลบตำแหน่ง ${type === 'HOME' ? 'บ้าน' : 'ที่ทำงาน'} ออกจากรายการ?`)) {
            const newFavorites = favorites.map(f => f.type === type ? { ...f, location: null } : f);
            setFavorites(newFavorites);
            localStorage.setItem('mywin_favorites', JSON.stringify(newFavorites));
        }
    };

    // Booking State
    const [stationId, setStationId] = useState(''); // Init empty, will auto-select
    const [isSearching, setIsSearching] = useState(false);
    // NEW: Active Driver State (En Route)
    const [activeDriver, setActiveDriver] = useState<{ id: string, name: string, plate: string, phone: string } | null>(null);
    const [processedTripIds, setProcessedTripIds] = useState<Set<string>>(new Set()); // Idempotency Key Store

    // Top-up State
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [topupAmount, setTopupAmount] = useState<number | ''>('');
    const [selectedPayment, setSelectedPayment] = useState(MOCK_PAYMENT_METHODS[0]);

    // Activity State
    const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

    // Rating State
    const [pendingRating, setPendingRating] = useState<{ driverId: string } | null>(null);

    // Chat Modal State
    const [showChatModal, setShowChatModal] = useState(false);
    const [currentTripId, setCurrentTripId] = useState<string>('');
    const [ratingScore, setRatingScore] = useState(0);

    // UI Feedback
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Derived State for Free Rides
    const rideHistoryCount = history.filter(h => h.type === 'RIDE').length;
    const freeRidesLeft = Math.max(0, MAX_FREE_RIDES - rideHistoryCount);
    const isFreeRideEligible = freeRidesLeft > 0;

    // --- ZONING LOGIC ---
    // Filter stations based on distance to prevent cross-zone booking
    const availableStations = useMemo(() => {
        if (!myLocation) return [];

        const stationsWithDist = STATION_ZONES.map(s => ({
            ...s,
            distance: calculateDistance(myLocation, { lat: s.lat, lng: s.lng })
        }));

        // Sort by distance (Nearest first)
        stationsWithDist.sort((a, b) => a.distance - b.distance);

        // Filter: Only show stations within Service Radius OR the absolute closest one (even if far, to act as fallback)
        return stationsWithDist.filter((s, index) => s.distance <= SERVICE_RADIUS_KM || index === 0);
    }, [myLocation]);

    const nearestStation = availableStations[0];
    const isOutOfZone = nearestStation && nearestStation.distance > SERVICE_RADIUS_KM;

    // Auto-select nearest station when location is found
    useEffect(() => {
        if (nearestStation && !stationId) {
            setStationId(nearestStation.id);
        }
    }, [nearestStation]);

    useEffect(() => {
        getCurrentPosition().then(loc => setMyLocation(loc));

        // CHECK ON APP LAUNCH: Do we have a pending rating from a previous session?
        // This handles the case where user closed the app immediately after ride.
        const pendingJson = localStorage.getItem('mywin_pending_rating');
        if (pendingJson) {
            try {
                const pendingData = JSON.parse(pendingJson);
                if (pendingData && pendingData.driverId) {
                    // Show Rating Modal immediately on launch
                    setPendingRating({ driverId: pendingData.driverId });
                }
            } catch (e) {
                localStorage.removeItem('mywin_pending_rating');
            }
        }
    }, []);

    useEffect(() => {
        if (phoneNumber) {
            setUserProfile(prev => ({ ...prev, phone: phoneNumber }));
        }
        if (registerForm.name) {
            setUserProfile(prev => ({ ...prev, name: registerForm.name }));
        }
    }, [phoneNumber, registerForm]);

    const UI = {
        title: "GOZIPP",
        slogan: "รวดเร็ว ปลอดภัย ไปกับเรา"
    };

    // --- ROBUST TRANSACTION LISTENER ---
    useEffect(() => {
        // 1. Listener: When a Driver Accepts the Job -> Show Driver Info (En Route)
        const handleTripAccept = (data: { driverId: string, tripId: string }) => {
            setIsSearching(false);
            // Simulate fetching driver details
            setActiveDriver({
                id: data.driverId,
                name: 'สมชาย ใจดี',
                plate: '1กข-9999',
                phone: '081-234-5678'
            });
            setToastMessage(`🎉 คนขับรับงานแล้ว!`);
            setTimeout(() => setToastMessage(null), 3000);
        };

        // 2. Listener: When Driver Cancels/Rejects -> Reset State
        const onDriverJobReject = (data: { driverId: string, riderId: string }) => {
            if (activeDriver) {
                setActiveDriver(null);
                setToastMessage(`⚠️ คนขับยกเลิกงาน`);
                setTimeout(() => setToastMessage(null), 4000);
            }
        };

        // 3. Listener: Trip Completed -> Deduct Points & Show Rating
        const handleTripComplete = (data: { driverId: string }) => {
            setProcessedTripIds(prev => {
                // Idempotency check handled here if needed, or loosely allow for simulation
                return prev;
            });

            // Deduct logic moved to completion
            setHistory(prevHistory => {
                const ridesCount = prevHistory.filter(h => h.type === 'RIDE').length;
                const isFree = ridesCount < MAX_FREE_RIDES;

                let amountDeducted = 0;
                let txnTitle = 'ค่าโดยสาร (หักอัตโนมัติ)';

                if (!isFree) {
                    setBalance(b => b - RIDE_POINT_COST);
                    amountDeducted = -RIDE_POINT_COST;
                } else {
                    txnTitle = `ค่าโดยสาร (ฟรีครั้งที่ ${ridesCount + 1}/${MAX_FREE_RIDES})`;
                    amountDeducted = 0;
                }

                const now = new Date();
                const newTxn = {
                    id: Date.now(),
                    type: 'RIDE',
                    title: txnTitle,
                    amount: amountDeducted,
                    date: 'วันนี้',
                    time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                    month: now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
                    details: {
                        driverName: activeDriver?.name || 'พี่วิน',
                        plate: activeDriver?.plate || 'รถจักรยานยนต์',
                        pickup: 'ตำแหน่งปัจจุบัน',
                        destination: STATION_ZONES.find(s => s.id === stationId)?.name || 'วิน',
                        status: 'COMPLETED'
                    }
                };
                return [newTxn, ...prevHistory];
            });

            setActiveDriver(null); // Clear active driver
            setPendingRating({ driverId: data.driverId });
            setRatingScore(0);

            // PERSIST PENDING RATING: In case user closes app immediately
            localStorage.setItem('mywin_pending_rating', JSON.stringify({
                driverId: data.driverId,
                timestamp: Date.now()
            }));
        };

        socket.on('TRIP_ACCEPT', handleTripAccept);
        socket.on('DRIVER_REJECT_JOB', onDriverJobReject);
        socket.on('TRIP_COMPLETE', handleTripComplete);

        return () => {
            socket.off('TRIP_ACCEPT', handleTripAccept);
            socket.off('DRIVER_REJECT_JOB', onDriverJobReject);
            socket.off('TRIP_COMPLETE', handleTripComplete);
        };
    }, [activeDriver, stationId]); // Dependencies added

    // --- OTP Countdown Timer ---
    useEffect(() => {
        if (otpCountdown > 0) {
            const timer = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [otpCountdown]);

    // --- API FUNCTIONS ---
    const requestOtp = async (forRegister: boolean = false) => {
        const phone = forRegister ? registerForm.phone : phoneNumber;
        if (!phone || phone.length < 9) {
            setAuthError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');
            return;
        }

        setIsLoading(true);
        setAuthError('');
        setIsRegistering(forRegister);

        try {
            if (!forRegister) {
                // 1. Check if user has PIN
                const statusRes = await fetch(`${API_BASE_URL}/auth/check-status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: phone, role: 'PASSENGER' })
                });
                const statusData = await statusRes.json();

                if (statusData.exists && statusData.hasPin) {
                    setAuthStep('LOGIN_PIN');
                    setIsLoading(false);
                    return;
                }
            }

            // 2. Request OTP
            const res = await fetch(`${API_BASE_URL}/passenger/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'ส่ง OTP ไม่สำเร็จ');

            setOtpCode(['', '', '', '', '', '']);
            setOtpCountdown(60); // 60 seconds countdown
            setAuthStep('OTP');
        } catch (err: any) {
            setAuthError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsLoading(false);
        }
    };

    const verifyAndLogin = async () => {
        const otp = otpCode.join('');
        if (otp.length < 4) {
            setAuthError('กรุณากรอกรหัส OTP ให้ครบ');
            return;
        }

        const phone = isRegistering ? registerForm.phone : phoneNumber;
        setIsLoading(true);
        setAuthError('');

        try {
            if (isRegistering) {
                // Register first, then auto-login
                const res = await fetch(`${API_BASE_URL}/passenger/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phoneNumber: phone,
                        name: registerForm.name
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'ลงทะเบียนไม่สำเร็จ');

                // Store token
                // Success - token is set in cookies

                setUserProfile(prev => ({ ...prev, name: data.name || registerForm.name, phone: phone }));
                setBalance(0);
                setAuthStep('APP_SHELL');
            } else {
                // Login with OTP
                const res = await fetch(`${API_BASE_URL}/passenger/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: phone, otp: otp })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');

                if (!data.isRegistered) {
                    // User not found - redirect to register
                    setAuthError('ไม่พบบัญชี กรุณาลงทะเบียน');
                    setAuthStep('REGISTER');
                    return;
                }

                // Store token
                // Success - token is set in cookies

                setUserProfile(prev => ({ ...prev, name: data.name || prev.name, phone: phone }));
                setBalance(data.pointsBalance || 0);

                // Check PIN status for Passenger (assuming backend returns hasPin on login too, which we added to Driver mostly, but let's emulate)
                // If backend for passenger login doesn't have hasPin yet, we might want to check or just default to SETUP_PIN if register
                if (isRegistering) {
                    setPinCode(['', '', '', '', '', '']);
                    setAuthStep('SETUP_PIN');
                } else {
                    setAuthStep('APP_SHELL');
                }
            }
        } catch (err: any) {
            setAuthError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value[0]; // Only 1 char
        const newOtp = [...otpCode];
        newOtp[index] = value;
        setOtpCode(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleLoginSuccess = () => {
        setAuthStep('APP_SHELL');
    };

    const handleRequestRide = () => {
        // 1. Pre-validation (Client Side)
        const canAfford = balance >= RIDE_POINT_COST || isFreeRideEligible;

        if (!canAfford) {
            alert(`แต้มของคุณไม่เพียงพอ (ต้องการ ${RIDE_POINT_COST} แต้มสำหรับค่าบริการ GOZIPP) กรุณาเติมเงินก่อนเรียก`);
            setShowTopupModal(true);
            return;
        }

        if (!stationId) {
            alert('กรุณาเลือกวินที่ให้บริการ');
            return;
        }

        setIsSearching(true);

        const tripId = `T-${Date.now()}`; // Generate Trip ID

        socket.emit('RIDE_REQUEST', {
            riderId: 'R-USER',
            location: myLocation || MAP_CENTER,
            message: 'รอหน้าร้าน',
            targetWinId: stationId,
            tripId: tripId
        });

        // --- SIMULATION ONLY ---
        // IMPORTANT: In production, we do NOT auto-accept. The driver must click.
        if (!IS_PRODUCTION && window.location.hash.includes('passenger')) {
            console.log("[DEV] Auto-simulation ride acceptance triggered");
            setTimeout(() => {
                socket.emit('TRIP_ACCEPT', { driverId: 'D-SIM', tripId: tripId });
            }, 3000);
        }
    };

    const handleCancelActiveRide = () => {
        if (activeDriver) {
            socket.emit('RIDE_CANCEL', { riderId: 'R-USER' });
            setActiveDriver(null);
            setToastMessage('ยกเลิกการเดินทางแล้ว');
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    const handleConfirmTopup = () => {
        if (!topupAmount) return;

        const amount = Number(topupAmount);
        const promo = MOCK_PROMOS.find(p => !p.isRide && amount >= p.minTopup);
        const bonus = promo ? promo.bonus : 0;
        const total = amount + bonus;

        setTimeout(() => {
            setBalance(prev => prev + total);

            const now = new Date();
            const newTxn = {
                id: Date.now(),
                type: 'TOPUP',
                title: `เติมเงิน (${selectedPayment.name})`,
                amount: +total,
                date: 'วันนี้',
                time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                month: now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
            };
            setHistory(prev => [newTxn, ...prev]);

            setShowTopupModal(false);
            setTopupAmount('');
            setToastMessage(`เติมเงินสำเร็จ! +${total} แต้ม`);
            setTimeout(() => setToastMessage(null), 3000);
        }, 1500);
    };

    const handlePrivacyCall = () => {
        const confirmCall = window.confirm(
            "📞 โทรหาพี่วินผ่านแอป MyWin?\n\nระบบจะทำการโทรโดยไม่แสดงหมายเลขโทรศัพท์จริงของคุณเพื่อความเป็นส่วนตัว (Privacy Call)"
        );
        if (confirmCall) {
            alert("กำลังเชื่อมต่อสัญญาณเสียงผ่านระบบ... (จำลองการโทร)");
        }
    };

    const handleChat = () => {
        if (activeDriver) {
            setCurrentTripId(`trip-passenger-${activeDriver.id}`);
            setShowChatModal(true);
        } else {
            alert("ไม่มีการเดินทางที่กำลังดำเนินการอยู่");
        }
    }

    const submitRating = (skipped: boolean = false) => {
        if (!pendingRating) return;

        if (!skipped) {
            // Emit Rating to Server (Backend should update Driver Score for Queue)
            socket.emit('RIDE_RATE', { driverId: pendingRating.driverId, rating: ratingScore });
            setToastMessage('ขอบคุณสำหรับการติชม 🙏');
        }

        // CLEAR PENDING RATING
        setPendingRating(null);
        localStorage.removeItem('mywin_pending_rating');

        if (!skipped) {
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    const handleSaveProfile = () => {
        setUserProfile(tempProfile);
        setIsEditingProfile(false);
        setToastMessage('บันทึกข้อมูลเรียบร้อย ✅');
        setTimeout(() => setToastMessage(null), 2000);
    };

    const getStationName = (id: string) => STATION_ZONES.find(s => s.id === id)?.name || id;

    // --- SUB-COMPONENTS ---

    // ... (Auth Components remain the same) ...
    const renderAuth = () => {
        if (authStep === 'ONBOARDING') {
            return (
                <div className="flex flex-col h-full bg-white font-sans">
                    <InstallPwaPrompt />
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
                        <div className="w-64 h-64 bg-slate-100 rounded-full flex items-center justify-center mb-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-emerald-100 opacity-50"></div>
                            <span className="text-8xl relative z-10">🛵</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 mb-4">GOZIPP</h1>
                            <p className="text-slate-500 text-lg leading-relaxed">
                                แอปเรียกวินที่<span className="text-gozipp-green font-bold">สะดวก</span>ที่สุด<br />
                                เชื่อมต่อคนขับ ถึงหน้าบ้านคุณ
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 w-full max-w-xs mt-8">
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-xl mb-2">⚡</div>
                                <span className="text-xs text-slate-500 font-bold">เรียกไว</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center text-xl mb-2">📍</div>
                                <span className="text-xs text-slate-500 font-bold">รับถึงที่</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center text-xl mb-2">🛡️</div>
                                <span className="text-xs text-slate-500 font-bold">ปลอดภัย</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <button onClick={() => setAuthStep('LOGIN')} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg text-lg hover:bg-slate-800 transition-colors">
                            เริ่มต้นใช้งาน
                        </button>
                    </div>
                </div>
            );
        }

        if (authStep === 'LOGIN') {
            return (
                <div className="flex flex-col h-full bg-white font-sans p-6">
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="w-16 h-16 bg-mywin-blue rounded-2xl shadow-lg flex items-center justify-center mb-6"><img src={APP_LOGO_PATH} className="w-10 h-10 brightness-0 invert" /></div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">เข้าสู่ระบบ</h2>
                        <p className="text-slate-500 mb-8">กรอกเบอร์โทรศัพท์เพื่อใช้งาน</p>

                        {authError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
                                ⚠️ {authError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-xs font-bold text-slate-400 ml-1">เบอร์โทรศัพท์</span>
                                <input
                                    type="tel"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-xl font-bold text-slate-800 outline-none focus:border-mywin-blue mt-1"
                                    placeholder="08x-xxx-xxxx"
                                    value={phoneNumber}
                                    onChange={e => { setPhoneNumber(e.target.value); setAuthError(''); }}
                                />
                            </label>
                            <button
                                onClick={() => requestOtp(false)}
                                disabled={isLoading}
                                className="w-full bg-mywin-blue text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 text-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'กำลังส่ง OTP...' : 'เข้าสู่ระบบ'}
                            </button>
                        </div>

                        <button onClick={() => { setAuthStep('REGISTER'); setAuthError(''); }} className="text-mywin-blue font-bold text-sm hover:underline">ลงทะเบียนที่นี่</button>
                    </div>

                    {/* Social Login */}
                    <div className="flex flex-col gap-3 mt-8">
                        <div className="flex items-center gap-4">
                            <div className="h-px devide-y flex-1 bg-slate-200"></div>
                            <div className="text-center text-slate-400 text-xs">หรือเข้าสู่ระบบด้วย</div>
                            <div className="h-px devide-y flex-1 bg-slate-200"></div>
                        </div>
                        <button onClick={() => window.location.href = `${API_BASE_URL}/auth/line?type=PASSENGER`} className="w-full bg-[#06C755] hover:bg-[#00B900] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
                            <span className="text-xl">💬</span> เข้าสู่ระบบด้วย LINE
                        </button>
                        <button onClick={() => window.location.href = `${API_BASE_URL}/auth/google?type=PASSENGER`} className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
                            <span className="text-xl">G</span> เข้าสู่ระบบด้วย Google
                        </button>
                    </div>
                </div>
            );
        }

        if (authStep === 'REGISTER') {
            return (
                <div className="flex flex-col h-full bg-white font-sans p-6">
                    <button onClick={() => { setAuthStep('LOGIN'); setAuthError(''); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-6 hover:bg-slate-200 transition-colors">←</button>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">ลงทะเบียนใหม่</h2>
                    <p className="text-slate-500 mb-8">สร้างบัญชีผู้ใช้งานเพื่อเริ่มเรียกรถ</p>

                    {authError && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
                            ⚠️ {authError}
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 ml-1">ชื่อเล่น / ชื่อที่ใช้เรียก</span>
                            <input
                                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-lg font-bold text-slate-800 outline-none focus:border-mywin-blue mt-1"
                                placeholder="เช่น น้องวิน"
                                value={registerForm.name}
                                onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                            />
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 ml-1">เบอร์โทรศัพท์</span>
                            <input
                                type="tel"
                                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-xl font-bold text-slate-800 outline-none focus:border-mywin-blue mt-1"
                                placeholder="08x-xxx-xxxx"
                                value={registerForm.phone}
                                onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })}
                            />
                        </label>
                        <button
                            onClick={() => requestOtp(true)}
                            disabled={!registerForm.name || !registerForm.phone || isLoading}
                            className="w-full bg-mywin-green text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4 hover:bg-emerald-600 transition-colors"
                        >
                            {isLoading ? 'กำลังส่ง OTP...' : 'รับรหัส OTP'}
                        </button>
                    </div>
                </div>
            );
        }

        if (authStep === 'OTP') {
            const displayPhone = isRegistering ? registerForm.phone : phoneNumber;
            return (
                <div className="flex flex-col h-full bg-white font-sans p-6 justify-center">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">ยืนยัน OTP</h2>
                        <p className="text-slate-500 text-sm">รหัสส่งไปที่ {displayPhone}</p>
                    </div>

                    {authError && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm text-center">
                            ⚠️ {authError}
                        </div>
                    )}

                    <div className="flex gap-2 justify-center mb-8">
                        {otpCode.map((digit, i) => (
                            <input
                                key={i}
                                id={`otp-${i}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleOtpChange(i, e.target.value)}
                                className="w-12 h-14 bg-slate-50 rounded-xl border-2 border-slate-200 flex items-center justify-center text-2xl font-bold text-center outline-none focus:border-mywin-blue transition-colors"
                            />
                        ))}
                    </div>

                    <button
                        onClick={verifyAndLogin}
                        disabled={isLoading || otpCode.join('').length < 4}
                        className="w-full bg-mywin-blue text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส'}
                    </button>

                    <div className="text-center mt-4">
                        {otpCountdown > 0 ? (
                            <span className="text-slate-400 text-sm">ส่งรหัสใหม่ได้ใน {otpCountdown} วินาที</span>
                        ) : (
                            <button
                                onClick={() => requestOtp(isRegistering)}
                                className="text-mywin-blue text-sm font-bold hover:underline"
                            >
                                ส่งรหัสใหม่
                            </button>
                        )}
                    </div>

                    <button onClick={() => { setAuthStep(isRegistering ? 'REGISTER' : 'LOGIN'); setAuthError(''); }} className="w-full text-slate-400 text-sm mt-4">
                        ← แก้ไขเบอร์โทร
                    </button>
                </div>
            );
        }

        if (authStep === 'LOGIN_PIN') {
            const handlePinLogin = async () => {
                const pin = pinCode.join('');
                if (pin.length < 6) return;
                setIsLoading(true);
                try {
                    const res = await fetch(`${API_BASE_URL}/auth/login-pin`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phoneNumber, pin, role: 'PASSENGER' })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'รหัส PIN ไม่ถูกต้อง');

                    // Token is set in cookies

                    setUserProfile(prev => ({ ...prev, name: data.user.name, phone: data.user.phone }));
                    // Note: Balance fetch needed if not included in login response (it was in standard login)

                    setAuthStep('APP_SHELL');
                } catch (err: any) {
                    setAuthError(err.message);
                    setPinCode(['', '', '', '', '', '']); // Reset
                } finally {
                    setIsLoading(false);
                }
            };

            // Auto-submit
            useEffect(() => { if (pinCode.join('').length === 6) handlePinLogin(); }, [pinCode]);

            return (
                <div className="flex flex-col h-full bg-white font-sans p-6 justify-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">ใส่รหัส PIN</h2>
                    {authError && <div className="text-red-500 mb-4 text-sm text-center">{authError}</div>}

                    <div className="flex gap-2 justify-center mb-8">
                        {pinCode.map((digit, i) => (
                            <input
                                key={i}
                                id={`pin-${i}`}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (isNaN(Number(val))) return;
                                    const newPin = [...pinCode];
                                    newPin[i] = val.substring(val.length - 1);
                                    setPinCode(newPin);
                                    if (val && i < 5) document.getElementById(`pin-${i + 1}`)?.focus();
                                }}
                                className="w-12 h-12 bg-slate-50 rounded-full border-2 border-slate-200 text-2xl font-bold text-center outline-none focus:border-mywin-blue transition-colors text-slate-800"
                            />
                        ))}
                    </div>

                    <button onClick={() => { setAuthStep('LOGIN'); setPhoneNumber(''); setPinCode(['', '', '', '', '', '']); }} className="text-slate-400 text-sm mt-8 text-center w-full">
                        ลืมรหัส PIN / เปลี่ยนบัญชี
                    </button>
                </div>
            );
        }

        if (authStep === 'SETUP_PIN') {
            const handleSetPin = async () => {
                const pin = pinCode.join('');
                if (pin.length < 6) return;
                setIsLoading(true);
                try {
                    const userId = useAuthStore.getState().user?.id || 'P-USER';
                    if (!userId) throw new Error("User ID not found");

                    const res = await fetch(`${API_BASE_URL}/auth/set-pin`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, pin, role: 'PASSENGER' })
                    });
                    if (!res.ok) throw new Error('ตั้งค่า PIN ไม่สำเร็จ');

                    alert('ตั้งรหัส PIN สำเร็จ!');
                    // localStorage.setItem('mywin_pin_set', 'true'); // Flag
                    setAuthStep('APP_SHELL');
                } catch (err: any) {
                    setAuthError(err.message);
                } finally {
                    setIsLoading(false);
                }
            };

            return (
                <div className="flex flex-col h-full bg-white font-sans p-6 justify-center text-center">
                    <div className="mb-8 p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center text-4xl">🔐</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">ตั้งรหัส PIN</h2>
                    <p className="text-slate-500 mb-8 text-sm">เพื่อการเข้าใช้งานที่รวดเร็วและปลอดภัย</p>

                    <div className="flex gap-2 justify-center mb-8">
                        {pinCode.map((digit, i) => (
                            <input
                                key={i}
                                id={`setpin-${i}`}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (isNaN(Number(val))) return;
                                    const newPin = [...pinCode];
                                    newPin[i] = val.substring(val.length - 1);
                                    setPinCode(newPin);
                                    if (val && i < 5) document.getElementById(`setpin-${i + 1}`)?.focus();
                                }}
                                className="w-12 h-14 bg-slate-50 rounded-xl border-2 border-slate-200 text-2xl font-bold text-center outline-none focus:border-mywin-blue transition-colors text-slate-800"
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleSetPin}
                        disabled={pinCode.join('').length < 6 || isLoading}
                        className="w-full bg-mywin-blue hover:bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50"
                    >
                        {isLoading ? 'กำลังบันทึก...' : 'ยืนยันรหัส PIN'}
                    </button>
                    <button onClick={() => setAuthStep('APP_SHELL')} className="mt-4 text-slate-400 text-sm">ข้ามไปก่อน</button>
                </div>
            );
        }

        return <div onClick={() => setAuthStep('LOGIN')}>Back</div>;
    };

    const TopupModal = () => {
        const [currentStep, setCurrentStep] = useState<'INPUT' | 'QR'>('INPUT');
        const [qrUrl, setQrUrl] = useState('');

        const handleNextStep = () => {
            if (selectedPayment.name === 'PromptPay') {
                // Generate QR Code URL
                // Format: https://promptpay.io/{id}/{amount}
                const cleanPhone = selectedPayment.accNumber.replace(/-/g, '');
                setQrUrl(`https://promptpay.io/${cleanPhone}/${topupAmount}`);
                setCurrentStep('QR');
            } else {
                // For other payments, just proceed (or add mock bank steps)
                handleConfirmTopup();
            }
        };

        return (
            <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800">
                            {currentStep === 'INPUT' ? 'เติมเงิน (Top Up)' : 'สแกนจ่าย (Scan to Pay)'}
                        </h3>
                        <button onClick={() => setShowTopupModal(false)} className="w-8 h-8 bg-slate-100 rounded-full text-slate-500">✕</button>
                    </div>

                    {currentStep === 'INPUT' ? (
                        <>
                            {/* Amount Input */}
                            <div className="mb-6">
                                <label className="text-xs font-bold text-slate-400 mb-2 block">ระบุจำนวนเงิน (บาท)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={topupAmount}
                                        onChange={e => setTopupAmount(Number(e.target.value))}
                                        className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-xl text-3xl font-bold text-slate-800 outline-none focus:border-mywin-blue text-center"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    {/* Active Promo Pill */}
                                    {topupAmount && Number(topupAmount) >= 50 && (
                                        <div className="absolute -top-3 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-bounce">
                                            🔥 ได้แถม +{(MOCK_PROMOS.find(p => !p.isRide && Number(topupAmount) >= p.minTopup)?.bonus)} แต้ม
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 mt-3">
                                    {[20, 50, 100, 200].map(amt => (
                                        <button key={amt} onClick={() => setTopupAmount(amt)} className="flex-1 py-2 bg-slate-100 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 border border-slate-200">
                                            {amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Methods (From Admin) */}
                            <div className="mb-6">
                                <label className="text-xs font-bold text-slate-400 mb-2 block">ชำระผ่าน</label>
                                <div className="space-y-2">
                                    {MOCK_PAYMENT_METHODS.map(pm => (
                                        <button
                                            key={pm.id}
                                            onClick={() => setSelectedPayment(pm)}
                                            className={`w-full flex items-center p-3 rounded-xl border-2 transition-all ${selectedPayment.id === pm.id ? 'border-mywin-blue bg-blue-50' : 'border-slate-100 bg-white'}`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl mr-3">{pm.icon}</div>
                                            <div className="text-left flex-1">
                                                <div className="font-bold text-sm text-slate-800">{pm.name}</div>
                                                <div className="text-[10px] text-slate-500">{pm.accNumber} • {pm.accName}</div>
                                            </div>
                                            {selectedPayment.id === pm.id && <div className="text-mywin-blue font-bold">✓</div>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleNextStep}
                                disabled={!topupAmount}
                                className="w-full bg-mywin-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
                            >
                                ดำเนินการต่อ
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-inner mb-4">
                                <img src={qrUrl} alt="PromptPay QR" className="w-48 h-48 sm:w-56 sm:h-56 object-contain" />
                            </div>

                            <div className="w-full bg-blue-50 border border-blue-100 p-3 rounded-xl mb-6">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-500">จำนวนเงิน</span>
                                    <span className="text-lg font-bold text-slate-800">{Number(topupAmount).toFixed(2)} บาท</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">ผู้รับเงิน</span>
                                    <span className="text-sm font-bold text-slate-800">{selectedPayment.accName}</span>
                                </div>
                            </div>

                            <div className="text-xs text-slate-400 mb-4 text-center">
                                *กรุณาตรวจสอบชื่อผู้รับเงินก่อนโอนทุกครั้ง
                            </div>

                            <button
                                onClick={handleConfirmTopup}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200"
                            >
                                โอนเงินเรียบร้อยแล้ว
                            </button>
                            <button
                                onClick={() => setCurrentStep('INPUT')}
                                className="mt-3 text-slate-400 text-sm font-bold"
                            >
                                ← ย้อนกลับ
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const RatingModal = () => {
        if (!pendingRating) return null;
        return (
            <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-orange-500"></div>

                    <div className="w-24 h-24 mx-auto mb-4 relative">
                        <div className="w-full h-full rounded-full border-4 border-yellow-400 p-1 bg-white">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Driver${pendingRating.driverId}`} className="w-full h-full rounded-full" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-lg shadow">
                            1กข-9999
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-2">ขอบคุณที่ใช้บริการ!</h3>
                    <p className="text-slate-500 text-sm mb-6">ให้คะแนนพี่วินเพื่อเป็นกำลังใจ</p>

                    <div className="flex justify-center gap-3 mb-8">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRatingScore(star)}
                                className="text-4xl focus:outline-none transform transition-transform hover:scale-110 active:scale-95"
                            >
                                {star <= ratingScore ? '⭐' : '☆'}
                            </button>
                        ))}
                    </div>

                    {ratingScore > 0 && (
                        <div className="animate-in slide-in-from-bottom-2 fade-in">
                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                {['ขับรถดี', 'พูดจาสุภาพ', 'รถสะอาด', 'รวดเร็ว'].map(tag => (
                                    <button key={tag} className="border border-slate-200 px-3 py-1 rounded-full text-xs text-slate-500 hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700 transition-colors">
                                        {tag}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => submitRating(false)} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-slate-800 transition-colors">
                                ส่งคะแนน
                            </button>
                        </div>
                    )}

                    {ratingScore === 0 && (
                        <button onClick={() => submitRating(true)} className="text-slate-400 text-sm font-bold mt-2 hover:text-slate-600 transition-colors">
                            ข้ามไปก่อน (Skip)
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const ActivityDetailModal = () => {
        if (!selectedActivity) return null;
        return (
            <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 relative">
                    <button onClick={() => setSelectedActivity(null)} className="absolute top-4 right-4 w-8 h-8 bg-slate-100 rounded-full text-slate-500">✕</button>

                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl">🛵</div>
                        <h3 className="text-lg font-bold text-slate-800">รายละเอียดการเดินทาง</h3>
                        <p className="text-xs text-slate-400">{selectedActivity.date} • {selectedActivity.time}</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                <div className="w-0.5 h-8 bg-slate-200 my-1"></div>
                                <div className="w-3 h-3 bg-mywin-blue rounded-full"></div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">จุดรับ</div>
                                    <div className="text-sm font-bold text-slate-800">{selectedActivity.details?.pickup || 'ตำแหน่งระบุ'}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">จุดส่ง</div>
                                    <div className="text-sm font-bold text-slate-800">{selectedActivity.details?.destination || 'วินมอเตอร์ไซค์'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 overflow-hidden">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Driver${selectedActivity.id}`} className="w-full h-full" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-700">{selectedActivity.details?.driverName || 'พี่วิน'}</div>
                                        <div className="text-[10px] text-slate-400">{selectedActivity.details?.plate || 'รถจักรยานยนต์'}</div>
                                    </div>
                                </div>
                                {/* Call Button for Passenger */}
                                <button
                                    onClick={handlePrivacyCall}
                                    className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-emerald-600 active:scale-95 transition-transform"
                                    title="โทรหาคนขับ"
                                >
                                    📞
                                </button>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-200 pt-2 mt-2">
                                <span className="text-xs text-slate-500">ค่าบริการ</span>
                                <span className={`font-bold ${selectedActivity.amount === 0 ? 'text-purple-600' : 'text-slate-800'}`}>
                                    {selectedActivity.amount === 0 ? 'ฟรี (0 แต้ม)' : `${Math.abs(selectedActivity.amount)} แต้ม`}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => {
                        setSelectedActivity(null);
                        // setStationId('WIN-CENTRAL-01'); // No need to mock force set, auto-select handles it
                        handleRequestRide();
                    }} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg">
                        เรียกอีกครั้ง (Re-book)
                    </button>
                </div>
            </div>
        );
    }

    const renderActivity = () => {
        // Filter only Rides
        const rideHistory = history.filter(h => h.type === 'RIDE');
        const activeRide = isSearching ? { status: 'SEARCHING' } : null; // Simple check for active state

        return (
            <div className="flex-1 bg-slate-50 flex flex-col font-sans overflow-hidden">
                <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
                    <h2 className="text-xl font-bold text-slate-800">กิจกรรมของฉัน</h2>
                    <p className="text-xs text-slate-400">ประวัติการเดินทางและสถานะปัจจุบัน</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Current Activity Section */}
                    {activeRide && (
                        <section>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">กำลังดำเนินการ</h3>
                            <div className="bg-white p-4 rounded-xl border border-emerald-500 shadow-md shadow-emerald-500/10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-bl-lg">
                                    กำลังค้นหา...
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-2xl animate-pulse">
                                        📡
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">กำลังเรียกวิน</div>
                                        <div className="text-xs text-slate-500">กรุณารอสักครู่ ระบบกำลังจับคู่</div>
                                    </div>
                                </div>
                                <button onClick={() => setIsSearching(false)} className="mt-4 w-full py-2 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold">
                                    ยกเลิก
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Active Driver Section - With Real Map */}
                    {activeDriver && (
                        <section className="mb-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">กำลังเดินทางมารับ</h3>

                            {/* Live Map View */}
                            <div className="h-64 rounded-2xl overflow-hidden mb-4 shadow-lg border border-emerald-500">
                                <LiveMapView
                                    myLocation={myLocation}
                                    counterpartLocation={{
                                        // Mock driver location moving towards passenger
                                        lat: (myLocation?.lat || MAP_CENTER.lat) + 0.002,
                                        lng: (myLocation?.lng || MAP_CENTER.lng) + 0.001
                                    }}
                                    destinationLocation={{
                                        lat: (myLocation?.lat || MAP_CENTER.lat) + 0.01,
                                        lng: (myLocation?.lng || MAP_CENTER.lng) + 0.005
                                    }}
                                    userType="PASSENGER"
                                    showRoute={true}
                                />
                            </div>

                            {/* Driver Info Card */}
                            <div className="bg-white p-4 rounded-xl border border-emerald-500 shadow-lg relative">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full border-2 border-emerald-500 overflow-hidden">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Driver${activeDriver.id}`} className="w-full h-full" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-lg text-slate-800">{activeDriver.name}</div>
                                        <div className="text-sm text-slate-500">ทะเบียน: {activeDriver.plate}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-emerald-500 font-bold text-sm flex items-center gap-1">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                            กำลังมา
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={handlePrivacyCall} className="bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                                        📞 โทร
                                    </button>
                                    <button onClick={handleChat} className="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                                        💬 แชท
                                    </button>
                                    <button onClick={handleCancelActiveRide} className="bg-red-100 hover:bg-red-200 text-red-600 py-3 rounded-xl font-bold text-sm">
                                        ยกเลิก
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Past Activity Section */}
                    <section>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">ประวัติการเดินทาง</h3>
                        {rideHistory.length === 0 ? (
                            <div className="text-center py-10 opacity-50">
                                <div className="text-4xl mb-2">🛵</div>
                                <p className="text-sm text-slate-500">ยังไม่มีการเดินทาง</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rideHistory.map((ride) => (
                                    <div
                                        key={ride.id}
                                        onClick={() => setSelectedActivity(ride)}
                                        className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-98 transition-transform cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${ride.amount === 0 ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                                                🛵
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-800">{ride.details?.destination || 'วินมอเตอร์ไซค์'}</div>
                                                <div className="text-[10px] text-slate-400">{ride.date} • {ride.time}</div>
                                                <div className="text-[10px] text-emerald-500 font-bold mt-0.5">เสร็จสิ้น</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-bold text-sm ${ride.amount === 0 ? 'text-purple-600' : 'text-slate-900'}`}>
                                                {ride.amount === 0 ? 'Free' : `${Math.abs(ride.amount)}`}
                                            </div>
                                            {ride.amount !== 0 && <div className="text-[10px] text-slate-400">แต้ม</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        );
    };

    const renderHome = () => {
        const hasSufficientBalance = balance >= RIDE_POINT_COST;
        const canRide = (hasSufficientBalance || isFreeRideEligible) && !isOutOfZone;

        return (
            <div className="flex-1 flex flex-col overflow-y-auto pb-24 bg-slate-50">
                {/* Header Wallet Card */}
                <div className="bg-white p-6 pb-8 rounded-b-[2.5rem] shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <div className="text-sm text-slate-500 font-medium">ยอดเงินคงเหลือ</div>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-4xl font-extrabold ${hasSufficientBalance ? 'text-slate-800' : 'text-red-500'}`}>{balance}</span>
                                <span className="text-sm font-bold text-slate-400">แต้ม</span>
                            </div>

                            {/* Free Ride Status Pill */}
                            {isFreeRideEligible && (
                                <div className="mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1 shadow-md animate-pulse">
                                    <span>🎁</span> สมาชิกใหม่: นั่งฟรีเหลือ {freeRidesLeft} ครั้ง
                                </div>
                            )}
                        </div>
                        <div onClick={() => setActiveTab('PROFILE')} className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden cursor-pointer active:scale-95 transition-transform">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.avatarSeed}`} className="w-full h-full" />
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <button
                            onClick={() => setShowTopupModal(true)}
                            className="bg-mywin-blue text-white p-3 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            <span>💳</span> <span className="font-bold text-sm">เติมเงิน</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('HISTORY')}
                            className="bg-white text-slate-700 border border-slate-200 p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50"
                        >
                            <span>📋</span> <span className="font-bold text-sm">ประวัติ</span>
                        </button>
                    </div>
                </div>

                {/* Booking Section */}
                <div className="px-6 mt-6">
                    <h3 className="font-bold text-slate-800 text-lg mb-3">เรียกวินด่วน 🛵</h3>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">📍</div>
                            <div className="flex-1">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">จุดรับ (ตำแหน่งปัจจุบัน)</div>
                                <div className="text-sm font-bold text-slate-800 truncate">{myLocation ? `Lat: ${myLocation.lat.toFixed(4)}, Lng: ${myLocation.lng.toFixed(4)}` : 'กำลังระบุ...'}</div>
                            </div>
                        </div>

                        {/* --- FAVORITE PLACES (NEW) --- */}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-slate-400 mb-2 block ml-1">สถานที่โปรด</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {favorites.map(fav => (
                                    <button
                                        key={fav.type}
                                        onClick={() => handleSelectFavorite(fav.type)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm transition-all whitespace-nowrap
                                            ${fav.location ? 'bg-white border-slate-200 text-slate-700 hover:border-mywin-blue hover:text-mywin-blue' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'}`}
                                    >
                                        <span className="text-lg">{fav.type === 'HOME' ? '🏠' : '🏢'}</span>
                                        <span className="text-sm font-bold">{fav.name}</span>
                                        {fav.location ? (
                                            <span
                                                onClick={(e) => handleClearFavorite(e, fav.type)}
                                                className="text-slate-300 hover:text-red-500 ml-1 text-xs px-1"
                                            >
                                                ✕
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-slate-200 px-1.5 rounded text-slate-500 ml-1">+ ตั้งค่า</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* --- ZONE SELECTOR (UPDATED) --- */}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-slate-400 mb-2 block ml-1">เลือกวินในพื้นที่ให้บริการ</label>

                            {availableStations.length > 0 ? (
                                <select
                                    value={stationId}
                                    onChange={e => setStationId(e.target.value)}
                                    className="w-full bg-white border border-slate-200 p-3 rounded-xl text-slate-800 font-bold outline-none focus:border-mywin-blue appearance-none"
                                >
                                    {availableStations.map((s, idx) => (
                                        <option key={s.id} value={s.id}>
                                            {idx === 0 ? '✅ ' : ''}{s.name} ({s.distance.toFixed(1)} กม.)
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="p-3 bg-slate-100 rounded-xl text-center text-slate-500 text-sm">
                                    ไม่พบวินในบริเวณใกล้เคียง
                                </div>
                            )}

                            {/* Zone Warning */}
                            {isOutOfZone && (
                                <div className="mt-2 text-[10px] text-red-500 flex items-center gap-1 font-bold">
                                    <span>⚠️</span> คุณอยู่นอกเขตพื้นที่ให้บริการ (เกิน {SERVICE_RADIUS_KM} กม.)
                                </div>
                            )}
                        </div>

                        {/* Low Balance Warning (Only if NO Free Ride left AND No Balance) */}
                        {!hasSufficientBalance && !isFreeRideEligible && !isOutOfZone && (
                            <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 animate-pulse">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-500 font-bold">!</div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-red-500">แต้มไม่เพียงพอ</div>
                                    <div className="text-[10px] text-red-400">กรุณาเติมเงินเพื่อเรียกวิน (ขั้นต่ำ {RIDE_POINT_COST} แต้ม)</div>
                                </div>
                                <button onClick={() => setShowTopupModal(true)} className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                                    เติมเงิน
                                </button>
                            </div>
                        )}

                        <button
                            onClick={canRide ? handleRequestRide : undefined}
                            disabled={!canRide}
                            className={`w-full font-bold py-4 rounded-xl shadow-lg text-lg flex items-center justify-center gap-2 transition-all ${canRide
                                ? (isFreeRideEligible ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-200 active:scale-95' : 'bg-mywin-green text-white shadow-emerald-200 active:scale-95')
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                }`}
                        >
                            {canRide ? (
                                <>
                                    <span>{isFreeRideEligible ? 'ใช้สิทธิ์นั่งฟรี' : 'เรียกวินทันที'}</span>
                                    {isFreeRideEligible ? (
                                        <span className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/30">0 แต้ม</span>
                                    ) : (
                                        <span className="text-sm font-normal opacity-80 bg-black/10 px-2 rounded-full">-{RIDE_POINT_COST} แต้ม</span>
                                    )}
                                </>
                            ) : (isOutOfZone ? 'อยู่นอกพื้นที่' : 'แต้มไม่พอเรียกวิน')}
                        </button>
                        <div className="text-center mt-2 text-[10px] text-slate-400">
                            {isFreeRideEligible
                                ? `โปรโมชัน: คุณเหลือสิทธิ์นั่งฟรีอีก ${freeRidesLeft} ครั้ง`
                                : `ค่าบริการระบบ: ${RIDE_POINT_COST} แต้ม/ครั้ง (หักเมื่อคนขับรับงาน)`
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderHistory = () => {
        // Group Transactions by Month
        const grouped = history.reduce((acc, curr) => {
            if (!acc[curr.month]) acc[curr.month] = [];
            acc[curr.month].push(curr);
            return acc;
        }, {} as Record<string, typeof history>);

        return (
            <div className="flex-1 bg-slate-50 flex flex-col font-sans overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
                    <button onClick={() => setActiveTab('WALLET')} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        ←
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">ประวัติการทำรายการ</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {Object.keys(grouped).length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <div className="text-4xl mb-2">📜</div>
                            <div>ยังไม่มีรายการ</div>
                            <div className="text-xs">เริ่มเรียกรถครั้งแรกเพื่อรับสิทธิ์นั่งฟรี!</div>
                        </div>
                    )}
                    {Object.keys(grouped).map(month => (
                        <div key={month} className="mb-6">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 sticky top-0 bg-slate-50 py-2 z-10">{month}</h3>
                            <div className="space-y-3">
                                {grouped[month].map(txn => (
                                    <div key={txn.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${txn.type === 'TOPUP' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                                                }`}>
                                                {txn.type === 'TOPUP' ? '📥' : '🛵'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-800">{txn.title}</div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                                    <span>{txn.date}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span>{txn.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`font-mono font-bold text-lg ${txn.amount > 0 ? 'text-emerald-600' : txn.amount === 0 ? 'text-purple-600' : 'text-slate-900'}`}>
                                            {txn.amount > 0 ? '+' : ''}{txn.amount}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderWallet = () => (
        <div className="flex-1 bg-slate-50 flex flex-col font-sans overflow-hidden">
            <div className="bg-slate-900 text-white p-6 pt-12 rounded-b-[2rem] shadow-xl">
                <h2 className="text-xl font-bold mb-6 text-center">กระเป๋าเงินของฉัน</h2>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">MyWin Points</div>
                        <div className="text-4xl font-mono font-bold text-emerald-400 mb-6">{balance.toFixed(2)}</div>

                        {/* Quota Display */}
                        <div className="mb-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center">
                            <div className="text-xs text-slate-300">สิทธิ์นั่งฟรีคงเหลือ</div>
                            <div className="flex gap-1">
                                {[...Array(MAX_FREE_RIDES)].map((_, i) => (
                                    <div key={i} className={`w-3 h-3 rounded-full ${i < freeRidesLeft ? 'bg-purple-500 shadow-lg shadow-purple-500/50' : 'bg-slate-700'}`}></div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowTopupModal(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg font-bold text-sm shadow-lg shadow-emerald-900/50">
                                + เติมเงิน
                            </button>
                            <button onClick={() => setActiveTab('HISTORY')} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-bold text-sm">
                                ประวัติ
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">รายการล่าสุด</h3>
                    <button onClick={() => setActiveTab('HISTORY')} className="text-xs text-mywin-blue font-bold">ดูทั้งหมด</button>
                </div>
                <div className="space-y-4">
                    {history.length === 0 && <div className="text-center text-slate-400 py-4 text-sm">เริ่มต้นใช้งานวันนี้เพื่อรับสิทธิ์นั่งฟรี</div>}
                    {history.slice(0, 3).map(txn => (
                        <div key={txn.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${txn.type === 'TOPUP' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {txn.type === 'TOPUP' ? '📥' : '🛵'}
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-slate-800">{txn.title}</div>
                                    <div className="text-xs text-slate-400">{txn.date}</div>
                                </div>
                            </div>
                            <div className={`font-bold font-mono ${txn.amount > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                {txn.amount > 0 ? '+' : ''}{txn.amount}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderProfile = () => (
        <div className="flex-1 bg-slate-50 flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <div className="bg-white p-6 pb-8 rounded-b-[2rem] shadow-sm relative z-10">
                <button onClick={() => setActiveTab('HOME')} className="absolute top-6 left-6 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">←</button>
                <div className="flex flex-col items-center">
                    {/* Avatar removed from header, moved to edit section below for better UX */}
                    <h2 className="text-xl font-bold text-slate-800 mt-4">{userProfile.name}</h2>
                    <p className="text-slate-500 text-sm">{userProfile.phone}</p>

                    <div className="flex gap-4 mt-6 w-full max-w-xs">
                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                            <div className="text-lg font-bold text-slate-800">5.0</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Rating</div>
                        </div>
                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                            <div className="text-lg font-bold text-slate-800">{history.filter(h => h.type === 'RIDE').length}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Trips</div>
                        </div>
                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                            <div className="text-lg font-bold text-slate-800">New</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Member</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Account Settings */}
                <section>
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative group cursor-pointer" onClick={() => document.getElementById('p-avatar-upload')?.click()}>
                            <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden relative">
                                {/* Use stored avatar URL if available, else Dicebear */}
                                <img
                                    src={(userProfile as any).avatarUrl ? `${API_BASE_URL}${(userProfile as any).avatarUrl}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.avatarSeed}`}
                                    className="w-full h-full object-cover bg-white"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                                    แก้ไข
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 bg-slate-800 text-white p-1 rounded-full text-xs shadow-md border-2 border-white group-hover:bg-mywin-blue transition-colors">
                                📷
                            </div>
                            <input
                                type="file"
                                id="p-avatar-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    const formData = new FormData();
                                    formData.append('file', file);

                                    try {
                                        // Let's assume we use same endpoint but maybe update user profile in DB too?
                                        // Ideally split: 1. Upload -> URL. 2. Update Profile -> URL.
                                        // For simplicity, we just Upload and assume local state update for now.
                                        // Real app would PUT /passenger/profile { avatar: url }
                                        const res = await fetch(`${API_BASE_URL}/upload/profile`, { method: 'POST', body: formData });
                                        const data = await res.json();
                                        if (data.url) {
                                            setUserProfile(prev => ({ ...prev, avatarUrl: data.url } as any));
                                            // TODO: Persist to backend
                                            setToastMessage('อัปโหลดรูปโปรไฟล์แล้ว');
                                            setTimeout(() => setToastMessage(null), 2000);
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert('Upload failed');
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">ข้อมูลส่วนตัว</h3>
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        {isEditingProfile ? (
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">ชื่อ-นามสกุล</label>
                                    <input
                                        value={tempProfile.name}
                                        onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:border-mywin-blue outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">อีเมล</label>
                                    <input
                                        value={tempProfile.email}
                                        onChange={e => setTempProfile({ ...tempProfile, email: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:border-mywin-blue outline-none"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => { setIsEditingProfile(false); setTempProfile(userProfile); }} className="flex-1 py-2 rounded-lg text-sm text-slate-500 bg-slate-100 font-bold">ยกเลิก</button>
                                    <button onClick={handleSaveProfile} className="flex-1 py-2 rounded-lg text-sm text-white font-bold bg-mywin-green shadow-lg shadow-emerald-200">บันทึก</button>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setTempProfile(userProfile); setIsEditingProfile(true); }}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">👤</span>
                                        <div>
                                            <div className="text-sm font-bold text-slate-700">แก้ไขข้อมูลส่วนตัว</div>
                                            <div className="text-xs text-slate-400">ชื่อ, อีเมล, รูปโปรไฟล์</div>
                                        </div>
                                    </div>
                                    <div className="text-slate-300">→</div>
                                </div>
                                <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">📍</span>
                                        <div>
                                            <div className="text-sm font-bold text-slate-700">สถานที่โปรด</div>
                                            <div className="text-xs text-slate-400">บ้าน, ที่ทำงาน</div>
                                        </div>
                                    </div>
                                    <div className="text-slate-300">→</div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Preferences */}
                <section>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">การตั้งค่า</h3>
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <span className="text-lg">🔔</span>
                                <div className="text-sm font-bold text-slate-700">การแจ้งเตือน</div>
                            </div>
                            <div className="relative inline-block w-10 h-5 align-middle select-none transition duration-200 ease-in">
                                <div className="absolute block w-full h-full bg-mywin-green rounded-full shadow-inner"></div>
                                <div className="absolute block w-3 h-3 bg-white rounded-full shadow inset-y-1 right-1 top-1"></div>
                            </div>
                        </div>
                        <div className="border-t border-slate-50 p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <span className="text-lg">🌍</span>
                                <div className="text-sm font-bold text-slate-700">ภาษา (Language)</div>
                            </div>
                            <div className="text-xs font-bold text-slate-400">ไทย</div>
                        </div>
                    </div>
                </section>

                <button
                    onClick={() => setAuthStep('LOGIN')}
                    className="w-full bg-red-50 text-red-500 py-3 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                >
                    ออกจากระบบ
                </button>

                <div className="text-center text-[10px] text-slate-300 pb-4">
                    Version 1.0.2 (Build 20240120)
                </div>
            </div>
        </div>
    );

    // --- MAIN RENDER ---

    if (authStep !== 'APP_SHELL') return renderAuth();

    if (isSearching) {
        return (
            <div className="h-full bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                    <div className="absolute inset-0 bg-mywin-green/20 rounded-full animate-ping"></div>
                    <div className="relative z-10 w-20 h-20 bg-mywin-green rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50 text-4xl">🛵</div>
                </div>
                <h2 className="text-xl font-bold mb-2">กำลังเรียกรถ...</h2>
                <p className="text-slate-400 text-sm mb-8">ระบบกำลังแจ้งเตือนพี่วิน</p>
                <button onClick={() => setIsSearching(false)} className="bg-slate-800 px-6 py-3 rounded-xl font-bold border border-slate-700">ยกเลิก</button>
            </div>
        );
    }

    // Active Ride Render (New Overlay)
    if (activeDriver) {
        return (
            <div className="h-full bg-slate-900 text-white flex flex-col font-sans relative overflow-hidden">
                <div className="flex-1 bg-slate-800 relative">
                    {/* Fake Map Background */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-6xl animate-pulse">🛵</div>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.5)] border-t border-slate-800">
                    <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6"></div>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-slate-800 rounded-full border-2 border-emerald-500 p-1 relative">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Driver${activeDriver.id}`} className="w-full h-full rounded-full" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                        </div>
                        <div>
                            <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">คนขับกำลังมารับ</div>
                            <h2 className="text-xl font-bold text-white">{activeDriver.name}</h2>
                            <div className="text-slate-400 text-sm">{activeDriver.plate} • {activeDriver.phone}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={handlePrivacyCall} className="bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">
                            <span>📞</span> โทร
                        </button>
                        <button onClick={handleChat} className="bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                            <span>💬</span> แชท
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <button onClick={handleCancelActiveRide} className="text-slate-500 text-sm hover:text-red-400 underline">ยกเลิกการเดินทาง</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-hidden">
            <InstallPwaPrompt />
            {showTopupModal && <TopupModal />}
            {selectedActivity && <ActivityDetailModal />}
            {pendingRating && <RatingModal />}

            {/* Toast Notification */}
            {toastMessage && (
                <div className="absolute top-4 left-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in">
                    <div className="bg-slate-900/90 text-white p-4 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-sm border border-slate-700">
                        <div className="text-2xl">
                            {toastMessage.includes('คืน') ? '🔄' : '✅'}
                        </div>
                        <div className="font-bold text-sm">{toastMessage}</div>
                    </div>
                </div>
            )}

            {/* Dynamic Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {activeTab === 'HOME' && renderHome()}
                {activeTab === 'WALLET' && renderWallet()}
                {activeTab === 'HISTORY' && renderHistory()}
                {activeTab === 'ACTIVITY' && renderActivity()}
                {activeTab === 'PROFILE' && renderProfile()}
            </div>

            {/* Bottom Navigation */}
            <div className="bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center shadow-[0_-5px_15px_rgba(0,0,0,0.02)] relative z-20 pb-6 sm:pb-2">
                <button onClick={() => setActiveTab('HOME')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'HOME' ? 'text-mywin-blue -translate-y-2' : 'text-slate-400'}`}>
                    <span className="text-2xl">🏠</span>
                    <span className="text-[10px] font-bold">หน้าแรก</span>
                </button>
                <button onClick={() => setActiveTab('WALLET')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'WALLET' || activeTab === 'HISTORY' ? 'text-mywin-blue -translate-y-2' : 'text-slate-400'}`}>
                    <span className="text-2xl">💳</span>
                    <span className="text-[10px] font-bold">กระเป๋า</span>
                </button>
                <div className="w-14 h-14 bg-mywin-green rounded-full -mt-8 border-4 border-slate-50 flex items-center justify-center shadow-lg text-2xl text-white cursor-pointer active:scale-95 transition-transform" onClick={handleRequestRide}>
                    🛵
                </div>
                <button onClick={() => setActiveTab('ACTIVITY')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'ACTIVITY' ? 'text-mywin-blue -translate-y-2' : 'text-slate-400'}`}>
                    <span className="text-2xl">🕒</span>
                    <span className="text-[10px] font-bold">กิจกรรม</span>
                </button>
                <button onClick={() => setActiveTab('PROFILE')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'PROFILE' ? 'text-mywin-blue -translate-y-2' : 'text-slate-400'}`}>
                    <span className="text-2xl">👤</span>
                    <span className="text-[10px] font-bold">ฉัน</span>
                </button>
            </div>

            {/* SOS Button - Only show when driver is active */}
            {activeDriver && (
                <SOSButton
                    userId={'passenger'}
                    userType="PASSENGER"
                    tripId={currentTripId}
                    currentLocation={myLocation}
                />
            )}

            {/* Chat Modal */}
            <ChatModal
                isOpen={showChatModal}
                onClose={() => setShowChatModal(false)}
                tripId={currentTripId}
                myId={'passenger'}
                myType="PASSENGER"
                counterpartName={activeDriver?.name || 'คนขับ'}
                counterpartAvatar={activeDriver ? `https://api.dicebear.com/7.x/avataaars/svg?seed=Driver${activeDriver.id}` : undefined}
            />
        </div>
    );
};

export default PassengerApp;