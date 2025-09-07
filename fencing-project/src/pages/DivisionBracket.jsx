// src/pages/DivisionBracket.jsx
import React, { useEffect, useMemo, useRef, useState, createRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

/**
 * Bracket renderer using a SINGLE CSS grid for all rounds.
 * Fixes spacing/alignment, adds panning, SVG connectors, hover highlight, and zoom.
 *
 * Expects window.api.divisionState(id) -> { division, fencers, matches }
 * and window.api.divisionReport(matchId, aScore, bScore) to save results.
 */

/* ------------------------------ Bout card ------------------------------- */
function BoutCard({ m, fencerName, onSave, hoveredId, setHovered, cardRef }) {
  const [a, setA] = useState(m.a_score ?? 0);
  const [b, setB] = useState(m.b_score ?? 0);

  useEffect(() => {
    setA(m.a_score ?? 0);
    setB(m.b_score ?? 0);
  }, [m.id, m.a_score, m.b_score]);

  const aName = m.a_name || fencerName(m.a_id) || '—';
  const bName = m.b_name || fencerName(m.b_id) || '—';
  const finished = (a === 15 || b === 15);
  const isFocus = hoveredId && (m.a_id === hoveredId || m.b_id === hoveredId);
  const isDim = hoveredId && !isFocus;

  const clamp = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(15, n));
  };

  const save = async (na, nb) => {
    const A = clamp(na);
    const B = clamp(nb);
    await onSave(m.id, A, B);
  };

  const onKey = (e) => { if (e.key === 'Enter') e.currentTarget.blur(); };

  return (
    <div
      ref={cardRef}
      className={`rounded-xl border p-3 shadow-sm transition-colors ${
        isFocus ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-[#232846]'
      } ${isDim ? 'opacity-40' : ''}`}
      style={{ backgroundColor: '#12182a' }}
    >
      <div className="mb-2 flex items-center justify-between text-[11px] opacity-70">
        <span>{m.round_label}</span>
        <span>#{m.bracket_slot ?? '—'}</span>
      </div>

      {/* Row A */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="truncate whitespace-nowrap cursor-pointer"
          onMouseEnter={() => setHovered?.(m.a_id)}
          onMouseLeave={() => setHovered?.(null)}
          title={aName}
        >
          {aName}
        </div>
        <input
          aria-label="A score"
          className="w-11 rounded border border-[#2a3557] bg-[#0f1424] px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
          type="number" min={0} max={15}
          value={a}
          onChange={(e) => setA(e.target.value)}
          onBlur={() => save(a, b)}
          onKeyDown={onKey}
        />
      </div>

      {/* Row B */}
      <div className="mt-1 flex items-center justify-between gap-3">
        <div
          className="truncate whitespace-nowrap cursor-pointer"
          onMouseEnter={() => setHovered?.(m.b_id)}
          onMouseLeave={() => setHovered?.(null)}
          title={bName}
        >
          {bName}
        </div>
        <input
          aria-label="B score"
          className="w-11 rounded border border-[#2a3557] bg-[#0f1424] px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
          type="number" min={0} max={15}
          value={b}
          onChange={(e) => setB(e.target.value)}
          onBlur={() => save(a, b)}
          onKeyDown={onKey}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div className={`flex items-center gap-1 ${finished ? 'text-emerald-400' : 'text-sky-300'}`}>
          <span className="inline-block size-1.5 rounded-full bg-current" />
          {finished ? 'Finished' : `${(a ?? 0) > (b ?? 0) ? 'A' : 'B'} leads`}
        </div>
        <div className="text-xs opacity-50">{m.status || ''}</div>
      </div>
    </div>
  );
}

/* ----------------------------- Grid helpers ----------------------------- */
const ORDER_MAIN = ['R32', 'R16', 'QF', 'SF', 'F'];
const ORDER_5_8  = ['5-8 SF', '5th'];
const ORDER_9_12 = ['9-16 QF', '9-12 SF', '9th'];
const ORDER_13_16= ['13-16 SF', '13th'];

