import sharp from 'sharp';
import {InputError} from './validation';
import {stationPhotoLimit} from './station-photo';
export async function normalizeStationPhoto(bytes:Uint8Array){
 if(!bytes.length||bytes.length>stationPhotoLimit)throw new InputError('Choose a photo no larger than 5 MB.',413);
 try{
  const image=sharp(bytes,{limitInputPixels:24_000_000,animated:false,failOn:'warning'}),meta=await image.metadata();
  if(!['jpeg','png','webp'].includes(meta.format??'')||(meta.pages??1)>1)throw Error();
  return new Uint8Array(await image.rotate().resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer());
 }catch{throw new InputError('Choose a valid JPG, PNG or WebP photo (up to 24 megapixels).');}
}
