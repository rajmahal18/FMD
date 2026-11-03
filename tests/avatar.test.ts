import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {avatarInitials,avatarUrl} from '../src/lib/avatar';
import {Avatar,PersonName} from '../src/components/Avatar';

test('avatar delivery accepts versioned raster objects for either provider',()=>{
  assert.equal(avatarUrl('avatars/person/v2.webp','https://photos.example.com/'),'https://photos.example.com/avatars/person/v2.webp');
  assert.equal(avatarUrl('avatars/random.png','https://store.public.blob.vercel-storage.com'),'https://store.public.blob.vercel-storage.com/avatars/random.png');
  assert.equal(avatarUrl(null,'https://photos.example.com'),null);
  assert.equal(avatarUrl('avatars/a.jpg',''),null);
});

test('invalid configuration and untrusted object paths fail closed',()=>{
  for(const key of ['https://other.example/a.png','//other.example/a.png','avatars/../secret.png','avatars/%2e%2e/a.png','avatars/a.svg','avatars/a.png?token=secret','avatars/a.png#fragment','avatars/日本.png']){
    assert.equal(avatarUrl(key,'https://photos.example.com'),null,key);
  }
  for(const base of ['http://photos.example.com','javascript:alert(1)','https://user:password@photos.example.com','https://photos.example.com?token=secret','not a URL']){
    assert.equal(avatarUrl('avatars/a.png',base),null,base);
  }
});

test('initials and visible names remain available without storage',()=>{
  assert.equal(avatarInitials('  María   Santos '),'MS');
  assert.equal(avatarInitials(''),'?');
  const markup=renderToStaticMarkup(createElement(PersonName,{name:'María Santos'}));
  assert.match(markup,/aria-hidden="true"/);
  assert.match(markup,/>MS<\/span>/);
  assert.match(markup,/María Santos/);
  assert.doesNotMatch(markup,/<img/);
});

test('portraits have a label and photo markup never replaces the visible name',()=>{
  const portrait=renderToStaticMarkup(createElement(Avatar,{name:'Ana Reyes',src:'https://photos.example.com/avatars/a.webp',size:'portrait',label:true}));
  assert.match(portrait,/aria-label="Ana Reyes"/);
  assert.match(portrait,/referrerPolicy="no-referrer"/i);
  assert.match(portrait,/loading="lazy"/);
  assert.match(portrait,/alt=""/);
});
