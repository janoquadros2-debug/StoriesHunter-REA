'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {extractPublicMedia,scrapePublicProfile}=require('../src/public-scraper');
test('captura somente links de posts e reels do HTML publico',()=>{
 const html='<a href="/reel/ABC123/">Ver</a><a href="https://www.instagram.com/p/POST123/">Post</a><a href="/reel/ABC123/">Duplicado</a><a href="https://evil.test/other">Fora</a>';
 const items=extractPublicMedia(html);
 assert.equal(items.length,2);assert.deepEqual(items.map(x=>x.type),['publicação','reel'].sort((a,b)=>0).reverse().reverse()); 
 assert(items.some(x=>x.url==='https://www.instagram.com/reel/ABC123/'));
 assert(items.some(x=>x.url==='https://www.instagram.com/p/POST123/'));
});
test('interpreta barra escapada e entidades',()=>{
 const html=String.raw`{"url":"https:\\/\\/www.instagram.com\\/reel\\/ESC123\\/"}`;
 const items=extractPublicMedia(html);assert(items.some(x=>x.url.includes('ESC123')));
});
test('não inventa mídia quando HTML não apresenta links',()=>{
 assert.deepEqual(extractPublicMedia('<html><title>Perfil público</title></html>'),[]);
});
test('consulta HTML público sem autenticação',async()=>{
 const result=await scrapePublicProfile({url:'https://www.instagram.com/test/'},{
  fetchImpl:async (url,opts)=>{
   assert.equal(opts.redirect,'manual');assert(!opts.headers.Cookie);assert(!opts.headers.Authorization);
   return new Response('<a href="/p/ABCD/">Post</a>',{status:200,headers:{'Content-Type':'text/html'}});
  }
 });
 assert.equal(result.items.length,1);
});
test('não repete consulta quando o servidor limita requisições',async()=>{
 let calls=0;
 await assert.rejects(()=>scrapePublicProfile({url:'https://www.instagram.com/test/'},{fetchImpl:async()=>{calls++;return new Response('',{status:429});}}),/429/);
 assert.equal(calls,1);
});
