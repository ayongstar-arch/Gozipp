'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, UserCheck, Timer, ArrowDownCircle } from 'lucide-react';

export default function QueueSystemSection() {
  const drivers = [
    { id: 1, name: 'พี่สมชาย', time: 'ออนไลน์ 2 ชม.', status: 'คิวที่ 1', active: true },
    { id: 2, name: 'พี่วิชัย', time: 'ออนไลน์ 1 ชม.', status: 'คิวที่ 2', active: false },
    { id: 3, name: 'พี่เอก', time: 'เพิ่งออนไลน์', status: 'คิวที่ 3', active: false },
  ];

  return (
    <section className="py-24 bg-[#04070B] relative overflow-hidden" id="queue">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Visualization */}
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#A3FF3F]/10 rounded-full blur-[100px]" />
            
            <div className="relative bg-[#0B1120] border border-gray-800 rounded-3xl p-8 shadow-[0_0_40px_rgba(163,255,63,0.15)]">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white font-kanit">กระดานคิวปัจจุบัน</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#A3FF3F] animate-pulse" />
                  <span className="text-[#A3FF3F] text-sm font-kanit">อัปเดตเรียลไทม์</span>
                </div>
              </div>

              <div className="space-y-4">
                {drivers.map((driver, idx) => (
                  <motion.div
                    key={driver.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.2 }}
                    className={`relative p-4 rounded-xl border flex items-center justify-between ${
                      driver.active 
                        ? 'bg-[#A3FF3F]/10 border-[#A3FF3F]/50 shadow-[0_0_20px_rgba(163,255,63,0.2)]' 
                        : 'bg-gray-900 border-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        driver.active ? 'bg-[#A3FF3F] text-[#04070B]' : 'bg-gray-800 text-gray-400'
                      }`}>
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-white font-bold font-kanit">{driver.name}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 font-kanit mt-1">
                          <Timer className="w-3 h-3" />
                          {driver.time}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`px-4 py-2 rounded-lg font-bold font-kanit ${
                      driver.active ? 'bg-[#A3FF3F] text-[#04070B]' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {driver.status}
                    </div>

                    {driver.active && (
                      <motion.div 
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#A3FF3F] rounded-full blur-[2px] shadow-[0_0_10px_#A3FF3F]" 
                      />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 text-[#A3FF3F] mb-4"
            >
              <ShieldCheck className="w-6 h-6" />
              <span className="font-bold tracking-wider uppercase text-sm">Transparent Queue Engine</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-black text-white font-kanit tracking-tight mb-6"
            >
              ระบบคิวยุติธรรม <br />
              โปร่งใส ตรวจสอบได้
            </motion.h2>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-6 text-lg text-gray-400 font-kanit"
            >
              <p>
                ลาก่อนปัญหาการแซงคิวหรือความไม่ยุติธรรม GOZIPP ใช้ระบบประมวลผลอัจฉริยะที่จัดอันดับคนขับอย่างเที่ยงตรง
              </p>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <ArrowDownCircle className="w-6 h-6 text-[#A3FF3F] flex-shrink-0 mt-0.5" />
                  <span><strong>มาก่อนได้ก่อน:</strong> ระบบจัดคิวตามเวลาที่ออนไลน์จริง ใครออนไลน์ก่อน ได้รับงานก่อนเสมอ</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowDownCircle className="w-6 h-6 text-[#A3FF3F] flex-shrink-0 mt-0.5" />
                  <span><strong>แสดงผลเรียลไทม์:</strong> คนขับสามารถดูคิวของตัวเองและเพื่อนในวินได้ตลอดเวลาผ่านแอป</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowDownCircle className="w-6 h-6 text-[#A3FF3F] flex-shrink-0 mt-0.5" />
                  <span><strong>ไม่มีระบบเด็กเส้น:</strong> อัลกอริทึมทำงานอัตโนมัติบนเซิร์ฟเวอร์ ไม่มีการแทรกแซงหรือล็อคงานให้ใครเป็นพิเศษ</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
