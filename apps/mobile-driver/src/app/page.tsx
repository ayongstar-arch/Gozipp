'use client';

import React from 'react';
import DriverApp from '@/components/DriverApp';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950">
      <DriverApp driverData={undefined} matchedRider={undefined} />
    </div>
  );
}

