/** Tied teams share the average credit of the rank slots they occupy. */
export function placementCredit(credits:readonly number[],rank:number,tiedTeams=1):number {
 if(!credits.length||!Number.isInteger(rank)||rank<1||!Number.isInteger(tiedTeams)||tiedTeams<1)throw new Error('Valid placement credits, rank and tie size are required.');
 let total=0;
 for(let offset=0;offset<tiedTeams;offset++)total+=credits[Math.min(rank-1+offset,credits.length-1)];
 return total/tiedTeams;
}
