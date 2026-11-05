import sharp from 'sharp';
import {InputError} from './validation';
export const avatarUploadLimit=5*1024*1024;
export async function normalizeAvatar(bytes:Uint8Array){
 if(!bytes.length||bytes.length>avatarUploadLimit)throw new InputError('Choose a photo no larger than 5 MB.',413);
 try{
  const image=sharp(bytes,{limitInputPixels:24_000_000,animated:false,failOn:'warning'});
  const meta=await image.metadata();
  if(!['jpeg','png','webp'].includes(meta.format??'')||(meta.pages??1)>1)throw Error('Unsupported image');
  return new Uint8Array(await image.rotate().resize(384,384,{fit:'cover'}).webp({quality:82}).toBuffer());
 }catch{throw new InputError('Choose a valid JPG, PNG or WebP photo (up to 24 megapixels).');}
}
