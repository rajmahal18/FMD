import type {EventRecapData} from '@/server/event-recap';
import {additionalAwards} from './event-awards';

/** Explicit public projection. Never serialize a privileged response wholesale. */
export function publicRecapData(data:EventRecapData):EventRecapData{
 const overall=data.overall.published?{
  published:true as const,finalizedAt:data.overall.finalizedAt,
  activities:data.overall.activities.map(a=>({id:a.id,name:a.name,weight:a.weight})),
  rows:data.overall.rows.map(r=>({id:r.id,name:r.name,rank:r.rank,value:r.value,contributions:r.contributions.map(c=>({eventId:c.eventId,source:c.source,average:c.average,maximum:c.maximum,rank:c.rank,credit:c.credit,contribution:c.contribution}))})),
 }:{published:false as const};
 const detail=data.breakdown;
 return {eventId:data.eventId,overall,additionalAwards:additionalAwards(data.additionalAwards),
  stationNames:Object.fromEntries(Object.entries(data.stationNames).map(([id,name])=>[id,name])),
  breakdown:detail?{visible:true,organizer:false,eventId:data.eventId,checkedAt:detail.checkedAt,approved:true,complete:detail.complete,revision:detail.revision,
   activities:detail.activities?.map(a=>({id:a.id,name:a.name,weight:a.weight,source:a.source,maximum:a.maximum,judges:a.judges.map(j=>({id:j.id,name:j.name}))})),
   rows:detail.rows?.map(r=>({id:r.id,name:r.name,color:r.color,total:r.total,rank:r.rank,values:r.values.map(v=>({id:v.id,judgeScores:[...v.judgeScores],judgeSum:v.judgeSum,average:v.average,rank:v.rank,credit:v.credit,contribution:v.contribution,raceScore:v.raceScore,submitted:v.submitted,expected:v.expected}))})),
  }:null,
  polls:data.polls.map(p=>({id:p.id,name:p.name,ballots:p.ballots,results:p.results.map(r=>({id:r.id,name:r.name,votes:r.votes,rank:r.rank,...(r.category?{category:r.category}:{}),...(r.squadId?{squadId:r.squadId,squadName:r.squadName}:{}),...(r.winnerBasis?{winnerBasis:r.winnerBasis,winner:r.winner===true}:{})}))})),
  contests:data.contests.map(c=>({id:c.id,name:c.name,publishedAt:c.publishedAt,criteria:c.criteria.map(k=>({id:k.id,name:k.name,description:k.description,maximum:k.maximum})),rows:c.rows.map(r=>({id:r.id,name:r.name,teamName:r.teamName,rank:r.rank,average:r.average,maximum:r.maximum,submitted:r.submitted,judges:r.judges})),sheets:c.sheets.map(s=>({candidateId:s.candidateId,judge:s.judge,total:s.total,scores:Object.fromEntries(c.criteria.map(k=>[k.id,s.scores[k.id]]))}))})),
  race:data.race?{revision:data.race.revision,teams:data.race.teams.map(r=>({id:r.id,name:r.name,rank:r.rank,value:r.value,rule:r.rule,...(r.breakdown?{breakdown:{regularPoints:r.breakdown.regularPoints,regularMaximum:r.breakdown.regularMaximum,regularContribution:r.breakdown.regularContribution,finalSuccessful:r.breakdown.finalSuccessful,finalContribution:r.breakdown.finalContribution,completedStations:r.breakdown.completedStations,stationCount:r.breakdown.stationCount,stationScores:r.breakdown.stationScores.map(s=>({stationId:s.stationId,rank:s.rank,points:s.points,complete:s.complete}))}}:{})}))}:null};
}
