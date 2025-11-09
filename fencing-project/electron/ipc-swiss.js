'use strict';
const { ipcMain, BrowserWindow } = require('electron');
const { db } = require('./db');

/* ---------- helpers ---------- */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function computeStandings(tournamentId) {
  const fencers = db.prepare(`SELECT id, name FROM fencers WHERE is_valid=1`).all();
  const byId = new Map(fencers.map(f => [f.id, { ...f, wins: 0, ts: 0, tr: 0, td: 0 }]));

  const matches = db.prepare(`SELECT * FROM swiss_matches WHERE tournament_id=?`).all(tournamentId);
  for (const m of matches) {
    const A = byId.get(m.fencer_a_id);
    const B = m.fencer_b_id ? byId.get(m.fencer_b_id) : null;
    if (!A) continue;

    if (!B) { // BYE = 1 win, +5 TD
      A.wins += 1;
      A.ts += 5;
      A.tr += 0;
      A.td = A.ts - A.tr;
      continue;
    }
    if (!m.finished) continue;

    A.ts += m.score_a; A.tr += m.score_b; A.td = A.ts - A.tr;
    B.ts += m.score_b; B.tr += m.score_a; B.td = B.ts - B.tr;
    if (m.score_a > m.score_b) A.wins += 1;
    else if (m.score_b > m.score_a) B.wins += 1;
  }

  const arr = Array.from(byId.values());
  // Standings: Wins → TS → TR (asc) → TD → name
  arr.sort((a, b) =>
    b.wins - a.wins ||
    b.ts - a.ts ||
    a.tr - b.tr ||
    b.td - a.td ||
    a.name.localeCompare(b.name)
  );
  return arr;
}

function getTournamentState(tid) {
  const t = db.prepare(`SELECT * FROM swiss_tournaments WHERE id=?`).get(tid);
  const rounds = db.prepare(`
    SELECT * FROM swiss_rounds
    WHERE tournament_id=? ORDER BY round_number
  `).all(tid);

  // include fencer names for rendering
  const matches = db.prepare(`
    SELECT m.*,
           fa.name AS name_a,
           fb.name AS name_b
    FROM swiss_matches m
    LEFT JOIN fencers fa ON fa.id = m.fencer_a_id
    LEFT JOIN fencers fb ON fb.id = m.fencer_b_id
    WHERE m.tournament_id = ?
    ORDER BY m.round_number, m.id
  `).all(tid);

  return { tournament: t, rounds, matches };
}

function opponentsMap(tournamentId) {
  const map = new Map();
  const rows = db.prepare(`
    SELECT fencer_a_id AS a, fencer_b_id AS b
    FROM swiss_matches WHERE tournament_id=?
  `).all(tournamentId);
  for (const r of rows) {
    if (r.b == null) continue;
    if (!map.has(r.a)) map.set(r.a, new Set());
    if (!map.has(r.b)) map.set(r.b, new Set());
    map.get(r.a).add(r.b);
    map.get(r.b).add(r.a);
  }
  return map;
}

function pairNextRound(tournamentId, roundNumber) {
  const idsAll = db.prepare(`SELECT id FROM fencers WHERE is_valid=1 ORDER BY id`).all().map(r => r.id);
  if (idsAll.length === 0) throw new Error('No validated fencers');

  const oppMap = opponentsMap(tournamentId);

  if (roundNumber === 1) {
    const ids = shuffle([...idsAll]);
    const pairs = [];
    while (ids.length >= 2) {
      const a = ids.shift(), b = ids.shift();
      pairs.push([a, b]);
    }
    if (ids.length === 1) pairs.push([ids[0], null]); // BYE
    return pairs;
  }

  // later rounds: group by wins
  const standings = computeStandings(tournamentId);
  const buckets = new Map();
  for (const s of standings) {
    if (!buckets.has(s.wins)) buckets.set(s.wins, []);
    buckets.get(s.wins).push(s.id);
  }
  const groups = [...buckets.entries()].sort((a, b) => b[0] - a[0]).map(([, ids]) => ids);

  const pairs = [];
  for (let gi = 0; gi < groups.length; gi++) {
    const pool = [...groups[gi]];
    while (pool.length >= 2) {
      const a = pool.shift();
      let idx = pool.findIndex(x => !(oppMap.get(a)?.has(x)));
      if (idx === -1) idx = 0; // fallback: allow rematch
      const b = pool.splice(idx, 1)[0];
      if (!oppMap.has(a)) oppMap.set(a, new Set());
      if (!oppMap.has(b)) oppMap.set(b, new Set());
      oppMap.get(a).add(b); oppMap.get(b).add(a);
      pairs.push([a, b]);
    }
    if (pool.length === 1) {
      const floater = pool[0];
      const nextGroup = groups[gi + 1];
      if (nextGroup && nextGroup.length) {
        let idx2 = nextGroup.findIndex(x => !(oppMap.get(floater)?.has(x)));
        if (idx2 === -1) idx2 = 0;
        const b = nextGroup.splice(idx2, 1)[0];
        if (!oppMap.has(floater)) oppMap.set(floater, new Set());
        if (!oppMap.has(b)) oppMap.set(b, new Set());
        oppMap.get(floater).add(b); oppMap.get(b).add(floater);
        pairs.push([floater, b]);
      } else {
        pairs.push([floater, null]); // BYE
      }
    }
  }
  return pairs;
}

/* ---------- IPC ---------- */

