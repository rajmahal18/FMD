import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function shareResult({origin,requestOrigin=origin,eventId,cookie,key,facilitators='PUBLISHED',participants='PUBLISHED'}){
 const url=origin+'/api/events/'+eventId+'/result-sharing',headers={cookie,origin:requestOrigin,'content-type':'application/json'};
 const state=await (await fetch(url,{headers})).json(),item=state.items.find(i=>i.key===key);assert(item,'Result source exists: '+key);
 const body={key,facilitators,participants,sourceRevision:item.sourceRevision,sharingRevision:item.sharingRevision,runRevision:state.runRevision};
 const review=await fetch(url,{method:'POST',headers,body:JSON.stringify({...body,operation:'preview'})}),preview=await review.json();assert.equal(review.status,200,JSON.stringify(preview));
 const response=await fetch(url,{method:'POST',headers,body:JSON.stringify({...body,operation:'confirm',token:preview.token,requestKey:randomUUID()})}),result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;
}
