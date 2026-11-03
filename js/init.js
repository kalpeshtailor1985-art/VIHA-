/* ========================= APP INIT, SERVICE WORKER, KATEX, IMAGE COMPRESSOR =========================
   Loaded LAST (after app.js) so every function it calls already exists. */

window.addEventListener('DOMContentLoaded', async () => {
  const safe = async (name, fn) => {
    try { await fn(); } catch (err) { console.error('[init] ' + name + ' failed:', err); }
  };

  await safe('preloadBigStore', () => typeof preloadBigStore === 'function' && preloadBigStore());
  await safe('loadStorageData', () => loadStorageData());
  await safe('hardenLocalRegistry', () => hardenLocalRegistry());
  await safe('applyAuthModeUI', () => applyAuthModeUI());
  await safe('initSubjectDropdowns', () => initSubjectDropdowns());
  await safe('initFirebaseCloud', () => initFirebaseCloud());
  await safe('loadCatalog', () => loadCatalog());
  await safe('loadPersistentImages', () => loadPersistentImages());
  await safe('checkCachedSession', () => checkCachedSession());
  await safe('renderLivePaper', () => renderLivePaper());
  await safe('filterQuestionBank', () => filterQuestionBank());
  if (window.lucide && lucide.createIcons) lucide.createIcons();

  window.__KTM_INIT_DONE = true;     // start-up finished (used by the start-up check bar)

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service Worker registration skipped/failed:', err);
    });
  }
});

/* 1. Auto-render KaTeX ($...$ / $$...$$) whenever the page content changes */
document.addEventListener('DOMContentLoaded', () => {
  let busy = false;
  const mainEl = document.querySelector('main');
  if (!mainEl) return;
  const observer = new MutationObserver(() => {
    if (busy || typeof renderMathInElement !== 'function') return;
    busy = true;                       // avoid an endless loop: KaTeX itself changes the DOM
    observer.disconnect();
    try {
      renderMathInElement(mainEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    } catch (e) { console.warn('KaTeX render skipped:', e); }
    observer.observe(mainEl, { childList: true, subtree: true });
    busy = false;
  });
  observer.observe(mainEl, { childList: true, subtree: true });
});

/* 2. Shrink very large base64 PNG diagrams to a small WebP (question figures only) */
document.addEventListener('load', (e) => {
  const t = e.target;
  if (!t || t.tagName !== 'IMG' || !t.src || !t.src.startsWith('data:image/png')) return;
  if (t.dataset.compressed || t.closest('#app-logo-wrap, [data-keep-original]') || t.id === 'app-logo') return;
  if (t.src.length < 60000) return;     // small images are left alone (logo, avatar, icons)
  try {
    const MAX_W = 480;
    const w0 = t.naturalWidth || MAX_W, h0 = t.naturalHeight || 300;
    const scale = Math.min(1, MAX_W / w0);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w0 * scale);
    canvas.height = Math.round(h0 * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(t, 0, 0, canvas.width, canvas.height);
    t.dataset.compressed = '1';
    t.src = canvas.toDataURL('image/webp', 0.8);
  } catch (err) { console.warn('Image compress skipped:', err); }
}, true);
