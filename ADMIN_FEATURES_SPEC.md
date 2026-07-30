# 🏢 MyWin - Admin Dashboard Specification (Enterprise Edition)

## 📋 ภาพรวมสถาปัตยกรรม (Platform Concept)

Admin Dashboard ของ MyWin (Gozipp) ไม่ใช่ระบบหลังบ้านของแอป Ride-Hailing ทั่วไป (ไม่ใช่แบบ Uber หรือ Grab) แต่เป็น **Community Operations Platform สำหรับบริหารจัดการองค์กรและวินมอเตอร์ไซค์ในชุมชนระดับประเทศ**

---

## 👥 1. สถาปัตยกรรมสิทธิ์ผู้ใช้งาน (RBAC - 7 Roles)

| บทบาท (Role) | ขอบเขตสิทธิ์ (Scope & Authority) |
|--------------|-----------------------------------|
| **SUPER_ADMIN** | ควบคุมระบบทั้งหมดทั่วประเทศ, กำหนดกฎแพลตฟอร์ม, จัดการบทบาทผู้ดูแลระบบ |
| **REGIONAL_ADMIN** | ผู้ดูแลระดับภูมิภาค/จังหวัด/เขต (เช่น ภาคเหนือ, กรุงเทพฯ, สมุทรปราการ) ดูแลหลายวินพร้อมกัน |
| **WIN_LEADER** | หัวหน้าวิน / ผู้ดูแลประจำวิน เฉพาะวินที่ตนเองรับผิดชอบ |
| **MARKETING** | บริหารแคมเปญการเติบโตชุมชน (Community Growth) และสวัสดิการ Reward Marketplace |
| **SAFETY** | ศูนย์รับสัญญาณฉุกเฉิน (SOS), บันทึก Timeline เหตุการณ์ และประสานงานเจ้าหน้าที่ |
| **SUPPORT** | บริหารจัดการข้อร้องเรียน, ตรวจสอบคะแนนรีวิว และช่วยเหลือผู้ใช้งาน |
| **AUDITOR** | **สิทธิ์อ่านอย่างเดียว (Read-Only)** สำหรับหน่วยงานราชการ, เทศบาล, สหกรณ์วิน และผู้บริหาร ดู Log, Queue, SOS, Reports โดยแก้ไขข้อมูลไม่ได้ |

---

## 🗺️ 2. ลำดับชั้นพื้นที่บริหาร (Station Management Hierarchy)

ระบบรองรับการขยายตัวทั่วประเทศไทยด้วยโครงสร้าง 5 ระดับ:
```
จังหวัด (Province) ──> อำเภอ (District) ──> ตำบล (Sub-district) ──> วิน (Station) ──> คนขับ (Driver)
```

---

## 📱 3. สรุป 10 โมดูลหลักของ Admin Enterprise Edition

### 3.1 โมดูล 1: Executive Dashboard (หน้าแรกบริหาร)
- **เมตริกสำคัญ (Top Metrics Bar):** `Driver Online`, `Busy`, `Waiting`, `Passenger Today`, `Trips Today`, `SOS Alerts`, `Pending Drivers`, `Pending Rewards`, `New Referrals`
- **Live Map ฝั่งขวา:** แสดงสถานะหนาแน่นของวินและตำแหน่งคนขับเรียลไทม์

### 3.2 โมดูล 2: Station & Win Management (จัดการวินและพื้นที่)
- จัดการโครงสร้างพื้นที่ 5 ระดับ
- พิมพ์โปสเตอร์สมัครงานประจำวินและ QR Code สมัครสมาชิกประจำวิน

### 3.3 โมดูล 3: Driver Management & Approval Workflow
- Workflow การอนุมัติคนขับ 6 ขั้นตอน:
  `สมัคร` ──> `PENDING` ──> `ตรวจสอบเอกสาร` ──> `สัมภาษณ์ (Optional)` ──> `APPROVED` ──> `ACTIVE`
- สถานะควบคุม: `Suspend` (พักงาน), `Resume` (คืนสภาพ), `Blacklist` (ขึ้นบัญชีดำ)

### 3.4 โมดูล 4: Fair Queue Center & Override Audit
- Live Map แสดงคิวพี่วินประจำวิน (เช่น วิน A: 12 คัน, วิน B: 5 คัน) พร้อมสถานะ `Online`, `Busy`, `Offline`
- **Manual Queue Override Audit Flow:** 
  `ระบุเหตุผล (Reason)` ──> `อนุมัติ (Approval)` ──> `บันทึก Audit Ledger` ──> `ส่งการแจ้งเตือน (Notification)`

### 3.5 โมดูล 5: Community Growth Center (ระบบการเติบโตชุมชน)
- **Referral Analytics:** ติดตามสายงาน `Driver -> Passenger` และ `Passenger -> Passenger`
- **QR Analytics:** วิเคราะห์ QR Code ของคนขับและผู้โดยสารที่ถูกสแกนสูงสุด (Scan -> Register -> First Ride -> Retention)
- **Passenger Referral Engine:** เครื่องมือตั้งค่าแต้มโบนัสเมื่อผู้โดยสารชวนเพื่อนสำเร็จ (ให้แต้มเมื่อเพื่อนจบ Trip แรก)

### 3.6 โมดูล 6: Campaign & Reward Center (Reward Marketplace)
- **Platform Service Configuration:** กำหนดกฎการใช้แพลตฟอร์มและแคมเปญแต้มชุมชน (ไม่ใช่ค่าโดยสาร)
- **Reward Marketplace Catalog (Driver):** เสื้อวิน, หมวกกันน็อก, เสื้อกันฝน, Gift Voucher, ประกันภัย, สิทธิ์เข้าอบรม
- **Reward Marketplace Catalog (Passenger):** แลกคูปองส่วนลดจากร้านค้าชุมชน, แลกของที่ระลึก, แลกรับส่วนลดค่าโดยสาร

### 3.7 โมดูล 7: Safety & Incident Center (ศูนย์ความปลอดภัย)
- **SOS Incident Workflow:**
  `SOS Alert` ──> `Live GPS` ──> `ระบุ Driver/Passenger` ──> `Call` ──> `Police/Hospital` ──> `Resolved`
- บันทึก Timeline เหตุการณ์อย่างละเอียด

### 3.8 โมดูล 8: Analytics & Reporting (ระบบรายงานเชิงลึก)
- **Driver Performance:** Trips, Acceptance Rate, Cancellation Rate, Rating, Complaints, Online Hours, Community Points
- **Passenger Analytics:** ผู้โดยสารใหม่, ผู้โดยสาร Active, Retention Rate, สถิติตามจังหวัด และวินที่ใช้บริการบ่อย

### 3.9 โมดูล 9: Audit & Compliance Center (ระบบตรวจสอบความถูกต้อง)
- บันทึก Log ละเอียดแยกตามหมวดหมู่: `Login`, `Queue Override`, `Driver Approval`, `Reward Redemption`, `Campaign Change`, `SOS Trigger`, `Data Export`

### 3.10 โมดูล 10: Notification Center & System Configuration
- ระบบส่งข้อความแจ้งเตือนเลือกกลุ่มเป้าหมาย (Targeted Broadcast): `ทุกคน`, `เฉพาะจังหวัด`, `เฉพาะวิน`, `เฉพาะคนขับ`, `เฉพาะผู้โดยสาร` (รองรับแจ้งเตือนปิดถนน, ฝนตก, ประชุมวิน)
