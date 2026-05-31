'use client';

import { motion } from 'framer-motion';
import { Smartphone, Zap, MapPin, CreditCard, Shield, Clock, Users, Gift } from 'lucide-react';

const features = [
  {
    icon: <Zap className="w-6 h-6 text-lime-400" />,
    title: 'เรียกปุ๊บ มาปั๊บ',
    description: 'ค้นหาวินที่ใกล้ที่สุดอัตโนมัติ ไม่ต้องรอนานด้วยระบบจับคู่แบบ Real-time',
  },
  {
    icon: <Shield className="w-6 h-6 text-lime-400" />,
    title: 'ปลอดภัย ไว้ใจได้',
    description: 'คนขับทุกคนผ่านการยืนยันตัวตน มีเสื้อวินและป้ายเหลืองถูกต้องตามกฎหมาย',
  },
  {
    icon: <CreditCard className="w-6 h-6 text-lime-400" />,
    title: 'จ่ายง่าย หลายช่องทาง',
    description: 'รองรับการสแกนจ่ายผ่าน QR Code, โอนเงิน หรือเงินสด สะดวกทุกสไตล์',
  },
  {
    icon: <MapPin className="w-6 h-6 text-lime-400" />,
    title: 'ราคามาตรฐาน',
    description: 'คำนวณราคาตามระยะทางจริงจาก GPS โปร่งใส ไม่มีการโก่งราคา',
  },
  {
    icon: <Clock className="w-6 h-6 text-lime-400" />,
    title: 'ระบบคิวอัจฉริยะ',
    description: 'กระจายงานให้คนขับอย่างเป็นธรรม ผู้โดยสารได้รถไว คนขับได้งานชัวร์',
  },
  {
    icon: <Smartphone className="w-6 h-6 text-lime-400" />,
    title: 'PIN Login',
    description: 'เข้าสู่ระบบด้วยรหัส PIN 6 หลัก สะดวก ปลอดภัย ไม่ต้องจำรหัสผ่านยาวๆ',
  },
  {
    icon: <Users className="w-6 h-6 text-lime-400" />,
    title: 'บันทึกคนขับคนโปรด',
    description: 'ประทับใจบริการ กดบันทึกเป็นคนขับคนโปรดเพื่อเรียกใช้ในครั้งต่อไปได้',
  },
  {
    icon: <Gift className="w-6 h-6 text-lime-400" />,
    title: 'แนะนำเพื่อนได้พอยต์',
    description: 'ชวนเพื่อนมาใช้ GOZIPP รับพอยต์สะสม แลกส่วนลดค่าโดยสารได้ทันที',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative bg-[#0A0E0C]">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              ฟีเจอร์ที่ตอบโจทย์การเดินทางของคุณ
            </h2>
            <p className="text-lg text-gray-400">
              ยกระดับประสบการณ์การเดินทางด้วยมอเตอร์ไซค์รับจ้าง ด้วยฟีเจอร์ที่ออกแบบมาเพื่อคนไทยโดยเฉพาะ
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-[#131A17] p-6 rounded-3xl border border-green-500/10 hover:border-lime-400/30 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-lime-400/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
