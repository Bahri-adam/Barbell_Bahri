# Program Generator — Standalone Build

All files are **separate from app.html**. Nothing is wired into the main app yet.

## Easiest: No Server Needed

**Double-click these files** — they work directly in your browser:

| File | Purpose |
|------|---------|
| **`audit-standalone.html`** | MUSCLE_MODEL audit — table of every EL exercise, matched keys, weights, fallback flag |
| **`program-gen-standalone.html`** | Program generator dry run — generates a full week program |
| **`100-athlete-program-test.html`** | Runs N athletes (default 100) with different variables (verdict, stalledMap, split, deload). Output shows how programs evolve. Copy output and paste into Claude for analysis. |

No Python, Node, or server required.

---

## Other Files (optional)

| File | Purpose |
|------|---------|
| `run-audit.js` | Node + Puppeteer — runs audit and saves to MUSCLE-MODEL-AUDIT.md |
| `audit-muscle-model.html` | Audit page (requires local server; use audit-standalone.html instead) |
| `programGenerator.js` | Generator module (used by program-gen-test.html) |
| `program-gen-test.html` | Test harness (requires local server; use program-gen-standalone.html instead) |
| `engine-data.js` | Extracted engine data (for script-based loading) |

## If You Want a Local Server

```bash
python -m http.server 3456
# Then open http://localhost:3456/program-gen-test.html
```

## Generator API (programGenerator.js)

```javascript
// Config from app.html (via iframe contentWindow)
const config = {
  EL, P, getMuscleWeights, getBodyPart, getLengthBias,
  profile: { daysPerWeek: 6, preferredSplit: 'adam-6', restDay: 'fri' },
  verdict: 'PROGRESSING',
  stalledMap: {}
};

// Phase 1: Split
const split = ProgramGenerator.selectSplit(config);

// Phase 2 + 2.5: Dry run (exercise selection + P's sets)
const weekProgram = ProgramGenerator.dryRun(config);
```

## Split archetypes

- `full-body` — 3 days
- `upper-lower` — 4 days
- `ppl` — 6 days
- `adam-6` — 6 days (Legs / Chest+Back / Arms / Legs / Chest+Arms / Legs)
