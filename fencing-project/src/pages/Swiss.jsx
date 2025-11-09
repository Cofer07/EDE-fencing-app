// src/pages/Swiss.jsx
import { useEffect, useMemo, useState } from 'react';

function ScoreCell({ match, onChange }) {
  const [a, setA] = useState(match.score_a ?? 0);
  const [b, setB] = useState(match.score_b ?? 0);

  useEffect(() => {
    setA(match.score_a ?? 0);
    setB(match.score_b ?? 0);
  }, [match.id, match.score_a, match.score_b]);

  const clamp = (n) => Math.max(0, Math.min(5, Number.isFinite(+n) ? +n : 0));

  const commit = async () => {
    const ca = clamp(a);
    const cb = clamp(b);
    if (ca !== a) setA(ca);
    if (cb !== b) setB(cb);
    await onChange(match.id, ca, cb);
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number" min={0} max={5}
        value={a}
        onChange={(e) => setA(e.target.value)}
        onBlur={commit}
        className="w-12 bg-[#1b2236] border border-[#2a3557] rounded px-2 py-1 text-right"
      />
      <span className="px-1">-</span>
      <input
        type="number" min={0} max={5}
        value={b}
        onChange={(e) => setB(e.target.value)}
        onBlur={commit}
        className="w-12 bg-[#1b2236] border border-[#2a3557] rounded px-2 py-1 text-right"
      />
    </div>
  );
}

