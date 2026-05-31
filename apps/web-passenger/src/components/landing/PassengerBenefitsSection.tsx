'use client';

import { motion } from 'framer-motion';
import { User, ShieldCheck, Heart, MapPin, Search, CalendarClock } from 'lucide-react';

export default function PassengerBenefitsSection() {
  const features = [
    { icon: ShieldCheck, title: 'ปลอดภัย เชื่อถือได้', desc: 'คนขับทุกคนยืนยันตัวตนและเป็นคนในพื้นที่จริง มีระบบ PIN เข้าสู่ระบบ' },
    { icon: MapPin, title: 'ติดตามเรียลไทม์', desc: 'เห็นตำแหน่งคนขับบนแผนที่ตั้งแต่กดเรียกจนถึงจุดหมาย' },
    { icon: Heart, title: 'บันทึกคนขับโปรด', desc: 'เรียกใช้บริการคนขับที่คุณไว้ใจได้เสมอ ด้วยระบบ Favorite Driver' },
    { icon: CalendarClock, title: 'เรียกหรือนัดล่วงหน้า', desc: 'จะเรียกใช้งานทันที หรือนัดหมายเวลาล่วงหน้าก็ทำได้ง่ายๆ' },
  ];

  return (
    <section className="py-24 bg-[#04070B] relative overflow-hidden" id="passenger-benefits">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#A3FF3F]/10 border border-[#A3FF3F]/30 text-[#A3FF3F] mb-6"
          >
            <User className="w-5 h-5" />
            <span className="font-bold font-kanit text-sm">สำหรับผู้โดยสาร</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-black text-white font-kanit tracking-tight"
          >
            ประสบการณ์การเดินทาง <br />
            ที่เหนือกว่าสำหรับคุณ
          </motion.h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Interactive Carousel / Phones */}
          <div className="relative h-[500px] flex justify-center items-center">
            <div className="absolute inset-0 bg-[#A3FF3F]/5 rounded-full blur-[100px]" />
            
            {/* Phone Mockup Center */}
            <motion.div 
              initial={{ y: 0 }}
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="relative w-[260px] h-[520px] bg-[#0B1120] rounded-[40px] border-4 border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] shadow-[#A3FF3F]/10 overflow-hidden z-20"
            >
              {/* Header */}
              <div className="bg-gray-900 p-4 pt-8">
                <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 border border-gray-700">
                  <Search className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400 text-sm font-kanit">จะไปที่ไหนดี?</span>
                </div>
              </div>
              
              {/* Map Area */}
              <div className="h-64 bg-gray-800 relative">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                   <div className="w-12 h-12 bg-[#A3FF3F]/20 rounded-full flex items-center justify-center animate-pulse">
                     <div className="w-4 h-4 bg-[#A3FF3F] rounded-full shadow-[0_0_10px_#A3FF3F]" />
                   </div>
                </div>
              </div>

              {/* Bottom Sheet */}
              <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl p-5 border-t border-gray-800">
                <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-4" />
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-white font-bold font-kanit">วินใกล้คุณ</div>
                    <div className="text-gray-400 text-xs font-kanit">รอประมาณ 2 นาที</div>
                  </div>
                  <div className="text-[#A3FF3F] font-bold font-kanit">฿40</div>
                </div>
                <button className="w-full py-3 bg-[#A3FF3F] text-[#04070B] rounded-xl font-bold font-kanit shadow-[0_0_15px_rgba(163,255,63,0.3)]">
                  ยืนยันการเรียก
                </button>
              </div>
            </motion.div>

            {/* Floating Element Left */}
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="absolute left-0 top-1/4 w-48 bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-xl z-30"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-white text-sm font-bold font-kanit">PIN Security</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="w-3 h-3 rounded-full bg-gray-700" />
                ))}
              </div>
            </motion.div>

            {/* Floating Element Right */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="absolute right-0 bottom-1/4 w-52 bg-[#0B1120] border border-gray-700 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-30"
            >
              <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2">
                <span className="text-white text-sm font-bold font-kanit">คนขับโปรด</span>
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800 rounded-full" />
                <div>
                  <div className="text-gray-300 text-sm font-kanit">พี่เอก วินปากซอย</div>
                  <div className="text-[#A3FF3F] text-xs font-kanit">พร้อมรับงาน</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Features List */}
          <div className="space-y-8">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-5"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#A3FF3F]/10 border border-[#A3FF3F]/30 flex-shrink-0 flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-[#A3FF3F]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-kanit mb-2">{feature.title}</h3>
                  <p className="text-gray-400 font-kanit leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