function bySlot(arr) { return arr.sort((a,b) => (a.bracket_slot ?? 0) - (b.bracket_slot ?? 0)); }
function bucketMatches(matches, rounds) {
  const map = new Map(rounds.map(r => [r, []]));
  for (const m of matches) if (map.has(m.round_label)) map.get(m.round_label).push(m);
  for (const k of map.keys()) map.set(k, bySlot(map.get(k)));
  return map;
}

/**
 * Compute single‑grid layout for a given ordered list of rounds.
 * Returns { items:[{m,col,rowStart,rowSpan}], totalRows, cols, headers, roundItemMap }.
 */
function computeLayout(matches, order) {
  const byRound = bucketMatches(matches, order);

  // index of first present round
  let leftIdx = order.findIndex(r => (byRound.get(r)?.length ?? 0) > 0);
  if (leftIdx === -1) leftIdx = 0;

  // infer base rows from the first present round
  const count = byRound.get(order[leftIdx])?.length ?? 0;
  const baseRows = Math.max(1, count * Math.max(1, 2 ** leftIdx));
  const totalRows = baseRows * 2 - 1; // odd: includes spaces between feeders

  // build placements; also remember used rounds in order
  const items = [];
  const usedRounds = [];
  const roundItemMap = new Map();

  for (let i = 0; i < order.length; i++) {
    const r = order[i];
    const arr = byRound.get(r) ?? [];
    if (!arr.length) continue;
    usedRounds.push(r);

    const span = 2 ** i; // in base rows
    const col = usedRounds.length; // compact columns (skip empty)

    for (let j = 0; j < arr.length; j++) {
      const m = arr[j];
      const rowStart = span + j * (span * 2); // centers over its two feeders
      const item = { m, col, rowStart, rowSpan: span };
      items.push(item);
      if (!roundItemMap.has(r)) roundItemMap.set(r, []);
      roundItemMap.get(r).push(item);
    }
  }

  // sort each round bucket by slot for connector logic
  for (const r of usedRounds) {
    roundItemMap.get(r)?.sort((a,b) => (a.m.bracket_slot ?? 0) - (b.m.bracket_slot ?? 0));
  }

  return { items, totalRows, cols: Math.max(usedRounds.length, 1), headers: usedRounds, roundItemMap };
}

function buildEdges(layout) {
  const edges = [];
  const rounds = layout.headers;
  for (let i = 1; i < rounds.length; i++) {
    const prev = rounds[i - 1];
    const cur = rounds[i];
    const prevItems = layout.roundItemMap.get(prev) || [];
    const curItems = layout.roundItemMap.get(cur) || [];
    const prevBySlot = new Map(prevItems.map(it => [it.m.bracket_slot ?? 0, it]));

    for (const child of curItems) {
      const s = child.m.bracket_slot ?? 0;
      const p1 = prevBySlot.get(s * 2 - 1);
      const p2 = prevBySlot.get(s * 2);
      if (p1) edges.push({ from: p1, to: child });
      if (p2) edges.push({ from: p2, to: child });
    }
  }
  return edges;
}

