/* ========================= SIGN-UP PLAN  +  MY ACCOUNT BUTTON =========================
   1. "New? Sign Up": the teacher picks a Standard, a Medium and one or more Subjects.
      Amount = SUB_CONFIG.priceINR x number of subjects  (1 subject = 150, 2 subjects = 300 ...).
      The choice is saved on the teacher's record (users/{uid}: std, medium, want) and shown again on the pay window after the first sign-in.
   2. The payment is ONE request of kind "bundle"; when the administrator approves it, every chosen subject is unlocked for 1 year.
   3. Sidebar: teachers / staff get a separate button with their own name (opens "My Account").
      The administrator's name in the sidebar header is fixed (ADMIN_DISPLAY_NAME in js/state.js).
   Everything is inside one function so no name can clash with the other scripts. */
(function () {
  'use strict';

  const el = id => document.getElementById(id);
  const esc = s => (typeof escapeHtml === 'function' ? escapeHtml(s) : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const price = () => Number(SUB_CONFIG.priceINR) || 150;
  const plural = n => n + (n === 1 ? ' subject' : ' subjects');

  /* ---------------------------------------------------------------- 1. sign-up window */
  function signupStds() { return Object.keys(GSEB_SUBJECTS).filter(s => s !== 'GUJCET'); }   // GUJCET opens together with Std 11 / 12 Science Maths, Physics, Chemistry

  function buildSignupPlanUI() {
    const std = el('gate-signup-std'), med = el('gate-signup-medium');
    if (std && !std.options.length) std.innerHTML = '<option value="">Select Standard</option>' + signupStds().map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    if (med && !med.options.length) med.innerHTML = '<option value="">Select Medium</option>' + SIGNUP_MEDIUMS.map(m => `<option value="${esc(m)}">${esc(m)} Medium</option>`).join('');
    updateSignupTotal();
  }

  function renderSignupSubjects() {
    const std = (el('gate-signup-std') || {}).value || '';
    const box = el('gate-signup-subjects');
    if (!box) return;
    if (!std) { box.innerHTML = '<p class="text-slate-400 italic">Select a Standard first.</p>'; updateSignupTotal(); return; }
    box.innerHTML = (GSEB_SUBJECTS[std] || []).map(sub => {
      const ok = typeof pairHasQuestions === 'function' ? pairHasQuestions(std, sub) : true;     // a subject without questions yet cannot be bought
      return `<label class="flex items-center gap-2 p-2 rounded-lg border ${ok ? 'border-slate-200 bg-white cursor-pointer' : 'border-slate-100 bg-slate-50 text-slate-400'}">
        <input type="checkbox" name="gate-signup-sub" value="${esc(sub)}" ${ok ? '' : 'disabled'} onchange="updateSignupTotal()">
        <span class="font-semibold">${esc(sub)}</span>${ok ? '' : '<span class="ml-auto text-[10px] font-black text-amber-600">COMING SOON</span>'}</label>`;
    }).join('');
    updateSignupTotal();
  }

  function getSignupChoice() {
    const std = (el('gate-signup-std') || {}).value || '';
    const medium = (el('gate-signup-medium') || {}).value || '';
    const subjects = Array.from(document.querySelectorAll('input[name="gate-signup-sub"]:checked')).map(i => i.value);
    const keys = subjects.map(s => keyOfPair(std, s));
    return { std, medium, subjects, keys, count: subjects.length, amount: subjects.length * price() };
  }

  function validateSignupChoice(c) {
    if (!c.std) return 'Please select your Standard.';
    if (!c.medium) return 'Please select your Medium.';
    if (!c.count) return 'Please tick at least one subject.';
    return '';
  }

  function updateSignupTotal() {
    const box = el('gate-signup-total');
    if (!box) return;
    const c = getSignupChoice();
    box.innerHTML = c.count
      ? `Amount to pay: <b class="text-emerald-700">₹${price()} × ${plural(c.count)} = ₹${c.amount}</b> <span class="font-normal text-slate-500">(1 year)</span>`
      : `₹${price()} per subject for 1 year. Tick your subject(s) to see the total.`;
  }

  /* show the block only on the Sign Up tab */
  const origSwitchGateTab = window.switchGateTab;
  if (typeof origSwitchGateTab === 'function') {
    window.switchGateTab = function (tab) {
      origSwitchGateTab.apply(this, arguments);
      const b = el('gate-signup-plan');
      if (b) b.classList.toggle('hidden', tab !== 'signup');
      if (tab === 'signup') buildSignupPlanUI();
    };
  }

  /* ---------------------------------------------------------------- 2. pay window: the subjects chosen at sign-up */
  function wantedKeys() {
    const p = state.cloudUser;
    return p && p.want ? Object.keys(p.want).filter(k => p.want[k] === true) : [];
  }
  const niceKey = k => String(k).split(STD_SEP).join(' — ');

  function renderPaywallPlan() {
    const keys = wantedKeys();
    const box = el('paywall-bundle-box'), planBtn = el('paywall-plan-btn');
    if (planBtn) planBtn.classList.toggle('hidden', keys.length > 0);
    if (!box) return;
    box.classList.toggle('hidden', !keys.length);
    if (!keys.length) return;
    const p = state.cloudUser, amount = keys.length * price();
    el('paywall-bundle-list').innerHTML = keys.map(k => '• ' + esc(niceKey(k))).join('<br>');
    el('paywall-bundle-meta').textContent = (p.medium ? p.medium + ' Medium · ' : '') + '₹' + price() + ' × ' + plural(keys.length) + ' = ₹' + amount;
    el('paywall-bundle-btn-text').textContent = 'Pay ₹' + amount + ' by UPI & send for approval (' + plural(keys.length) + ', 1 Year)';
  }

  function openBundlePay() {
    const keys = wantedKeys();
    if (!keys.length) return openUpiPay('plan');
    const p = state.cloudUser;
    openUpiPay('bundle', null, { keys, names: keys.map(niceKey), count: keys.length, amount: keys.length * price(), std: p.std || '', medium: p.medium || '' });
  }

  /* ---------------------------------------------------------------- 3. separate name button for teachers / staff */
  function ownName() {
    const p = state.cloudUser, u = state.currentUser || {};
    const raw = (p && p.name) || u.displayName || (u.email ? String(u.email).split('@')[0] : '');
    return typeof cleanDisplayName === 'function' ? cleanDisplayName(raw) : raw;
  }

  function updateUserNameButton() {
    const b = el('user-name-btn');
    if (!b) return;
    const gate = el('auth-gate');
    const gateOpen = gate && !gate.classList.contains('hidden');
    const role = typeof getRole === 'function' ? getRole() : 'guest';
    const show = !!state.currentUser && !state.isGuest && !gateOpen && role !== 'admin' && role !== 'guest';
    b.classList.toggle('hidden', !show);
    b.classList.toggle('flex', show);
    if (show) el('user-name-btn-text').textContent = ownName();
  }

  function openMyAccountModal() {
    const p = state.cloudUser || {}, u = state.currentUser || {};
    const now = Date.now();
    const row = (k, v) => `<div class="flex gap-2"><span class="w-24 shrink-0 font-bold text-slate-500">${k}</span><span class="font-semibold text-slate-900 break-words min-w-0">${v}</span></div>`;
    const assigned = Array.isArray(p.subjects) ? p.subjects : [];
    const paid = Object.keys(p.purchased || {}).filter(k => Number(p.purchased[k]) > now && !String(k).startsWith('GUJCET' + STD_SEP));
    const stds = new Set(); assigned.concat(paid, wantedKeys()).forEach(k => { const i = String(k).indexOf(STD_SEP); if (i > 0) stds.add(String(k).slice(0, i)); });
    if (p.std) stds.add(p.std);
    const lines = [];
    assigned.filter(k => !String(k).startsWith('GUJCET' + STD_SEP)).forEach(k => lines.push(esc(niceKey(k)) + ' <span class="text-slate-500 font-normal">(given by admin)</span>'));
    paid.forEach(k => lines.push(esc(niceKey(k)) + ' <span class="text-emerald-700 font-normal">(till ' + new Date(Number(p.purchased[k])).toLocaleDateString('en-IN') + ')</span>'));
    el('my-account-body').innerHTML =
      row('Name', esc(ownName())) +
      row('E-mail', esc(p.email || u.email || '')) +
      row('Standard', stds.size ? esc(Array.from(stds).join(', ')) : '<span class="text-slate-400 font-normal">—</span>') +
      row('Medium', p.medium ? esc(p.medium) + ' Medium' : '<span class="text-slate-400 font-normal">—</span>') +
      row('Subjects', lines.length ? lines.join('<br>') : '<span class="text-slate-400 font-normal">No subject unlocked yet</span>');
    const reset = el('my-account-reset-btn');
    if (reset) reset.onclick = () => sendTeacherReset(p.email || u.email || '');
    openModal('modal-my-account');
    if (window.lucide && lucide.createIcons) lucide.createIcons();
  }

  /* keep the button right after every login / sign-out / guest switch */
  ['completeLoginSuccess', 'showAuthGate', 'applyRoleUI', 'bypassGuestLogin', 'staffSessionEnded'].forEach(name => {
    const fn = window[name];
    if (typeof fn !== 'function') return;
    window[name] = function () {
      const r = fn.apply(this, arguments);
      try { updateUserNameButton(); } catch (e) { /* cosmetic only */ }
      return r;
    };
  });

  /* the functions the page calls by name */
  window.renderSignupSubjects = renderSignupSubjects;
  window.updateSignupTotal = updateSignupTotal;
  window.getSignupChoice = getSignupChoice;
  window.validateSignupChoice = validateSignupChoice;
  window.renderPaywallPlan = renderPaywallPlan;
  window.openBundlePay = openBundlePay;
  window.updateUserNameButton = updateUserNameButton;
  window.openMyAccountModal = openMyAccountModal;
})();
