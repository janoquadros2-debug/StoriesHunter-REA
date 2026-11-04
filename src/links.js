'use strict';
const ALLOWED_HOSTS = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com']);
const POST_PATH = /^\/(p|reel|reels|tv)\/[^/]+\/?$/i;
const PROFILE_PATH = /^\/[a-zA-Z0-9._]{1,30}\/?$/;
const STORY_PATH = /^\/stories\/[a-zA-Z0-9._]+(?:\/\d+)?\/?$/i;
const HIGHLIGHT_PATH = /^\/stories\/highlights\/\d+\/?$/i;
function parseInstagramLink(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Cole um link do Instagram.');
  let u;
  try { u = new URL(raw); } catch { throw new Error('URL inválida. Use https://www.instagram.com/...'); }
  if (u.protocol !== 'https:' || !ALLOWED_HOSTS.has(u.hostname.toLowerCase()) || u.username || u.password || u.port) {
    throw new Error('Somente links HTTPS oficiais do instagram.com são aceitos.');
  }
  const pathname = u.pathname.replace(/\/{2,}/g, '/');
  let type;
  if (POST_PATH.test(pathname)) type = /reel/i.test(pathname) ? 'reel' : 'publicação';
  else if (HIGHLIGHT_PATH.test(pathname)) type = 'destaque';
  else if (STORY_PATH.test(pathname)) type = 'story';
  else if (PROFILE_PATH.test(pathname)) type = 'perfil';
  else throw new Error('Formato não reconhecido. Use um link de publicação, reel, story, destaque ou perfil.');
  const safe = new URL('https://www.instagram.com' + pathname);
  return {url: safe.toString(), type};
}
module.exports = {parseInstagramLink};
