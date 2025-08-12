PR3 – Divisions & Full Placement DE Brackets (x16)

What's included
---------------
• electron/ipc-divisions.js
  - divisions:create   → slices Swiss final standings into groups of 16 and seeds 1v16, 8v9, ... 2v15
  - divisions:list     → list all divisions (id, name, size)
  - division:state     → { division, fencers(seeds), matches(with names) }
  - division:report    → save scores (to 15) and auto-advance winner/loser via pointers
• electron/db/migrations/005_divisions.sql
  - divisions, division_fencers, de_matches tables (+ indexes)
• src/pages/Divisions.jsx           → cards view (Division 1..N), create-from-Swiss button
• src/pages/DivisionBracket.jsx     → per-division bracket with score inputs to 15
• README-PR3.txt (this file)
• snippets/preload.additions.txt    → paste inside contextBridge.exposeInMainWorld('api', { ... })
• snippets/main.additions.txt       → add the require hook line
• snippets/types.additions.d.ts     → optional Window.api typings to paste into src/types/global.d.ts

Install (one-time)
------------------
1) Copy the files over your repo at the same relative paths.
2) Ensure your migration loader will pick up:
   electron/db/migrations/005_divisions.sql
3) Update Electron preload & main:
   - In electron/preload.js add the lines from snippets/preload.additions.txt
   - In electron/main.js add: require('./ipc-divisions')
4) (Optional) Install the bracket UI lib (we gracefully fall back if absent):
   npm i @g-loot/react-tournament-brackets
5) Add routes if you haven't already:
   import Divisions from './pages/Divisions.jsx';
   import DivisionBracket from './pages/DivisionBracket.jsx';
   <Route path="/divisions" element={<Divisions/>} />
   <Route path="/divisions/:id" element={<DivisionBracket/>} />

How to use
----------
• Finish Swiss (or at least get a standings order).
• Go to Divisions → click "Create Divisions (from Swiss)".
• Click a Division card to open its bracket.
• Enter scores (to 15). Once 15 is reached on either side, the match is marked
  finished and both winner & loser are advanced to their next matches automatically.
• All divisions & matches are persisted in SQLite; no internet required.

Notes
-----
• Full placement: 1–16 + 5–8, 9–12, 13–16 and 3rd, 5th, 9th, 13th placement matches.
• We keep the UI dark-mode and reuse your toast system for errors.
• If the optional library isn't installed, the page renders a simple grouped layout
  with the same score editing and advancing behavior.
