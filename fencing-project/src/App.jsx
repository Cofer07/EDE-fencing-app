import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import FencerImport from './pages/FencerImport.jsx';
import ValidateFencers from './pages/ValidateFencers.jsx';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const subtitle =
    location.pathname === '/validate-fencers' ? 'Validate Fencers' : 'Fencer Import';

  const go = () => {
    if (location.pathname === '/validate-fencers') navigate('/');
    else navigate('/validate-fencers');
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
      <div className="flex items-center gap-3">
        <img
          src="/src/assets/PointControl-notext.png"
          alt="PointControl Logo"
          className="w-12 h-12 object-contain"
        />
        <h1 className="text-xl font-bold">Point Control</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-300">{subtitle}</div>
        <button
          onClick={go}
          className="rounded-md border border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-800"
        >
          {location.pathname === '/validate-fencers' ? 'Go to Import' : 'Go to Validation'}
        </button>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen w-full flex flex-col bg-[#0b1120] text-white">
        <Header />

        <main className="flex-grow flex items-center justify-center p-6">
          <div className="w-full max-w-6xl">
            <Routes>
              <Route path="/" element={<FencerImport />} />
              <Route path="/validate-fencers" element={<ValidateFencers />} />
            </Routes>
          </div>
        </main>

        <Toaster position="top-right" />
      </div>
    </Router>
  );
}
