'use strict';
const $=id=>document.getElementById(id);
const state={tasks:new Map(),settings:null,filter:'all',profileItems:[],selected:new Set()};
const text=(v)=>String(v??'');
function el(tag,cls,content){const node=document.createElement(tag);if(cls)node.className=cls;if(content!==undefined)node.textContent=text(content);return node;}
function toast(message){const t=$('toast');t.textContent=text(message);t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),4500);}
function bind(id,fn){$(id).addEventListener('click',fn);}
function show(view){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+view));document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===view));const titles={profiles:['Explorar perfis','Busque mídias disponíveis usando apenas o @usuário.'],home:['Visão geral','Explore e organize mídias públicas do Instagram.'],downloads:['Downloads','Gerencie transferências e acompanhe o progresso.'],history:['Histórico','Consulte registros salvos neste computador.'],settings:['Configurações','Personalize o aplicativo e verifique dependências.'],updates:['Atualizações','Instale novas versões sem substituir arquivos manualmente.']};$('pageTitle').textContent=titles[view][0];$('pageDescription').textContent=titles[view][1];render();if(view==='settings')diagnose();}
function statusText(t){return {queued:'Na fila',downloading:`Baixando ${Math.round(t.percent||0)}%`,completed:'Concluído',error:'Erro',cancelled:'Cancelado',interrompido:'Interrompido'}[t.status]||t.status;}
function formatDate(n){return new Date(n).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});}
function makeItem(t){const row=el('div','item'),icon=el('div','item-icon',t.type==='reel'?'▶':t.type==='story'?'◇':'▣'),body=el('div','item-main');const label=el('strong','',t.url);label.title=t.url;body.append(label,el('small','',`${t.type} · ${formatDate(t.createdAt)} · ${t.message||'Aguardando'}${t.speed?' · '+t.speed:''}`));if(t.status==='downloading'){const bar=el('div','progress'),fill=el('div');fill.style.width=Math.min(100,t.percent||0)+'%';bar.append(fill);body.append(bar);}const status=el('div','item-status '+t.status,statusText(t)),actions=el('div','item-actions');if(['queued','downloading'].includes(t.status)){const cancel=el('button','', 'Cancelar');cancel.onclick=()=>window.hunter.cancel(t.id).catch(e=>toast(e.message));actions.append(cancel);}if(t.status==='completed'){const folder=el('button','','Abrir pasta');folder.onclick=()=>window.hunter.openFolder(t.folder).catch(e=>toast(e.message));actions.append(folder);}row.append(icon,body,status,actions);return row;}
function fillList(id,tasks,limit){const root=$(id);root.replaceChildren();const list=limit?tasks.slice(0,limit):tasks;if(!list.length){const empty=el('div','empty'),ic=el('div','empty-icon','◌');empty.append(ic,el('div','',id==='recentList'?'Nenhuma atividade recente.':'Nenhum download nesta categoria.'));root.append(empty);return;}list.forEach(t=>root.append(makeItem(t)));}
function render(){const all=[...state.tasks.values()].sort((a,b)=>b.createdAt-a.createdAt);const active=all.filter(t=>['queued','downloading'].includes(t.status));$('queueCount').textContent=active.length;fillList('recentList',all,3);fillList('downloadList',all.filter(t=>state.filter==='all'||t.status===state.filter));fillList('historyList',all);}
async function inspect(){const url=$('urlInput').value.trim();if(!url){toast('Cole um link válido.');return;}$('inspectBtn').disabled=true;$('inspectBtn').textContent='Analisando...';$('inspection').classList.add('hidden');try{const v=await window.hunter.inspect(url);const box=$('inspection');box.replaceChildren();if(v.thumbnail&&/^https:\/\//.test(v.thumbnail)){const img=el('img');img.src=v.thumbnail;img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();box.append(img);}box.append(el('strong','',v.title),el('p','',`Tipo: ${v.link.type} · ${v.count} item(ns) · ${v.uploader||'Autor não informado'}`),el('p','','A mídia foi identificada. Use “Adicionar à fila” para salvar na pasta configurada.'));box.classList.remove('hidden');}catch(e){toast(e.message||'Não foi possível analisar o link.');}finally{$('inspectBtn').disabled=false;$('inspectBtn').textContent='◉   Analisar link';}}
async function enqueue(){try{const t=await window.hunter.enqueue($('urlInput').value.trim());state.tasks.set(t.id,t);render();toast('Download adicionado à fila.');show('downloads');}catch(e){toast(e.message);}}
async function diagnose(){const d=$('diagnostics');d.textContent='Verificando...';try{const r=await window.hunter.diagnostics();d.textContent=`yt-dlp: ${r.version||'não encontrado'}\nExecutável: ${r.binary||'não encontrado'}\nFFmpeg no PATH: ${r.ffmpeg?'Sim':'Não / não detectado'}${r.error?'\nErro: '+r.error:''}`;d.style.whiteSpace='pre-wrap';}catch(e){d.textContent=e.message;}}
async function start(){try{const boot=await window.hunter.boot();state.settings=boot.settings;for(const t of boot.history||[])state.tasks.set(t.id,t);$('folderInput').value=boot.settings.folder;$('modeSelect').value=boot.settings.mode;$('qualitySelect').value=boot.settings.quality;$('engineDot').classList.toggle('ready',boot.hasYtDlp);$('engineLabel').textContent=boot.hasYtDlp?'Extrator disponível':'Extrator não instalado';render();}catch(e){toast('Falha de inicialização: '+e.message);}}
window.hunter.onTask(t=>{state.tasks.set(t.id,t);render();});document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.go)));document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===b));render();}));
bind('pasteBtn',async()=>{try{$('urlInput').value=await navigator.clipboard.readText();}catch{toast('Use Ctrl+V para colar o link.');}});bind('inspectBtn',inspect);bind('downloadBtn',enqueue);$('urlInput').addEventListener('keydown',e=>{if(e.key==='Enter')inspect();});bind('openGlobalFolder',()=>window.hunter.openFolder(state.settings.folder).catch(e=>toast(e.message)));bind('clearBtn',async()=>{try{const list=await window.hunter.clearHistory();state.tasks=new Map(list.map(x=>[x.id,x]));render();toast('Histórico finalizado limpo.');}catch(e){toast(e.message);}});bind('chooseFolder',async()=>{const folder=await window.hunter.chooseFolder();if(folder)$('folderInput').value=folder;});bind('saveSettings',async()=>{try{state.settings=await window.hunter.saveSettings({folder:$('folderInput').value,mode:$('modeSelect').value,quality:$('qualitySelect').value});toast('Preferências salvas.');}catch(e){toast(e.message);}});bind('diagnoseBtn',diagnose);
bind('updateExtractorBtn',async()=>{
  const b=$('updateExtractorBtn');b.disabled=true;b.textContent='Baixando versão oficial...';
  try{const result=await window.hunter.updateExtractor();toast('yt-dlp atualizado para '+result.version);await diagnose();}
  catch(e){$('diagnostics').textContent='Falha na atualização: '+e.message;toast('Não foi possível atualizar o extrator.');}
  finally{b.disabled=false;b.textContent='↻ Atualizar yt-dlp';}
});bind('externalYt',()=>window.hunter.openDependency());start();

