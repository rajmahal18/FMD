export type JudgingCriterion={id:string;name:string;description:string;maximum:number};
export type JudgingConfig={target:'TEAM'|'INDIVIDUAL';candidateIds:string[];criteria:JudgingCriterion[]};
export type JudgingCandidate={id:string;name:string;teamName?:string|null;active:boolean};
export type JudgingSheet={candidateId:string;scores:Record<string,number>;version:number;submittedAt:string|null};
export type JudgingRow={id:string;name:string;teamName?:string|null;average:number|null;maximum:number;submitted:number;judges:number;rank:number|null};
export type JudgingPublished={name:string;rows:JudgingRow[];criteria:JudgingCriterion[];publishedAt:string};
export type JudgingVisibility='HIDDEN'|'PUBLISHED'|'LIVE';
export function judgingResultsVisible(policy:JudgingVisibility,published:boolean){return policy==='LIVE'||policy==='PUBLISHED'&&published;}
export type JudgingContestData={id:string;name:string;instructions:string;state:string;revision:number;config:JudgingConfig;candidates:JudgingCandidate[];judgeIds?:string[];judgeCount:number;assigned:boolean;locked:boolean;ownSheets:JudgingSheet[];results:JudgingRow[];published:JudgingPublished|null;resultsVisible?:boolean;resultsStatus?:'HIDDEN'|'PARTIAL'|'COMPLETE'|'PUBLISHED';facilitatorVisibility?:JudgingVisibility;participantVisibility?:JudgingVisibility;visibilityRevision?:number;breakdown?:{judgeId:string;judgeName:string;candidateId:string;scores:Record<string,number>;total:number;submittedAt:string}[]};
export type JudgingData={eventId:string;actorMembershipId:string;role:string;eventState:string;archived:boolean;runRevision:number;contests:JudgingContestData[];teams:JudgingCandidate[];people:{id:string;name:string;role:string;teamName:string|null;active:boolean;sex:string|null}[]};

const precise=(value:number)=>Number.isSafeInteger(value);
export function judgingNumber(value:number){return String(Number(value.toFixed(2)));}
export function judgingInputError(raw:string,maximum:number,required=false):string|null{
 if(!raw.trim())return required?`Enter a score from 0 to ${maximum}.`:null;
 const value=Number(raw);
 if(!Number.isFinite(value))return 'Enter a valid number.';
 if(value<0)return 'Number cannot be less than 0.';
 if(value>maximum)return `Number cannot be more than ${maximum}.`;
 if(!precise(value))return 'Use whole numbers only.';
 return null;
}
export function judgingInputState(values:Record<string,string>,criteria:JudgingCriterion[]){
 const errors:Record<string,string>={},scores:Record<string,number>={};
 for(const c of criteria){const raw=values[c.id]??'',error=judgingInputError(raw,c.maximum);if(error)errors[c.id]=error;else if(raw.trim())scores[c.id]=Number(raw);}
 const count=Object.keys(scores).length;
 return {errors,scores,count,invalid:Object.keys(errors).length>0,complete:count===criteria.length&&Object.keys(errors).length===0,total:Object.values(scores).reduce((n,v)=>n+Math.round(v*100),0)/100};
}
export function validateJudgingConfig(value:unknown):JudgingConfig{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Provide the judging rules.');
 const c=value as JudgingConfig;
 if(!['TEAM','INDIVIDUAL'].includes(c.target))throw Error('Choose team or individual judging.');
 if(!Array.isArray(c.candidateIds)||!c.candidateIds.length||c.candidateIds.length>500||c.candidateIds.some(id=>typeof id!=='string'||!id||id.length>120)||new Set(c.candidateIds).size!==c.candidateIds.length)throw Error('Select up to 500 distinct teams or nominees from this event.');
 if(!Array.isArray(c.criteria)||!c.criteria.length||c.criteria.length>20)throw Error('Use 1–20 judging criteria.');
 const ids=new Set<string>();
 const criteria=c.criteria.map(row=>{
  if(!row||typeof row.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(row.id)||['__proto__','constructor','prototype'].includes(row.id)||ids.has(row.id))throw Error('Each criterion needs a unique identifier.');ids.add(row.id);
  if(typeof row.name!=='string'||!row.name.trim()||row.name.length>120||typeof row.description!=='string'||row.description.length>600)throw Error('Enter criterion names (up to 120 characters) and descriptions (up to 600).');
  if(typeof row.maximum!=='number'||!precise(row.maximum)||row.maximum<=0||row.maximum>1000)throw Error('Each criterion maximum must be a whole number from 1 to 1000.');
  return {id:row.id,name:row.name.trim(),description:row.description.trim(),maximum:row.maximum};
 });
 if(criteria.reduce((sum,c)=>sum+Math.round(c.maximum*100),0)>1000000)throw Error('Total maximum must not exceed 10,000 points.');
 return {target:c.target,candidateIds:[...c.candidateIds],criteria};
}
export function validateJudgingScores(value:unknown,criteria:JudgingCriterion[],submit:boolean){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Enter criterion scores.');
 const input=value as Record<string,unknown>,scores:Record<string,number>={};
 for(const [id,value] of Object.entries(input)){
  const criterion=criteria.find(c=>c.id===id);
  if(!criterion)throw Error('The criteria changed. Refresh the score sheet.');
  if(typeof value!=='number'||!precise(value)||value<0||Math.round(value*100)>Math.round(criterion.maximum*100))throw Error(`${criterion.name}: enter 0–${criterion.maximum}, using whole numbers only.`);
  scores[id]=value;
 }
 if(submit&&criteria.some(c=>!Object.hasOwn(scores,c.id)))throw Error('Score every criterion before submitting. Zero is a valid score.');
 return {scores,totalHundredths:Object.values(scores).reduce((sum,v)=>sum+Math.round(v*100),0)};
}
export function judgingStandings(candidates:JudgingCandidate[],judgeIds:string[],criteria:JudgingCriterion[],sheets:{candidateId:string;judgeMembershipId:string;totalHundredths:number;submittedAt:unknown}[]):JudgingRow[]{
 const maximum=criteria.reduce((sum,c)=>sum+Math.round(c.maximum*100),0)/100;
 const values=candidates.map(candidate=>{
  const submitted=sheets.filter(s=>s.candidateId===candidate.id&&judgeIds.includes(s.judgeMembershipId)&&s.submittedAt);
  const sum=submitted.reduce((n,s)=>n+s.totalHundredths,0);
  return {...candidate,submitted:submitted.length,judges:judgeIds.length,sum,average:submitted.length?Math.round(sum/submitted.length)/100:null};
 }).sort((a,b)=>(b.average??-1)-(a.average??-1)||a.name.localeCompare(b.name));
 const complete=judgeIds.length>0&&values.length>0&&values.every(v=>v.submitted===judgeIds.length);
 // Compare exact integer totals for ties; all judges have equal weight.
 if(complete)values.sort((a,b)=>b.sum-a.sum||a.name.localeCompare(b.name));
 let lastSum=-1,lastRank=0;
 return values.map((v,index)=>{if(complete&&v.sum!==lastSum){lastSum=v.sum;lastRank=index+1;}return {id:v.id,name:v.name,teamName:v.teamName,average:v.average,maximum,submitted:v.submitted,judges:v.judges,rank:complete?lastRank:null};});
}

