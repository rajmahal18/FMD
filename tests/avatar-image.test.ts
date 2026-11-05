import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {normalizeAvatar,avatarUploadLimit} from '../src/lib/avatar-image';
import {avatarUrl} from '../src/lib/avatar';
test('uploaded photos are resized to square WebP with metadata removed',async()=>{
 const original=await sharp({create:{width:900,height:450,channels:3,background:'red'}}).jpeg().withMetadata().toBuffer();
 const output=await normalizeAvatar(original),meta=await sharp(output).metadata();
 assert.equal(meta.format,'webp');assert.equal(meta.width,384);assert.equal(meta.height,384);assert.equal(meta.exif,undefined);
 assert.equal(avatarUrl('uploads/12345678-1234-4234-8234-123456789012.webp',''),'/api/avatars/12345678-1234-4234-8234-123456789012');
});
test('image validation rejects oversized, corrupt and non-raster uploads',async()=>{
 for(const bytes of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>'),Buffer.from('not an image'),new Uint8Array(avatarUploadLimit+1)])await assert.rejects(()=>normalizeAvatar(bytes));
});
