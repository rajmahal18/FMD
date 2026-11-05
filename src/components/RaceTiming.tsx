import type {RankedRow} from '@/lib/results';
export function RaceTiming({row}:{row:RankedRow}){
 if(row.rule==='STATION_PLACEMENTS'&&row.breakdown){const b=row.breakdown;return <p className="fine">Regular: {b.regularPoints} / {b.regularMaximum} ({Number(b.regularContribution.toFixed(4))} pts)<br/>Final: {b.finalContribution===null?'Pending':`${b.finalSuccessful?'Success':'Failed'} (${b.finalContribution} pts)`}{row.pending&&<><br/>Placements pending</>}</p>;}
 if(!row.rule||row.rule==='POINTS')return null;
 if(row.pending)return <p className="fine">Route completion or timing pending</p>;
 const seconds=row.challengeSeconds??0;
 return <p className="fine">Adjusted station time: {Math.floor(seconds/3600)}h {Math.floor(seconds%3600/60)}m {seconds%60}s{row.rawChallengeSeconds!==undefined&&row.rawChallengeSeconds!==null&&<> (elapsed {row.rawChallengeSeconds}s + penalties {row.timePenaltySeconds??0}s)</>}</p>;
}
