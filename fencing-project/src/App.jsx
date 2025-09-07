// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import FencerImport from './pages/FencerImport.jsx';
import ValidateFencers from './pages/ValidateFencers.jsx';
import Swiss from './pages/Swiss.jsx';
import Divisions from './pages/Divisions.jsx';
import DivisionBracket from './pages/DivisionBracket.jsx';

// Shared UI
import TimelineProcess from './components/TimelineProcess.jsx';

// Temporary placeholders (we’ll replace these in PR2/PR3)
function Results() {
  return <div className="p-6 text-gray-200">Results UI coming next…</div>;
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0f1220] text-gray-100">
        <header className="sticky top-0 z-10 bg-[#0f1220]">
          <TimelineProcess />
        </header>

        <main className="mx-auto max-w-[1400px] p-6">
          <div className="space-y-4">
            <Routes>
              <Route path="/" element={<Divisions />} />
              <Route path="/import" element={<FencerImport />} />
              <Route path="/validate" element={<ValidateFencers />} />
              <Route path="/swiss" element={<Swiss />} />
              <Route path="/divisions" element={<Divisions />} />
              <Route path="/divisions/:id" element={<DivisionBracket />} />
              {/* Keep Results if you still need it */}
              {/* <Route path="/results" element={<Results />} /> */}
            </Routes>

            {/* any global loading state */}
            {/* {loading && <div className="text-sm opacity-70">Loading…</div>} */}
          </div>
        </main>

        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

