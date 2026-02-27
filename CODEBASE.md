# ADAM Powerbuilding — Codebase Guide

This document explains the structure of the codebase so you can safely modify, extend, or hand off to another agent. The app is a **single-file** SPA: `app.html` contains all HTML, CSS, and JavaScript.

---

## Project Structure

```
Powerbuilding program/
├── app.html          # Main app (everything lives here)
├── index.html        # Redirects to app.html
├── manifest.json     # PWA manifest
├── sw.js             # Service worker (cache version)
├── Code.gs           # Google Apps Script for Sheets sync
├── CODEBASE.md       # This file
└── .gitignore
```

---

## How to Navigate `app.html`

The file is ~3500 lines. Use the section markers (`// ═══` or `// ──`) to jump. Order:

1. **Lines 1–34**: `<head>`, Firebase init, Chart.js
2. **Lines 35–420**: `<style>` — all CSS (variables, nav, cards, forms)
3. **Lines 421–735**: HTML body — page containers, modals, nav
4. **Lines 737–3480**: `<script>` — JavaScript

---

## JavaScript Sections (with Line Ranges)

Search for these exact strings to jump.

### 1. PROGRAM DATA (~738–811)

**Search:** `// PROGRAM DATA`

| Item | Purpose | Change when… |
|------|---------|--------------|
| `P` | Program template: `{mon,tue,wed,thu,fri,sat,sun}`. Each day has `exercises[]` with `id,name,sets,reps,rest,type,cue,mech` | Adding/removing exercises, changing reps/sets |
| `DO` | Day order array `['mon','tue',…]` | Changing week structure |
| `DLOADS` | Set of deload weeks (e.g. 3,6,9,12…) | Adjusting deload schedule |
| `DELOAD_PCT` | % of weight per deload week | Changing deload intensity |
| `getBlockPhase(wk)` | Returns block name + phase string | Block/periodization changes |
| `WEEKLY_TARGETS` | Per-muscle set targets and status | Volume targets per muscle |

---

### 2. HYPERTROPHY SCIENCE ENGINE (~814–915)

**Search:** `// HYPERTROPHY SCIENCE ENGINE`

Schoenfeld causality model: mechanical tension, metabolic stress, muscle damage.

| Function/Const | Purpose | Dependencies |
|----------------|---------|--------------|
| `MUSCLE_MODEL` | Maps exercise keywords → muscles + length bias | Must stay aligned with `BODY_MAP` |
| `getMuscleWeights(exName)` | Returns `{chest:0.6, triceps:0.25, …}` | `MUSCLE_MODEL` |
| `getLengthBias(exName)` | 0.9–1.1 for lengthened work | `MUSCLE_MODEL` |
| `isHardSet(l)` | True if RPE≥7 OR reps≥12+RPE≥8 OR drop set | Log rows with `rpe`, `r`, `ex` |
| `getWeeklyHardSets(wk)` | Hard sets per muscle for week | `ST.logs`, `isHardSet`, `getMuscleWeights` |
| `getWeeklyStimulus(wk)` | Stimulus heuristic per muscle | Same |
| `getPerformanceTrend(exName)` | e1RM slope for compounds | `ST.logs` |
| `getFatigueFlags(wk)` | High RPE count, performance drop | `ST.logs`, `isCompound` |

**Adding a new exercise to `MUSCLE_MODEL`:** Add `{keys:['Keyword'], muscles:{muscle:weight}, len:1.05}`. More specific keys should appear earlier (they match first).

---

### 3. BODY MAPPING & SCHEDULE (~917–1029)

**Search:** `// Body part mapping` or `BODY_MAP`

| Item | Purpose | Change when… |
|------|---------|--------------|
| `BODY_MAP` | Maps exercise keywords → body part (quads, chest, etc.) | New exercises, new muscles |
| `getBodyPart(exName)` | Primary body part for an exercise | — |
| `MUSCLE_TO_BP` | Maps muscle string → tracker key | — |
| `getBodyPartFromMuscle(m)` | EL.m → body part | When `EL` muscle names change |
| `DAY_NAMES` | `{mon:'Monday',…}` | — |
| `getScheduleForWeek(wk)` | Which day keys map to which template day (handles rest days, overrides) | Schedule logic |
| `getDayProgram(dk)` | Merges base program + added exercises for a day | — |
| `openScheduleEditor`, `saveSchedule` | Week schedule UI | — |

**Important:** `getBodyPart` and `getMuscleWeights` use different lookups. `BODY_MAP` is for simple body-part tracking; `MUSCLE_MODEL` is for the science engine.

---

### 4. HISTORIC DATA & EXERCISE LIBRARY (~1058–1121)

**Search:** `const HL=` or `let EL=`

| Item | Purpose | Format |
|------|---------|--------|
| `HL` | Seed/sample log data | `{date,dk,dn,wk,bl,ex,sn,w,r,…}` |
| `EL` | Exercise library for swap/add | `{n:name, m:muscle}`; custom items have `custom:true` |

