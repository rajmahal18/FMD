import assert from 'node:assert/strict';
export async function avatarUploadBrowser({pg,event,evaluate,visit,check,cookie,origin,appOrigin,password}){
 const member=(await pg.query('SELECT m.id,m."userId",u.name FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$1 AND u.email=$2',[event.id,'agent@example.test'])).rows[0];
 const path=`/events/${event.id}/people`,endpoint=`/api/events/${event.id}/members/${member.id}/avatar`;
 const wait=async fn=>{for(let i=0;i<80;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Avatar UI did not update');};
 const setup=`(async()=>{const b=[...document.querySelectorAll('.avatar-photo-button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify('Change photo for '+member.name)});b.click();await new Promise(r=>setTimeout(r,100));const c=document.createElement('canvas');c.width=600;c.height=400;const ctx=c.getContext('2d');ctx.fillStyle='#e04d35';ctx.fillRect(0,0,600,400);ctx.fillStyle='#153154';ctx.fillRect(300,0,300,400);const blob=await new Promise(r=>c.toBlob(r,'image/png'));const dt=new DataTransfer();dt.items.add(new File([blob],'photo.png',{type:'image/png'}));const input=document.querySelector('.avatar-upload-dialog input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));for(let i=0;i<50&&!document.querySelector('.avatar-upload-dialog canvas');i++)await new Promise(r=>setTimeout(r,50));})()`;
 await check('avatar-crop-editor',path,setup);
 assert(await evaluate("!!document.querySelector('.avatar-upload-dialog canvas')"));
 await evaluate("[...document.querySelectorAll('.avatar-upload-dialog button')].find(b=>b.textContent==='Save photo').click()");
 await wait(async()=>(await pg.query('SELECT "avatarKey" FROM "User" WHERE id=$1',[member.userId])).rows[0].avatarKey);
 const key=(await pg.query('SELECT "avatarKey" FROM "User" WHERE id=$1',[member.userId])).rows[0].avatarKey;
 await wait(()=>evaluate("!document.querySelector('.avatar-upload-dialog')"));
 await check('avatar-saved-roster',path);
 assert(await evaluate(`!![...document.images].find(i=>i.src.includes(${JSON.stringify(key.slice(8,-5))})&&i.naturalWidth===384)`));
 const imagePath='/api/avatars/'+key.slice(8,-5);
 const image=await fetch(appOrigin+imagePath,{headers:{cookie}});assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/webp');assert.match(image.headers.get('cache-control'),/no-store/);
 assert.equal((await fetch(appOrigin+imagePath)).status,401);
 const post=(bytes,version=key,session=cookie,requestOrigin=origin,target=endpoint)=>fetch(appOrigin+target,{method:'POST',headers:{origin:requestOrigin,cookie:session,'x-avatar-version':version,'content-type':'image/png'},body:bytes});
 assert.equal((await post('bad')).status,400);
 const bytes=await image.arrayBuffer();
 assert.equal((await post(bytes,'')).status,409);
 assert.equal((await post(bytes,key,cookie,'https://other.invalid')).status,403);
 assert.equal((await post(bytes,key,cookie,origin,endpoint.replace(member.id,'missing-member'))).status,404);
 for(const role of ['agent','facilitator']){
  const login=await fetch(appOrigin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password}),redirect:'manual'});
  const otherCookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await post(bytes,key,otherCookie)).status,403);
  assert.equal((await fetch(appOrigin+imagePath,{headers:{cookie:otherCookie}})).status,200);
 }
 await pg.query('UPDATE "User" SET "mustChangePassword"=true WHERE id=$1',[member.userId]);
 const switched=await fetch(appOrigin+'/api/auth/switch-account',{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify({eventId:event.id,membershipId:member.id})});
 assert.equal(switched.status,200);
 const switchedCookie=switched.headers.getSetCookie().find(c=>c.startsWith('__Host-spy-session=')).split(';')[0];
 assert.equal((await fetch(appOrigin+imagePath,{headers:{cookie:switchedCookie}})).status,200);
 assert.equal((await fetch(appOrigin+'/api/management',{headers:{cookie:switchedCookie}})).status,403);
 await pg.query('UPDATE "User" SET "mustChangePassword"=false WHERE id=$1',[member.userId]);
 await visit(path);await evaluate(`[...document.querySelectorAll('.avatar-photo-button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify('Change photo for '+member.name)}).click()`);
 await wait(()=>evaluate("!!document.querySelector('.avatar-upload-dialog[open]')"));
 await evaluate("[...document.querySelectorAll('.avatar-upload-dialog button')].find(b=>b.textContent==='Remove photo').click()");
 await wait(async()=>(await pg.query('SELECT "avatarKey" FROM "User" WHERE id=$1',[member.userId])).rows[0].avatarKey===null);
 assert.equal((await fetch(appOrigin+imagePath,{headers:{cookie}})).status,404);
 assert.equal((await pg.query('SELECT count(*)::int n FROM "UserAvatar" WHERE "userId"=$1',[member.userId])).rows[0].n,0);
 console.log('PASS: real photo selection/crop/save/remove, 320–1440px layout, member image access, organizer-only upload, origin validation, stale-photo protection and corrupt-image rejection.');
}
