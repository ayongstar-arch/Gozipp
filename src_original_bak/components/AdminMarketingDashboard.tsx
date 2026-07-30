
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

const DEFAULT_PROMPT = "A high-resolution photograph of the MyWin app logo displayed on a smartphone screen, showcasing motorcycle taxi community service.";

interface ReferralStat {
    driverId: string;
    driverName: string;
    winName: string;
    qrScans: number;
    passengersInvited: number;
    firstRidesCompleted: number;
    communityPointsEarned: number;
}

const AdminMarketingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GROWTH' | 'REFERRAL_ANALYTICS' | 'REWARD_MARKETPLACE' | 'CAMPAIGNS' | 'AI_POSTER'>('GROWTH');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Community Growth Stats
  const [referralTree, setReferralTree] = useState<ReferralStat[]>([
      { driverId: 'D-1001', driverName: 'พี่สมชาย ใจดี', winName: 'วินตลาดกลาง', qrScans: 142, passengersInvited: 38, firstRidesCompleted: 29, communityPointsEarned: 1450 },
      { driverId: 'D-1002', driverName: 'พี่วิชัย มีสุข', winName: 'วินหน้าตึก Tech Park', qrScans: 98, passengersInvited: 24, firstRidesCompleted: 19, communityPointsEarned: 950 },
      { driverId: 'D-1003', driverName: 'พี่ประเสริฐ ยิ้มสู้', winName: 'วินหมู่บ้าน A', qrScans: 76, passengersInvited: 18, firstRidesCompleted: 15, communityPointsEarned: 750 }
  ]);

  // Reward Marketplace Catalog (Vests, Helmets, Raincoats, Vouchers, Insurance)
  const [rewardsCatalog, setRewardsCatalog] = useState([
      { id: 'R1', title: 'เสื้อวินมอเตอร์ไซค์สะท้อนแสง', category: 'VEST', pointsCost: 500, stock: 45, icon: '🥼' },
      { id: 'R2', title: 'หมวกกันน็อกมาตรฐาน มอก.', category: 'HELMET', pointsCost: 800, stock: 30, icon: '🪖' },
      { id: 'R3', title: 'เสื้อกันฝนเกรดพรีเมียม', category: 'RAINCOAT', pointsCost: 350, stock: 60, icon: '🧥' },
      { id: 'R4', title: 'คูปองน้ำมัน ปตท. 500 บาท', category: 'FUEL_VOUCHER', pointsCost: 1000, stock: 20, icon: '⛽' },
      { id: 'R5', title: 'ประกันอุบัติเหตุคุ้มครอง 1 ปี', category: 'INSURANCE', pointsCost: 1200, stock: 50, icon: '🛡️' },
      { id: 'R6', title: 'คูปองร้านค้าชุมชน 100 บาท', category: 'GIFT_VOUCHER', pointsCost: 200, stock: 100, icon: '🎟️' }
  ]);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      // @ts-ignore
      const has = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(has);
    } else {
        // Fallback for dev environment without the overlay extension
        setHasApiKey(!!process.env.API_KEY);
    }
  };

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      if (window.aistudio && window.aistudio.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } else {
          alert("AI Studio overlay not found. Ensure you are running in the correct environment.");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to select API Key");
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Re-initialize to ensure we pick up the selected key if applicable
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9", // Cinematic look for marketing
            imageSize: "1K"
          }
        },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64String = part.inlineData.data;
            setGeneratedImage(`data:image/png;base64,${base64String}`);
            break;
          }
        }
      } else {
          throw new Error("No image data received from model.");
      }

    } catch (err: any) {
      console.error("Generation Error:", err);
      setError(err.message || "Failed to generate image. Please check your API Key and Quota.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
      if (!generatedImage) return;
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `mywin-marketing-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 flex flex-col h-full overflow-hidden font-sans text-slate-200">
      <header className="mb-6 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
            <span>🚀</span> Community Growth & Campaign Center
        </h2>
        <div className="flex gap-2">
            <button onClick={() => setActiveTab('GROWTH')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'GROWTH' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>Overview</button>
            <button onClick={() => setActiveTab('CAMPAIGNS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'CAMPAIGNS' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>Passenger Promotions</button>
            <button onClick={() => setActiveTab('REWARD_MARKETPLACE')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'REWARD_MARKETPLACE' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>Reward Marketplace</button>
            <button onClick={() => setActiveTab('AI_POSTER')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'AI_POSTER' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>AI Marketing Assets</button>
        </div>
      </header>

      {activeTab === 'CAMPAIGNS' && (
          <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4">ตั้งค่าแคมเปญแนะนำเพื่อน (Passenger Referral Engine)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">แจกแต้มให้ผู้แนะนำ (Referrer Reward)</label>
                      <div className="flex items-center gap-2">
                          <input type="number" defaultValue={10} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
                          <span className="text-slate-400 font-bold">Points</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">แต้มนี้จะถูกโอนให้ผู้แนะนำเมื่อเพื่อนทำการเรียกรถสำเร็จในครั้งแรก</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                          <div className="font-bold text-white">สถานะแคมเปญ (Active)</div>
                          <div className="text-xs text-slate-500">เปิดใช้งานระบบชวนเพื่อนสำหรับผู้โดยสาร</div>
                      </div>
                      <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'AI_POSTER' && (
        <>
          {!hasApiKey ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
                  <div className="text-4xl mb-4">🔑</div>
                  <h3 className="text-xl font-bold text-white mb-2">Authentication Required</h3>
                  <p className="text-slate-400 mb-6 max-w-md text-center">
                      ในการใช้งานโมเดลสร้างภาพคุณภาพสูง (Gemini 3 Pro Image), จำเป็นต้องใช้ API Key จากบัญชีที่มีสิทธิ์เข้าถึง (Paid/Preview)
                  </p>
                  <button 
                    onClick={handleSelectKey}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg"
                  >
                      Select API Key / Login
                  </button>
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="mt-4 text-xs text-slate-500 hover:underline">
                      เรียนรู้เพิ่มเติมเกี่ยวกับ Billing
                  </a>
              </div>
          ) : (
              <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
              {/* Controls */}
              <div className="w-full lg:w-1/3 flex flex-col gap-4">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex-1 flex flex-col">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2">Prompt Description</label>
                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm focus:border-emerald-500 outline-none resize-none leading-relaxed"
                        placeholder="Describe the image you want to generate..."
                      />
                      <div className="mt-4 flex flex-col gap-2">
                          <button 
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                              {isLoading ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    กำลังสร้างภาพ...
                                  </>
                              ) : (
                                  <><span>✨</span> Generate Image</>
                              )}
                          </button>
                          {error && (
                              <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-xs mt-2">
                                  {error}
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Preview */}
              <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden group">
                  {generatedImage ? (
                      <>
                        <img src={generatedImage} alt="Generated Asset" className="max-w-full max-h-full object-contain shadow-2xl" />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={handleDownload}
                                className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm shadow-xl flex items-center gap-2"
                            >
                                📥 Download
                            </button>
                        </div>
                      </>
                  ) : (
                      <div className="text-center text-slate-600">
                          <div className="text-6xl mb-4 opacity-20">🖼️</div>
                          <p className="text-sm">ภาพที่สร้างจะปรากฏที่นี่</p>
                      </div>
                  )}
                  
                  {/* Loading Overlay */}
                  {isLoading && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                          <p className="text-indigo-400 font-bold animate-pulse">AI กำลังวาดภาพ...</p>
                      </div>
                  )}
              </div>
          </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminMarketingDashboard;
