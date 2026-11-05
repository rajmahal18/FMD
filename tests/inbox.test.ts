import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseInboxAction,offerEmail} from '../src/lib/inbox';
import {safeReturnPath} from '../src/lib/race';
import {inboxFileInfo,inboxFileLimit} from '../src/lib/inbox-files';
const requestKey='11111111-1111-4111-8111-111111111111';
test('self-test uses bounded compose content and ignores supplied recipients',()=>{
 const value={operation:'sendTest',requestKey,subject:' Offer ',body:' Test ',recipientIds:['real-recipient'],attachmentIds:['briefer']};
 const parsed=parseInboxAction(value);assert.equal(parsed.operation,'sendTest');
 if(parsed.operation==='sendTest'){assert.deepEqual(parsed.recipientIds,[]);assert.deepEqual(parsed.attachmentIds,['briefer']);assert.equal(parsed.subject,'Offer');}
 assert.throws(()=>parseInboxAction({...value,body:''}));assert.throws(()=>parseInboxAction({...value,attachmentIds:['a','a']}));
});
test('offers require an individual recipient, bounded content and a retry key',()=>{
 assert.equal(parseInboxAction({operation:'send',requestKey,recipientId:'agent',subject:' Offer ',body:' Hello '}).operation,'send');
 for(const edit of [{subject:'one\nBcc: other@example.test'},{body:''},{body:'x'.repeat(5001)},{recipientId:''},{requestKey:'bad'}])assert.throws(()=>parseInboxAction({operation:'send',requestKey,recipientId:'agent',subject:'Offer',body:'Hello',...edit}));
 assert.throws(()=>parseInboxAction({operation:'respond',requestKey,id:'offer',response:'MAYBE'}));
});
test('batch recipients and attachments are distinct, bounded and normalized',()=>{
 const v={operation:'send',requestKey,subject:'Offer',body:'Briefer attached',recipientIds:['b','a'],attachmentIds:['file']};
 const parsed=parseInboxAction(v);assert.equal(parsed.operation,'send');if(parsed.operation==='send')assert.deepEqual(parsed.recipientIds,['a','b']);
 for(const edit of [{recipientIds:[]},{recipientIds:['a','a']},{recipientIds:Array.from({length:51},(_,i)=>String(i))},{attachmentIds:['file','file']},{attachmentIds:Array.from({length:6},(_,i)=>String(i))}])assert.throws(()=>parseInboxAction({...v,...edit}));
});
test('private attachments reject executable types, mismatched content, unsafe names and large/empty files',()=>{
 const pdf=new TextEncoder().encode('%PDF-1.7\nBriefer');assert.equal(inboxFileInfo('App briefer.pdf',pdf).mime,'application/pdf');
 assert.equal(inboxFileInfo('notes.txt',new TextEncoder().encode('Event instructions')).mime,'text/plain');
 for(const [name,bytes] of [['briefer.exe',pdf],['briefer.pdf',new TextEncoder().encode('not a PDF')],['../briefer.pdf',pdf],['bad\r\nname.pdf',pdf],['empty.pdf',new Uint8Array()],['large.pdf',new Uint8Array(inboxFileLimit+1)],['briefer.txt',new Uint8Array([0,1])]] as const)assert.throws(()=>inboxFileInfo(name,bytes));
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
