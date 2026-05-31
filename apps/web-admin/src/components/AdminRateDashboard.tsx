import React, { useState, useMemo } from 'react';

type AdminTab = 'MANAGE' | 'CREATE' | 'PERFORMANCE' | 'AI_ANALYST' | 'FINANCE' | 'ACCOUNTING';
type ReportPeriod = 'DAILY' | 'MONTHLY' | 'YEARLY';

interface PromotionRule {
  id: string;
  name: string;
  type: 'TOPUP_BONUS' | 'RIDE_DISCOUNT';
  description: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
  maxTotalUsage: number;
  currentTotalUsage: number;
  stats: {
    usersCount: number;
    totalPointsGiven: number;
    estimatedRevenueGenerated: number;
  };
}

interface AIAnalysisResult {
    promoId: string;
    roiPercent: number;
    status: 'GREEN' | 'YELLOW' | 'RED';
    reason: string;
    suggestion: string;
}

interface PaymentMethod {
    id: string;
    type: 'BANK' | 'PROMPTPAY' | 'QR';
    providerName: string; 
    accountName: string;
    accountNumber: string;
    qrImage?: string;
    isActive: boolean;
}

const AdminRateDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('ACCOUNTING');
  
  // Accounting State
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('DAILY');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // AI State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Referral State
  const [referralPoints, setReferralPoints] = useState<number>(50);
  const [isReferralSaving, setIsReferralSaving] = useState(false);

  const fetchAiSummary = async () => {
      setIsAiLoading(true);
      try {
          const response = await fetch('/api/v1/admin/ai-summary', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await response.json();
          setAiReport(data.summary);
      } catch (error) {
          setAiReport("ไม่สามารถติดต่อ AI ได้ในขณะนี้ กรุณาตรวจสอบการเชื่อมต่อ Local LLM");
      } finally {
          setIsAiLoading(false);
      }
  };

  const fetchReferralConfig = async () => {
      try {
          const response = await fetch('/api/v1/admin/config/referral', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (response.ok) {
              const data = await response.json();
              setReferralPoints(data.referralPoints);
          }
      } catch (error) {
          console.error("Failed to fetch referral points", error);
      }
  };

  const handleSaveReferralConfig = async () => {
      setIsReferralSaving(true);
      try {
          const response = await fetch('/api/v1/admin/config/referral', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ points: referralPoints })
          });
          if (response.ok) {
              alert('บันทึกการตั้งค่าแต้มชวนเพื่อนสำเร็จ');
          } else {
              alert('ไม่สามารถบันทึกการตั้งค่าได้');
          }
      } catch (error) {
          console.error("Failed to save referral points", error);
          alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      } finally {
          setIsReferralSaving(false);
      }
  };

  // Manage Drivers State
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [isDriversLoading, setIsDriversLoading] = useState(false);

  const fetchPendingDrivers = async () => {
      setIsDriversLoading(true);
      try {
          const response = await fetch('/api/v1/admin/drivers/pending', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (response.ok) {
              const data = await response.json();
              setPendingDrivers(data);
          }
      } catch (error) {
          console.error("Failed to fetch pending drivers", error);
      } finally {
          setIsDriversLoading(false);
      }
  };

  const handleApproveDriver = async (driverId: string) => {
      try {
          const response = await fetch('/api/v1/admin/drivers/approve', {
              method: 'POST',
              headers: { 
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ driverId })
          });
          if (response.ok) {
              alert('อนุมัติสำเร็จ');
              fetchPendingDrivers();
          }
      } catch (error) {
          console.error("Approve failed", error);
      }
  };

  const handleRejectDriver = async (driverId: string) => {
      const reason = prompt('ระบุเหตุผลในการปฏิเสธ:');
      if (!reason) return;
      try {
          const response = await fetch('/api/v1/admin/drivers/reject', {
              method: 'POST',
              headers: { 
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ driverId, reason })
          });
          if (response.ok) {
              alert('ปฏิเสธสำเร็จ');
              fetchPendingDrivers();
          }
      } catch (error) {
          console.error("Reject failed", error);
      }
  };

  React.useEffect(() => {
      if (activeTab === 'MANAGE') {
          fetchPendingDrivers();
      } else if (activeTab === 'FINANCE') {
          fetchReferralConfig();
      }
  }, [activeTab]);

  // Mock Data Generators (Updated for WINNO)
  const getMockData = () => {
      let kpi = { revenue: 0, txns: 0, growth: 0 };
      let chartData: { label: string, value: number, height: number }[] = [];
      let tableData: any[] = [];
      let tableColumns: string[] = [];

      if (reportPeriod === 'DAILY') {
          kpi = { revenue: 12500, txns: 85, growth: 12 };
          const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
          chartData = hours.map(h => {
              const val = Math.floor(Math.random() * 5000);
              return { label: h, value: val, height: (val/5000)*100 };
          });
          
          tableColumns = ['เวลา (Time)', 'เลขที่เอกสาร (Ref)', 'ผู้ใช้งาน (User)', 'ช่องทาง', 'ยอดเงิน (THB)', 'สถานะ'];
          tableData = Array.from({length: 10}).map((_, i) => ({
              id: `TXN-${Date.now()-i*10000}`,
              col1: `${10+i}:30`,
              col2: `WIN-INV-${100+i}`,
              col3: `081-xxx-xx${i}${i}`,
              col4: i % 2 === 0 ? 'PROMPTPAY' : 'BANK',
              col5: (Math.random() * 500).toFixed(2),
              status: i === 0 ? 'PENDING' : 'RECONCILED'
          }));
      } else {
          kpi = { revenue: 450000, txns: 2400, growth: 5.4 };
          const days = ['1', '5', '10', '15', '20', '25', '30'];
          chartData = days.map(d => {
              const val = Math.floor(Math.random() * 20000);
              return { label: d, value: val, height: (val/20000)*100 };
          });
          tableColumns = ['วันที่ (Date)', 'รายการทั้งหมด (Txns)', 'PromptPay', 'Bank Transfer', 'ยอดรวมสุทธิ (Net Revenue)', 'สถานะปิดยอด'];
          tableData = Array.from({length: 10}).map((_, i) => ({
              id: `DAY-${i+1}`,
              col1: `${i+1}/05`,
              col2: Math.floor(50 + Math.random() * 50),
              col3: '60%',
              col4: '40%',
              col5: (10000 + Math.random() * 5000).toLocaleString(),
              status: 'CLOSED'
          }));
      }
      return { kpi, chartData, tableData, tableColumns };
  };

  const reportData = useMemo(() => getMockData(), [reportPeriod, selectedDate]);

  const [promotions] = useState<PromotionRule[]>([
    {
      id: 'P1',
      name: 'WINNO Welcome Bonus',
      type: 'TOPUP_BONUS',
      description: 'เติมเงินครั้งแรก รับแต้มเพิ่ม 20%',
      active: true,
      maxTotalUsage: 1000,
      currentTotalUsage: 452,
      stats: { usersCount: 452, totalPointsGiven: 4520, estimatedRevenueGenerated: 22600 }
    }
  ]);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
      { id: 'PM-1', type: 'PROMPTPAY', providerName: 'PromptPay', accountName: 'WINNO PLATFORM CO., LTD.', accountNumber: '081-234-5678', isActive: true },
      { id: 'PM-2', type: 'BANK', providerName: 'KBank', accountName: 'WINNO PLATFORM CO., LTD.', accountNumber: '123-4-56789-0', isActive: true }
  ]);

  const renderAccountingReport = () => {
      const { kpi, chartData, tableData, tableColumns } = reportData;
      return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 p-6 rounded-2xl border border-white/5 shadow-xl">
                      <div className="text-xs text-slate-500 font-bold uppercase mb-2">Revenue ({reportPeriod})</div>
                      <div className="text-4xl font-black text-green-500">฿{kpi.revenue.toLocaleString()}</div>
                      <div className="text-xs text-green-500/60 mt-2">↑ +{kpi.growth}% from last period</div>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-2xl border border-white/5 shadow-xl">
                      <div className="text-xs text-slate-500 font-bold uppercase mb-2">Transactions</div>
                      <div className="text-4xl font-black text-white">{kpi.txns.toLocaleString()}</div>
                      <div className="text-xs text-slate-500 mt-2">Avg: ฿{(kpi.revenue/kpi.txns).toFixed(0)} / txn</div>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-2xl border border-white/5 shadow-xl">
                      <div className="text-xs text-slate-500 font-bold uppercase mb-2">Audit Status</div>
                      <div className="text-4xl font-black text-blue-500">SECURE</div>
                      <div className="text-xs text-slate-500 mt-2">Verified via HMAC-SHA256</div>
                  </div>
              </div>

              {/* Chart */}
              <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-2xl">
                  <div className="h-48 flex items-end gap-3 justify-between">
                      {chartData.map((d, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                              <div className="relative w-full h-full flex items-end justify-center">
                                  <div className="absolute -top-10 bg-green-600 text-white text-[10px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all font-bold">
                                      ฿{d.value.toLocaleString()}
                                  </div>
                                  <div className="w-full bg-slate-800 rounded-xl relative overflow-hidden h-full">
                                      <div className="absolute bottom-0 w-full bg-gradient-to-t from-green-600 to-green-400 group-hover:from-green-500 group-hover:to-green-300 transition-all duration-700" style={{ height: `${d.height}%` }}></div>
                                  </div>
                              </div>
                              <span className="text-[10px] text-slate-500 font-bold">{d.label}</span>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Table */}
              <div className="bg-slate-900 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500">
                              <tr>
                                  {tableColumns.map((col, idx) => (
                                      <th key={idx} className="p-5">{col}</th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                              {tableData.map((row) => (
                                  <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                                      <td className="p-5 font-bold text-slate-300">{row.col1}</td>
                                      <td className="p-5 font-black text-white">{row.col2}</td>
                                      <td className="p-5 text-slate-400">{row.col3}</td>
                                      <td className="p-5">
                                          <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 group-hover:text-green-500 transition-colors">{row.col4}</span>
                                      </td>
                                      <td className="p-5 font-black text-green-500 text-right">฿{row.col5}</td>
                                      <td className="p-5 text-right">
                                          <span className="text-green-500 text-[10px] font-black">RECONCILED</span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="flex-1 bg-slate-950 p-8 flex flex-col h-full overflow-hidden font-sans">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
           <div>
                <h2 className="text-4xl font-black text-white tracking-tighter mb-2">GOZIPP <span className="text-gozipp-green">CONTROL</span></h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Mobility Intelligence & Global Audit System</p>
           </div>
           <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-xl">
               {['ACCOUNTING', 'FINANCE', 'MANAGE', 'AI_ANALYST'].map(tab => (
                   <button 
                     key={tab}
                     onClick={() => setActiveTab(tab as any)}
                     className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === tab ? 'bg-gozipp-green text-slate-950 shadow-xl shadow-gozipp-green/20' : 'text-slate-500 hover:text-white'}`}
                   >
                       {tab.replace('_', ' ')}
                   </button>
               ))}
           </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'ACCOUNTING' && renderAccountingReport()}
          {activeTab === 'MANAGE' && (
              <div className="space-y-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-white">Pending Driver Approvals</h3>
                      <button onClick={fetchPendingDrivers} className="text-gozipp-green text-sm font-bold bg-gozipp-green/10 px-4 py-2 rounded-xl">↻ Refresh</button>
                  </div>
                  
                  {isDriversLoading ? (
                      <div className="text-center text-slate-500 py-10">Loading pending drivers...</div>
                  ) : pendingDrivers.length === 0 ? (
                      <div className="bg-slate-900 p-10 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center">
                          <div className="text-4xl mb-4">✅</div>
                          <h4 className="text-white font-black text-lg">No pending approvals</h4>
                          <p className="text-slate-500 text-sm mt-2">All driver applications have been reviewed.</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {pendingDrivers.map(driver => (
                              <div key={driver.id} className="bg-slate-900 p-6 rounded-3xl border border-white/5 shadow-xl flex flex-col gap-4">
                                  <div className="flex items-start gap-4">
                                      <img src={driver.profilePic || 'https://via.placeholder.com/60'} alt="Driver" className="w-16 h-16 rounded-2xl object-cover bg-slate-800" />
                                      <div>
                                          <h4 className="text-white font-black">{driver.name}</h4>
                                          <div className="text-xs text-slate-400 font-bold mt-1">Phone: <span className="text-white">{driver.phone}</span></div>
                                          <div className="text-xs text-slate-400 font-bold">Plate: <span className="text-white">{driver.plate}</span></div>
                                      </div>
                                  </div>
                                  
                                  {driver.documents && (
                                      <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-2">
                                          <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Documents</div>
                                          {driver.documents.map((doc: any, i: number) => (
                                              <div key={i} className="flex justify-between items-center text-xs">
                                                  <span className="text-slate-400">{doc.type}</span>
                                                  <a href={doc.url} target="_blank" rel="noreferrer" className="text-gozipp-green hover:underline">View</a>
                                              </div>
                                          ))}
                                      </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                                      <button onClick={() => handleRejectDriver(driver.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black py-3 rounded-xl transition-colors">REJECT</button>
                                      <button onClick={() => handleApproveDriver(driver.id)} className="bg-gozipp-green hover:bg-green-400 text-slate-950 font-black py-3 rounded-xl transition-colors">APPROVE</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}
          {activeTab === 'FINANCE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95">
                  <div className="bg-slate-900 p-8 rounded-3xl border border-white/5">
                      <h3 className="text-xl font-black text-white mb-6">Settlement Accounts</h3>
                      <div className="space-y-4">
                          {paymentMethods.map(pm => (
                              <div key={pm.id} className="flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/5">
                                  <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-full bg-gozipp-green/20 flex items-center justify-center text-gozipp-green font-black text-xs">PP</div>
                                      <div>
                                          <div className="font-black text-white">{pm.providerName}</div>
                                          <div className="text-xs text-slate-500 font-bold">{pm.accountNumber}</div>
                                      </div>
                                  </div>
                                  <div className="bg-gozipp-green/20 text-gozipp-green text-[10px] font-black px-3 py-1 rounded-full">ACTIVE</div>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 flex flex-col gap-6">
                      <div>
                          <h3 className="text-xl font-black text-white mb-2">ระบบแนะนำเพื่อน (Referral Program)</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">ตั้งค่าแต้มการแนะนำสำหรับชั้นลูก (1 ชั้น)</p>
                      </div>
                      
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">แต้มชวนเพื่อนสำเร็จ (แต้มต่อคน)</label>
                              <input
                                  type="number"
                                  value={referralPoints}
                                  onChange={(e) => setReferralPoints(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white font-black text-lg focus:outline-none focus:border-gozipp-green"
                                  min="0"
                              />
                          </div>

                          <button
                              onClick={handleSaveReferralConfig}
                              disabled={isReferralSaving}
                              className="w-full bg-gozipp-green hover:bg-green-400 disabled:opacity-50 text-slate-950 font-black py-4 rounded-xl transition-all shadow-xl shadow-gozipp-green/15 active:scale-[0.98]"
                          >
                              {isReferralSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า (Save Config)'}
                          </button>
                      </div>
                  </div>
              </div>
          )}
          {activeTab === 'AI_ANALYST' && (
              <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in max-w-4xl mx-auto">
                  {!aiReport ? (
                      <>
                          <div className="w-20 h-20 bg-gozipp-green/20 rounded-full flex items-center justify-center text-3xl mb-6 animate-pulse shadow-2xl shadow-gozipp-green/10">🤖</div>
                          <h3 className="text-2xl font-black text-white mb-2">GOZIPP Intelligence Audit</h3>
                          <p className="text-slate-500 text-sm max-w-md mb-8">AI is analyzing global mobility trends and financial liquidity to maximize system ROI.</p>
                          <button 
                            onClick={fetchAiSummary}
                            disabled={isAiLoading}
                            className="bg-gozipp-green hover:bg-green-400 disabled:opacity-50 px-8 py-4 rounded-2xl font-black text-slate-950 shadow-2xl shadow-gozipp-green/30 transition-all active:scale-95"
                          >
                              {isAiLoading ? 'Analyzing...' : 'Start Intelligence Scan'}
                          </button>
                      </>
                  ) : (
                      <div className="w-full space-y-8 text-left">
                          <div className="flex items-center gap-4 mb-8">
                              <div className="w-12 h-12 bg-gozipp-green rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-gozipp-green/20">🤖</div>
                              <div>
                                  <h3 className="text-xl font-black text-white">Analysis Result</h3>
                                  <p className="text-xs text-gozipp-green font-bold uppercase tracking-widest">Local ThaiLLM Core</p>
                              </div>
                              <button onClick={() => setAiReport(null)} className="ml-auto text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5">Reset Scan</button>
                          </div>
                          
                          <div className="bg-slate-900/50 p-10 rounded-[40px] border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-1 h-full bg-gozipp-green/50"></div>
                              <p className="text-xl text-slate-200 leading-relaxed font-medium italic">
                                  "{aiReport}"
                              </p>
                              <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                                  <div className="flex gap-2">
                                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                      <span className="w-2 h-2 rounded-full bg-green-500/50"></span>
                                      <span className="w-2 h-2 rounded-full bg-green-500/20"></span>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analysis complete • 0.8s latency</span>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-green-500/5 p-6 rounded-3xl border border-green-500/10">
                                  <h4 className="text-xs font-black text-green-500 uppercase mb-2">Strategy Recommendation</h4>
                                  <p className="text-sm text-slate-400">ระบบแนะนำให้เพิ่ม Incentive ในเขตสยามสแควร์เพื่อลดอัตราการยกเลิกในช่วงเวลาเร่งด่วน</p>
                              </div>
                              <div className="bg-blue-500/5 p-6 rounded-3xl border border-blue-500/10">
                                  <h4 className="text-xs font-black text-blue-500 uppercase mb-2">Confidence Score</h4>
                                  <p className="text-2xl font-black text-white">94.8%</p>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
};

export default AdminRateDashboard;