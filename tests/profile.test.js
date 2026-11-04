'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {profileInput,mediaEntries}=require('../src/profile');
test('aceita arroba',()=>assert.deepEqual(profileInput('@sample.user'),{username:'sample.user',url:'https://www.instagram.com/sample.user/'}));
test('aceita nome simples',()=>assert.equal(profileInput('sample_user').username,'sample_user'));
test('aceita link de perfil',()=>assert.equal(profileInput('https://www.instagram.com/sample_user/?igsh=abc').username,'sample_user'));
test('recusa nomes maliciosos e links externos',()=>{
 for(const val of ['foo/bar','@../../oops','https://example.org/u','@name..other','https://instagram.com/reel/ABC/'])
 assert.throws(()=>profileInput(val),undefined,val);
});
test('lista apenas links diretos de midias e remove repetidos',()=>{
 const data={entries:[
  {webpage_url:'https://www.instagram.com/reel/AAAA/',title:'Vídeo 1',thumbnail:'https://cdn.example.test/1.jpg'},
  {webpage_url:'https://www.instagram.com/reel/AAAA/'},
  {webpage_url:'https://example.org/evil'},
  {webpage_url:'https://www.instagram.com/p/BBBB/',title:'Post'},
  {url:'https://cdn.example.test/file.mp4'}
 ]};
 const out=mediaEntries(data);
 assert.equal(out.length,2);assert.equal(out[0].type,'reel');assert.equal(out[1].type,'publicação');
});
test('não inventa itens quando extrator não fornece lista',()=>assert.deepEqual(mediaEntries({entries:[]}),[]));
