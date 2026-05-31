
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PassengerMain from './src/pages/PassengerMain';
import DriverMain from './src/pages/DriverMain';
import LandingPage from './src/features/landing/LandingPage';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Passenger Routes */}
          <Route path="/passenger/*" element={<PassengerMain />} />
          
          {/* Driver Routes */}
          <Route path="/driver/*" element={<DriverMain />} />

          {/* Admin Routes (Placeholder for Refactor) */}
          <Route path="/admin" element={<div className="p-10 font-bold text-center">GOZIPP Control Center (Production Ready)</div>} />

          {/* 404 Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

