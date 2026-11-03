/* ========================= CATALOG ("what exists") + GUEST PREVIEW =========================
   1. CATALOG  - a small public list published by the admin: which Standard + Subject has questions and which chapters it has.
                 Standards / subjects with NO questions show a padlock and a "Coming Soon" badge and cannot be bought.
   2. GUEST    - "Continue as Guest" opens ONLY the first two chapters of every Standard + Subject. Other chapters show a padlock.
                 The guest data is a public copy (guestdemo) of chapters 1-2 only, so the paid question bank stays protected.
   Both are published automatically by the admin session (and with the button in the UPI Payments tab). */

const GUEST_FREE_CHAPTERS = 2;
state.isGuest = false;
state.catalog = null;

/* ---------- helpers ---------- */
function chapterRank(name) {
  const m = String(name || '').match(/(?:ch|chapter|પ્રકરણ)?\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : 99999;
}
function sortChapters(names) {
  return names.slice().sort((a, b) => {
    const d = chapterRank(a) - chapterRank(b);
    return d !== 0 ? d : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  });
}
function keyOfPair(std, sub) {
  return subjectKey(accessName(std, std === 'GUJCET' ? plainGujcetSubject(sub) : sub));
}
const SOON_BADGE_HTML = '<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-300 text-slate-900 font-black text-[10px] whitespace-nowrap">🔒 COMING SOON</span>';

/* does this Standard + Subject have at least one question?  (admin: live count; others: public catalog) */
function pairHasQuestions(std, sub) {
  if (!std || std === 'ALL' || !sub || sub === 'ALL') return true;
  const key = keyOfPair(std, sub);
  const local = (state.questions || []).some(q => folderKeyFor(q, 'subject') === key);
  if (local) return true;
  if (typeof isAdminCloud === 'function' && isAdminCloud()) return false;
  const cat = state.catalog;
  if (cat && cat._published) return !!(cat[key] && cat[key].n > 0);
  return true;                           // catalog not published / not loaded yet: never hide anything by mistake
}
function stdHasQuestions(std) {
  if (!std || std === 'ALL') return true;
  return (GSEB_SUBJECTS[std] || []).some(sub => pairHasQuestions(std, sub));
}

/* ---------- Standard drop-downs: "Std 9  🔒 Coming Soon" when the whole Standard is empty ---------- */
function decorateStdOptions(selId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  Array.from(sel.options).forEach(o => {
    if (o.value === 'ALL') return;
    if (o.dataset.base === undefined) o.dataset.base = o.textContent;
    o.textContent = o.dataset.base + (stdHasQuestions(o.value) ? '' : '  🔒 Coming Soon');
  });
}

/* ---------- admin: publish catalog + guest preview ---------- */
function buildCatalogData() {
  const groups = {};
  const get = k => (groups[k] = groups[k] || { n: 0, q: [], rows: [], names: [] });
  (state.questions || []).forEach(q => { const k = folderKeyFor(q, 'subject'); if (KEY_TO_ITEM[k]) { const g = get(k); g.n++; g.q.push(q); } });
  (state.blueprintRows || []).forEach(r => { const k = folderKeyFor(r, 'sub'); if (KEY_TO_ITEM[k] && !r.locked) { const g = get(k); g.rows.push(r); g.names.push(r.name); } });
  const catalog = {}, demoQ = {}, demoR = {};
  Object.keys(groups).forEach(k => {
    const g = groups[k];
    if (!g.n) return;                                         // no questions = Coming Soon (not listed)
    const names = g.names.slice();
    g.q.forEach(q => { const c = String(q.chapter || '').trim(); if (c && !names.some(n => chapterMatches(n, c))) names.push(c); });
    const chapters = sortChapters(Array.from(new Set(names)));
    catalog[k] = { n: g.n, ch: chapters, cq: chapters.map(c => g.q.filter(q => chapterMatches(q.chapter, c)).length) };
    const free = chapters.slice(0, GUEST_FREE_CHAPTERS);
    const dq = {}, dr = {};
    g.q.forEach(q => { if (free.some(c => chapterMatches(q.chapter, c))) dq[q.id] = q; });
    g.rows.forEach(r => { if (free.some(c => chapterMatches(r.name, c))) dr[r.id] = r; });
    if (Object.keys(dq).length) demoQ[k] = dq;
    if (Object.keys(dr).length) demoR[k] = dr;
  });
  // exact totals straight from the Question Bank, so the running line always matches it
  const total = (state.questions || []).length;
  const listed = Object.keys(catalog).reduce((sum, k) => sum + catalog[k].n, 0);
  catalog._total = total;                                     // every question in the bank (General + GUJCET + Previous Year)
  catalog._other = Math.max(0, total - listed);               // questions whose Standard / Subject is not set yet
  return { catalog, demoQ, demoR };
}
/* same text for the same data, whatever the key order (Firebase returns keys sorted) */
function canonJson(v) {
  if (Array.isArray(v)) return '[' + v.map(canonJson).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonJson(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function quickSig(text) {
  let h = 5381; for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return text.length + ':' + h;
}
let _catTimer = null;
function scheduleCatalogPublish() {
  if (typeof isAdminCloud !== 'function' || !isAdminCloud() || !firebaseDb) return;
  clearTimeout(_catTimer);
  _catTimer = setTimeout(() => publishCatalog(false), 15000);   // wait until the admin stops editing / syncing
}
async function publishCatalog(manual) {
  if (typeof isAdminCloud !== 'function' || !isAdminCloud() || !firebaseDb) {
    if (manual) alert('Sign in with your admin (Firebase) account first.');
    return;
  }
  try {
    const { catalog, demoQ, demoR } = buildCatalogData();
    const old = safeParse('KTM_CATALOG_SIG', {}) || {};
    const sig = {}, upd = {};
    const catSig = quickSig(JSON.stringify(catalog));
    sig._cat = catSig;
    const keys = new Set([...Object.keys(demoQ), ...Object.keys(demoR), ...Object.keys(old).filter(k => k !== '_cat')]);
    let changedKeys = 0;
    keys.forEach(k => {
      const s = (demoQ[k] || demoR[k]) ? quickSig(JSON.stringify([demoQ[k] || null, demoR[k] || null])) : null;
      if (s) sig[k] = s;
      if (s !== (old[k] || null)) { upd['guestdemo/q/' + k] = demoQ[k] || null; upd['guestdemo/r/' + k] = demoR[k] || null; changedKeys++; }
    });
    let liveSame = false;                                      // is the catalog in the database already exactly this?
    if (state.catalog && state.catalog._published) {
      const live = Object.assign({}, state.catalog); delete live._published;
      liveSame = canonJson(live) === canonJson(JSON.parse(JSON.stringify(catalog)));
    }
    const catChanged = catSig !== old._cat || !liveSame;
    if (!catChanged && !changedKeys) { if (manual) alert('Catalog and guest preview are already up to date.'); return; }
    if (catChanged) { const out = Object.assign({}, catalog, { _published: Date.now() }); await firebaseDb.ref('catalog').set(out); state.catalog = out; }
    if (changedKeys) await firebaseDb.ref().update(upd);
    safeSet('KTM_CATALOG_SIG', sig);
    if (typeof refreshComingSoon === 'function') refreshComingSoon();
    if (manual) alert(`Published.\n\nQuestions in the bank: ${catalog._total}\nStandard + Subject pairs with questions: ${Object.keys(catalog).filter(k => k.charAt(0) !== '_').length}\nGuest preview updated for: ${changedKeys} pair(s)`);
  } catch (e) {
    if (manual) alert('Could not publish: ' + (e && e.message) + '\n\nCheck that the latest database.rules.json is published.');
    else console.warn('Catalog publish skipped:', e && e.message);
  }
}

/* ---------- everybody: read the public catalog ---------- */
function loadCatalog() {
  if (!firebaseDb || state._catListening) return;
  state._catListening = true;
  firebaseDb.ref('catalog').on('value', snap => {
    state.catalog = snap.val() || null;
    renderGateTicker();
    if (typeof refreshComingSoon === 'function') refreshComingSoon();
    const box = document.getElementById('my-subjects-list');
    if (box && box.offsetParent && typeof renderMySubjects === 'function') renderMySubjects();
    if (typeof renderMatrixTable === 'function') renderMatrixTable();
  }, err => { state._catListening = false; console.warn('Catalog not readable:', err && err.message); });
}

/* ---------- guest ---------- */
function isGuestChapterLocked(std, sub, chapterName) {
  if (!state.isGuest) return false;
  const e = state.catalog && state.catalog[keyOfPair(std, sub)];
  const list = e && e.ch ? sortChapters(e.ch) : [];
  if (!list.length) return false;
  return !list.slice(0, GUEST_FREE_CHAPTERS).some(c => chapterMatches(c, chapterName));
}

function guestZeroRow(item, name, i, locked) {
  const row = { id: 'guest-' + item.key + '-' + i, std: item.std, sub: item.subject, name, locked: !!locked };
  ['m1', 'm2', 'm3', 'm4', 'c1', 'c2'].forEach(m => { row[m + '_wo'] = 0; row[m + '_with'] = 0; });
  return row;
}

async function loadGuestDemo() {
  if (!firebaseDb) { alert('The guest preview needs an internet connection and a configured database.'); return; }
  try {
    const [q, r, c] = await Promise.all([
      firebaseDb.ref('guestdemo/q').once('value'),
      firebaseDb.ref('guestdemo/r').once('value'),
      firebaseDb.ref('catalog').once('value')
    ]);
    state.catalog = c.val() || state.catalog || null;
    const questions = [], rows = [];
    const qv = q.val() || {}, rv = r.val() || {};
    Object.keys(qv).forEach(k => { const it = KEY_TO_ITEM[k]; Object.values(qv[k] || {}).forEach(x => { if (x && typeof x === 'object') { if (it) { x.std = it.std; x.subject = it.subject; } questions.push(x); } }); });
    Object.keys(rv).forEach(k => { const it = KEY_TO_ITEM[k]; Object.values(rv[k] || {}).forEach(x => { if (x && typeof x === 'object') { if (it) { x.std = it.std; x.sub = it.subject; } rows.push(x); } }); });
    // every other chapter is listed with a padlock
    const cat = state.catalog || {};
    Object.keys(cat).forEach(k => {
      const it = KEY_TO_ITEM[k]; if (!it || !cat[k] || !cat[k].ch) return;
      sortChapters(cat[k].ch).forEach((name, i) => {
        const have = rows.some(x => x.std === it.std && x.sub === it.subject && chapterMatches(x.name, name));
        if (i < GUEST_FREE_CHAPTERS) { if (!have) rows.push(guestZeroRow(it, name, i, false)); }
        else if (!have) rows.push(guestZeroRow(it, name, i, true));
      });
    });
    if (!questions.length && !rows.length) alert('The guest preview is empty. The admin must open UPI Payments > Publish now (and publish the latest database rules in Firebase).');
    state.questions = questions;
    state.blueprintRows = rows;
    state.livePaperQuestions = [];
    if (typeof updateQuestionCountBadge === 'function') updateQuestionCountBadge();
    if (typeof filterQuestionBank === 'function') filterQuestionBank();
    if (typeof renderMatrixTable === 'function') renderMatrixTable();
    if (typeof renderLivePaper === 'function') renderLivePaper();
    if (typeof refreshComingSoon === 'function') refreshComingSoon();
  } catch (e) {
    alert('Could not load the guest preview: ' + (e && e.message) + '\n\nThe admin must publish the latest database rules and click Publish now (UPI Payments tab).');
  }
}

function startGuestSession() {
  try { startGuestSessionInner(); }
  catch (e) {
    state.isGuest = false; state.guestStarting = false; document.body.classList.remove('guest-mode');
    console.error(e); if (window.ktReport) window.ktReport(e);
    alert('Guest mode could not start: ' + (e && e.message));
  }
}
function startGuestSessionInner() {
  state.isGuest = true;
  state.guestStarting = true;
  state.cloudUser = null;
  document.body.classList.add('guest-mode');
  try { completeLoginSuccess({ email: 'guest@guest.local', displayName: 'GUEST (Chapters 1-2)', role: 'Guest Access' }); }
  finally { state.guestStarting = false; }
  switchTab('tab-qbank');
  startGuestLockObserver();
  loadGuestDemo();
}

/* ================= GUEST = VIEW ONLY =================
   A guest can look at the first two chapters in the Question Bank and in the Blueprint matrix. Nothing else:
   every other tab, button, form and menu shows a padlock and asks the guest to sign in. */
const GUEST_TABS = ['tab-qbank', 'tab-blueprint'];
const GUEST_ALLOWED_CALLS = ['switchBankType', 'filterQuestionBank', 'toggleMarksFilter', 'toggleChapterFilter', 'renderChapterFilterList',
  'syncSubjectDropdown', 'renderMatrixTable', 'applyMatrixSelectorFilter', 'setMatrixMode', 'toggleSidebar', 'handleSignOutAction', 'guestLoginPrompt'];

function guestHandlerAllowed(code) {
  const c = String(code || '').trim();
  if (!c) return true;
  const tab = c.match(/^switchTab\('([^']+)'\)/);
  if (tab) return GUEST_TABS.includes(tab[1]);
  const m = c.match(/^(?:return\s+)?([A-Za-z_$][\w$.]*)\s*\(/);
  if (!m) return false;
  return m[1].startsWith('event.') || GUEST_ALLOWED_CALLS.includes(m[1]);
}

let _guestPromptBusy = false;
function guestLoginPrompt() {
  if (_guestPromptBusy) return;
  _guestPromptBusy = true; setTimeout(() => { _guestPromptBusy = false; }, 600);
  if (confirm('🔒 This opens after you sign in.\n\nAs a guest you can only view Chapter 1 and Chapter 2.\n\nGo to the sign-in window now?')) {
    localStorage.removeItem(APP_AUTH_CACHE_KEY);
    location.reload();
  }
}

/* capture phase: stop any inline handler a guest is not allowed to use */
function guestBlockEvent(e) {
  if (!state.isGuest) return;
  const t = e.target;
  if (!t || !t.closest || t.closest('#auth-gate')) return;
  const attr = 'on' + e.type;
  const el = t.closest('[' + attr + ']');
  if (!el) return;
  if (guestHandlerAllowed(el.getAttribute(attr))) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.type === 'click') guestLoginPrompt();
}
['click', 'change', 'input', 'keyup'].forEach(ev => document.addEventListener(ev, guestBlockEvent, true));

/* show padlocks on everything a guest cannot use */
function tagGuestBlocked() {
  if (!state.isGuest) return;
  document.querySelectorAll('#tab-qbank, #tab-blueprint, #app-sidebar').forEach(root => {
    root.querySelectorAll('[onclick],[onchange],[oninput]').forEach(el => {
      const code = el.getAttribute('onclick') || el.getAttribute('onchange') || el.getAttribute('oninput');
      if (guestHandlerAllowed(code)) return;
      el.classList.add('guest-blocked');
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.disabled = true;
      if (!el.title) el.title = 'Sign in to use this';
    });
  });
}
let _guestObs = null, _guestTagQueued = false;
function startGuestLockObserver() {
  tagGuestBlocked();
  if (_guestObs) return;
  _guestObs = new MutationObserver(() => {
    if (_guestTagQueued) return;
    _guestTagQueued = true;
    requestAnimationFrame(() => { _guestTagQueued = false; tagGuestBlocked(); });
  });
  document.querySelectorAll('#tab-qbank, #tab-blueprint, #app-sidebar').forEach(r => _guestObs.observe(r, { childList: true, subtree: true }));
}

/* ---------- Question Bank helpers (guest padlocks + Coming Soon card) ---------- */
function emptyBankHtml(stdVal, subVal) {
  const pairStd = state.currentBankType === 'GUJCET' ? 'GUJCET' : stdVal;
  if (stdVal !== 'ALL' && subVal !== 'ALL' && !pairHasQuestions(pairStd, subVal)) {
    return `<div class="p-8 text-center space-y-2"><div class="text-2xl">🔒</div>${SOON_BADGE_HTML}<p class="text-xs text-slate-500">Questions for <b>${escapeHtml(pairStd)} | ${escapeHtml(subVal)}</b> will be added soon.</p></div>`;
  }
  return '<div class="p-8 text-center text-slate-400 text-xs">No matching questions in bank.</div>';
}

/* guest: every chapter after chapter 2 is listed with a padlock (click = sign in) */
function appendGuestLockedChapters(container, stdVal, subVal, show) {
  if (!state.isGuest || !container) return;
  if (stdVal === 'ALL' || subVal === 'ALL') {
    container.insertAdjacentHTML('beforeend', '<div class="p-3 text-center text-[11px] text-slate-500 bg-slate-50">🔒 Choose a Standard and a Subject to see which chapters are locked. Chapters after Chapter 2 open after you sign in.</div>');
    return;
  }
  if (!show) return;
  const e = state.catalog && state.catalog[keyOfPair(stdVal, subVal)];
  if (!e || !e.ch) return;
  const sorted = sortChapters(e.ch);
  sorted.forEach((name, i) => {
    if (i < GUEST_FREE_CHAPTERS) return;
    const orig = e.ch.indexOf(name);
    const cnt = e.cq && e.cq[orig] != null ? e.cq[orig] : null;
    container.insertAdjacentHTML('beforeend', `<div onclick="guestLoginPrompt()" class="p-4 flex items-center justify-between gap-3 bg-slate-50 hover:bg-amber-50 cursor-pointer">
      <div class="flex items-center gap-2 min-w-0"><span class="text-lg">🔒</span><div class="min-w-0"><div class="text-xs font-bold text-slate-700 truncate">${escapeHtml(name)}</div>
      <div class="text-[10px] text-slate-500">${cnt != null ? cnt + ' question' + (cnt === 1 ? '' : 's') + ' - ' : ''}opens after you sign in</div></div></div>
      <span class="px-2 py-1 rounded bg-yellow-300 text-slate-900 font-black text-[10px] whitespace-nowrap">SIGN IN TO OPEN</span></div>`);
  });
}

/* ---------- login window: running line of what is available ----------
   Every number comes from the public catalog the admin publishes, and the catalog is counted straight from the Question Bank:
   the first item is the total of the whole bank, then one item per Standard + Subject. The items always add up to the total. */
function renderGateTicker() {
  const box = document.getElementById('gate-ticker');
  const track = document.getElementById('gate-ticker-track');
  if (!box || !track) return;
  const cat = state.catalog;
  const items = [];
  const qs = n => n + (n === 1 ? ' Question' : ' Questions');
  if (cat && cat._published) {
    const pairs = [];
    Object.keys(GSEB_SUBJECTS).forEach(std => GSEB_SUBJECTS[std].forEach(sub => {
      const e = cat[keyOfPair(std, sub)];
      if (e && e.n > 0) pairs.push(`${std} · ${sub} (${qs(e.n)})`);
    }));
    const total = typeof cat._total === 'number' ? cat._total : pairs.length ? Object.keys(cat).reduce((a, k) => a + (cat[k] && cat[k].n > 0 ? cat[k].n : 0), 0) : 0;
    if (total > 0) items.push(`Total in Question Bank: ${qs(total)}`);
    pairs.forEach(t => items.push(t));
    if (cat._other > 0) items.push(`Standard not set yet (${qs(cat._other)})`);
  }
  if (!items.length) { box.classList.add('hidden'); track.innerHTML = ''; return; }
  const one = items.map(t => `<span class="mx-5">📚 ${escapeHtml(t)}</span>`).join('');
  track.innerHTML = one + one;                                  // twice = seamless loop
  track.style.animationDuration = Math.max(25, items.length * 6) + 's';
  box.classList.remove('hidden');
}
