// Runs inside Chromium. Composite CSS backgrounds from each surface to the root.
export function auditContrast(){
 const parse=value=>{const m=value.match(/rgba?\(([^)]+)\)/);return m?m[1].split(/[, /]+/).map(Number):null;};
 const blend=(front,back)=>{const a=front[3]??1;return front.slice(0,3).map((n,i)=>n*a+back[i]*(1-a));};
 const luminance=c=>c.slice(0,3).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 const failures=[];
 for(const e of document.querySelectorAll('body *')){
  if(e.matches('script,style,option,svg,svg *')||e.closest('[hidden],button:disabled,fieldset:disabled'))continue;
  const style=getComputedStyle(e);if(style.visibility!=='visible'||!e.getClientRects().length)continue;
  const text=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim()||(e.matches('input:not([type=hidden],[type=checkbox],[type=radio],[type=color],[type=range]),textarea,select')?e.value:'');if(!text)continue;
  const bounds=e.getBoundingClientRect();if(!bounds.width||!bounds.height)continue;
  const ancestors=[];for(let p=e;p;p=p.parentElement)ancestors.unshift(p);
  let background=[7,20,38];for(const p of ancestors){const s=getComputedStyle(p);const color=parse(s.backgroundColor);if(color)background=blend(color,background);const gradient=s.backgroundImage.startsWith('linear-gradient')?parse(s.backgroundImage):null;if(gradient)background=blend(gradient,background);}
  const foreground=parse(style.color);if(!foreground)continue;const f=luminance(blend(foreground,background)),b=luminance(background),ratio=(Math.max(f,b)+.05)/(Math.min(f,b)+.05);const large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&Number(style.fontWeight)>=700);const minimum=large?3:4.5;
  if(ratio+.05<minimum)failures.push({text:text.slice(0,85),element:e.tagName.toLowerCase(),className:e.className,color:style.color,background:background.map(Math.round),ratio:Math.round(ratio*100)/100,minimum});
 }
 return failures;
}
