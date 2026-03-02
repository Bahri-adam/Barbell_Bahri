#!/usr/bin/env python3
"""
ADAM Powerbuilding Engine — 100-Athlete Stress Test

Runs 100 synthetic athletes through the verdict decision tree.
Output is self-contained for copy-paste into Claude for analysis and threshold tuning.

Usage: python run_100_athletes.py > ENGINE_100_OUTPUT.txt
       (or python run_100_athletes.py and redirect/copy from stdout)

For PROGRAM EVOLUTION (how workout programs change by verdict, stalled lifts, split):
  Open 100-athlete-program-test.html in a browser (double-click, no server needed).
  Run it, copy output, paste into Claude to see how programs evolve across variables.
"""

import json
import random
from dataclasses import dataclass, field
from typing import Optional


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURABLE CONSTANTS (Claude can suggest tweaks)
# ═══════════════════════════════════════════════════════════════════════════
CONSTANTS = {
    "MIN_TOTAL_SETS_RECENT": 20,
    "MIN_DISTINCT_EXERCISES": 2,
    "DELOAD_FATIGUE": 90,
    "OVERREACH_FATIGUE": 80,
    "STALL_LOCAL_FATIGUE_CAP": 85,
    "UNDERSTIM_EFF_SETS_CAP": 35,
    "UNDERSTIM_FATIGUE_CAP": 80,
    "PROGRESSING_LOW_SETS_CAP": 25,
    "E1RM_FLAT_THRESHOLD": 1.0,  # |trend| < this = flat
    "E1RM_IMPROVING_THRESHOLD": 1.0,  # trend > this = improving
    "JUNK_VOLUME_FATIGUE_FLOOR": 65,
    "JUNK_VOLUME_VOL_DELTA_MIN": 10,
    "UNDERSTIM_WEEKS_E1RM_MIN": 3,
    "UNDERSTIM_WEEKS_LOGGED_MIN": 4,
    "UNDERSTIM_FLAT_WEEKS_MIN": 2,
    "STIMULUS_SUFFICIENT_EFF_SETS": 35,
    "STIMULUS_SUFFICIENT_MIN_PER_MUSCLE": 8,
    "STIMULUS_SUFFICIENT_FAILURE_SETS": 5,
    "STIMULUS_RIR_PUSHING_HARD": 2,  # RIR <= this = pushing
    "LOW_STIM_RIR_EASY": 3,  # RIR >= this = easy (or null)
}

# Fatigue model weights (for reference; fatigue is passed as input in this test)
FATIGUE_WEIGHTS = {
    "volume_load_z": 0.35,
    "mean_intensity": 0.25,
    "proximity": 0.20,
    "failure_rate": 0.15,
}


@dataclass
class AthleteSignals:
    """All inputs required for the decision tree."""
    id: int
    weeks_logged: int
    total_hard_sets_recent: float
    distinct_exercises: int
    effective_sets_this_week: float
    fatigue: float
    fatigue_prev: Optional[float] = None
    e1rm_trend: float = 0.0
    weeks_used_for_e1rm: int = 0
    e1rm_flat_weeks: int = 0
    median_rir: Optional[float] = None
    min_eff_per_target_muscle: float = 0.0
    failure_sets_this_week: int = 0
    stalled_count: int = 0
    stall_weeks: int = 0  # used when stalled_count == 1
    volume_delta_pct: Optional[float] = None
    perf_down_2_weeks: bool = False
    wk: int = 1


