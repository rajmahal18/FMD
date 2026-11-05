'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useRouter} from 'next/navigation';
import {Avatar} from './Avatar';
export function AvatarUpload({eventId,membershipId,name,avatarKey,src}:{eventId:string;membershipId:string;name:string;avatarKey:string|null;src:string|null}){
 const router=useRouter(),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),canvas=useRef<HTMLCanvasElement>(null),title=useId();
 const [open,setOpen]=useState(false),[photo,setPhoto]=useState<HTMLImageElement|null>(null),[url,setUrl]=useState(''),[zoom,setZoom]=useState(1),[x,setX]=useState(0),[y,setY]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.showModal();return()=>{document.body.style.overflow=previous;trigger.current?.focus();};},[open]);
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
 useEffect(()=>{if(!photo||!canvas.current)return;const c=canvas.current.getContext('2d');if(!c)return;const scale=Math.max(384/photo.naturalWidth,384/photo.naturalHeight)*zoom,w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;c.clearRect(0,0,384,384);c.drawImage(photo,-(w-384)*(x+100)/200,-(h-384)*(y+100)/200,w,h);},[photo,zoom,x,y]);
 function close(){if(busy)return;setOpen(false);setPhoto(null);setUrl('');setError('');}
 async function choose(file:File|undefined){
  setPhoto(null);setError('');if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setError('Choose a JPG, PNG or WebP photo no larger than 5 MB.');return;}
  const next=URL.createObjectURL(file);setUrl(next);const image=new Image();image.src=next;
  try{await image.decode();if(image.naturalWidth*image.naturalHeight>24_000_000)throw Error();setZoom(1);setX(0);setY(0);setPhoto(image);}catch{setError('Unable to read this photo. Choose a photo up to 24 megapixels.');}
 }
 async function save(remove=false){
  setBusy(true);setError('');
  try{
   const blob=remove?null:await new Promise<Blob>((resolve,reject)=>canvas.current?.toBlob(b=>b?resolve(b):reject(Error('Unable to crop this photo.')),'image/webp',.9));
   const response=await fetch(`/api/events/${eventId}/members/${membershipId}/avatar`,{method:remove?'DELETE':'POST',headers:{'Content-Type':'image/webp','x-avatar-version':avatarKey??''},body:blob,signal:AbortSignal.timeout(30000)}),body=await response.json();
   if(!response.ok)throw Error(body.error??'Unable to save the photo.');
   setOpen(false);setPhoto(null);setUrl('');setStatus(remove?'Photo removed.':'Photo saved.');router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Unable to save the photo. Please retry.');}finally{setBusy(false);}
 }
 return <div className="avatar-upload-action"><button ref={trigger} type="button" className="secondary avatar-photo-button" aria-label={`Change photo for ${name}`} aria-haspopup="dialog" onClick={()=>{setStatus('');setOpen(true);}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M8 5l2-2h4l2 2h4v15H4V5z"/><circle cx="12" cy="12" r="4"/></svg>Photo</button><span role="status">{status}</span>{open&&createPortal(<dialog ref={dialog} className="avatar-upload-dialog" aria-labelledby={title} onCancel={e=>{e.preventDefault();close();}}><header><h2 id={title}>Photo for {name}</h2><button type="button" className="secondary" disabled={busy} onClick={close} aria-label="Close photo editor">Close</button></header><div className="avatar-upload-body">{photo?<><canvas ref={canvas} width={384} height={384} role="img" aria-label="Cropped photo preview"/><label>Zoom<input type="range" min="1" max="3" step=".05" value={zoom} disabled={busy} onChange={e=>setZoom(Number(e.target.value))}/></label><label>Move left / right<input type="range" min="-100" max="100" value={x} disabled={busy} onChange={e=>setX(Number(e.target.value))}/></label><label>Move up / down<input type="range" min="-100" max="100" value={y} disabled={busy} onChange={e=>setY(Number(e.target.value))}/></label></>:<Avatar name={name} src={src} size="portrait" label/>}<label>Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>void choose(e.target.files?.[0])}/></label><p className="fine">JPG, PNG or WebP. Up to 5 MB.</p>{error&&<p role="alert">{error}</p>}</div><footer>{src&&<button type="button" className="secondary" disabled={busy} onClick={()=>void save(true)}>Remove photo</button>}<button type="button" disabled={busy||!photo} onClick={()=>void save()}>{busy?'Saving…':'Save photo'}</button></footer></dialog>,document.body)}</div>;
}
