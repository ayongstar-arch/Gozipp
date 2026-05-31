# 🌟 MyWin - Landing Pages Specification
## สำหรับสั่ง AI (Hostinger AI / Claude / ChatGPT)
## รายละเอียด UX/UI และ Copywriting ที่ออกแบบไว้

---

## 📋 ภาพรวม Landing Pages

| หน้า | Route | ไฟล์ | วัตถุประสงค์ |
|------|-------|------|--------------|
| **Main Landing** | `#landing` | `LandingPage.tsx` | หน้าแรกเลือกประเภทผู้ใช้ |
| **Driver Download** | `#download` | `DriverDownloadPage.tsx` | หน้าดาวน์โหลด/เริ่มใช้งานสำหรับคนขับ |
| **Admin Login** | (default) | `App.tsx` | หน้า Login สำหรับผู้ดูแลระบบ |

---

## 🎨 1. Main Landing Page (`LandingPage.tsx`)

### 1.1 Design Style (สไตล์การออกแบบ)

| องค์ประกอบ | สไตล์ |
|------------|-------|
| **พื้นหลัง** | สีเข้ม Slate-900 `bg-slate-900` |
| **Ambience Effect** | Gradient blur circles (สีส้ม/เขียว) ลอยอยู่มุมจอ |
| **Card หลัก** | Glassmorphism - `bg-white/5 backdrop-blur-xl border-white/10` |
| **ขอบ Card** | Rounded 3xl `rounded-3xl` |
| **Shadow** | Shadow-2xl สร้างความลึก |
| **Font** | San-serif ทันสมัย |

### 1.2 Layout Structure
```
┌────────────────────────────────────────┐
│        🟠 กล่อม Blur (มุมขวาบน)        │
│                                        │
│   ┌────────────────────────────────┐   │
│   │         [LOGO MyWin]           │   │
│   │                                │   │
│   │   "ยินดีต้อนรับสู่ MyWin"      │   │
│   │   "แอปเรียกวินมอเตอร์ไซค์      │   │
│   │    ดูแลโดยชุมชน"              │   │
│   │                                │   │
│   │  ┌──────────────────────────┐  │   │
│   │  │ 🙋‍♂️ เรียกวินมอเตอร์ไซค์   → │  │   │
│   │  │    สำหรับผู้ใช้งาน         │  │   │
│   │  └──────────────────────────┘  │   │
│   │                                │   │
│   │  ┌──────────────────────────┐  │   │
│   │  │ 👷 รับงาน / ลงทะเบียน     → │  │   │
│   │  │    สำหรับพี่วิน            │  │   │
│   │  └──────────────────────────┘  │   │
│   │                                │   │
│   │     🟢 ระบบออนไลน์พร้อมให้บริการ │   │
│   │     © 2024 MyWin Community    │   │
│   │     เรียกง่าย • ปลอดภัย • ไม่เอาเปรียบ │   │
│   └────────────────────────────────┘   │
│                                        │
│        🟢 กล่อม Blur (มุมซ้ายล่าง)      │
└────────────────────────────────────────┘
```

### 1.3 Copywriting (ข้อความ)

#### Header Section
```
หัวข้อหลัก: "ยินดีต้อนรับสู่ MyWin"
รองหัวข้อ: "แอปเรียกวินมอเตอร์ไซค์ ดูแลโดยชุมชน"
```

#### เมื่อมี Referral Code
```
Label: "คำเชิญพิเศษจาก"
แสดง: "🛵 พี่วินรหัส {REF_CODE}"
สี: สีเขียว Emerald (เน้นความพิเศษ)
```

#### ปุ่ม Action
| ปุ่ม | Label หลัก | Label รอง | สี |
|------|-----------|----------|-----|
| ผู้โดยสาร | `🙋‍♂️ เรียกวินมอเตอร์ไซค์` | `สำหรับผู้ใช้งาน` | ขาว/สว่าง |
| คนขับ | `👷 รับงาน / ลงทะเบียน` | `สำหรับพี่วิน` | เทาเข้ม/Slate |

#### Footer
```
Status: "🟢 ระบบออนไลน์พร้อมให้บริการ" (มี pulse animation)
Copyright: "© 2024 MyWin Community Project"
Tagline: "เรียกง่าย • ปลอดภัย • ไม่เอาเปรียบ"
```

### 1.4 Interaction & Animation
```typescript
// ปุ่มเมื่อ Hover
- ลูกศร "→" เลื่อนไปทางขวา (translate-x-1)
- Background เปลี่ยนสีเล็กน้อย

// ปุ่มเมื่อ Active (กด)
- Scale ลง 95% (active:scale-95)

// Status Indicator
- Green Dot มี Pulse Animation (animate-pulse)

// Page Load
- Card มี Slide-in Animation
```

### 1.5 Referral System (ระบบแนะนำ)
```typescript
// รับ Referrer Code จาก URL
// รูปแบบ: #landing?ref=D-123 หรือ ?ref=D-123

useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  let ref = urlParams.get('ref');
  
  // ถ้าไม่เจอ ลองหาใน hash
  if (!ref && window.location.hash.includes('?')) {
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
    ref = hashParams.get('ref');
  }
  
  if (ref) setReferrer(ref);
}, []);
```

