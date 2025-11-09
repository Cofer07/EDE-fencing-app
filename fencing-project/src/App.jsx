// src/App.jsx
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from 'react';
import { Toaster } from "react-hot-toast";

// Pages
import FencerImport from "./pages/FencerImport.jsx";
import ValidateFencers from "./pages/ValidateFencers.jsx";
import Swiss from "./pages/Swiss.jsx";
import Divisions from "./pages/Divisions.jsx";
import DivisionBracket from "./pages/DivisionBracket.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Results from "./pages/Results.jsx";

// Shared UI
import TimelineProcess from "./components/TimelineProcess.jsx";
import TopNav from "./components/TopNav.jsx";
import Clubs from "./pages/Clubs.jsx";
import Profile from "./pages/Profile.jsx";
import SwissProjector from "./pages/SwissProjector.jsx";

function Header() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const [hasEvent, setHasEvent] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [stats, swiss, divs] = await Promise.all([
          window.api?.fencerStats?.(),
          window.api?.swissState?.(),
          window.api?.divisionsList?.(),
        ]);
        const active = !!(swiss?.tournament) || (Array.isArray(divs) && divs.length > 0);
        if (alive) setHasEvent(active);
      } catch {
        if (alive) setHasEvent(false);
      }
    };
    load();
    const off = window.api?.onProgressUpdated?.(() => load());
    return () => { alive = false; try { off && off(); } catch {} };
  }, [location.pathname]);

  if (isDashboard || !hasEvent) return null;
  return (
    <header className="sticky top-14 z-10 bg-[#0f1220]">
      <TimelineProcess />
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0f1220] text-gray-100">
        {(() => {
          const loc = window.location?.hash?.slice(1) || '/';
          const isProjector = loc.startsWith('/swiss-projector');
          return !isProjector ? (
            <>
              <TopNav />
              <Header />
            </>
          ) : null;
        })()}

        <main className="mx-auto max-w-[1400px] p-6">
          <div className="space-y-4">
            <Routes>
              {/* Default to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/divisions" element={<Divisions />} />
              <Route path="/divisions/:id" element={<DivisionBracket />} />
              <Route path="/import" element={<FencerImport />} />
              <Route path="/validate-fencers" element={<ValidateFencers />} />
              <Route path="/swiss" element={<Swiss />} />
              <Route path="/swiss-projector" element={<SwissProjector />} />
              <Route path="/results" element={<Results />} />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/profile" element={<Profile />} />
              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>

        <Toaster position="top-right" />
      </div>
    </Router>
  );
}
