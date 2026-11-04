'use strict';
const {spawn, spawnSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const {app} = require('electron');
const {parseInstagramLink} = require('./links');

function resolveBinary() {
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const candidates = [path.join(app.getPath('userData'), 'tools', name), path.join(process.resourcesPath, 'tools', name), path.resolve(__dirname, '../tools', name)];
  for (const file of candidates) if (fs.existsSync(file)) return file;
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  const found = spawnSync(cmd, [name], {encoding:'utf8', timeout:2000, windowsHide:true});
  if (found.status === 0 && found.stdout.trim()) return found.stdout.trim().split(/\r?\n/)[0].trim();
  return null;
}
function cleanError(str) {
  const raw = String(str || '').replace(/\x1b\[[\d;]*m/g, '');
  const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  // A mensagem final do extrator e mais util que avisos genericos anteriores.
  const lastError = [...lines].reverse().find(x => /(?:^|\s)ERROR:|HTTP Error|Unsupported URL/i.test(x)) || '';
  const s = lastError || raw;
  if (/429|rate.limit|too many requests/i.test(s))
    return 'O Instagram limitou as tentativas (HTTP 429). Aguarde antes de tentar novamente.';
  if (/login required|need to log in|sign in|authentication|private|cookies/i.test(s))
    return 'Esta mídia exige autenticação ou acesso autorizado no Instagram. O programa não está autenticado; confirme as permissões do conteúdo.';
  if (/HTTP Error 404|404: Not Found|video info extraction failed/i.test(s))
    return 'O Instagram respondeu com erro HTTP 404 para o extrator. Mesmo que a publicação abra no navegador, a API usada pelo yt-dlp pode ter mudado.';
  if (/HTTP Error 403|403: Forbidden/i.test(s))
    return 'O Instagram negou o acesso ao extrator (HTTP 403). Confirme se o conteúdo está acessível e tente novamente mais tarde.';
  if (/unsupported url/i.test(s))
    return 'Este formato de link não é suportado pelo extrator.';
  if (/unable to extract|extraction failed|unable to download|instagram/i.test(s))
    return 'Falha do extrator do Instagram: ' + s.replace(/^ERROR:\s*/i, '').slice(0,450) + '. Verifique a versão do yt-dlp; se estiver atualizada, pode ser uma incompatibilidade com a API do Instagram.';
  return (lastError || lines.slice(-2).join(' | ') || 'Não foi possível concluir a operação.').slice(0,600);
}
function runProcess(binary, args, {onLine, timeoutMs=90000, signal}={}) {
  return new Promise((resolve, reject) => {
    let child, stderr='', stdout='', finished=false, timer;
    try { child = spawn(binary, args, {windowsHide:true, stdio:['ignore','pipe','pipe']}); }
    catch(e) { reject(e); return; }
    const finish = (err, val) => {if(finished)return;finished=true;clearTimeout(timer);if(signal)signal.removeEventListener('abort', abort); err?reject(err):resolve(val);};
    const abort = () => {child.kill();finish(new Error('Operação cancelada.'));};
    if(signal) { if(signal.aborted){abort();return;} signal.addEventListener('abort',abort,{once:true}); }
    timer=setTimeout(()=>{child.kill();finish(new Error('Tempo limite excedido ao consultar o Instagram.'));},timeoutMs);
    child.stdout.on('data', b => { const s=b.toString('utf8');stdout+=s; if(stdout.length>10_000_000) {child.kill();finish(new Error('Resposta muito grande.'));} if(onLine)onLine(s); });
    child.stderr.on('data', b => { const s=b.toString('utf8'); stderr+=s; if(stderr.length>300_000)stderr=stderr.slice(-300_000); if(onLine)onLine(s); });
    child.on('error', e=>finish(e));
    child.on('close', code => code===0 ? finish(null,{stdout,stderr}) : finish(new Error(cleanError(stderr) + (code===null?' (interrompido)':''))));
  });
}
function requireBinary(){const b=resolveBinary();if(!b)throw new Error('yt-dlp não encontrado. Abra Configurações e execute o script Instalar-Dependencias.ps1 incluído no projeto.');return b;}
function baseArgs(){return ['--no-playlist','--no-warnings','--socket-timeout','20','--retries','2','--extractor-retries','2'];}
async function inspect(value){
  const link=parseInstagramLink(value), binary=requireBinary();
  const {stdout}=await runProcess(binary,[...baseArgs(),'--dump-single-json','--skip-download',link.url],{timeoutMs:90000});
  let data;try{data=JSON.parse(stdout.trim());}catch{throw new Error('O extrator não retornou dados válidos.');}
  const entries=Array.isArray(data.entries)?data.entries.filter(Boolean).slice(0,100):[data];
  return {link, title:String(data.title||data.uploader||'Conteúdo do Instagram').slice(0,180),
    uploader:String(data.uploader||data.channel||'').slice(0,100),
    thumbnail: String(data.thumbnail||entries[0]?.thumbnail||''),
    count:entries.length, duration: Number(data.duration||0),
    items:entries.slice(0,20).map(x=>({title:String(x.title||'Mídia').slice(0,110),kind:x.ext||'',duration:Number(x.duration||0)}))};
}
function startDownload(value,folder,mode,quality,callbacks={}){
  const link=parseInstagramLink(value), binary=requireBinary();
  if(!folder||!fs.existsSync(folder)||!fs.statSync(folder).isDirectory()) throw new Error('Escolha uma pasta existente.');
  const modes=new Set(['auto','video','audio']); if(!modes.has(mode))throw new Error('Modo inválido.');
  const qs=new Set(['best','1080','720','480']);if(!qs.has(quality))throw new Error('Qualidade inválida.');
  const args=[...baseArgs(),'--newline','--progress','--progress-template','download:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
    '--paths',folder,'--windows-filenames','--restrict-filenames','--no-overwrites','--print','after_move:filepath',
    '-o','%(uploader,channel,creator,extractor_key)s_%(id)s_%(title).90s.%(ext)s'];
  if(mode==='audio') args.push('-x','--audio-format','mp3');
  else if(mode==='video') args.push('-f',quality==='best'?'bv*+ba/b':`bv*[height<=${quality}]+ba/b[height<=${quality}]/b`,'--merge-output-format','mp4');
  else if(quality!=='best')args.push('-f',`bv*[height<=${quality}]+ba/b[height<=${quality}]/b`,'--merge-output-format','mp4');
  args.push(link.url);
  const ctrl=new AbortController();
  const p=runProcess(binary,args,{signal:ctrl.signal,timeoutMs:45*60*1000,onLine: s=>{
    for(const line of s.split(/\r?\n/)){
      const match=line.match(/download:\s*([\d.,]+)%\s*\|\s*([^|]+)\|\s*(.*)$/);
      if(match&&callbacks.onProgress)callbacks.onProgress({percent:Math.min(100,parseFloat(match[1].replace(',','.'))||0),speed:match[2].trim(),eta:match[3].trim()});
      if(line.includes('ERROR:')&&callbacks.onLog) callbacks.onLog(line.slice(0,300));
    }
  }}).then(result=>{
    const files=result.stdout.split(/\r?\n/).filter(line=>path.isAbsolute(line)&&fs.existsSync(line)).slice(-30);
    return {files,folder,link};
  });
  return {promise:p, cancel:()=>ctrl.abort()};
}

// Baixa o binário da publicação oficial, no diretório gravável do usuário.
// Não modifica pastas do aplicativo instalado nem armazena credenciais.
function downloadOfficial(url, target, hops=0) {
  return new Promise((resolve,reject)=>{
    if (hops>5) return reject(new Error('Muitos redirecionamentos ao obter o yt-dlp.'));
    const u=new URL(url);
    const permitted=['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'];
    if (u.protocol!=='https:' || !permitted.includes(u.hostname)) return reject(new Error('Origem de download não autorizada.'));
    const req=https.get(u,{headers:{'User-Agent':'StoriesHunterREA/1.0.2','Accept':'application/octet-stream'}},res=>{
      if([301,302,303,307,308].includes(res.statusCode)){
        const location=res.headers.location;res.resume();
        if(!location)return reject(new Error('Redirecionamento sem destino.'));
        return downloadOfficial(new URL(location,url).toString(),target,hops+1).then(resolve,reject);
      }
      if(res.statusCode!==200){res.resume();return reject(new Error('Falha no download do yt-dlp: HTTP '+res.statusCode));}
      const out=fs.createWriteStream(target,{flags:'w'});let bytes=0;let ended=false;
      const fail=e=>{if(ended)return;ended=true;out.destroy();try{fs.unlinkSync(target);}catch{}reject(e);};
      res.on('data',chunk=>{bytes+=chunk.length;if(bytes>100*1024*1024)res.destroy(new Error('Arquivo excedeu limite de segurança.'));});
      res.on('error',fail);out.on('error',fail);
      out.on('finish',()=>{if(ended)return;ended=true;out.close(()=>resolve(bytes));});res.pipe(out);
    });
    req.setTimeout(90000,()=>req.destroy(new Error('Tempo esgotado ao baixar o yt-dlp.')));
    req.on('error',reject);
  });
}
async function updateExtractor(){
  if(process.platform!=='win32')throw new Error('Atualizador disponível apenas para Windows.');
  const dir=path.join(app.getPath('userData'),'tools');fs.mkdirSync(dir,{recursive:true});
  const target=path.join(dir,'yt-dlp.exe'),temp=path.join(dir,'yt-dlp.download.exe');
  try{
    await downloadOfficial('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',temp);
    const r=await runProcess(temp,['--version'],{timeoutMs:30000});
    const version=r.stdout.trim();if(!/^\d{4}\.\d{1,2}\.\d{1,2}/.test(version))throw new Error('Versão inesperada do arquivo baixado.');
    fs.renameSync(temp,target);
    return {version,binary:target};
  }catch(e){try{fs.unlinkSync(temp);}catch{}throw new Error('Não foi possível atualizar o yt-dlp: '+e.message);}
}

module.exports={resolveBinary,inspect,startDownload,parseInstagramLink,runProcess,updateExtractor,cleanError};
