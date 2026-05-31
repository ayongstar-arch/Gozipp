'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export default function FaqSection() {
  const faqs = [
    { q: 'ระบบคิวทำงานอย่างไร?', a: 'GOZIPP ใช้ระบบคิวอัจฉริยะแบบมาก่อนได้ก่อน (First In, First Out) โดยเรียงลำดับจากเวลาที่คนขับกดออนไลน์ในแอป ทำให้โปร่งใสและยุติธรรมสำหรับทุกคน' },
    { q: 'มีการหักเปอร์เซ็นต์ (GP) หรือไม่?', a: 'ในระยะเริ่มต้น GOZIPP ไม่มีการหัก GP ใดๆ ทั้งสิ้น คนขับจะได้รับรายได้เต็มจำนวนจากผู้โดยสารโดยตรง' },
    { q: 'จ่ายเงินอย่างไร?', a: 'ปัจจุบันผู้โดยสารสามารถจ่ายเงินสด หรือโอนผ่าน QR Code PromptPay ให้กับคนขับได้โดยตรง' },
    { q: 'ใช้แต้มอย่างไร?', a: 'แต้มที่ได้รับฟรีจากการสมัครหรือการแนะนำ สามารถใช้เป็นส่วนลดค่าโดยสารในอนาคตเมื่อระบบเปิดใช้งานเต็มรูปแบบ' },
    { q: 'สมัครคนขับอย่างไร?', a: 'ดาวน์โหลดแอป GOZIPP เลือก "สมัครคนขับ" จากนั้นทำตามขั้นตอน กรอกข้อมูลส่วนตัว และเข้าร่วมวินในพื้นที่ของคุณได้ทันที' },
    { q: 'นัดคนขับล่วงหน้าได้หรือไม่?', a: 'ได้ครับ! ผู้โดยสารสามารถเลือกฟีเจอร์ "นัดหมายล่วงหน้า" และระบุเวลาที่ต้องการให้คนขับมารับได้เลย' },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="py-24 bg-[#04070B] border-t border-gray-900 relative" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 border border-gray-800 text-gray-400 mb-6"
          >
            <HelpCircle className="w-8 h-8" />
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-black text-white font-kanit tracking-tight"
          >
            คำถามที่พบบ่อย
          </motion.h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${
                openIdx === idx ? 'bg-gray-900/80 border-[#A3FF3F]/50 shadow-[0_0_20px_rgba(163,255,63,0.1)]' : 'bg-transparent border-gray-800 hover:border-gray-700'
              }`}
            >
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between text-left"
              >
                <span className={`font-kanit font-bold text-lg ${openIdx === idx ? 'text-[#A3FF3F]' : 'text-white'}`}>
                  {faq.q}
                </span>
                <span className="ml-4 flex-shrink-0 text-gray-400">
                  {openIdx === idx ? <Minus className="w-5 h-5 text-[#A3FF3F]" /> : <Plus className="w-5 h-5" />}
                </span>
              </button>
              
              <AnimatePresence>
                {openIdx === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-gray-400 font-kanit leading-relaxed border-t border-gray-800/50 pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
