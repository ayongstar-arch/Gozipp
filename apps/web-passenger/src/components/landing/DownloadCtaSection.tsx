'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DownloadCtaSection() {
  return (
    <section className="py-12 bg-[#04070B] relative overflow-hidden" id="download">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-r from-[#A3FF3F] to-[#B7FF57] rounded-[40px] p-8 md:p-16 text-center shadow-[0_0_50px_rgba(163,255,63,0.3)] overflow-hidden flex flex-col md:flex-row items-center justify-center min-h-[400px]"
        >
          {/* Background Elements */}
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20 pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

          {/* Left Character */}
          <div className="absolute left-0 bottom-0 w-1/3 max-w-[250px] hidden md:block">
            <img src="/images/passenger-3d.png" alt="Passenger Placeholder" className="w-full h-auto drop-shadow-2xl" />
          </div>

          {/* Center Content */}
          <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-black text-[#04070B] font-kanit tracking-tight mb-4 leading-tight">
              เริ่มต้นใช้งาน GOZIPP วันนี้
            </h2>
            <p className="text-lg text-[#04070B]/80 font-kanit font-medium mb-10 max-w-md">
              แพลตฟอร์มที่เข้าใจคนไทย สร้างสรรค์เพื่อยกระดับการเดินทางและคุณภาพชีวิตของคนในชุมชน
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 w-full">
              <Link
                href="/passenger"
                className="group relative px-6 py-3 bg-[#04070B] text-white rounded-xl font-bold font-kanit flex flex-col items-center justify-center gap-0.5 overflow-hidden shadow-xl transition-all hover:scale-105 flex-1"
              >
                <div className="flex items-center gap-2 relative z-10">
                  <span className="text-lg">สมัครผู้โดยสาร</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
                <span className="text-xs text-gray-400 relative z-10 font-medium">รับแต้มฟรี 100 แต้ม</span>
              </Link>
              
              <Link
                href="http://localhost:3000"
                className="group px-6 py-3 bg-white/20 border border-white/40 hover:bg-white/30 text-[#04070B] rounded-xl font-bold font-kanit flex flex-col items-center justify-center gap-0.5 transition-all flex-1 backdrop-blur-sm shadow-xl"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">สมัครคนขับ</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
                <span className="text-xs text-[#04070B]/70 font-medium">เพิ่มโอกาสรับงาน</span>
              </Link>
            </div>
            
            <p className="text-sm text-[#04070B]/70 font-kanit font-medium mt-6">ใช้ฟรี! ไม่มีค่าใช้จ่ายในการใช้งาน</p>
          </div>

          {/* Right Character */}
          <div className="absolute right-0 bottom-0 w-1/3 max-w-[250px] hidden md:block">
            <img src="/images/driver-3d.png" alt="Driver Placeholder" className="w-full h-auto drop-shadow-2xl -scale-x-100" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
