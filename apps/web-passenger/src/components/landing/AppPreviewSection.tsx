'use client';

import { motion } from 'framer-motion';
import { Smartphone } from 'lucide-react';

export default function AppPreviewSection() {

  return (
    <section className="py-12 bg-[#04070B] relative overflow-hidden" id="app-preview">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-[#A3FF3F]/5 rounded-l-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Layout */}
          <div className="flex flex-col space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 border border-gray-800 text-white w-fit"
            >
              <Smartphone className="w-4 h-4 text-[#A3FF3F]" />
              <span className="font-bold font-kanit text-sm">แอปเดียวครบ ทั้งผู้โดยสารและคนขับ</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-black text-white font-kanit tracking-tight leading-tight"
            >
              ดาวน์โหลด <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A3FF3F] to-[#B7FF57]">GOZIPP</span><br />
              พร้อมใช้งานวันนี้
            </motion.h2>

            <motion.ul 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {[
                'รองรับทั้ง iOS และ Android',
                'สลับโหมดผู้โดยสาร-คนขับได้ในแอปเดียว',
                'ใช้งานฟรี ไม่มีค่าใช้จ่ายแอบแฝง'
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300 font-kanit font-medium text-lg">
                  <div className="w-6 h-6 rounded-full bg-[#A3FF3F]/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-[#A3FF3F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>{text}</span>
                </li>
              ))}
            </motion.ul>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-6 pt-4"
            >
              <div className="w-32 h-32 bg-white rounded-2xl p-2 shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.1)] border-2 border-transparent hover:border-[#A3FF3F] transition-colors cursor-pointer">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://gozipp.com" alt="GOZIPP QR Code" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col gap-4">
                <a href="/" className="hover:scale-105 transition-transform origin-left">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" className="h-14 object-contain" />
                </a>
                <a href="/" className="hover:scale-105 transition-transform origin-left">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on the App Store" className="h-14 object-contain" />
                </a>
              </div>
            </motion.div>
          </div>

          {/* Right Layout: 4 Overlapping Phones */}
          <div className="relative h-[600px] w-full flex items-center justify-center">
             
             {/* Phone 1 (Far Left - Queue) */}
             <motion.div 
               initial={{ opacity: 0, x: 100, y: 50, rotate: 0 }}
               whileInView={{ opacity: 0.5, x: -90, y: 40, rotate: -12 }}
               animate={{ y: [40, 45, 40] }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, ease: "easeOut", y: { repeat: Infinity, duration: 4, ease: "easeInOut" } }}
               className="absolute w-[220px] h-[480px] bg-[#0B1120] rounded-[32px] border-4 border-gray-800 shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden z-10"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-none" />
                <div className="h-12 bg-gray-800 flex justify-center items-center">
                    <span className="text-white font-kanit text-xs">หน้าคิววิน</span>
                </div>
                <div className="p-4 space-y-3"><div className="w-full h-16 bg-gray-800 rounded-xl"/><div className="w-full h-16 bg-gray-800 rounded-xl"/></div>
             </motion.div>

             {/* Phone 2 (Mid Left - Chat) */}
             <motion.div 
               initial={{ opacity: 0, x: 50, y: 50, rotate: 0 }}
               whileInView={{ opacity: 0.7, x: -30, y: 20, rotate: -4 }}
               animate={{ y: [20, 25, 20] }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, ease: "easeOut", delay: 0.1, y: { repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.5 } }}
               className="absolute w-[220px] h-[480px] bg-[#0B1120] rounded-[32px] border-4 border-gray-800 shadow-[0_25px_50px_rgba(0,0,0,0.8)] overflow-hidden z-20"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-transparent pointer-events-none" />
                <div className="h-12 bg-gray-800 flex justify-center items-center">
                    <span className="text-white font-kanit text-xs">หน้าแชท</span>
                </div>
                <div className="p-4 space-y-3"><div className="w-3/4 h-10 bg-gray-800 rounded-xl"/><div className="w-3/4 h-10 bg-[#A3FF3F]/20 rounded-xl ml-auto"/></div>
             </motion.div>

             {/* Phone 3 (Mid Right - Map) */}
             <motion.div 
               initial={{ opacity: 0, x: -50, y: 50, rotate: 0 }}
               whileInView={{ opacity: 0.9, x: 30, y: 0, rotate: 4 }}
               animate={{ y: [0, -5, 0] }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, ease: "easeOut", delay: 0.2, y: { repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.2 } }}
               className="absolute w-[220px] h-[480px] bg-[#0B1120] rounded-[32px] border-4 border-gray-800 shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden z-30"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-[#A3FF3F]/20 to-transparent pointer-events-none" />
                <div className="h-12 bg-gray-800 flex justify-center items-center">
                    <span className="text-white font-kanit text-xs">หน้าแผนที่</span>
                </div>
                <div className="flex-1 bg-gray-800 relative h-full">
                  <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#A3FF3F] rounded-full shadow-[0_0_15px_#A3FF3F]" />
                </div>
             </motion.div>

             {/* Phone 4 (Far Right - Points) */}
             <motion.div 
               initial={{ opacity: 0, x: -100, y: 50, rotate: 0 }}
               whileInView={{ opacity: 1, x: 90, y: -20, rotate: 12 }}
               animate={{ y: [-20, -25, -20] }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, ease: "easeOut", delay: 0.3, y: { repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.8 } }}
               className="absolute w-[240px] h-[520px] bg-[#04070B] rounded-[36px] border-[6px] border-[#0B1120] shadow-[0_40px_80px_rgba(0,0,0,0.9)] shadow-[#A3FF3F]/10 overflow-hidden z-40"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none" />
                <div className="h-14 bg-gray-900 flex justify-center items-center border-b border-gray-800">
                    <span className="text-white font-kanit text-sm font-bold">หน้าแต้มสะสม</span>
                </div>
                <div className="p-6 flex flex-col items-center mt-4">
                   <div className="w-20 h-20 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center mb-4">
                      <span className="text-yellow-500 font-bold text-xl">100</span>
                   </div>
                   <div className="w-full h-8 bg-gray-800 rounded-full" />
                </div>
             </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
}
