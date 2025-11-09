// src/pages/DivisionBracket.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  MATCH_STATES,
  SingleEliminationBracket,
  createTheme,
} from 'react-tournament-brackets';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const TAB_CONFIG = [
  { key: 'main', label: 'Championship', rounds: ['R32', 'R16', 'QF', 'SF', 'F'] },
  { key: '5-8', label: '5-8', rounds: ['5-8 SF', '5th'] },
  { key: '9-12', label: '9-12', rounds: ['9-16 QF', '9-12 SF', '9th'] },
  { key: '13-16', label: '13-16', rounds: ['13-16 SF', '13th'] },
];

const ROUND_TITLES = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarterfinals',
  SF: 'Semifinals',
  F: 'Final',
  '5-8 SF': '5-8 Semis',
  '5th': '5th Place',
  '9-16 QF': '9-16 Quarters',
  '9-12 SF': '9-12 Semis',
  '9th': '9th Place',
  '13-16 SF': '13-16 Semis',
  '13th': '13th Place',
};

const SIDE_ID_KEYS = [
  '_id',
  '_fencer_id',
  '_person_id',
  '_competitor_id',
  'Id',
  'FencerId',
  'PersonId',
  'CompetitorId',
];

const clampScore = (value) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(15, parsed));
};

const getSideId = (match, side) => {
  if (!match) return null;
  const base = side.toLowerCase();
  for (const suffix of SIDE_ID_KEYS) {
    const key = suffix.startsWith('_') ? `${base}${suffix}` : `${base}${suffix}`;
    if (match[key] != null) return match[key];
  }
  return null;
};

const friendlyRound = (label) => ROUND_TITLES[label] || label || '';

const determineWinner = (match) => {
  const a = Number(match?.a_score ?? 0);
  const b = Number(match?.b_score ?? 0);
  if (a === b) return null;
  if (a === 15 || b === 15) return a > b ? 'A' : 'B';
  if (Math.max(a, b) >= 15) return a > b ? 'A' : 'B';
  return null;
};

const deriveMatchState = (match, winner) => {
  const hasA = !!getSideId(match, 'A');
  const hasB = !!getSideId(match, 'B');
  if (!hasA && !hasB) return MATCH_STATES.NO_PARTY;
  if (winner) return MATCH_STATES.DONE;
  if ((match?.a_score ?? 0) > 0 || (match?.b_score ?? 0) > 0) {
    return MATCH_STATES.SCORE_DONE;
  }
  return MATCH_STATES.PLAYED;
};

const buildParticipant = (match, side, winner, nameOf) => {
  const key = side.toLowerCase();
  const id = getSideId(match, side);
  const rawScore = match?.[`${key}_score`];
  const numericScore = typeof rawScore === 'number' ? rawScore : Number(rawScore) || 0;
  const providedName = match?.[`${key}_name`];
  const inferredName = nameOf?.(id);
  const name = providedName || inferredName || 'TBD';

  return {
    id: id ?? `match-${match.id}-${side}`,
    name,
    status: id ? null : MATCH_STATES.NO_PARTY,
    resultText: id && (rawScore ?? rawScore === 0) ? String(rawScore) : '',
    isWinner: winner === side,
    rawScore: numericScore,
    side,
    fencerId: id ?? null,
  };
};

