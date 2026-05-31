'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ListOrdered, Bike, ChevronRight, ChevronDown } from 'lucide-react';

export default function HowItWorksSection() {
  const passengerSteps = [
    { type: 'image', src: '/images/step-p1.png', title: 'สมัครและรับแต้มฟรี', desc: 'รับฟรี 100 แต้มสำหรับผู้ใช้ใหม่' },
    { type: 'image', src: '/images/step-p2.png', title: 'ค้นหา / เรียกวิน', desc: 'เลือกระบุจุดรับส่งที่ต้องการ' },
    { type: 'image', src: '/images/step-p3.png', title: 'พบคนขับและเดินทาง', desc: 'ติดตามและเดินทางอย่างปลอดภัย' },
  ];

  const driverSteps = [
    { type: 'image', src: '/images/step-d1.png', title: 'สมัครและยืนยันตัวตน', desc: 'ลงทะเบียนง่ายๆ พร้อมขับ' },
    { type: 'icon', icon: ListOrdered, title: 'เข้าคิววินในพื้นที่', desc: 'ระบบคิวโปร่งใสยุติธรรม' },
    { type: 'icon', icon: Bike, title: 'รับงานและให้บริการ', desc: 'รับรายได้เต็มไม่หัก GP' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const renderIcon = (step: any) => {
    if (step.type === 'image') {
      return (
        <img 
          src={step.src} 
          alt={step.title} 
          className="w-14 h-14 object-contain drop-shadow-[0_0_8px_rgba(163,255,63,0.8)]"
        />
      );
    }
    const Icon = step.icon;
    return <Icon className="w-10 h-10 text-[#A3FF3F]" />;
  };

  return (
    <section className="py-12 bg-[#04070B] relative overflow-hidden" id="how-it-works">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-black text-white font-kanit tracking-tight"
          >
            ใช้งานง่าย ใน 3 ขั้นตอน
          </motion.h2>
          <div className="w-24 h-1 bg-[#A3FF3F] mx-auto mt-6 rounded-full shadow-[0_0_10px_#A3FF3F]" />
        </div>

        {/* Changed from space-y-20 to a side-by-side grid on large screens */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Passenger Steps */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="bg-[#0B1120] border border-gray-800 rounded-3xl p-6 lg:p-10 shadow-xl"
          >
            <h3 className="text-2xl font-bold text-white font-kanit mb-10 flex items-center justify-center gap-3">
              <span className="bg-[#A3FF3F]/10 text-[#A3FF3F] px-6 py-2 rounded-full border border-[#A3FF3F]/30">สำหรับผู้โดยสาร</span>
            </h3>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
              {passengerSteps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <motion.div variants={itemVariants} className="flex-1 flex flex-col items-center text-center group w-full md:w-auto relative z-10">
                    <div className="w-20 h-20 rounded-full bg-[#04070B] border-2 border-[#A3FF3F] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(163,255,63,0.4)] group-hover:scale-110 transition-transform overflow-hidden">
                      {renderIcon(step)}
                    </div>
                    <h4 className="text-lg font-bold text-white font-kanit mb-2">{step.title}</h4>
                    <p className="text-gray-400 text-xs font-kanit">{step.desc}</p>
                  </motion.div>
                  
                  {idx < passengerSteps.length - 1 && (
                    <div className="hidden md:block text-[#A3FF3F]/50 mb-8 shrink-0">
                      <ChevronRight className="w-8 h-8" />
                    </div>
                  )}
                  {idx < passengerSteps.length - 1 && (
                    <div className="block md:hidden text-[#A3FF3F]/50 my-2">
                      <ChevronDown className="w-8 h-8" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </motion.div>

          {/* Driver Steps */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="bg-[#0B1120] border border-gray-800 rounded-3xl p-6 lg:p-10 shadow-xl"
          >
            <h3 className="text-2xl font-bold text-white font-kanit mb-10 flex items-center justify-center gap-3">
              <span className="bg-[#A3FF3F]/10 text-[#A3FF3F] px-6 py-2 rounded-full border border-[#A3FF3F]/30">สำหรับคนขับ (วิน)</span>
            </h3>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
              {driverSteps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <motion.div variants={itemVariants} className="flex-1 flex flex-col items-center text-center group w-full md:w-auto relative z-10">
                    <div className="w-20 h-20 rounded-full bg-[#04070B] border-2 border-[#A3FF3F] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(163,255,63,0.4)] group-hover:scale-110 transition-transform overflow-hidden">
                      {renderIcon(step)}
                    </div>
                    <h4 className="text-lg font-bold text-white font-kanit mb-2">{step.title}</h4>
                    <p className="text-gray-400 text-xs font-kanit">{step.desc}</p>
                  </motion.div>
                  
                  {idx < driverSteps.length - 1 && (
                    <div className="hidden md:block text-[#A3FF3F]/50 mb-8 shrink-0">
                      <ChevronRight className="w-8 h-8" />
                    </div>
                  )}
                  {idx < driverSteps.length - 1 && (
                    <div className="block md:hidden text-[#A3FF3F]/50 my-2">
                      <ChevronDown className="w-8 h-8" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
