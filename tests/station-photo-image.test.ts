import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {normalizeStationPhoto} from '../src/lib/station-photo-image';
import {stationPhotoLimit,stationPhotoUrl} from '../src/lib/station-photo';
test('station guide photos retain the whole landscape and strip metadata',async()=>{
 const original=await sharp({create:{width:2400,height:1200,channels:3,background:'blue'}}).jpeg().withMetadata().toBuffer();
 const bytes=await normalizeStationPhoto(original),meta=await sharp(bytes).metadata();
 assert.equal(meta.width,1280);assert.equal(meta.height,640);assert.equal(meta.exif,undefined);assert.equal(meta.format,'webp');
 const small=await sharp({create:{width:100,height:200,channels:3,background:'red'}}).png().toBuffer();
 const portrait=await sharp(await normalizeStationPhoto(small)).metadata();assert.equal(portrait.width,100);assert.equal(portrait.height,200);
 assert.equal(stationPhotoUrl('e','s',null),null);assert.equal(stationPhotoUrl('e','s','v'),'/api/events/e/stations/s/photo?v=v');
});
test('station uploads reject invalid, unsafe and oversized images',async()=>{
 for(const bytes of [Buffer.from('bad'),Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>'),new Uint8Array(stationPhotoLimit+1)])await assert.rejects(()=>normalizeStationPhoto(bytes));
});