def run_decision_tree(a: AthleteSignals) -> dict:
    """Port of getGlobalState verdict logic. Returns verdict, rule, why, and all intermediates."""
    c = CONSTANTS

    # Derived booleans
    fatigue_prev = a.fatigue_prev if a.fatigue_prev is not None else (a.fatigue - 5)
    fatigue_rising = a.wk > 1 and a.fatigue > fatigue_prev
    e1rm_flat = abs(a.e1rm_trend) < c["E1RM_FLAT_THRESHOLD"]
    vol_up_10 = a.volume_delta_pct is not None and a.volume_delta_pct > c["JUNK_VOLUME_VOL_DELTA_MIN"]
    junk_volume_flat_rising = (
        a.weeks_logged >= 4
        and e1rm_flat
        and fatigue_rising
        and vol_up_10
        and a.volume_delta_pct is not None
        and a.volume_delta_pct > c["JUNK_VOLUME_VOL_DELTA_MIN"]
    )

    # Data sufficiency
    insufficient_logs = a.weeks_logged < 2
    insufficient_sets = a.total_hard_sets_recent < c["MIN_TOTAL_SETS_RECENT"]
    insufficient_exercises = a.distinct_exercises < c["MIN_DISTINCT_EXERCISES"]
    data_insufficient = insufficient_logs or insufficient_sets or insufficient_exercises

    # Stimulus checks
    stimulus_sufficient = (
        a.min_eff_per_target_muscle >= c["STIMULUS_SUFFICIENT_MIN_PER_MUSCLE"]
        or a.effective_sets_this_week >= c["STIMULUS_SUFFICIENT_EFF_SETS"]
        or a.failure_sets_this_week >= c["STIMULUS_SUFFICIENT_FAILURE_SETS"]
        or (a.median_rir is not None and a.median_rir <= c["STIMULUS_RIR_PUSHING_HARD"])
    )
    low_stimulus_and_high_rir = (
        not stimulus_sufficient
        and (a.effective_sets_this_week < c["STIMULUS_SUFFICIENT_EFF_SETS"] or a.min_eff_per_target_muscle < c["STIMULUS_SUFFICIENT_MIN_PER_MUSCLE"])
        and (a.median_rir is None or a.median_rir >= c["LOW_STIM_RIR_EASY"])
    )

    # UNDERSTIM_GATE
    understim_gate = (
        (a.weeks_used_for_e1rm >= c["UNDERSTIM_WEEKS_E1RM_MIN"] or a.weeks_logged >= c["UNDERSTIM_WEEKS_LOGGED_MIN"])
        and (a.e1rm_flat_weeks >= c["UNDERSTIM_FLAT_WEEKS_MIN"] or e1rm_flat)
        and a.effective_sets_this_week is not None
        and a.effective_sets_this_week < c["UNDERSTIM_EFF_SETS_CAP"]
        and a.fatigue < c["UNDERSTIM_FATIGUE_CAP"]
        and (a.median_rir is None or a.median_rir >= c["LOW_STIM_RIR_EASY"])
    )

    # Decision tree (order matters)
    verdict = "DATA_INSUFFICIENT"
    rule = "DATA_INSUFFICIENT"
    why = ""

    if data_insufficient:
        verdict = "DATA_INSUFFICIENT"
        rule = "DATA_INSUFFICIENT"
        why = f"weeksLogged={a.weeks_logged} totalSets={a.total_hard_sets_recent} distinctEx={a.distinct_exercises}"

    elif a.e1rm_trend > c["E1RM_IMPROVING_THRESHOLD"] and a.fatigue < c["DELOAD_FATIGUE"]:
        verdict = "PROGRESSING"
        rule = "PERF_PRIORITY"
        why = "e1rmSlope>1% fat<90"

    elif a.stalled_count == 1 and a.fatigue < c["STALL_LOCAL_FATIGUE_CAP"] and a.stall_weeks >= 3 and a.e1rm_trend >= -1:
        verdict = "STALL_LOCAL"
        rule = "STALL_LOCAL"
        why = "1 stall fat<85"

    elif a.stalled_count == 1 and a.fatigue >= c["STALL_LOCAL_FATIGUE_CAP"]:
        verdict = "OVERREACHED"
        rule = "STALL_LOCAL_HIGH_FATIGUE"
        why = "1 stall fat>=85"

    elif a.fatigue >= c["DELOAD_FATIGUE"] or (a.perf_down_2_weeks and a.fatigue >= 85):
        if low_stimulus_and_high_rir:
            verdict = "UNDERSTIMULATED"
            rule = "DELOAD_UNDERSTIM_OVERRIDE"
            why = "fat>=90 but low stim+RIR"
        else:
            verdict = "DELOAD_RECOMMENDED"
            rule = "DELOAD"
            why = "fat>=90 or perfDown2"

    elif a.fatigue >= c["OVERREACH_FATIGUE"] and a.fatigue < c["DELOAD_FATIGUE"]:
        if low_stimulus_and_high_rir:
            verdict = "UNDERSTIMULATED"
            rule = "OVERREACH_UNDERSTIM_OVERRIDE"
            why = "fat 80-89 but low stim+RIR"
        else:
            verdict = "OVERREACHED"
            rule = "OVERREACHED"
            why = "fat 80-89"

    elif junk_volume_flat_rising and a.fatigue >= c["JUNK_VOLUME_FATIGUE_FLOOR"]:
        verdict = "OVERREACHED"
        rule = "JUNK_VOLUME"
        why = "volUp e1rmFlat fatigueRising"

    elif a.stalled_count >= 2 and a.fatigue < c["DELOAD_FATIGUE"]:
        verdict = "STALL_SYSTEMIC"
        rule = "STALL_SYSTEMIC"
        why = "2+ stalls"

    elif a.stalled_count == 1:
        verdict = "STALL_LOCAL"
        rule = "STALL_LOCAL_FALLBACK"
        why = "1 stall"

    elif understim_gate:
        verdict = "UNDERSTIMULATED"
        rule = "UNDERSTIM_GATE"
        why = f"effSets={a.effective_sets_this_week}<35 flatWks={a.e1rm_flat_weeks} fat={a.fatigue}<80"

    elif a.e1rm_trend > c["E1RM_IMPROVING_THRESHOLD"]:
        verdict = "PROGRESSING"
        rule = "PROGRESSING_E1RM_UP"
        why = "e1rmSlope>1%"

    elif a.effective_sets_this_week < c["PROGRESSING_LOW_SETS_CAP"]:
        verdict = "PROGRESSING"
        rule = "PROGRESSING_LOW_SETS"
        why = "effSets<25"

    else:
        verdict = "PROGRESSING"
        rule = "PROGRESSING_DEFAULT"
        why = "default"

    return {
        "verdict": verdict,
        "rule": rule,
        "why": why,
        "intermediates": {
            "data_insufficient": data_insufficient,
            "insufficient_logs": insufficient_logs,
            "insufficient_sets": insufficient_sets,
            "insufficient_exercises": insufficient_exercises,
            "e1rm_flat": e1rm_flat,
            "fatigue_rising": fatigue_rising,
            "vol_up_10": vol_up_10,
            "junk_volume_flat_rising": junk_volume_flat_rising,
            "stimulus_sufficient": stimulus_sufficient,
            "low_stimulus_and_high_rir": low_stimulus_and_high_rir,
            "understim_gate": understim_gate,
        },
    }


