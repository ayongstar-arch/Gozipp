'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { APP_LOGO_PATH } from '@/constants';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-gozipp-green/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative w-10 h-10 transition-transform group-hover:scale-110">
              <Image 
                src={APP_LOGO_PATH} 
                alt="GOZIPP Logo" 
                fill
                className="object-contain"
              />
            </div>
            <span className="text-2xl font-black tracking-tighter text-gozipp-green">GOZIPP</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#safety" className="hover:text-white transition-colors">Safety</a>
            <a href="#fleet" className="hover:text-white transition-colors">Fleet</a>
          </div>

          <Link 
            href="/passenger"
            className="bg-gozipp-green hover:bg-green-500 text-slate-950 px-6 py-2.5 rounded-full font-black text-sm transition-all shadow-lg shadow-gozipp-green/20 active:scale-95"
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gozipp-green/10 border border-gozipp-green/20 text-gozipp-green text-[10px] font-black uppercase tracking-widest">
              <span>⚡</span> Fastest Urban Mobility in Thailand
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">
              Ride Fast.<br />
              <span className="text-gozipp-green">Move Smart.</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-lg leading-relaxed font-medium">
              GOZIPP connects you with professional riders in seconds. Experience the next level of urban commuting with speed, safety, and smart pricing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/passenger" className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black text-lg hover:bg-gozipp-green transition-all shadow-2xl flex items-center justify-center gap-3 group">
                Book a Ride <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <button className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-lg border border-white/5 hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                Download App <span>📲</span>
              </button>
            </div>
          </div>

          {/* Visual Side */}
          <div className="relative aspect-square w-full max-w-xl mx-auto animate-in zoom-in duration-1000">
            <div className="absolute inset-0 bg-gozipp-green/20 blur-[120px] rounded-full"></div>
            <div className="relative z-10 w-full h-full rounded-4xl overflow-hidden border border-white/10 shadow-premium group">
               <Image 
                  src="/og-gozipp.png" 
                  alt="GOZIPP Interface" 
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <Image 
                src={APP_LOGO_PATH} 
                alt="GOZIPP Logo" 
                fill
                className="object-contain"
              />
            </div>
            <span className="text-lg font-black tracking-tighter text-gozipp-green">GOZIPP</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            © 2024 GOZIPP Technologies. Ride Fast. Move Smart.
          </p>
          <div className="flex gap-6">
             <a href="#" className="text-slate-500 hover:text-white transition-colors">Terms</a>
             <a href="#" className="text-slate-500 hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
