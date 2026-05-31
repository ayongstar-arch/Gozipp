# 🛵 MyWin - Driver Features Specification
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

## 🗂️ โครงสร้างไฟล์ที่เกี่ยวข้องกับ Driver

```
MyWin/
├── components/
│   ├── DriverApp.tsx           # หน้าแอปคนขับ (1,284 บรรทัด)
│   └── DriverDownloadPage.tsx  # หน้าดาวน์โหลดแอป
├── backend/
│   ├── driver.controller.ts    # API Endpoints
│   ├── driver.service.ts       # Business Logic
│   └── entities/
│       └── driver.entity.ts    # Database Model
├── services/
│   └── scheduler.ts            # Fair Queue Algorithm
└── types.ts                    # Type Definitions
```

---

## 🔐 1. ระบบยืนยันตัวตน (Authentication)

### 1.1 OTP Login
```typescript
// ขั้นตอน:
// 1. ผู้ใช้กรอกเบอร์โทร
// 2. ระบบส่ง OTP 6 หลักไปยังเบอร์โทร
// 3. ผู้ใช้กรอก OTP ยืนยัน
// 4. ระบบสร้าง JWT Token

// API: POST /driver/login
// Body: { phoneNumber: string, pin: string }
// Response: { token: string, driver: DriverData }
```

### 1.2 PIN Login (ถาวร)
```typescript
// หลังจาก OTP ครั้งแรก ผู้ใช้สามารถตั้ง PIN 6 หลักเพื่อใช้ login ครั้งต่อไป
// PIN จะถูก hash ด้วย bcrypt ก่อนเก็บใน database

// Field: pin_hash ใน DriverEntity
```

### 1.3 Social Login (Optional)
- **LINE Login**: OAuth2 ผ่าน LINE Channel
- **Google OAuth**: OAuth2 ผ่าน Google Cloud

---

## 📝 2. ระบบลงทะเบียน (Registration)

### 2.1 ขั้นตอนการลงทะเบียน
```
PHONE_INPUT → OTP_VERIFY → INVITE_CODE → PERSONAL_INFO → STATION_SELECT → PENDING_APPROVAL
```

### 2.2 API Registration
```typescript
// API: POST /driver/register
// Body: {
//   phone: string;        // เบอร์โทร
//   name: string;         // ชื่อ-นามสกุล
//   plate: string;        // ทะเบียนรถ
//   inviteCode: string;   // รหัสเชิญ
//   winId: string;        // รหัสวินที่สังกัด
// }
```

### 2.3 Invite Code System
- รหัสเชิญจาก Admin หรือวินมอเตอร์ไซค์
- ตรวจสอบความถูกต้อง + วันหมดอายุ
- นับจำนวนครั้งที่ใช้

---

## 🚦 3. ระบบสถานะการทำงาน

### 3.1 สถานะ (Status Flow)
```
OFFLINE ⟷ IDLE ⟷ BUSY
   ↑         ↑       ↑
 ปิดงาน   รอรับงาน  กำลังให้บริการ
```

### 3.2 Go Online
```typescript
// API: POST /driver/online
// Body: {
//   driverId: string;
//   winId: string;
//   status: 'ONLINE' | 'OFFLINE';
//   lat?: number;
//   lng?: number;
// }
```

---

## 📊 4. Fair Queue System (ระบบคิวยุติธรรม)

### 4.1 คะแนนความยุติธรรม (Fairness Score)
```typescript
// คำนวณจาก 3 ปัจจัย:
fairnessScore = 
  (waitTime * FAIRNESS_WEIGHTS.WAIT_TIME) +      // 0.5 - เวลารอ
  (dailyJobs * FAIRNESS_WEIGHTS.DAILY_JOBS) +    // 0.3 - งานวันนี้
  (rating * FAIRNESS_WEIGHTS.RATING);            // 0.2 - คะแนนรีวิว

// ยิ่งคะแนนสูง = ได้รับงานก่อน
```

### 4.2 Queue Status API
```typescript
// API: GET /driver/queue-status?driverId=xxx
// Response: {
//   position: number;      // ลำดับในคิว
//   totalInQueue: number;  // จำนวนคนในคิว
//   estimatedWait: number; // เวลารอโดยประมาณ (นาที)
// }
```

---

## 🛵 5. Trip Management (จัดการเที่ยววิ่ง)

### 5.1 Accept Trip
```typescript
// API: POST /trip/accept
// Body: { driverId: string, tripId: string }
// ใช้ Redis Lock ป้องกัน Double Accept
```

### 5.2 Reject Trip
```typescript
// API: POST /trip/reject
// Body: { driverId: string, tripId: string }
// คนขับปฏิเสธงาน → งานไปหาคนขับคนถัดไป
```

### 5.3 Complete Trip
```typescript
// API: POST /trip/complete
// Body: { driverId: string, tripId: string }
// เสร็จงาน → หักแต้มผู้โดยสาร → อัพเดทสถิติคนขับ
```

---

## 💬 6. ระบบสื่อสาร

### 6.1 Privacy Call (โทรแบบปิดเบอร์)
```typescript
// ใช้ Proxy Number Service
// คนขับโทรหาผู้โดยสาร → เบอร์จริงถูกซ่อน
// มี callback URL สำหรับ log การโทร
```

### 6.2 In-App Chat
```typescript
// Component: ChatModal.tsx
// ใช้ Socket.IO สำหรับ real-time messaging
// เก็บประวัติแชทใน Redis (ชั่วคราว) หรือ MySQL (ถาวร)
```