**Adding exercises:** Push to `EL` or use the Add Exercise UI (saves to `adamCustomEx`).

---

### 5. STATE & PERSISTENCE (~1123–1172)

**Search:** `// STATE` or `let ST=`

| Item | Purpose | Storage key |
|------|---------|-------------|
| `ST` | Global state: `wk`, `bl`, `logs`, `ovr`, `aday`, `aws`, `awExs`, `profile`, `weekSchedules`, `addedExercises`, etc. | `adamv3` (settings), `adamlogs` (logs), `adamWIP` (in-progress workout) |
| `loadST()` | Loads settings + logs from localStorage | Called on init |
| `saveST()`, `saveLogs()` | Persist to localStorage + Firebase | — |

**Do not** rename `ST` without updating every reference. It is used throughout.

---

### 6. SHEETS SYNC (~1155–1172)

**Search:** `// SHEETS SYNC`

| Function | Purpose |
|----------|---------|
| `sheetsPOST(payload)` | Sends data to Google Apps Script |
| `setSS(s)` | Updates connection status UI |

---

### 7. NAVIGATION (~1174–1187)

**Search:** `// NAV`

| Function | Purpose |
|----------|---------|
| `showPg(p)` | Switches page: `'home'`, `'smart'`, `'an'`, `'ex'`. Calls `renderHome`, `renderSmartProgram`, etc. |

---

### 8. HOME PAGE (~1189–1373)

**Search:** `// HOME`

| Function | Purpose |
|----------|---------|
| `renderHome()` | Renders week strip, day cards, stats, body tracker |
| `renderProfile()` | Athlete profile form |
| `renderPRBoard()` | PRs for the week |
| `renderRestDayBtns()` | Rest day toggles |
| `renderBodyTracker()` | Weekly muscle coverage + targets |

---

### 9. FATIGUE DETECTION (~1271–1373)

**Search:** `detectOverreaching` or `// FATIGUE`

| Function | Purpose |
|----------|---------|
| `detectOverreaching()` | Analyzes logs for overreaching (high RPE, volume vs strength, etc.) |
| `renderFatigueCard()` | Renders fatigue card on Home |

**Modifying logic:** Edit `detectOverreaching()`. It returns `{signals, fatigueScore, recommendation}`.

---

### 10. SMART PROGRAM (~1375–1676)

**Search:** `// SMART PROGRAM` or `computeSmartRecommendations`

| Function | Purpose |
|----------|---------|
| `getAlternativesForBodyPart(bp, excludeName, favorLengthened)` | Swap suggestions from `EL`, optionally sorted by length bias |
| `getSmartTipForExercise(...)` | Per-exercise tips: pre-fatigue, stall, volume met, cross-day, etc. |
| `computeSmartRecommendations(wk)` | Week + per-day + per-exercise recommendations; calls engine functions |
| `renderSmartProgram()` | Renders Smart tab UI |

**Dependencies:** `getWeeklyHardSets`, `getFatigueFlags`, `getActualSets`, `getStalledLifts`, `detectOverreaching`, `getScheduleForWeek`, `P`, `WEEKLY_TARGETS`.

---

### 11. BODY TRACKER HELPERS (~1695–1765)

**Search:** `getPrescribedSets` or `getActualSets`

| Function | Purpose |
|----------|---------|
| `getPrescribedSets()` | Sets per muscle from program (all days) |
| `getActualSets(wk)` | Sets logged per muscle for week |
| `renderBodyTracker()` | Renders the body tracker widget |

---

### 12. WORKOUT FLOW (~1766–2000)

**Search:** `// WORKOUT` or `openWO`

| Function | Purpose |
|----------|---------|
| `openWO(dk)` | Opens workout for day; loads WIP or template; sets `ST.aday`, `ST.awExs`, `ST.aws` |
| `renderWO()` | Renders exercise cards, set rows (weight, reps, RPE), checkboxes |

**Data flow:** `getDayProgram(dk)` → exercises → `ST.awExs`. Each set: `ST.aws[exId][setIdx]` = `{w,r,rpe,done}`.

---

### 13. SET OPERATIONS (~2002–2167)

**Search:** `// SET OPERATIONS` or `upS`

| Function | Purpose |
|----------|---------|
| `upS(id, si, f, v)` | Updates set field: `w`, `r`, or `rpe` |
| `ckS(id, si, rest, dn)` | Toggles set done; starts rest timer |
| `addS(id)`, `delSet(id, si)` | Add/remove set |
| `saveWorkoutProgress()` | Saves to `adamWIP` |
| `loadWorkoutProgress(dk)` | Restores in-progress workout |

---

### 14. EXERCISE ADD/REMOVE/REORDER (~2168–2272)

**Search:** `// EXERCISE ADD` or `delEx`

| Function | Purpose |
|----------|---------|
| `delEx(exIdx)` | Removes exercise from today's workout |
| `openAddEx()` | Opens Add Exercise modal |
| `initDrag()` | Drag-and-drop reorder of exercises |

