// TODO: RESULTS_PANEL
import { useEffect, useMemo, useState } from 'react';

export default function Results() {
  const [rows, setRows] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [placements, setPlacements] = useState(new Map());
  const [loading, setLoading] = useState(true);

  const computePlacements = (state) => {
    const { fencers = [], matches = [] } = state || {};
    const clubById = new Map(fencers.map(f => [f.id, f.club || '']));
    const byRound = new Map();
    for (const m of matches) {
      if (!byRound.has(m.round_label)) byRound.set(m.round_label, []);
      byRound.get(m.round_label).push(m);
    }
    const pick = (label) => (byRound.get(label) || []).sort((a,b)=> (a.bracket_slot??0)-(b.bracket_slot??0));
    const F = pick('F')[0];
    const SFs = pick('SF');
    const P3 = pick('3rd')[0];
    const P5 = pick('5th')[0];
    const SF58 = pick('5-8 SF');
    const P9 = pick('9th')[0];
    const SF912 = pick('9-12 SF');
    const P13 = pick('13th')[0];
    const SF1316 = pick('13-16 SF');

    const out = [];
    const pushPlace = (place, fid, name) => {
      if (!fid) return; out.push({ place, fencer_id: fid, name, club: clubById.get(fid) || '' });
    };
    if (F && F.a_fencer_id && F.b_fencer_id && (F.a_score != null && F.b_score != null)) {
      const aWins = (F.a_score ?? 0) > (F.b_score ?? 0);
      pushPlace(1, aWins ? F.a_fencer_id : F.b_fencer_id, aWins ? F.a_name : F.b_name);
      pushPlace(2, aWins ? F.b_fencer_id : F.a_fencer_id, aWins ? F.b_name : F.a_name);
    }
    if (P3 && P3.a_fencer_id && P3.b_fencer_id && (P3.a_score != null && P3.b_score != null)) {
      const aWins = (P3.a_score ?? 0) > (P3.b_score ?? 0);
      pushPlace(3, aWins ? P3.a_fencer_id : P3.b_fencer_id, aWins ? P3.a_name : P3.b_name);
      pushPlace(4, aWins ? P3.b_fencer_id : P3.a_fencer_id, aWins ? P3.b_name : P3.a_name);
    } else {
      for (const sf of SFs) {
        if (!sf) continue;
        const aWins = (sf.a_score ?? 0) > (sf.b_score ?? 0);
        pushPlace(3, aWins ? sf.b_fencer_id : sf.a_fencer_id, aWins ? sf.b_name : sf.a_name);
      }
    }
    if (P5 && P5.a_fencer_id && P5.b_fencer_id && (P5.a_score != null && P5.b_score != null)) {
      const aWins = (P5.a_score ?? 0) > (P5.b_score ?? 0);
      pushPlace(5, aWins ? P5.a_fencer_id : P5.b_fencer_id, aWins ? P5.a_name : P5.b_name);
      pushPlace(6, aWins ? P5.b_fencer_id : P5.a_fencer_id, aWins ? P5.b_name : P5.a_name);
    }
    for (const m of SF58) {
      if (!m) continue;
      const aWins = (m.a_score ?? 0) > (m.b_score ?? 0);
      pushPlace(7, aWins ? m.b_fencer_id : m.a_fencer_id, aWins ? m.b_name : m.a_name);
    }
    if (P9 && P9.a_fencer_id && P9.b_fencer_id && (P9.a_score != null && P9.b_score != null)) {
      const aWins = (P9.a_score ?? 0) > (P9.b_score ?? 0);
      pushPlace(9, aWins ? P9.a_fencer_id : P9.b_fencer_id, aWins ? P9.a_name : P9.b_name);
      pushPlace(10, aWins ? P9.b_fencer_id : P9.a_fencer_id, aWins ? P9.b_name : P9.a_name);
    }
    for (const m of SF912) {
      if (!m) continue;
      const aWins = (m.a_score ?? 0) > (m.b_score ?? 0);
      pushPlace(11, aWins ? m.b_fencer_id : m.a_fencer_id, aWins ? m.b_name : m.a_name);
    }
    if (P13 && P13.a_fencer_id && P13.b_fencer_id && (P13.a_score != null && P13.b_score != null)) {
      const aWins = (P13.a_score ?? 0) > (P13.b_score ?? 0);
      pushPlace(13, aWins ? P13.a_fencer_id : P13.b_fencer_id, aWins ? P13.a_name : P13.b_name);
      pushPlace(14, aWins ? P13.b_fencer_id : P13.a_fencer_id, aWins ? P13.b_name : P13.a_name);
    }
    for (const m of SF1316) {
      if (!m) continue;
      const aWins = (m.a_score ?? 0) > (m.b_score ?? 0);
      pushPlace(15, aWins ? m.b_fencer_id : m.a_fencer_id, aWins ? m.b_name : m.a_name);
    }
    return out.sort((a,b) => a.place - b.place || a.name.localeCompare(b.name));
  };

  const load = async () => {
    setLoading(true);
    try {
      const [divs, res] = await Promise.all([
        window.api.divisionsList?.() || [],
        window.api.divisionsMedalists?.() || { success: true, medalists: [] },
      ]);
      setDivisions(divs || []);
      if (res?.success) setRows(res.medalists || []);
      const states = await Promise.all((divs || []).map(d => window.api.divisionState?.(d.id)));
      const map = new Map();
      (divs || []).forEach((d, idx) => { map.set(d.id, computePlacements(states[idx])); });
      setPlacements(map);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const off = window.api.onProgressUpdated?.(() => load());
    return () => { try { off && off(); } catch (_) {} };
  }, []);

  const byDivision = useMemo(() => {
    return (divisions || []).map(d => [d.id, { name: d.name }]);
  }, [divisions]);

  const exportCsv = () => {
    const header = ['Division','Place','Medal','Name','Club'];
    const lines = [header.join(',')];
    for (const [id, v] of byDivision) {
      const items = placements.get(id) || [];
      for (const r of items) {
        const medal = r.place === 1 ? 'Gold' : r.place === 2 ? 'Silver' : r.place === 3 ? 'Bronze' : '';
        const csvRow = [v.name, String(r.place), r.medal, r.name || '', r.club || '']
          .map(x => '"' + String(x).replaceAll('"','""') + '"')
          .join(',');
        lines.push(csvRow);
      }
    }
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medalists.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const data = byDivision.map(([id, v]) => ({ id, division: v.name, items: placements.get(id) || [] }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medalists.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0f1220] text-gray-100 p-6">
      <div className="mx-auto max-w-[1000px] space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Results</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="rounded-md bg-indigo-600 hover:bg-indigo-700 px-4 py-2"
              disabled={rows.length === 0}
            >
              Export CSV
            </button>
            <button
              onClick={exportJson}
              className="rounded-md bg-sky-600 hover:bg-sky-700 px-4 py-2"
              disabled={rows.length === 0}
            >
              Export JSON
            </button>
          </div>
        </div>

        {byDivision.map(([id, v]) => (
          <div key={id} className="rounded-lg border border-[#232846] overflow-hidden">
            <div className="bg-[#171b2d] px-4 py-2 font-semibold flex items-center justify-between">
              <span>{v.name}</span>
              <span className="text-xs opacity-70">Final placements</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-3 text-left">Place</th>
                  <th className="p-3 text-left">Medal</th>
                  <th className="p-3 text-left">Fencer</th>
                  <th className="p-3 text-left">Club</th>
                </tr>
              </thead>
              <tbody>
                {(placements.get(id) || []).map((r) => {
                  const medal = r.place === 1 ? 'Gold' : r.place === 2 ? 'Silver' : r.place === 3 ? 'Bronze' : '';
                  return (
                    <tr key={`${id}-${r.fencer_id}-${r.place}`} className="odd:bg-[#12162a] even:bg-[#0f1325] border-t border-[#232846]">
                      <td className="p-3">{r.place}</td>
                      <td className="p-3">
                        {medal ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
                              medal === 'Gold' ? 'bg-amber-600/40 text-amber-300 border border-amber-500/40' :
                              medal === 'Silver' ? 'bg-slate-400/30 text-slate-200 border border-slate-300/30' :
                              'bg-rose-700/30 text-rose-200 border border-rose-600/30'
                            }`}
                          >
                            {medal}
                          </span>
                        ) : (
                          <span className="text-xs opacity-50">—</span>
                        )}
                      </td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3">{r.club || '-'}</td>
                    </tr>
                  );
                })}
                {(!placements.get(id) || (placements.get(id) || []).length === 0) && (
                  <tr>
                    <td className="p-4 text-center text-xs opacity-70" colSpan={4}>No medalists yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}

        {loading && <div className="text-sm opacity-70">Loading…</div>}
      </div>
    </div>
  );
}
