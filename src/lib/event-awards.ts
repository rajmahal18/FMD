import {InputError} from './validation';
export type AdditionalAward={award:string;name:string;teamName:string};
export function additionalAwards(value:unknown):AdditionalAward[]{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>100)throw new InputError('Provide a valid additional award list.');
 return value.map(row=>{
  if(!row||typeof row!=='object'||['award','name','teamName'].some(key=>typeof row[key]!=='string'||!row[key].trim()||row[key].length>160))throw new InputError('Each award needs an award name, recipient and squad.');
  return {award:row.award.trim(),name:row.name.trim(),teamName:row.teamName.trim()};
 });
}
