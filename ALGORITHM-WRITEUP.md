# ADAM Powerbuilding Engine — Algorithm Reference

**Purpose:** Single reference for all engine logic. Use when fine-tuning thresholds, adding features, or debugging.

---

## 1. Data Model

### Logged Data (per set)
| Field | Role |
|-------|------|
| `wk` | Week number |
| `dk` | Day key (mon, tue, …) |
| `ex` | Exercise name |
| `w` | Weight |
| `r` | Reps |
| `rpe` | Optional RPE (1–10) |
| `e1rm` | Estimated 1RM (computed or logged) |

### RIR (Reps in Reserve)
- **RPE → RIR:** `RIR = 10 - RPE` (when RPE logged)
- **Weight/reps → RIR:** `predictedReps = 30*(e1rm/w - 1)`; `RIR = max(0, predictedReps - actualReps)`
- **Epley e1RM:** `e1rm = w * (1 + r/30)`

### Effective Reps (last-5-reps model)
- `effectiveReps = max(0, min(5, 5 - RIR))`
- RIR null → 0 effective reps
- Set counts as "hard" if `effectiveReps >= 2` or (no e1RM and `isHardSet(l)`)

### Proximity Factor (from RIR)
| RIR | Proximity |
|-----|-----------|
| ≤1 | 1.1 |
| 2–3 | 1.0 |
| 4–5 | 0.8 |
| >5 or null | 0.5 |

---

## 2. Stimulus Model

**Per-set stimulus:** `MuscleContribution × (effReps/5) × proximity × tensionFactor`

- **Tension factor** (from % of e1RM):
  - ≥92%: 1.1
  - 85–92%: 1.0
  - 75–85%: 0.9
  - <75%: 0.7

- **Muscle weights:** MUSCLE_MODEL maps exercise → muscle contributions (e.g. Bench → chest 0.6, triceps 0.25, delts 0.15)
- **Length bias:** Per-exercise from MUSCLE_MODEL (e.g. Leg Extension 1.08, Incline Curl 1.1)

**Weekly stimulus per muscle:** Sum of per-set stimulus units across all logged sets for that week.

**Targets & ceilings:**
| Muscle | Target | Ceiling |
|--------|--------|---------|
| quads | 10 | 18 |
| hamstrings | 8 | 16 |
| chest | 8 | 16 |
| back | 10 | 18 |
| biceps | 8 | 14 |
| triceps | 8 | 14 |
| delts | 8 | 14 |
| calves | 6 | 14 |
| glutes | 6 | 12 |

---

## 3. Fatigue Model

**Normalized fatigue score 0–100** (components):

| Component | Weight | Definition |
|-----------|--------|------------|
| volume_load_z | 35% | Current week volume load vs last 5 weeks mean; Z-score clamped to [-2,2], normalized to [0,1] |
| mean_intensity | 25% | Avg % of e1RM for top set per exercise; (pct-60)/30 clamped to [0,1] |
| proximity | 20% | % of sets at RIR ≤ 1, normalized |
| failure_rate | 15% | % of sets at RIR 0, normalized |
| sleepStress | 5% | Placeholder (0) |

**Per-set fatigue cost:** `volumeLoad × fatigueMultiplier × intensityRatio`

- **Fatigue multipliers:** Barbell compound 1.3, machine compound 1.0, isolation 0.7
- **Machine compounds:** leg press, leg extension, hack squat, belt squat, pec deck, lat pulldown, machine row, leg curl, hip abductor, etc.

**Thresholds:** 0–39 low, 40–64 moderate, 65–79 high, 80–100 very high

---

## 4. Data Sufficiency Gate

```
DATA_INSUFFICIENT if:
  weeksLogged < 2
  OR hardSetsThisWeek < 30
```

**Action:** Lock program — no volume changes.

---

## 5. Decision Hierarchy (getGlobalState)

Rules evaluated **in order**. First match wins.

