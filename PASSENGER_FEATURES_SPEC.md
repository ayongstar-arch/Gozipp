# 🚗 MyWin - Passenger Features Specification
## สำหรับสั่ง AI (Hostinger AI / Claude / ChatGPT)

---

## 📋 ภาพรวมโปรเจกต์

| รายการ | รายละเอียด |
|--------|------------|
| **ชื่อโปรเจกต์** | MyWin App |
| **ประเภท** | แอปเรียกรถวินมอเตอร์ไซค์ |
| **Tech Stack** | NestJS (Backend) + React (Frontend) + TypeORM + MySQL + Redis + Socket.IO |
| **Node.js** | v20+ (Required) |
| **ภาษา** | TypeScript |

---

## 🗂️ โครงสร้างไฟล์ที่เกี่ยวข้องกับ Passenger

```
MyWin/
├── components/
│   └── PassengerApp.tsx           # หน้าแอปผู้โดยสาร (1,873 บรรทัด)
├── backend/
│   ├── passenger.controller.ts    # API Endpoints
│   ├── passenger.service.ts       # Business Logic
│   ├── credit.service.ts          # ระบบแต้ม/เติมเงิน
│   └── entities/
│       └── passenger.entity.ts    # Database Model
├── services/
│   └── socket.ts                  # Socket.IO Client
└── types.ts                       # Type Definitions
```

---

## 🔐 1. ระบบยืนยันตัวตน (Authentication)

### 1.1 OTP Login
```typescript
// ขั้นตอน:
// 1. ผู้โดยสารกรอกเบอร์โทร
// 2. ระบบส่ง OTP 6 หลักไปยังเบอร์โทร (เก็บใน Redis 5 นาที)
// 3. ผู้โดยสารกรอก OTP ยืนยัน
// 4. ระบบสร้าง JWT Token

// API: POST /passenger/request-otp
// Body: { phoneNumber: string }
// Response: { success: true, message: 'OTP ถูกส่งไปยังเบอร์ของคุณแล้ว' }

// API: POST /passenger/login
// Body: { phoneNumber: string, otp: string }
// Response: { 
//   isRegistered: boolean,
//   token?: string,
//   passengerId?: string,
//   name?: string,
//   pointsBalance?: number,
//   freeRidesRemaining?: number 
// }
```

### 1.2 PIN Login (ถาวร)
```typescript
// หลังจาก OTP ครั้งแรก ผู้โดยสารสามารถตั้ง PIN 6 หลักเพื่อใช้ login ครั้งต่อไป
// PIN จะถูก hash ด้วย bcrypt ก่อนเก็บใน database

// Field: pin_hash ใน PassengerEntity
```

### 1.3 Social Login (Optional)
- **LINE Login**: OAuth2 ผ่าน LINE Channel
- **Google OAuth**: OAuth2 ผ่าน Google Cloud

---

## 📝 2. ระบบลงทะเบียน (Registration)

### 2.1 ขั้นตอนการลงทะเบียน
```
PHONE_INPUT → OTP_VERIFY → PERSONAL_INFO → AUTO_LOGIN
```

### 2.2 API Registration
```typescript
// API: POST /passenger/register
// Body: {
//   phoneNumber: string;    // เบอร์โทร
//   name: string;           // ชื่อ-นามสกุล
//   referralCode?: string;  // รหัสแนะนำจากคนขับ (Optional)
// }
// Response: {
//   success: true,
//   token: string,
//   passengerId: string,
//   name: string,
//   freeRidesRemaining: 3  // โปรโมชั่นผู้ใช้ใหม่
// }
```

### 2.3 New User Promo
- ผู้ใช้ใหม่ได้รับ **3 เที่ยวฟรี** อัตโนมัติ
- Referral Code จากคนขับสามารถรับโบนัสเพิ่มได้

---

## 🏠 3. Home Screen (หน้าหลัก)

### 3.1 ฟังก์ชันหลัก
```typescript
// แสดง:
// - แต้มคงเหลือ (Points Balance)
// - ปุ่มเรียกรถ
// - สถานที่โปรด (บ้าน/ที่ทำงาน)
// - สถานะการเดินทางปัจจุบัน
```

