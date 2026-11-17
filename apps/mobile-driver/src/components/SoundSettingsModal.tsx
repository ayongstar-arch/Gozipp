import React, { useState, useEffect } from 'react';
import { driverSoundManager, SoundProfile, SoundSettings } from '../services/sound.service';

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<SoundSettings>(driverSoundManager.getSettings());
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(driverSoundManager.getSettings());
      driverSoundManager.unlockAudio();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSoundTypeChange = (type: SoundProfile) => {
    const updated = { ...settings, soundType: type };
    setSettings(updated);
    driverSoundManager.updateSettings(updated);
    // Instant preview of new sound
    driverSoundManager.testSound(type);
  };

  const handleVolumeChange = (newVolume: number) => {
    const updated = { ...settings, volume: newVolume };
    setSettings(updated);
    driverSoundManager.updateSettings(updated);
  };

  const handleToggleVibration = () => {
    const updated = { ...settings, vibrationEnabled: !settings.vibrationEnabled };
    setSettings(updated);
    driverSoundManager.updateSettings(updated);
  };

  const handleToggleWakeLock = () => {
    const updated = { ...settings, wakeLockEnabled: !settings.wakeLockEnabled };
    setSettings(updated);
    driverSoundManager.updateSettings(updated);
  };

  const handleToggleVoice = () => {
    const updated = { ...settings, voiceAnnouncementEnabled: !settings.voiceAnnouncementEnabled };
    setSettings(updated);
    driverSoundManager.updateSettings(updated);
  };

  const handleTestSound = () => {
    setIsPlayingTest(true);
    driverSoundManager.testSound(settings.soundType);
    setTimeout(() => setIsPlayingTest(false), 2000);
  };

  const handleSave = () => {
    driverSoundManager.updateSettings(settings);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold shadow-inner">
              🔔
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">ตั้งค่าเสียงแจ้งเตือน</h2>
              <p className="text-xs text-slate-400">ปรับแต่งเสียงงานเข้าเหมือนแอประดับโลก</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-6 overflow-y-auto">

          {/* Sound Profile Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 block">
              โทนเสียงแจ้งเตือนงานเข้า
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {[
                {
                  id: 'RADAR' as SoundProfile,
                  title: '🔔 เรดาร์กระดิ่งความถี่สูง (สไตล์ Grab)',
                  desc: 'เสียงกระดิ่งใส 2 โทน ดังชัดเจนตัดเสียงลม/ท่อไอเสียริมถนน',
                },
                {
                  id: 'SIREN' as SoundProfile,
                  title: '🚨 ไซเรนแจ้งเตือนด่วน (สไตล์ Uber/Bolt)',
                  desc: 'เสียงสัญญาณเร่งด่วนสองจังหวะ กระตุ้นเตือนทันที',
                },
                {
                  id: 'VOICE' as SoundProfile,
                  title: '🗣️ เสียงพูดภาษาไทย (สไตล์ LINE MAN)',
                  desc: 'มีเสียงพูดระบุประเภทยานพาหนะและราคาค่าโดยสาร',
                },
                {
                  id: 'VIBRATE_ONLY' as SoundProfile,
                  title: '📳 สั่นอย่างเดียว (Vibrate Only)',
                  desc: 'ระบบสั่นสะเทือนจังหวะเร็วโดยไม่มีเสียง',
                },
              ].map((item) => {
                const isSelected = settings.soundType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSoundTypeChange(item.id)}
                    className={`text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/5'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        {item.title}
                        {isSelected && <span className="text-xs text-amber-400 font-normal">● ใช้งานอยู่</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition-all ${
                        isSelected ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Volume Slider */}
          {settings.soundType !== 'VIBRATE_ONLY' && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-200 flex items-center gap-2">
                  🔊 ระดับความดังของเสียง
                </span>
                <span className="text-amber-400 font-bold font-mono">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>เบา</span>
                <span>มาตรฐาน</span>
                <span>ดังสุด (100%)</span>
              </div>
            </div>
          )}

          {/* Toggles (Vibration, WakeLock, Voice) */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              ตัวเลือกการแจ้งเตือนเพิ่มเติม
            </label>

            {/* Vibration */}
            <div className="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
              <div>
                <div className="text-sm font-medium text-slate-200">📳 ระบบสั่นเป็นจังหวะ</div>
                <div className="text-xs text-slate-400">สั่นสะเทือนตามจังหวะนับถอยหลัง 15 วินาที</div>
              </div>
              <button
                type="button"
                onClick={handleToggleVibration}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  settings.vibrationEnabled ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform transform ${
                    settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Screen WakeLock */}
            <div className="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
              <div>
                <div className="text-sm font-medium text-slate-200">🔆 เปิดหน้าจอค้างไว้ขณะมีงานเข้า</div>
                <div className="text-xs text-slate-400">ป้องกันหน้าจอดับระหว่างรับงานและขับขี่</div>
              </div>
              <button
                type="button"
                onClick={handleToggleWakeLock}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  settings.wakeLockEnabled ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform transform ${
                    settings.wakeLockEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Voice Announcement */}
            {settings.soundType !== 'VIBRATE_ONLY' && (
              <div className="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                <div>
                  <div className="text-sm font-medium text-slate-200">🗣️ เสียงพูดภาษาไทยแจ้งราคา</div>
                  <div className="text-xs text-slate-400">พูดขานค่างานและประเภทยานพาหนะอัตโนมัติ</div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    settings.voiceAnnouncementEnabled ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform transform ${
                      settings.voiceAnnouncementEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Test Sound Button */}
          <button
            type="button"
            onClick={handleTestSound}
            disabled={isPlayingTest}
            className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 border transition ${
              isPlayingTest
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200 active:scale-[0.98]'
            }`}
          >
            <span>{isPlayingTest ? '🔊 กำลังส่งเสียงทดสอบ...' : '▶ ทดสอบเสียงแจ้งเตือน'}</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition active:scale-[0.98]"
          >
            {saveToast ? '✓ บันทึกแล้ว' : 'บันทึกการตั้งค่า'}
          </button>
        </div>

      </div>
    </div>
  );
};
