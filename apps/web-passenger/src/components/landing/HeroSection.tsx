'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Gift, Percent } from 'lucide-react';
import Link from 'next/link';

export default function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <section className="relative h-[100vh] min-h-[700px] max-h-[900px] pt-16 pb-4 overflow-hidden bg-[#04070B] flex items-center">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-[#A3FF3F]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col space-y-5"
          >
            <motion.div variants={itemVariants}>
              <span className="text-white font-bold tracking-wider text-sm uppercase">GOZIPP</span>
            </motion.div>
            
            {/* Headline */}
            <motion.div variants={itemVariants} className="space-y-3 mt-[-10px]">
              <h1 className="text-4xl lg:text-6xl font-black text-white leading-tight tracking-tight font-kanit">
                เรียกวินง่าย <br />
                เข้าถึงคนขับจริงในพื้นที่
              </h1>
              <p className="text-lg text-gray-400 font-kanit max-w-lg leading-relaxed">
                แพลตฟอร์มวินมอเตอร์ไซค์ชุมชนยุคใหม่ <br/>รวดเร็ว ยุติธรรม และออกแบบเพื่อคนไทย
              </p>
            </motion.div>

            {/* Feature Bullets (1 Row) */}
            <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2 pt-2">
              {[
                { title: 'เรียกง่ายรอไม่นาน', icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#A3FF3F]" /> },
                { title: 'รู้จักคนขับในพื้นที่', icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#A3FF3F]" /> },
                { title: 'คิวยุติธรรมโปร่งใส', icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#A3FF3F]" /> },
                { title: 'ปลอดภัยมั่นใจได้', icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#A3FF3F]" /> }
              ].map((bullet, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 border border-[#A3FF3F]/50 rounded-xl p-2 bg-[#A3FF3F]/10 backdrop-blur-sm text-center">
                  {bullet.icon}
                  <span className="text-white font-kanit text-[10px] sm:text-xs font-medium leading-tight">{bullet.title}</span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/passenger"
                className="group relative px-6 py-3 bg-[#A3FF3F] text-[#04070B] rounded-xl font-bold font-kanit flex flex-col items-center justify-center gap-0.5 overflow-hidden shadow-[0_0_30px_rgba(163,255,63,0.4)] transition-all hover:scale-105"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <div className="flex items-center gap-2 relative z-10">
                  <span className="text-lg">สมัครผู้โดยสาร</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
                <span className="text-xs text-[#04070B]/70 relative z-10 font-medium">รับแต้มฟรี 100 แต้ม</span>
              </Link>
              <Link
                href="http://localhost:3000"
                className="group px-6 py-3 bg-[#0B1120] border border-gray-500 hover:border-[#A3FF3F]/50 text-white rounded-xl font-bold font-kanit flex flex-col items-center justify-center gap-0.5 transition-all hover:bg-gray-900"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">สมัครคนขับ</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
                <span className="text-xs text-gray-400 font-medium">เพิ่มโอกาสรับงาน</span>
              </Link>
            </motion.div>

            <motion.div variants={itemVariants}>
              <p className="text-sm text-gray-500 font-kanit mt-2">ใช้ฟรี! ไม่มีค่าใช้จ่ายในการใช้งาน</p>
            </motion.div>
          </motion.div>

          {/* Right Content - Mockup (Isometric) */}
          {/* Right Content - Mockup (Image 1 Style) */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            className="relative h-[650px] hidden lg:block rounded-[40px] overflow-hidden shadow-2xl border border-gray-800"
          >
            {/* Background Map outside the phone */}
            <img src="/images/iso-map.png" alt="Map background" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            
            {/* 3D Drivers on Map */}
            <motion.div animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-[15%] left-[10%] w-16 h-16">
              <img src="/images/driver-3d.png" alt="Driver" className="w-full h-full object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" />
              <div className="absolute -top-4 -right-8 bg-white text-[#04070B] text-[10px] font-bold px-2 py-1 rounded-t-lg rounded-br-lg shadow-lg">2 นาที</div>
            </motion.div>
            
            <motion.div animate={{ y: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 5, delay: 1 }} className="absolute top-[40%] right-[30%] w-20 h-20 z-10">
              <img src="/images/driver-3d.png" alt="Driver" className="w-full h-full object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" />
              <div className="absolute -top-4 -left-8 bg-white text-[#04070B] text-[10px] font-bold px-2 py-1 rounded-t-lg rounded-bl-lg shadow-lg">3 นาที</div>
            </motion.div>
            
            <motion.div animate={{ y: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 3.5, delay: 0.5 }} className="absolute bottom-[20%] left-[25%] w-24 h-24 z-10">
              <img src="/images/driver-3d.png" alt="Driver" className="w-full h-full object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.5)]" />
              <div className="absolute -top-5 -right-6 bg-[#A3FF3F] text-[#04070B] text-[12px] font-bold px-3 py-1.5 rounded-t-xl rounded-br-xl shadow-lg border border-white">1 นาที</div>
            </motion.div>

            {/* Phone Container */}
            <motion.div 
              animate={{ y: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="absolute -right-10 top-1/2 -translate-y-1/2 w-[340px] h-[640px] perspective-1000 z-20"
              style={{ transform: 'rotateX(5deg) rotateY(-15deg) rotateZ(2deg)' }}
            >
              {/* Main Phone Mockup */}
              <div className="w-full h-full bg-[#0F1115] rounded-[50px] border-[12px] border-[#1A1D24] shadow-[-30px_20px_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col relative z-20">
                {/* Status Bar */}
                <div className="flex justify-between items-center px-6 pt-4 pb-2 text-[11px] font-medium text-white">
                  <span>5:01</span>
                  <div className="flex gap-2 items-center">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21L15.6 16.2C14.6 15.4 13.4 15 12 15C10.6 15 9.4 15.4 8.4 16.2L12 21ZM12 3C7.9 3 4.2 4.7 1.4 7.6L3 9.6C5.3 7.2 8.5 5.7 12 5.7C15.5 5.7 18.7 7.2 21 9.6L22.6 7.6C19.8 4.7 16.1 3 12 3ZM12 9C9.3 9 6.8 10 4.9 11.9L6.5 13.9C7.9 12.4 9.9 11.5 12 11.5C14.1 11.5 16.1 12.4 17.5 13.9L19.1 11.9C17.2 10 14.7 9 12 9Z"/></svg>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10H18V14H15.6C15.1 15.4 14.2 16.6 13 17.5V20C13 20.6 12.6 21 12 21H6C5.4 21 5 20.6 5 20V17.5C3.8 16.6 2.9 15.4 2.4 14H0V10H2.4C2.9 8.6 3.8 7.4 5 6.5V4C5 3.4 5.4 3 6 3H12C12.6 3 13 3.4 13 4V6.5C14.2 7.4 15.1 8.6 15.6 10ZM12 12C12 10.3 10.7 9 9 9C7.3 9 6 10.3 6 12C6 13.7 7.3 15 9 15C10.7 15 12 13.7 12 12Z" fillOpacity="0.3"/><rect x="20" y="8" width="4" height="8" rx="1"/></svg>
                    <div className="w-6 h-3 bg-white rounded-sm relative"><div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-[-2px] w-0.5 h-1.5 bg-white rounded-r-sm" /></div>
                  </div>
                </div>

                {/* Top Header */}
                <div className="px-6 pt-3 pb-5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <img src="/brand/media__1779896490550.png" alt="Logo" className="h-8 object-contain" />
                  </div>
                  <div className="flex items-center gap-4 text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 flex-1 flex flex-col gap-5">
                  <h3 className="text-white font-kanit font-bold text-xl">ค้นหาวินใกล้คุณ</h3>
                  
                  {/* Inputs */}
                  <div className="flex flex-col gap-4">
                    <div className="bg-[#1A1D24] rounded-2xl p-5 flex flex-col gap-1 border border-gray-800">
                      <div className="text-gray-500 text-[11px] font-kanit">จุดรับ</div>
                      <div className="flex items-center gap-4">
                        <div className="w-5 h-5 rounded-full bg-[#A3FF3F]/20 flex items-center justify-center border-2 border-[#1A1D24] shadow-[0_0_0_1px_#A3FF3F]">
                           <div className="w-2 h-2 bg-[#A3FF3F] rounded-full" />
                        </div>
                        <span className="text-white font-kanit text-base flex-1">อนุสาวรีย์ชัยสมรภูมิ</span>
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>

                    <div className="bg-[#1A1D24] rounded-2xl p-5 flex flex-col gap-1 border border-gray-800 relative">
                      <div className="absolute left-[27px] -top-4 w-0.5 h-4 bg-gray-700 border-l border-dashed border-gray-600" />
                      <div className="text-gray-500 text-[11px] font-kanit">จุดหมาย</div>
                      <div className="flex items-center gap-4">
                        <div className="w-5 h-5 rounded-full bg-gray-700/50 flex items-center justify-center border-2 border-[#1A1D24] shadow-[0_0_0_1px_gray]">
                           <div className="w-2 h-2 bg-[#A3FF3F] rounded-full" />
                        </div>
                        <span className="text-white font-kanit text-base flex-1">เซ็นทรัล ลาดพร้าว</span>
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* Button */}
                  <button className="w-full py-5 mt-2 bg-gradient-to-r from-[#A3FF3F] to-[#B7FF57] text-[#04070B] rounded-2xl font-black font-kanit text-lg shadow-[0_15px_30px_rgba(163,255,63,0.3)]">
                    ค้นหาคนขับ
                  </button>
                </div>

                {/* Bottom Nav */}
                <div className="px-6 pb-8 mt-auto">
                  <div className="bg-[#1A1D24] rounded-[24px] p-5 flex justify-between items-center border border-gray-800">
                    <div className="flex flex-col items-center gap-2 group cursor-pointer">
                      <svg className="w-7 h-7 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-gray-500 text-[10px] font-kanit group-hover:text-gray-300 transition-colors">นัดหมาย</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 group cursor-pointer">
                      <svg className="w-7 h-7 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span className="text-gray-500 text-[10px] font-kanit group-hover:text-gray-300 transition-colors">ประวัติการเดินทาง</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 group cursor-pointer">
                      <svg className="w-7 h-7 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      <span className="text-gray-500 text-[10px] font-kanit group-hover:text-gray-300 transition-colors">แชทกับคนขับ</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* External Floating Elements */}
            <motion.div 
              animate={{ y: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 }}
              className="absolute bottom-12 left-8 w-[260px] bg-[#04070B]/90 backdrop-blur-xl border border-gray-800 rounded-3xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-30"
            >
              <div className="text-white text-base font-kanit font-bold mb-3">คิววินอนุสาวรีย์</div>
              <div className="flex justify-between items-end mb-2">
                <div className="text-[#A3FF3F] text-4xl font-black font-kanit tracking-tight">คิวที่ 5</div>
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                  <svg className="w-5 h-5 text-[#A3FF3F]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </div>
              </div>
              <div className="text-gray-400 text-sm font-kanit">รอประมาณ <span className="text-[#A3FF3F] font-bold">2</span> นาที</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

