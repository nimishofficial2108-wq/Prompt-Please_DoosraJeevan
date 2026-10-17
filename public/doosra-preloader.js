/* Cross-app preloader. No artificial loading delay and no backend data passed to this script. */
(() => {
  'use strict';
  const currentPath = location.pathname;
  const isNeuro = currentPath.startsWith('/modules/neuro');
  const isOrgan = currentPath.startsWith('/modules/organ');
  const moduleName = isNeuro ? 'NeuroScan' : isOrgan ? 'Organ Donation' : '';
  let overlay = null;
  let timer = null;
  let watcher = null;
  let dismissed = false;

  function createLoader(name) {
    if (overlay && overlay.isConnected) return overlay;
    overlay = document.createElement('section');
    overlay.id = 'dj-loading-screen';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', `Opening ${name}`);
    overlay.innerHTML = `
      <div class="dj-loading-content">
        <div class="dj-loading-mark" aria-hidden="true">
          <svg viewBox="0 0 60 60" fill="none">
            <circle cx="21" cy="8" r="4.5" fill="#ff6255"/><circle cx="39" cy="8" r="4.5" fill="#ff6255"/>
            <path d="M30 51.5 12.2 34.5C1.4 24.3 8.6 12.8 19.4 15.9c4.8 1.4 8 4.8 10.6 8.4 2.6-3.6 5.8-7 10.6-8.4 10.8-3.1 18 8.4 7.2 18.6L30 51.5Z" stroke="#ff6255" stroke-width="5.5" stroke-linejoin="round"/>
            <path d="m23 35 5 5 10-12" stroke="#3981bb" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1 class="dj-loading-wordmark">DoosraJeevan</h1>
        <p class="dj-loading-module">Opening ${name}</p>
        <div class="dj-loading-progress" aria-hidden="true"></div>
        <p class="dj-loading-help">Preparing your workspace…</p>
        <div class="dj-loading-error" role="alert">
          <p>We couldn't open ${name}. Check that all project services are running.</p>
          <div class="dj-loader-actions"><button type="button" id="dj-loader-retry">Retry</button><a href="/">Back to Home</a></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#dj-loader-retry').addEventListener('click', () => location.reload());
    return overlay;
  }

  function finish() {
    if (dismissed) return;
    dismissed = true;
    if (timer) clearTimeout(timer);
    if (watcher) watcher.disconnect();
    if (!overlay) return;
    overlay.classList.add('dj-hidden');
    overlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => overlay && overlay.remove(), 360);
  }

  function ready() {
    if (isNeuro) return Boolean(document.querySelector('#root .dj-neuro-workstation') && document.querySelector('#root .dj-workspace-header'));
    if (isOrgan) return Boolean(window.app && document.querySelector('.app-shell'));
    return true;
  }

  function beginModuleLoading() {
    createLoader(moduleName);
    if (ready()) { finish(); return; }
    watcher = new MutationObserver(() => { if (ready()) finish(); });
    watcher.observe(document.documentElement, {childList: true, subtree: true});
    timer = setTimeout(() => {
      if (ready()) { finish(); return; }
      if (watcher) watcher.disconnect();
      overlay?.classList.add('dj-error');
      overlay?.setAttribute('role', 'alert');
    }, 18000);
    // The organ app can initialize after the static DOM has stopped changing.
    if (isOrgan) {
      const poll = setInterval(() => { if (dismissed) return clearInterval(poll); if (ready()) { clearInterval(poll); finish(); } }, 180);
      setTimeout(() => clearInterval(poll), 19000);
    }
  }

  // Shared transition from homepage or from either module.
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const href = new URL(link.href, location.href);
    if (href.origin !== location.origin || href.pathname === location.pathname) return;
    if (!['/', '/modules/neuro/', '/modules/organ/'].includes(href.pathname)) return;
    event.preventDefault();
    const name = href.pathname.includes('neuro') ? 'NeuroScan' : href.pathname.includes('organ') ? 'Organ Donation' : 'Home';
    dismissed = false;
    createLoader(name);
    // Permit a paint of the loader before navigation.
    requestAnimationFrame(() => requestAnimationFrame(() => location.assign(href.href)));
  }, true);

  window.addEventListener('pageshow', (event) => {
    if (event.persisted && overlay) finish();
  });

  if (isNeuro || isOrgan) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', beginModuleLoading, {once:true});
    else beginModuleLoading();
  }
})();
