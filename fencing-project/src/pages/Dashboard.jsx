import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState({ count: 0, validCount: 0 });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try { const s = await window.api.fencerStats(); if (alive) setStats(s || {}); } catch {}
    };
    load();
    const off = window.api.onProgressUpdated?.(load);
    return () => { alive = false; try { off && off(); } catch {} };
  }, []);

  const startSwissElim = async () => {
    try {
      const s = await window.api.fencerStats();
      if (!s?.hasRoster) {
        toast('No roster yet. Import fencers first.');
        nav('/import');
        return;
      }
      nav('/swiss');
    } catch {
      nav('/swiss');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1220] text-gray-100 p-6">
      <div className="mx-auto max-w-[1100px] space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">Point Control</h1>
            <p className="text-sm opacity-70">Tournament dashboard</p>
          </div>
          <div className="text-sm opacity-80">
            Roster: {stats.validCount || 0} valid / {stats.count || 0} total
          </div>
        </header>

        <section>
          <h2 className="text-xl font-semibold mb-3">New Event</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#232846] bg-[#12162a] p-5 flex flex-col justify-between">
              <div>
                <div className="text-lg font-semibold">Swiss + 16s Elimination</div>
                <p className="mt-1 text-sm opacity-80">
                  Run N Swiss rounds, then seed a 16‑fencer Direct Elimination bracket with full placement (1‑16).
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={startSwissElim}
                  className="rounded-md bg-indigo-600 hover:bg-indigo-700 px-4 py-2"
                >
                  Start
                </button>
                <button
                  onClick={() => nav('/import')}
                  className="rounded-md border border-[#2a3557] bg-[#1b2236] px-4 py-2 hover:bg-[#222b45]"
                >
                  Import Fencers
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