### 3.2 Favorite Locations (สถานที่โปรด)
```typescript
// saveFavorite(type: 'HOME' | 'WORK', location: Location)
// - บันทึกสถานที่โปรดลง localStorage
// - ใช้เรียกรถได้เร็วขึ้น

// handleSelectFavorite(type: 'HOME' | 'WORK')
// - เลือกสถานที่โปรดเป็นจุดหมาย

// handleClearFavorite(e: React.MouseEvent, type: 'HOME' | 'WORK')
// - ลบสถานที่โปรด
```

---

## 🛵 4. ระบบเรียกรถ (Ride Request)

### 4.1 ขั้นตอนการเรียกรถ
```
SELECT_PICKUP → SELECT_DESTINATION → CONFIRM_FARE → SEARCHING → MATCHED → EN_ROUTE → COMPLETED
```

### 4.2 Request Ride API
```typescript
// API: POST /ride/request
// Body: {
//   passengerId: string;
//   pickupLat: number;
//   pickupLng: number;
//   destLat: number;
//   destLng: number;
// }
// Response: {
//   tripId: string;
//   status: 'SEARCHING';
//   fare: number;         // จำนวนแต้มที่ต้องจ่าย
//   distance: '2.5 km';
//   eta: '8 mins';
// }
```

### 4.3 Ride Status Flow
```
SEARCHING → MATCHED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED
     ↓          ↓
  TIMEOUT   CANCELLED
```

### 4.4 Fare Calculation (คำนวณค่าโดยสาร)
```typescript
// สูตรคำนวณ:
estimatedFare = 20 + (distanceKm * 5);  // 20 บาทฐาน + 5 บาท/กม.
pointsRequired = Math.ceil(estimatedFare);

// ตัวอย่าง:
// ระยะทาง 3 กม. = 20 + (3 * 5) = 35 แต้ม
```

### 4.5 Service Radius
```typescript
const SERVICE_RADIUS_KM = 2.0;  // รัศมีให้บริการ 2 กม. จากวิน
// ป้องกันการแย่งพื้นที่ระหว่างวิน
```

---

## 👀 5. Real-time Tracking (ติดตามแบบ Real-time)

### 5.1 Socket.IO Events
```typescript
// รับข้อมูลเมื่อคนขับรับงาน
socket.on('TRIP_ACCEPTED', (data) => {
  // data: { driverId, tripId, driverName, plate, phone, rating }
  setMatchedDriver(data);
  setRideStatus('MATCHED');
});

// รับข้อมูลเมื่อคนขับปฏิเสธ
socket.on('DRIVER_JOB_REJECT', (data) => {
  // หาคนขับคนถัดไป หรือ Reset
});

// รับข้อมูลเมื่อถึงจุดหมาย
socket.on('TRIP_COMPLETED', (data) => {
  // หักแต้ม → แสดงหน้า Rating
});
```

### 5.2 LiveMapView Component
```typescript
// แสดง:
// - ตำแหน่งปัจจุบันของผู้โดยสาร
// - ตำแหน่งคนขับ (Real-time)
// - เส้นทางการเดินทาง
// - จุดรับ/ส่ง
```

---

## 💬 6. ระบบสื่อสารกับคนขับ

### 6.1 Privacy Call (โทรแบบปิดเบอร์)
```typescript
// handlePrivacyCall()
// ใช้ Proxy Number Service
// ผู้โดยสารโทรหาคนขับ → เบอร์จริงถูกซ่อน
```

### 6.2 In-App Chat
```typescript
// Component: ChatModal.tsx
// ใช้ Socket.IO สำหรับ real-time messaging
// เก็บประวัติแชทใน Redis (ชั่วคราว)
```

---

## ⭐ 7. ระบบให้คะแนน (Rating System)

### 7.1 Rating Modal
```typescript
// หลังจบ Trip → แสดง Modal ให้คะแนนคนขับ
// submitRating(skipped: boolean = false)

// ให้คะแนน 1-5 ดาว
// สามารถ Skip ได้ (ไม่บังคับ)
```

---

## 💰 8. ระบบ Wallet & Points (กระเป๋าเงิน)