const buildBracketMatches = (matches = [], rounds = [], nameOf) => {
  if (!matches.length) return [];

  const roundIndex = new Map(rounds.map((label, idx) => [label, idx]));
  const byRoundSlot = new Map();
  matches.forEach((m) => {
    const slot = m.bracket_slot ?? 0;
    byRoundSlot.set(`${m.round_label}:${slot}`, m);
  });

  const sorted = [...matches].sort((a, b) => {
    const aIdx = roundIndex.has(a.round_label) ? roundIndex.get(a.round_label) : 999;
    const bIdx = roundIndex.has(b.round_label) ? roundIndex.get(b.round_label) : 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return (a.bracket_slot ?? 0) - (b.bracket_slot ?? 0);
  });

  return sorted.map((match) => {
    const idx = roundIndex.has(match.round_label) ? roundIndex.get(match.round_label) : 0;
    const nextRound = rounds[idx + 1];
    let nextMatchId = null;
    if (nextRound) {
      const nextSlot = Math.ceil((match.bracket_slot ?? 1) / 2);
      const nextMatch = byRoundSlot.get(`${nextRound}:${nextSlot}`);
      if (nextMatch) nextMatchId = nextMatch.id;
    }

    const winner = determineWinner(match);
    const participants = [
      buildParticipant(match, 'A', winner, nameOf),
      buildParticipant(match, 'B', winner, nameOf),
    ];

    return {
      id: match.id,
      name: `${friendlyRound(match.round_label)}${match.bracket_slot ? ` #${match.bracket_slot}` : ''}`,
      startTime: match.start_time || match.scheduled_at || new Date().toISOString(),
      nextMatchId,
      tournamentRoundText: friendlyRound(match.round_label),
      state: deriveMatchState(match, winner),
      participants,
      rawMatch: match,
      sides: { top: 'A', bottom: 'B' },
    };
  });
};

const bracketTheme = createTheme({
  fontFamily: 'Inter, system-ui, sans-serif',
  transitionTimingFunction: 'ease',
  disabledColor: '#475569',
  canvasBackground: '#0f1220',
  roundHeaders: { background: 'transparent' },
  matchBackground: { wonColor: '#1d1f3b', lostColor: '#0f1424' },
  border: { color: '#232846', highlightedColor: '#7c3aed' },
  textColor: {
    highlighted: '#fcd34d',
    main: '#e2e8f0',
    dark: '#94a3b8',
    disabled: '#475569',
  },
  score: {
    text: { highlightedWonColor: '#f8fafc', highlightedLostColor: '#c7d2fe' },
    background: { wonColor: '#4c1d95', lostColor: '#111827' },
  },
});

