'use client';

import { motion } from 'framer-motion';
import { QrCode, ScanLine, Share2, Coins, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function QrInviteSection() {
  return (
    <section className="py-24 bg-[#04070B] border-t border-gray-900 relative overflow-hidden" id="qr-invite">
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-[#A3FF3F]/10 rounded-full blur-[150px] -translate-y-1/2" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#A3FF3F]/10 border border-[#A3FF3F]/30 text-[#A3FF3F] mb-6"
            >
              <QrCode className="w-5 h-5" />
              <span className="font-bold font-kanit text-sm uppercase">Referral System</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-black text-white font-kanit tracking-tight mb-6"
            >
              เชิญผู้โดยสาร <br />
              รับแต้มฟรีทั้งคู่
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-400 font-kanit mb-10"
            >
              คนขับสามารถสร้าง QR Code ส่วนตัวให้ผู้โดยสารสแกนเพื่อโหลดแอป ทันทีที่สมัครสำเร็จ ได้รับแต้มฟรีไปเลย 100 แต้ม ทั้งคนขับและผู้โดยสาร!
            </motion.p>

            <div className="space-y-6">
              {[
                { icon: ScanLine, text: 'ผู้โดยสารสแกน QR Code จากเสื้อวิน' },
                { icon: Share2, text: 'หรือแชร์ลิงก์เชิญผ่าน Line / Facebook' },
                { icon: Coins, text: 'รับแต้มโบนัสอัตโนมัติเมื่อสมัครสำเร็จ' },
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + (idx * 0.1) }}
                  className="flex items-center gap-4 bg-gray-900/50 p-4 rounded-2xl border border-gray-800"
                >
                  <div className="w-10 h-10 rounded-full bg-[#A3FF3F]/20 flex items-center justify-center text-[#A3FF3F] shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-white font-kanit font-medium">{item.text}</span>
                </motion.div>
              ))}
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="mt-10"
            >
              <Link href="/register?type=driver" className="inline-flex items-center gap-2 text-[#A3FF3F] font-kanit font-bold hover:gap-3 transition-all">
                ดูรายละเอียดเพิ่มเติม <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>

          {/* Right: QR Dashboard Preview */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="perspective-1000"
          >
            <div className="bg-gradient-to-br from-[#0B1120] to-[#04070B] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              {/* Top Banner */}
              <div className="bg-gradient-to-r from-[#A3FF3F] to-[#B7FF57] rounded-2xl p-6 text-[#04070B] mb-8 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/20 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2" />
                <h3 className="font-kanit font-black text-2xl mb-1">แต้มแนะนำสะสม</h3>
                <div className="text-4xl font-black">1,500 <span className="text-lg">แต้ม</span></div>
              </div>

              {/* QR Area */}
              <div className="flex flex-col items-center bg-white p-6 rounded-2xl mb-8">
                <QrCode className="w-40 h-40 text-black mb-4" />
                <div className="text-center font-kanit text-gray-800 font-bold">สแกนเพื่อโหลด GOZIPP</div>
                <div className="text-center font-kanit text-gray-500 text-sm">รหัสแนะนำ: WIN-001</div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <div className="text-gray-400 font-kanit text-sm mb-1">ชวนสำเร็จ</div>
                  <div className="text-white font-bold text-2xl">15 <span className="text-sm">คน</span></div>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <div className="text-gray-400 font-kanit text-sm mb-1">สถานะ</div>
                  <div className="text-[#A3FF3F] font-bold font-kanit flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#A3FF3F] animate-pulse" />
                    พร้อมใช้งาน
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
