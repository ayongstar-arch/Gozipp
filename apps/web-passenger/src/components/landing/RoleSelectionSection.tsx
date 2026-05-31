'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RoleSelectionSection() {
  return (
    <section className="py-12 bg-[#04070B] relative overflow-hidden" id="roles">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#A3FF3F]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-black text-white font-kanit tracking-tight"
          >
            คุณต้องการใช้งานในฐานะ?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-xl text-gray-400 font-kanit"
          >
            เลือกรูปแบบการใช้งานที่เหมาะกับคุณ
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Passenger Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="group relative bg-[#0B1120] border border-gray-800 rounded-[32px] p-8 overflow-hidden transition-all duration-300 hover:border-[#A3FF3F]/50 hover:shadow-[0_0_40px_rgba(163,255,63,0.15)] flex flex-row items-center gap-8 h-full"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#A3FF3F]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-[#A3FF3F]/20 transition-colors" />
            
            {/* Left side: 3D Image */}
            <div className="w-1/3 flex justify-center relative z-10 shrink-0">
               <img src="/images/passenger-3d.png" alt="Passenger 3D Placeholder" className="w-full h-auto object-contain drop-shadow-2xl transition-transform group-hover:scale-105" />
            </div>

            {/* Right side: Content */}
            <div className="flex-1 flex flex-col relative z-10 w-full h-full justify-between">
              <div>
                <h3 className="text-3xl font-black text-white font-kanit mb-6">ผู้โดยสาร</h3>
                <ul className="space-y-4 mb-8">
                  {[
                    'เรียกง่าย รอไม่นาน',
                    'แชทกับคนขับได้',
                    'นัดหมายล่วงหน้าได้',
                    'ปลอดภัย รู้จักคนขับ'
                  ].map((text, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300 font-kanit font-medium">
                      <div className="w-5 h-5 rounded-full bg-[#A3FF3F]/20 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#A3FF3F]" />
                      </div>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end">
                <Link href="/passenger" className="w-12 h-12 bg-[#A3FF3F] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(163,255,63,0.4)]">
                  <ArrowRight className="w-6 h-6 text-[#04070B]" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Driver Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="group relative bg-[#0B1120] border border-gray-800 rounded-[32px] p-8 overflow-hidden transition-all duration-300 hover:border-[#A3FF3F]/50 hover:shadow-[0_0_40px_rgba(163,255,63,0.15)] flex flex-row items-center gap-8 h-full"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-[#A3FF3F]/20 transition-colors" />
            
            {/* Left side: 3D Image */}
            <div className="w-1/3 flex justify-center relative z-10 shrink-0">
               <img src="/images/driver-3d.png" alt="Driver 3D Placeholder" className="w-full h-auto object-contain drop-shadow-2xl transition-transform group-hover:scale-105" />
            </div>

            {/* Right side: Content */}
            <div className="flex-1 flex flex-col relative z-10 w-full h-full justify-between">
              <div>
                <h3 className="text-3xl font-black text-white font-kanit mb-6">คนขับ (วิน)</h3>
                <ul className="space-y-4 mb-8">
                  {[
                    'เข้าคิวยุติธรรม',
                    'ไม่มี GP ระยะแรก',
                    'เพิ่มโอกาสรับงาน',
                    'ระบบชุมชนวิน'
                  ].map((text, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300 font-kanit font-medium">
                      <div className="w-5 h-5 rounded-full bg-[#A3FF3F]/20 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#A3FF3F]" />
                      </div>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end">
                <Link href="http://localhost:3000" className="w-12 h-12 bg-[#A3FF3F] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(163,255,63,0.4)] group-hover:bg-[#B7FF57]">
                  <ArrowRight className="w-6 h-6 text-[#04070B]" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