function renderUpdate(u){$('installedVersion').textContent='v'+u.version;$('updateStatus').textContent=u.message||u.status;$('updateProgress').style.width=(u.progress||0)+'%';$('downloadUpdateBtn').disabled=u.status!=='available';$('installUpdateBtn').disabled=u.status!=='ready';$('checkUpdateBtn').disabled=['checking','downloading'].includes(u.status);}
window.hunter.onUpdate(renderUpdate);
window.hunter.updateState().then(renderUpdate).catch(e=>toast(e.message));
bind('checkUpdateBtn',()=>window.hunter.checkUpdate().then(renderUpdate).catch(e=>toast(e.message)));
bind('downloadUpdateBtn',()=>window.hunter.downloadUpdate().then(renderUpdate).catch(e=>toast(e.message)));
bind('installUpdateBtn',()=>window.hunter.installUpdate().catch(e=>toast(e.message)));

function renderProfile(){
 const container=$('profileResults');container.replaceChildren();
 const items=state.profileItems;
 if(!items.length){container.append(el('div','empty','Nenhuma mídia com link direto disponível para seleção.'));return;}
 for(const item of items){
   const card=el('label','profile-media');
   const check=el('input');check.type='checkbox';check.checked=state.selected.has(item.url);
   check.addEventListener('change',()=>{if(check.checked)state.selected.add(item.url);else state.selected.delete(item.url);});
   if(item.thumbnail&&/^https:\/\//.test(item.thumbnail)){
     const img=el('img','profile-thumb');img.referrerPolicy='no-referrer';img.src=item.thumbnail;img.onerror=()=>img.remove();card.append(img);
   } else card.append(el('div','profile-placeholder','▣'));
   const caption=el('div','profile-caption');
   caption.append(el('strong','',item.title||'Mídia'),el('small','',item.type));
   card.append(check,caption);container.append(card);
 }
}
async function searchProfile(){
 const btn=$('profileSearchBtn'),input=$('profileInput').value.trim();
 if(!input){toast('Digite um @usuário do Instagram.');return;}
 btn.disabled=true;btn.textContent='Buscando...';
 $('profileStatus').textContent='Consultando as mídias disponíveis; isso depende do acesso permitido pelo Instagram.';
 state.profileItems=[];state.selected.clear();renderProfile();
 try{
   const result=await window.hunter.profile(input);
   state.profileItems=result.items||[];
   $('profileStatus').textContent='@'+result.profile.username+' · '+result.items.length+' mídias selecionáveis. '+result.warning;
   renderProfile();
 }catch(error){$('profileStatus').textContent=error.message||'Não foi possível consultar o perfil.';}
 finally{btn.disabled=false;btn.textContent='Buscar';}
}
bind('profileSearchBtn',searchProfile);
$('profileInput').addEventListener('keydown',e=>{if(e.key==='Enter')searchProfile();});
bind('profileSelectAllBtn',()=>{
 state.selected=new Set(state.profileItems.map(item=>item.url));renderProfile();
});
bind('profileDownloadBtn',async()=>{
 const urls=[...state.selected];if(!urls.length){toast('Selecione ao menos uma mídia disponível.');return;}
 try{const tasks=await window.hunter.enqueueBatch(urls);for(const task of tasks)state.tasks.set(task.id,task);render();toast(tasks.length+' mídia(s) adicionada(s) à fila.');show('downloads');}
 catch(error){toast(error.message);}
});
