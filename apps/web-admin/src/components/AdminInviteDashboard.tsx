import React, { useState, useEffect } from 'react';
import { InviteCode, InviteType } from '../../../../packages/api/dtos';

interface Station {
    id: string;
    name: string;
    area: string;
    createdAt: string;
}

const AdminInviteDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CODES' | 'STATIONS' | 'QR_POSTERS'>('CODES');
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [stations, setStations] = useState<Station[]>([
      { id: 'WIN-CENTRAL-01', name: 'วินตลาดกลาง (Central)', area: 'เขตพระนคร', createdAt: '2024-01-01' },
      { id: 'WIN-TECH-PARK', name: 'วินหน้าตึก Tech Park', area: 'เขตห้วยขวาง', createdAt: '2024-02-15' },
      { id: 'WIN-SUBURB-A', name: 'วินหมู่บ้าน A (Suburb)', area: 'เขตบางนา', createdAt: '2024-03-10' },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [creationResult, setCreationResult] = useState<InviteCode | null>(null);

  // Invite Form State
  const [newCode, setNewCode] = useState({
    code: '',
    winId: 'WIN-CENTRAL-01',
    type: 'STATION' as InviteType,
    maxUses: 10,
    expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    note: ''
  });

  // Station Form State
  const [newStation, setNewStation] = useState({ name: '', area: '' });

  const fetchCodes = () => {
     // Mock API Call
     const mockCodes: InviteCode[] = [
         { code: 'WIN888', winId: 'WIN-CENTRAL-01', type: 'STATION', maxUses: 100, usedCount: 12, expiresAt: '2025-12-31', note: 'รหัสหลักสำหรับวินตลาดกลาง', createdBy: 'ADMIN', isActive: true },
         { code: 'TECH2024', winId: 'WIN-TECH-PARK', type: 'STATION', maxUses: 50, usedCount: 48, expiresAt: '2024-06-30', note: 'ขยายจุดรับส่ง Tech Park', createdBy: 'ADMIN', isActive: true },
     ];
     setInviteCodes(prev => prev.length > 0 ? prev : mockCodes); 
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleCreateCode = () => {
      if (!newCode.code) return;
      
      const newItem: InviteCode = {
          ...newCode,
          usedCount: 0,
          createdBy: 'ADMIN',
          isActive: true,
          expiresAt: new Date(newCode.expiresAt).toISOString()
      };
      
      setIsLoading(true);
      setTimeout(() => {
          setInviteCodes(prev => [newItem, ...prev]);
          setCreationResult(newItem); 
          setIsLoading(false);
          setNewCode({ ...newCode, code: generateRandomCode(), note: '' });
      }, 800);
  };

  const handleCreateStation = () => {
      if (!newStation.name || !newStation.area) return;
      
      const newItem: Station = {
          id: `WIN-${Date.now()}`,
          name: newStation.name,
          area: newStation.area,
          createdAt: new Date().toISOString()
      };

      setStations(prev => [...prev, newItem]);
      setNewStation({ name: '', area: '' });
      alert('สร้างวินใหม่เรียบร้อยแล้ว');
      setActiveTab('CODES'); // Switch back to create code for this station
  };

  const generateRandomCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = 'INV-';
      for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
  };

  const copyDeepLink = (code: string) => {
      // In production, use the actual domain. Here we use the current host.
      const baseUrl = window.location.origin + window.location.pathname;
      const link = `${baseUrl}#driver?invite=${code}`;
      
      navigator.clipboard.writeText(link).then(() => {
          alert(`คัดลอกลิงก์แล้ว: ${link}`);
      });
  };

  const getStatusBadge = (invite: InviteCode) => {
      const isExpired = new Date(invite.expiresAt) < new Date();
      const isFull = invite.usedCount >= invite.maxUses;

      if (!invite.isActive) return <span className="bg-slate-700 text-slate-400 text-[10px] px-2 py-0.5 rounded font-bold">ปิดใช้งาน</span>;
      if (isExpired) return <span className="bg-red-900/50 text-red-400 text-[10px] px-2 py-0.5 rounded font-bold">หมดอายุ</span>;
      if (isFull) return <span className="bg-slate-800 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold border border-slate-600">ครบจำนวน</span>;
      return <span className="bg-emerald-900/50 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold">ใช้งานได้</span>;
  };

  const getTypeLabel = (type: InviteType) => {
      switch(type) {
          case 'STATION': return 'ระดับวิน';
          case 'INDIVIDUAL': return 'รายบุคคล';
          case 'TEMP': return 'ชั่วคราว';
          default: return type;
      }
  }

  const getStationName = (id: string) => stations.find(s => s.id === id)?.name || id;

  // --- RENDERERS ---

  const renderCreateCode = () => (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-fit shadow-lg">
        {creationResult ? (
            /* Success View */
            <div className="text-center animate-in fade-in zoom-in duration-300">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-xl font-bold text-white mb-1">สร้างรหัสเชิญสำเร็จ</h3>
                <div className="bg-slate-950 p-6 rounded-xl border-2 border-dashed border-emerald-500/50 mb-6 mt-4">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">รหัสเชิญ (Invite Code)</div>
                    <div className="text-3xl font-mono font-bold text-emerald-400 tracking-wider select-all">{creationResult.code}</div>
                </div>
                <div className="flex gap-2 justify-center mb-6">
                    <button 
                        onClick={() => copyDeepLink(creationResult.code)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg"
                    >
                        📋 คัดลอกลิงก์สมัคร (Copy Link)
                    </button>
                </div>
                <div className="text-sm text-slate-400 mb-6">
                    สำหรับ: <span className="text-white font-bold">{getStationName(creationResult.winId)}</span>
                </div>
                <button 
                    onClick={() => setCreationResult(null)}
                    className="text-slate-500 text-sm hover:text-white mt-2 underline"
                >
                    สร้างเพิ่ม
                </button>
            </div>
        ) : (
            <>
            <h3 className="font-bold text-white mb-4 flex items-center gap-2 pb-4 border-b border-slate-800">
                <span>➕</span> สร้างรหัสเชิญใหม่
            </h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">สังกัดวิน/พื้นที่</label>
                    <select 
                        value={newCode.winId}
                        onChange={e => setNewCode({...newCode, winId: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                    >
                        {stations.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <div className="text-right mt-1">
                        <button onClick={() => setActiveTab('STATIONS')} className="text-[10px] text-emerald-500 hover:underline">
                            + เพิ่มวินใหม่ (New Station)
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">ประเภท</label>
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                        {['STATION', 'INDIVIDUAL', 'TEMP'].map((t) => (
                            <button 
                                key={t}
                                onClick={() => setNewCode({...newCode, type: t as any})}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded ${newCode.type === t ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {getTypeLabel(t as InviteType)}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">รหัส (Code)</label>
                    <div className="flex gap-2">
                        <input 
                            value={newCode.code}
                            onChange={e => setNewCode({...newCode, code: e.target.value.toUpperCase()})}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono tracking-widest text-lg"
                            placeholder="เช่น WIN888"
                        />
                        <button 
                            onClick={() => setNewCode({...newCode, code: generateRandomCode()})}
                            className="bg-slate-800 hover:bg-slate-700 px-3 rounded text-lg border border-slate-700"
                        >
                            🎲
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">จำนวน (คน)</label>
                        <input 
                            type="number"
                            value={newCode.maxUses}
                            onChange={e => setNewCode({...newCode, maxUses: parseInt(e.target.value)})}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">วันหมดอายุ</label>
                        <input 
                            type="date"
                            value={newCode.expiresAt}
                            onChange={e => setNewCode({...newCode, expiresAt: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                        />
                    </div>
                </div>

                <button 
                    onClick={handleCreateCode}
                    disabled={isLoading || !newCode.code}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg mt-2 disabled:opacity-50"
                >
                    {isLoading ? 'กำลังสร้าง...' : 'ยืนยันการสร้างรหัส'}
                </button>
            </div>
            </>
        )}
    </div>
  );

  const renderCreateStation = () => (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-fit shadow-lg">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2 pb-4 border-b border-slate-800">
            <span>🏢</span> เพิ่มวินมอเตอร์ไซด์ใหม่
        </h3>
        <div className="bg-amber-900/20 border border-amber-900/50 p-3 rounded mb-4 text-xs text-amber-200">
            ⚠️ สร้างวินใหม่เฉพาะกรณีที่ยังไม่มีในระบบเท่านั้น ตรวจสอบรายชื่อด้านขวาก่อนสร้าง
        </div>
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">ชื่อวิน (Station Name)</label>
                <input 
                    value={newStation.name}
                    onChange={e => setNewStation({...newStation, name: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                    placeholder="เช่น วินหน้าตลาดบางใหญ่"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">เขต/พื้นที่ (District/Area)</label>
                <input 
                    value={newStation.area}
                    onChange={e => setNewStation({...newStation, area: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                    placeholder="เช่น บางใหญ่, นนทบุรี"
                />
            </div>
            <button 
                onClick={handleCreateStation}
                disabled={!newStation.name || !newStation.area}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg mt-2 disabled:opacity-50"
            >
                บันทึกข้อมูลวิน
            </button>
            <button 
                onClick={() => setActiveTab('CODES')}
                className="w-full text-slate-400 text-sm py-2"
            >
                ยกเลิก
            </button>
        </div>
    </div>
  );

  const renderQRPosters = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full overflow-y-auto">
          {/* Card 1: Passenger */}
          <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
              <div className="bg-mywin-blue p-4 text-white text-center">
                  <h3 className="text-xl font-bold">สำหรับผู้โดยสาร</h3>
                  <p className="text-xs opacity-80">ติดที่เสาไฟฟ้า, ป้ายรถเมล์, หน้าร้าน</p>
              </div>
              <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50 relative">
                  <div className="border-4 border-slate-900 p-2 bg-white rounded-xl mb-4 shadow-lg">
                      {/* Simulated QR Code Pattern */}
                      <div className="w-48 h-48 bg-slate-900 flex flex-wrap content-start">
                          {Array.from({length: 100}).map((_, i) => (
                              <div key={i} className={`w-[10%] h-[10%] ${Math.random() > 0.5 ? 'bg-white' : 'bg-slate-900'}`}></div>
                          ))}
                          <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-white p-2 rounded-full border-4 border-white">
                                  <div className="text-2xl">🙋‍♂️</div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="text-center">
                      <h4 className="font-bold text-2xl text-mywin-blue mb-1">สแกนเรียกวิน</h4>
                      <p className="text-slate-500 text-sm">เข้าถึงแอปทันที ไม่ต้องโหลด</p>
                  </div>
              </div>
              <div className="p-4 bg-slate-100 text-center border-t border-slate-200">
                  <button onClick={() => window.open('/#passenger', '_blank', 'width=450,height=800')} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold w-full">
                      🖨️ พิมพ์โปสเตอร์ (Deep Link)
                  </button>
              </div>
          </div>

          {/* Card 2: Driver */}
          <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
              <div className="bg-mywin-green p-4 text-white text-center">
                  <h3 className="text-xl font-bold">สำหรับคนขับ (พี่วิน)</h3>
                  <p className="text-xs opacity-80">ติดที่เสื้อวิน, บอร์ดประชาสัมพันธ์</p>
              </div>
              <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50 relative">
                  <div className="border-4 border-slate-900 p-2 bg-white rounded-xl mb-4 shadow-lg">
                      {/* Simulated QR Code Pattern */}
                      <div className="w-48 h-48 bg-slate-900 flex flex-wrap content-start">
                          {Array.from({length: 100}).map((_, i) => (
                              <div key={i} className={`w-[10%] h-[10%] ${Math.random() > 0.5 ? 'bg-white' : 'bg-slate-900'}`}></div>
                          ))}
                          <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-white p-2 rounded-full border-4 border-white">
                                  <div className="text-2xl">🛵</div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="text-center">
                      <h4 className="font-bold text-2xl text-mywin-green mb-1">สแกนรับงาน</h4>
                      <p className="text-slate-500 text-sm">ดาวน์โหลดแอปสำหรับคนขับ</p>
                  </div>
              </div>
              <div className="p-4 bg-slate-100 text-center border-t border-slate-200">
                  <button onClick={() => window.open('/#driver', '_blank', 'width=450,height=800')} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold w-full">
                      🖨️ พิมพ์โปสเตอร์ (Download)
                  </button>
              </div>
          </div>

           {/* Card 3: Unified */}
          <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
              <div className="bg-mywin-orange p-4 text-white text-center">
                  <h3 className="text-xl font-bold">Landing Page (รวม)</h3>
                  <p className="text-xs opacity-80">สำหรับการตลาดออนไลน์ / โบรชัวร์ทั่วไป</p>
              </div>
              <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50 relative">
                  <div className="border-4 border-slate-900 p-2 bg-white rounded-xl mb-4 shadow-lg">
                      {/* Simulated QR Code Pattern */}
                      <div className="w-48 h-48 bg-slate-900 flex flex-wrap content-start">
                          {Array.from({length: 100}).map((_, i) => (
                              <div key={i} className={`w-[10%] h-[10%] ${Math.random() > 0.5 ? 'bg-white' : 'bg-slate-900'}`}></div>
                          ))}
                          <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-white p-2 rounded-full border-4 border-white">
                                  <div className="text-2xl">🌐</div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="text-center">
                      <h4 className="font-bold text-2xl text-mywin-orange mb-1">สแกนรู้จักเรา</h4>
                      <p className="text-slate-500 text-sm">เข้าสู่หน้าเว็บหลัก (เลือกสถานะได้)</p>
                  </div>
              </div>
              <div className="p-4 bg-slate-100 text-center border-t border-slate-200">
                  <button onClick={() => window.open('/#landing', '_blank', 'width=450,height=800')} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold w-full">
                      🖨️ พิมพ์โปสเตอร์ (Landing)
                  </button>
              </div>
          </div>
      </div>
  );

  return (
    <div className="flex-1 bg-slate-950 p-6 flex flex-col h-full overflow-hidden font-sans text-slate-200">
      <header className="mb-6 flex justify-between items-end">
           <div>
                <h2 className="text-2xl font-bold text-white">ระบบจัดการวิน & รหัสเชิญ</h2>
                <p className="text-slate-500 text-sm">Station & Invite Code Management</p>
           </div>
           <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
               <button 
                 onClick={() => setActiveTab('CODES')}
                 className={`px-4 py-2 rounded text-xs font-bold ${activeTab === 'CODES' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
               >
                   จัดการรหัส (Codes)
               </button>
               <button 
                 onClick={() => setActiveTab('STATIONS')}
                 className={`px-4 py-2 rounded text-xs font-bold ${activeTab === 'STATIONS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
               >
                   จัดการวิน (Stations)
               </button>
               <button 
                 onClick={() => setActiveTab('QR_POSTERS')}
                 className={`px-4 py-2 rounded text-xs font-bold ${activeTab === 'QR_POSTERS' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
               >
                   โปสเตอร์ (QR Posters)
               </button>
           </div>
      </header>

      {/* Main Content Switch */}
      {activeTab === 'QR_POSTERS' ? (
          renderQRPosters()
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* Left Panel */}
              {activeTab === 'CODES' ? renderCreateCode() : renderCreateStation()}

              {/* Right Panel: List */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-lg">
                  {activeTab === 'CODES' ? (
                      <>
                          <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                              <h3 className="font-bold text-slate-300">รหัสที่ใช้งานอยู่ (Active Codes)</h3>
                              <div className="flex gap-2">
                                  <span className="text-xs text-emerald-400 font-bold bg-emerald-900/30 px-2 py-1 rounded">Active: {inviteCodes.filter(c => c.isActive).length}</span>
                              </div>
                          </div>
                          <div className="flex-1 overflow-y-auto">
                              <table className="w-full text-left text-sm text-slate-400">
                                  <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-500 sticky top-0">
                                      <tr>
                                          <th className="p-4">รหัส (Code)</th>
                                          <th className="p-4">วินสังกัด</th>
                                          <th className="p-4 text-center">ใช้งาน</th>
                                          <th className="p-4 text-right">ลิงก์</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800">
                                      {inviteCodes.map((invite, idx) => (
                                          <tr key={idx} className="hover:bg-slate-800/30">
                                              <td className="p-4">
                                                  <div className="font-mono text-white font-bold tracking-wider">{invite.code}</div>
                                                  <div className="text-[10px] text-indigo-400 bg-indigo-900/20 inline-block px-1 rounded">{getTypeLabel(invite.type)}</div>
                                              </td>
                                              <td className="p-4">
                                                  <div className="text-slate-300 text-xs font-bold">{getStationName(invite.winId)}</div>
                                                  <div className="text-[10px] text-slate-500">{invite.winId}</div>
                                              </td>
                                              <td className="p-4 text-center">
                                                  <div className="text-slate-300">{invite.usedCount} / {invite.maxUses}</div>
                                                  <div className="w-full bg-slate-800 h-1 mt-1 rounded-full overflow-hidden">
                                                        <div className="bg-emerald-500 h-full" style={{ width: `${(invite.usedCount/invite.maxUses)*100}%` }}></div>
                                                  </div>
                                              </td>
                                              <td className="p-4 text-right">
                                                  <button 
                                                    onClick={() => copyDeepLink(invite.code)}
                                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded text-xs"
                                                    title="Copy Invite Link"
                                                  >
                                                      🔗
                                                  </button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </>
                  ) : (
                      <>
                          <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                              <h3 className="font-bold text-slate-300">รายชื่อวินในระบบ (Station Master)</h3>
                          </div>
                          <div className="flex-1 overflow-y-auto">
                              <table className="w-full text-left text-sm text-slate-400">
                                  <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-500 sticky top-0">
                                      <tr>
                                          <th className="p-4">ชื่อวิน</th>
                                          <th className="p-4">เขต/พื้นที่</th>
                                          <th className="p-4">รหัสระบบ</th>
                                          <th className="p-4 text-right">วันที่สร้าง</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800">
                                      {stations.map((s, idx) => (
                                          <tr key={idx} className="hover:bg-slate-800/30">
                                              <td className="p-4 font-bold text-white">{s.name}</td>
                                              <td className="p-4 text-slate-300">{s.area}</td>
                                              <td className="p-4 font-mono text-xs">{s.id}</td>
                                              <td className="p-4 text-right text-xs">{new Date(s.createdAt).toLocaleDateString('th-TH')}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminInviteDashboard;