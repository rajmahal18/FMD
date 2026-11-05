const formatter=new Intl.NumberFormat('en-US',{maximumFractionDigits:2,useGrouping:false});
export function formatScore(value:number){return formatter.format(value);}
