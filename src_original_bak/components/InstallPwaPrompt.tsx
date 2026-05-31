import React, { useState, useEffect } from 'react';

const InstallPwaPrompt: React.FC = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed/standalone
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isInStandaloneMode);
    
    if (isInStandaloneMode) return;

    // Check for iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check for Android/Desktop Chrome support
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!promptInstall) {
      return;
    }
    promptInstall.prompt();
    promptInstall.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
            setSupportsPWA(false); // Hide button after install
        } else {
            console.log('User dismissed the install prompt');
        }
    });
  };

  if (isStandalone) return null; // Don't show if already installed

  // Android / Desktop Chrome Button
  if (supportsPWA) {
    return (
      <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-slate-900/95 backdrop-blur text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-4 max-w-md mx-auto">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-xl">🛵</div>
                <div>
                    <div className="font-bold text-sm">ติดตั้งแอป GOZIPP</div>
                    <div className="text-xs text-slate-400">เข้าใช้งานได้ทันทีจากหน้าจอโฮม</div>
                </div>
            </div>
            <button 
                onClick={handleInstallClick}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl text-xs whitespace-nowrap shadow-lg shadow-green-900/20"
            >
                ติดตั้งเลย
            </button>
        </div>
      </div>
    );
  }

  // iOS Instruction Card
  if (isIOS) {
      return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-bottom-4">
            <div className="bg-slate-900/95 backdrop-blur text-white p-4 rounded-2xl shadow-2xl border border-slate-700 max-w-md mx-auto relative">
                <button onClick={() => setIsIOS(false)} className="absolute top-2 right-2 text-slate-500 hover:text-white">✕</button>
                <div className="flex items-start gap-4">
                     <span className="text-3xl">📲</span>
                     <div>
                         <h4 className="font-bold text-sm mb-1">ติดตั้ง GOZIPP บน iPhone</h4>
                         <p className="text-xs text-slate-300 mb-2">เพื่อให้ใช้งานได้เต็มจอ เหมือนแอปทั่วไป:</p>
                         <ol className="text-xs text-slate-400 space-y-2 list-decimal ml-4">
                             <li>กดปุ่ม <span className="font-bold text-green-500">แชร์ (Share)</span> ด้านล่าง</li>
                             <li>เลือกเมนู <span className="font-bold text-white">"เพิ่มไปยังหน้าจอโฮม"</span> <br/>(Add to Home Screen)</li>
                         </ol>
                     </div>
                </div>
                {/* Pointer Arrow */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 rotate-45 border-r border-b border-slate-700"></div>
            </div>
        </div>
      );
  }

  return null;
};

export default InstallPwaPrompt;