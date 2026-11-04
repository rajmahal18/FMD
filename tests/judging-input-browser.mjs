import assert from 'node:assert/strict';
export async function verifyJudgingInputs({evaluate,pg,event,check,cmd}){
 const input="document.querySelector('.judging-score-sheet input[type=number]')";
 const set=async value=>{await evaluate(`(()=>{const input=${input};Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'${value}');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await new Promise(r=>setTimeout(r,100));};
 assert.deepEqual(await evaluate("[...document.querySelector('.judging-score-sheet').querySelectorAll('input[type=range]')].map(i=>Number(i.max))"),[30,30,20,20]);
 await set('31');assert(await evaluate("document.querySelector('.judging-input-error').textContent.includes('more than 30')"));assert.equal(await evaluate(input+'.value'),'31','Invalid numeric entry remains visible, never silently clamped');
 assert(await evaluate("[...document.querySelector('.judging-score-sheet').querySelectorAll('button')].filter(b=>['Save draft','Review score'].includes(b.textContent)).every(b=>b.disabled)"));
 await evaluate("document.querySelector('.judging-score-sheet form').requestSubmit()");assert.equal(await evaluate("!!document.querySelector('.judging-dialog[open]')"),false,'Invalid input cannot open review');
 await check('judging-live-validation','/events/'+event.id+'/judging');
 await evaluate("(()=>{const input=document.querySelector('.judging-score-sheet input[type=range]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'29');input.dispatchEvent(new Event('input',{bubbles:true}));})()");await new Promise(r=>setTimeout(r,100));
 assert.equal(await evaluate(input+'.value'),'29','Slider updates the numeric score');assert.equal(await evaluate("!!document.querySelector('.judging-input-error')"),false);
 await set('28');assert.equal(await evaluate("document.querySelector('.judging-score-sheet input[type=range]').value"),'28','Numeric entry updates slider');
 await set('-1');assert(await evaluate("document.querySelector('.judging-input-error').textContent.includes('less than 0')"));
 await set('1.234');assert(await evaluate("document.querySelector('.judging-input-error').textContent.includes('whole numbers')"));
 await set('');await evaluate("document.querySelector('.judging-score-sheet input[type=range]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))");await new Promise(r=>setTimeout(r,100));assert.equal(await evaluate(input+'.value'),'0','Explicit slider interaction may score zero');
 await set('');assert(await evaluate("[...document.querySelector('.judging-score-sheet').querySelectorAll('button')].find(b=>b.textContent==='Review score').disabled"));assert.equal(await evaluate("[...document.querySelector('.judging-score-sheet').querySelectorAll('button')].find(b=>b.textContent==='Save draft').disabled"),false,'Incomplete but valid draft is allowed');
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM "JudgingScore" WHERE "eventId"=$1',[event.id])).rows[0].n,0,'Validation and slider changes never submit a score');
 await cmd('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:true});
 console.log('PASS: live judging input limits, inline errors, slider/number synchronization, explicit zero, incomplete drafts and review guards.');
}
