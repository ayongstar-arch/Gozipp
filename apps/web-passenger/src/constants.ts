// --- THAI LOCALIZATION (GOZIPP UI) ---
export const UI_LABELS_TH = {
    APP_NAME: "GOZIPP",
    SLOGAN: "จุดเริ่มความเร็ว เพื่อทุกการเดินทาง",
    
    // Statuses
    STATUS_SEARCHING: "กำลังค้นหาคนขับ...",
    STATUS_MATCHED: "พบคู่จับคู่แล้ว!",
    STATUS_ON_WAY: "คนขับกำลังเดินทางมา",
    STATUS_ARRIVED: "คนขับมาถึงแล้ว",
    STATUS_IN_PROGRESS: "กำลังเดินทาง",
    STATUS_COMPLETED: "การเดินทางสำเร็จ",
    STATUS_CANCELLED: "ยกเลิกแล้ว",
    
    // Buttons
    BTN_BOOK_NOW: "เรียก Gozipp เลย",
    BTN_CANCEL_TRIP: "ยกเลิกการเดินทาง",
    BTN_GO_ONLINE: "เริ่มรับงาน (Online)",
    BTN_GO_OFFLINE: "หยุดรับงาน (Offline)",
    BTN_TOPUP: "เติมเงิน",
    BTN_CONFIRM: "ยืนยัน",
    BTN_BACK: "กลับ",
    
    // Auth
    AUTH_LOGIN_TITLE: "ยินดีต้อนรับสู่ GOZIPP",
    AUTH_LOGIN_SUB: "เข้าสู่ระบบด้วยเบอร์โทรศัพท์ของคุณ",
    AUTH_OTP_SENT: "รหัส OTP ถูกส่งไปที่เบอร์",
    AUTH_OTP_PLACEHOLDER: "ใส่รหัส 6 หลัก",
    AUTH_VERIFY: "ยืนยันรหัส",
    
    // Map
    MAP_PICKUP: "จุดรับของคุณ",
    MAP_DESTINATION: "จุดหมายปลายทาง",
    MAP_ETA: "ถึงภายใน",
    MAP_DISTANCE: "ระยะทาง",
    
    // Wallet
    WALLET_BALANCE: "ยอดเงินคงเหลือ",
    WALLET_TOPUP_DESC: "เติมเงินเพื่อเริ่มการเดินทางที่รวดเร็วกว่า",
    WALLET_HISTORY: "ประวัติการเงิน",
};

// --- API Configuration (Environment-Aware) ---
export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  (typeof window !== 'undefined' && (window as any).__GOZIPP_API_URL) ||
  'http://localhost:3000';

export const SOCKET_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SOCKET_URL) ||
  API_BASE_URL;

export const IS_PRODUCTION = process.env?.NODE_ENV === 'production';

// --- GAME / SIMULATION CONSTANTS ---
export const MAX_DRIVERS = 20;
export const MAX_RIDERS = 30;
export const TICK_RATE_MS = 1000;

// ... existing weights and other constants ...
export const FAIRNESS_WEIGHTS = {
  IDLE: 0.5,
  RECENCY: 0.3,
  TRIPS: 0.15,
  RATING: 0.05
};

export const INITIAL_DRIVERS_COUNT = 8;
export const INITIAL_RIDERS_COUNT = 5;

// Pricing
export const PRICE_PER_RIDE_CREDITS = 2;

// Service Radius
export const SERVICE_RADIUS_KM = 3.5;

// Master Data: Stations (Bangkok Locations)
export const STATION_ZONES = [
  { id: 'WIN-CENTRAL-01', name: 'วินตลาดกลาง (ปทุมวัน)', lat: 13.7563, lng: 100.5018 },
  { id: 'WIN-TECH-PARK', name: 'วินหน้าตึก Tech Park (พญาไท)', lat: 13.7650, lng: 100.5380 },
  { id: 'WIN-SUBURB-A', name: 'วินหมู่บ้าน A (สุขุมวิท)', lat: 13.7200, lng: 100.5600 },
];

// Default Map Center (Bangkok)
export const MAP_CENTER = { lat: 13.7500, lng: 100.5100 };

// Thai Quick Messages
export const THAI_QUICK_MESSAGES = [
  { id: 1, text: "อยู่หน้าร้านสะดวกซื้อ", icon: "🏪" },
  { id: 2, text: "รอใต้ตึก", icon: "🏢" },
  { id: 3, text: "หน้าปากซอย", icon: "🛣️" },
  { id: 4, text: "หน้า รปภ.", icon: "👮" },
  { id: 5, text: "ใส่เสื้อสีขาว", icon: "👕" },
  { id: 6, text: "มีสัมภาระ", icon: "🎒" },
  { id: 7, text: "รีบมาก", icon: "🔥" },
  { id: 8, text: "ขอรอแป๊บ", icon: "✋" },
];

// Asset Path - GOZIPP Official Assets
export const APP_LOGO_PATH = '/logo-gozipp.png';
export const APP_LOGO_DARK_PATH = '/logo-gozipp.png'; 
export const APP_LOGO_LIGHT_PATH = '/logo-gozipp.png';
export const APP_ICON_PATH = '/icon-gozipp.png';

// Brand Colors (GOZIPP System)
export const BRAND_PRIMARY = '#22C55E'; // Gozipp Electric Green
export const BRAND_NAVY = '#0F172A';    // Gozipp Dark Navy
export const BRAND_GRAY = '#F8FAFC';    // Gozipp Light Gray
export const BRAND_BLUE = '#06B6D4';    // Gozipp Speed Blue

// Driver/Rider Colors
export const COLOR_DRIVER_IDLE = '#22C55E';
export const COLOR_DRIVER_BUSY = '#06B6D4';
export const COLOR_RIDER_WAITING = '#EF4444';
export const COLOR_RIDER_MATCHED = '#3B82F6';