def generate_athletes(n: int = 100, seed: int = 42) -> list[AthleteSignals]:
    """Generate n athletes with varied signals to stress-test all code paths."""
    random.seed(seed)
    athletes = []

    # Ensure coverage of key edge cases
    edge_cases = [
        # DATA_INSUFFICIENT
        AthleteSignals(0, 1, 10, 1, 5, 30, None, 0, 0, 0, None, 2, 0, 0, 0, None, False),
        AthleteSignals(1, 2, 15, 1, 8, 25, None, 0, 0, 0, None, 3, 0, 0, 0, None, False),
        # UNDERSTIM_GATE boundary (effSets 34 vs 35)
        AthleteSignals(2, 4, 40, 6, 34, 38, 35, 0, 4, 3, 4, 6, 0, 0, 0, 3.4, False),
        AthleteSignals(3, 4, 50, 8, 35, 38, 35, 0, 4, 3, 4, 8, 0, 0, 0, 3.4, False),
        AthleteSignals(4, 4, 50, 8, 30, 38, 35, 0, 4, 3, None, 6, 0, 0, 0, 3.4, False),
        # PROGRESSING
        AthleteSignals(5, 6, 60, 10, 40, 45, 42, 2.5, 5, 0, 2, 9, 0, 0, 0, 5, False),
        # DELOAD
        AthleteSignals(6, 5, 55, 9, 38, 92, 88, -3, 5, 2, 1, 8, 2, 0, 0, -5, True),
        # OVERREACHED
        AthleteSignals(7, 5, 55, 9, 38, 84, 78, 0, 5, 2, 2, 8, 1, 0, 0, 4, False),
        # STALL_LOCAL
        AthleteSignals(8, 6, 55, 9, 36, 60, 55, -0.5, 5, 2, 3, 7, 0, 1, 3, 0, False),
        # STALL_SYSTEMIC
        AthleteSignals(9, 7, 60, 10, 35, 70, 65, -1, 6, 2, 2, 7, 0, 2, 3, -2, False),
        # JUNK_VOLUME
        AthleteSignals(10, 5, 55, 9, 40, 68, 62, 0, 5, 3, 4, 8, 0, 0, 0, 15, False),
    ]

    for i, ac in enumerate(edge_cases):
        ac.id = i
        athletes.append(ac)

    # Fill remaining with random variety (bias toward sufficient data for rule stress-testing)
    for i in range(len(edge_cases), n):
        weeks = random.choices(
            [1, 2, 3, 4, 5, 6, 8, 10],
            weights=[8, 12, 18, 25, 20, 10, 5, 2],
        )[0]
        total_sets = random.choices(
            [10, 15, 20, 25, 30, 40, 50, 60],
            weights=[3, 5, 15, 25, 28, 15, 6, 3],
        )[0]
        distinct_ex = random.choices(
            [1, 2, 3, 5, 7, 9, 11],
            weights=[5, 10, 20, 30, 20, 10, 5],
        )[0]
        eff_sets = round(random.uniform(15, 45), 1)
        fatigue = round(random.uniform(20, 95), 1)
        fatigue_prev = round(fatigue + random.uniform(-15, 15), 1) if weeks > 1 else None
        e1rm_trend = round(random.uniform(-5, 8), 1)
        weeks_e1rm = random.randint(0, min(weeks, 6))
        e1rm_flat_weeks = random.randint(0, 5) if weeks_e1rm >= 2 else 0
        median_rir = random.choice([None, 2, 3, 4, 5]) if random.random() > 0.2 else None
        min_per_muscle = round(random.uniform(4, 12), 1)
        failure_sets = random.randint(0, 6)
        stalled_count = random.choices([0, 1, 2, 3], weights=[60, 25, 10, 5])[0]
        stall_weeks = random.randint(2, 5) if stalled_count >= 1 else 0
        vol_delta = random.choice([None, -5, 0, 3, 6, 12, 18]) if weeks >= 3 else None
        perf_down_2 = random.random() < 0.1

        athletes.append(
            AthleteSignals(
                id=i,
                weeks_logged=weeks,
                total_hard_sets_recent=total_sets,
                distinct_exercises=distinct_ex,
                effective_sets_this_week=eff_sets,
                fatigue=fatigue,
                fatigue_prev=fatigue_prev,
                e1rm_trend=e1rm_trend,
                weeks_used_for_e1rm=weeks_e1rm,
                e1rm_flat_weeks=e1rm_flat_weeks,
                median_rir=median_rir,
                min_eff_per_target_muscle=min_per_muscle,
                failure_sets_this_week=failure_sets,
                stalled_count=stalled_count,
                stall_weeks=stall_weeks,
                volume_delta_pct=vol_delta,
                perf_down_2_weeks=perf_down_2,
            )
        )

    return athletes


