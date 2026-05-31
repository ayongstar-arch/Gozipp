'use client';

import { motion } from 'framer-motion';
import { Users, CalendarClock, MessageCircle, Gift, ShieldCheck, Map } from 'lucide-react';

export default function CoreFeaturesSection() {
  const features = [
    { icon: Users, title: 'คิววินเรียลไทม์', desc: 'เห็นลำดับคิวแบบสด' },
    { icon: CalendarClock, title: 'นัดหมายล่วงหน้า', desc: 'วางแผนการเดินทางได้' },
    { icon: MessageCircle, title: 'แชทในแอป', desc: 'ติดต่อคนขับได้ทันที' },
    { icon: Gift, title: 'แต้มและรางวัล', desc: 'ใช้งานง่าย ได้รับแต้มเพิ่ม' },
    { icon: ShieldCheck, title: 'ปลอดภัย เชื่อถือได้', desc: 'ยืนยันตัวตนทุกบัญชี' },
    { icon: Map, title: 'ชุมชนวิน', desc: 'สนับสนุนวินในท้องถิ่น' },
  ];

  return (
    <section className="py-16 bg-[#04070B] relative overflow-hidden" id="features">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-black text-white font-kanit tracking-tight"
          >
            ฟีเจอร์ที่ตอบโจทย์ทั้งผู้โดยสารและคนขับ
          </motion.h2>
        </div>

        {/* 1 Row, 6 Columns Layout matching Image 2 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="group relative bg-[#0B1120] border border-gray-800 rounded-2xl p-6 overflow-hidden hover:border-[#A3FF3F]/50 hover:shadow-[0_0_20px_rgba(163,255,63,0.15)] transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#A3FF3F]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10 w-full flex flex-col items-center">
                <div className="mb-5 group-hover:scale-110 transition-transform text-[#A3FF3F] drop-shadow-[0_0_12px_rgba(163,255,63,0.6)]">
                  <feature.icon className="w-10 h-10" strokeWidth={1.5} />
                </div>
                <h3 className="text-base text-white font-bold font-kanit mb-2 leading-tight">{feature.title}</h3>
                <p className="text-gray-400 text-xs font-kanit leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
