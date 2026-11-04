'use strict';
const {app,BrowserWindow,ipcMain,dialog,shell} = require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {autoUpdater}=require('electron-updater');
const {inspect,inspectProfile,startDownload,resolveBinary,parseInstagramLink,runProcess,updateExtractor}=require('./backend');
const {profileInput}=require('./profile');
let win,instagramWindow;
let oneClickUpdating=false;
let updateState={status:'idle',version:app.getVersion(),progress:0,message:'Verificação ainda não iniciada.'};
function reportUpdate(patch){updateState={...updateState,...patch};send('update:status',updateState);}
// Repositório privado: sem credenciais embutidas. O feed público só funciona após a publicação pública.
autoUpdater.autoDownload=false;
autoUpdater.autoInstallOnAppQuit=false;
autoUpdater.on('checking-for-update',()=>reportUpdate({status:'checking',message:'Procurando atualização...'}));
autoUpdater.on('update-available',info=>{
 reportUpdate({status:'available',latest:info.version,message:'Versão '+info.version+' disponível.'});
 if(oneClickUpdating)autoUpdater.downloadUpdate().catch(err=>{oneClickUpdating=false;reportUpdate({status:'error',message:err.message});});
});
autoUpdater.on('update-not-available',()=>{oneClickUpdating=false;reportUpdate({status:'current',latest:app.getVersion(),message:'Você está usando a versão mais recente.'});});
autoUpdater.on('download-progress',progress=>reportUpdate({status:'downloading',progress:Math.round(progress.percent),message:`Baixando... ${Math.round(progress.percent)}%`}));
autoUpdater.on('update-downloaded',info=>{
 reportUpdate({status:'ready',latest:info.version,progress:100,message:'Download concluído. Preparando instalação...'});
 if(oneClickUpdating){oneClickUpdating=false;setImmediate(()=>autoUpdater.quitAndInstall(false,true));}
});
autoUpdater.on('error',err=>{oneClickUpdating=false;reportUpdate({status:'error',message:'Não foi possível consultar ou baixar a atualização: '+err.message});});

const tasks=new Map(), queue=[];
let running=null, settings={};
const storePath=()=>path.join(app.getPath('userData'),'settings.json');
const historyPath=()=>path.join(app.getPath('userData'),'history.json');
function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2),'utf8');}
function send(channel,data){if(win&&!win.isDestroyed())win.webContents.send(channel,data);}
function emitTask(task){send('task:update', {...task,cancel:undefined});}
function trimHistory(){const list=Array.from(tasks.values()).map(x=>({...x,cancel:undefined}));saveJson(historyPath(),list.slice(-300));}
function initStore(){settings={folder:app.getPath('downloads'),quality:'best',mode:'auto',theme:'dark',...readJson(storePath(),{})};
  for(const h of readJson(historyPath(),[])){if(h&&typeof h.id==='string')tasks.set(h.id,{...h,status:h.status==='downloading'||h.status==='queued'?'interrompido':h.status});}}
