// 最小限のService Worker。
// PWAとしての体裁を整えるためだけに登録しており、オフラインキャッシュは意図的に行わない。
// Supabase家族共有を使うアプリのため、古いキャッシュを誤って表示するリスクを避けている。

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // キャッシュせず、常にネットワークへそのまま流す
  event.respondWith(fetch(event.request));
});
