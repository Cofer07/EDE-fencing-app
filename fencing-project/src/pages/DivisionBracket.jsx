// src/pages/DivisionBracket.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

/* ---------- Small, keyboard-friendly score input ---------- */
function ScoreInput({ match, onSave }) {
  const [a, setA] = useState(String(match.a_score ?? 0));
  const [b, setB] = useState(String(match.b_score ?? 0));

  useEffect(() => {
    setA(String(match.a_score ?? 0));
    setB(String(match.b_score ?? 0));
  }, [match.id, match.a_score, match.b_score]);

  const clamp15 = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(15, n | 0));
  };
  const commit = async () => {
    const ca = clamp15(a), cb = clamp15(b);
    setA(String(ca)); setB(String(cb));
    await onSave(match.id, ca, cb);
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number" min={0} max={15} value={a}
        onChange={(e)=>setA(e.target.value)}
        onBlur={commit}
        onKeyDown={(e)=> e.key === 'Enter' && e.currentTarget.blur()}
        className="w-14 bg-[#1b2236] border border-[#2a3557] rounded px-2 py-1 text-right"
      />
      <span className="px-1">–</span>
      <input
        type="number" min={0} max={15} value={b}
        onChange={(e)=>setB(e.target.value)}
        onBlur={commit}
        onKeyDown={(e)=> e.key === 'Enter' && e.currentTarget.blur()}
        className="w-14 bg-[#1b2236] border border-[#2a3557] rounded px-2 py-1 text-right"
      />
    </div>
  );
}

function BoutCard({ m, onSave }) {
  const aName = m.a_name || (m.a_fencer_id ? `#${m.a_fencer_id}` : 'BYE');
  const bName = m.b_name || (m.b_fencer_id ? `#${m.b_fencer_id}` : 'BYE');
  const aWin = (m.a_score ?? 0) > (m.b_score ?? 0);
  const bWin = (m.b_score ?? 0) > (m.a_score ?? 0);

  return (
    <div className="rounded-lg border border-[#232846] bg-[#12162a] p-3 min-w-[240px]">
      <div className="text-[11px] opacity-60 mb-2">{m.round_label}</div>
      <div className="flex items-center justify-between gap-2">
        <div className="truncate">{aName}</div>
        <input
          type="number" min={0} max={15} defaultValue={m.a_score ?? 0}
          onBlur={async (e)=>{
            const val = Math.max(0, Math.min(15, Number(e.target.value||0)));
            await onSave(m.id, val, m.b_score ?? 0);
          }}
          className="w-12 bg-[#1b2236] border border-[#2a3557] rounded px-2 py-1 text-right"
        />
      </div>
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="truncate">{bName}</div>
        <input
          type="number" min={0} max={15} defaultValue={m.b_score ?? 0}
          onBlur={async (e)=>{
            const val = Math.max(0, Math.min(15, Number(e.target.value||0)));
            await onSave(m.id, m.a_score ?? 0, val);
          }}
          className="w-12 bg-[#1b2236] border border-[#2a3557] rounded px-2 py-1 text-right"
        />
      </div>
      <div className="text-[11px] mt-2">
        Status:{' '}
        <span className={m.finished ? 'text-emerald-400' : 'text-amber-300'}>
          {m.finished ? 'Finished' : 'Open'}
        </span>
        <span className="ml-2">
          {aWin ? 'A leads' : bWin ? 'B leads' : '—'}
        </span>
      </div>
    </div>
  );
}

/* ---------- Bracket grid helpers (pyramid layout) ---------- */
/**
 * Build a “pyramid” grid: left-most round has N rows (one per match),
 * next round spans 2 rows per match, then 4, then 8 … so cards center
 * perfectly between their upstream matches.
 *
 * @param roundsMap Map<string, Array<m>> where key is round label (e.g., 'R16')
 * @param order Array<string> in visual order (left→right)
 * @returns columns: [{ title, bouts: [{m, rowStart, span} ...] }], totalRows
 */
function buildPyramid(roundsMap, order) {
  // Figure base rows (how many matches in the left-most round)
  const leftLabel = order[0];
  let baseRows = roundsMap.get(leftLabel)?.length || 0;

  // If left-most is missing (e.g., no R16), infer from next columns
  // (QF implies baseRows = 4, SF → 2*2 = 4, F → 8 etc.)
  if (!baseRows) {
    for (let i = 1; i < order.length; i++) {
      const count = roundsMap.get(order[i])?.length || 0;
      if (count) {
        baseRows = count * (2 ** i);
        break;
      }
    }
  }
  if (!baseRows) baseRows = 1; // nothing? keep one row to avoid /0

  const columns = [];
  for (let i = 0; i < order.length; i++) {
    const label = order[i];
    const bouts = (roundsMap.get(label) || []).slice(); // ensure array
    const span = 2 ** i; // how many base rows a card should span
    const col = [];

    // Place each bout centered: rowStart = 1 + i*span + k*(2*span)
    for (let k = 0; k < bouts.length; k++) {
      const rowStart = 1 + i * span + k * (2 * span);
      col.push({ m: bouts[k], rowStart, span });
    }
    columns.push({ title: label, items: col, span });
  }
  return { columns, totalRows: baseRows };
}