| # | Condition | Verdict | Response |
|---|-----------|---------|----------|
| 1 | weeksLogged < 2 OR hardSets < 30 | DATA_INSUFFICIENT | lock |
| 2 | effectiveSets < 30 AND fatigue < 65 AND (minEffPerTarget < 6 AND (proximityQuality==='low' OR medianRIR≥3)) | UNDERSTIMULATED | expand |
| 3 | effectiveSets < 30 AND fatigue < 65 (else branch) | PROGRESSING | maintain |
| 4 | effectiveSets < 25 | PROGRESSING | maintain |
| 5 | fatigue ≥ 80 OR (fatigue ≥ 70 AND perfDown2Weeks) | DELOAD_RECOMMENDED | deload |
| 6 | fatigue ≥ 65 AND (e1rmFlat OR e1rmDown OR perfDown) | OVERREACHED | reduce |
| 7 | stalledCount ≥ 2 AND fatigue < 80 | STALL_SYSTEMIC | reduce |
| 8 | stalledCount === 1 AND fatigue < 75 | STALL_LOCAL | maintain |
| 9 | stalledCount ≥ 1 AND fatigue ≥ 75 | OVERREACHED | reduce |
| 10 | junkVolume AND fatigue ≥ 65 | OVERREACHED | reduce |
| 11 | e1rmTrend > 1% | PROGRESSING | expand |
| 12 | (fallback) | PROGRESSING | maintain |

**Constants:**
- MIN_HARD_SETS_FOR_DATA = 30
- MIN_EFFECTIVE_SETS_OVERREACH = 30
- UNDERSTIM_MIN_EFF_SETS = 6
- STALL_LOCAL_FATIGUE_CAP = 75
- STALL_SYSTEMIC_FATIGUE_CAP = 80

** Derived:**
- `perfDown` = e1RM this week < 95% of last week
- `perfDown2Weeks` = e1RM this week < 95% of 2 weeks ago
- `junkVolume` = volume up ≥20% over 4 weeks AND e1RM flat
- `e1rmFlat` = |e1rmTrend| < 1%
- `e1rmDown` = e1rmTrend < -2%

---

## 6. Proximity Quality

`getProximityQuality(wk)` → 'low' | 'moderate' | 'adequate' | 'unknown'

- Count sets with RIR > 4 (low proximity)
- If total < 5: 'unknown'
- If ≥60% low: 'low'; ≥30%: 'moderate'; else 'adequate'

---

## 7. Stall Detection (getStalledLifts)

**Entry:** Same weight for last 3 weeks (for that exercise), ≥3 weeks of data.

**Stall subtypes** (when e1RM data available for 4+ weeks):
- **volume_induced:** growth < 1%, sets ≥ 90% target, fatigue rising → "Reduce volume 15–25%"
- **under_stimulation:** growth < 1%, sets < 70% target → "Add sets or increase intensity"
- **intensity:** growth < 1%, sets ≥ 70% target, fatigue not high → "Increase load or reduce reps"
- **simple:** default → "Reduce volume 15%, change rep bracket, rotate variation if still stalled"

---

## 8. Smart Recommendations (computeSmartRecommendations)

### Week-level recs (per muscle)
- **over_ceiling:** stimulus > ceiling + fatigue high → reduce 3–5 sets
- **add_volume:** stimulus < target, canExpand → add ~1–3 sets
- **hold_volume:** stimulus < target, mustReduce OR perfDown → maintain
- **proximity_priority:** stimulus < target, low proximity → increase intensity, not sets

### Stall recs
- Each stalled exercise → `{ type: 'stall', ex, weight, since, action }`

### Per-exercise tips (getSmartTipForExercise)
- **Cross-day:** 3rd+ session same muscle → drop sets if weekly ≥110% target
- **Within-session pre-fatigue:** same muscle earlier in session → reduce sets if weekly over target
- **Stalled lift:** swap or vary rep scheme
- **Volume target met:** treat as pump
- **Priority muscle under target:** go full
- **Fatigue:** compounds at RPE 8 cap when fatigue ≥ 65

---

