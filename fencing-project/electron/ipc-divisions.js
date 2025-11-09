'use strict';
const { ipcMain, BrowserWindow } = require('electron');
const { db } = require('./db');

console.log('[main] loaded ipc-divisions');


/** -------- standings from swiss -------- */
function swissFinalStandings() {
  const t = db.prepare(`SELECT id, total_rounds FROM swiss_tournaments ORDER BY id DESC LIMIT 1`).get();
  if (!t) return [];
  const fencers = db.prepare(`SELECT id, name FROM fencers WHERE is_valid=1`).all();
  const map = new Map(fencers.map(f => [f.id, { ...f, wins:0, ts:0, tr:0, td:0 }]));

  const ms = db.prepare(`SELECT * FROM swiss_matches WHERE tournament_id=?`).all(t.id);
  for (const m of ms) {
    const A = map.get(m.fencer_a_id);
    const B = m.fencer_b_id ? map.get(m.fencer_b_id) : null;
    if (!A) continue;
    if (!B) { A.wins += 1; A.ts += 5; A.tr += 0; A.td = A.ts - A.tr; continue; }
    if (!m.finished) continue;
    A.ts += m.score_a; A.tr += m.score_b; A.td = A.ts - A.tr;
    B.ts += m.score_b; B.tr += m.score_a; B.td = B.ts - B.tr;
    if (m.score_a > m.score_b) A.wins += 1;
    else if (m.score_b > m.score_a) B.wins += 1;
  }
  const arr = Array.from(map.values());
  arr.sort((a,b)=>
    b.wins - a.wins ||
    b.ts - a.ts ||
    a.tr - b.tr ||
    b.td - a.td ||
    a.name.localeCompare(b.name)
  );
  return arr;
}

/** ------- bracket blueprint (full placement for 16) -------
 * Matches have next pointers for winner & loser advancement.
 */