function RoundColumn({ title, items, onSave }) {
  return (
    <div className="grid gap-6" style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
      <div className="text-sm opacity-70">{title}</div>
      {/* Each item is absolutely positioned by row via inline style on container grid */}
      <div
        className="grid"
        style={{
          gridTemplateRows: `repeat(${Math.max(
            ...items.map((x) => x.rowStart + x.span - 1),
            1
          )}, minmax(0, 110px))`,
          gap: '24px',
        }}
      >
        {items.map(({ m, rowStart, span }) => (
          <div key={m.id} style={{ gridRow: `${rowStart} / span ${span}` }}>
            <BoutCard m={m} onSave={onSave} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function DivisionBracket() {
  const { id } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState({ division: null, fencers: [], matches: [] });
  const [loading, setLoading] = useState(true);

  // Tabs: which tree to show
  const [tab, setTab] = useState('main'); // 'main' | '5-8' | '9-12' | '13-16'

  const load = async () => {
    setLoading(true);
    try {
      const s = await window.api.divisionState?.(Number(id));
      if (!s?.division) toast.error('Division not found');
      setState(s || { division: null, fencers: [], matches: [] });
    } catch (e) {
      toast.error(`Load failed: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id]);

  const save = async (matchId, a, b) => {
    const res = await window.api.divisionReport?.(matchId, a, b);
    if (!res?.success) toast.error(res?.error || 'Save failed');
    else if (a === 15 || b === 15) toast.success('Bout finished');
    await load();
  };

  // Split DB matches into logical groups
  const groups = useMemo(() => {
    const g = { main: [], fiveToEight: [], nineToTwelve: [], thirteenToSixteen: [] };
    for (const m of state.matches || []) {
      if (['R16', 'QF', 'SF', 'F'].includes(m.round_label)) g.main.push(m);
      else if (m.round_label.startsWith('5-8') || m.round_label === '5th') g.fiveToEight.push(m);
      else if (m.round_label === '9-16 QF' || m.round_label.startsWith('9-12') || m.round_label === '9th') g.nineToTwelve.push(m);
      else if (m.round_label.startsWith('13-16') || m.round_label === '13th') g.thirteenToSixteen.push(m);
    }
    // Keep a stable order within each round
    const bySlot = (arr) => arr.sort((a, b) => (a.bracket_slot || 0) - (b.bracket_slot || 0));
    bySlot(g.main); bySlot(g.fiveToEight); bySlot(g.nineToTwelve); bySlot(g.thirteenToSixteen);
    return g;
  }, [state.matches]);

  // Build the pyramid columns per tab
  const pyramid = useMemo(() => {
    const makeMap = (arr, labels) => {
      const map = new Map();
      labels.forEach((lab) => map.set(lab, []));
      for (const m of arr) {
        if (map.has(m.round_label)) map.get(m.round_label).push(m);
      }
      return map;
    };

    if (tab === 'main') {
      const labels = ['R16', 'QF', 'SF', 'F'];
      return buildPyramid(makeMap(groups.main, labels), labels);
    }
    if (tab === '5-8') {
      const labels = ['5-8 SF', '5th'];
      return buildPyramid(makeMap(groups.fiveToEight, labels), labels);
    }
    if (tab === '9-12') {
      const labels = ['9-16 QF', '9-12 SF', '9th'];
      return buildPyramid(makeMap(groups.nineToTwelve, labels), labels);
    }
    // '13-16'
    const labels = ['13-16 SF', '13th'];
    return buildPyramid(makeMap(groups.thirteenToSixteen, labels), labels);
  }, [groups, tab]);

  return (
    <div className="min-h-screen bg-[#0f1220] text-gray-100 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => nav('/divisions')}
              className="rounded-md px-3 py-2 bg-[#1b2236] border border-[#2a3557] hover:bg-[#222b45]"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold">{state.division?.name || 'Division'}</h1>
          </div>

          {/* Tabs for the 4 trees */}
          <div className="flex items-center gap-2">
            {[
              { k: 'main', label: 'Championship' },
              { k: '5-8', label: '5–8' },
              { k: '9-12', label: '9–12' },
              { k: '13-16', label: '13–16' },
            ].map(t => (
              <button key={t.k}
                onClick={() => setTab(t.k)}
                className={`px-3 py-1 rounded-md border ${
                  tab === t.k
                    ? 'bg-indigo-600 border-indigo-500'
                    : 'bg-[#1b2236] border-[#2a3557] hover:bg-[#222b45]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pyramid bracket */}
        <div className="rounded-lg border border-[#232846] p-4 overflow-auto">
          <div className="min-w-[900px]">
            <div className="flex items-start gap-10">
              {pyramid.columns.map((col, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="text-sm opacity-70 mb-2">{col.title}</div>

                  {/* Column grid: rows sized to align cards vertically */}
                  <div
                    className="grid"
                    style={{
                      gridTemplateRows: `repeat(${pyramid.totalRows}, minmax(0, 110px))`,
                      gap: '24px',
                    }}
                  >
                    {col.items.map(({ m, rowStart, span }) => (
                      <div key={m.id} style={{ gridRow: `${rowStart} / span ${span}` }}>
                        <BoutCard m={m} onSave={save} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {loading && <div className="text-sm opacity-70">Loading…</div>}
      </div>
    </div>
  );
}
