PR1 - Fencer Validation (drop-in)
------------------------------------------------
Extract into your project's fencing-project folder and allow overwrites for:
  - electron/main.js
  - electron/preload.js

Adds:
  - electron/ipc-fencers.js
  - src/pages/ValidateFencers.jsx

Then add a route to /validate-fencers in your React router.
Restart dev: npm run dev
