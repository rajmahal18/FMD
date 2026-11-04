import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseInboxAction,offerEmail} from '../src/lib/inbox';
import {safeReturnPath} from '../src/lib/race';
const requestKey='11111111-1111-4111-8111-111111111111';
test('offers require an individual recipient, bounded content and a retry key',()=>{
 assert.equal(parseInboxAction({operation:'send',requestKey,recipientId:'agent',subject:' Offer ',body:' Hello '}).operation,'send');
 for(const edit of [{subject:'one\nBcc: other@example.test'},{body:''},{body:'x'.repeat(5001)},{recipientId:''},{requestKey:'bad'}])assert.throws(()=>parseInboxAction({operation:'send',requestKey,recipientId:'agent',subject:'Offer',body:'Hello',...edit}));
 assert.throws(()=>parseInboxAction({operation:'respond',requestKey,id:'offer',response:'MAYBE'}));
});
test('offer email escapes content and only suggests an authenticated answer',()=>{
 const mail=offerEmail({eventName:'<event>',subject:'<script>',body:'<img src=x onerror=alert(1)>',url:'https://example.test/events/event/inbox?message=offer',copy:false,response:null});
 assert(!mail.html.includes('<script>'));assert(!mail.html.includes('<img'));assert(mail.html.includes('&lt;img'));assert(mail.html.includes('choice=YES'));assert(mail.html.includes('choice=NO'));assert(mail.html.includes('confirm your choice'));assert(!mail.html.includes('<form'));
 const copy=offerEmail({eventName:'Event',subject:'Offer',body:'Hello',url:'https://example.test/events/event/inbox?message=offer',copy:true,response:'YES'});
 assert(copy.subject.includes('Accepted'));assert(!copy.html.includes('choice=YES'));
});
test('inbox links survive sign in but cannot become an open redirect',()=>{
 const path='/events/event/inbox?message=offer&choice=YES';assert.equal(safeReturnPath(path),path);
 for(const path of ['https://evil.test/events/event/inbox','//evil.test/inbox','/events/event/inbox?message=offer&choice=MAYBE','/events/event/inbox?message=offer&redirect=https://evil.test','/events/event/inbox?message=../secret'])assert.equal(safeReturnPath(path),'');
});
