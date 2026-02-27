# ADAM Powerbuilding — Codebase Guide

This document explains the structure of the codebase so you can safely modify, extend, or hand off to another agent. The app is a **single-file** SPA: `app.html` contains all HTML, CSS, and JavaScript.

---

## Project Structure

```
Powerbuilding program/
├── app.html            # Main app (everything lives here)
├── smart-test.html     # Offline Smart tab test — fictional data, never touches your logs
├── validation-test.html # Engine validation suite — 10 scenarios, output contract, scoring, stability tests
├── index.html          # Redirects to app.html
├── manifest.json     # PWA manifest
├── sw.js             # Service worker (cache version)
├── Code.gs           # Google Apps Script for Sheets sync
├── CODEBASE.md       # This file
└── .gitignore
```

---

## Smart Tab Test (`smart-test.html`)

**Purpose:** Offline test harness for the Smart Program logic. Uses fictional athlete data — never reads or writes `localStorage`, so your real logs are untouched.

**How to use:** Open `smart-test.html` in a browser. Use the Scenario dropdown to pick a fictional case (empty user, stalled lifts, high fatigue, deload, cross-day, etc.). Use the Week dropdown to view different weeks. The output mirrors the Smart tab in `app.html`.

**Scenarios:**
1. Empty — New user, no logs  
2. Week 1 partial — Mon/Tue only, low RPE (under volume)  
3. Week 5 full — All days, good RPE (on track)  
4. Week 6 deload — Reduced volume  
5. Week 8 stalled — Bench & Hack same weight 3 weeks  
6. Week 10 high fatigue — Lots of RPE 9–10  
7. Week 12 Sun — 3rd quad day (cross-day)  
8. Week 5 under — 50% program (add volume)  
9. No RPE — Tests hard-set fallback to raw sets  
10. Vol no strength — Volume up, strength flat (learned rec)

**Sync note:** The Smart logic is duplicated from `app.html`. When you change Smart behavior in `app.html`, update the matching code in `smart-test.html`.

**Validation API:** `runValidationScenario(logs, wk)` and `getEngineMetrics(wk)` are exposed for `validation-test.html` to run scenarios programmatically.

---

## Engine Validation Suite (`validation-test.html`)

**Purpose:** Validates engine correctness, consistency, stability, actionability, and safety. Loads `smart-test.html` in an iframe and runs 10 synthetic athletes.

**How to use:** Run a local server (e.g. `npx serve` or `python -m http.server`) in the project folder, then open `validation-test.html` in a browser. (file:// blocks iframe cross-origin access.) Click "Run Full Validation" for the Scenario Summary Table and failing-scenario details. Click "Run Stability (Noise) Tests" to verify outputs don't flip with ±1 rep, ±2.5% load, RIR±0.5 noise.

**Output contract (A–E):**
- A) Week Verdict: PROGRESSING | STALL_LOCAL | STALL_SYSTEMIC | UNDERSTIMULATED | OVERREACHED | DELOAD_RECOMMENDED | DATA_INSUFFICIENT
- B) 3 Key Signals (bullets)
- C) Next Week Plan (exact edits)
- D) Guardrails (limits)
- E) Confidence score (0–100)

**10 scenarios:**
1. New athlete (no logs) → DATA_INSUFFICIENT  
2. Understimulated novice → add volume + proximity  
3. Local stall (bench only) → bench tweak, no global reduce  
4. Systemic stall → reduce 10–20% or deload  
5. Junk volume → reduce volume, keep intensity  
6. 3rd quad day (Sun) → reduce day-3 or pump  
7. Strength up, bodyweight flat → progression (engine has no nutrition)  
8. High fatigue but progressing → hold, recovery constraints  
9. Missing RIR data → fallback, lower confidence  
10. Exercise swap (stall) → substitute from allowed list  

**Scoring:** 40% verdict correctness, 40% plan correctness, 20% format compliance. Pass = score ≥70, verdict match, no guard violation.

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

### 2. HYPERTROPHY SCIENCE ENGINE (~814–980)

**Search:** `// HYPERTROPHY SCIENCE ENGINE`

Performance-driven model: stimulus from e1RM + effective reps + proximity (no RPE required).

| Function/Const | Purpose | Dependencies |
|----------------|---------|--------------|
| `MUSCLE_MODEL` | Maps exercise keywords → muscles + length bias | Must stay aligned with `BODY_MAP` |
| `getMuscleWeights(exName)` | Returns `{chest:0.6, triceps:0.25, …}` | `MUSCLE_MODEL` |
| `getLengthBias(exName)` | 0.9–1.1 for lengthened work | `MUSCLE_MODEL` |
| `getBestE1RMForExercise(ex, weeksBack, optWk)` | Best e1RM in last N weeks | `ST.logs` |
| `estimateRIR(l, bestE1RM)` | Predicted reps − actual reps (Epley) | Weight, reps, e1RM |
| `proximityFromEstimatedRIR(rir)` | RIR → proximity factor (1.1, 1.0, 0.8, 0.5) | — |
| `getEffectiveReps(rir)` | max(0, 5 − RIR) — last-5-reps model | — |
| `getSetStimulusUnits(l, bestE1RM)` | MuscleContribution × EffReps × LengthBias × Tension | — |
| `getSetFatigueCost(l, bestE1RM)` | Volume load × compound mult × intensity | `isCompound` |
| `getWeeklyStimulus(wk)` | Sum stimulus units per muscle | `ST.logs` |
| `getWeeklyFatigue(wk)` | Sum fatigue cost | Same |
| `getWeeklyHardSets(wk)` | Backward compat: stimulating sets per muscle | Same |
| `getFatigueFlags(wk)` | High RPE, perf down, fatigue trend | Same |
| `getCoreMetrics(wk)` | **4 foundations**: stimulus, effectiveReps, localFatigue, systemicFatigue, e1rmTrend, ratio | — |
| `getStimulusToFatigueRatio(wk)` | Per-muscle stimulus÷fatigue — key adaptive signal | — |
| `getLocalFatiguePerMuscle(wk)` | Fatigue cost attributed to each muscle | — |
| `getEffectiveRepsPerMuscle(wk)` | Σ max(0, 5−RIR) × muscle weight per muscle | — |
| `getE1RMTrend(wk)` | 3–4 week slope, % change for compounds | — |
| `STIMULUS_TARGET` / `STIMULUS_CEILING` | Per-muscle stimulus targets (replace set counts as primary) | — |
| `getStalledLifts(optWk)` | Objective stall: volume-induced / under-stim / intensity | Same |
| `getAdaptationState(wk)` | e1RM trend, fatigue rising, junk volume — gates add_volume | Same |
| `VOLUME_CEILINGS` | Per-muscle ceiling (10–22 sets) — prevents junk volume | — |
| `getFatigueMultiplier(exName)` | Barbell 1.3, machine compound 1.0, isolation 0.7 | — |

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