---

### 15. SWAP / ADD EXERCISE MODAL (~2273–2412)

**Search:** `// SWAP / ADD EXERCISE MODAL`

| Function | Purpose |
|----------|---------|
| `openSW(dk, exIdx, origName)` | Swap modal (replace one exercise) |
| `applySW(newName, isCustom, bodyPart)` | Applies swap or add |
| `renderSWL()` | Renders exercise list in modal |

---

### 16. FINISH WORKOUT (~2413–2496)

**Search:** `function finWO` or `// FINISH`

| Function | Purpose |
|----------|---------|
| `finWO()` | Merges `ST.aws` into log rows; computes e1rm; saves to `ST.logs`; clears WIP; syncs to Firebase/Sheets |

**Log row shape:** `{id, ts, date, dk, dn, wk, bl, ex, sn, w, r, e1rm, rpe, dur}`. `ex` = display name (can differ from template after swaps).

---

### 17. REST TIMER (~2469–2531)

**Search:** `startRest` or `rest-bar`

Uses a fixed bar that slides down. Timer state in `ST.ri`. No separate section marker.

---

### 18. EDIT LOG (~2683–2752)

**Search:** `// EDIT LOG`

Edit/delete individual log entries. Uses overlay and form.

---

### 19. ANALYTICS (~2755–2934)

**Search:** `// ANALYTICS` or `renderAN`

| Function | Purpose |
|----------|---------|
| `renderAN()` | Renders analytics tabs (Performance, Volume, etc.) |
| Chart.js used for graphs | — |

---

### 20. DATA PAGE (Export/Import) (~2935–3183)

**Search:** `expCSV` or `expJSON` or `impJSON`

Export to CSV/JSON, import from JSON, Sheets connection.

---

### 21. FIREBASE (~3184–3340)

**Search:** `fbRef` or `FB_ROOT`

Sync of settings, logs, custom exercises to Firebase RTDB under `barbell-bahri`.

---

### 22. INIT (~3358–3480)

**Search:** `loadST()` or `DOMContentLoaded`

`loadST()` on load. Firebase listener. No `DOMContentLoaded` wrapper; script runs at end of body.

---

## HTML Structure (IDs)

| ID | Purpose |
|----|---------|
| `pg-home` | Home page |
| `pg-wo` | Workout page |
| `pg-an` | Analytics page |
| `pg-ex` | Data/Export page |
| `pg-smart` | Smart Program page |
| `WC` | Workout cards container |
| `WOSUM` | Workout summary bar |
| `SMB` | Smart Program body |
| `BTB` | Body tracker body |
| `DL` | Day list (Home) |
| `SWO` | Swap/Add modal |
| `SCHED` | Schedule editor |

---

## Safe Modification Guidelines

### Change the program

1. Edit `P` (Program Data, ~741).
2. Ensure new exercises exist in `EL` if used for swaps.
3. Optionally add to `MUSCLE_MODEL` and `BODY_MAP` for Smart engine and body tracking.

### Change Smart recommendations

1. `computeSmartRecommendations` — week-level logic.
2. `getSmartTipForExercise` — per-exercise tips.
3. `MUSCLE_MODEL`, `getWeeklyHardSets`, `getFatigueFlags` — engine inputs.

### Change UI / styling

1. Edit the `<style>` block (~35–420).
2. Class names match section comments (e.g. `.smart-*`, `.ec`, `.dcard`).

### Change data storage

1. `saveLogs`, `saveST` — localStorage keys.
2. `finWO` — log row structure.
3. Firebase: `fbRef`, `fbSaveSettings`, etc.

### Add a new page

1. Add `<div class="pg" id="pg-xyz">` in HTML.
2. Add nav button with `onclick="showPg('xyz')"`.
3. In `showPg`, add `if(p==='xyz') renderXYZ();`.
4. Add `renderXYZ()`.

---

## Common Pitfalls

1. **`ST` is global** — Do not shadow or replace it.
2. **Log `ex` vs template `name`** — `ex` = display name (after swaps). Use for lookups.
3. **Exercise type** — `type`: `'h'` heavy, `'s'` stretch, `'d'` drop, `'n'` normal.
4. **Day keys** — Always use `dk` (`'mon'`, `'tue'`, …), not full names.
5. **Week numbers** — 1–24; `DLOADS` marks deload weeks.

---

## Quick Reference: Key Functions by Task

| Task | Function(s) |
|------|-------------|
| Add exercise to program | Edit `P`, add to `EL` |
| Change volume targets | `WEEKLY_TARGETS` |
| Modify Smart logic | `computeSmartRecommendations`, `getSmartTipForExercise` |
| Modify muscle mapping | `MUSCLE_MODEL`, `BODY_MAP` |
| Change deload schedule | `DLOADS`, `DELOAD_PCT` |
| Add new recommendation type | `computeSmartRecommendations` + `renderSmartProgram` (rec type handling) |
| Change log format | `finWO` + any code that reads `ST.logs` |