const criterion=(id:string,name:string,maximum:number,description:string):JudgingCriterion=>({id,name,maximum,description});
export const galaJudgingTemplates=[
 {id:'banner',name:'Squad Banner',target:'TEAM' as const,instructions:'Evaluate the squad’s visual identity, creativity and espionage theme.',criteria:[
  criterion('theme','Espionage Theme & Identity',30,'Squad identity, secret agent motifs and espionage aesthetics.'),
  criterion('art','Artistic Quality & Completion',30,'Visual impact, design clarity, color use and completeness upon time call.'),
  criterion('execution','Tactical Execution & Sync',20,'Smooth shift transitions, time adherence and effective pair/solo execution.'),
  criterion('originality','Originality and Creativity',20,'Unique concept, agent symbolism and tactical squad motto.')]},
 {id:'chant',name:'War Cry / Chant',target:'TEAM' as const,instructions:'Evaluate team energy, vocal coordination and creative squad messaging. Add only if this contest will be held.',criteria:[
  criterion('voice','Vocal Power & Projection',30,'Volume, unison, clarity and enthusiasm.'),criterion('content','Content & Originality',30,'Squad identity, division roles and spy terminology.'),
  criterion('choreography','Choreography & Synchronicity',20,'Movements, formations and physical execution.'),criterion('energy','Audience Engagement & Energy',20,'Command of the room and team energy.')]},
 {id:'gala',name:'Gala Showcase Performance',target:'TEAM' as const,instructions:'Judge the squad production number, narrative, flair and teamwork.',criteria:[
  criterion('story','Thematic Storyline & Interpretation',30,'Clear espionage narrative, such as a heist or undercover operation.'),criterion('quality','Performance Quality & Mastery',30,'Precision, synchronization, timing, rhythm and confidence.'),
  criterion('creativity','Creativity & Entertainment Value',20,'Originality, stage dynamics and entertainment impact.'),criterion('stage','Costumes, Props & Stage Utilization',20,'Themed props, costumes and stage presence.')]},
 {id:'squad-look',name:'Squad Look — Best Dressed Team',target:'TEAM' as const,instructions:'Evaluate the whole squad’s cohesion, style and visual impact.',criteria:[
  criterion('cohesion','Cohesion & Theme Alignment',40,'Unified visual look matching the spy theme.'),criterion('style','Elegance & Style',30,'Sophistication, neatness and visual harmony.'),criterion('bearing','Stage Confidence & Bearing',30,'Team presence and carriage during presentation.')]},
 ...(['Male','Female'] as const).map(gender=>({id:`agent-${gender.toLowerCase()}`,name:`Agent of the Night — ${gender}`,target:'INDIVIDUAL' as const,instructions:'Select the eligible nominees for this award, then judge charisma, poise and attire.',criteria:[
  criterion('attire','Adherence to Theme & Attire',40,'Formal spy attire and adherence to the theme.'),criterion('poise','Poise, Elegance & Charisma',30,'Confidence, poise and commanding presence.'),criterion('impact','Overall Impact & Grooming',30,'Complete styling, fit, grooming and accessories.')]})),
];
