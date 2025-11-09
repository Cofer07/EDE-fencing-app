import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../assets/PointControl-notext.png';

export default function TopNav() {
  const location = useLocation();
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const items = useMemo(() => ([
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/divisions', label: 'Tournaments' },
    { to: '/clubs', label: 'Clubs' },
    { to: '/profile', label: 'Profile' },
    { to: '/results', label: 'Results' },
  ]), []);

  const activeKey = useMemo(() => {
    const p = location.pathname || '/dashboard';
    const match = items.find(i => p.startsWith(i.to));
    return match?.to || '/dashboard';
  }, [location.pathname, items]);

  return (
    <div className={`sticky top-0 z-50 transition shadow-2xl ${elevated ? 'backdrop-blur-md' : ''}`}
         style={{ background: 'linear-gradient(to bottom, rgba(12,17,32,0.85), rgba(12,17,32,0.6))', borderBottom: '1px solid rgba(35,40,70,0.8)' }}>
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="h-14 grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-2 select-none">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={Logo} alt="PointControl" className="h-7 w-7 object-contain" />
              <span className="font-semibold tracking-wide">PointControl</span>
            </Link>
          </div>
          <nav className="justify-self-center flex items-center gap-1 sm:gap-2">
            {items.map(i => {
              const active = activeKey === i.to;
              return (
                <Link
                  key={i.to}
                  to={i.to}
                  className={`relative px-3 py-2 rounded-md transition-colors ${active ? 'text-white' : 'text-slate-300 hover:text-white'}`}
                >
                  <span className="relative z-10">{i.label}</span>
                  <span className={`absolute inset-0 rounded-md transition opacity-70 ${active ? 'bg-gradient-to-br from-indigo-600/40 to-violet-600/30' : 'hover:bg-white/5'}`} />
                  <span className={`absolute left-2 right-2 -bottom-[2px] h-[2px] rounded-full transition-transform ${active ? 'scale-x-100 bg-indigo-400' : 'scale-x-0 bg-transparent'}`} />
                </Link>
              );
            })}
          </nav>
          <div />
        </div>
      </div>
    </div>
  );
}
