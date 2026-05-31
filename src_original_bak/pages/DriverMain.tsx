import React from 'react';
import DriverApp from '../components/DriverApp';

const DriverMain: React.FC = () => {
  // In a real scenario, these would come from a global state or hook
  // For the legacy view, we pass undefined to trigger the Login flow
  return (
    <div className="min-h-screen bg-slate-950">
      <DriverApp driverData={undefined} matchedRider={undefined} />
    </div>
  );
};

export default DriverMain;