---

## 🛵 2. Driver Download Page (`DriverDownloadPage.tsx`)

### 2.1 Design Style

| องค์ประกอบ | สไตล์ |
|------------|-------|
| **พื้นหลัง** | สีอ่อน Slate-50 `bg-slate-50` |
| **Header Section** | สีส้ม MyWin Orange `bg-mywin-orange` |
| **Header Shape** | โค้งล่าง `rounded-b-[3rem]` |
| **Content Card** | สีขาว โค้งบน `rounded-t-[2.5rem]` |
| **Mobile First** | ออกแบบสำหรับมือถือเป็นหลัก |

### 2.2 Layout Structure
```
┌────────────────────────────────────────┐
│  ████████████████████████████████████  │  ← สีส้ม
│  ████████████████████████████████████  │
│  ████████  [LOGO MyWin]  ███████████  │
│  ████████████████████████████████████  │
│  ██ "MyWin แอปเรียกวินมอเตอร์ไซค์" ██  │
│  ████████ "เชื่อมต่อชุมชน" ██████████  │
│  ████████████████████████████████████  │
│ ╭────────────────────────────────────╮ │  ← สีขาว
│ │                                    │ │
│ │     "ยินดีต้อนรับพาร์ทเนอร์วิน"    │ │
│ │                                    │ │
│ │  ┌────────────────────────────┐    │ │
│ │  │ 🚀 ใช้งานผ่านเว็บทันที      │ [แนะนำ] │
│ │  └────────────────────────────┘    │ │
│ │                                    │ │
│ │  ┌────────────────────────────┐    │ │
│ │  │ 📥 ดาวน์โหลด APK (Android)  │    │ │
│ │  └────────────────────────────┘    │ │
│ │                                    │ │
│ │  💰 รายได้ดี มีมาตรฐาน              │ │
│ │     ระบบคิวเป็นธรรม ไม่ต้องแย่งงาน   │ │
│ │                                    │ │
│ │  🛡️ มั่นใจ ปลอดภัย                  │ │
│ │     มีระบบยืนยันตัวตนคนขับ           │ │
│ │                                    │ │
│ │        MyWin Driver v1.0.2         │ │
│ ╰────────────────────────────────────╯ │
└────────────────────────────────────────┘
```

### 2.3 Copywriting (ข้อความ)

#### Header (H1 - SEO สำคัญ)
```html
"MyWin แอปเรียกวินมอเตอร์ไซค์
เชื่อมต่อชุมชน"
```

#### Content H2
```html
"ยินดีต้อนรับพาร์ทเนอร์วิน"
```

#### Action Buttons
| ปุ่ม | ข้อความ | Badge | สี |
|------|--------|-------|-----|
| Web App | `🚀 ใช้งานผ่านเว็บทันที` | `แนะนำ` | เขียว MyWin Green |
| APK | `📥 ดาวน์โหลด APK (Android)` | - | ขาว/เทา (Secondary) |

#### Benefits Section
| Icon | หัวข้อ (H3) | รายละเอียด |
|------|--------|------------|
| 💰 | `รายได้ดี มีมาตรฐาน` | `ระบบคิวเป็นธรรม ไม่ต้องแย่งงาน` |
| 🛡️ | `มั่นใจ ปลอดภัย` | `มีระบบยืนยันตัวตนคนขับ` |

#### Footer
```
"MyWin Driver System v1.0.2"
```

### 2.4 SEO Considerations
```html
<!-- H1 tag ใช้สำหรับ Search Engine -->
<h1>MyWin แอปเรียกวินมอเตอร์ไซค์ เชื่อมต่อชุมชน</h1>

<!-- H2 tag สำหรับ Secondary Keyword -->
<h2>ยินดีต้อนรับพาร์ทเนอร์วิน</h2>

<!-- ARIA Labels สำหรับ Accessibility -->
aria-label="ใช้งาน MyWin ผ่านเว็บทันที"
aria-label="ดาวน์โหลดแอป MyWin สำหรับ Android"
```

---

## 🔐 3. Admin Login Page

### 3.1 Design Style

| องค์ประกอบ | สไตล์ |
|------------|-------|
| **พื้นหลัง** | สีเข้มมาก Slate-950 `bg-slate-950` |
| **Login Card** | Slate-900 `bg-slate-900` |
| **Border** | Slate-800 `border-slate-800` |
| **Input** | Dark Input `bg-slate-950 border-slate-700` |
| **Button** | MyWin Green `bg-mywin-green` |

### 3.2 Layout Structure
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│     ┌──────────────────────────────┐    │
│     │                              │    │
│     │       "MyWin Admin"          │    │
│     │                              │    │
│     │   ┌──────────────────────┐   │    │
│     │   │      admin           │   │    │
│     │   └──────────────────────┘   │    │
│     │                              │    │
│     │   ┌──────────────────────┐   │    │
│     │   │      ••••            │   │    │
│     │   └──────────────────────┘   │    │
│     │                              │    │
│     │   ┌──────────────────────┐   │    │
│     │   │    เข้าสู่ระบบ        │   │    │
│     │   └──────────────────────┘   │    │
│     │                              │    │
│     └──────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 3.3 Copywriting
```
หัวข้อ: "MyWin Admin"
Placeholder Username: "admin"
Placeholder Password: "••••"
ปุ่ม: "เข้าสู่ระบบ"
Error Message: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง"
```

### 3.4 Default Credentials (Dev Mode)
```
Username: admin
Password: 1234
```

---

## 🚨 4. Error Boundary Page

### 4.1 Design
```
พื้นหลัง: Slate-900
สี Error: Red-500
```

### 4.2 Copywriting
```
หัวข้อ: "ระบบเกิดข้อผิดพลาด (System Error)"
รายละเอียด: "ขออภัยในความไม่สะดวก ระบบแผนที่อาจมีปัญหาในการแสดงผล"
ปุ่ม: "รีโหลดหน้าเว็บ"
```

---

## 🎨 5. Color System (MyWin Brand)

| ชื่อสี | Tailwind Class | Hex Code | ใช้สำหรับ |
|-------|---------------|----------|-----------|
| **MyWin Orange** | `bg-mywin-orange` | `#F97316` | แบรนด์หลัก, Header |
| **MyWin Green** | `bg-mywin-green` | `#10B981` | ปุ่มหลัก, สถานะออนไลน์ |
| **MyWin Blue** | `text-mywin-blue` | `#3B82F6` | Label, Link |
| **Slate-950** | `bg-slate-950` | `#020617` | พื้นหลังเข้ม |
| **Slate-900** | `bg-slate-900` | `#0F172A` | Card เข้ม |
| **Slate-50** | `bg-slate-50` | `#F8FAFC` | พื้นหลังสว่าง |

---

## 🔤 6. Typography

| Element | Size | Weight | Class |
|---------|------|--------|-------|
| H1 หลัก | 3xl (30px) | Bold | `text-3xl font-bold` |
| H1 Download | lg (18px) | Bold | `text-lg font-bold` |
| H2 | xl (20px) | Bold | `text-xl font-bold` |
| Body | sm (14px) | Normal | `text-sm` |
| Label | xs (12px) | Bold | `text-xs font-bold` |
| Micro | [10px] | Normal | `text-[10px]` |

---

## 📱 7. PWA Support

### 7.1 Install PWA Prompt
```typescript
// Component: InstallPwaPrompt.tsx
// แสดงเมื่อใช้งานผ่าน Browser (ไม่ใช่ PWA)
// แนะนำให้ติดตั้งลงหน้าจอหลัก
```

### 7.2 การแสดงผล
```
ตำแหน่ง: Fixed ด้านล่างหน้าจอ
ข้อความ: "ติดตั้งแอป MyWin ลงหน้าจอหลัก"
ปุ่ม: "ติดตั้ง" / "ไม่ตอนนี้"
```

---

## 🧭 8. Routing System

| Hash Route | View | Component |
|------------|------|-----------|
| `#landing` | Main Landing | `<LandingPage />` |
| `#download` | Driver Download | `<DriverDownloadPage />` |
| `#driver` | Driver App | `<DriverApp />` |
| `#passenger` | Passenger App | `<PassengerApp />` |
| (empty) | Admin Dashboard | Login → Dashboard |

### 8.1 Route Handler
```typescript
const getHashView = () => {
  const hash = window.location.hash;
  const cleanHash = hash.split('?')[0];
  if (cleanHash === '#driver') return 'STANDALONE_DRIVER';
  if (cleanHash === '#passenger') return 'STANDALONE_PASSENGER';
  if (cleanHash === '#landing') return 'LANDING_PAGE';
  if (cleanHash === '#download') return 'DOWNLOAD_PAGE';
  return 'ADMIN_SIMULATION';
};
```

---

## 🚀 วิธีใช้เอกสารนี้กับ AI

### สำหรับ Hostinger AI:
```
"สร้างหน้า Landing Page ใหม่ตาม Spec ใน LANDING_PAGE_SPEC.md
ใช้สไตล์ Glassmorphism, สี MyWin Orange/Green
และ Copywriting ภาษาไทยตามที่กำหนด"
```

### ตัวอย่างคำสั่ง:
1. "เพิ่มหน้า About Us ตามสไตล์เดียวกับ Landing Page"
2. "แก้ไข Download Page ให้รองรับ iOS TestFlight"
3. "เพิ่ม Social Proof Section (จำนวนคนขับ, Rating)"
4. "เพิ่ม FAQ Section ในหน้า Landing"
5. "ปรับ Copywriting ให้ดึงดูดมากขึ้น"

---

## 📝 หมายเหตุ

- เอกสารนี้สร้างจากโค้ดจริงในโปรเจกต์ MyWin
- อัพเดทล่าสุด: 2026-01-23
- Version: 1.0.2
- รองรับการแก้ไขผ่าน AI ได้ทันที
