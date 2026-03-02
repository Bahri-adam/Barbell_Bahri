/**
 * ADAM Program Generator — Standalone module (no app.html coupling)
 * Receives engine deps (MUSCLE_MODEL, EL, getMuscleWeights, etc.) via config.
 * Phases: 1 Split, 2 Exercises, 2.5 Dry Run, 3 Volume (future), 4 Load (future)
 */
(function(global) {
  'use strict';

  const DAY_NAMES = { mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday', sun:'Sunday' };
  const MUSCLES = ['quads','hamstrings','calves','glutes','chest','back','biceps','triceps','delts'];
  const DO = ['mon','tue','wed','thu','fri','sat','sun'];

  // Split archetypes: muscle groups per day
  const SPLIT_ARCHETYPES = {
    'full-body': {
      name: 'Full-body',
      days: 3,
      musclePerDay: [['quads','hamstrings','calves','glutes','chest','back','biceps','triceps','delts'], ['quads','hamstrings','calves','glutes','chest','back','biceps','triceps','delts'], ['quads','hamstrings','calves','glutes','chest','back','biceps','triceps','delts']],
      dayKeys: ['mon','wed','fri']
    },
    'upper-lower': {
      name: 'Upper/Lower',
      days: 4,
      musclePerDay: [['chest','back','biceps','triceps','delts'], ['quads','hamstrings','calves','glutes'], ['chest','back','biceps','triceps','delts'], ['quads','hamstrings','calves','glutes']],
      dayKeys: ['mon','tue','wed','thu']
    },
    'ppl': {
      name: 'PPL',
      days: 6,
      musclePerDay: [['chest','triceps','delts'], ['back','biceps'], ['quads','hamstrings','calves','glutes'], ['chest','triceps','delts'], ['back','biceps'], ['quads','hamstrings','calves','glutes']],
      dayKeys: ['mon','tue','wed','thu','fri','sat']
    },
    'adam-6': {
      name: 'ADAM-6',
      days: 6,
      musclePerDay: [
        ['quads','hamstrings','calves','glutes'],
        ['chest','back','delts'],
        ['biceps','triceps','delts'],
        ['quads','hamstrings','calves','glutes'],
        ['chest','biceps','triceps','delts'],
        ['quads','hamstrings','calves','glutes']
      ],
      dayKeys: ['mon','tue','wed','thu','sat','sun']
    }
  };

  function getPrimaryMuscle(muscles) {
    if (!muscles || !Object.keys(muscles).length) return null;
    return Object.entries(muscles).sort((a, b) => b[1] - a[1])[0][0];
  }

  function isCompound(muscles) {
    if (!muscles) return false;
    const keys = Object.keys(muscles).filter(m => (muscles[m] || 0) > 0);
    return keys.length > 1;
  }

  /**
   * Phase 1: Select split structure
   * @param {Object} config - { profile: { daysPerWeek, preferredSplit }, verdict }
   * @returns {{ days: string[], muscleFocus: Object, archetype: string }}
   */
  function selectSplit(config) {
    const profile = config.profile || {};
    const verdict = config.verdict || 'PROGRESSING';
    const daysPerWeek = profile.daysPerWeek ?? 6;
    const preferred = profile.preferredSplit;

    let archetype;
    if (preferred && SPLIT_ARCHETYPES[preferred]) {
      archetype = preferred;
    } else if (daysPerWeek <= 3) {
      archetype = 'full-body';
    } else if (daysPerWeek === 4) {
      archetype = 'upper-lower';
    } else {
      archetype = 'adam-6'; // default for powerbuilding
    }

    const split = SPLIT_ARCHETYPES[archetype];
    const days = [...split.dayKeys];

    // Insert rest days for 7-day week (e.g. rest on fri for adam-6)
    if (archetype === 'adam-6' && days.length === 6) {
      const restDay = profile.restDay || 'fri';
      const idx = DO.indexOf(restDay);
      if (idx >= 0) {
        const ordered = [];
        for (let i = 0; i < 7; i++) {
          const dk = DO[i];
          if (dk === restDay) ordered.push({ dk, rest: true });
          else if (split.dayKeys.includes(dk)) ordered.push({ dk, rest: false, muscles: split.musclePerDay[split.dayKeys.indexOf(dk)] });
        }
        const muscleFocus = {};
        split.dayKeys.forEach((dk, i) => { muscleFocus[dk] = split.musclePerDay[i]; });
        return { days: split.dayKeys, muscleFocus, archetype, restDay };
      }
    }

    const muscleFocus = {};
    split.dayKeys.forEach((dk, i) => { muscleFocus[dk] = split.musclePerDay[i]; });
    return { days: split.dayKeys, muscleFocus, archetype };
  }

  /**
   * Filter EL by body part (maps EL.m to muscle key)
   */
  function getBodyPartFromMuscle(m, config) {
    if (!m) return 'other';
    const x = (m || '').toLowerCase();
    for (const bp of MUSCLES) { if (x.includes(bp)) return bp; }
    if (x.includes('quad') || x.includes('rectus')) return 'quads';
    if (x.includes('ham') || x.includes('bicep fem')) return 'hamstrings';
    if (x.includes('calf') || x.includes('gastroc') || x.includes('soleus')) return 'calves';
    if (x.includes('glute') || x.includes('hip abd')) return 'glutes';
    if (x.includes('pec') || x.includes('upper')) return 'chest';
    if (x.includes('lat') || x.includes('rhomb') || x.includes('trap')) return 'back';
    if (x.includes('bicep') || x.includes('brachialis')) return 'biceps';
    if (x.includes('tricep')) return 'triceps';
    if (x.includes('delt') || x.includes('shoulder')) return 'delts';
    return 'other';
  }

  /**
   * Get exercises from EL for a body part, ranked (compounds first, then by length bias)
   */
  function getExercisesForBodyPart(bp, config, excludeName, stalledSet) {
    const EL = config.EL || [];
    const getMuscleWeights = config.getMuscleWeights || (() => ({}));
    const getLengthBias = config.getLengthBias || (() => 1);
    const getBodyPart = config.getBodyPart || (() => 'other');

    const pool = EL.filter(e => {
      const name = e.n || e.name;
      if (!name || name === excludeName) return false;
      const elBp = getBodyPartFromMuscle(e.m, config);
      if (elBp !== 'other') return elBp === bp;
      const nameBp = (getBodyPart && getBodyPart(name)) || elBp;
      return nameBp === bp;
    });

    return pool.map(e => {
      const name = e.n || e.name;
      const mw = getMuscleWeights(name);
      const lb = getLengthBias(name);
      const compound = isCompound(mw);
      const primary = getPrimaryMuscle(mw);
      return { name, mw, lb, compound, primary, stalled: stalledSet && stalledSet.has(name) };
    }).sort((a, b) => {
      if (a.stalled && !b.stalled) return 1;
      if (!a.stalled && b.stalled) return -1;
      if (a.compound && !b.compound) return -1;
      if (!a.compound && b.compound) return 1;
      return (b.lb || 1) - (a.lb || 1);
    });
  }

  /**
   * Phase 2: Select exercises for a day
   */
  function selectExercisesForDay(dayMuscles, config, stalledMap, maxPerMuscle) {
    const exercises = [];
    const used = new Set();
    const maxEx = maxPerMuscle ?? 2;

    for (const muscle of dayMuscles) {
      const stalled = stalledMap && stalledMap[muscle] ? new Set(stalledMap[muscle]) : new Set();
      const pool = getExercisesForBodyPart(muscle, config, null, stalled).filter(e => !used.has(e.name));
      let chosen = 0;
      for (const e of pool) {
        if (chosen >= maxEx) break;
        if (!e.stalled) {
          exercises.push({ name: e.name, muscle: muscle, primary: e.primary, compound: e.compound, mw: e.mw });
          used.add(e.name);
          chosen++;
        }
      }
    }

    return exercises;
  }

  /**
   * Phase 2.5: Dry run — build WeekProgram using P's set counts (no adaptive allocation)
   */
  function dryRun(config) {
    const P = config.P || {};
    const selectSplitResult = selectSplit(config);
    const { muscleFocus, restDay } = selectSplitResult;
    const stalledMap = config.stalledMap || {};
    const days = selectSplitResult.days;

    const weekProgram = { days: [], archetype: selectSplitResult.archetype };

    for (const dk of DO) {
      const muscles = muscleFocus[dk];
      const explicitRest = selectSplitResult.archetype === 'adam-6' && dk === (restDay || 'fri');
      if (explicitRest || !muscles) {
        weekProgram.days.push({ dk, name: DAY_NAMES[dk], rest: true, focus: 'Rest & Recovery', exercises: [] });
        continue;
      }

      const templateDay = P[dk];
      const templateExMap = {};
      if (templateDay && templateDay.exercises) {
        templateDay.exercises.forEach(ex => { templateExMap[ex.name] = ex; });
      }

      let dayExs = selectExercisesForDay(muscles, config, stalledMap, 2);

      // Order: compounds first, then by type (h > s > d > n)
      const typeOrder = { h: 0, n: 1, s: 2, d: 3 };
      dayExs.sort((a, b) => {
        if (a.compound && !b.compound) return -1;
        if (!a.compound && b.compound) return 1;
        const ta = typeOrder[templateExMap[a.name]?.type || 'n'] ?? 1;
        const tb = typeOrder[templateExMap[b.name]?.type || 'n'] ?? 1;
        return ta - tb;
      });

      const exercises = dayExs.map((ex, i) => {
        const templ = templateExMap[ex.name];
        const sets = templ ? (templ.sets || 3) : 3;
        const reps = templ ? (templ.reps || '8–12') : '8–12';
        const type = templ ? (templ.type || 'n') : 'n';
        return {
          name: ex.name,
          sets,
          reps,
          type,
          muscle: ex.muscle,
          primary: ex.primary,
          progressionRule: `add 5 lb when 2 sets hit top of range`
        };
      });

      weekProgram.days.push({
        dk,
        name: DAY_NAMES[dk],
        rest: false,
        focus: templateDay ? templateDay.focus : muscles.join(' + '),
        exercises
      });
    }

    return weekProgram;
  }

  const ProgramGenerator = {
    selectSplit,
    selectExercisesForDay,
    dryRun,
    SPLIT_ARCHETYPES,
    DAY_NAMES,
    MUSCLES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgramGenerator;
  } else {
    global.ProgramGenerator = ProgramGenerator;
  }
})(typeof window !== 'undefined' ? window : global);
