/**
 * Recursos de PWA: registro do service worker, instalação no dispositivo
 * e avisos de nova versão. A UI é atualizada via eventos customizados.
 */
const installBtn = document.getElementById('install-btn');
let deferredPrompt = null;

function broadcast(detail) {
  window.dispatchEvent(new CustomEvent('app:toast', { detail }));
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function showInstallButton() {
  if (!installBtn || isStandalone()) return;
  installBtn.hidden = false;
}

function hideInstallButton() {
  if (installBtn) installBtn.hidden = true;
}

function setupInstall() {
  if (!installBtn) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    showInstallButton();
  });

  if (isIos() && !isStandalone()) showInstallButton();

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      window.dispatchEvent(new CustomEvent('app:install-help'));
      return;
    }

    deferredPrompt.prompt();
    try {
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') hideInstallButton();
    } finally {
      deferredPrompt = null;
    }
  });

  window.addEventListener('appinstalled', () => {
    hideInstallButton();
    broadcast({
      type: 'success',
      title: 'Jogo instalado!',
      message: 'Jumanji: A Última Fase já está na sua tela inicial e abre em tela cheia.',
      timeout: 6000
    });
  });
}

function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            broadcast({
              type: 'info',
              title: 'Nova versão disponível',
              message: 'Recarregue a página para entrar na versão mais recente da aventura.',
              timeout: 9000
            });
          }
        });
      });

      if (registration.waiting) {
        broadcast({
          type: 'info',
          title: 'Atualização pronta',
          message: 'Recarregue a página para aplicar a nova versão.',
          timeout: 9000
        });
      }
    } catch (error) {
      console.warn('[pwa] não foi possível registrar o service worker:', error);
    }
  });
}

export function initPWA() {
  setupServiceWorker();
  setupInstall();
}
