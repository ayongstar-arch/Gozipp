import React from 'react';
import DriverApp from '../components/DriverApp';

const DriverMain: React.FC = () => {
  const [isBooting, setIsBooting] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (isBooting) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="w-28 h-28 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
            <img src="/logo-gozipp.png" alt="GOZIPP" className="w-20 h-20 object-contain" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-black tracking-tight text-white">GOZIPP</div>
            <div className="text-slate-300 text-sm">Driver Control</div>
          </div>
        </div>
      </div>
    );
  }

  // In a real scenario, these would come from a global state or hook
  // For the legacy view, we pass undefined to trigger the Login flow
  return (
    <div className="min-h-screen bg-slate-950">
      <DriverApp driverData={undefined} matchedRider={undefined} />
    </div>
  );
};

export default DriverMain;
