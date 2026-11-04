'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const invoke=(event,...args)=>ipcRenderer.invoke(event,...args);
contextBridge.exposeInMainWorld('hunter',Object.freeze({
 boot:()=>invoke('app:boot'),inspect:url=>invoke('app:inspect',url),profile:user=>invoke('app:profile',user),instagramLogin:()=>invoke('instagram:login'),instagramOpenProfile:user=>invoke('instagram:profile',user),instagramVisibleLinks:()=>invoke('instagram:visible-links'),enqueueBatch:urls=>invoke('app:enqueue-batch',urls),chooseFolder:()=>invoke('app:folder'),
 saveSettings:s=>invoke('app:settings',s),enqueue:url=>invoke('app:enqueue',{url}),cancel:id=>invoke('app:cancel',id),
 clearHistory:()=>invoke('app:clear'),openFolder:path=>invoke('app:open-folder',path),
 openDependency:()=>invoke('app:external','https://github.com/yt-dlp/yt-dlp/releases/latest'),diagnostics:()=>invoke('app:diagnostics'),updateExtractor:()=>invoke('app:update-extractor'),
 updateState:()=>invoke('update:state'),oneClickUpdate:()=>invoke('update:one-click'),checkUpdate:()=>invoke('update:check'),downloadUpdate:()=>invoke('update:download'),installUpdate:()=>invoke('update:install'),
 onUpdate:fn=>{const handler=(_ev,state)=>fn(state);ipcRenderer.on('update:status',handler);return()=>ipcRenderer.removeListener('update:status',handler);},
 onTask:fn=>{const handler=(_ev,task)=>fn(task);ipcRenderer.on('task:update',handler);return()=>ipcRenderer.removeListener('task:update',handler);}
}));
