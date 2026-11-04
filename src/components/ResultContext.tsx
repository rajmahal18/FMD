import {readResultCenter} from '@/server/result-sharing';
import {ResultAudience} from './ResultAudience';
export async function ResultContext({actorId,eventId,resultKey}:{actorId:string;eventId:string;resultKey:string}){
 return <ResultAudience initial={await readResultCenter(actorId,eventId)} resultKey={resultKey}/>;
}
