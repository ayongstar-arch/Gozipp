# 🛵 GOZIPP Platform 2.0 - Product Vision & Specifications

## 📋 ภาพรวมผลิตภัณฑ์ (Product Overview)

GOZIPP (MyWin) คือ **แพลตฟอร์มวินมอเตอร์ไซค์ชุมชนระดับประเทศ (Community Motorcycle Taxi Operations Platform)** ออกแบบมาเพื่อเชื่อมต่อผู้โดยสารและพี่วินมอเตอร์ไซค์ประจำวินในประเทศไทยอย่างเป็นธรรม ชัดเจน ปลอดภัย และยั่งยืน

---

## 🛑 Fundamental Business Rules (ข้อบังคับเด็ดขาด)

1. **ผู้โดยสารจ่ายค่าโดยสารเป็นเงินสด (หรือ PromptPay ส่วนตัว) ให้คนขับโดยตรง 100%**
2. **ระบบไม่เคยรับชำระเงินค่าโดยสาร และไม่คิดคอมมิชชันจากคนขับ**
3. **ไม่มี Wallet หรือระบบถอนเงินฝั่งคนขับ** (หน้าจอคนขับไม่มีตัวเลขเงินหรือรายได้)
4. **คนขับสะสม Community Points** เพื่อแลกสวัสดิการชุมชน (เสื้อวิน, หมวกกันน็อก, เสื้อกันฝน, คูปองน้ำมัน)
5. **ผู้โดยสารจ่ายเฉพาะค่าบริการระบบ (System Fee Points)** ซึ่งหักผ่านกลไก Point Reservation (`Reserve -> Commit Deduct / Release`)
6. **แอดมินกำหนดค่าธรรมเนียมบริการระบบแบบไดนามิกได้จากหลังบ้าน** (Admin Platform Service Configuration)

---

## 🏛️ สถาปัตยกรรมระบบ 3 ส่วนหลัก (Core Architecture)

### 1. แอปพลิเคชันผู้โดยสาร (Passenger App 2.0)
- **โมเดลชำระเงิน:** แสดงราคาประเมินเงินสดสำหรับจ่ายคนขับ + ตัดค่าบริการระบบ (แต้ม) จาก Wallet
- **Point Reservation Flow:** สำรองแต้มทันทีเมื่อ Match คนขับ (`Reserved`) -> หักถาวรเมื่อจบงาน (`Commit Deduct`) -> คืนแต้มหากยกเลิก (`Release`)
- **การใช้งานใกล้นิ้ว:** Bottom Navigation 5 แท็บหลัก, WCAG 2.2 AA Touch Targets

### 2. แอปพลิเคชันคนขับ (Driver App 2.0)
- **Outdoor High-Contrast One-Hand UX:** ดีไซน์ความคมชัดสูง ปุ่มกดใหญ่พิเศษสำหรับมือเดียวกลางแจ้ง
- **Fair Queue Engine:** จัดลำดับคิวด้วย `Fairness Score` (เวลารอคอย 50%, งานวันนี้ 30%, Rating 20%) ไร้การกดแย่งงาน
- **Passenger Verification:** ยืนยันตัวตนผู้โดยสาร 4 รูปแบบ (OTP 4 หลัก, QR Scan, PIN Match, Manual Confirm)
- **Fullscreen Referral QR:** ปุ่มกดแตะเดียวแสดง QR เต็มจอสำหรับให้ผู้โดยสารสแกนสมัครแล้วผูกรหัสคนขับทันที

### 3. ระบบผู้ดูแลระบบ (Admin Dashboard Enterprise Edition - 10 Modules)
- **สิทธิ์ RBAC 7 บทบาท:** `SUPER_ADMIN`, `REGIONAL_ADMIN` (รายจังหวัด/ภาค), `WIN_LEADER`, `MARKETING`, `SAFETY`, `SUPPORT`, `AUDITOR` (Read-Only)
- **ลำดับชั้นพื้นที่ 5 ระดับ:** `จังหวัด -> อำเภอ -> ตำบล -> วิน -> คนขับ`
- **10 โมดูลหลัก:**
  1. Executive Dashboard (Metrics Bar + Live Map)
  2. Station & Win Management (5-Level Hierarchy)
  3. Driver Management & Approval Workflow (`PENDING` -> `APPROVED` -> `ACTIVE` / `Suspend` / `Blacklist`)
  4. Fair Queue Center & Queue Override Audit (`Reason` -> `Approval` -> `Audit Log`)
  5. Community Growth Center (Referral Analytics & QR Scan Tracking)
  6. Campaign & Reward Center (Reward Marketplace Catalog & Rule Engine)
  7. Safety & Incident Center (SOS Live GPS & Event Timeline)
  8. Analytics & Reporting (Driver Performance & Passenger Analytics)
  9. Audit & Compliance Center (Read-only Audit Log)
  10. System Configuration & Targeted Notification Center