### 8.1 Points System
```typescript
// 1 Point = 1 บาท
// RIDE_POINT_COST = 2;  // ค่าบริการขั้นต่ำ 2 แต้ม

// แสดง:
// - ยอดแต้มคงเหลือ
// - ประวัติการใช้แต้ม
// - ปุ่มเติมเงิน
```

### 8.2 TopupModal (เติมเงิน)
```typescript
// ขั้นตอน:
// 1. เลือกจำนวนเงิน (50, 100, 200, 500)
// 2. เลือกช่องทางชำระ (PromptPay, Bank)
// 3. สแกน QR / โอนเงิน
// 4. ยืนยันการชำระ

// handleConfirmTopup()
// สร้าง Dynamic QR Code สำหรับ PromptPay
```

### 8.3 Payment Methods (Admin Config)
```typescript
// ตั้งค่าโดย Admin:
const MOCK_PAYMENT_METHODS = [
  { id: 'PM1', name: 'PromptPay', accNumber: '0123456789', icon: '📱' },
  { id: 'PM2', name: 'KBANK', accNumber: '123-4-56789-0', accName: 'บจก. มายวิน', icon: '🏦' }
];
```

### 8.4 Credit Service APIs
```typescript
// checkAvailability(passengerId): Promise<boolean>
// - ตรวจสอบว่ามีแต้มพอไหม (รวม Free Rides)

// topup(dto: TopupDto)
// - เติมแต้ม + โปรโมชั่นโบนัส

// deductForRide(passengerId, tripId): Promise<boolean>
// - หักแต้มหลังจบ Trip
```

---

## 📜 9. ประวัติการเดินทาง (Trip History)

### 9.1 History Tab
```typescript
// renderHistory()
// แสดง:
// - รายการ Trip ทั้งหมด
// - วันที่ เวลา
// - จุดรับ-ส่ง
// - ค่าโดยสาร
// - สถานะ
```

### 9.2 Activity Detail Modal
```typescript
// ActivityDetailModal()
// แสดงรายละเอียด Trip ที่เลือก:
// - ชื่อคนขับ
// - ทะเบียนรถ
// - เส้นทาง
// - ค่าโดยสาร
// - Rating ที่ให้
```

---

## 👤 10. Profile Management (จัดการโปรไฟล์)

### 10.1 Profile Tab
```typescript
// renderProfile()
// แสดง:
// - ชื่อ
// - เบอร์โทร
// - รูปโปรไฟล์
// - จำนวน Trip ทั้งหมด
// - ปุ่มแก้ไขข้อมูล
// - ปุ่ม Logout
```

### 10.2 Get Profile API
```typescript
// API: GET /passenger/profile?passengerId=xxx
// Response: {
//   id: string;
//   name: string;
//   phone: string;
//   pointsBalance: number;
//   totalRides: number;
//   freeRidesRemaining: number;
// }
```

---

## 🆘 11. SOS Emergency System

### 11.1 SOS Button
```typescript
// Component: SOSButton.tsx
// เมื่อกด:
// 1. ส่งพิกัด GPS ไปยังศูนย์ควบคุม
// 2. แจ้งเตือน Admin ทันที
// 3. บันทึก Log เหตุการณ์
// 4. (Optional) โทรหาเบอร์ฉุกเฉิน
```

---

## 💾 12. Database Schema (PassengerEntity)

