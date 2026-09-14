// PWAとしてのService Worker登録のみを行う。既存のアプリロジックとは独立させている。
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((e) => {
      console.warn('Service Workerの登録に失敗しました:', e);
    });
  });
}