export default function Swiss() {
  const [state, setState] = useState({ tournament: null, rounds: [], matches: [], standings: [] });
  const [roundsWanted, setRoundsWanted] = useState(4);
  const [loading, setLoading] = useState(true);
  const [visibleRound, setVisibleRound] = useState(null);

  const currentRound = useMemo(
    () => state.rounds?.[state.rounds.length - 1]?.round_number ?? 0,
    [state.rounds]
  );

  const blank = () => setState({ tournament: null, rounds: [], matches: [], standings: [] });

  const load = async () => {
    setLoading(true);
    try {
      const s = await window.api.swissState();
      setState(s || { tournament: null, rounds: [], matches: [], standings: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const start = async () => {
    const r = Math.max(1, Math.min(20, Number(roundsWanted || 4)));
    await window.api.swissStart(r);
    await load();
  };

  const nextRound = async () => {
    const res = await window.api.swissNextRound();
    if (!res?.success && res?.error) alert(res.error);
    await load();
  };

  const resetSwiss = async () => {
    if (!confirm('Reset Swiss (keeps roster)?')) return;
    const r = await window.api.swissReset();
    if (!r?.success) return alert(r?.error || 'Reset failed');
    blank();
    setRoundsWanted(4);
    await load();
  };

  const fullReset = async () => {
    if (!confirm('FULL RESET: clears Swiss and the roster. Continue?')) return;
    const r = await window.api.fullReset();
    if (!r?.success) return alert(r?.error || 'Full reset failed');
    blank();
    setRoundsWanted(4);
    await load();
  };

  const report = async (matchId, a, b) => {
    await window.api.swissReport(matchId, a, b);
    await load();
  };

  // group matches by round
  const matchesByRound = useMemo(() => {
    const map = new Map();
    for (const m of state.matches || []) {
      if (!map.has(m.round_number)) map.set(m.round_number, []);
      map.get(m.round_number).push(m);
    }
    for (const arr of map.values()) arr.sort((x, y) => x.id - y.id);
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [state.matches]);

  // ensure visibleRound is set to a valid round
  useEffect(() => {
    const list = matchesByRound.map(([rn]) => rn);
    if (!list.length) { setVisibleRound(null); return; }
    if (visibleRound == null || !list.includes(visibleRound)) {
      setVisibleRound(list[list.length - 1]);
    }
  }, [matchesByRound]);

  const roundsList = matchesByRound.map(([rn]) => rn);
  const idx = roundsList.indexOf(visibleRound);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < roundsList.length - 1;
  const currentMatches = useMemo(() => {
    const found = matchesByRound.find(([rn]) => rn === visibleRound);
    return found ? found[1] : [];
  }, [matchesByRound, visibleRound]);

  return (
    <div className="min-h-screen bg-[#0f1220] text-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header / Controls */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Swiss Rounds</h1>

          {!state.tournament ? (
            <div className="flex items-center gap-2">
              <label className="text-sm opacity-80">Rounds</label>
              <input
                type="number" min={1} max={20}
                value={roundsWanted}
                onChange={(e) => setRoundsWanted(e.target.value)}
                className="w-20 bg-[#1b2236] border border-[#2a3557] rounded px-2 py-1"
              />
              <button onClick={start} className="rounded-md px-3 py-2 bg-emerald-600 hover:bg-emerald-700">
                Start Tournament
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-sm opacity-80 mr-2">
                Total rounds: {state.tournament.total_rounds}
              </div>
              <button onClick={nextRound} className="rounded-md px-3 py-2 bg-emerald-600 hover:bg-emerald-700">
                Generate Next Round
              </button>
              <button onClick={resetSwiss} className="rounded-md px-3 py-2 bg-amber-600 hover:bg-amber-700">
                Reset Swiss
              </button>
              <button onClick={fullReset} className="rounded-md px-3 py-2 bg-rose-700 hover:bg-rose-800">
                Full Reset
              </button>
            </div>
          )}
        </div>

        {/* Single round table + navigation */}
        <div className="rounded-lg border border-[#232846] overflow-hidden">
          <div className="bg-[#171b2d] px-4 py-2 font-semibold flex items-center justify-between">
            <div>Round {visibleRound ?? '-'} {visibleRound === currentRound ? '(current)' : ''}</div>
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1 rounded-md border ${canPrev ? 'border-[#2a3557] bg-[#1b2236] hover:bg-[#222b45]' : 'border-[#1b2342] bg-[#0f1424] opacity-50'}`}
                disabled={!canPrev}
                onClick={() => canPrev && setVisibleRound(roundsList[idx - 1])}
              >Prev</button>
              <select
                className="bg-[#0f1424] border border-[#2a3557] rounded px-2 py-1"
                value={visibleRound ?? ''}
                onChange={(e) => setVisibleRound(Number(e.target.value))}
              >
                {roundsList.map(rn => <option key={rn} value={rn}>Round {rn}</option>)}
              </select>
              <button
                className={`px-3 py-1 rounded-md border ${canNext ? 'border-[#2a3557] bg-[#1b2236] hover:bg-[#222b45]' : 'border-[#1b2342] bg-[#0f1424] opacity-50'}`}
                disabled={!canNext}
                onClick={() => canNext && setVisibleRound(roundsList[idx + 1])}
              >Next</button>
              <button
                className="ml-4 px-3 py-1 rounded-md border border-[#2a3557] bg-indigo-600/80 hover:bg-indigo-600"
                onClick={() => window.api.openStandingsWindow?.()}
                title="Open projector standings window"
              >Open Projector</button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left">Match</th>
                <th className="p-3 text-left">Fencer A</th>
                <th className="p-3 text-left">Fencer B</th>
                <th className="p-3 text-left">Score (to 5)</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentMatches.map((m, i) => {
                  const nameA = m.name_a || `#${m.fencer_a_id}`;
                  const nameB = m.fencer_b_id ? (m.name_b || `#${m.fencer_b_id}`) : null;
                  const aWins = (m.score_a ?? 0) > (m.score_b ?? 0);
                  const bWins = (m.score_b ?? 0) > (m.score_a ?? 0);
                  const diff =
                    m.fencer_b_id && m.score_a != null && m.score_b != null && m.score_a !== m.score_b
                      ? Math.abs(m.score_a - m.score_b)
                      : null;

                  return (
                    <tr key={m.id} className="odd:bg-[#12162a] even:bg-[#0f1325] border-t border-[#232846]">
                      <td className="p-3">#{i + 1}</td>
                      <td className="p-3">{nameA}</td>
                      <td className="p-3">{nameB ? nameB : <em>BYE</em>}</td>
                      <td className="p-3">
                        {m.fencer_b_id ? (
                          <div className="flex items-center gap-3">
                            <ScoreCell match={m} onChange={report} />
                            <div className="text-sm">
                              <span className={aWins ? 'text-emerald-400 font-semibold' : bWins ? 'text-rose-400 font-semibold' : 'text-gray-300'}>
                                {m.score_a ?? 0}
                              </span>
                              <span className="opacity-70 px-1">-</span>
                              <span className={bWins ? 'text-emerald-400 font-semibold' : aWins ? 'text-rose-400 font-semibold' : 'text-gray-300'}>
                                {m.score_b ?? 0}
                              </span>
                              {diff != null && (
                                <span className={`ml-2 text-xs ${aWins ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {aWins ? `+${diff}` : `-${diff}`}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs opacity-70">Auto 1W / +5 TD</span>
                        )}
                      </td>
                      <td className="p-3">{m.finished ? 'Finished' : 'Open'}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Standings (W · TS · TR · TD) */}
        {state.standings?.length > 0 && (
          <div className="rounded-lg border border-[#232846] overflow-hidden">
            <div className="bg-[#171b2d] px-4 py-2 font-semibold">Standings</div>
            <table className="w-full text-sm">
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
                {state.standings.map((s, idx) => (
                  <tr key={s.id} className="odd:bg-[#12162a] even:bg-[#0f1325] border-t border-[#232846]">
                    <td className="p-3">{idx + 1}</td>
                    <td className="p-3">{s.name}</td>
                    <td className="p-3">{s.wins}</td>
                    <td className="p-3">{s.ts}</td>
                    <td className="p-3">{s.tr}</td>
                    <td className={`p-3 ${s.td > 0 ? 'text-emerald-400' : s.td < 0 ? 'text-rose-400' : 'text-gray-200'}`}>
                      {s.td > 0 ? `+${s.td}` : s.td}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && <div className="text-sm opacity-70">Loading...</div>}
      </div>

      {/* Floating next-round control */}
      {state.tournament && (
        <div className="fixed right-6 bottom-6 flex items-center gap-2">
          <button
            onClick={nextRound}
            className="rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3"
            title="Generate Next Round"
          >
            Next Round
          </button>
        </div>
      )}
    </div>
  );
}