function BracketMatchCard({
  match,
  topParty,
  bottomParty,
  hoveredId,
  setHoveredId,
  onScoreCommit,
  onMouseEnter,
  onMouseLeave,
  teamNameFallback,
  resultFallback,
  computedStyles,
}) {
  const toStringScore = (val) => (val == null ? '' : String(val));
  const sanitizeScoreInput = useCallback((value) => {
    if (value == null) return '';
    return String(value).replace(/[^0-9]/g, '').slice(0, 2);
  }, []);

  const [scores, setScores] = useState(() => ({
    A: toStringScore(match?.rawMatch?.a_score),
    B: toStringScore(match?.rawMatch?.b_score),
  }));

  useEffect(() => {
    setScores({
      A: toStringScore(match?.rawMatch?.a_score),
      B: toStringScore(match?.rawMatch?.b_score),
    });
  }, [match?.rawMatch?.a_score, match?.rawMatch?.b_score, match?.id]);

  const commitScores = useCallback(
    (next) => {
      if (!match?.rawMatch?.id) return;
      const toNumber = (val) => (val === '' ? 0 : clampScore(val));
      const nextA = toNumber(next.A);
      const nextB = toNumber(next.B);
      onScoreCommit(match.rawMatch.id, nextA, nextB);
    },
    [match?.rawMatch?.id, onScoreCommit],
  );

  const updateScore = useCallback(
    (side, rawValue, forceCommit = false, allowEdit = true) => {
      if (!allowEdit) return;
      setScores((prev) => {
        const raw = sanitizeScoreInput(rawValue);
        const next = { ...prev, [side]: raw };
        const numeric = raw === '' ? null : clampScore(raw);
        const shouldCommit = forceCommit || numeric === 15;
        if (shouldCommit) commitScores(next);
        return next;
      });
    },
    [commitScores, sanitizeScoreInput],
  );

  const renderRow = (party, sideKey) => {
    if (!party) return null;
    const isHovered = hoveredId && party.fencerId && hoveredId === party.fencerId;
    const value = scores[sideKey];
    const isEditable = Boolean(match?.rawMatch?.id && party?.fencerId);

    const handleEnter = () => {
      if (party.id) onMouseEnter?.(party.id);
      if (party.fencerId) setHoveredId(party.fencerId);
    };

    const handleLeave = () => {
      onMouseLeave?.();
      setHoveredId((cur) => (party.fencerId && cur === party.fencerId ? null : cur));
    };

    return (
      <div
        key={`${match.id}-${sideKey}`}
        className={[
          'flex items-center justify-between rounded-xl border border-transparent px-3 py-2 transition',
          isHovered ? 'border-indigo-400/70 bg-indigo-400/10' : 'hover:bg-white/5',
        ].join(' ')}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        title={party.name || teamNameFallback}
      >
        <div className="flex flex-1 flex-col">
          <span className={party.name ? 'truncate' : 'truncate italic text-slate-400'}>
            {party.name || teamNameFallback}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            {party.status === MATCH_STATES.NO_PARTY ? 'Awaiting qualifier' : ''}
          </span>
        </div>
        <div className="ml-3 flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={`${party.name || teamNameFallback} score`}
            className={`h-8 w-14 rounded-md border px-2 text-sm text-center outline-none ${
              isEditable
                ? 'border-white/10 bg-[#101632] focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/60'
                : 'border-dashed border-white/10 bg-transparent text-slate-500'
            }`}
            value={value}
            onChange={(e) => updateScore(sideKey, e.target.value, false, isEditable)}
            onBlur={(e) => updateScore(sideKey, e.target.value, true, isEditable)}
            disabled={!isEditable}
            placeholder={isEditable ? '0' : '--'}
          />
          <div className="flex w-10 justify-end">
            {party.isWinner ? (
              <span className="inline-flex items-center rounded-full bg-amber-300/90 px-2 py-0.5 text-[10px] font-semibold text-black shadow">
                W
              </span>
            ) : (
              <span className="text-xs text-slate-400">{party.resultText ?? resultFallback(party)}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const topSide = match?.sides?.top || 'A';
  const bottomSide = match?.sides?.bottom || 'B';

  const targetHeight = Math.max(150, computedStyles?.boxHeight ?? 0);
  const targetWidth = Math.max(260, computedStyles?.width ?? 0);

  return (
    <div
      className="rounded-2xl border border-[#2a3557] bg-[#131a33] shadow-lg shadow-black/40 backdrop-blur"
      style={{ width: targetWidth, height: targetHeight ? targetHeight - 8 : 'auto' }}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-300">
        <span>{match.tournamentRoundText}</span>
        <span>#{match?.rawMatch?.bracket_slot ?? '-'}</span>
      </div>
      <div className="flex h-full flex-col gap-2 px-3 py-3 text-sm">
        {renderRow(topParty, topSide)}
        {renderRow(bottomParty, bottomSide)}
        <div className="mt-auto flex items-center justify-between text-[11px] text-slate-400">
          <span>{match?.rawMatch?.status || 'In progress'}</span>
          <span className="uppercase tracking-wide">
            {match.state === MATCH_STATES.DONE ? 'Final' : 'Live'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DivisionBracket() {
  const { id } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState({ division: null, fencers: [], matches: [] });
  const [tab, setTab] = useState('main');
  const [hoveredId, setHoveredId] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  const load = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!silent) setLoading(true);
    try {
      const data = await window.api.divisionState?.(Number(id));
      if (!data?.division) toast.error('Division not found');
      setState(data || { division: null, fencers: [], matches: [] });
    } catch (err) {
      toast.error(`Load failed: ${err?.message || err}`);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const saveScore = useCallback(
    async (matchId, aScore, bScore) => {
      if (!matchId) return;
      const res = await window.api.divisionReport?.(matchId, aScore, bScore);
      if (!res?.success) toast.error(res?.error || 'Unable to save score');
      else if (aScore === 15 || bScore === 15) toast.success('Bout finished');
      await load({ silent: true });
    },
    [load],
  );

  const nameOf = useMemo(() => {
    const map = new Map();
    for (const fencer of state.fencers || []) {
      const nm =
        fencer.display_name ||
        fencer.name ||
        fencer.full_name ||
        [fencer.first_name, fencer.last_name].filter(Boolean).join(' ');
      map.set(fencer.id ?? fencer.fencer_id ?? fencer.person_id, nm);
    }
    return (fid) => map.get(fid) || '';
  }, [state.fencers]);

  const groupedMatches = useMemo(() => {
    const groups = {
      main: [],
      '5-8': [],
      '9-12': [],
      '13-16': [],
    };
    for (const match of state.matches || []) {
      if (TAB_CONFIG[0].rounds.includes(match.round_label)) groups.main.push(match);
      else if (TAB_CONFIG[1].rounds.includes(match.round_label)) groups['5-8'].push(match);
      else if (TAB_CONFIG[2].rounds.includes(match.round_label)) groups['9-12'].push(match);
      else if (TAB_CONFIG[3].rounds.includes(match.round_label)) groups['13-16'].push(match);
    }
    return groups;
  }, [state.matches]);

  const currentConfig = TAB_CONFIG.find((t) => t.key === tab) || TAB_CONFIG[0];
  const bracketMatches = useMemo(
    () => buildBracketMatches(groupedMatches[tab], currentConfig.rounds, nameOf),
    [groupedMatches, tab, currentConfig.rounds, nameOf],
  );

  const handleScoreCommit = useCallback(
    (matchId, aScore, bScore) => {
      saveScore(matchId, aScore, bScore);
    },
    [saveScore],
  );

  const matchRenderer = useCallback(
    (props) => (
      <BracketMatchCard
        {...props}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}
        onScoreCommit={handleScoreCommit}
      />
    ),
    [hoveredId, handleScoreCommit],
  );

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const viewerClasses = fullscreen
    ? 'fixed inset-4 md:inset-12 z-50 rounded-2xl border border-[#232846] bg-[#0c1120] shadow-2xl shadow-black/50'
    : 'relative h-[72vh] w-full rounded-2xl border border-[#232846] bg-[#0c1120] shadow-lg';

  const svgWrapper = useCallback(
    ({ children, bracketWidth, bracketHeight }) => (
      <div className="h-full w-full overflow-auto">
        <div
          className="inline-block"
          style={{
            minWidth: bracketWidth ? `${bracketWidth}px` : undefined,
            minHeight: bracketHeight ? `${bracketHeight}px` : undefined,
          }}
        >
          {children}
        </div>
      </div>
    ),
    [],
  );

  return (
    <div className="min-h-screen bg-[#0f1220] p-6 text-gray-100">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => nav(-1)}
              className="rounded-md border border-[#2a3557] bg-[#1b2236] px-3 py-1 text-sm hover:bg-[#222b45]"
            >
              &lt; Back
            </button>
            <div>
              <div className="text-lg font-semibold">{state.division?.name || `Division ${id}`}</div>
              <div className="text-xs text-slate-400">{state.division?.weapon || ''}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TAB_CONFIG.map((cfg) => (
              <button
                key={cfg.key}
                onClick={() => setTab(cfg.key)}
                className={`rounded-md border px-3 py-1 text-sm transition ${
                  tab === cfg.key
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-[#2a3557] bg-[#1b2236] text-slate-200 hover:bg-[#222b45]'
                }`}
              >
                {cfg.label}
              </button>
            ))}

            <button
              onClick={() => setFullscreen((prev) => !prev)}
              className="ml-2 rounded-md border border-[#2a3557] bg-[#1b2236] px-3 py-1 text-sm hover:bg-[#222b45]"
            >
              {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>

        <div className="relative">
          {fullscreen && (
            <div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => setFullscreen(false)}
            />
          )}
          <div className={`${viewerClasses} overflow-hidden p-4`} onDoubleClick={() => setFullscreen((prev) => !prev)}>
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Loading bracket...
              </div>
            ) : bracketMatches.length ? (
              <SingleEliminationBracket
                matches={bracketMatches}
                matchComponent={matchRenderer}
                theme={bracketTheme}
                options={{
                  style: {
                    width: 320,
                    boxHeight: 180,
                    connectorColor: '#1f2937',
                    connectorColorHighlight: '#a855f7',
                    roundHeader: {
                      isShown: true,
                      fontSize: 12,
                      fontColor: '#cbd5f5',
                      backgroundColor: 'transparent',
                    },
                  },
                }}
                svgWrapper={svgWrapper}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#2a3557] text-sm text-slate-400">
                No matches are available for this bracket yet.
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-xs uppercase tracking-wide text-slate-500">Fetching latest scores...</div>
        )}
      </div>
    </div>
  );
}
