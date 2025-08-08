// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import FencerImport from './pages/FencerImport.jsx';
import ValidateFencers from './pages/ValidateFencers.jsx';

// Shared UI
import TimelineProcess from './components/TimelineProcess.jsx';

// Temporary placeholders (we’ll replace these in PR2/PR3)
function Swiss() {
  return <div className="p-6 text-gray-200">Swiss rounds UI coming next…</div>;
}
function Divisions() {
  return <div className="p-6 text-gray-200">Divisions UI coming next…</div>;
}
function Results() {
  return <div className="p-6 text-gray-200">Results UI coming next…</div>;
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen w-full flex flex-col bg-[#0b1120] text-white">
        {/* Brand bar (simple, no right-side tab) */}
        <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-700">
          <img
            src="/src/assets/PointControl-notext.png"
            alt="Point Control Logo"
            className="w-10 h-10 object-contain"
          />
          <h1 className="text-xl font-bold">Point Control</h1>
        </header>

        {/* Timeline / stepper */}
        <TimelineProcess />

        {/* Main content */}
        <main className="flex-grow p-6">
          <div className="w-full max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<FencerImport />} />
              <Route path="/validate-fencers" element={<ValidateFencers />} />
              <Route path="/swiss" element={<Swiss />} />
              <Route path="/divisions" element={<Divisions />} />
              <Route path="/results" element={<Results />} />
            </Routes>
          </div>
        </main>

        <Toaster position="top-right" />
      </div>
    </Router>
  );
}
