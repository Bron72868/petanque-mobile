const CACHE_NAME = 'petanque-v26';
const MODEL_FILES = [
  'tree_default','tree_oak','tree_fat','tree_detailed','tree_palmTall','tree_palmBend',
  'tree_palmDetailedTall','tree_thin','tree_simple','rock_largeA','rock_largeB','rock_largeC',
  'rock_smallA','rock_smallB','flower_purpleA','flower_redA','flower_yellowA',
  'plant_bushLarge','grass_large'
].map(function(n){ return './models/nature/' + n + '.glb'; }).concat([
  'building-a','building-b','building-c','building-d','building-e','building-f',
  'building-skyscraper-a','building-skyscraper-b','building-skyscraper-c','building-skyscraper-d','building-skyscraper-e',
  'detail-parasol-a','detail-parasol-b'
].map(function(n){ return './models/city/' + n + '.glb'; })).concat(['./models/city/Textures/colormap.png']);
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore-compat.js',
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap'
].concat(MODEL_FILES);

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(PRECACHE_URLS.map(function(url){
        return cache.add(new Request(url, { mode: 'no-cors' })).catch(function(){ /* best effort */ });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){ return n !== CACHE_NAME; }).map(function(n){ return caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached) return cached;
      return fetch(event.request).then(function(response){
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        return response;
      }).catch(function(){
        if(event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
