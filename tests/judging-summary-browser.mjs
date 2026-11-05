import assert from 'node:assert/strict';
export async function verifySubmittedSummary({evaluate,visit,check,event}){
 const path='/events/'+event.id+'/judging';
 const wait=async fn=>{for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Submitted score summary timed out');};
 const click=label=>evaluate(`[...document.querySelectorAll('.judging-score-sheet button')].find(b=>b.textContent===${JSON.stringify(label)}).click()`);
 await wait(()=>evaluate("!!document.querySelector('.judging-submission-summary')"));
 await check('judging-submitted-summary',path);
 assert.equal(await evaluate("document.querySelectorAll('.judging-submission-summary input').length"),0,'Submitted sheets hide inputs and sliders');
 assert.equal(await evaluate("document.querySelectorAll('.judging-submission-summary .judging-review>div').length"),4);
 assert(await evaluate("document.querySelector('.judging-submission-summary .judging-score-total').textContent.includes('89')"));
 await click('Edit scores');
 assert.equal(await evaluate("document.querySelector('.judging-score-sheet input[type=number]').value"),'27');
 await evaluate("(()=>{const input=document.querySelector('.judging-score-sheet input[type=number]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'28');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
 await new Promise(r=>setTimeout(r,100));await click('Back to summary');
 assert(await evaluate("document.querySelector('.judging-submission-summary .judging-score-total').textContent.includes('89')"),'Summary shows the saved submission, never unsubmitted edits');
 assert(await evaluate("document.querySelector('.judging-unsubmitted-note').textContent.includes('unsubmitted changes')"));
 await visit(path);await wait(()=>evaluate("!!document.querySelector('.judging-submission-summary .judging-unsubmitted-note')"));
 await click('Edit scores');
 assert.equal(await evaluate("document.querySelector('.judging-score-sheet input[type=number]').value"),'28','Explicit editing restores local changes after reload');
 await evaluate("window.dispatchEvent(new Event('focus'))");
 await new Promise(r=>setTimeout(r,200));assert.equal(await evaluate("document.querySelector('.judging-score-sheet input[type=number]').value"),'28','Navigation refresh preserves edit mode and values');
 console.log('PASS: submitted summary, criterion breakdown, saved total, explicit edit mode, unsubmitted change distinction and draft recovery.');
}
