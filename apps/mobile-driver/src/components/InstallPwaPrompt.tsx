import React, { useEffect, useState } from 'react';

const InstallPwaPrompt: React.FC = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;
    setIsStandalone(standalone);
    if (standalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsMobile(/iphone|ipad|ipod|android|mobile/.test(ua));

    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isStandalone) return null;
  if (!isMobile && !supportsPWA && !isIOS) return null;

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!promptInstall) return;
    await promptInstall.prompt();
    const choiceResult = await promptInstall.userChoice;
    if (choiceResult.outcome === 'accepted') setSupportsPWA(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-slate-900/95 backdrop-blur text-white p-4 rounded-2xl shadow-2xl border border-slate-700 max-w-md mx-auto relative ring-1 ring-[#A3FF3F]/20">
        <button onClick={() => setSupportsPWA(false)} className="absolute top-2 right-2 text-slate-500 hover:text-white">×</button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#A3FF3F] rounded-xl flex items-center justify-center text-xl shadow-lg shadow-green-900/20">🛵</div>
          <div className="flex-1">
            <div className="font-black text-sm">ติดตั้ง GOZIPP Driver</div>
            <div className="text-xs text-slate-400">เปิดเต็มจอเหมือนแอป ใช้งานเร็วกว่าในเบราว์เซอร์</div>
          </div>
        </div>
        {supportsPWA && promptInstall ? (
          <button
            onClick={handleInstallClick}
            className="mt-4 w-full bg-[#A3FF3F] hover:bg-green-300 text-slate-950 font-black py-3 rounded-xl text-sm shadow-lg"
          >
            ติดตั้งแอป
          </button>
        ) : isIOS ? (
          <div className="mt-4 text-xs text-slate-300 leading-6">
            1) แตะปุ่มแชร์ด้านล่างหน้าจอ
            <br />
            2) เลือก “เพิ่มไปยังหน้าจอโฮม”
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InstallPwaPrompt;
