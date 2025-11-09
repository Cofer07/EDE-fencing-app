import { useEffect, useMemo, useState } from 'react';
import Logo from '../assets/PointControl-notext.png';

export default function SwissProjector() {
  const [state, setState] = useState({ tournament: null, rounds: [], matches: [], standings: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const s = await window.api.swissState();
      setState(s || { tournament: null, rounds: [], matches: [], standings: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const off = window.api.onProgressUpdated?.(() => load());
    return () => { try { off && off(); } catch {} };
  }, []);

  const currentRound = useMemo(() => state.rounds?.[state.rounds.length - 1]?.round_number ?? 0, [state.rounds]);
  const totalRounds = state.tournament?.total_rounds ?? 0;
  const progress = totalRounds > 0 ? Math.min(1, currentRound / totalRounds) : 0;

  return (
    <div className="min-h-screen bg-[#0b1120] text-gray-100 p-8">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="PointControl" className="h-10 w-10 object-contain" />
            <div>
              <div className="text-2xl font-bold">Swiss Standings</div>
              <div className="text-sm opacity-70">Live view</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-80">Progress</div>
            <div className="w-64 h-3 bg-[#121a2d] rounded overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-700"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="text-xs opacity-70 mt-1">Round {currentRound} of {totalRounds}</div>
          </div>
        </div>

        <div className="rounded-lg border border-[#232846] overflow-hidden">
          <div className="bg-[#171b2d] px-4 py-2 font-semibold">Standings</div>
          <table className="w-full text-base">
            <thead>
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Fencer</th>
                <th className="p-3 text-left">W</th>
                <th className="p-3 text-left">TS</th>
                <th className="p-3 text-left">TR</th>
                <th className="p-3 text-left">TD</th>
              </tr>
            </thead>
            <tbody>
              {(state.standings || []).map((s, idx) => (
                <tr key={s.id} className="odd:bg-[#12162a] even:bg-[#0f1325] border-t border-[#232846]">
                  <td className="p-3 font-semibold">{idx + 1}</td>
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.wins}</td>
                  <td className="p-3">{s.ts}</td>
                  <td className="p-3">{s.tr}</td>
                  <td className={`p-3 ${s.td > 0 ? 'text-emerald-400' : s.td < 0 ? 'text-rose-400' : 'text-gray-200'}`}>{s.td > 0 ? `+${s.td}` : s.td}</td>
                </tr>
              ))}
              {(state.standings || []).length === 0 && (
                <tr><td className="p-4 text-center opacity-70" colSpan={6}>No standings available</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && <div className="text-sm opacity-70">Loading...</div>}
      </div>
    </div>
  );
}

