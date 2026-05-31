
import React, { useState, useEffect, useMemo } from 'react';
import { Driver, Rider, Location } from '../types';
import { APP_LOGO_PATH, APP_LOGO_DARK_PATH, MAP_CENTER, STATION_ZONES, FAIRNESS_WEIGHTS, API_BASE_URL } from '../constants';
import { socket } from '../services/socket';
import { watchPosition, clearWatch } from '../services/geolocation';
import { calculateFairnessScore } from '../services/scheduler';
import InstallPwaPrompt from './InstallPwaPrompt';
import dynamic from 'next/dynamic';
import ChatModal from './ChatModal';
import SOSButton from './SOSButton';

const LiveMapView = dynamic(() => import('./LiveMapView'), { ssr: false });

interface DriverAppProps {
    driverData: Driver | undefined;
    matchedRider: Rider | undefined;
}

type AuthStep = 'LOGIN' | 'LOGIN_PIN' | 'OTP' | 'REGISTER' | 'PENDING' | 'SETUP_PIN' | 'DASHBOARD';

const DriverApp: React.FC<DriverAppProps> = ({ driverData, matchedRider }) => {
    const [authStep, setAuthStep] = useState<AuthStep>('LOGIN');
    const [pinCode, setPinCode] = useState(['', '', '', '', '', '']); 
    const [showPerformance, setShowPerformance] = useState(false); // New: Performance View

    const [phoneNumber, setPhoneNumber] = useState('');

    // Registration State
    const [regForm, setRegForm] = useState({
        name: '',
        nickname: '',
        plate: '',
        inviteCode: '',
        winId: '',
        winName: '',
        profilePic: null as string | null,
        lineId: '',
        zones: [] as string[],
        shifts: [] as string[],
        serviceTypes: [] as string[],
        trainingCompleted: [] as string[]
    });
    const [regStep, setRegStep] = useState(1); // New: Registration Step (1: Identity, 2: Vehicle, 3: Verify)
    const [stationSearch, setStationSearch] = useState('');
    const [showStationList, setShowStationList] = useState(false);

    // OTP & Auth State
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [authError, setAuthError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [otpCountdown, setOtpCountdown] = useState(0);

    const [hasNewJob, setHasNewJob] = useState(false);
    const [gpsId, setGpsId] = useState<number | null>(null);

    // Notification State
    const [isLineConnected, setIsLineConnected] = useState(false);

    // Score Info Modal
    const [showScoreInfo, setShowScoreInfo] = useState(false);

    // QR Share Modal
    const [showQrModal, setShowQrModal] = useState(false);

    // Chat Modal
    const [showChatModal, setShowChatModal] = useState(false);
    const [currentTripId, setCurrentTripId] = useState<string>('');

    const isOnline = driverData?.status !== undefined;
    const isBusy = driverData?.status === 'MATCHED' || driverData?.status === 'EN_ROUTE';

    // --- LOGIC: STATION SEARCH & CREATE ---
    const filteredStations = useMemo(() => {
        if (!stationSearch) return [];
        return STATION_ZONES.filter(s => s.name.includes(stationSearch) || s.id.includes(stationSearch));
    }, [stationSearch]);

    const UI = {
        title: "GOZIPP",
        slogan: "รวดเร็ว ปลอดภัย รายได้มั่นคง"
    };

    const handleSelectStation = (station: { id: string, name: string }) => {
        setRegForm(prev => ({ ...prev, winId: station.id, winName: station.name }));
        setStationSearch(station.name);
        setShowStationList(false);
    };

    const handleCreateStation = () => {
        // Auto-generate ID for new station
        const newId = `WIN-NEW-${Math.floor(Math.random() * 10000)}`;
        const newName = stationSearch; // User typed name
        setRegForm(prev => ({ ...prev, winId: newId, winName: newName }));
        // In a real app, we would emit an event to create this station in the DB immediately
        alert(`สร้างวินใหม่: "${newName}"\nรหัสประจำวิน: ${newId}`);
        setShowStationList(false);
    };

    // --- PRIVACY CALL FEATURE ---
    const handlePrivacyCall = async () => {
        const driverId = useAuthStore.getState().user?.id || 'D-USER';
        const riderId = matchedRider?.id;
        if (!riderId) {
            alert('ไม่มีผู้โดยสาร active');
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/calls/initiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ driverId, riderId, type: 'PRIVACY_CALL' }),
            });
            if (!res.ok) throw new Error('ไม่สามารถเชื่อมต่อได้ในขณะนี้');
            alert('กำลังเชื่อมต่อสายสนทนา... รอสักครู่ครับ');
        } catch (err: any) {
            // Fallback: direct call (number not hidden)
            alert(`ไม่สามารถใช้ Privacy Call ได้: ${err.message}\n\nกรุณาติดต่อผ่านแชทในแอปแทนครับ`);
        }
    };

    const handleChat = () => {
        if (matchedRider) {
            setCurrentTripId(`trip-${driverData?.id}-${matchedRider.id}`);
            setShowChatModal(true);
        } else {
            alert("ไม่มีงานที่ active");
        }
    };

    // --- OTP Countdown Timer ---
    useEffect(() => {
        if (otpCountdown > 0) {
            const timer = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [otpCountdown]);

    // --- API FUNCTIONS ---
    const requestOtp = async () => {
        if (!phoneNumber || phoneNumber.length < 9) {
            setAuthError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');
            return;
        }

        setIsLoading(true);
        setAuthError('');

        try {
            // 1. Check if user already has a PIN
            const statusRes = await fetch(`${API_BASE_URL}/auth/check-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, role: 'DRIVER' })
            });
            const statusData = await statusRes.json();

            if (statusData.exists && statusData.hasPin) {
                // User has PIN -> Go to PIN Login
                setAuthStep('LOGIN_PIN');
                setIsLoading(false);
                return;
            }

            // 2. If No PIN (or New User), Request OTP
            const res = await fetch(`${API_BASE_URL}/driver/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'ส่ง OTP ไม่สำเร็จ');

            setOtpCode(['', '', '', '', '', '']);
            setOtpCountdown(60);
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

        setIsLoading(true);
        setAuthError('');

        try {
            const res = await fetch(`${API_BASE_URL}/driver/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, pin: otp })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');

            if (!data.isRegistered) {
                setPhoneNumber(phoneNumber);
                setAuthStep('REGISTER');
                return;
            }

            if (!data.isApproved) {
                if (data.onboardingStep < 5) {
                    setAuthStep('REGISTER');
                    setRegStep(data.onboardingStep + 1);
                } else {
                    setAuthStep('REGISTER');
                    setRegStep(6); // Review status
                }
                return;
            }

            // PIN Setup Flow: If user logged in via OTP for the first time and has no PIN,
            // redirect to SETUP_PIN screen so they can set a permanent PIN.
            if (data.hasPin === false) {
                setAuthStep('SETUP_PIN');
            } else {
                setAuthStep('DASHBOARD');
            }
        } catch (err: any) {
            setAuthError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (file: File, type: string) => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);
            formData.append('driverId', useAuthStore.getState().user?.id || 'temp');

            const res = await fetch(`${API_BASE_URL}/upload/onboarding`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'อัปโหลดไม่สำเร็จ');
            
            // If it's a profile pic, update regForm
            if (type === 'PROFILE') {
                setRegForm(prev => ({ ...prev, profilePic: data.url }));
            }
            
            return data.url;
        } catch (err: any) {
            setAuthError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!regForm.name || !phoneNumber) {
            setAuthError('กรุณากรอกชื่อจริงและเบอร์โทร');
            return;
        }

        setIsLoading(true);
        setAuthError('');

        try {
            // 1. Register Initial Record
            const res = await fetch(`${API_BASE_URL}/driver/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber,
                    fullName: regForm.name,
                    licensePlate: 'TBD',
                    inviteCode: 'WIN888', // Default for now
                    profilePicUrl: regForm.profilePic
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'ลงทะเบียนไม่สำเร็จ');
            
            // Move to Step 2
            setRegStep(2);
        } catch (err: any) {
            setAuthError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsLoading(false);
        }
    };

    const submitOnboardingData = async () => {
        setIsLoading(true);
        try {
            const driverId = useAuthStore.getState().user?.id;
            // Call the aggregate submit endpoint
            await fetch(`${API_BASE_URL}/driver/onboarding/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId })
            });
            setRegStep(6);
        } catch (err) {
            console.error('Submit failed', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value[0];
        const newOtp = [...otpCode];
        newOtp[index] = value;
        setOtpCode(newOtp);

        if (value && index < 5) {
            const nextInput = document.getElementById(`driver-otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    // --- LINE NOTIFY & BACKGROUND ALERT LOGIC ---
    const handleConnectLine = () => {
        // Request Browser Notification Permission first
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log("Browser Notification granted");
                }
            });
        }
        // Redirect to real LINE OAuth flow
        const driverId = useAuthStore.getState().user?.id || 'D-USER';
        window.location.href = `${API_BASE_URL}/auth/line-notify?driverId=${driverId}&role=DRIVER`;
    };

    const triggerBackgroundAlert = (title: string, body: string) => {
        // 1. Play Sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.error("Audio play failed", e));

        // 2. Show System Notification (Works when tab is inactive/minimized)
        if ('Notification' in window && Notification.permission === 'granted') {
            // Check if document is hidden (user is on another app)
            if (document.hidden) {
                const n = new Notification(title, {
                    body: body,
                    icon: APP_LOGO_PATH,
                    tag: 'job-alert'
                });
                n.onclick = () => {
                    window.focus();
                    n.close();
                };
            }
        }
    };

    // --- AUTO-FILL DEEP LINKING ---
    useEffect(() => {
        const getInviteCode = () => {
            const urlParams = new URLSearchParams(window.location.search);
            let code = urlParams.get('invite');
            if (!code && window.location.hash.includes('?')) {
                const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
                code = hashParams.get('invite');
            }
            return code;
        };

        const inviteCode = getInviteCode();
        if (inviteCode) {
            // If invite code is a Station ID, pre-fill it
            const station = STATION_ZONES.find(s => s.id === inviteCode);
            if (station) {
                handleSelectStation(station);
            } else {
                // Assume it's a raw ID
                setRegForm(prev => ({ ...prev, winId: inviteCode, winName: 'Unknown Station' }));
            }
        }
    }, []);

    // --- GPS TRACKING ---
    useEffect(() => {
        if (isOnline) {
            const id = watchPosition((loc) => {
                socket.emit('DRIVER_UPDATE_STATUS', {
                    id: 'D-USER',
                    status: isBusy ? 'BUSY' : 'IDLE',
                    location: loc
                });
            });
            setGpsId(id);
        } else {
            if (gpsId !== null) {
                clearWatch(gpsId);
                setGpsId(null);
            }
        }
        return () => {
            if (gpsId !== null) clearWatch(gpsId);
        };
    }, [isOnline, isBusy]);

    useEffect(() => {
        if (isBusy && matchedRider) {
            setHasNewJob(true);
            if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200, 100, 500]);

            // TRIGGER NOTIFICATION IF BACKGROUNDED
            triggerBackgroundAlert("งานใหม่เข้า! 🛵", "มีผู้โดยสารเรียกรถ คลิกเพื่อรับงานทันที");

        } else {
            setHasNewJob(false);
        }
    }, [isBusy, matchedRider]);

    const handleStartWork = () => {
        socket.emit('DRIVER_UPDATE_STATUS', {
            id: 'D-USER',
            status: 'IDLE',
            location: MAP_CENTER
        });
    };

    const handleStopWork = () => {
        socket.emit('DRIVER_UPDATE_STATUS', { id: 'D-USER', status: 'OFFLINE' });
    };

    const handleAcceptJob = () => {
        if (matchedRider) {
            socket.emit('TRIP_ACCEPT', { driverId: 'D-USER', tripId: 'T-1' });
        }
    };

    const handleRejectJob = () => {
        if (matchedRider) {
            socket.emit('DRIVER_REJECT_JOB', { driverId: 'D-USER', riderId: matchedRider.id });
            setHasNewJob(false);
        }
    };

    const handleCompleteJob = () => {
        socket.emit('TRIP_COMPLETE', { driverId: 'D-USER' });
    };

    const handleShareQR = async () => {
        const url = `${window.location.origin}/#passenger?ref=${driverData?.id || 'D-USER'}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'GOZIPP – แอปเรียกวินคนไทย',
                    text: 'เรียกวินง่ายๆ รวดเร็ว ปลอดภัย สแกนเลย!',
                    url: url
                });
            } catch (err) {
                console.log('Share canceled');
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(url);
            alert('คัดลอกลิงก์แล้ว: ' + url);
        }
    };

    // --- VIEWS ---

    if (authStep === 'LOGIN') {
        return (
            <div className="flex flex-col h-full bg-[#0F172A] font-sans relative overflow-hidden text-white">
                {/* Dynamic Background: Animated Gradients */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[150px] rounded-full"></div>

                <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 text-center">
                    {/* Logo: Premium Reveal Animation */}
                    <div className="w-40 h-40 mb-8 relative group animate-in zoom-in fade-in duration-1000">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full group-hover:bg-emerald-500/40 transition-all duration-700"></div>
                        <img 
                            src={APP_LOGO_DARK_PATH} 
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=GOZIPP&background=22C55E&color=fff';
                            }}
                            className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]" 
                            alt="GOZIPP Logo" 
                        />
                    </div>

                    <h1 className="text-5xl font-black mb-2 tracking-tighter text-white animate-in slide-in-from-bottom-4 duration-700">
                        GOZIPP
                    </h1>
                    <p className="text-emerald-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-12 animate-in slide-in-from-bottom-2 duration-1000">
                        Driver Partner Portal
                    </p>

                    {/* Input Area */}
                    <div className="w-full max-w-xs space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        {authError && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm font-bold backdrop-blur-md">
                                ⚠️ {authError}
                            </div>
                        )}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <span className="text-slate-500 text-lg group-focus-within:text-emerald-500 transition-colors">📞</span>
                            </div>
                            <input
                                className="w-full bg-white/5 border-2 border-white/10 focus:border-emerald-500 focus:bg-white/10 text-white py-5 pl-14 pr-4 rounded-[1.5rem] text-lg font-bold outline-none transition-all placeholder:text-slate-600 placeholder:font-normal backdrop-blur-xl"
                                value={phoneNumber}
                                onChange={e => { setPhoneNumber(e.target.value); setAuthError(''); }}
                                placeholder="เบอร์โทรศัพท์"
                                type="tel"
                            />
                        </div>
                        <button
                            onClick={requestOtp}
                            disabled={isLoading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-2xl shadow-emerald-900/40 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isLoading ? '...' : 'เข้าสู่ระบบ'}
                        </button>
                    </div>

                    <div className="mt-8">
                        <button onClick={() => { setAuthStep('REGISTER'); setAuthError(''); }} className="text-slate-400 font-bold text-sm hover:text-emerald-400 transition-colors underline decoration-slate-700 underline-offset-8">
                            ลงทะเบียนพาร์ทเนอร์ใหม่
                        </button>
                    </div>
                    {/* Social Login */}
                    <div className="flex flex-col gap-3 mt-12 w-full max-w-xs">
                        <button onClick={() => window.location.href = `${API_BASE_URL}/auth/line?type=DRIVER`} className="w-full bg-[#06C755] hover:bg-[#00B900] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-950/20 active:scale-95">
                            <span className="text-xl">💬</span> LINE Login
                        </button>
                    </div>
                </div>

                <div className="p-8 text-center relative z-10">
                    <div className="text-[9px] text-slate-500 font-black tracking-[0.4em] uppercase">Community Rider Platform</div>
                </div>
                <InstallPwaPrompt />
            </div>
        );
    }

    if (authStep === 'REGISTER') {
        const totalSteps = 6;

        const zones = ['Asoke', 'Silom', 'Rangsit', 'Ladprao', 'Victory Monument', 'Bangna', 'Rama 9', 'Sukhumvit'];
        const shifts = ['Morning', 'Afternoon', 'Evening', 'Night', 'Anytime'];
        const serviceTypes = ['Passenger Ride', 'Express Delivery', 'Document Delivery', 'Corporate Ride'];
        const trainingModules = [
            { id: 'SAFETY', title: 'Safety Rules', icon: '🛡️', desc: 'กฎความปลอดภัยพื้นฐาน' },
            { id: 'ACCEPT_JOB', title: 'Accept Jobs', icon: '📲', desc: 'วิธีการรับและส่งงาน' },
            { id: 'DRESS_CODE', title: 'Dress Code', icon: '👕', desc: 'การแต่งกายที่ถูกต้อง' },
            { id: 'CANCEL', title: 'Cancellation', icon: '⚠️', desc: 'นโยบายการยกเลิกงาน' }
        ];

        return (
            <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
                {/* Header with Progress */}
                <div className="p-6 border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={() => regStep > 1 ? setRegStep(regStep - 1) : setAuthStep('LOGIN')} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">←</button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">สมัครเป็นพาร์ทเนอร์</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Step {regStep} of {totalSteps}: {
                                regStep === 1 ? 'ข้อมูลส่วนตัว' : 
                                regStep === 2 ? 'รูปโปรไฟล์' : 
                                regStep === 3 ? 'เอกสารยืนยัน' : 
                                regStep === 4 ? 'พื้นที่และเวลา' : 
                                regStep === 5 ? 'คอร์สอบรม' : 'รอการอนุมัติ'
                            }</p>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(regStep / totalSteps) * 100}%` }}></div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {regStep === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">ชื่อ-นามสกุล</label>
                                    <input
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 text-lg font-bold outline-none transition-all"
                                        value={regForm.name}
                                        onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                                        placeholder="ชื่อจริง ภาษาไทย"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">ชื่อเล่น (Nickname)</label>
                                    <input
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 text-lg font-bold outline-none transition-all"
                                        value={regForm.nickname}
                                        onChange={e => setRegForm({ ...regForm, nickname: e.target.value })}
                                        placeholder="เรียกในแอป"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">LINE ID (ไม่บังคับ)</label>
                                    <input
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 text-lg font-bold outline-none transition-all"
                                        value={regForm.lineId}
                                        onChange={e => setRegForm({ ...regForm, lineId: e.target.value })}
                                        placeholder="@line_id"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">เลือกสังกัดวินมอเตอร์ไซค์ (Win Community)</label>
                                    <div className="relative">
                                        <input
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 text-lg font-bold outline-none transition-all"
                                            value={stationSearch}
                                            onChange={e => {
                                                setStationSearch(e.target.value);
                                                setShowStationList(true);
                                            }}
                                            onFocus={() => setShowStationList(true)}
                                            placeholder="พิมพ์ค้นหาชื่อวิน เช่น ตลาดกลาง"
                                        />
                                        {showStationList && (
                                            <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-30">
                                                {filteredStations.length > 0 ? (
                                                    filteredStations.map(station => (
                                                        <div
                                                            key={station.id}
                                                            onClick={() => handleSelectStation(station)}
                                                            className="p-4 hover:bg-slate-50 cursor-pointer font-bold text-slate-700 border-b border-slate-100 last:border-0 text-left"
                                                        >
                                                            {station.name} ({station.id})
                                                        </div>
                                                    ))
                                                ) : (
                                                    stationSearch && (
                                                        <div
                                                            onClick={handleCreateStation}
                                                            className="p-4 hover:bg-slate-50 cursor-pointer font-bold text-emerald-600 flex justify-between items-center text-left"
                                                        >
                                                            <span>➕ สร้างวินใหม่: "{stationSearch}"</span>
                                                            <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded">สร้างใหม่</span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {regForm.winId && (
                                        <div className="mt-2 p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex items-center justify-between text-sm">
                                            <div className="text-left">
                                                <div className="font-bold">{regForm.winName}</div>
                                                <div className="text-xs font-mono text-emerald-600">รหัสวิน: {regForm.winId}</div>
                                            </div>
                                            <span className="text-xl">🛵</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {regStep === 2 && (
                        <div className="flex flex-col items-center py-10 animate-in fade-in zoom-in duration-500">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id="avatar-upload"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const url = await handleFileUpload(file, 'PROFILE');
                                    if (url) setRegForm(prev => ({ ...prev, profilePic: url }));
                                }}
                            />
                            <div
                                onClick={() => document.getElementById('avatar-upload')?.click()}
                                className="w-48 h-48 bg-white rounded-[3.5rem] border-8 border-white shadow-2xl flex items-center justify-center text-6xl relative overflow-hidden group cursor-pointer transition-transform hover:scale-105"
                                style={{ backgroundImage: regForm.profilePic ? `url(${regForm.profilePic})` : 'none', backgroundSize: 'cover' }}
                            >
                                {!regForm.profilePic && <span className="text-slate-200">👤</span>}
                                <div className="absolute inset-0 bg-emerald-500/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-3xl">📸</span>
                                    <span className="text-white text-xs font-bold mt-2">ถ่ายรูปใหม่</span>
                                </div>
                            </div>
                            <h3 className="mt-8 text-xl font-bold text-slate-800">รูปโปรไฟล์พาร์ทเนอร์</h3>
                            <p className="text-slate-400 text-sm mt-2 text-center max-w-[200px]">กรุณาใช้รูปหน้าตรง ไม่สวมหมวกกันน็อก หรือแว่นดำ</p>
                        </div>
                    )}

                    {regStep === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { id: 'ID', title: 'บัตรประชาชน', icon: '🪪' },
                                    { id: 'LICENSE', title: 'ใบอนุญาตขับขี่', icon: '💳' },
                                    { id: 'VEHICLE', title: 'รูปรถคู่ใจ', icon: '🏍️' },
                                    { id: 'PLATE', title: 'ป้ายทะเบียน', icon: '🔢' }
                                ].map(doc => (
                                    <div 
                                        key={doc.id} 
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = async (e: any) => {
                                                const file = e.target.files?.[0];
                                                if (file) await handleFileUpload(file, doc.id);
                                            };
                                            input.click();
                                        }}
                                        className="bg-white p-6 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-between hover:border-emerald-500 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-3xl bg-slate-50 w-14 h-14 flex items-center justify-center rounded-2xl group-hover:bg-emerald-50 transition-colors">{doc.icon}</span>
                                            <div>
                                                <div className="font-bold text-slate-800">{doc.title}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Required</div>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-emerald-100 group-hover:text-emerald-500">＋</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {regStep === 4 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <section>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">พื้นที่ที่ต้องการรับงาน (เลือกได้หลายพื้นที่)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {zones.map(zone => (
                                        <button
                                            key={zone}
                                            onClick={() => setRegForm(prev => ({
                                                ...prev,
                                                zones: prev.zones.includes(zone) ? prev.zones.filter(z => z !== zone) : [...prev.zones, zone]
                                            }))}
                                            className={`p-4 rounded-2xl font-bold text-sm transition-all border-2 ${regForm.zones.includes(zone) ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white border-slate-100 text-slate-600'}`}
                                        >
                                            {zone}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">ช่วงเวลาที่สะดวก</label>
                                <div className="flex flex-wrap gap-2">
                                    {shifts.map(shift => (
                                        <button
                                            key={shift}
                                            onClick={() => setRegForm(prev => ({
                                                ...prev,
                                                shifts: prev.shifts.includes(shift) ? prev.shifts.filter(s => s !== shift) : [...prev.shifts, shift]
                                            }))}
                                            className={`px-6 py-3 rounded-full font-bold text-xs transition-all border-2 ${regForm.shifts.includes(shift) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-500'}`}
                                        >
                                            {shift}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {regStep === 5 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800">พื้นฐานการเป็นพาร์ทเนอร์</h3>
                                <p className="text-slate-400 text-sm mt-1">กรุณาอ่านและยอมรับเงื่อนไขการให้บริการ</p>
                            </div>
                            <div className="space-y-3">
                                {trainingModules.map(module => (
                                    <div 
                                        key={module.id} 
                                        onClick={() => setRegForm(prev => ({
                                            ...prev,
                                            trainingCompleted: prev.trainingCompleted.includes(module.id) ? prev.trainingCompleted.filter(m => m !== module.id) : [...prev.trainingCompleted, module.id]
                                        }))}
                                        className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-4 ${regForm.trainingCompleted.includes(module.id) ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100'}`}
                                    >
                                        <span className="text-2xl">{module.icon}</span>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-800">{module.title}</div>
                                            <div className="text-xs text-slate-400">{module.desc}</div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${regForm.trainingCompleted.includes(module.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent'}`}>✓</div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex gap-4 mt-8">
                                <span className="text-2xl">⚖️</span>
                                <p className="text-[11px] text-amber-700 leading-relaxed font-medium">ข้าพเจ้ายอมรับเงื่อนไขการเป็นพาร์ทเนอร์ และตกลงจะปฏิบัติตามกฎระเบียบของ GOZIPP อย่างเคร่งครัด เพื่อความปลอดภัยของตนเองและผู้โดยสาร</p>
                            </div>
                        </div>
                    )}

                    {regStep === 6 && (
                        <div className="flex flex-col items-center justify-center h-full py-10 space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                            <div className="relative">
                                <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center animate-pulse">
                                    <span className="text-5xl">📄</span>
                                </div>
                                <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg border-4 border-white">✓</div>
                            </div>
                            <div className="text-center space-y-4">
                                <h3 className="text-2xl font-bold text-slate-800">ส่งข้อมูลเรียบร้อยแล้ว</h3>
                                <p className="text-slate-500 leading-relaxed max-w-[280px] mx-auto">เราได้รับข้อมูลของคุณแล้ว เจ้าหน้าที่จะตรวจสอบเอกสารและแจ้งผลการอนุมัติภายใน 24 ชม.</p>
                            </div>
                            <div className="w-full max-w-xs bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Status</span>
                                    <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-bold">UNDER REVIEW</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400 w-2/3"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                    {regStep < 5 ? (
                        <button 
                            onClick={() => setRegStep(regStep + 1)}
                            disabled={
                                (regStep === 1 && (!regForm.name || !regForm.winId)) || 
                                (regStep === 2 && !regForm.profilePic) ||
                                (regStep === 4 && regForm.zones.length === 0)
                            }
                            className="w-full bg-[#0F172A] hover:bg-slate-800 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-30"
                        >
                            ถัดไป (Continue)
                        </button>
                    ) : regStep === 5 ? (
                        <button 
                            onClick={submitOnboardingData}
                            disabled={regForm.trainingCompleted.length < 4 || isLoading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-30"
                        >
                            {isLoading ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลลงทะเบียน'}
                        </button>
                    ) : (
                        <button 
                            onClick={() => setAuthStep('LOGIN')}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-5 rounded-2xl font-bold text-lg active:scale-95 transition-all"
                        >
                            กลับหน้าหลัก
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ... OTP Step (Visual Refactor - Light Mode)
    if (authStep === 'OTP') {
        return (
            <div className="flex flex-col h-full bg-white text-slate-900 p-6 justify-center font-sans">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">ยืนยันรหัส OTP</h2>
                    <p className="text-slate-500 text-sm">รหัสถูกส่งไปที่ {phoneNumber}</p>
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
                            id={`driver-otp-${i}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            className="w-12 h-14 bg-slate-50 rounded-xl border-2 border-slate-200 text-2xl font-bold text-center outline-none focus:border-mywin-orange transition-colors"
                        />
                    ))}
                </div>

                <button
                    onClick={verifyAndLogin}
                    disabled={isLoading || otpCode.join('').length < 4}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50"
                >
                    {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส'}
                </button>

                <div className="text-center mt-6">
                    {otpCountdown > 0 ? (
                        <span className="text-slate-400 text-sm">ส่งรหัสใหม่ได้ใน {otpCountdown} วินาที</span>
                    ) : (
                        <button
                            onClick={requestOtp}
                            className="text-mywin-orange text-sm font-bold hover:underline"
                        >
                            ส่งรหัสใหม่
                        </button>
                    )}
                </div>

                <button onClick={() => { setAuthStep('LOGIN'); setAuthError(''); }} className="mt-4 text-slate-400 text-sm hover:text-slate-600 transition-colors">
                    ← แก้ไขเบอร์โทร
                </button>
            </div>
        );
    }

    // --- SETUP PIN VIEW ---
    // Note: PIN check is now handled during login by API returning hasPin
    // if (authStep === 'DASHBOARD' && !localStorage.getItem('mywin_pin_set')) {
        // Optional: Trigger setup if needed
    }

    // --- LOGIN WITH PIN VIEW ---
    if (authStep === 'LOGIN_PIN') {
        const handlePinLogin = async () => {
            const pin = pinCode.join('');
            if (pin.length < 6) return;
            setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/auth/login-pin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber, pin, role: 'DRIVER' })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'รหัส PIN ไม่ถูกต้อง');

                setAuthStep('DASHBOARD');
            } catch (err: any) {
                setAuthError(err.message);
                setPinCode(['', '', '', '', '', '']); // Reset
            } finally {
                setIsLoading(false);
            }
        };

        // Auto-submit when length is 6
        useEffect(() => {
            if (pinCode.join('').length === 6) {
                handlePinLogin();
            }
        }, [pinCode]);

        return (
            <div className="flex flex-col h-full bg-slate-900 text-white p-8 items-center justify-center font-sans">
                <h2 className="text-2xl font-bold mb-8">ใส่รหัส PIN</h2>
                {authError && <div className="text-red-400 mb-4 text-sm">{authError}</div>}

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
                            className="w-12 h-12 bg-slate-800 rounded-full border border-slate-700 text-2xl font-bold text-center outline-none focus:border-mywin-green transition-colors"
                        />
                    ))}
                </div>

                <button onClick={() => { setAuthStep('LOGIN'); setPhoneNumber(''); }} className="text-slate-400 text-sm mt-8">
                    ลืมรหัส PIN / เปลี่ยนบัญชี
                </button>
            </div>
        );
    }

    // --- SETUP PIN VIEW ---
    if (authStep === 'SETUP_PIN') {
        const handleSetPin = async () => {
            const pin = pinCode.join('');
            if (pin.length < 6) return;
            setIsLoading(true);
            try {
                const userId = useAuthStore.getState().user?.id || 'D-USER'; // Should exist by now
                const res = await fetch(`${API_BASE_URL}/auth/set-pin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, pin, role: 'DRIVER' })
                });
                if (!res.ok) throw new Error('ตั้งค่า PIN ไม่สำเร็จ');

                setAuthStep('DASHBOARD');
            } catch (err: any) {
                setAuthError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        return (
            <div className="flex flex-col h-full bg-white text-slate-900 p-8 items-center justify-center font-sans">
                <div className="mb-8 p-4 bg-emerald-50 rounded-full text-4xl">🔐</div>
                <h2 className="text-2xl font-bold mb-2">ตั้งรหัส PIN ใหม่</h2>
                <p className="text-slate-500 text-center mb-8 text-sm">กำหนดรหัส 6 หลักเพื่อเข้าใช้งานครั้งต่อไป<br />โดยไม่ต้องรอ OTP</p>

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
                            className="w-12 h-14 bg-slate-50 rounded-xl border-2 border-slate-200 text-2xl font-bold text-center outline-none focus:border-mywin-green transition-colors"
                        />
                    ))}
                </div>

                <button
                    onClick={handleSetPin}
                    disabled={pinCode.join('').length < 6 || isLoading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50"
                >
                    {isLoading ? 'กำลังบันทึก...' : 'ยืนยันรหัส PIN'}
                </button>
            </div>
        );
    }

    // ... Pending Approval Step (Visual Refactor - Light Mode)
    if (authStep === 'PENDING') {
        return (
            <div className="flex flex-col h-full bg-white text-slate-900 p-8 items-center justify-center font-sans text-center">
                <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center text-5xl mb-6 animate-pulse text-amber-500 border border-amber-100">
                    ⏳
                </div>
                <h2 className="text-2xl font-bold mb-2">รอการตรวจสอบ</h2>
                <p className="text-slate-500 text-sm mb-8">
                    ข้อมูลของคุณกำลังถูกตรวจสอบโดยระบบ<br />กรุณารอสักครู่...
                </p>

                <div className="bg-slate-50 p-6 rounded-2xl w-full text-left mb-6 border border-slate-100 shadow-sm">
                    <div className="flex justify-between text-sm mb-3 pb-3 border-b border-slate-200">
                        <span className="text-slate-500">ชื่อ</span>
                        <span className="font-bold">{regForm.name}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-3 pb-3 border-b border-slate-200">
                        <span className="text-slate-500">เบอร์โทร</span>
                        <span className="font-bold">{phoneNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-3 pb-3 border-b border-slate-200">
                        <span className="text-slate-500">สังกัดวิน</span>
                        <span className="font-bold text-emerald-600">{regForm.winName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">รหัสวิน</span>
                        <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-slate-200">{regForm.winId}</span>
                    </div>
                </div>

                <div className="space-y-3 w-full">
                    <button onClick={() => { setAuthStep('SETUP_PIN'); setPinCode(['', '', '', '', '', '']); }} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-lg">
                        อนุมัติแล้ว (Simulation: Set PIN)
                    </button>
                    <button onClick={() => setAuthStep('DASHBOARD')} className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm transition-colors">
                        เข้าหน้า Dashboard (Skip PIN)
                    </button>
                </div>
            </div>
        );
    }

    // --- JOB OFFER / BUSY SCREEN ---
    if (isBusy) {
        return (
            <div className="flex flex-col h-full bg-slate-950 text-white font-sans relative">
                {hasNewJob ? (
                    // NEW JOB MODAL
                    <div className="absolute inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md p-6 animate-in slide-in-from-bottom-10 duration-300">
                        <div className="flex-1 flex flex-col justify-center items-center text-center">
                            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce">
                                🔔
                            </div>
                            <div className="text-emerald-400 font-bold text-3xl mb-2 tracking-wide">งานใหม่!</div>
                            <div className="text-slate-400 text-sm mb-8">ผู้โดยสารอยู่ห่างออกไป 150 เมตร</div>

                            {/* Job Details Card */}
                            <div className="w-full bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl mb-8">
                                <div className="flex items-start gap-4 mb-6 text-left">
                                    <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 text-2xl shrink-0">📍</div>
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">รับที่ (Pickup)</div>
                                        <div className="font-bold text-xl text-white leading-tight">หน้า 7-Eleven ปากซอย 5</div>
                                        <div className="text-xs text-slate-400 mt-1">ใกล้จุดจอดวิน</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 text-left">
                                    <div className="w-12 h-12 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-400 text-2xl shrink-0">💬</div>
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">ข้อความ</div>
                                        <div className="text-sm text-white italic">"รีบหน่อยนะครับ มีสัมภาระ"</div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="w-full space-y-3">
                                <button
                                    onClick={handleAcceptJob}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 py-5 rounded-2xl font-bold text-2xl shadow-lg shadow-emerald-900/50 animate-pulse text-white transition-colors"
                                >
                                    รับงาน (Accept)
                                </button>
                                <button
                                    onClick={handleRejectJob}
                                    className="w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-xl font-bold text-slate-400 transition-colors"
                                >
                                    ปฏิเสธ (Ignore)
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // IN RIDE / NAVIGATION
                    <div className="flex flex-col h-full">
                        {/* Top Status Bar */}
                        <div className="bg-emerald-600 p-6 rounded-b-[2rem] shadow-lg z-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-20 text-8xl rotate-12 -mr-4 -mt-4">🛵</div>
                            <div className="relative z-10">
                                <h2 className="text-2xl font-bold mb-1">กำลังรับผู้โดยสาร</h2>
                                <div className="flex items-center gap-2 text-emerald-100 text-sm">
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs">Navigation</span>
                                    <span>อีก 2 นาที • 150 เมตร</span>
                                </div>
                            </div>
                        </div>

                        {/* Real Map View */}
                        <div className="flex-1 relative">
                            <LiveMapView
                                myLocation={driverData?.location || null}
                                pickupLocation={matchedRider?.location || null}
                                destinationLocation={matchedRider?.destination || null}
                                userType="DRIVER"
                                showRoute={true}
                            />

                            {/* Controls Overlay */}
                            <div className="absolute bottom-4 left-4 right-4 space-y-2 z-[1001]">
                                <div className="bg-slate-900/95 backdrop-blur p-4 rounded-2xl border border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-lg">👤</div>
                                        <div>
                                            <div className="font-bold text-sm">คุณลูกค้า</div>
                                            <div className="text-xs text-emerald-400">{matchedRider?.message || 'เงินสด / โอน'}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleChat}
                                            className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-500 active:scale-95 transition-transform"
                                        >
                                            💬
                                        </button>
                                        <button
                                            onClick={handlePrivacyCall}
                                            className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-500 active:scale-95 transition-transform"
                                        >
                                            📞
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={handleRejectJob} className="flex-1 bg-slate-800 hover:bg-red-900/50 py-4 rounded-xl font-bold text-red-400 text-sm transition-colors border border-slate-700">ยกเลิก</button>
                                    <button onClick={handleCompleteJob} className="flex-[2] bg-slate-100 hover:bg-white text-slate-900 py-4 rounded-xl font-bold text-lg shadow-lg transition-colors">ส่งถึงที่หมาย (จบงาน)</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SOS Button */}
                <SOSButton
                    userId={driverData?.id || 'driver'}
                    userType="DRIVER"
                    tripId={currentTripId}
                    currentLocation={driverData?.location || null}
                />

                {/* Chat Modal */}
                <ChatModal
                    isOpen={showChatModal}
                    onClose={() => setShowChatModal(false)}
                    tripId={currentTripId}
                    myId={driverData?.id || 'driver'}
                    myType="DRIVER"
                    counterpartName="ผู้โดยสาร"
                    counterpartAvatar={matchedRider ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${matchedRider.id}` : undefined}
                />
            </div>
        );
    }

    // --- ONLINE / SCANNING ---
    if (isOnline) {
        return (
            <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-sans relative">
                {/* --- QUEUE SCORE MODAL (NEW) --- */}
                {showScoreInfo && driverData && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
                            <button
                                onClick={() => setShowScoreInfo(false)}
                                className="absolute top-4 right-4 text-slate-500 hover:text-white"
                            >✕</button>

                            <h3 className="text-xl font-bold text-white mb-1">คะแนนคิวของคุณ</h3>
                            <p className="text-xs text-slate-400 mb-6">ระบบจัดอันดับจาก 4 ปัจจัย (Fair Queue)</p>

                            {/* Calculate Score Live */}
                            {(() => {
                                const now = Date.now();
                                const waitMinutes = Math.floor((now - driverData.joinedQueueTime) / 60000);
                                const idleHours = ((now - driverData.lastTripTime) / 3600000).toFixed(1);
                                // Mock Score for visualization
                                const score = calculateFairnessScore(driverData, now);

                                return (
                                    <div className="space-y-4">
                                        {/* 1. Wait Time */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-300">เวลารอคิว ({(FAIRNESS_WEIGHTS.IDLE * 100).toFixed(0)}%)</span>
                                                <span className="text-emerald-400 font-bold">{waitMinutes} นาที</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, waitMinutes * 2)}%` }}></div>
                                            </div>
                                        </div>

                                        {/* 2. Recency */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-300">ไม่ได้วิ่งมานาน ({(FAIRNESS_WEIGHTS.RECENCY * 100).toFixed(0)}%)</span>
                                                <span className="text-blue-400 font-bold">{idleHours} ชม.</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, parseFloat(idleHours) * 10)}%` }}></div>
                                            </div>
                                        </div>

                                        {/* 3. Trips */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-300">งานวันนี้ ({(FAIRNESS_WEIGHTS.TRIPS * 100).toFixed(0)}%)</span>
                                                <span className="text-amber-400 font-bold">{driverData.totalTrips} งาน</span>
                                            </div>
                                            {/* Inverse: More trips = Less Score Boost */}
                                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500" style={{ width: `${Math.max(10, 100 - (driverData.totalTrips * 5))}%` }}></div>
                                            </div>
                                            <div className="text-[10px] text-slate-500 text-right mt-0.5">*ยิ่งงานน้อย ยิ่งได้แต้มเยอะ</div>
                                        </div>

                                        {/* 4. Rating */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-300">ดาว ({(FAIRNESS_WEIGHTS.RATING * 100).toFixed(0)}%)</span>
                                                <span className="text-yellow-400 font-bold">{driverData.rating.toFixed(1)} ⭐</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-yellow-500" style={{ width: `${(driverData.rating / 5) * 100}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
                                            <div className="text-sm text-slate-400">คะแนนรวมปัจจุบัน</div>
                                            <div className="text-3xl font-mono font-bold text-white">{score.toFixed(1)}</div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                <div className="bg-slate-900 border-b border-slate-800 p-6 shadow-xl z-20">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-800 rounded-full border-2 border-emerald-500 overflow-hidden relative">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-full h-full" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                            </div>
                            <div>
                                <div className="font-bold text-white text-lg">สมชาย ใจดี</div>
                                <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full w-fit">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> ออนไลน์
                                </div>
                                <div className="mt-1 text-[9px] font-bold text-emerald-500/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md w-fit">
                                    ค่า GP 0% • รับเงินเต็ม 100%
                                </div>
                            </div>
                        </div>
                        <button onClick={handleStopWork} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-xs font-bold border border-red-500/20 transition-colors">
                            พักงาน
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 flex flex-col items-center">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">คะแนนดาว</div>
                            <div className="text-2xl font-bold text-yellow-400 flex items-center gap-1">
                                <span>{driverData?.rating?.toFixed(1) || '5.0'}</span>
                                <span className="text-sm text-yellow-500/50">⭐</span>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 flex flex-col items-center">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">งานวันนี้</div>
                            <div className="text-2xl font-bold text-white">5 <span className="text-xs font-normal text-slate-500">เที่ยว</span></div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                    {/* Radar Animation */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[500px] h-[500px] border border-emerald-500/5 rounded-full absolute animate-ping" style={{ animationDuration: '4s' }}></div>
                        <div className="w-[350px] h-[350px] border border-emerald-500/10 rounded-full absolute animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
                        <div className="w-[200px] h-[200px] border border-emerald-500/20 rounded-full absolute animate-ping" style={{ animationDuration: '4s', animationDelay: '2s' }}></div>
                    </div>

                    <div className="w-40 h-40 rounded-full bg-slate-900 shadow-2xl shadow-emerald-900/20 flex items-center justify-center text-6xl mb-8 relative z-10 border-4 border-slate-800">
                        📡
                        <div className="absolute -bottom-4 bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg border-4 border-slate-950">
                            Scanning...
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">กำลังค้นหางาน</h3>
                    <p className="text-sm text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                        ระบบกำลังจับคู่ผู้โดยสารในระยะใกล้เคียง<br />กรุณาเปิดหน้านี้ค้างไว้
                    </p>

                    <div className="mt-12 bg-slate-900 p-5 rounded-2xl border border-slate-800 w-full max-w-xs shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase">ตำแหน่งคิว (Queue)</span>
                            <span className="text-emerald-400 font-bold bg-emerald-900/20 px-2 py-1 rounded text-xs">{regForm.winName || 'วินตลาดกลาง'}</span>
                        </div>
                        <div className="flex justify-between items-end relative">
                            <div className="text-left">
                                <div className="text-3xl font-bold text-white">#3</div>
                                <div className="text-[10px] text-slate-500">จากทั้งหมด 8 คัน</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400">เวลารอสะสม</div>
                                <div className="font-mono text-emerald-400">12:45 <span className="text-[10px] text-slate-600">นาที</span></div>
                            </div>

                            {/* INFO BUTTON */}
                            <button
                                onClick={() => setShowScoreInfo(true)}
                                className="absolute -top-10 right-0 bg-slate-800 hover:bg-slate-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs border border-slate-600 shadow-lg"
</div></div></div></div></div></div>
};
export default DriverApp;
