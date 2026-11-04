'use strict';
// Descoberta de links presentes no HTML publicamente entregue pelo Instagram.
// Sem login, cookies, proxies, endpoints privados ou tentativas de contornar bloqueios.
const {parseInstagramLink}=require('./links');
const MAX_BYTES=2_000_000;
function decodeBasic(s){
 return String(s).replace(/&amp;/g,'&').replace(/\\u0026/gi,'&').replace(/\\u002f/gi,'/').replace(/\\+\//g,'/').replace(/&quot;/g,'"');
}
function extractPublicMedia(html){
 const body=decodeBasic(html);
 const matches=[];
 const patterns=[
  /https:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p|tv|stories)\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)?\/?/gi,
  /(?:href|content)=["'](\/(?:reel|reels|p|tv|stories)\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)?\/?)["']/gi
 ];
 const seen=new Set();
 for(const re of patterns){
   for(const match of body.matchAll(re)){
     const raw=match[1]||match[0];
     const url=raw.startsWith('/')?'https://www.instagram.com'+raw:raw;
     try{
       const parsed=parseInstagramLink(url);
       if(parsed.type==='perfil'||seen.has(parsed.url))continue;
       seen.add(parsed.url);
       matches.push({url:parsed.url,type:parsed.type,title:parsed.type==='reel'?'Reel':'Publicação '+parsed.type,thumbnail:null,duration:0});
       if(matches.length>=100)return matches;
     }catch{}
   }
 }
 return matches;
}
async function scrapePublicProfile(profile,{fetchImpl=fetch}={}){
 const ctrl=new AbortController();
 const timeout=setTimeout(()=>ctrl.abort(),15000);
 try{
  const response=await fetchImpl(profile.url,{
   method:'GET',redirect:'manual',signal:ctrl.signal,
   headers:{'Accept':'text/html','User-Agent':'StoriesHunterREA/1.2 (public metadata reader)'}
  });
  if([301,302,303,307,308].includes(response.status)){
   throw new Error('O Instagram redirecionou a consulta; possivelmente requer acesso pelo navegador.');
  }
  if(response.status===429)throw new Error('Limite de consultas do Instagram (HTTP 429). Não serão feitas tentativas automáticas adicionais.');
  if(response.status===401||response.status===403)throw new Error('Acesso ao perfil não autorizado pelo Instagram (HTTP '+response.status+').');
  if(!response.ok)throw new Error('Resposta HTTP '+response.status+' do Instagram.');
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html'))throw new Error('A resposta não contém HTML público.');
  const declared=Number(response.headers.get('content-length')||0);
  if(declared>MAX_BYTES)throw new Error('Resposta excede o tamanho permitido.');
  // Ler o corpo com limite mesmo quando Content-Length não foi informado.
  const reader=response.body?.getReader();
  let html='';
  if(reader){
   let total=0;const decoder=new TextDecoder();
   try{
    while(true){
     const {done,value}=await reader.read();if(done)break;
     total+=value.byteLength;
     if(total>MAX_BYTES)throw new Error('Página pública grande demais para inspeção.');
     html+=decoder.decode(value,{stream:true});
    }
    html+=decoder.decode();
   }finally{await reader.cancel().catch(()=>{});}
  } else {
   html=await response.text();
   if(html.length>MAX_BYTES)throw new Error('Página pública grande demais para inspeção.');
  }
  return {items:extractPublicMedia(html),method:'html-publico'};
 }finally{clearTimeout(timeout);}
}
module.exports={extractPublicMedia,scrapePublicProfile};