function createBracketMatches(divId) {
  const M = (round_label, bracket_slot) => ({ round_label, bracket_slot });

  const rows = [];
  // Reserve ids in stable order
  for (let i=1;i<=8;i++) rows.push(M('R16', i));        // 1..8
  for (let i=1;i<=4;i++) rows.push(M('QF', i));         // 9..12
  rows.push(M('SF', 1));                                // 13
  rows.push(M('SF', 2));                                // 14
  rows.push(M('F', 1));                                 // 15
  rows.push(M('5-8 SF', 1));                            // 16
  rows.push(M('5-8 SF', 2));                            // 17
  rows.push(M('5th', 1));                               // 18
  rows.push(M('3rd', 1));                               // 19
  rows.push(M('9-16 QF', 1));                           // 20
  rows.push(M('9-16 QF', 2));                           // 21
  rows.push(M('9-16 QF', 3));                           // 22
  rows.push(M('9-16 QF', 4));                           // 23
  rows.push(M('9-12 SF', 1));                           // 24
  rows.push(M('9-12 SF', 2));                           // 25
  rows.push(M('9th', 1));                               // 26
  rows.push(M('13-16 SF', 1));                          // 27
  rows.push(M('13-16 SF', 2));                          // 28
  rows.push(M('13th', 1));                              // 29

  // Insert placeholders
  const insert = db.prepare(`
    INSERT INTO de_matches (division_id, round_label, bracket_slot,
      winner_next_id, winner_next_slot, loser_next_id, loser_next_slot)
    VALUES (?,?,?,?,?,?,?)
  `);
  const ids = [];
  const tx = db.transaction(() => {
    for (const r of rows) {
      const info = insert.run(divId, r.round_label, r.bracket_slot, null, null, null, null);
      ids.push(info.lastInsertRowid);
    }
  });
  tx();

  const ID = {
    R16_1: ids[0], R16_2: ids[1], R16_3: ids[2], R16_4: ids[3], R16_5: ids[4], R16_6: ids[5], R16_7: ids[6], R16_8: ids[7],
    QF1: ids[8], QF2: ids[9], QF3: ids[10], QF4: ids[11],
    SF1: ids[12], SF2: ids[13], F: ids[14],
    SF5_8_1: ids[15], SF5_8_2: ids[16], P5TH: ids[17], P3RD: ids[18],
    QF9_16_1: ids[19], QF9_16_2: ids[20], QF9_16_3: ids[21], QF9_16_4: ids[22],
    SF9_12_1: ids[23], SF9_12_2: ids[24], P9TH: ids[25],
    SF13_16_1: ids[26], SF13_16_2: ids[27], P13TH: ids[28],
  };

  const upd = db.prepare(`UPDATE de_matches SET winner_next_id=?, winner_next_slot=?, loser_next_id=?, loser_next_slot=? WHERE id=?`);
  const U = (id, wId,wSlot, lId,lSlot) => upd.run(wId, wSlot, lId, lSlot, id);

  // R16 winners -> QF, losers -> 9-16 QF
  U(ID.R16_1, ID.QF1,'A', ID.QF9_16_1,'A');
  U(ID.R16_2, ID.QF1,'B', ID.QF9_16_1,'B');
  U(ID.R16_3, ID.QF2,'A', ID.QF9_16_2,'A');
  U(ID.R16_4, ID.QF2,'B', ID.QF9_16_2,'B');
  U(ID.R16_5, ID.QF3,'A', ID.QF9_16_3,'A');
  U(ID.R16_6, ID.QF3,'B', ID.QF9_16_3,'B');
  U(ID.R16_7, ID.QF4,'A', ID.QF9_16_4,'A');
  U(ID.R16_8, ID.QF4,'B', ID.QF9_16_4,'B');

  // QF winners -> SF; losers -> 5-8 SF
  U(ID.QF1, ID.SF1,'A', ID.SF5_8_1,'A');
  U(ID.QF2, ID.SF1,'B', ID.SF5_8_1,'B');
  U(ID.QF3, ID.SF2,'A', ID.SF5_8_2,'A');
  U(ID.QF4, ID.SF2,'B', ID.SF5_8_2,'B');

  // SF winners -> F; losers -> 3rd
  U(ID.SF1, ID.F,'A', ID.P3RD,'A');
  U(ID.SF2, ID.F,'B', ID.P3RD,'B');

  // 5-8: winners -> 5th
  U(ID.SF5_8_1, ID.P5TH,'A', null,null);
  U(ID.SF5_8_2, ID.P5TH,'B', null,null);

  // 9-16: QF winners -> 9-12 SF; losers -> 13-16 SF
  U(ID.QF9_16_1, ID.SF9_12_1,'A', ID.SF13_16_1,'A');
  U(ID.QF9_16_2, ID.SF9_12_1,'B', ID.SF13_16_1,'B');
  U(ID.QF9_16_3, ID.SF9_12_2,'A', ID.SF13_16_2,'A');
  U(ID.QF9_16_4, ID.SF9_12_2,'B', ID.SF13_16_2,'B');

  // 9-12 winners -> 9th
  U(ID.SF9_12_1, ID.P9TH,'A', null,null);
  U(ID.SF9_12_2, ID.P9TH,'B', null,null);

  // 13-16 winners -> 13th
  U(ID.SF13_16_1, ID.P13TH,'A', null,null);
  U(ID.SF13_16_2, ID.P13TH,'B', null,null);

  return ID;
}

function advanceFromRow(row, aScore, bScore) {
  const winnerId = (aScore > bScore) ? row.a_fencer_id : row.b_fencer_id;
  const loserId  = (aScore > bScore) ? row.b_fencer_id : row.a_fencer_id;

  if (row.winner_next_id && winnerId) {
    const col = row.winner_next_slot === 'B' ? 'b_fencer_id' : 'a_fencer_id';
    db.prepare(`UPDATE de_matches SET ${col}=? WHERE id=?`).run(winnerId, row.winner_next_id);
  }
  if (row.loser_next_id && loserId) {
    const col = row.loser_next_slot === 'B' ? 'b_fencer_id' : 'a_fencer_id';
    db.prepare(`UPDATE de_matches SET ${col}=? WHERE id=?`).run(loserId, row.loser_next_id);
  }
}