/* --------------------------------- Page --------------------------------- */
export default function DivisionBracket() {
  const { id } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState({ division: null, fencers: [], matches: [] });
  const [tab, setTab] = useState('main'); // 'main' | '5-8' | '9-12' | '13-16'
  const [hoveredId, setHoveredId] = useState(null);

  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const cardRefs = useRef(new Map()); // id -> ref
  const linesRef = useRef([]);
  const [linesVersion, setLinesVersion] = useState(0); // bump to trigger re-render
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);

  const getCardRef = (id) => {
    if (!cardRefs.current.has(id)) cardRefs.current.set(id, createRef());
    return cardRefs.current.get(id);
  };

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
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const saveScore = async (matchId, a, b) => {
    const res = await window.api.divisionReport?.(matchId, a, b);
    if (!res?.success) toast.error(res?.error || 'Save failed');
    else if (a === 15 || b === 15) toast.success('Bout finished');
    await load();
  };

  // name lookup w/ robust fallbacks
  const nameOf = useMemo(() => {
    const map = new Map();
    for (const f of state.fencers || []) {
      const nm = f.display_name || f.name || f.full_name || [f.first_name, f.last_name].filter(Boolean).join(' ');
      map.set(f.id ?? f.fencer_id ?? f.person_id, nm);
    }
    return (fid) => map.get(fid) || '';
  }, [state.fencers]);

  // split matches into trees
  const trees = useMemo(() => {
    const out = { main: [], fiveToEight: [], nineToTwelve: [], thirteenToSixteen: [] };
    for (const m of state.matches || []) {
      const r = m.round_label;
      if (['R32','R16','QF','SF','F'].includes(r)) out.main.push(m);
      else if (r === '5-8 SF' || r === '5th') out.fiveToEight.push(m);
      else if (r === '9-16 QF' || r === '9-12 SF' || r === '9th') out.nineToTwelve.push(m);
      else if (r === '13-16 SF' || r === '13th') out.thirteenToSixteen.push(m);
    }
    return out;
  }, [state.matches]);

  const layout = useMemo(() => {
    if (tab === 'main')   return computeLayout(trees.main, ORDER_MAIN);
    if (tab === '5-8')    return computeLayout(trees.fiveToEight, ORDER_5_8);
    if (tab === '9-12')   return computeLayout(trees.nineToTwelve, ORDER_9_12);
    return computeLayout(trees.thirteenToSixteen, ORDER_13_16);
  }, [tab, trees]);

  const edges = useMemo(() => buildEdges(layout), [layout]);

  // Dynamic row height: denser for R32/R16
  const ROW_H = useMemo(() => {
    const first = layout.headers?.[0] || '';
    if (first === 'R32') return 58;
    if (first === 'R16') return 66;
    if (first === 'QF') return 80;
    return 74;
  }, [layout.headers]);
  const COL_MIN_W = 250;
  const GAP_X = 16;

  // measure connectors & svg size
  const measureLines = () => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();
    setSvgSize({ w: Math.ceil(stageRect.width), h: Math.ceil(stageRect.height) });
    const newLines = [];
    for (const e of edges) {
      const fromEl = cardRefs.current.get(e.from.m.id)?.current;
      const toEl = cardRefs.current.get(e.to.m.id)?.current;
      if (!fromEl || !toEl) continue;
      const fr = fromEl.getBoundingClientRect();
      const tr = toEl.getBoundingClientRect();
      const x1 = fr.right - stageRect.left;
      const y1 = fr.top + fr.height / 2 - stageRect.top;
      const x2 = tr.left - stageRect.left;
      const y2 = tr.top + tr.height / 2 - stageRect.top;
      newLines.push({ x1, y1, x2, y2, fromIds: [e.from.m.a_id, e.from.m.b_id], toIds: [e.to.m.a_id, e.to.m.b_id] });
    }
    linesRef.current = newLines;
    setLinesVersion(v => v + 1);
  };

  useEffect(() => {
    const t = setTimeout(measureLines, 0);
    window.addEventListener('resize', measureLines);
    return () => { clearTimeout(t); window.removeEventListener('resize', measureLines); };
  }, [layout, state.matches, zoom]);

  // drag-to-pan (with guard for form controls)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    let dragging = false; let sx = 0; let sy = 0; let sl = 0; let st = 0;
    const onDown = (e) => {
      const target = e.target;
      if (target && typeof target.closest === 'function' && target.closest('input,button,textarea,select,[role="button"],[contenteditable="true"]')) {
        return;
      }
      dragging = true; sx = e.clientX; sy = e.clientY; sl = el.scrollLeft; st = el.scrollTop; el.style.cursor = 'grabbing'; e.preventDefault();
    };
    const onMove = (e) => { if (!dragging) return; el.scrollLeft = sl - (e.clientX - sx); el.scrollTop = st - (e.clientY - sy); measureLines(); };
    const onUp = () => { dragging = false; el.style.cursor = 'default'; };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  // zoom via buttons and ctrl+wheel
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey) return; // pinch-zoom on trackpads sets ctrlKey
      e.preventDefault();
      setZoom((z) => {
        const next = e.deltaY > 0 ? Math.max(0.5, +(z - 0.1).toFixed(2)) : Math.min(2, +(z + 0.1).toFixed(2));
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // stage explicit size so connectors have a stable canvas
  const stageStyle = {
    gridTemplateColumns: `repeat(${layout.cols}, minmax(${COL_MIN_W}px, 1fr))`,
    gridTemplateRows: `repeat(${layout.totalRows}, ${ROW_H}px)`,
    columnGap: `${GAP_X}px`,
    position: 'relative',
  };

  return (
    <div className="min-h-screen bg-[#0f1220] p-6 text-gray-100">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => nav(-1)}
              className="rounded-md border border-[#2a3557] bg-[#1b2236] px-3 py-1 text-sm hover:bg-[#222b45]"
            >
              ← Back
            </button>
            <div className="text-lg font-semibold">{state.division?.name || `Division ${id}`}</div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { k: 'main', label: 'Championship' },
              { k: '5-8', label: '5–8' },
              { k: '9-12', label: '9–12' },
              { k: '13-16', label: '13–16' },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`rounded-md border px-3 py-1 ${
                  tab === t.k ? 'border-indigo-500 bg-indigo-600' : 'border-[#2a3557] bg-[#1b2236] hover:bg-[#222b45]'
                }`}
              >
                {t.label}
              </button>
            ))}

            {/* zoom controls */}
            <div className="ml-3 flex items-center gap-1 text-xs">
              <button className="rounded border border-[#2a3557] px-2 py-1" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))}>−</button>
              <div className="w-12 text-center">{Math.round(zoom * 100)}%</div>
              <button className="rounded border border-[#2a3557] px-2 py-1" onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))}>+</button>
              <button className="ml-1 rounded border border-[#2a3557] px-2 py-1" onClick={() => setZoom(1)}>Reset</button>
            </div>
          </div>
        </div>

        {/* round headers */}
        <div
          className="grid text-xs opacity-70"
          style={{ gridTemplateColumns: `repeat(${layout.headers.length || layout.cols}, minmax(220px, 1fr))` }}
        >
          {(layout.headers.length ? layout.headers : ['']).map((h, i) => (
            <div key={`${h}-${i}`} className="px-1 pb-1">{h}</div>
          ))}
        </div>

        {/* viewport (scrollable + drag-to-pan) */}
        <div
          ref={viewportRef}
          className="h-[72vh] w-[60vw] md:w-[55vw] overflow-auto rounded-lg border border-[#232846] bg-[#0c1120] mx-auto"
          style={{ position: 'relative' }}
        >
          {/* scale wrapper (for zoom) */}
          <div className="relative" style={{ width: svgSize.w * zoom, height: svgSize.h * zoom }}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: svgSize.w, height: svgSize.h }}>
              {/* stage grid */}
              <div ref={stageRef} className="grid p-4" style={stageStyle}>
                {/* SVG connectors on top of the grid */}
                <svg
                  key={linesVersion}
                  className="pointer-events-none absolute left-0 top-0"
                  width={svgSize.w}
                  height={svgSize.h}
                  style={{ zIndex: 5 }}
                >
                  {linesRef.current.map((L, idx) => {
                    const active = hoveredId && ((L.fromIds?.includes(hoveredId)) || (L.toIds?.includes(hoveredId)));
                    return (
                      <path
                        key={idx}
                        d={`M ${L.x1} ${L.y1} C ${(L.x1+L.x2)/2} ${L.y1}, ${(L.x1+L.x2)/2} ${L.y2}, ${L.x2} ${L.y2}`}
                        fill="none"
                        stroke={active ? 'rgba(139,92,246,1)' : 'rgba(148,163,184,0.15)'}
                        strokeWidth={active ? 4 : 2}
                      />
                    );
                  })}
                </svg>

                {/* cards */}
                {layout.items.map(({ m, col, rowStart, rowSpan }) => (
                  <div
                    key={m.id}
                    style={{ gridColumn: `${col} / ${col + 1}`, gridRow: `${rowStart} / span ${rowSpan}` }}
                  >
                    <BoutCard
                      m={m}
                      fencerName={nameOf}
                      onSave={saveScore}
                      hoveredId={hoveredId}
                      setHovered={setHoveredId}
                      cardRef={getCardRef(m.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading && <div className="text-sm opacity-70">Loading…</div>}
      </div>
    </div>
  );
}
