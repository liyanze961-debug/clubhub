/* Public shell only. Credentials, API responses, rosters, and receipts are never cached. */
const VERSION = "62e8a0a8d9a4efde";
const FILES = ["index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png","assets/ActivityWorkbench-CZezq3FW.js","assets/ActivityWorkbench-DHnpZpX8.css","assets/AdminView-957ZtSTx.css","assets/AdminView-CG75kJ78.js","assets/AssistantBriefView-DikJk8AD.js","assets/AssistantBriefView-PjLVZCLR.css","assets/AssistantDeskView-Crax-CBv.js","assets/AssistantDeskView-D3svhmPs.css","assets/ChangePasswordView-DLDNWhGa.css","assets/ChangePasswordView-X6tzKjlX.js","assets/CheckInView-BaDuDzZF.css","assets/CheckInView-DTClMpw8.js","assets/ClubDetailView-CpJz_uzc.js","assets/ClubDetailView-D2PUm_Mm.css","assets/ClubListView-D0DHMtFY.css","assets/ClubListView-Dyz4UDiH.js","assets/DashboardView-CfPjau_G.css","assets/DashboardView-D9q22R0q.js","assets/FeedbackView-4WQtFmAz.css","assets/FeedbackView-BORdMyBw.js","assets/FinanceView-6VfDm9ws.css","assets/FinanceView-Dwrq_sTB.js","assets/HelpView-DV5Qstk3.js","assets/HelpView-sZJ5qTiV.css","assets/InstallView-B8Jc0prQ.css","assets/InstallView-C_1uobUB.js","assets/LoginView-D6eQdMvq.css","assets/LoginView-Dq18RqwI.js","assets/MyActivitiesView-CGl6WxeA.js","assets/MyActivitiesView-QD2KpI4o.css","assets/MyJoinApplicationsView-D_4fLx1F.js","assets/MyJoinApplicationsView-DjWbipok.css","assets/NotificationsView-Dq4nfoVg.css","assets/NotificationsView-MVRx6Qqf.js","assets/SearchView-B5ie6kb5.css","assets/SearchView-DxlLV_fS.js","assets/StaffAccountsView-Bad8lb0n.js","assets/StaffAccountsView-eGlkMQjw.css","assets/StudentsView-C0QSnd2D.js","assets/StudentsView-Dg1tobt7.css","assets/_plugin-vue_export-helper-BismYZHH.js","assets/assistant-download-8gp1QPIJ.js","assets/auth-B6K-Su2X.js","assets/browser-vEwCqlDU.js","assets/client-CeLQmLL5.js","assets/index-DmD77iTw.css","assets/index-Ds9lkM3c.js","assets/message-iBGrcweY.js","assets/runtime-dom.esm-bundler-DPEGK0s1.js","assets/url-DDh0tzlC.js","assets/useApi-BPuI6ZR9-BLmWciTK.js","assets/useUnsavedChanges-BGvUvFcG.js"];
const BASE = self.registration.scope;
const PREFIX = 'clubhub-shell-' + encodeURIComponent(new URL(BASE).pathname) + '-';
const CACHE = PREFIX + VERSION;
const ALLOWED = new Set(FILES.map(file => new URL(file, BASE).href));
const INDEX = new URL('index.html', BASE).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...ALLOWED])));
  // Updates wait until the user chooses to refresh or closes all old windows.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const owned = (await caches.keys()).filter(key => key.startsWith(PREFIX));
    const previous = owned.filter(key => key !== CACHE).slice(-1);
    await Promise.all(owned.filter(key => key !== CACHE && !previous.includes(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(BASE);
  if (request.method !== 'GET' || request.headers.has('Authorization') || url.origin !== scope.origin
      || url.pathname === '/api' || url.pathname.startsWith('/api/')
      || !url.pathname.startsWith(scope.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const shell = await (await caches.open(CACHE)).match(INDEX);
      if (shell) {
        const html = (await shell.text()).replace(/<html\b/i, '<html data-clubhub-offline="true"');
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-ClubHub-Offline': 'true' } });
      }
      return new Response('暂时离线，请连接网络后重新打开社团通。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
    return;
  }
  if (ALLOWED.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request)) || fetch(request)));
    return;
  }
  // Keep the previous release's already cached public chunks available to other open tabs.
  if (url.pathname.startsWith(scope.pathname + 'assets/') && !url.search) {
    event.respondWith((async () => {
      for (const key of (await caches.keys()).filter(key => key.startsWith(PREFIX))) {
        const cached = await (await caches.open(key)).match(request);
        if (cached) return cached;
      }
      return fetch(request);
    })());
  }
});
