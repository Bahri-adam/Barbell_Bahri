/**
 * Engine data extracted from app.html — for standalone audit & program gen.
 * No server needed. Open HTML files directly (double-click).
 * Update from app.html when MUSCLE_MODEL or EL changes.
 */
(function(global){
  const BODY_MAP=[
    {parts:['quads'],keys:['Squat','Leg Press','Leg Extension','Belt Squat','Pendulum','Bulgarian Split']},
    {parts:['hamstrings'],keys:['Deadlift','Leg Curl','Nordic','RDL','Stiff Leg']},
    {parts:['calves'],keys:['Calf Raise']},
    {parts:['glutes'],keys:['Hip Abductor','Hip Thrust']},
    {parts:['chest'],keys:['Bench','Press','Fly','Pec Deck','Incline']},
    {parts:['back'],keys:['Pull','Row','Pullover','Lat Pulldown']},
    {parts:['biceps'],keys:['Curl','Spider','Preacher']},
    {parts:['triceps'],keys:['Pushdown','Skull','Extension','Dip','Close Grip']},
    {parts:['delts'],keys:['Lateral Raise','Face Pull','Rear Delt']}
  ];
  function getBodyPart(exName){
    const n=(exName||'').toLowerCase();
    for(const {parts,keys} of BODY_MAP){
      if(keys.some(k=>n.includes(k.toLowerCase()))) return parts[0];
    }
    return 'other';
  }
  const MUSCLE_MODEL=[
    {keys:['Bench','Press'],muscles:{chest:.6,triceps:.25,delts:.15},len:1},
    {keys:['Incline'],muscles:{chest:.55,triceps:.2,delts:.25},len:1.05},
    {keys:['Fly','Pec Deck'],muscles:{chest:.9},len:1.1},
    {keys:['Pull-Up','Pullup','Pull Up','Lat Pulldown'],muscles:{back:.6,biceps:.25,delts:.15},len:1.05},
    {keys:['Row','Pullover'],muscles:{back:.7,biceps:.2,delts:.1},len:1.05},
    {keys:['Face Pull','Rear Delt'],muscles:{delts:.85},len:1},
    {keys:['Hack Squat','Leg Press','Belt Squat','Pendulum Squat','Bulgarian Split'],muscles:{quads:.7,glutes:.25,hamstrings:.05},len:1},
    {keys:['Leg Extension'],muscles:{quads:.95},len:1.08},
    {keys:['Single Leg Press'],muscles:{quads:.65,glutes:.3},len:1.05},
    {keys:['RDL','Romanian Deadlift'],muscles:{hamstrings:.6,glutes:.3,back:.1},len:1.1},
    {keys:['Stiff Leg Deadlift','Nordic','Leg Curl'],muscles:{hamstrings:.9},len:1.05},
    {keys:['Curl'],muscles:{biceps:.8},len:1},
    {keys:['Incline Dumbbell Curl','Incline Curl'],muscles:{biceps:.95},len:1.1},
    {keys:['Hammer Curl'],muscles:{biceps:.5},len:1},
    {keys:['Close Grip','Skull','Pushdown','Extension','Overhead Extension','Dip'],muscles:{triceps:.9},len:1},
    {keys:['Lateral Raise'],muscles:{delts:.95},len:1.05},
    {keys:['Calf Raise'],muscles:{calves:1},len:1},
    {keys:['Hip Abductor','Hip Thrust'],muscles:{glutes:.9},len:1}
  ];
  function getMuscleWeights(exName){
    const n=(exName||'').toLowerCase();
    for(const {keys,muscles} of MUSCLE_MODEL){
      if(keys.some(k=>n.includes(k.toLowerCase()))) return muscles;
    }
    const bp=getBodyPart(exName);
    return bp&&bp!=='other'?{[bp]:1}:{};
  }
  function getLengthBias(exName){
    const n=(exName||'').toLowerCase();
    for(const {keys,len} of MUSCLE_MODEL){
      if(keys.some(k=>n.includes(k.toLowerCase()))) return len||1;
    }
    return 1;
  }
  const EL=[
    {n:'Hack Squat',m:'Quads'},{n:'Leg Press',m:'Quads'},{n:'Belt Squat',m:'Quads'},
    {n:'Bulgarian Split Squat',m:'Quads'},{n:'Pendulum Squat',m:'Quads'},
    {n:'Leg Extension',m:'Quads — Rectus Femoris'},{n:'Single Leg Press',m:'Quads'},
    {n:'Romanian Deadlift',m:'Hamstrings'},{n:'Nordic Hamstring Curl',m:'Hamstrings'},
    {n:'Lying Leg Curl',m:'Hamstrings'},{n:'Seated Leg Curl',m:'Hamstrings'},
    {n:'Stiff Leg Deadlift',m:'Hamstrings'},{n:'Standing Calf Raise',m:'Calves — Gastroc'},
    {n:'Seated Calf Raise',m:'Calves — Soleus'},{n:'Hip Abductor Machine',m:'Glutes'},
    {n:'Hip Thrust',m:'Glutes'},{n:'Barbell Bench Press',m:'Chest'},
    {n:'Incline Barbell Press',m:'Chest — Upper'},{n:'Incline Dumbbell Press',m:'Chest — Upper'},
    {n:'Plate Loaded Incline Machine Press',m:'Chest — Upper'},{n:'Dumbbell Bench Press',m:'Chest'},{n:'Cable Fly',m:'Chest'},{n:'Pec Deck',m:'Chest'},
    {n:'Weighted Pull-Up',m:'Back — Lats'},{n:'Lat Pulldown',m:'Back — Lats'},
    {n:'Plate Loaded Machine Row',m:'Back — Mid'},{n:'Barbell Row',m:'Back — Mid'},
    {n:'Dumbbell Row',m:'Back — Mid'},{n:'Lat Pullover',m:'Back — Lats'},
    {n:'Face Pull',m:'Rear Delt'},{n:'Barbell Curl',m:'Biceps'},{n:'EZ Bar Curl',m:'Biceps'},
    {n:'Incline Dumbbell Curl',m:'Biceps — Long Head'},{n:'Cable Curl',m:'Biceps'},
    {n:'Hammer Curl',m:'Brachialis'},{n:'Cable Hammer Curl',m:'Brachialis'},
    {n:'Spider Curl',m:'Biceps — Short'},{n:'Preacher Curl',m:'Biceps — Short'},
    {n:'Close Grip Bench Press',m:'Triceps'},{n:'Weighted Dip',m:'Triceps'},
    {n:'Skull Crusher',m:'Triceps'},{n:'Overhead Tricep Extension',m:'Triceps — Long'},
    {n:'Dumbbell Overhead Extension',m:'Triceps — Long'},{n:'Cable Pushdown',m:'Triceps'},
    {n:'Lateral Raise Machine',m:'Delts — Mid'},{n:'Dumbbell Lateral Raise',m:'Delts — Mid'},
    {n:'Rear Delt Fly',m:'Delts — Post'}
  ];
  const P={
    mon:{key:'mon',name:'Monday',focus:'Legs — Quad Focus (Heavy)',exercises:[
      {name:'Hack Squat',sets:5,reps:'6–8',type:'h'},{name:'Single Leg Press',sets:3,reps:'10–12',type:'s'},
      {name:'Leg Extension',sets:3,reps:'12–15',type:'d'},{name:'Seated Leg Curl',sets:3,reps:'10–12',type:'n'},
      {name:'Standing Calf Raise',sets:4,reps:'12–15',type:'s'},{name:'Seated Calf Raise',sets:3,reps:'15–20',type:'n'}
    ]},
    tue:{key:'tue',name:'Tuesday',focus:'Chest & Back — Full Upper',exercises:[
      {name:'Barbell Bench Press',sets:4,reps:'3–5',type:'h'},{name:'Incline Dumbbell Press',sets:3,reps:'8–10',type:'n'},
      {name:'Cable Fly',sets:3,reps:'12–15',type:'n'},{name:'Weighted Pull-Up',sets:4,reps:'6–8',type:'h'},
      {name:'Plate Loaded Machine Row',sets:3,reps:'8–10',type:'n'},{name:'Lat Pullover',sets:3,reps:'12–15',type:'s'},
      {name:'Face Pull',sets:3,reps:'15–20',type:'n'}
    ]},
    wed:{key:'wed',name:'Wednesday',focus:'Arms + Delts',exercises:[
      {name:'Barbell Curl',sets:4,reps:'6–8',type:'h'},{name:'Incline Dumbbell Curl',sets:3,reps:'10–12',type:'s'},
      {name:'Cable Hammer Curl',sets:3,reps:'12–15',type:'n'},{name:'Close Grip Bench Press',sets:4,reps:'6–8',type:'h'},
      {name:'Overhead Tricep Extension',sets:3,reps:'10–12',type:'s'},{name:'Cable Pushdown',sets:3,reps:'12–15',type:'d'},
      {name:'Lateral Raise Machine',sets:4,reps:'15–20',type:'n'},{name:'Rear Delt Fly',sets:3,reps:'15–20',type:'n'}
    ]},
    thu:{key:'thu',name:'Thursday',focus:'Legs — Posterior Chain Heavy',exercises:[
      {name:'Belt Squat',sets:4,reps:'6–8',type:'h'},{name:'Romanian Deadlift',sets:4,reps:'8–10',type:'s'},
      {name:'Nordic Hamstring Curl',sets:3,reps:'8–10',type:'s'},{name:'Leg Press',sets:3,reps:'15–20',type:'s'},
      {name:'Leg Extension',sets:2,reps:'12–15',type:'n'},{name:'Hip Abductor Machine',sets:3,reps:'15–20',type:'n'},
      {name:'Standing Calf Raise',sets:4,reps:'10–12',type:'s'},{name:'Seated Calf Raise',sets:3,reps:'15–20',type:'n'}
    ]},
    fri:{key:'fri',name:'Friday',focus:'Rest & Recovery',rest:true,exercises:[]},
    sat:{key:'sat',name:'Saturday',focus:'Chest & Arms — Arm Priority',exercises:[
      {name:'Incline Barbell Press',sets:3,reps:'6–8',type:'h'},{name:'Cable Fly',sets:3,reps:'15–20',type:'n'},
      {name:'Hammer Curl',sets:4,reps:'6–8',type:'h'},{name:'Cable Curl',sets:3,reps:'10–12',type:'n'},
      {name:'Incline Dumbbell Curl',sets:3,reps:'12–15',type:'s'},{name:'Spider Curl',sets:3,reps:'12–15',type:'n'},
      {name:'Skull Crusher',sets:4,reps:'8–10',type:'h'},{name:'Dumbbell Overhead Extension',sets:3,reps:'10–12',type:'s'}
    ]},
    sun:{key:'sun',name:'Sunday',focus:'Legs — Volume (Metabolic Stress)',exercises:[
      {name:'Leg Press',sets:4,reps:'15–20',type:'s'},{name:'Hack Squat',sets:3,reps:'10–12',type:'n'},
      {name:'Leg Extension',sets:4,reps:'15–20',type:'d'},{name:'Stiff Leg Deadlift',sets:3,reps:'12–15',type:'n'},
      {name:'Lying Leg Curl',sets:4,reps:'12–15',type:'n'},{name:'Hip Abductor Machine',sets:3,reps:'15–20',type:'n'},
      {name:'Standing Calf Raise',sets:4,reps:'15–20',type:'s'}
    ]}
  };
  global.ENGINE_DATA = { BODY_MAP, MUSCLE_MODEL, EL, P, getBodyPart, getMuscleWeights, getLengthBias };
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
