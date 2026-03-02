#!/usr/bin/env node
/**
 * Runs Smart tab logic with fictional athlete data and prints output.
 * No DOM, no localStorage. Run: node run-smart-test.js
 */
function mk(override){
  const base={date:'2025-02-10',dk:'mon',dn:'Monday',wk:1,bl:1,ex:'Hack Squat',sn:1,w:200,r:8,rpe:8,e1rm:253};
  const r={...base,...override};
  if(r.w&&r.r&&!r.e1rm)r.e1rm=Math.round(r.w*(1+r.r/30));
  return r;
}
function requireFullWeek(wk){
  const days=[{dk:'mon',exs:['Hack Squat','Single Leg Press','Leg Extension','Seated Leg Curl','Standing Calf Raise','Seated Calf Raise']},{dk:'tue',exs:['Barbell Bench Press','Incline Dumbbell Press','Cable Fly','Weighted Pull-Up','Plate Loaded Machine Row','Lat Pullover','Face Pull']},{dk:'wed',exs:['Barbell Curl','Incline Dumbbell Curl','Cable Hammer Curl','Close Grip Bench Press','Overhead Tricep Extension','Cable Pushdown','Lateral Raise Machine','Rear Delt Fly']},{dk:'thu',exs:['Belt Squat','Romanian Deadlift','Nordic Hamstring Curl','Leg Press','Leg Extension','Hip Abductor Machine','Standing Calf Raise','Seated Calf Raise']},{dk:'sat',exs:['Incline Barbell Press','Cable Fly','Hammer Curl','Cable Curl','Incline Dumbbell Curl','Spider Curl','Skull Crusher','Dumbbell Overhead Extension']},{dk:'sun',exs:['Leg Press','Hack Squat','Leg Extension','Stiff Leg Deadlift','Lying Leg Curl','Hip Abductor Machine','Standing Calf Raise']}];
  const dn={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',sat:'Saturday',sun:'Sunday'};
  let logs=[];
  days.forEach((d,i)=>{
    const date='2025-02-'+(10+i);
    d.exs.forEach(ex=>{
      const sets=ex.includes('Calf')?3:4;
      for(let s=0;s<sets;s++)logs.push(mk({date,dk:d.dk,dn:dn[d.dk],wk,ex,sn:s+1,w:180+Math.random()*40,r:8,rpe:7.5}));
    });
  });
  return logs;
}
function buildStalledScenario(){
  const fix=(l)=>{const x={...l};if(x.ex==='Barbell Bench Press')x.w=275;if(x.ex==='Hack Squat')x.w=315;return x};
  return [...requireFullWeek(6).map(fix),...requireFullWeek(7).map(fix),...requireFullWeek(8).map(fix)];
}

const P={mon:{exercises:[{name:'Hack Squat',sets:5},{name:'Single Leg Press',sets:3},{name:'Leg Extension',sets:3},{name:'Seated Leg Curl',sets:3},{name:'Standing Calf Raise',sets:4},{name:'Seated Calf Raise',sets:3}]},tue:{exercises:[{name:'Barbell Bench Press',sets:4},{name:'Incline Dumbbell Press',sets:3},{name:'Cable Fly',sets:3},{name:'Weighted Pull-Up',sets:4},{name:'Plate Loaded Machine Row',sets:3},{name:'Lat Pullover',sets:3},{name:'Face Pull',sets:3}]},wed:{exercises:[{name:'Barbell Curl',sets:4},{name:'Incline Dumbbell Curl',sets:3},{name:'Cable Hammer Curl',sets:3},{name:'Close Grip Bench Press',sets:4},{name:'Overhead Tricep Extension',sets:3},{name:'Cable Pushdown',sets:3},{name:'Lateral Raise Machine',sets:4},{name:'Rear Delt Fly',sets:3}]},thu:{exercises:[{name:'Belt Squat',sets:4},{name:'Romanian Deadlift',sets:4},{name:'Nordic Hamstring Curl',sets:3},{name:'Leg Press',sets:3},{name:'Leg Extension',sets:2},{name:'Hip Abductor Machine',sets:3},{name:'Standing Calf Raise',sets:4},{name:'Seated Calf Raise',sets:3}]},fri:{rest:true,exercises:[]},sat:{exercises:[{name:'Incline Barbell Press',sets:3},{name:'Cable Fly',sets:3},{name:'Hammer Curl',sets:4},{name:'Cable Curl',sets:3},{name:'Incline Dumbbell Curl',sets:3},{name:'Spider Curl',sets:3},{name:'Skull Crusher',sets:4},{name:'Dumbbell Overhead Extension',sets:3}]},sun:{exercises:[{name:'Leg Press',sets:4},{name:'Hack Squat',sets:3},{name:'Leg Extension',sets:4},{name:'Stiff Leg Deadlift',sets:3},{name:'Lying Leg Curl',sets:4},{name:'Hip Abductor Machine',sets:3},{name:'Standing Calf Raise',sets:4}]}};
const DO=['mon','tue','wed','thu','fri','sat','sun'];
const DLOADS=new Set([3,6,9,12,15,18,21,24]);
const DELOAD_PCT={3:.65,6:.65,9:.65,12:.70,15:.65,18:.65,21:.65,24:.65};
const WEEKLY_TARGETS={quads:{target:32},hamstrings:{target:24},calves:{target:21},glutes:{target:12},back:{target:20},biceps:{target:20},triceps:{target:20},chest:{target:14},delts:{target:16}};
const BODY_MAP=[{parts:['quads'],keys:['Squat','Leg Press','Leg Extension','Belt Squat','Pendulum','Bulgarian Split']},{parts:['hamstrings'],keys:['Deadlift','Leg Curl','Nordic','RDL','Stiff Leg']},{parts:['calves'],keys:['Calf Raise']},{parts:['glutes'],keys:['Hip Abductor','Hip Thrust']},{parts:['chest'],keys:['Bench','Press','Fly','Pec Deck','Incline']},{parts:['back'],keys:['Pull','Row','Pullover','Lat Pulldown']},{parts:['biceps'],keys:['Curl','Spider','Preacher']},{parts:['triceps'],keys:['Pushdown','Skull','Extension','Dip','Close Grip']},{parts:['delts'],keys:['Lateral Raise','Face Pull','Rear Delt']}];
const MUSCLE_MODEL=[{keys:['Bench','Press'],muscles:{chest:.6,triceps:.25,delts:.15}},{keys:['Incline'],muscles:{chest:.55,triceps:.2,delts:.25}},{keys:['Fly','Pec Deck'],muscles:{chest:.9}},{keys:['Pull-Up','Pullup','Pull Up','Lat Pulldown'],muscles:{back:.6,biceps:.25,delts:.15}},{keys:['Row','Pullover'],muscles:{back:.7,biceps:.2,delts:.1}},{keys:['Face Pull','Rear Delt'],muscles:{delts:.85}},{keys:['Hack Squat','Leg Press','Belt Squat','Pendulum Squat','Bulgarian Split'],muscles:{quads:.7,glutes:.25,hamstrings:.05}},{keys:['Leg Extension'],muscles:{quads:.95}},{keys:['RDL','Romanian Deadlift'],muscles:{hamstrings:.6,glutes:.3,back:.1}},{keys:['Stiff Leg Deadlift','Nordic','Leg Curl'],muscles:{hamstrings:.9}},{keys:['Curl'],muscles:{biceps:.8}},{keys:['Close Grip','Skull','Pushdown','Extension','Overhead Extension','Dip'],muscles:{triceps:.9}},{keys:['Lateral Raise'],muscles:{delts:.95}},{keys:['Calf Raise'],muscles:{calves:1}},{keys:['Hip Abductor','Hip Thrust'],muscles:{glutes:.9}}];
const DAY_NAMES={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
const EL=[{n:'Hack Squat',m:'Quads'},{n:'Leg Press',m:'Quads'},{n:'Leg Extension',m:'Quads'},{n:'Belt Squat',m:'Quads'},{n:'Romanian Deadlift',m:'Hamstrings'},{n:'Barbell Bench Press',m:'Chest'},{n:'Weighted Pull-Up',m:'Back'},{n:'Barbell Curl',m:'Biceps'},{n:'Skull Crusher',m:'Triceps'},{n:'Lateral Raise Machine',m:'Delts'}];

function getBodyPart(exName){const n=(exName||'').toLowerCase();for(const {parts,keys} of BODY_MAP){if(keys.some(k=>n.includes(k.toLowerCase())))return parts[0]}return 'other';}
function getMuscleWeights(exName){const n=(exName||'').toLowerCase();for(const {keys,muscles} of MUSCLE_MODEL){if(keys.some(k=>n.includes(k.toLowerCase())))return muscles}const bp=getBodyPart(exName);return bp&&bp!=='other'?{[bp]:1}:{};}
function getLengthBias(exName){const n=(exName||'').toLowerCase();for(const {keys,len} of MUSCLE_MODEL){if(len&&keys.some(k=>n.includes(k.toLowerCase())))return len}return 1;}
function isHardSet(l){const rpe=l.rpe!=null?parseFloat(l.rpe):null;const r=l.r!=null?parseInt(l.r,10):0;if(rpe!=null&&!isNaN(rpe)&&rpe>=7)return true;if(r>=12&&rpe!=null&&!isNaN(rpe)&&rpe>=8)return true;return (l.ex||'').toLowerCase().includes('drop');}
const COMPOUND_KEYS=['squat','bench','deadlift','press','row','pull-up','pullup','rdl','dip','barbell'];
function isCompound(exName){return COMPOUND_KEYS.some(k=>(exName||'').toLowerCase().includes(k));}
function getScheduleForWeek(wk){const def={};DO.forEach(dk=>{def[dk]=dk==='fri'?'rest':dk});return def;}
function getDayProgram(dk,wk){const mapped=getScheduleForWeek(wk)[dk]||dk;if(mapped==='rest')return{rest:true,exercises:[]};const base=P[mapped];return base?.rest?{rest:true,exercises:[]}:{...base,exercises:(base.exercises||[]).map(e=>({...e,displayName:e.name}))};}
function getWeeklyHardSets(wk){const out={quads:0,hamstrings:0,calves:0,glutes:0,chest:0,back:0,biceps:0,triceps:0,delts:0};ST.logs.filter(l=>l.wk===wk&&isHardSet(l)).forEach(l=>{Object.entries(getMuscleWeights(l.ex)).forEach(([m,v])=>out[m]!=null&&(out[m]+=v));});return out;}
function getFatigueFlags(wk){const weekLogs=ST.logs.filter(l=>l.wk===wk);const prevWk=ST.logs.filter(l=>l.wk===wk-1);let highRPE=0;weekLogs.forEach(l=>{if(l.rpe>=9.5)highRPE++});const e1rmNow={},e1rmPrev={};weekLogs.filter(l=>l.e1rm&&isCompound(l.ex)).forEach(l=>{if(!e1rmNow[l.ex]||l.e1rm>e1rmNow[l.ex])e1rmNow[l.ex]=l.e1rm});prevWk.filter(l=>l.e1rm&&isCompound(l.ex)).forEach(l=>{if(!e1rmPrev[l.ex]||l.e1rm>e1rmPrev[l.ex])e1rmPrev[l.ex]=l.e1rm});let perfDown=false;Object.keys(e1rmNow).forEach(ex=>{if(e1rmPrev[ex]&&e1rmNow[ex]<e1rmPrev[ex]*0.95)perfDown=true});return{highRPE,perfDown};}
function getStalledLifts(){const exWeeks={};ST.logs.forEach(l=>{if(!l.ex||!l.w||!l.wk)return;if(!exWeeks[l.ex])exWeeks[l.ex]={};if(!exWeeks[l.ex][l.wk]||l.w>exWeeks[l.ex][l.wk])exWeeks[l.ex][l.wk]=l.w});const stalled=[];for(const ex of Object.keys(exWeeks)){const weeks=Object.keys(exWeeks[ex]).map(Number).sort((a,b)=>a-b);if(weeks.length<3)continue;const recent=weeks.slice(-3);const weights=recent.map(w=>exWeeks[ex][w]);if(weights[0]===weights[1]&&weights[1]===weights[2])stalled.push({ex,weight:weights[0],since:'W'+recent[0]});}return stalled;}
function getPrescribedSets(){const out={quads:0,hamstrings:0,calves:0,glutes:0,chest:0,back:0,biceps:0,triceps:0,delts:0};DO.forEach(dk=>{const d=getDayProgram(dk,ST.wk);if(d.rest)return;(d.exercises||[]).forEach(ex=>{const bp=getBodyPart(ex.name);if(bp&&out[bp]!=null)out[bp]+=ex.sets||0});});return out;}
function getActualSets(wk){const out={quads:0,hamstrings:0,calves:0,glutes:0,chest:0,back:0,biceps:0,triceps:0,delts:0};ST.logs.filter(l=>l.wk===wk).forEach(l=>{const bp=getBodyPart(l.ex);if(bp&&out[bp]!=null)out[bp]++});return out;}
function getAlternativesForBodyPart(bp,excludeName){return EL.filter(e=>e.n&&e.n!==excludeName&&getBodyPart(e.n)===bp).map(e=>e.n).slice(0,5);}
function getBlockPhase(wk){if(wk>=24)return{name:'Macrocycle Complete',phase:'★ ACTIVE RECOVERY ★'};if(wk<=9)return{name:'Block 1',phase:DLOADS.has(wk)?'★ DELOAD ★':wk<=5?'Full Volume':'Assessment'};if(wk<=15)return{name:'Block 2',phase:DLOADS.has(wk)?'★ DELOAD ★':'Peak'};return{name:'Block 3',phase:DLOADS.has(wk)?'★ DELOAD ★':'Volume Push'};}

function getSmartTipForExercise(ex,idx,allExs,dk,wk,stalledMap,actual,fatigueScore,isDeload,priorDaysCount){
  const tips=[];let modulation=null;const swapOptions=[];
  const exName=ex.displayName||ex.name;const bp=getBodyPart(ex.name);
  const prevSameMuscle=allExs.slice(0,idx).filter(e=>getBodyPart(e.name)===bp);
  const upcomingSameMuscle=allExs.slice(idx+1).filter(e=>getBodyPart(e.name)===bp);
  const volThisWeek=actual[bp]||0;const prescribedSets=ex.sets||3;let programVsRec=null;
  const targ=WEEKLY_TARGETS[bp]?.target||12;
  if(priorDaysCount>=2&&!isDeload){tips.push({type:'cross_day',msg:`${bp} trained ${priorDaysCount}× already. Reduce stimulus.`});modulation={action:'DROP_SET',suggestion:'−1–2 sets',reason:'3rd session'};programVsRec={program:prescribedSets,recommended:Math.max(1,prescribedSets-2),reason:'3rd session'};}
  else if(priorDaysCount===1&&prevSameMuscle.length>0){tips.push({type:'cross_day',msg:`${bp} hit earlier + same muscle before you. Dial back.`});modulation={action:'DROP_SET',suggestion:'−1–2 sets',reason:'Double pre-fatigue'};}
  if(prevSameMuscle.length>0&&!isDeload){tips.push({type:'same_muscle',msg:`${bp} already trained (${prevSameMuscle.map(e=>e.displayName||e.name).join(', ')}) — drop sets or −10%.`});if(!modulation)modulation={action:'DROP_SET',suggestion:'−1–2 sets',reason:'Pre-fatigue'};if(!programVsRec)programVsRec={program:prescribedSets,recommended:Math.max(1,prescribedSets-1),reason:'Pre-fatigue'};}
  if(upcomingSameMuscle.length>0&&prevSameMuscle.length>0&&!isDeload)tips.push({type:'upcoming',msg:`${upcomingSameMuscle.map(e=>e.displayName||e.name).join(', ')} still to come — pre-fatigued.`});
  if(stalledMap[exName]){tips.push({type:'stall',msg:`Stalled at ${stalledMap[exName].weight} lbs since ${stalledMap[exName].since}. Swap or vary rep scheme.`});modulation=modulation||{action:'SWAP_OR_VARY',suggestion:'Swap or 3×8–10',reason:'Stall'};}
  if(volThisWeek>=targ*0.9&&targ>0&&!isDeload&&(prevSameMuscle.length>0||priorDaysCount>=1)){tips.push({type:'volume_met',msg:`Weekly ${bp} complete. Treat as pump.`});if(!modulation)modulation={action:'DROP_SET',suggestion:'−1 set',reason:'Volume met'};}
  if(volThisWeek<targ*0.5&&targ>0&&!isDeload&&idx===0&&prevSameMuscle.length===0){tips.push({type:'priority',msg:`${bp} under target. Go full.`});modulation={action:'GO_FULL',suggestion:'All sets',reason:'Priority'};}
  if(volThisWeek<targ*0.3&&targ>0&&!isDeload&&idx===0&&prevSameMuscle.length===0&&!modulation){tips.push({type:'add',msg:`${bp} far below target. Add 1 set if recovered.`});modulation={action:'ADD_SET',suggestion:'+1 set',reason:'Under target'};programVsRec={program:prescribedSets,recommended:prescribedSets+1,reason:'Volume priority'};}
  if(fatigueScore>=30&&(ex.type==='h'||isCompound(ex.name))){tips.push({type:'fatigue',msg:'High fatigue. Drop weight 10% or cap RPE 8.'});modulation=modulation||{action:'DROP_WEIGHT',suggestion:'−10% or RPE 8',reason:'Fatigue'};}
  const alts=getAlternativesForBodyPart(bp,ex.name);if(alts.length)swapOptions.push(...alts);
  return{tips,modulation,swapOptions,programVsRec};
}

function detectOverreaching(){
  const wk=ST.wk;const signals=[];let fatigueScore=0;
  const weekRange=[];for(let w=Math.max(1,wk-3);w<=wk;w++)weekRange.push(w);
  const weekData=weekRange.map(w=>{const logs=ST.logs.filter(l=>l.wk===w);const rpes=logs.filter(l=>l.rpe).map(l=>l.rpe);const avgRPE=rpes.length?rpes.reduce((a,b)=>a+b,0)/rpes.length:null;const vol=logs.reduce((s,l)=>s+((l.w||0)*(l.r||0)),0);const compoundRPE=logs.filter(l=>l.rpe&&(isCompound(l.ex)||l.type==='h')).map(l=>l.rpe);const avgCompoundRPE=compoundRPE.length?compoundRPE.reduce((a,b)=>a+b,0)/compoundRPE.length:null;const rpe10Sets=logs.filter(l=>l.rpe>=10).length;return{wk:w,logs,avgRPE,avgCompoundRPE,vol,rpe10Sets,sets:logs.length};});
  const recent=weekData.filter(d=>d.sets>0);
  if(recent.length<2)return{signals,fatigueScore,recommendation:null};
  if(recent.filter(d=>d.avgCompoundRPE&&d.avgCompoundRPE>=9).length>=2){fatigueScore+=30;signals.push({msg:'Compound RPE avg ≥9 — CNS fatigue.'});}
  if(recent.reduce((s,d)=>s+d.rpe10Sets,0)>=6){fatigueScore+=20;signals.push({msg:'Many RPE 10 sets. Cap compounds at 8.5.'});}
  if(recent.length>=3){const volTrend=recent.map(d=>d.vol);const e1rmByWeek={};recent.forEach(d=>{d.logs.forEach(l=>{if(!l.e1rm||!isCompound(l.ex))return;if(!e1rmByWeek[d.wk])e1rmByWeek[d.wk]=[];e1rmByWeek[d.wk].push(l.e1rm)});});const avgE1rm=Object.keys(e1rmByWeek).sort().map(w=>e1rmByWeek[w].reduce((a,b)=>a+b,0)/e1rmByWeek[w].length);if(volTrend.length>=3&&avgE1rm.length>=3){if(volTrend[volTrend.length-1]>volTrend[0]*1.1&&Math.abs(avgE1rm[avgE1rm.length-1]-avgE1rm[0])<5){fatigueScore+=25;signals.push({msg:'Volume up but strength flat — junk volume risk.'});}}}
  if(recent.filter(d=>d.avgRPE).length>=2){const avgRPEs=recent.filter(d=>d.avgRPE).map(d=>d.avgRPE);if(avgRPEs.every((v,i)=>i===0||v>=avgRPEs[i-1]-0.2)&&avgRPEs[avgRPEs.length-1]>=8.5){fatigueScore+=15;signals.push({msg:'RPE trending up — auto-regulate.'});}}
  if(getStalledLifts().length>=3){fatigueScore+=10;signals.push({msg:'Multiple stalls — consider deload.'});}
  let recommendation=null;
  if(fatigueScore>=50)recommendation='Take a deload week.';
  else if(fatigueScore>=30)recommendation='Drop compound weights 10%, cap RPE 8.';
  else if(fatigueScore>=15)recommendation='Manageable. Keep compounds RPE 7–8.5.';
  return{signals,fatigueScore,recommendation};
}

function computeSmartRecommendations(wk){
  const groups=['quads','hamstrings','calves','glutes','chest','back','biceps','triceps','delts'];
  const targ=WEEKLY_TARGETS;const actual=getActualSets(wk);const prescribed=getPrescribedSets();const stalled=getStalledLifts();
  const {signals,fatigueScore,recommendation:fatigueRec}=detectOverreaching();
  const isDeload=DLOADS.has(wk);const bp=getBlockPhase(wk);
  let recs=[],weekVerdict='',dayPlan=[],dayDetails=[];
  if(isDeload){weekVerdict='Deload week. 60–70% weights, ~50% sets.';recs.push({type:'info',title:'Deload',reason:`Reduce to ${Math.round((DELOAD_PCT[wk]||.65)*100)}%.`});}
  else if(fatigueScore>=50){weekVerdict=fatigueRec||'High fatigue.';recs.push({type:'warn',title:'Recovery',reason:fatigueRec});}
  else if(fatigueScore>=25){recs.push({type:'caution',title:'Auto-regulate',reason:'Drop compounds ~10%, cap RPE 8.'});}
  const hardSets=getWeeklyHardSets(wk);const hasRPE=ST.logs.some(l=>l.wk===wk&&l.rpe!=null);
  const dose=hasRPE?hardSets:actual;const fatigueFlags=getFatigueFlags(wk);
  groups.forEach(g=>{const act=dose[g]||0;const tar=targ[g]?.target||prescribed[g]||12;
    if(act<tar&&!isDeload){if(fatigueFlags.perfDown||fatigueFlags.highRPE>=3){recs.push({type:'hold_volume',muscle:g,current:act,target:tar,reason:'Performance down or high RPE. Hold volume.'});}else{recs.push({type:'add_volume',muscle:g,current:act,target:tar,add:Math.ceil(tar-act),reason:`Below target. Add ~${Math.ceil(tar-act)} sets.`});}}});
  stalled.forEach(s=>recs.push({type:'stall',ex:s.ex,weight:s.weight,since:s.since,action:'Try variation or rep scheme change.'}));
  const weekLogs=ST.logs.filter(l=>l.wk===wk);
  const strengthReps=weekLogs.filter(l=>{const r=parseInt(l.r,10);return r>=1&&r<=6;});
  const hasHeavyPress=strengthReps.some(l=>/bench|press|incline/i.test(l.ex)&&isCompound(l.ex));
  const hasHeavySquat=strengthReps.some(l=>/squat|leg press|belt/i.test(l.ex));
  const hasHeavyPull=strengthReps.some(l=>/pull|row|rdl|deadlift/i.test(l.ex)&&isCompound(l.ex));
  if(!isDeload&&weekLogs.length>0&&(!hasHeavyPress||!hasHeavySquat||!hasHeavyPull)){const miss=[];if(!hasHeavyPress)miss.push('press');if(!hasHeavySquat)miss.push('squat');if(!hasHeavyPull)miss.push('pull');recs.push({type:'powerbuilding',title:'Rep-range',reason:`Add 3–6 rep work for: ${miss.join(', ')}.`});}
  const sched=getScheduleForWeek(wk);const stalledMap={};stalled.forEach(s=>{stalledMap[s.ex]=s});const priorDaysBp={};
  DO.forEach(dk=>{const mapped=sched[dk]||dk;if(mapped==='rest'){dayPlan.push({dk,name:DAY_NAMES[dk],type:'rest'});return;}
    const d=P[mapped];if(!d)return;
    const allExs=(d.exercises||[]).map(e=>({...e,displayName:e.name}));
    const exTips=[];allExs.forEach((ex,i)=>{const priorDaysCount=priorDaysBp[getBodyPart(ex.name)]||0;const {tips,modulation,swapOptions,programVsRec}=getSmartTipForExercise(ex,i,allExs,dk,wk,stalledMap,actual,fatigueScore,isDeload,priorDaysCount);exTips.push({displayName:ex.displayName||ex.name,sets:ex.sets,tips,modulation,swapOptions,programVsRec});});
    allExs.forEach(ex=>{const b=getBodyPart(ex.name);if(b&&b!=='other')priorDaysBp[b]=(priorDaysBp[b]||0)+1;});
    dayPlan.push({dk,name:DAY_NAMES[dk],focus:d.focus,type:'workout',exCount:allExs.length});
    dayDetails.push({dk,name:DAY_NAMES[dk],focus:d.focus,exTips});});
  return{recs,weekVerdict,dayPlan,dayDetails,isDeload,bp,hasRPE};
}

// ═══════════════════════════════════════════════════════════
// RUN TEST
// ═══════════════════════════════════════════════════════════
const ST={wk:8,logs:buildStalledScenario()};

const out=computeSmartRecommendations(ST.wk);

console.log('\n' + '═'.repeat(70));
console.log('  SMART TAB TEST OUTPUT — Stalled Athlete (Bench & Hack same weight 3 weeks)');
console.log('  Week 8 · Block 1 — Assessment');
console.log('═'.repeat(70));

console.log('\n【 WEEK VERDICT 】');
console.log(out.weekVerdict||'(none)');

console.log('\n【 WEEK OVERVIEW 】');
out.dayPlan.forEach(d=>{if(d.type==='rest')console.log(`  ${d.name}: Rest`);else console.log(`  ${d.name}: ${d.focus||''} — ${d.exCount} exercises`);});

console.log('\n【 WEEK-LEVEL RECOMMENDATIONS 】');
if(!out.recs.length)console.log('  On track. Hit targets, keep compounds RPE 7–8.5.');
else out.recs.forEach(r=>{
  if(r.type==='add_volume')console.log(`  ADD VOLUME: ${r.muscle} — ${r.reason} (${r.current}→${r.target} sets)`);
  else if(r.type==='hold_volume')console.log(`  HOLD: ${r.muscle} — ${r.reason}`);
  else if(r.type==='stall')console.log(`  STALL: ${r.ex} at ${r.weight} lbs since ${r.since}. ${r.action}`);
  else if(r.type==='info')console.log(`  INFO: ${r.title} — ${r.reason}`);
  else if(r.type==='caution')console.log(`  CAUTION: ${r.title} — ${r.reason}`);
  else if(r.type==='powerbuilding')console.log(`  REP-RANGE: ${r.reason}`);
  else console.log(`  ${(r.title||r.type).toUpperCase()}: ${r.reason||r.msg||''}`);
});

console.log('\n【 PER-DAY & PER-EXERCISE TIPS 】');
out.dayDetails.forEach(dd=>{
  if(dd.dk==='fri')return;
  console.log(`\n  ${dd.name} — ${dd.focus||''}`);
  (dd.exTips||[]).forEach((et,i)=>{
    console.log(`    ${i+1}. ${et.displayName} (${et.sets} sets)`);
    if(et.modulation)console.log(`       → ${et.modulation.action}: ${et.modulation.suggestion} (${et.modulation.reason})`);
    if(et.programVsRec)console.log(`       → Program: ${et.programVsRec.program} sets  →  Recommended: ${et.programVsRec.recommended} sets (${et.programVsRec.reason})`);
    (et.tips||[]).forEach(t=>console.log(`       • ${t.msg}`));
    if(et.swapOptions?.length)console.log(`       Swap options: ${et.swapOptions.join(', ')}`);
  });
});

console.log('\n' + '═'.repeat(70));
console.log('  Engine uses',out.hasRPE?'hard sets (RPE≥7)':'raw sets');
console.log('═'.repeat(70) + '\n');