/** ------- Create divisions from Swiss standings ------- */
ipcMain.handle('divisions:create', () => {
  const standings = swissFinalStandings();
  if (standings.length === 0) return { success:false, error:'No standings found. Finish Swiss first.' };

  const tx = db.transaction(() => {
    // wipe previous divisions for fresh seeding
    db.prepare(`DELETE FROM de_matches`).run();
    db.prepare(`DELETE FROM division_fencers`).run();
    db.prepare(`DELETE FROM divisions`).run();

    let created = [];
    for (let i=0; i<standings.length; i+=16) {
      const slice = standings.slice(i, i+16);
      const divName = `Division ${Math.floor(i/16)+1}`;
      const divInfo = db.prepare(`INSERT INTO divisions (name, seed_start_index) VALUES (?, ?)`)
        .run(divName, i+1);
      const divId = divInfo.lastInsertRowid;

      // seed → fencer map within division (pad to 16 with null = BYE)
      const seedToFencerId = {};
      for (let s = 1; s <= 16; s++) {
        seedToFencerId[s] = slice[s - 1]?.id ?? null;
      }

      // save division_fencers for the ones that exist
      const insDF = db.prepare(`INSERT INTO division_fencers (division_id, seed, fencer_id) VALUES (?,?,?)`);
      for (let s = 1; s <= 16; s++) {
        const fid = seedToFencerId[s];
        if (fid) insDF.run(divId, s, fid);
      }

      // build matches and pointers
      const ID = createBracketMatches(divId);

      // initial R16 seeding pairs
      const pairs = [[1,16],[8,9],[5,12],[4,13],[3,14],[6,11],[7,10],[2,15]];
      const r16Ids = [ID.R16_1, ID.R16_2, ID.R16_3, ID.R16_4, ID.R16_5, ID.R16_6, ID.R16_7, ID.R16_8];
      const updAB = db.prepare(`UPDATE de_matches SET a_fencer_id=?, b_fencer_id=? WHERE id=?`);
      const finish = db.prepare(`UPDATE de_matches SET a_score=?, b_score=?, finished=1 WHERE id=?`);
      const getRow = db.prepare(`SELECT * FROM de_matches WHERE id=?`);

      pairs.forEach((pair, idx) => {
        const [sa, sb] = pair;
        const aId = seedToFencerId[sa] || null;
        const bId = seedToFencerId[sb] || null;
        const mid = r16Ids[idx];

        updAB.run(aId, bId, mid);

        // Auto‑win on BYE (15–0), immediately advance
        if (aId && !bId) {
          finish.run(15, 0, mid);
          const row = getRow.get(mid);
          advanceFromRow(row, 15, 0);
        } else if (!aId && bId) {
          finish.run(0, 15, mid);
          const row = getRow.get(mid);
          advanceFromRow(row, 0, 15);
        }
      });


      created.push({ id: divId, name: divName, size: slice.length });
    }
    return created;
  });

  const created = tx();
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('app:progress-updated'));
  return { success:true, created };
});

/** ------- List divisions ------- */
ipcMain.handle('divisions:list', () => {
  const list = db.prepare(`
    SELECT d.id, d.name,
           (SELECT COUNT(*) FROM division_fencers df WHERE df.division_id=d.id) AS size
    FROM divisions d
    ORDER BY d.id
  `).all();
  return list;
});

/** ------- Division state (matches with names) ------- */
ipcMain.handle('division:state', (_e, { divisionId }) => {
  const div = db.prepare(`SELECT * FROM divisions WHERE id=?`).get(divisionId);
  if (!div) return { division:null, fencers:[], matches:[] };

  const fencers = db.prepare(`
    SELECT df.seed, f.id, f.name, f.club, f.weapon
    FROM division_fencers df
    JOIN fencers f ON f.id = df.fencer_id
    WHERE df.division_id=?
    ORDER BY df.seed
  `).all(divisionId);

  const matches = db.prepare(`
    SELECT m.*,
           fa.name AS a_name,
           fb.name AS b_name
    FROM de_matches m
    LEFT JOIN fencers fa ON fa.id = m.a_fencer_id
    LEFT JOIN fencers fb ON fb.id = m.b_fencer_id
    WHERE m.division_id=?
    ORDER BY m.id
  `).all(divisionId);

  return { division: div, fencers, matches };
});

