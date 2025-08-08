import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const steps = [
  { key: 'import',   label: 'Import Fencer',   path: '/' },
  { key: 'validate', label: 'Validate Fencer', path: '/validate-fencers' },
  { key: 'swiss',    label: 'Swiss Rounds',    path: '/swiss' },
  { key: 'divs',     label: 'Divisions',       path: '/divisions' },
  { key: 'results',  label: 'Results',         path: '/results' },
];

export default function TimelineProcess() {
  const location = useLocation();
  const navigate = useNavigate();

  const [progress, setProgress] = useState({
    hasRoster: false,
    validationComplete: false,
    swissComplete: false,
    divisionsComplete: false,
  });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const s = await window.api.fencerStats();
        if (alive && s) {
          setProgress({
            hasRoster: !!s.hasRoster,
            validationComplete: !!s.validationComplete,
            swissComplete: !!s.swissComplete,
            divisionsComplete: !!s.divisionsComplete,
          });
        }
      } catch {}
    };
    load();
    // Refresh when route changes (and you can later emit events after save)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const activeIndex = Math.max(
    0,
    steps.findIndex(s =>
      s.path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(s.path)
    )
  );

  // Gate future steps based on progress
  const allow = {
    import: true,
    validate: progress.hasRoster,
    swiss: progress.validationComplete,
    divs: progress.swissComplete,
    results: progress.divisionsComplete,
  };

  return (
    <div className="w-full border-b border-gray-700 bg-[#0b1120]">
      <ol className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
        {steps.map((s, idx) => {
          const isDone = idx < activeIndex;
          const isActive = idx === activeIndex;
          const canGo =
            s.key === 'import' ? allow.import
          : s.key === 'validate' ? allow.validate
          : s.key === 'swiss' ? allow.swiss
          : s.key === 'divs' ? allow.divs
          : allow.results;

          const pill =
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors';
          const stateClass = isActive
            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/40'
            : isDone
              ? 'bg-emerald-600/10 text-emerald-300 border border-emerald-600/30'
              : canGo
                ? 'bg-[#121a2d] text-gray-200 border border-[#1b2540]'
                : 'bg-[#0e1528] text-gray-500 border border-[#111a30]';

          return (
            <li key={s.key} className="flex items-center gap-3">
              <button
                className={`${pill} ${stateClass}`}
                onClick={() => canGo && navigate(s.path)}
                disabled={!canGo}
                title={!canGo ? 'Complete previous steps first' : undefined}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isActive
                        ? 'bg-indigo-600 text-white'
                        : canGo
                          ? 'bg-[#1c2744] text-gray-200'
                          : 'bg-[#0f162a] text-gray-500'
                  }`}
                >
                  {idx + 1}
                </span>
                <span>{s.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <div className={`h-0.5 w-10 md:w-16 ${isDone ? 'bg-emerald-600/70' : 'bg-[#1b2540]'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