### 6.3 LINE Notify Integration
```typescript
// Connect LINE → รับ LINE User ID
// เมื่อมีงานใหม่ → ส่ง LINE Notify ไปหาคนขับ
// ใช้สำหรับกรณีแอปปิดอยู่
```

### 6.4 Push Notification (Browser)
```typescript
// ใช้ Notification API
// แจ้งเตือนเมื่อมีงานใหม่เข้ามา
// ต้อง Request Permission จากผู้ใช้
```

---

## 🗺️ 7. Map & Location

### 7.1 LiveMapView Component
```typescript
// ใช้ Leaflet + React-Leaflet
// แสดง:
// - ตำแหน่งคนขับปัจจุบัน
// - ตำแหน่งผู้โดยสาร
// - เส้นทางการเดินทาง
// - สถานี/วินต่างๆ
```

### 7.2 Station Selection
```typescript
// คนขับเลือกสถานี/วินที่ต้องการประจำ
// ระบบคำนวณสถานีใกล้ที่สุดจาก GPS
// สามารถสร้างสถานีใหม่ได้ (ถ้าได้รับอนุญาต)
```

---

## 🆘 8. SOS Emergency System

### 8.1 SOS Button
```typescript
// Component: SOSButton.tsx
// เมื่อกด:
// 1. ส่งพิกัด GPS ไปยังศูนย์ควบคุม
// 2. แจ้งเตือน Admin ทันที
// 3. บันทึก Log เหตุการณ์
// 4. (Optional) โทรหาเบอร์ฉุกเฉิน
```

---

## 🎫 9. QR Code System

### 9.1 Share QR
```typescript
// สร้าง QR Code สำหรับ:
// - ให้ผู้โดยสารสแกนเรียกรถ
// - Deep Link ไปยังแอป
// - แชร์ผ่าน Social Media
```

---

## 💾 10. Database Schema (DriverEntity)

```typescript
@Entity('drivers')
export class DriverEntity {
  @PrimaryColumn()
  id: string;                    // รหัสคนขับ (D-XXXX)

  @Column({ unique: true })
  phone: string;                 // เบอร์โทรศัพท์

  @Column()
  name: string;                  // ชื่อ-นามสกุล

  @Column()
  plate: string;                 // ทะเบียนรถ

  @Column()
  invite_code: string;           // รหัสเชิญที่ใช้สมัคร

  @Column({ name: 'win_id' })
  @Index()
  winId: string;                 // รหัสวินที่สังกัด

  @Column({ default: 'PENDING' })
  approval_status: string;       // PENDING | APPROVED | SUSPENDED

  @Column({ default: 'OFFLINE' })
  current_status: string;        // OFFLINE | IDLE | BUSY

  @Column({ type: 'float', default: 5.0 })
  rating: number;                // คะแนนเฉลี่ย

  @Column({ default: 0 })
  total_trips: number;           // จำนวนเที่ยวทั้งหมด

  @Column({ nullable: true })
  profile_pic_url: string;       // รูปโปรไฟล์

  @Column({ nullable: true })
  auth_provider: string;         // OTP | LINE | GOOGLE

  @Column({ nullable: true })
  pin_hash: string;              // PIN ถาวร (bcrypt)

  @Column({ nullable: true })
  provider_id: string;           // ID จาก OAuth Provider

  @Column({ nullable: true })
  email: string;                 // อีเมล (ถ้ามี)

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

---

## 🔌 11. API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/driver/login` | ❌ | เข้าสู่ระบบ |
| POST | `/driver/register` | ❌ | ลงทะเบียนใหม่ |
| POST | `/driver/online` | ✅ DRIVER | เริ่มงาน/ออฟไลน์ |
| GET | `/driver/queue-status` | ✅ DRIVER | ดูสถานะคิว |
| POST | `/trip/accept` | ✅ DRIVER | รับงาน |
| POST | `/trip/reject` | ✅ DRIVER | ปฏิเสธงาน |
| POST | `/trip/complete` | ✅ DRIVER | เสร็จงาน |

---

## 📲 12. PWA Support

```typescript
// InstallPwaPrompt.tsx
// - ตรวจสอบว่าใช้งานบน Browser หรือ PWA
// - แนะนำให้ติดตั้งลงมือถือ
// - รองรับ Add to Home Screen
// - Offline Support (บางส่วน)
```

---

## ⚙️ 13. Environment Variables ที่เกี่ยวข้อง

```env
# Database
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=mywin_db

# Redis (สำหรับ Queue System)
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

## 🚀 วิธีใช้เอกสารนี้กับ AI

### สำหรับ Hostinger AI:
```
"สร้างฟีเจอร์ [ชื่อฟีเจอร์] ตามที่ระบุใน DRIVER_FEATURES_SPEC.md 
โดยใช้ NestJS สำหรับ Backend และ React สำหรับ Frontend 
ตาม Tech Stack ที่กำหนด"
```

### ตัวอย่างคำสั่ง:
1. "เพิ่มระบบ Rating หลังจบ Trip ตาม Spec ในไฟล์"
2. "แก้ไข Fair Queue Algorithm ให้มี Weight ใหม่"
3. "เพิ่ม API สำหรับดูประวัติ Trip ของคนขับ"

---

## 📝 หมายเหตุ

- เอกสารนี้สร้างจากโค้ดจริงในโปรเจกต์ MyWin
- อัพเดทล่าสุด: 2026-01-23
- Version: 1.0.2