## 9. Program Generator (generateAdaptiveProgram)

### SPLITS (single source of truth)

```
fullBody:  3 days, titles: Full Body A/B/C, focus: all muscles per session
upperLower: 4 days, titles: Upper A, Lower A, Upper B, Lower B
adam6:     6 days, titles: Legs—Quad Focus, Chest & Back, Arms & Delts, Legs—Posterior Chain, Chest & Arms, Legs—Volume
```

**Integrity:** `titles.length === focus.length === days` (asserted)

### Split selection
1. workoutDays = DO.filter(dk => sched[dk] !== 'rest')
2. numWorkouts = workoutDays.length
3. Infer: ≤3 → fullBody, 4 → upperLower, ≥6 → adam6
4. Override: if profile.preferredSplit exists and matches numWorkouts, use it

### Session binding
- For each calendar day dk: if rest → push rest
- If workout: sessionIdx = workoutDays.indexOf(dk)
- title = split.titles[sessionIdx], focusMuscles = split.focus[sessionIdx]
- Exercise selection driven by focusMuscles only (not template day)

### Exercise selection
- `getExercisesForBodyPartGen(bp)`: filter EL by body part, prefer EL.m over getBodyPart(name)
- Sort: non-stalled first, compounds first, then by length bias desc
- `selectExercisesForDayGen(muscles, stalledMap, maxPer)`: pick up to maxPer per muscle, skip stalled
- maxPer: fullBody = 1, upperLower/adam6 = 2

### Volume modulation
- **Deload:** sets × (DELOAD_PCT[wk] || 0.65)
- **UNDERSTIMULATED:** sets × 1.15
- **OVERREACHED:** sets × 0.85

### SWAPPED flag
- Set when exercise is a replacement for a stalled lift (primary muscle matches stalled muscle)

---

## 10. Deload Schedule

- **DLOADS:** weeks 3, 6, 9, 12, 15, 18, 21, 24
- **DELOAD_PCT:** 0.65 (W3,6,9,15,18,21,24), 0.70 (W12)

---

## 11. Audit Harness (auditGeneratedProgram)

Returns `{ ok, warnings }`:
- Undefined title/focus on any day
- Focus misalignment: Upper days should have upper exercises; Lower days should have lower
- Score = % exercises matching focus; warn if < 70%

---

## 12. Constants Quick Reference

| Constant | Value |
|----------|-------|
| MIN_HARD_SETS_FOR_DATA | 30 |
| MIN_EFFECTIVE_SETS_OVERREACH | 30 |
| UNDERSTIM_MIN_EFF_SETS | 6 |
| STALL_LOCAL_FATIGUE_CAP | 75 |
| STALL_SYSTEMIC_FATIGUE_CAP | 80 |
| Fatigue "deload" | ≥ 80 |
| Fatigue "overreach" | ≥ 65 |
| e1RM "flat" | \|trend\| < 1% |
| e1RM "improving" | trend > 1% |
| Volume "junk" | Δ > 20% over 4 wk + e1RM flat |

---

## 13. Fine-Tuning Notes

| Area | What to adjust | Where |
|------|----------------|-------|
| Data gate | MIN_HARD_SETS_FOR_DATA | getGlobalState |
| Understim threshold | UNDERSTIM_MIN_EFF_SETS, proximityQuality | getGlobalState |
| Deload trigger | fatigue ≥ 80, perfDown2Weeks | getGlobalState |
| Stall fatigue caps | STALL_LOCAL_FATIGUE_CAP, STALL_SYSTEMIC_FATIGUE_CAP | getGlobalState |
| Volume modulation | 1.15, 0.85 | generateAdaptiveProgram |
| Stimulus targets | STIMULUS_TARGET, STIMULUS_CEILING | app.html |
| Fatigue weights | 0.35, 0.25, 0.2, 0.15 | getNormalizedFatigueScore |
| Proximity factors | RIR thresholds | proximityFromEstimatedRIR |

---

*Last updated from app.html. Use when debugging or tuning thresholds.*
