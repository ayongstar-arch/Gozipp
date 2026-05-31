'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, UserCheck, FileText, PhoneCall } from 'lucide-react';

const trustItems = [
  {
    icon: <UserCheck className="w-8 h-8 text-emerald-400" />,
    title: 'ยืนยันตัวตน 100%',
    desc: 'คนขับทุกคนต้องส่งเอกสารยืนยันตัวตน ใบขับขี่สาธารณะ และป้ายเหลือง ก่อนเริ่มรับงาน'
  },
  {
    icon: <FileText className="w-8 h-8 text-amber-400" />,
    title: 'ราคาโปร่งใส',
    desc: 'คำนวณราคาตามระยะทางจริง ไม่มีชาร์จเพิ่ม ไม่มีการโก่งราคา'
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-blue-400" />,
    title: 'ประกันอุบัติเหตุ',
    desc: 'คุ้มครองทั้งผู้โดยสารและคนขับตลอดการเดินทาง (อยู่ระหว่างดำเนินการ)'
  },
  {
    icon: <PhoneCall className="w-8 h-8 text-rose-400" />,
    title: 'ศูนย์ช่วยเหลือ 24/7',
    desc: 'มีทีมงานคอยดูแลและช่วยเหลือตลอด 24 ชั่วโมง'
  }
];

export default function SafetyTrustSection() {
  return (
    <section className="py-24 bg-slate-900 border-y border-slate-800">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-5xl font-kanit font-bold text-white mb-6">
              ความปลอดภัย <span className="text-emerald-400">ต้องมาก่อน</span>
            </h2>
            <p className="text-lg text-slate-400">
              ทุกการเดินทางกับ GOZIPP เราดูแลคุณด้วยมาตรฐานความปลอดภัยสูงสุด
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-slate-950 p-8 rounded-3xl border border-slate-800 text-center hover:border-emerald-500/30 transition-colors"
            >
              <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-6">
                {item.icon}
              </div>
              <h3 className="text-xl font-kanit font-semibold text-white mb-3">{item.title}</h3>
              <p className="text-slate-400 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
