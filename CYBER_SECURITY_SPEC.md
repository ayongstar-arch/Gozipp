# 🛡️ GOZIPP Cybersecurity Specification (Enterprise Edition)

เอกสารข้อกำหนดและมาตรการป้องกันความปลอดภัยไซเบอร์ระดับองค์กรสากล (ISO 27001, OWASP Top 10, NIST, PCI-DSS) สำหรับแพลตฟอร์ม Gozipp 2.0

---

## 🔒 1. สถาปัตยกรรมความปลอดภัย 5 ชั้น (5-Layer Security Architecture)

### 1.1 Edge & Network Layer (Cloudflare WAF & Anti-DDoS)
- **WAF Rules:** บล็อก SQL Injection, Cross-Site Scripting (XSS), Remote Code Execution (RCE)
- **Anti-DDoS (L3/L4/L7):** บล็อกการถล่มระบบระดับ Network และ Application Layer
- **Rate Limiting & Bot AI:** บล็อกการสุ่มยิง OTP (OTP Bombing) และยิงสร้างทริปปลอม

### 1.2 Zero Trust Network Access (Admin Network Isolation)
- **Dedicated Admin IP & Subdomain:** แยก `admin.gozipp.app` อยู่บน Dedicated IP
- **IP Whitelisting & ZTNA:** อนุญาตเฉพาะ IP สำนักงาน/VPN ที่ยืนยันตัวตน 2FA แบบ Hardware Key (YubiKey)

### 1.3 Data Security & Cryptography (การปกป้องข้อมูล)
- **AES-256-GCM Encryption at Rest:** เข้ารหัสข้อมูลสำคัญในฐานข้อมูล
- **HMAC-SHA256 Transaction Signatures:** สร้างลายเซ็นดิจิทัลป้องกันการแอบแก้แต้มหรือประวัติการเดินทาง (`timingSafeEqual`)
- **Argon2id / bcrypt PIN Hashing:** เข้ารหัส PIN 6 หลักและ Password ป้องกัน Brute Force / Rainbow Table Attack

### 1.4 Application Security & Security Headers
- **Helmet Security Headers:**
  - `Content-Security-Policy (CSP)` ป้องกัน Script Injection
  - `X-Frame-Options: DENY` ป้องกัน Clickjacking
  - `Strict-Transport-Security (HSTS)` บังคับ HTTPS ตลอดเวลา
- **Granular RBAC 7 Roles:** ตรวจสอบสิทธิ์ผ่าน JWT Scopes, `RolesGuard`, `PermissionsGuard`

### 1.5 SIEM Real-time Audit & Incident Response
- **Immutable Audit Ledger:** บันทึก Log การกระทำของ Admin ชนิดแก้ไขไม่ได้ (Append-Only)
- **Real-time Alert Engine:** แจ้งเตือนเหตุการณ์ผิดปกติทันทีทาง SMS / Telegram / Webhook 24 ชั่วโมง
