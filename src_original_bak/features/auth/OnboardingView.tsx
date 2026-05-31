import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import InstallPwaPrompt from '../../components/InstallPwaPrompt';
import { APP_LOGO_PATH } from '@/constants';

const OnboardingView: React.FC = () => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);

  return (
    <div className="flex flex-col h-full bg-slate-950 font-sans selection:bg-gozipp-green/30">
      <InstallPwaPrompt />
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-12">
        <div className="w-64 h-64 bg-slate-900 rounded-full flex items-center justify-center mb-4 relative overflow-hidden group shadow-premium">
          <div className="absolute inset-0 bg-gradient-to-tr from-gozipp-green/20 to-transparent opacity-70"></div>
          <img 
            src={APP_LOGO_PATH} 
            alt="GOZIPP Logo" 
            className="w-48 h-48 relative z-10 object-contain drop-shadow-2xl transition-transform group-hover:scale-110 duration-700" 
          />
        </div>
        
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-700">
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase">GOZIPP</h1>
          <div className="w-16 h-2 bg-gozipp-green mx-auto rounded-full"></div>
          <p className="text-slate-400 text-lg leading-relaxed font-medium">
            Ride Fast. Move Smart.<br />
            <span className="text-white">Thailand's Premium Mobility.</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 w-full max-w-sm mt-8">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-14 h-14 bg-slate-900 text-gozipp-green rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-white/5">⚡</div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Fastest</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div className="w-14 h-14 bg-slate-900 text-gozipp-green rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-white/5">🛡️</div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Secure</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div className="w-14 h-14 bg-slate-900 text-gozipp-green rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-white/5">💎</div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Premium</span>
          </div>
        </div>
      </div>

      <div className="p-10">
        <button 
          onClick={() => setAuthStep('LOGIN')} 
          className="w-full bg-gozipp-green text-slate-950 font-black py-5 rounded-2xl shadow-2xl shadow-gozipp-green/20 text-xl hover:bg-green-400 active:scale-[0.98] transition-all uppercase tracking-tighter"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default OnboardingView;
