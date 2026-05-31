import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';

interface PinViewProps {
  mode: 'SETUP' | 'LOGIN';
  userId?: string;
  phoneNumber?: string | null;
}

const PinView: React.FC<PinViewProps> = ({ mode, userId, phoneNumber }) => {
  const setAuthStep = useAuthStore((state) => state.setAuthStep);
  const { isLoading } = useUIStore();
  const { setupPin, loginWithPin, error, setError } = useAuth();
  
  const [pin, setPin] = useState(['', '', '', '', '', '']);

  const handlePinChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newPin = [...pin];
    newPin[index] = value.substring(value.length - 1);
    setPin(newPin);

    if (value && index < 5) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handleSubmit = async () => {
    const pinCode = pin.join('');
    if (pinCode.length < 6) return;
    
    if (mode === 'SETUP' && userId) {
      await setupPin(pinCode);
    } else if (mode === 'LOGIN' && phoneNumber) {
      await loginWithPin(phoneNumber, pinCode);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 font-sans p-6 justify-center">
      <div className="text-center mb-12 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-gozipp-green/10 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl shadow-gozipp-green/20">🔑</div>
        <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
          {mode === 'SETUP' ? 'Create PIN' : 'Enter PIN'}
        </h2>
        <p className="text-slate-500 font-medium">
          {mode === 'SETUP' ? 'Secure your GOZIPP account' : 'Welcome back to GOZIPP'}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-4 rounded-2xl mb-8 text-sm text-center font-bold">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 justify-center mb-12">
        {pin.map((digit, i) => (
          <input
            key={i}
            id={`pin-${i}`}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handlePinChange(i, e.target.value)}
            className="w-12 h-16 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-center text-2xl font-black text-white text-center outline-none focus:border-gozipp-green focus:bg-slate-800 transition-all shadow-xl"
          />
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || pin.join('').length < 6}
        className="w-full bg-gozipp-green text-slate-950 font-black py-5 rounded-2xl shadow-2xl shadow-gozipp-green/20 hover:bg-green-400 transition-all disabled:opacity-30 uppercase tracking-tighter text-xl"
      >
        {isLoading ? 'Processing...' : 'Confirm PIN'}
      </button>

      {mode === 'LOGIN' && (
        <button 
          onClick={() => { setAuthStep('LOGIN'); setError(null); }} 
          className="w-full text-slate-600 text-sm font-bold mt-12 hover:text-white transition-colors"
        >
          Forgot PIN? Use OTP
        </button>
      )}
    </div>
  );
};

export default PinView;