/** ------- Report DE score (to 15) and advance ------- */
ipcMain.handle('division:report', (_e, { matchId, aScore, bScore }) => {
  const row = db.prepare(`SELECT * FROM de_matches WHERE id=?`).get(matchId);
  if (!row) return { success:false, error:'Match not found' };

  // If one side is BYE, force auto‑finish
  const isBye = (!row.a_fencer_id && row.b_fencer_id) || (row.a_fencer_id && !row.b_fencer_id);
  let a = Math.max(0, Math.min(15, Number(aScore ?? 0)));
  let b = Math.max(0, Math.min(15, Number(bScore ?? 0)));
  if (isBye) { a = row.a_fencer_id ? 15 : 0; b = row.b_fencer_id ? 15 : 0; }

  const finished = (a === 15 || b === 15) ? 1 : 0;
  db.prepare(`UPDATE de_matches SET a_score=?, b_score=?, finished=? WHERE id=?`)
    .run(a, b, finished, matchId);

  if (finished) advanceFromRow(row, a, b);

  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('app:progress-updated'));
  return { success:true };
});

/** ------- Medalists (Gold, Silver, two Bronzes) per division ------- */
ipcMain.handle('divisions:medalists', () => {
  // For each division, compute top 4 using F and SFs.
  const divisions = db.prepare(`SELECT id, name FROM divisions ORDER BY id`).all();
  const medalists = [];

  const getMatch = db.prepare(`
    SELECT m.*, fa.name AS a_name, fa.club AS a_club, fb.name AS b_name, fb.club AS b_club
    FROM de_matches m
    LEFT JOIN fencers fa ON fa.id = m.a_fencer_id
    LEFT JOIN fencers fb ON fb.id = m.b_fencer_id
    WHERE m.division_id=? AND m.round_label=?
    ORDER BY m.bracket_slot
  `);

  for (const d of divisions) {
    const finals = getMatch.all(d.id, 'F');
    const sfs = getMatch.all(d.id, 'SF');
    if (finals.length === 0 || sfs.length < 2) continue;

    const F = finals[0];
    // Determine Gold/Silver from Final (fallback to nulls if unfinished)
    let gold = null, silver = null;
    if (F.a_fencer_id && F.b_fencer_id && (F.finished || (F.a_score != null && F.b_score != null))) {
      const aWins = (F.a_score ?? 0) > (F.b_score ?? 0);
      const winId = aWins ? F.a_fencer_id : F.b_fencer_id;
      const winName = aWins ? F.a_name : F.b_name;
      const winClub = aWins ? (F.a_club || '') : (F.b_club || '');
      const loseId = aWins ? F.b_fencer_id : F.a_fencer_id;
      const loseName = aWins ? F.b_name : F.a_name;
      const loseClub = aWins ? (F.b_club || '') : (F.a_club || '');
      gold = { division_id: d.id, division_name: d.name, place: 1, medal: 'Gold', fencer_id: winId, name: winName, club: winClub };
      silver = { division_id: d.id, division_name: d.name, place: 2, medal: 'Silver', fencer_id: loseId, name: loseName, club: loseClub };
    }

    // Two bronzes: semifinals losers
    const bronzeEntries = [];
    for (const sf of sfs) {
      if (!sf.a_fencer_id || !sf.b_fencer_id || (sf.a_score == null && sf.b_score == null)) continue;
      const aWins = (sf.a_score ?? 0) > (sf.b_score ?? 0);
      const loserId = aWins ? sf.b_fencer_id : sf.a_fencer_id;
      const loserName = aWins ? sf.b_name : sf.a_name;
      const loserClub = aWins ? (sf.b_club || '') : (sf.a_club || '');
      bronzeEntries.push({ division_id: d.id, division_name: d.name, place: 3, medal: 'Bronze', fencer_id: loserId, name: loserName, club: loserClub });
    }

    if (gold) medalists.push(gold);
    if (silver) medalists.push(silver);
    // If only one SF reported, still push that bronze
    for (const b of bronzeEntries) medalists.push(b);
  }

  return { success: true, medalists };
});