ipcMain.handle('swiss:start', (_e, { totalRounds = 4 } = {}) => {
  if (totalRounds < 1) totalRounds = 1;

  const tstmt = db.prepare(`INSERT INTO swiss_tournaments(total_rounds) VALUES (?)`);
  const rstmt = db.prepare(`INSERT INTO swiss_rounds(tournament_id, round_number) VALUES (?, ?)`);
  const mstmt = db.prepare(`
    INSERT INTO swiss_matches (tournament_id, round_id, round_number, fencer_a_id, fencer_b_id)
    VALUES (?,?,?,?,?)
  `);

  const tx = db.transaction((_rounds) => {
    const t = tstmt.run(totalRounds);
    const tid = t.lastInsertRowid;
    const r = rstmt.run(tid, 1);
    const rid = r.lastInsertRowid;
    const pairs = pairNextRound(tid, 1);
    for (const [a, b] of pairs) {
      const ins = mstmt.run(tid, rid, 1, a, b);
      if (b == null) {
        db.prepare(`UPDATE swiss_matches SET score_a=5, score_b=0, finished=1 WHERE id=?`)
          .run(ins.lastInsertRowid);
      }
    }
    return tid;
  });

  const tournamentId = tx(totalRounds);
  const s = getTournamentState(tournamentId);
  s.standings = computeStandings(tournamentId);
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('app:progress-updated'));
  return s;
});

ipcMain.handle('swiss:state', () => {
  const t = db.prepare(`SELECT * FROM swiss_tournaments ORDER BY id DESC LIMIT 1`).get();
  if (!t) return { tournament: null, rounds: [], matches: [], standings: [] };
  const s = getTournamentState(t.id);
  s.standings = computeStandings(t.id);
  return s;
});

ipcMain.handle('swiss:report', (_e, { matchId, scoreA, scoreB }) => {
  const row = db.prepare(`SELECT * FROM swiss_matches WHERE id=?`).get(matchId);
  if (!row) return { success: false, error: 'Match not found' };

  const a = Math.max(0, Math.min(5, Number(scoreA ?? 0)));
  const b = Math.max(0, Math.min(5, Number(scoreB ?? 0)));
  const finished = (a === 5 || b === 5) ? 1 : 0;

  db.prepare(`
    UPDATE swiss_matches SET score_a=?, score_b=?, finished=? WHERE id=?
  `).run(a, b, finished, matchId);

  const t = db.prepare(`SELECT id FROM swiss_tournaments ORDER BY id DESC LIMIT 1`).get();
  const standings = t ? computeStandings(t.id) : [];
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('app:progress-updated'));
  return { success: true, finished, standings };
});

ipcMain.handle('swiss:nextRound', () => {
  const t = db.prepare(`SELECT * FROM swiss_tournaments ORDER BY id DESC LIMIT 1`).get();
  if (!t) return { success: false, error: 'No tournament' };

  const lastRound = db.prepare(`
    SELECT COALESCE(MAX(round_number),0) AS r FROM swiss_rounds WHERE tournament_id=?
  `).get(t.id).r;

  const unfinished = db.prepare(`
    SELECT COUNT(*) AS c FROM swiss_matches WHERE tournament_id=? AND round_number=? AND finished=0
  `).get(t.id, lastRound).c;
  if (unfinished > 0) return { success: false, error: 'Finish all matches in the current round first' };

  if (lastRound >= t.total_rounds) return { success: false, error: 'All rounds generated' };

  const rstmt = db.prepare(`INSERT INTO swiss_rounds(tournament_id, round_number) VALUES (?, ?)`);
  const mstmt = db.prepare(`
    INSERT INTO swiss_matches (tournament_id, round_id, round_number, fencer_a_id, fencer_b_id)
    VALUES (?,?,?,?,?)
  `);

  const tx = db.transaction(() => {
    const r = rstmt.run(t.id, lastRound + 1);
    const rid = r.lastInsertRowid;
    const pairs = pairNextRound(t.id, lastRound + 1);
    for (const [a, b] of pairs) {
      const ins = mstmt.run(t.id, rid, lastRound + 1, a, b);
      if (b == null) {
        db.prepare(`UPDATE swiss_matches SET score_a=5, score_b=0, finished=1 WHERE id=?`)
          .run(ins.lastInsertRowid);
      }
    }
  });
  tx();

  const s = getTournamentState(t.id);
  s.standings = computeStandings(t.id);
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('app:progress-updated'));
  return { success: true, ...s };
});

ipcMain.handle('swiss:reset', () => {
  try {
    // wipe inside txn
    const wipe = db.transaction(() => {
      db.prepare(`DELETE FROM swiss_matches`).run();
      db.prepare(`DELETE FROM swiss_rounds`).run();
      db.prepare(`DELETE FROM swiss_tournaments`).run();
    });
    wipe();

    // reset autoincrement if sqlite_sequence exists
    const hasSeq = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'
    `).get();
    if (hasSeq) {
      db.prepare(`
        DELETE FROM sqlite_sequence
        WHERE name IN ('swiss_matches','swiss_rounds','swiss_tournaments')
      `).run();
    }

    // vacuum outside txn
    try { db.prepare(`VACUUM`).run(); } catch (_) {}

    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('app:progress-updated'));
    return { success: true };
  } catch (e) {
    console.error('swiss:reset failed', e);
    return { success: false, error: String(e?.message || e) };
  }
});

ipcMain.handle('swiss:debugCounts', () => {
  try {
    const t = db.prepare(`SELECT COUNT(*) AS c FROM swiss_tournaments`).get().c;
    const r = db.prepare(`SELECT COUNT(*) AS c FROM swiss_rounds`).get().c;
    const m = db.prepare(`SELECT COUNT(*) AS c FROM swiss_matches`).get().c;
    const lastRound = db.prepare(`
      SELECT COALESCE(MAX(round_number),0) AS r FROM swiss_rounds
    `).get().r;
    return { success: true, t, r, m, lastRound };
  } catch (e) {
    return { success: false, error: String(e?.message || e) };
  }
});
