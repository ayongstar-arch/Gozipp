'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function TestimonialSection() {
  const testimonials = [
    {
      name: 'คุณแพรวา',
      role: 'ผู้โดยสาร',
      text: 'เรียกวินง่ายมาก รอไม่นาน คนขับในพื้นที่บริการดีค่ะ',
      avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=Jocelyn&backgroundColor=transparent&facialHairProbability=0', // Female-ish seed
    },
    {
      name: 'พี่ต้น',
      role: 'คนขับวิน',
      text: 'เข้าคิวยุติธรรม ได้งานเพิ่มขึ้นจริง แอปใช้งานง่ายมาก',
      avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=Felix&backgroundColor=transparent&facialHairProbability=0', // Male-ish seed
    },
    {
      name: 'เฮียสมชาย',
      role: 'หัวหน้าวิน',
      text: 'ระบบช่วยให้วินเป็นระเบียบ ลูกค้าเพิ่มขึ้นเยอะเลยครับ',
      avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=Bandit&backgroundColor=transparent', // Another Male-ish seed
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="py-16 bg-[#04070B] relative overflow-hidden" id="testimonials">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12">
           <motion.h2 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="text-3xl lg:text-4xl font-black text-white font-kanit tracking-tight"
           >
             ผู้ใช้งานจริง พูดถึง <span className="text-[#A3FF3F]">GOZIPP</span>
           </motion.h2>
        </div>

        <div className="relative">
          {/* Navigation Arrows for Desktop */}
          <button onClick={handlePrev} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-20 w-12 h-12 rounded-full border border-gray-700 bg-[#0B1120] items-center justify-center text-white hover:border-[#A3FF3F] hover:text-[#A3FF3F] transition-all">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
             </svg>
          </button>
          
          <button onClick={handleNext} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-20 w-12 h-12 rounded-full border border-gray-700 bg-[#0B1120] items-center justify-center text-white hover:border-[#A3FF3F] hover:text-[#A3FF3F] transition-all">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
             </svg>
          </button>

          <div className="overflow-hidden">
            <motion.div 
              className="flex gap-6 transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(calc(-${currentIndex * 100}% - ${currentIndex * 1.5}rem))` }}
            >
              {testimonials.map((testimonial, idx) => (
                <div
                  key={idx}
                  className="w-full md:w-[calc(33.333%-1rem)] shrink-0 bg-[#0B1120] border border-gray-800 rounded-[28px] p-6 relative group transition-colors flex flex-row items-center gap-6 overflow-hidden"
                >
                  {/* Big Avatar on Left with Green Circle background */}
                  <div className="relative w-28 h-28 shrink-0 flex items-center justify-center ml-2">
                     <div className="absolute inset-0 bg-[#A3FF3F] rounded-full scale-[0.85] opacity-90 shadow-[0_0_20px_rgba(163,255,63,0.3)]" />
                     <img 
                       src={testimonial.avatar} 
                       alt={testimonial.name} 
                       className="relative z-10 w-full h-full object-contain scale-[1.3] -translate-y-2 drop-shadow-xl" 
                     />
                  </div>

                  {/* Text Right */}
                  <div className="flex-1 flex flex-col pt-2">
                    <p className="text-gray-200 font-kanit text-sm leading-relaxed mb-4">
                      "{testimonial.text}"
                    </p>
                    
                    <div className="mt-auto">
                      <div className="text-white font-bold font-kanit text-sm">{testimonial.name}</div>
                      <div className="text-[#A3FF3F] text-xs font-kanit font-medium">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Mobile Navigation Arrows */}
        <div className="flex md:hidden justify-center gap-4 mt-8">
            <button onClick={handlePrev} className="w-12 h-12 rounded-full border border-gray-700 bg-[#0B1120] flex items-center justify-center text-white hover:border-[#A3FF3F] transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={handleNext} className="w-12 h-12 rounded-full border border-gray-700 bg-[#0B1120] flex items-center justify-center text-white hover:border-[#A3FF3F] transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
        </div>
      </div>
    </section>
  );
}
