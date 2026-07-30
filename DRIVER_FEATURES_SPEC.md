# 🛵 MyWin - Driver Application 2.0 Specification (Community Driver Platform)

## 📋 ภาพรวมโปรเจกต์ (Project Overview)

MyWin (Gozipp) Driver 2.0 ไม่ใช่แอป Ride-Hailing ทั่วไป แต่เป็น **แพลตฟอร์มวินมอเตอร์ไซค์ชุมชน (Community Motorcycle Taxi Platform)** ที่เน้นความยุติธรรม ชุมชน ความเรียบง่าย ความปลอดภัย และการรองรับบริบทการทำงานของวินมอเตอร์ไซค์ในประเทศไทย

---

## 🛑 Fundamental Business Rules (ข้อบังคับเด็ดขาด)

1. **Gozipp ไม่เคยรับเงินค่าโดยสารของผู้โดยสาร** (Gozipp NEVER receives passenger fare)
2. **ผู้โดยสารจ่ายเงินให้คนขับโดยตรง** (เงินสด, PromptPay ส่วนตัว หรือช่องทางอื่นตามตกลง)
3. **Gozipp ไม่เคยคำนวณค่าโดยสาร** (No Fare Calculation in Driver App)
4. **ไม่มี Wallet / ไม่มีระบบถอนเงินฝั่งคนขับ** (No Driver Wallet / No Driver Settlement)
5. **ไม่มีค่าคอมมิชชัน / ไม่มีส่วนแบ่งรายได้** (No Commission / No Revenue Sharing)
6. **ไม่มี Payment Gateway ฝั่งคนขับ**
7. **สิ่งเดียวที่ Gozipp ให้บริการคือ:** Driver Matching, Fair Queue, GPS Tracking, Communication, Safety, Community Points, Referral Program, Trip Recording, Statistics

---

## 📱 Driver Lifecycle & Flow

```
Splash Screen ──> Login (PIN / OTP) ──> Approval Verification ──> Dashboard
                                                                    │
┌───────────────────────────────────────────────────────────────────┘
│
├──> Go Online ──> Enter Fair Queue ──> Waiting Queue
│                                             │
│                                             ▼
│                                   Receive Ride Request
│                                             │
│                                      ┌──────┴──────┐
│                                      │             │
│                                   Accept        Reject ──> (ส่งคิวถัดไป)
│                                      │
│                                      ▼
│                             Navigate to Pickup
│                                      │
│                                      ▼
│                                Arrive Pickup
│                                      │
│                                      ▼
│                         Passenger Verification (OTP/QR/PIN/Manual)
│                                      │
│                                      ▼
│                                 Trip Started ──> Navigation
│                                                     │
│                                                     ▼
│                                               Trip Completed
│                                                     │
│                                                     ▼
│                                     Passenger pays driver directly (Cash/PromptPay)
│                                                     │
│                                                     ▼
│                                         Driver confirms completion
│                                                     │
│                                                     ▼
└─────────────────────────────────────────────────────┴──> Return to Queue ──> Go Offline ──> Daily Summary ──> Logout
```

---

## 📊 Driver Dashboard 2.0 (No Fare / Earnings)

แสดงผลข้อมูลสำคัญสำหรับการกดใช้งานกลางแจ้งและปุ่มกดขนาดใหญ่สำหรับมือเดียว (Outdoor One-hand UX):
- **สถานะการทำงาน:** Large Online / Offline Toggle Button
- **สถานะคิว:** Current Queue Position & Estimated Waiting Time
- **สถิติมนุษย์:** Today's Trip Count, Online Duration, Driver Rating, Acceptance Rate, Cancellation Rate
- **เมนูด่วน:** Quick Referral QR Button (แตะเดียวเปิด QR เต็มจอ), SOS Emergency Button, Notifications
- **Community Points:** ยอดแต้มชุมชนสะสม (ไม่ใช่ตัวเงิน ใช้แลกเสื้อวิน หมวกกันน็อก ฯลฯ)
- 🚫 **ไม่มีข้อมูลรายได้ (Earnings) หรือตัวเลขเงินปรากฏอยู่บน Dashboard**

---

## 🔐 Passenger Verification System

รองรับ 4 รูปแบบก่อนออกเดินทาง เพื่อป้องกันการรับผู้โดยสารผิดคน:
1. **OTP Verification:** กรอก OTP 4 หลักจากหน้าจอผู้โดยสาร
2. **QR Code Scan:** สแกน QR Code บนมือถือผู้โดยสาร
3. **PIN Match:** ตรวจสอบ PIN การเดินทาง
4. **Manual Confirmation:** ปุ่มยืนยันตัวตนด้วยตนเอง (กรณีฉุกเฉิน/มือถือผู้โดยสารแบตหมด)

---

## 🤝 Driver Referral System & Community Points

### 1. Fullscreen Referral QR
- คนขับแต่ละคนจะมี **Referral Code, QR Code, และ Deep Link** ส่วนตัว
- แตะปุ่ม Quick QR เพื่อเปิดหน้าจอ **Referral QR เต็มจอ (Full Screen)** ทันที
- ผู้โดยสารสแกนจากมือถือคนขับเพื่อสมัครใช้งาน ระบบจะผูกผู้โดยสารเข้ากับคนขับทันทีอัตโนมัติ (No manual typing)

### 2. Community Points System (แต้มชุมชนไม่ใช่เงิน)
- ได้รับแต้มจากการชวนผู้โดยสาร, การขับรถปลอดภัย, หรือแคมเปญชุมชน
- **แลกสวัสดิการได้แก่:** เสื้อวินมอเตอร์ไซค์, หมวกกันน็อก, เสื้อกันฝน, คูปองน้ำมัน, สินค้าชุมชน, ตราสัญลักษณ์เกียรติยศ

---

## 🛡️ Safety & Offline Support

- **SOS Emergency System:** ปุ่มฉุกเฉินส่งพิกัด GPS ตรงถึงศูนย์ควบคุม Admin ทันที
- **Privacy Call & In-App Chat:** โทรซ่อนเบอร์และแชทในแอป
- **Offline-First Support:** รองรับการบันทึกสถานะลง Cache ชั่วคราวเมื่ออินเทอร์เน็ตหลุด และส่งข้อมูลซิงค์กลับเมื่อสัญญาณกลับมา
