'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, User, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'หน้าแรก', href: '#' },
    { name: 'สำหรับผู้โดยสาร', href: '#passenger' },
    { name: 'สำหรับคนขับ', href: '#driver' },
    { name: 'วิธีการใช้งาน', href: '#how-it-works' },
    { name: 'รีวิว', href: '#testimonials' },
    { name: 'คำถามที่พบบ่อย', href: '#faq' },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed w-full top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#0B1120]/80 backdrop-blur-xl border-b border-[#A3FF3F]/20 shadow-[0_4px_30px_rgba(163,255,63,0.1)] py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <img src="/brand/media__1779896490550.png" alt="GOZIPP" className="h-16 w-auto object-contain" />
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-gray-300 hover:text-[#A3FF3F] font-medium transition-colors text-sm uppercase tracking-wider"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <button className="text-gray-300 hover:text-white transition-colors flex items-center gap-1">
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">TH</span>
              </button>
              <Link
                href="/passenger"
                className="text-white hover:text-[#A3FF3F] font-medium transition-colors flex items-center gap-2 text-sm"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/passenger"
                className="bg-[#A3FF3F] hover:bg-[#B7FF57] text-[#04070B] px-6 py-2.5 rounded-full font-bold transition-all shadow-[0_0_20px_rgba(163,255,63,0.3)] hover:shadow-[0_0_30px_rgba(163,255,63,0.6)] flex items-center gap-2 text-sm hover:scale-105"
              >
                สมัครผู้โดยสาร
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white hover:text-[#A3FF3F] transition-colors p-2"
              >
                {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed inset-0 z-40 bg-[#0B1120] flex flex-col pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col space-y-6 flex-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-2xl font-bold text-gray-300 hover:text-[#A3FF3F] transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="pb-10 space-y-4 flex flex-col">
              <Link
                href="/passenger"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-4 border border-gray-800 rounded-xl text-white font-bold text-lg"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/passenger"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-4 bg-[#A3FF3F] text-[#04070B] rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(163,255,63,0.3)]"
              >
                สมัครผู้โดยสาร
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
