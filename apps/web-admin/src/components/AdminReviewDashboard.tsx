import React, { useState, useEffect } from 'react';
import { APP_LOGO_DARK_PATH } from '../constants';

interface Driver {
  id: string;
  name: string;
  nickname: string;
  phone: string;
  plate: string;
  lineId: string;
  createdAt: string;
  updatedAt: string;
  documents: any[];
  preferences: any[];
  trainingStatus: any[];
}

const AdminReviewDashboard: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPendingDrivers();
  }, []);

  const fetchPendingDrivers = async () => {
    try {
      const response = await fetch('/api/admin/drivers/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mywin_admin_token')}`
        }
      });
      const data = await response.json();
      setDrivers(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch drivers', error);
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'reupload', driverId: string, extra = {}) => {
    try {
      const response = await fetch(`/api/admin/drivers/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mywin_admin_token')}`
        },
        body: JSON.stringify({ driverId, ...extra })
      });
      if (response.ok) {
        fetchPendingDrivers();
        setShowModal(false);
      }
    } catch (error) {
      console.error(`Action ${action} failed`, error);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] p-8 font-sans text-slate-100 selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex justify-between items-end border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
              <img 
                src={APP_LOGO_DARK_PATH} 
                onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=G&background=22C55E&color=fff';
                }}
                alt="GOZIPP" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Operations Hub</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Driver Pipeline Management</p>
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="bg-white/5 px-8 py-4 rounded-[2rem] border border-white/10 backdrop-blur-xl">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Queue</div>
              <div className="text-3xl font-black text-amber-400">{drivers.length} <span className="text-sm font-bold text-slate-600">Pending</span></div>
            </div>
            <div className="bg-emerald-500 px-8 py-4 rounded-[2rem] shadow-2xl shadow-emerald-500/20">
              <div className="text-[10px] font-black text-emerald-900/60 uppercase tracking-[0.2em] mb-1">Status</div>
              <div className="text-3xl font-black text-white">Live</div>
            </div>
          </div>
        </header>

        {/* Filters & Search */}
        <div className="bg-white/5 backdrop-blur-2xl p-5 rounded-[2.5rem] border border-white/10 mb-8 flex items-center gap-6 shadow-2xl">
          <div className="flex-1 relative group">
            <input 
              type="text" 
              placeholder="Filter by name, phone, or plate..." 
              className="w-full bg-[#0F172A] border-2 border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all outline-none"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors">🔍</span>
          </div>
          <div className="h-10 w-[1px] bg-white/5"></div>
          <select className="bg-transparent border-none text-sm font-black text-emerald-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
            <option className="bg-[#020617]">All Regions</option>
            <option className="bg-[#020617]">Bangkok Central</option>
            <option className="bg-[#020617]">Suburban</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white/5 rounded-[3rem] border border-white/10 overflow-hidden backdrop-blur-3xl shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Partner DNA</th>
                <th className="p-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Hardware</th>
                <th className="p-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Area</th>
                <th className="p-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Trust Level</th>
                <th className="p-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-32 text-center text-slate-600 font-black uppercase tracking-widest animate-pulse">Initializing Dashboard...</td></tr>
              ) : drivers.length === 0 ? (
                <tr><td colSpan={5} className="p-32 text-center text-slate-600 font-black uppercase tracking-widest">No pending applications</td></tr>
              ) : drivers.map(driver => (
                <tr key={driver.id} className="border-b border-white/5 hover:bg-emerald-500/5 transition-all group">
                  <td className="p-8">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-emerald-500/20 rounded-[1.5rem] flex items-center justify-center text-xl font-black text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                        {driver.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-lg text-white group-hover:text-emerald-400 transition-colors">{driver.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{driver.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black text-white uppercase tracking-tighter">
                      {driver.plate}
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-wrap gap-2">
                      {driver.preferences.filter(p => p.type === 'ZONE').slice(0, 2).map(p => (
                        <span key={p.id} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">{p.value}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ${driver.documents.length >= 4 ? 'bg-emerald-500 w-[80%]' : 'bg-amber-500 w-[40%]'}`}></div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">{driver.documents.length}/5</span>
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <button 
                      onClick={() => { setSelectedDriver(driver); setShowModal(true); }}
                      className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 hover:border-emerald-500/50"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl font-black text-white shadow-xl">
                  {selectedDriver.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{selectedDriver.name}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-slate-400 font-bold text-sm">ID: {selectedDriver.id}</span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                    <span className="text-indigo-600 font-bold text-sm">LINE: {selectedDriver.lineId || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-3 gap-8">
              {/* Left: Info & Preferences */}
              <div className="space-y-8">
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Availability & Identity</h3>
                  <div className="bg-slate-50 p-6 rounded-3xl space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Preferred Zones</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedDriver.preferences.filter(p => p.type === 'ZONE').map(p => (
                          <span key={p.id} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700">{p.value}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Work Shifts</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedDriver.preferences.filter(p => p.type === 'SHIFT').map(p => (
                          <span key={p.id} className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold">{p.value}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Training Status</h3>
                  <div className="space-y-2">
                    {selectedDriver.trainingStatus.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-700">{t.module_id}</span>
                        <span className="text-emerald-500 font-bold">✓</span>
                      </div>
                    ))}
                    {selectedDriver.trainingStatus.length === 0 && <div className="p-4 bg-slate-50 rounded-2xl text-xs font-bold text-slate-400 text-center">No modules completed</div>}
                  </div>
                </section>
              </div>

              {/* Middle & Right: Documents Grid */}
              <div className="col-span-2 space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uploaded Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['ID', 'LICENSE', 'VEHICLE', 'PLATE', 'SELFIE'].map(type => {
                    const doc = selectedDriver.documents.find(d => d.type === type);
                    return (
                      <div key={type} className="group relative bg-slate-100 rounded-3xl aspect-[4/3] overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all cursor-zoom-in">
                        {doc ? (
                          <>
                            <img src={doc.url} alt={type} className="w-full h-full object-cover" />
                            <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-wider">{type}</div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAction('reupload', selectedDriver.id, { documentType: type, reason: 'Image blurry' }); }}
                              className="absolute bottom-4 right-4 bg-white p-2 rounded-xl text-xs font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                            >
                              Request Re-upload
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center space-y-2">
                            <span className="text-3xl grayscale opacity-30">📄</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Missing: {type}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-8 border-t border-slate-100 bg-white flex justify-between gap-4">
              <button 
                onClick={() => handleAction('reject', selectedDriver.id, { reason: 'Failed verification' })}
                className="px-10 py-4 border-2 border-red-100 text-red-500 rounded-2xl font-bold hover:bg-red-50 transition-colors"
              >
                Reject Partner
              </button>
              <div className="flex gap-4">
                <button className="px-10 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">Put on Hold</button>
                <button 
                  onClick={() => handleAction('approve', selectedDriver.id)}
                  className="px-14 py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95"
                >
                  Approve & Onboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviewDashboard;
