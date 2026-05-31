'use client';

import Link from 'next/link';
import { Facebook, Twitter, Instagram, MapPin, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#04070B] border-t border-[#A3FF3F]/30 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Info */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <img src="/brand/media__1779896490550.png" alt="GOZIPP" className="h-20 w-auto object-contain" />
            </Link>
            <p className="text-gray-400 font-kanit text-sm leading-relaxed">
              แพลตฟอร์มวินมอเตอร์ไซค์ชุมชนยุคใหม่ที่มุ่งเน้นความยุติธรรม ปลอดภัย และยั่งยืนสำหรับทุกคนในชุมชน
            </p>
            <div className="flex gap-4">
              <a href="/" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:bg-[#A3FF3F] hover:text-[#04070B] transition-all hover:shadow-[0_0_15px_rgba(163,255,63,0.5)]">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="/" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:bg-[#A3FF3F] hover:text-[#04070B] transition-all hover:shadow-[0_0_15px_rgba(163,255,63,0.5)]">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="/" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:bg-[#A3FF3F] hover:text-[#04070B] transition-all hover:shadow-[0_0_15px_rgba(163,255,63,0.5)]">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold font-kanit mb-6 text-lg">การนำทาง</h4>
            <ul className="space-y-3">
              {['หน้าแรก', 'สำหรับผู้โดยสาร', 'สำหรับคนขับ', 'ฟีเจอร์', 'คำถามที่พบบ่อย'].map((link, idx) => (
                <li key={idx}>
                  <Link href="/" className="text-gray-400 hover:text-[#A3FF3F] font-kanit text-sm transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-bold font-kanit mb-6 text-lg">นโยบาย</h4>
            <ul className="space-y-3">
              {['เงื่อนไขการใช้บริการ', 'นโยบายความเป็นส่วนตัว', 'นโยบายคุกกี้', 'ข้อกำหนดสำหรับคนขับ'].map((link, idx) => (
                <li key={idx}>
                  <Link href="/" className="text-gray-400 hover:text-[#A3FF3F] font-kanit text-sm transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold font-kanit mb-6 text-lg">ติดต่อเรา</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-400 font-kanit text-sm">
                <MapPin className="w-5 h-5 text-[#A3FF3F] flex-shrink-0" />
                <span>123 ถนนสุขุมวิท แขวงคลองเตย<br />เขตคลองเตย กรุงเทพฯ 10110</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 font-kanit text-sm">
                <Phone className="w-5 h-5 text-[#A3FF3F] flex-shrink-0" />
                <span>02-XXX-XXXX</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 font-kanit text-sm">
                <Mail className="w-5 h-5 text-[#A3FF3F] flex-shrink-0" />
                <span>support@gozipp.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 font-kanit text-sm">
            © {new Date().getFullYear()} GOZIPP. All rights reserved.
          </p>
          <div className="flex gap-4 items-center">
             <a href="/" className="hover:opacity-80 transition-opacity">
               <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-8 object-contain" />
             </a>
             <a href="/" className="hover:opacity-80 transition-opacity">
               <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-8 object-contain" />
             </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
