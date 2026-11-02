import React, { useEffect, useState } from 'react';

interface InstallPwaPromptProps {
  mode?: 'banner' | 'button';
  className?: string;
}

const InstallPwaPrompt: React.FC<InstallPwaPromptProps> = ({ mode = 'button', className = '' }) => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (sessionStorage.getItem('gozipp_driver_pwa_dismissed') === 'true') {
      setDismissed(true);
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;
    setIsStandalone(standalone);
    if (standalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isApple);
    setIsMobile(isApple || /android|mobile/.test(ua));

    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isStandalone) return null;

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissed(true);
    try {
      sessionStorage.setItem('gozipp_driver_pwa_dismissed', 'true');
    } catch {}
  };

  const handleInstallClick = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (supportsPWA && promptInstall) {
      await promptInstall.prompt();
      const choiceResult = await promptInstall.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setSupportsPWA(false);
        handleDismiss();
      }
    } else if (isIOS) {
      setShowIosModal(true);
    }
  };

  // If dismissed, do not render banner
  if (dismissed && mode === 'banner') return null;
  if (!isMobile && !supportsPWA && !isIOS) return null;

  // Mode: Dedicated Install Button
  if (mode === 'button') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[#A3FF3F] text-xs font-bold transition-all active:scale-95 shadow-sm backdrop-blur-md ${className}`}
          title="ติดตั้งแอป GOZIPP Driver ลงหน้าจอโฮม"
        >
          <span>📲</span>
          <span>ติดตั้งแอป</span>
        </button>

        {/* iOS Step-by-Step Guide Modal */}
        {showIosModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowIosModal(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                aria-label="ปิด"
              >
                ✕
              </button>
              <div className="w-14 h-14 bg-[#A3FF3F] rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-lg shadow-green-900/30">
                🛵
              </div>
              <h3 className="text-xl font-black mb-1">ติดตั้ง GOZIPP Driver (iOS)</h3>
              <p className="text-xs text-slate-400 mb-6">เปิดใช้งานเต็มจอแบบ Native App สะดวกรวดเร็ว ไม่ต้องเปิด Safari ซ้ำ</p>
              
              <div className="space-y-3.5 bg-slate-950/60 border border-white/5 p-4 rounded-2xl text-sm mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-[#A3FF3F] shrink-0">1</span>
                  <span className="text-slate-200">แตะปุ่ม <strong>แชร์</strong> (ไอคอน <span className="inline-block px-1.5 py-0.5 bg-white/10 rounded text-xs">⎋</span>) แถบด้านล่าง</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-[#A3FF3F] shrink-0">2</span>
                  <span className="text-slate-200">เลื่อนลงแล้วเลือก <strong>"เพิ่มไปยังหน้าจอโฮม"</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-[#A3FF3F] shrink-0">3</span>
                  <span className="text-slate-200">แตะ <strong>"เพิ่ม"</strong> ที่มุมขวาบน</span>
                </div>
              </div>

              <button
                onClick={() => setShowIosModal(false)}
                className="w-full bg-[#A3FF3F] hover:bg-[#B7FF57] text-[#04070B] font-extrabold py-3.5 rounded-2xl text-base transition-all active:scale-95 shadow-lg shadow-green-900/20"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Mode: Banner with Reliable Working Close Button
  return (
    <>
      <div className={`fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 ${className}`}>
        <div className="bg-slate-900/95 backdrop-blur-xl text-white p-4 rounded-3xl shadow-2xl border border-slate-700/80 max-w-sm mx-auto relative ring-1 ring-[#A3FF3F]/30">
          {/* Working Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 text-white flex items-center justify-center text-sm font-bold shadow-lg hover:bg-slate-700 active:scale-90 transition-all z-10"
            aria-label="ปิดการแจ้งเตือน"
            title="ปิด"
          >
            ✕
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-[#A3FF3F] rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-green-900/30 shrink-0">
              🛵
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="font-extrabold text-sm text-white truncate">ติดตั้ง GOZIPP Driver</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">เปิดเต็มจอเหมือนแอป ใช้งานเร็วกว่า</div>
            </div>
          </div>

          {supportsPWA && promptInstall ? (
            <button
              onClick={handleInstallClick}
              className="mt-3.5 w-full bg-[#A3FF3F] hover:bg-green-300 text-slate-950 font-extrabold py-3 rounded-2xl text-sm shadow-lg active:scale-95 transition-all"
            >
              📲 กดติดตั้งแอปทันที
            </button>
          ) : isIOS ? (
            <div className="mt-3 bg-slate-950/60 border border-white/5 p-3 rounded-2xl text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between">
                <span>1) แตะปุ่มแชร์ ⎋ ด้านล่างจอ</span>
                <span className="text-[10px] text-[#A3FF3F] font-bold">iOS Safari</span>
              </div>
              <div>2) เลือก "เพิ่มไปยังหน้าจอโฮม"</div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default InstallPwaPrompt;
