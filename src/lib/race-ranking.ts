export const raceRules={
 TIME:'Shortest total station time, including time penalties',
 POINTS:'Highest station points',
 POINTS_TIME:'Highest points; shortest challenge time breaks ties',
} as const;
export type RaceRule=keyof typeof raceRules;
export type RaceTeam={id:string;name:string;color?:string;points:number;complete:boolean;challengeSeconds:number|null;completedAt:number|null;rawChallengeSeconds?:number|null;timePenaltySeconds?:number};
export function rankRace(teams:RaceTeam[],rule:RaceRule='POINTS'){
 const eligible=(t:RaceTeam)=>rule==='POINTS'||(t.complete&&t.challengeSeconds!==null);
 const compare=(a:RaceTeam,b:RaceTeam)=>rule==='TIME'?a.challengeSeconds!-b.challengeSeconds!:b.points-a.points||(rule==='POINTS_TIME'?a.challengeSeconds!-b.challengeSeconds!:0);
 const sorted=[...teams].sort((a,b)=>Number(eligible(b))-Number(eligible(a))||(eligible(a)?compare(a,b):0)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 let rank=0;return sorted.map((t,i)=>{const pending=!eligible(t);if(!pending&&(i===0||compare(t,sorted[i-1])!==0))rank=i+1;return {id:t.id,name:t.name,color:t.color,value:rule==='TIME'?t.challengeSeconds??0:t.points,rank:pending?0:rank,pending,challengeSeconds:t.challengeSeconds,rawChallengeSeconds:t.rawChallengeSeconds,timePenaltySeconds:t.timePenaltySeconds,completedAt:t.completedAt,rule};});
}