async function tick(){
  if(running||!queue.length)return;
  const id=queue.shift(),t=tasks.get(id);if(!t||t.status!=='queued'){setImmediate(tick);return;}
  running=id;t.status='downloading';t.startedAt=Date.now();emitTask(t);
  try{
    const job=startDownload(t.url,t.folder,t.mode,t.quality,{onProgress: p=>{Object.assign(t,p);emitTask(t);},onLog:l=>{t.message=l;emitTask(t);}});
    t.cancel=job.cancel;
    const result=await job.promise;
    t.status='completed';t.percent=100;t.files=result.files;t.message=result.files.length?`${result.files.length} arquivo(s) salvo(s)`:'Download finalizado. Confira a pasta de destino.';
  }catch(e){t.status=e.message==='Operação cancelada.'?'cancelled':'error';t.message=e.message;}
  finally{delete t.cancel;t.finishedAt=Date.now();emitTask(t);trimHistory();running=null;setImmediate(tick);}
}
function openWindow(){
  win=new BrowserWindow({width:1320,height:840,minWidth:980,minHeight:640,backgroundColor:'#090b16',title:'Stories Hunter REA',icon:path.join(__dirname,'../assets/icon.png'),
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  win.loadFile(path.join(__dirname,'renderer/index.html'));
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/(www\.)?(instagram\.com|github\.com)\//.test(url))shell.openExternal(url);return {action:'deny'};});
  win.webContents.on('will-navigate',e=>e.preventDefault());
}
app.whenReady().then(()=>{initStore();openWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)openWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('before-quit',()=>{for(const t of tasks.values())if(t.cancel)t.cancel();});
function allowedInstagramPage(raw){
 try{const url=new URL(raw);return url.protocol==='https:'&&['instagram.com','www.instagram.com','m.instagram.com'].includes(url.hostname)&&!url.username&&!url.password&&!url.port;}catch{return false;}
}
function openInstagramBrowser(url){
 if(!instagramWindow||instagramWindow.isDestroyed()){
   instagramWindow=new BrowserWindow({width:1050,height:800,minWidth:700,minHeight:550,title:'Instagram — Stories Hunter',autoHideMenuBar:true,
     webPreferences:{partition:'persist:stories-hunter-login',contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
   instagramWindow.webContents.setWindowOpenHandler(({url:newUrl})=>({action:allowedInstagramPage(newUrl)?'allow':'deny'}));
   instagramWindow.webContents.on('will-navigate',(event,newUrl)=>{if(!allowedInstagramPage(newUrl))event.preventDefault();});
 }
 instagramWindow.loadURL(url);
 instagramWindow.show();instagramWindow.focus();
 return {opened:true};
}
ipcMain.handle('instagram:login',()=>openInstagramBrowser('https://www.instagram.com/accounts/login/'));
ipcMain.handle('instagram:profile',(_event,user)=>openInstagramBrowser(profileInput(user).url));

ipcMain.handle('instagram:visible-links',async()=>{
 if(!instagramWindow||instagramWindow.isDestroyed())throw new Error('Abra primeiro a janela do Instagram.');
 if(!allowedInstagramPage(instagramWindow.webContents.getURL()))throw new Error('Navegação fora do Instagram.');
 const found=await instagramWindow.webContents.executeJavaScript(`(()=>{
  const out=[];
  for(const a of [...document.querySelectorAll('a[href]')].slice(0,2500)){
    const url=a.href;
    if(!/^https:\\/\\/(?:www\\.)?instagram\\.com\\/(?:p|reel|reels|tv)\\/[A-Za-z0-9_-]+\\/?(?:[?#].*)?$/i.test(url))continue;
    const img=a.querySelector('img');
    out.push({url,title:(img?.alt||a.getAttribute('aria-label')||'Mídia').slice(0,150),thumbnail:img?.currentSrc||img?.src||''});
  }
  return out;
})()`,true);
 const items=[],seen=new Set();
 for(const item of found){
  try{
   const parsed=parseInstagramLink(item.url);
   if(seen.has(parsed.url))continue;seen.add(parsed.url);
   items.push({url:parsed.url,type:parsed.type,title:item.title,thumbnail:typeof item.thumbnail==='string'&&item.thumbnail.startsWith('https://')?item.thumbnail:null});
   if(items.length>=100)break;
  }catch{}
 }
 return {items,warning:'Importação dos links de publicações e Reels presentes na tela aberta. Role a página no Instagram e importe novamente para encontrar mais itens. Stories não são importados automaticamente.'};
});

ipcMain.handle('app:boot',()=>({settings,history:Array.from(tasks.values()).map(x=>({...x,cancel:undefined})),hasYtDlp:!!resolveBinary(),platform:process.platform}));
ipcMain.handle('app:inspect',async(_e,url)=>inspect(url));
ipcMain.handle('app:profile',async(_e,username)=>inspectProfile(username));
ipcMain.handle('app:folder',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory']});return r.canceled?null:r.filePaths[0];});
ipcMain.handle('app:settings',(_e,newSettings)=>{
  const next={...settings};
  if(newSettings&&typeof newSettings.folder==='string'&&fs.existsSync(newSettings.folder)&&fs.statSync(newSettings.folder).isDirectory())next.folder=newSettings.folder;
  if(['auto','video','audio'].includes(newSettings?.mode))next.mode=newSettings.mode;
  if(['best','1080','720','480'].includes(newSettings?.quality))next.quality=newSettings.quality;
  settings=next;saveJson(storePath(),settings);return settings;
});
ipcMain.handle('app:enqueue-batch',(_e,urls)=>{
 if(!Array.isArray(urls)||urls.length===0||urls.length>100)throw new Error('Selecione entre 1 e 100 mídias.');
 if(!resolveBinary())throw new Error('Instale o yt-dlp para habilitar downloads.');
 const folder=settings.folder;
 if(!fs.existsSync(folder)||!fs.statSync(folder).isDirectory())throw new Error('Pasta de destino não existe.');
 const links=urls.map(url=>parseInstagramLink(url));
 if(links.some(x=>!['reel','publicação','story','destaque'].includes(x.type)))throw new Error('Selecione links diretos de mídias, não perfis.');
 const added=[];
 const unique=new Set();
 for(const link of links){
   if(unique.has(link.url))continue;unique.add(link.url);
   const t={id:require('node:crypto').randomUUID(),url:link.url,type:link.type,mode:settings.mode,quality:settings.quality,folder,status:'queued',percent:0,files:[],createdAt:Date.now(),message:''};
   tasks.set(t.id,t);queue.push(t.id);added.push({...t});
 }
 added.forEach(emitTask);trimHistory();setImmediate(tick);return added;
});
ipcMain.handle('app:enqueue',(_e,payload)=>{
  if(!payload||typeof payload.url!=='string')throw new Error('Link obrigatório.');
  const {url,type}=parseInstagramLink(payload.url);
  if(!resolveBinary())throw new Error('Instale o yt-dlp para habilitar downloads.');
  const folder=settings.folder;
  if(!fs.existsSync(folder)||!fs.statSync(folder).isDirectory())throw new Error('Pasta de destino não existe.');
  const t={id:require('node:crypto').randomUUID(),url,type,mode:settings.mode,quality:settings.quality,folder,status:'queued',percent:0,files:[],createdAt:Date.now(),message:''};
  tasks.set(t.id,t);queue.push(t.id);emitTask(t);trimHistory();setImmediate(tick);return t;
});
ipcMain.handle('app:cancel',(_e,id)=>{const t=tasks.get(id);if(!t)return false;if(t.status==='queued'){t.status='cancelled';emitTask(t);trimHistory();return true;}if(t.status==='downloading'&&t.cancel){t.cancel();return true;}return false;});
ipcMain.handle('app:clear',()=>{for(const [id,t] of tasks.entries())if(!['queued','downloading'].includes(t.status))tasks.delete(id);trimHistory();return Array.from(tasks.values());});
ipcMain.handle('app:open-folder',async(_e,folder)=>{const valid=[settings.folder,...Array.from(tasks.values()).map(t=>t.folder)];if(typeof folder!=='string'||!valid.includes(folder))throw new Error('Pasta não autorizada.');return shell.openPath(folder);});
ipcMain.handle('app:external',async(_e,url)=>{if(url==='https://github.com/yt-dlp/yt-dlp/releases/latest')await shell.openExternal(url);});
ipcMain.handle('app:diagnostics',async()=>{
 const binary=resolveBinary();if(!binary)return {binary:null,version:null,ffmpeg:false};
 try{const v=await runProcess(binary,['--version'],{timeoutMs:10000});return{binary,version:v.stdout.trim(),ffmpeg:!!require('node:child_process').spawnSync(process.platform==='win32'?'where':'which',['ffmpeg'],{timeout:1500}).stdout?.length};}
 catch(e){return {binary,error:e.message};}
});

ipcMain.handle('app:update-extractor',async()=>{if(running)throw new Error('Finalize o download em andamento antes de atualizar.');return updateExtractor();});

ipcMain.handle('update:one-click',async()=>{
 if(!app.isPackaged || process.platform!=='win32')throw new Error('Instale a versão Windows do Stories Hunter para atualizar.');
 if(oneClickUpdating || ['checking','downloading'].includes(updateState.status))throw new Error('Uma atualização já está sendo verificada.');
 if(Array.from(tasks.values()).some(t=>['queued','downloading'].includes(t.status)))throw new Error('Finalize ou cancele os downloads antes de atualizar.');
 oneClickUpdating=true;
 try{await autoUpdater.checkForUpdates();return updateState;}catch(err){oneClickUpdating=false;throw err;}
});
ipcMain.handle('update:state',()=>updateState);
ipcMain.handle('update:check',async()=>{
 if(!app.isPackaged){reportUpdate({status:'development',message:'Atualizações automáticas só funcionam no instalador Windows, não no npm start.'});return updateState;}
 if(process.platform!=='win32'){reportUpdate({status:'unsupported',message:'Atualizações disponíveis apenas no Windows.'});return updateState;}
 await autoUpdater.checkForUpdates();return updateState;
});
ipcMain.handle('update:download',async()=>{if(updateState.status!=='available')throw new Error('Verifique se há atualização primeiro.');await autoUpdater.downloadUpdate();return updateState;});
ipcMain.handle('update:install',()=>{if(updateState.status!=='ready')throw new Error('Nenhuma atualização pronta.');setImmediate(()=>autoUpdater.quitAndInstall(false,true));return true;});
