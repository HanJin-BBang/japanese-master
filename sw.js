/* 네트워크 먼저: 인터넷이 되면 항상 최신 파일, 안 되면 저장해 둔 파일로 실행 */
const CACHE='japanese-master-v24';
const ASSETS=['./','./index.html','./talk.js','./course-ja.js','./kana.html','./kana.js','./strokes-1.js','./strokes-2.js','./strokes-3.js','./strokes-4.js','./strokes-5.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.endsWith('version.json'))return;
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request.url.split('?')[0],c))}return r})
    .catch(()=>caches.match(e.request.url.split('?')[0]).then(r=>r||caches.match('./index.html'))));
});