```typescript
@Entity('passengers')
export class PassengerEntity {
  @PrimaryColumn()
  id: string;                    // รหัสผู้โดยสาร (P-XXXX)

  @Column({ unique: true })
  phone: string;                 // เบอร์โทรศัพท์

  @Column()
  name: string;                  // ชื่อ-นามสกุล

  @Column({ type: 'int', default: 0 })
  points_balance: number;        // ยอดแต้มคงเหลือ

  @Column({ type: 'int', default: 0 })
  total_rides: number;           // จำนวน Trip ทั้งหมด

  @Column({ type: 'int', default: 3 })
  free_rides_remaining: number;  // เที่ยวฟรีคงเหลือ (New User)

  @Column({ nullable: true })
  profile_pic_url: string;       // รูปโปรไฟล์

  @Column({ nullable: true })
  referral_code: string;         // รหัสแนะนำจากคนขับ

  @Column({ nullable: true })
  auth_provider: string;         // OTP | LINE | GOOGLE

  @Column({ nullable: true })
  pin_hash: string;              // PIN ถาวร (bcrypt)

  @Column({ nullable: true })
  provider_id: string;           // ID จาก OAuth Provider

  @Column({ nullable: true })
  email: string;                 // อีเมล

  @Column({ nullable: true })
  avatar_url: string;            // รูป Avatar จาก OAuth

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

---

## 🔌 13. API Endpoints Summary

### Passenger APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/passenger/request-otp` | ❌ | ขอ OTP |
| POST | `/passenger/login` | ❌ | เข้าสู่ระบบ |
| POST | `/passenger/register` | ❌ | ลงทะเบียน |
| GET | `/passenger/profile` | ✅ PASSENGER | ดูโปรไฟล์ |

### Ride APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ride/request` | ✅ PASSENGER | เรียกรถ |
| GET | `/ride/status` | ❌ | ดูสถานะ Trip |

---

## 📲 14. App Tabs (แท็บหลัก)

```typescript
type AppTab = 'HOME' | 'HISTORY' | 'ACTIVITY' | 'WALLET' | 'PROFILE';

// Bottom Navigation:
// 🏠 หน้าหลัก | 📜 ประวัติ | ⚡ กิจกรรม | 💰 กระเป๋าเงิน | 👤 โปรไฟล์
```

---

## 📲 15. PWA Support

```typescript
// InstallPwaPrompt.tsx
// - ตรวจสอบว่าใช้งานบน Browser หรือ PWA
// - แนะนำให้ติดตั้งลงมือถือ
// - รองรับ Add to Home Screen
// - Offline Support (บางส่วน)
```

---

## ⚙️ 16. Environment Variables ที่เกี่ยวข้อง

```env
# Database
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=mywin_db

# Redis (สำหรับ OTP, Session, Real-time)
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret-key

# SMS (สำหรับ OTP)
SMS_API_KEY=your-sms-api-key
SMS_API_SECRET=your-sms-secret
SMS_SENDER_ID=MyWin

# LINE OAuth
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_CALLBACK_URL=https://your-domain.com/api/auth/line/callback

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback
```

---

## 🎯 17. Constants ที่สำคัญ

```typescript
// จาก constants.ts และ PassengerApp.tsx
const RIDE_POINT_COST = 2;           // ค่าบริการขั้นต่ำ
const MAX_FREE_RIDES = 3;            // เที่ยวฟรีสำหรับผู้ใช้ใหม่
const SERVICE_RADIUS_KM = 2.0;       // รัศมีให้บริการ
const OTP_EXPIRE_SECONDS = 300;      // OTP หมดอายุ 5 นาที
const RIDE_TIMEOUT_MS = 60000;       // Timeout หาคนขับ 60 วินาที
```

---

## 🚀 วิธีใช้เอกสารนี้กับ AI

### สำหรับ Hostinger AI:
```
"สร้างฟีเจอร์ [ชื่อฟีเจอร์] ตามที่ระบุใน PASSENGER_FEATURES_SPEC.md 
โดยใช้ NestJS สำหรับ Backend และ React สำหรับ Frontend 
ตาม Tech Stack ที่กำหนด"
```

### ตัวอย่างคำสั่ง:
1. "เพิ่มระบบ Promo Code สำหรับผู้โดยสาร ตาม Spec ในไฟล์"
2. "แก้ไขสูตรคำนวณค่าโดยสาร ให้รองรับ Peak Hour"
3. "เพิ่ม API สำหรับดูประวัติการเติมเงิน"
4. "เพิ่มระบบ Cancel Trip พร้อมค่าปรับ"
5. "เพิ่มระบบ Scheduled Ride (จองล่วงหน้า)"

---

## 📝 หมายเหตุ

- เอกสารนี้สร้างจากโค้ดจริงในโปรเจกต์ MyWin
- อัพเดทล่าสุด: 2026-01-23
- Version: 1.0.2