def athlete_to_dict(a: AthleteSignals) -> dict:
    return {
        "id": a.id,
        "weeks_logged": a.weeks_logged,
        "total_hard_sets_recent": a.total_hard_sets_recent,
        "distinct_exercises": a.distinct_exercises,
        "effective_sets_this_week": a.effective_sets_this_week,
        "fatigue": a.fatigue,
        "fatigue_prev": a.fatigue_prev,
        "e1rm_trend": a.e1rm_trend,
        "weeks_used_for_e1rm": a.weeks_used_for_e1rm,
        "e1rm_flat_weeks": a.e1rm_flat_weeks,
        "median_rir": a.median_rir,
        "min_eff_per_target_muscle": a.min_eff_per_target_muscle,
        "failure_sets_this_week": a.failure_sets_this_week,
        "stalled_count": a.stalled_count,
        "stall_weeks": a.stall_weeks,
        "volume_delta_pct": a.volume_delta_pct,
        "perf_down_2_weeks": a.perf_down_2_weeks,
    }


def main():
    athletes = generate_athletes(100)
    results = []

    for a in athletes:
        out = run_decision_tree(a)
        results.append({
            "athlete": athlete_to_dict(a),
            "verdict": out["verdict"],
            "rule": out["rule"],
            "why": out["why"],
            "intermediates": out["intermediates"],
        })

    # Build output for Claude
    output = {
        "meta": {
            "purpose": "ADAM Powerbuilding Engine — 100-athlete stress test. Copy this ENTIRE JSON into Claude for analysis.",
            "instructions_for_claude": (
                "Review the constants, rule_tree, and 100 results. Identify: "
                "(1) edge cases where verdict seems wrong; "
                "(2) threshold values that may need tuning (e.g. UNDERSTIM_EFF_SETS_CAP 35, fatigue bands); "
                "(3) athletes falling through to PROGRESSING_DEFAULT who might deserve UNDERSTIMULATED; "
                "(4) any rule ordering issues. Suggest concrete constant changes."
            ),
            "total_athletes": len(athletes),
        },
        "constants": CONSTANTS,
        "fatigue_model_weights": FATIGUE_WEIGHTS,
        "rule_tree": [
            {"order": 1, "rule": "DATA_INSUFFICIENT", "condition": "weeksLogged<2 OR totalHardSetsRecent<20 OR distinctExercises<2", "verdict": "DATA_INSUFFICIENT"},
            {"order": 2, "rule": "PERF_PRIORITY", "condition": "e1rmTrend>1 AND fatigue<90", "verdict": "PROGRESSING"},
            {"order": 3, "rule": "STALL_LOCAL", "condition": "stalledCount==1 AND fatigue<85 AND stallWeeks>=3 AND e1rmTrend>=-1", "verdict": "STALL_LOCAL"},
            {"order": 4, "rule": "STALL_LOCAL_HIGH_FATIGUE", "condition": "stalledCount==1 AND fatigue>=85", "verdict": "OVERREACHED"},
            {"order": 5, "rule": "DELOAD (or DELOAD_UNDERSTIM_OVERRIDE)", "condition": "fatigue>=90 OR (perfDown2Weeks AND fatigue>=85)", "verdict": "DELOAD_RECOMMENDED or UNDERSTIMULATED"},
            {"order": 6, "rule": "OVERREACHED (or OVERREACH_UNDERSTIM_OVERRIDE)", "condition": "fatigue 80-89", "verdict": "OVERREACHED or UNDERSTIMULATED"},
            {"order": 7, "rule": "JUNK_VOLUME", "condition": "volUp>10% AND e1rmFlat AND fatigueRising AND fatigue>=65", "verdict": "OVERREACHED"},
            {"order": 8, "rule": "STALL_SYSTEMIC", "condition": "stalledCount>=2 AND fatigue<90", "verdict": "STALL_SYSTEMIC"},
            {"order": 9, "rule": "STALL_LOCAL_FALLBACK", "condition": "stalledCount==1", "verdict": "STALL_LOCAL"},
            {"order": 10, "rule": "UNDERSTIM_GATE", "condition": "weeksE1RM>=3 OR weeksLogged>=4, e1rmFlatWeeks>=2 OR e1rmFlat, effSets<35, fatigue<80, RIR null or >=3", "verdict": "UNDERSTIMULATED"},
            {"order": 11, "rule": "PROGRESSING_E1RM_UP", "condition": "e1rmTrend>1", "verdict": "PROGRESSING"},
            {"order": 12, "rule": "PROGRESSING_LOW_SETS", "condition": "effSets<25", "verdict": "PROGRESSING"},
            {"order": 13, "rule": "PROGRESSING_DEFAULT", "condition": "default", "verdict": "PROGRESSING"},
        ],
        "understim_gate_full_condition": (
            "(weeksUsedForE1RM>=3 OR weeksLogged>=4) AND "
            "(e1rmFlatWeeks>=2 OR e1rmFlat) AND "
            "effectiveSetsThisWeek<35 AND "
            "fatigue<80 AND "
            "(medianRIR is null OR medianRIR>=3)"
        ),
        "stimulus_sufficient_condition": (
            "minEffPerTargetMuscle>=8 OR effectiveSetsThisWeek>=35 OR "
            "failureSetsThisWeek>=5 OR (medianRIR!=null AND medianRIR<=2)"
        ),
        "low_stimulus_and_high_rir_condition": (
            "NOT stimulusSufficient AND (effSets<35 OR minPerMuscle<8) AND (medianRIR null OR >=3)"
        ),
        "summary": {
            "verdict_distribution": {},
            "rule_distribution": {},
        },
        "results": results,
    }

    # Compute summary
    for r in results:
        v = r["verdict"]
        rl = r["rule"]
        output["summary"]["verdict_distribution"][v] = output["summary"]["verdict_distribution"].get(v, 0) + 1
        output["summary"]["rule_distribution"][rl] = output["summary"]["rule_distribution"].get(rl, 0) + 1

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
