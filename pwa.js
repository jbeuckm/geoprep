/* PWA plumbing: service worker registration, update toast, install button, iOS hint. */
(() => {
  'use strict';
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', async () => {
      try {
        // A first visit has no controller yet: installing the worker must not reload the page mid-game.
        // Updates never reload on their own either; the user picks when, via the toast.
        const hadController = !!navigator.serviceWorker.controller;
        const reg = await navigator.serviceWorker.register('sw.js');
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing; if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'activated' && hadController) showToast('A new version is ready.', 'Reload', () => location.reload());
          });
        });
      } catch (e) { console.warn('SW registration failed', e); }
    });
  }
  function showToast(text, btnLabel, onClick) {
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span>${text}</span>`;
    if (btnLabel) { const b = document.createElement('button'); b.textContent = btnLabel; b.onclick = () => { t.remove(); onClick && onClick(); }; t.appendChild(b); }
    const x = document.createElement('button'); x.textContent = '✕'; x.style.background = 'transparent'; x.style.color = 'inherit'; x.onclick = () => t.remove(); t.appendChild(x);
    document.body.appendChild(t);
    if (!btnLabel) setTimeout(() => t.remove(), 6000);
  }
  // Install button (Chromium browsers fire beforeinstallprompt; iOS needs the Share-sheet hint).
  let deferred = null;
  const btn = document.getElementById('installbtn');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; if (!standalone) btn.classList.add('show'); });
  window.addEventListener('appinstalled', () => { btn.classList.remove('show'); deferred = null; });
  btn.onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; btn.classList.remove('show'); };
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS && !standalone) {
    let shown = false; try { shown = localStorage.getItem('geodrill.ioshint') === '1'; } catch (e) {}
    if (!shown) { setTimeout(() => showToast('Add to Home Screen for full-screen, offline play: Share → Add to Home Screen.', null), 4000); try { localStorage.setItem('geodrill.ioshint', '1'); } catch (e) {} }
  }
})();
