'use strict';
const {parseInstagramLink}=require('./links');
function profileInput(value){
 const raw=String(value||'').trim();
 if(!raw)throw new Error('Digite o usuário do Instagram.');
 let username;
 if(raw.startsWith('https://')){
   const result=parseInstagramLink(raw);
   if(result.type!=='perfil')throw new Error('Para explorar um perfil, informe um @usuário ou link de perfil.');
   username=new URL(result.url).pathname.split('/').filter(Boolean)[0];
 } else {
   username=raw.replace(/^@/,'');
   if(!/^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/.test(username))
     throw new Error('Usuário inválido. Use apenas letras, números, pontos e sublinhados.');
   const check=parseInstagramLink('https://www.instagram.com/'+username+'/');
   if(check.type!=='perfil')throw new Error('Este nome não representa um perfil válido.');
 }
 return {username,url:'https://www.instagram.com/'+username+'/'};
}
function mediaEntries(data){
 const list=Array.isArray(data.entries)?data.entries.filter(Boolean):[];
 const result=[];
 const seen=new Set();
 for(const item of list.slice(0,120)){
   const candidates=[item.webpage_url,item.original_url,item.url].filter(x=>typeof x==='string');
   let link;
   for(const candidate of candidates){
     try {
       const parsed=parseInstagramLink(candidate);
       if(['reel','publicação','story','destaque'].includes(parsed.type)){link=parsed;break;}
     }catch{}
   }
   if(!link||seen.has(link.url))continue;
   seen.add(link.url);
   const thumbnail=[item.thumbnail,...(Array.isArray(item.thumbnails)?item.thumbnails.map(x=>x.url):[])].find(x=>typeof x==='string'&&/^https:\/\//i.test(x));
   result.push({url:link.url,type:link.type,title:String(item.title||'Publicação').slice(0,160),thumbnail:thumbnail||null,duration:Number(item.duration)||0});
 }
 return result;
}
module.exports={profileInput,mediaEntries};
