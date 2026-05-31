'use client';

import { motion } from 'framer-motion';
import { Bike, Map, CalendarClock, QrCode, MessageCircle, Wallet } from 'lucide-react';

export default function DriverBenefitsSection() {
  const benefits = [
    { icon: Map, title: 'เลือกวินอิสระ', desc: 'สามารถเข้าร่วมวินในพื้นที่ของคุณ หรือสร้างวินใหม่สำหรับชุมชน' },
    { icon: CalendarClock, title: 'ยืดหยุ่นเวลา', desc: 'เปิดรับงานเมื่อพร้อม ปิดเมื่อต้องการพักผ่อน ไม่มีข้อผูกมัด' },
    { icon: Wallet, title: 'รายได้เต็มเม็ด', desc: 'ไม่มีการหักเปอร์เซ็นต์ (GP) รับเงินสดจากผู้โดยสารโดยตรง' },
    { icon: QrCode, title: 'QR แนะนำลูกค้า', desc: 'มี QR Code ประจำตัว ให้ผู้โดยสารสแกนเรียกคุณได้ง่ายๆ และรับโบนัสแนะนำ' },
    { icon: MessageCircle, title: 'แชทกับผู้โดยสาร', desc: 'ระบบแชทในตัว ช่วยให้สื่อสารจุดรับ-ส่งได้แม่นยำ ไม่ต้องโทรให้เปลืองค่าโทร' },
  ];

  return (
    <section className="py-24 bg-[#0B1120] relative" id="driver-benefits">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          {/* Left: Content */}
          <div className="flex-1">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 mb-6"
            >
              <Bike className="w-5 h-5" />
              <span className="font-bold font-kanit text-sm">สำหรับคนขับวิน</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-black text-white font-kanit tracking-tight mb-8"
            >
              ยกระดับอาชีพคนขับวิน <br />
              สู่ยุคดิจิทัลเต็มรูปแบบ
            </motion.h2>

            <div className="space-y-6">
              {benefits.map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + (idx * 0.1) }}
                  className="flex gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 flex-shrink-0 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:border-blue-500/50 transition-colors">
                    <item.icon className="w-6 h-6 text-gray-400 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white font-kanit mb-1">{item.title}</h4>
                    <p className="text-gray-400 font-kanit text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: UI Mockup Grid */}
          <div className="flex-1 relative w-full aspect-square lg:aspect-auto lg:h-[600px]">
            <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-[100px]" />
            

            {/* Mockup 2: Incoming Ride */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="absolute top-[40%] left-[5%] w-[260px] bg-[#04070B] border-2 border-blue-500 rounded-3xl p-5 shadow-[0_0_30px_rgba(59,130,246,0.3)] z-20"
            >
              <div className="animate-pulse absolute inset-0 bg-blue-500/10 rounded-3xl" />
              <div className="relative z-10">
                <div className="text-center mb-4">
                  <div className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full font-kanit mb-2">
                    งานใหม่เข้า!
                  </div>
                  <div className="text-white font-bold font-kanit text-lg">ระยะทาง 2.5 กม.</div>
                </div>
                <div className="bg-gray-900 p-3 rounded-xl mb-4 border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-gray-300 text-xs font-kanit">หน้าปากซอย 15</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#A3FF3F]" />
                    <span className="text-gray-300 text-xs font-kanit">สถานีรถไฟฟ้า</span>
                  </div>
                </div>
                <button className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold font-kanit shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                  รับงาน
                </button>
              </div>
            </motion.div>

            {/* Mockup 3: QR Invite */}
            <motion.div 
              initial={{ opacity: 0, y: 40, rotate: 5 }}
              whileInView={{ opacity: 1, y: 0, rotate: 5 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ rotate: 0, scale: 1.05, zIndex: 30 }}
              className="absolute bottom-[10%] right-[15%] w-[200px] bg-gray-900 border border-gray-700 rounded-3xl p-5 shadow-2xl z-10 text-center"
            >
              <div className="text-white font-bold font-kanit mb-1">สแกนเรียกพี่วิน</div>
              <div className="text-gray-400 text-xs font-kanit mb-4">รับฟรี 100 แต้ม!</div>
              <div className="bg-white p-2 rounded-xl inline-block mb-3">
                <QrCode className="w-24 h-24 text-black" />
              </div>
              <div className="text-blue-400 text-xs font-kanit font-bold">แชร์ให้ลูกค้า</div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
