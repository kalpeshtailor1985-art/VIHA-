function getActiveTabId() {
      const el = Array.from(document.querySelectorAll('.tab-pane')).find(p => !p.classList.contains('hidden'));
      return el ? el.id : 'tab-generator';
    }

    function openModal(modalId) {
      const el = document.getElementById(modalId);
      if (!el) return;
      if (modalId === 'modal-cloud-settings') {
        const cfg = safeParse(APP_FIREBASE_CONFIG_KEY, {}) || {};
        document.getElementById('cfg-database-url').value = cfg.databaseURL || '';
        document.getElementById('cfg-api-key').value = cfg.apiKey || '';
        document.getElementById('cfg-project-id').value = cfg.projectId || '';
      }
      el.classList.remove('hidden');
      el.classList.add('flex');
      if (window.lucide && lucide.createIcons) lucide.createIcons();
    }

    function closeModal(modalId) {
      const el = document.getElementById(modalId);
      if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
    }

    function toggleSidebar() {
      const sb = document.getElementById('app-sidebar');
      if (sb) sb.classList.toggle('-translate-x-full');
    }

    function switchTab(tabId) {
      if (state.isGuest && !['tab-qbank', 'tab-blueprint'].includes(tabId)) {      // guest: view-only, Question Bank + Blueprint only
        if (!state.guestStarting) { guestLoginPrompt(); return; }
        tabId = 'tab-qbank';
      }
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
      const target = document.getElementById(tabId);
      if (target) target.classList.remove('hidden');

      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white', 'shadow');
        btn.classList.add('text-blue-100', 'hover:bg-brand-800', 'hover:text-white');
      });
      const activeNav = document.getElementById('nav-' + tabId.replace('tab-', ''));
      if (activeNav) {
        activeNav.classList.remove('text-blue-100', 'hover:bg-brand-800');
        activeNav.classList.add('bg-blue-600', 'text-white', 'shadow');
      }

      const titles = {
        'tab-generator': 'Question Paper Workspace',
        'tab-gujcet': 'GUJCET Examination Workspace (40 MCQs)',
        'tab-blueprint': 'Chapterwise Blueprint Allocation Matrix',
        'tab-qbank': 'Question Bank Management',
        'tab-archive': 'My Saved Work',
        'tab-teachers': 'Teachers & Access (Admin)',
        'tab-payments': 'UPI Payments (Admin)'
      };
      const titleEl = document.getElementById('active-tab-title');
      if (titleEl && titles[tabId]) titleEl.innerText = titles[tabId];

      const sb = document.getElementById('app-sidebar');
      if (sb && window.innerWidth < 768) sb.classList.add('-translate-x-full');

      if (tabId === 'tab-generator' && typeof applyPaperZoom === 'function') setTimeout(applyPaperZoom, 0);
      if (tabId === 'tab-blueprint') { renderMatrixTable(); renderSavedBlueprintsList(); }
      if (tabId === 'tab-gujcet') renderGujcetPaperList();
      if (tabId === 'tab-archive') renderArchiveList();
      if (tabId === 'tab-teachers') renderTeachersTab();
      if (tabId === 'tab-payments') { fillGrantSubjects(); renderPayRequests(); }
      if (window.lucide && lucide.createIcons) lucide.createIcons();
    }

    /* ========================= SUBSCRIPTION ========================= */
    function verifyLicenseKey(keyStr, userEmail) {
      if (!keyStr) return { valid: false };
      const parts = keyStr.trim().toUpperCase().split('-');
      if (parts.length !== 4 || parts[0] !== 'KTM') return { valid: false };
      try {
        const expTimestamp = parseInt(parts[2], 36);
        if (isNaN(expTimestamp)) return { valid: false };
        const base = `KTM-${userEmail.toLowerCase().trim()}-${parts[2]}-AVABAI`;
        let hash = 0;
        for (let i = 0; i < base.length; i++) { hash = ((hash << 5) - hash) + base.charCodeAt(i); hash |= 0; }
        const expectedChecksum = Math.abs(hash).toString(36).toUpperCase().padStart(4, 'X').slice(0, 4);
        if (parts[3] === expectedChecksum) {
          return expTimestamp > Date.now()
            ? { valid: true, expiresAt: expTimestamp }
            : { valid: false, expired: true, expiresAt: expTimestamp };
        }
      } catch (e) { return { valid: false }; }
      return { valid: false };
    }

    // Run in the browser console to issue a key:  generateCustomerLicenseKey('teacher@email.com', 365)
    window.generateCustomerLicenseKey = function (customerEmail, validityDays = 365) {
      const email = customerEmail.toLowerCase().trim();
      const expTimestamp = Date.now() + (validityDays * 24 * 60 * 60 * 1000);
      const part2 = expTimestamp.toString(36).toUpperCase();
      const base = `KTM-${email}-${part2}-AVABAI`;
      let hash = 0;
      for (let i = 0; i < base.length; i++) { hash = ((hash << 5) - hash) + base.charCodeAt(i); hash |= 0; }
      const part3 = Math.abs(hash).toString(36).toUpperCase().padStart(4, 'X').slice(0, 4);
      return `KTM-YEAR-${part2}-${part3}`;
    };

    function getStoredLicense(email) {
      const all = safeParse(APP_SUBSCRIPTION_KEY, {});
      return all[email.toLowerCase().trim()] || null;
    }

    function saveLicense(email, expiresAt, orderId = "MANUAL_ACTIVATION") {
      const all = safeParse(APP_SUBSCRIPTION_KEY, {});
      all[email.toLowerCase().trim()] = { email: email.toLowerCase().trim(), expiresAt, activatedAt: Date.now(), orderId };
      safeSet(APP_SUBSCRIPTION_KEY, all);
    }

    function isAdminEmail(email) {
      return (email || '').toLowerCase().trim() === SUB_CONFIG.adminEmail.toLowerCase();
    }

    function checkUserSubscription() {
      const user = state.currentUser || safeParse(APP_AUTH_CACHE_KEY, null);
      
      // Guard clause: Exit early if user or email is missing
      if (!user || !user.email) {
        return; 
      }

      if (state.isGuest) { updateSubscriptionUIBadge(true, 'Guest - Chapters 1-2 only'); closeModal('modal-subscription-paywall'); return; }

      const email = user.email.toLowerCase().trim();
      
      if (getRole() === 'admin') {
        updateSubscriptionUIBadge(true, "Master Lifetime");
        closeModal("modal-subscription-paywall");
        return;
      }

      // Force a live check on the protected Firebase database path /licenses/{emailKey}
      startLicenseWatch(email);
      
      if (firebaseDb) {
        firebaseDb.ref('licenses/' + emailKey(email)).once('value').then(snap => {
          const d = snap.val();
          const now = Date.now();
          const exp = d && d.expiresAt ? Number(d.expiresAt) : 0;
          
          if (exp > now) {
            const daysLeft = Math.ceil((exp - now) / 86400000);
            updateSubscriptionUIBadge(true, `${daysLeft} Days Active`);
            closeModal("modal-subscription-paywall");
          } else {
            updateSubscriptionUIBadge(false, "Subscription Inactive");
            const emailEl = document.getElementById("paywall-user-email");
            if (emailEl) emailEl.innerText = user.email;
            openModal("modal-subscription-paywall");
            renderUpiPending();
          }
        }).catch(() => {
          // Fallback if offline
          const subData = getStoredLicense(email);
          const now = Date.now();
          if (subData && subData.expiresAt && subData.expiresAt > now) {
            updateSubscriptionUIBadge(true, `Active (Offline)`);
            closeModal("modal-subscription-paywall");
          } else {
            updateSubscriptionUIBadge(false, "Subscription Inactive");
            openModal("modal-subscription-paywall");
            renderUpiPending();
          }
        });
      }
    }

    function updateSubscriptionUIBadge(isActive, text) {
      const badge = document.getElementById("sub-status-badge");
      if (!badge) return;
      badge.className = isActive
        ? "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-950 text-amber-300 border border-amber-500/40 cursor-pointer"
        : "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-950 text-rose-300 border border-rose-500/40 animate-pulse cursor-pointer";
      badge.textContent = `★ ${text}`;
    }

    function activateLicenseKeyInput() {
      const keyStr = (document.getElementById("input-license-key")?.value || "").trim();
      if (!keyStr) {
        alert("Please enter a license key.");
        return;
      }
      const user = safeParse(APP_AUTH_CACHE_KEY, null);
      if (!user || !user.email) {
        alert("Please sign in first.");
        return;
      }
      const email = user.email.toLowerCase().trim();
      const res = verifyLicenseKey(keyStr, email);
      if (res.valid) {
        saveLicense(email, res.expiresAt, keyStr);
        alert("🎉 1-Year Subscription Activated Successfully! Welcome to KT Maths Exam Suite.");
        closeModal("modal-subscription-paywall");
        checkUserSubscription();
      } else if (res.expired) {
        alert("This license key has expired.");
      } else {
        alert("Invalid License Key for this account. Please verify with the administrator.");
      }
    }

    /* ========================= DIRECT UPI PAYMENTS (no payment gateway, no server, no API key) =========================
       Teacher pays your UPI ID / QR -> enters the UTR -> request is saved in the database -> you check your UPI app and press Approve. */
    const KEY_UPI_PENDING = 'KT_UPI_PENDING_V1';
    const GUJCET_FOLDER_KEYS = { 'Mathematics (050)': 'Mathematics (GUJCET)', 'Physics (054)': 'Physics (GUJCET)', 'Chemistry (052)': 'Chemistry (GUJCET)' };
    let _upiItem = null, _licRef = null, _licEmail = '', _licNotice = '';

    function emailKey(e) { return String(e || '').toLowerCase().trim().replace(/\./g, ',').replace(/[$#\[\]\/]/g, '_'); }
    function upiConfigured() { const id = String(SUB_CONFIG.upiId || '').trim(); return /^[\w.\-]{2,}@[\w.\-]{2,}$/.test(id) && !/yourname/i.test(id); }
    function upiLink(amount, note) {
      const pa = encodeURIComponent(SUB_CONFIG.upiId).replace('%40', '@');
      return `upi://pay?pa=${pa}&pn=${encodeURIComponent(SUB_CONFIG.upiPayeeName || 'KT Maths')}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
    }
    function newPayCode() {
      const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let t = '';
      for (let i = 0; i < 6; i++) t += c[Math.floor(Math.random() * c.length)];
      return 'KT-' + t;
    }
    function fmtWhen(ts) { return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }

    /* ----- what the teacher is waiting for (kept on this device) ----- */
    function getUpiPending(email) { const all = safeParse(KEY_UPI_PENDING, {}) || {}; return all[String(email || '').toLowerCase().trim()] || []; }
    function setUpiPending(email, list) { const all = safeParse(KEY_UPI_PENDING, {}) || {}; all[String(email || '').toLowerCase().trim()] = list; safeSet(KEY_UPI_PENDING, all); }

    function renderUpiPending() {
      const user = safeParse(APP_AUTH_CACHE_KEY, null);
      const list = user && user.email ? getUpiPending(user.email) : [];
      const txt = list.map(p => `• ${p.kind === 'plan' ? '1-year subscription' : p.kind === 'bundle' ? (p.count || '') + ' subject subscription' : escapeHtml(p.subject || 'subject')} - sent ${fmtWhen(p.at)} (ref ${escapeHtml(p.utr)}) - waiting for the administrator`).join('<br>');
      ['upi-pending-box', 'paywall-pending'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('hidden', !list.length);
        el.innerHTML = list.length ? txt : '';
      });
      ['upi-notice-box', 'paywall-notice'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('hidden', !_licNotice);
        el.textContent = _licNotice ? 'Message from the administrator: ' + _licNotice : '';
      });
      if (typeof renderPaywallPlan === 'function') renderPaywallPlan();     // shows the subjects chosen at sign-up with the amount
    }

    /* ----- opening the pay window ----- */
    function openUpiPay(kind, subject, bundle) {
      const user = safeParse(APP_AUTH_CACHE_KEY, null);
      if (!user || !user.email) return alert('Please sign in first.');
      _upiItem = { kind, subject: subject || null, code: newPayCode(), bundle: bundle || null };
      const amount = (kind === 'bundle' && bundle) ? bundle.amount : SUB_CONFIG.priceINR;       // bundle = rupees per subject x number of subjects
      const ok = upiConfigured();
      document.getElementById('upi-not-configured').classList.toggle('hidden', ok);
      document.getElementById('upi-pay-body').classList.toggle('hidden', !ok);
      document.getElementById('upi-title').textContent = kind === 'plan' ? '1-Year Premium Access' : kind === 'bundle' ? 'Subscription: ' + bundle.count + (bundle.count > 1 ? ' subjects' : ' subject') + ' (1 year)' : 'Unlock: ' + subject + ' (1 year)';
      document.getElementById('upi-amount').textContent = '₹' + amount;
      document.getElementById('upi-id-text').textContent = SUB_CONFIG.upiId;
      document.getElementById('upi-payee-text').textContent = SUB_CONFIG.upiPayeeName || '';
      document.getElementById('upi-code-text').textContent = _upiItem.code + (kind === 'subject' ? ' ' + subject.split(' ')[0] : '');
      document.getElementById('upi-utr').value = '';
      const box = document.getElementById('upi-qr-box');
      box.innerHTML = '';
      if (ok) {
        const note = document.getElementById('upi-code-text').textContent;
        const link = upiLink(amount, note);
        document.getElementById('upi-open-link').href = link;
        if (SUB_CONFIG.upiQrImage) {
          box.innerHTML = `<img src="${escapeHtml(SUB_CONFIG.upiQrImage)}" alt="UPI QR" class="max-w-[220px] max-h-[220px]">`;
        } else if (typeof QRCode !== 'undefined') {
          new QRCode(box, { text: link, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M });
        } else {
          box.innerHTML = '<p class="text-[11px] text-slate-500 text-center p-3">QR code could not load. Use the UPI ID below or the button.</p>';
        }
      }
      renderUpiPending();
      openModal('modal-upi-pay');
      startLicenseWatch(user.email);
    }

    function copyUpiText(id) {
      const t = document.getElementById(id)?.textContent || '';
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => alert('Copied: ' + t)).catch(() => prompt('Copy this:', t));
      else prompt('Copy this:', t);
    }

    /* ----- sending the request ----- */
    async function submitUpiPayment() {
      const user = safeParse(APP_AUTH_CACHE_KEY, null);
      if (!user || !user.email || !_upiItem) return alert('Please sign in first.');
      if (!upiConfigured()) return alert('UPI payment is not set up yet.');
      if (!firebaseDb) return alert('Cannot reach the online database right now. Check your internet and try again.');
      const utr = (document.getElementById('upi-utr').value || '').trim().toUpperCase();
      if (/^(.)\1+$/.test(utr)) return alert('That reference number is not valid. Please copy it exactly from your payment app.');
      if (!/^[A-Z0-9]{10,30}$/.test(utr)) return alert('Please enter the UPI reference number (UTR) shown in your payment app after paying - normally 12 digits.');
      const email = user.email.toLowerCase().trim();
      const item = _upiItem;
      const id = firebaseDb.ref('payRequests').push().key;
      const req = {
        id, email, name: String(user.displayName || '').slice(0, 100), kind: item.kind, amount: item.kind === 'bundle' ? item.bundle.amount : SUB_CONFIG.priceINR,
        utr, note: item.code, createdAt: firebase.database.ServerValue.TIMESTAMP, status: 'pending'
      };
      if (item.kind === 'subject') { req.subject = subjectKey(item.subject); req.subjectName = item.subject; }
      if (item.kind === 'bundle') {
        req.subjects = {}; item.bundle.keys.forEach(k => { req.subjects[k] = true; });
        req.count = item.bundle.count;
        if (item.bundle.std) req.std = item.bundle.std;
        if (item.bundle.medium) req.medium = item.bundle.medium;
      }
      const btn = document.getElementById('upi-submit-btn');
      btn.disabled = true;
      try {
        // both writes succeed together; the UTR can be used only once (database rule)
        await firebaseDb.ref().update({ ['payRequests/' + id]: req, ['utrIndex/' + utr]: id });
      } catch (e) {
        btn.disabled = false;
        return alert(e && e.code === 'PERMISSION_DENIED'
          ? 'This reference number has already been submitted. If it is yours, wait for the administrator or contact on WhatsApp.'
          : 'Could not send the request: ' + (e && e.message));
      }
      btn.disabled = false;
      const list = getUpiPending(email);
      list.unshift({ id, kind: item.kind, subject: item.subject, count: item.bundle ? item.bundle.count : undefined, utr, code: item.code, at: Date.now() });
      setUpiPending(email, list);
      document.getElementById('upi-utr').value = '';
      renderUpiPending();
      alert('Thank you! Your payment was sent for approval.\n\nThe administrator will check it in the UPI app. Your access switches on by itself as soon as it is approved - keep this page open or come back later.');
    }

    /* ----- live access status for this e-mail: licenses/{emailKey} (read-only for everyone, written only by the admin) ----- */
    function stopLicenseWatch() { if (_licRef) { try { _licRef.off(); } catch (e) {} } _licRef = null; _licEmail = ''; }

    function startLicenseWatch(email) {
      const em = String(email || '').toLowerCase().trim();
      if (!firebaseDb || !em) return;
      if (_licRef && _licEmail === em) return;
      stopLicenseWatch();
      _licEmail = em;
      _licRef = firebaseDb.ref('licenses/' + emailKey(em));
      _licRef.on('value', s => applyLicenseSnapshot(em, s.val()), () => {});
    }
    function syncLicenseFromServer(email) { startLicenseWatch(email); }       // kept for older callers

    function applyLicenseSnapshot(email, d) {
      const em = String(email || '').toLowerCase().trim();
      _licNotice = (d && d.notice) ? String(d.notice) : '';
      if (!d) { renderUpiPending(); return; }
      let subjectsChanged = false, planChanged = false;
      if (d.subjects && typeof d.subjects === 'object') {
        const before = JSON.stringify(getSubjectAccessMap(em));
        mergeServerSubjects(em, d.subjects);
        subjectsChanged = JSON.stringify(getSubjectAccessMap(em)) !== before;
      }
      const exp = Number(d.expiresAt) || 0;
      if (exp > Date.now()) {
        const cur = getStoredLicense(em);
        if (!cur || cur.expiresAt !== exp) { saveLicense(em, exp, 'UPI_APPROVED'); planChanged = true; }
      }
      // requests that have now been approved
      const pend = getUpiPending(em);
      const left = pend.filter(p => !(p.kind === 'plan' || p.kind === 'bundle' ? exp > p.at : Number((d.subjects || {})[subjectKey(p.subject)]) > p.at));
      const approved = pend.filter(p => !left.includes(p));
      if (approved.length) setUpiPending(em, left);
      if (subjectsChanged) refreshSubjectLocks();
      if (planChanged) checkUserSubscription();
      if (document.getElementById('modal-my-subjects') && !document.getElementById('modal-my-subjects').classList.contains('hidden')) renderMySubjects();
      renderUpiPending();
      if (approved.length) {
        closeModal('modal-upi-pay');
        alert('✅ Payment approved: ' + approved.map(p => p.kind === 'plan' ? '1-year subscription' : p.kind === 'bundle' ? (p.count || '') + ' subject subscription' : p.subject).join(', ') + ' is now active.');
      }
    }

    /* the My Subjects window opens the same pay window */
    function startSubjectPayment(i) {
      const subject = (window._mySubjList || [])[i];
      const it = subject ? KEY_TO_ITEM[subjectKey(subject)] : null;
      if (it && !pairHasQuestions(it.std, it.subject)) return alert('This Standard + Subject is Coming Soon - there are no questions yet, so it cannot be bought.');
      if (subject) openUpiPay('subject', subject);
    }

    /* ----- ADMIN: approve / reject ----- */
    function startPayRequestListener() {
      listen('payRequests', s => { state.payRequests = s.val() || {}; renderPayRequests(); });
    }

    function renderPayRequests() {
      const box = document.getElementById('pay-requests-list');
      const nav = document.getElementById('nav-payments-badge');
      const reqs = Object.values(state.payRequests || {}).filter(Boolean).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const pending = reqs.filter(r => r.status === 'pending' || r.status === 'approving');
      if (nav) { nav.textContent = pending.length; nav.classList.toggle('hidden', !pending.length); }
      if (!box) return;
      const f = document.getElementById('pay-filter')?.value || 'PENDING';
      const list = f === 'ALL' ? reqs : pending;
      if (!list.length) { box.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-6">' + (f === 'ALL' ? 'No payment requests yet.' : 'Nothing is waiting for approval.') + '</p>'; return; }
      const chip = st => ({ pending: 'bg-amber-100 text-amber-900', approving: 'bg-blue-100 text-blue-900', approved: 'bg-emerald-100 text-emerald-800', rejected: 'bg-rose-100 text-rose-800' }[st] || 'bg-slate-100');
      box.innerHTML = list.map(r => `
        <div class="p-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col md:flex-row md:items-center gap-3 text-xs">
          <div class="flex-1 min-w-0 space-y-0.5">
            <div class="flex items-center gap-2 flex-wrap"><b class="text-slate-900 break-all">${escapeHtml(r.email)}</b>${r.name ? `<span class="text-slate-500">(${escapeHtml(r.name)})</span>` : ''}
              <span class="px-2 py-0.5 rounded-full font-bold text-[10px] ${chip(r.status)}">${escapeHtml(r.status)}</span></div>
            <div class="text-slate-700 font-semibold">${r.kind === 'plan' ? '1-year subscription' : r.kind === 'bundle' ? escapeHtml(r.count || '') + ' subjects (' + escapeHtml(Object.keys(r.subjects || {}).map(k => k.split(STD_SEP).join(' - ')).join(', ')) + ')' + (r.medium ? ' &nbsp;•&nbsp; ' + escapeHtml(r.medium) + ' medium' : '') : 'Subject: ' + escapeHtml(r.subjectName || r.subject || '')} &nbsp;•&nbsp; ₹${escapeHtml(r.amount)}</div>
            <div class="font-mono text-slate-600">UTR <b>${escapeHtml(r.utr)}</b>${/^\d{12}$/.test(String(r.utr)) ? '' : ' <span class="text-amber-700 font-bold">⚠ not a 12-digit UPI number - check carefully</span>'} &nbsp;•&nbsp; note ${escapeHtml(r.note || '-')} &nbsp;•&nbsp; ${r.createdAt ? fmtWhen(r.createdAt) : ''}</div>
            ${r.rejectReason ? `<div class="text-rose-700">Reason: ${escapeHtml(r.rejectReason)}</div>` : ''}
          </div>
          ${r.status === 'pending' ? `<div class="flex gap-2 shrink-0">
            <button type="button" onclick="approvePayRequest('${r.id}')" class="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer">Approve</button>
            <button type="button" onclick="rejectPayRequest('${r.id}')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer">Reject</button></div>` : ''}
        </div>`).join('');
    }

    /* writes the licence / subject for an e-mail (public read-only node) and, for a Firebase teacher account, the read-only purchase */
    async function grantAccess({ email, kind, subject, subjects, days, requestId, utr, amount }) {
      const em = String(email || '').toLowerCase().trim();
      const ms = (Number(days) || SUB_CONFIG.durationDays) * 86400000;
      const now = Date.now();
      const sk = kind === 'subject' ? subjectKey(subject) : null;
      const bundleKeys = kind === 'bundle' ? (subjects || []).map(subjectKey) : [];        // 'bundle' = plan + every subject chosen at sign-up
      const res = await firebaseDb.ref('licenses/' + emailKey(em)).transaction(cur => {
        cur = cur || {};
        const out = Object.assign({}, cur, { email: em, updatedAt: now });
        delete out.notice;
        if (kind === 'subject') {
          const subs = Object.assign({}, cur.subjects || {});
          subs[sk] = Math.max(Number(subs[sk]) || 0, now) + ms;
          out.subjects = subs;
        } else if (kind === 'bundle') {
          const subs = Object.assign({}, cur.subjects || {});
          bundleKeys.forEach(k => { subs[k] = Math.max(Number(subs[k]) || 0, now) + ms; });
          out.subjects = subs;
          out.expiresAt = Math.max(Number(cur.expiresAt) || 0, now) + ms;
        } else out.expiresAt = Math.max(Number(cur.expiresAt) || 0, now) + ms;
        return out;
      });
      const val = res.snapshot.val();
      const upd = {};
      upd['licenseLog/' + emailKey(em) + '/' + (requestId || 'manual-' + now)] = { kind, subject: sk || bundleKeys.join(', ') || null, utr: utr || null, amount: amount || null, days: Math.round(ms / 86400000), at: now };
      if (kind === 'subject' || kind === 'bundle') {
        const users = (await firebaseDb.ref('users').once('value')).val() || {};
        const uid = Object.keys(users).find(u => String((users[u] || {}).email || '').toLowerCase().trim() === em);
        if (uid) {
          (kind === 'subject' ? [sk] : bundleKeys).forEach(key => {
            const exp = val.subjects[key];
            upd['users/' + uid + '/purchased/' + key] = exp;
            // Std 11 / 12 Science Maths, Physics, Chemistry also open the GUJCET folder of the same subject
            const gk = withGujcetAliases([key]).filter(k => k !== key)[0];
            if (gk) upd['users/' + uid + '/purchased/' + gk] = Math.max(Number(((users[uid] || {}).purchased || {})[gk]) || 0, exp);
          });
        }
      }
      await firebaseDb.ref().update(upd);
      return val;
    }

    async function approvePayRequest(id) {
      if (!isAdminCloud() || !firebaseDb) return alert('Sign in with your admin (Firebase) account to approve payments.');
      const r = (state.payRequests || {})[id];
      if (!r || r.status !== 'pending') return;
      if (r.kind === 'subject' && !String(r.subjectName || r.subject).includes(STD_SEP)) return alert('This is an old-style request (subject only, no Standard). Reject it and ask the teacher to choose the Standard + Subject again.');
      if (r.kind === 'bundle' && !Object.keys(r.subjects || {}).length) return alert('This request has no subjects. Reject it and ask the teacher to send it again.');
      const what = r.kind === 'plan' ? 'the 1-year subscription' : r.kind === 'bundle' ? 'the ' + r.count + ' subject(s): ' + Object.keys(r.subjects || {}).map(k => k.split(STD_SEP).join(' - ')).join(', ') : 'the Standard + Subject "' + (r.subjectName || r.subject) + '"';
      if (!confirm(`Approve ${what} for ${r.email}?\n\nFirst check in your UPI app that ₹${r.amount} was received with reference ${r.utr}.`)) return;
      // forced double-check: the admin must read the reference in the UPI app and type its last 4 characters
      const tail = String(r.utr).slice(-4).toUpperCase();
      const typed = prompt('SAFETY CHECK\nOpen GPay / PhonePe, find the received payment of ₹' + r.amount + ' and type the LAST 4 characters of its UTR / reference number:');
      if (typed === null) return;
      if (typed.trim().toUpperCase() !== tail) return alert('The last 4 characters do not match the request (' + r.utr + '). Not approved. If the payment really exists, reject this request and ask the teacher to submit the correct number.');
      const sref = firebaseDb.ref('payRequests/' + id + '/status');
      try {
        const tx = await sref.transaction(cur => cur === 'pending' ? 'approving' : undefined);
        if (!tx.committed) return alert('This request was already handled.');
        await grantAccess({ email: r.email, kind: r.kind, subject: r.subjectName || r.subject, subjects: Object.keys(r.subjects || {}), days: SUB_CONFIG.durationDays, requestId: id, utr: r.utr, amount: r.amount });
        await firebaseDb.ref().update({ ['payRequests/' + id + '/status']: 'approved', ['payRequests/' + id + '/approvedAt']: firebase.database.ServerValue.TIMESTAMP });
      } catch (e) {
        try { await sref.set('pending'); } catch (e2) {}
        alert('Could not approve: ' + (e && e.message) + '\n\nThe request is back to "waiting". Try again.');
      }
    }

    async function rejectPayRequest(id) {
      if (!isAdminCloud() || !firebaseDb) return alert('Sign in with your admin (Firebase) account first.');
      const r = (state.payRequests || {})[id];
      if (!r || r.status !== 'pending') return;
      const reason = prompt('Why is it rejected? (the teacher will see this)', 'Payment not found. Please check the reference number or contact the administrator.');
      if (reason === null) return;
      const em = r.email.toLowerCase().trim();
      try {
        const tx = await firebaseDb.ref('payRequests/' + id + '/status').transaction(cur => cur === 'pending' ? 'rejected' : undefined);
        if (!tx.committed) return alert('This request was already handled.');
        await firebaseDb.ref().update({
          ['payRequests/' + id + '/rejectReason']: reason.slice(0, 300),
          ['licenses/' + emailKey(em) + '/email']: em,
          ['licenses/' + emailKey(em) + '/notice']: reason.slice(0, 300)
        });
      } catch (e) { alert('Could not reject: ' + (e && e.message)); }
    }

    async function adminManualGrant() {
      if (!isAdminCloud() || !firebaseDb) return alert('Sign in with your admin (Firebase) account first.');
      const email = (document.getElementById('grant-email').value || '').trim().toLowerCase();
      const kind = document.getElementById('grant-kind').value;
      const days = parseInt(document.getElementById('grant-days').value, 10) || SUB_CONFIG.durationDays;
      const subject = document.getElementById('grant-subject').value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Enter a valid e-mail.');
      if (kind === 'subject' && !subject) return alert('Choose the subject.');
      if (!confirm(`Give ${kind === 'plan' ? 'the subscription' : 'the subject "' + subject + '"'} to ${email} for ${days} days?`)) return;
      try { await grantAccess({ email, kind, subject, days }); alert('Done.'); document.getElementById('grant-email').value = ''; }
      catch (e) { alert('Could not save: ' + (e && e.message)); }
    }

    function fillGrantSubjects() {
      const sel = document.getElementById('grant-subject');
      if (sel && !sel.options.length) sel.innerHTML = '<option value="">- choose subject -</option>' + ALL_SUBJECT_NAMES.map(n => `<option>${escapeHtml(n)}</option>`).join('');
    }

    /* ========================= PER-SUBJECT ACCESS (teacher accounts) ========================= */
    const SUBJECT_ACCESS_KEY = 'KT_MATHS_SUBJECT_ACCESS_V1';
    const LOCK_GUARDED_SELECTS = ['paper-sub', 'filter-sub', 'gujcet-subject'];
    let _subjectLockCtx = null;
    let _subjectPromptShown = false;

    function invalidateSubjectLockCache() { _subjectLockCtx = null; }

    function getSubjectAccessMap(email) {
      const all = safeParse(SUBJECT_ACCESS_KEY, {}) || {};
      return all[String(email || '').toLowerCase().trim()] || {};
    }

    function saveSubjectAccess(email, sKey, expiresAt, orderId) {
      const em = String(email || '').toLowerCase().trim();
      const all = safeParse(SUBJECT_ACCESS_KEY, {}) || {};
      all[em] = all[em] || {};
      all[em][sKey] = { expiresAt, activatedAt: Date.now(), orderId: orderId || '' };
      safeSet(SUBJECT_ACCESS_KEY, all);
      invalidateSubjectLockCache();
    }

    /* subjects the server reports for this e-mail: { subjectKey: expiresAt } */
    function mergeServerSubjects(email, subjects) {
      const em = String(email || '').toLowerCase().trim();
      const all = safeParse(SUBJECT_ACCESS_KEY, {}) || {};
      all[em] = all[em] || {};
      Object.keys(subjects || {}).forEach(k => {
        const exp = Number(subjects[k]);
        if (exp > 0) all[em][k] = Object.assign({ activatedAt: Date.now(), orderId: 'SERVER_SYNC' }, all[em][k], { expiresAt: exp });
      });
      safeSet(SUBJECT_ACCESS_KEY, all);
      invalidateSubjectLockCache();
    }

    function subjectLockCtx() {
      if (_subjectLockCtx) return _subjectLockCtx;
      const role = getRole();
      const cloudTeacher = role === 'teacher' && !!state.cloudUser && state.cloudUser.role === 'teacher';   // (was 'staff': locks never switched on for Firebase teachers)
      let on = SUB_CONFIG.enablePerSubjectAccess !== false && (role === 'user' || cloudTeacher);
      let map = {};
      if (on && cloudTeacher) {
        // cloud teacher: assigned subjects are always included, bought subjects until they expire
        (state.cloudUser.subjects || []).forEach(k => { map[k] = { expiresAt: 8.64e15, assigned: true }; });
        const pur = state.cloudUser.purchased || {};
        Object.keys(pur).forEach(k => { if (!map[k]) map[k] = { expiresAt: Number(pur[k]) || 0 }; });
      } else if (on) {
        const u = state.currentUser || safeParse(APP_AUTH_CACHE_KEY, null);
        if (u && u.email) map = getSubjectAccessMap(u.email); else on = false;
      }
      _subjectLockCtx = { on, map };
      return _subjectLockCtx;
    }

    /* ========================= ACCESS = STANDARD + SUBJECT =========================
       One unlock covers ONE standard and ONE subject, e.g. "Std 12 Science | Mathematics (050)".
       Std 11 Mathematics does NOT open Std 12 Mathematics. Question folders in the cloud use the same key,
       so the database rules enforce it on the server too. */
    const STD_SEP = ' | ';
    /* GUJCET subjects are covered by the Std 11 / Std 12 Science subject of the same name */
    const GUJCET_SUBJECT_ALIAS = { 'Mathematics': 'Mathematics (050)', 'Physics': 'Physics (054)', 'Chemistry': 'Chemistry (052)' };
    const GUJCET_ALIAS_STDS = ['Std 11 Science', 'Std 12 Science'];

    function accessName(std, sub) { return std + STD_SEP + sub; }
    function plainGujcetSubject(sub) { return String(sub || '').replace(/\s*\(GUJCET\)\s*$/i, ''); }   // older data: "Mathematics (GUJCET)"

    /* the standard a question / row / form value / drop-down belongs to, or null when unknown */
    function ctxStd(ctx) {
      if (ctx === true) return 'GUJCET';
      if (ctx && typeof ctx === 'object') {
        if (ctx.bankType === 'GUJCET' || ctx.std === 'GUJCET') return 'GUJCET';
        if (ctx.std && ctx.std !== 'ALL' && GSEB_SUBJECTS[ctx.std]) return ctx.std;
      }
      return null;
    }

    /* the cloud folder an item lives in: "<std> | <subject>" (items without a known standard stay in the old subject-only folder) */
    function folderKeyFor(item, subjField) {
      const isG = item.bankType === 'GUJCET' || item.std === 'GUJCET';
      const sub = isG ? plainGujcetSubject(item[subjField]) : item[subjField];
      const std = isG ? 'GUJCET' : item.std;
      return (std && GSEB_SUBJECTS[std]) ? subjectKey(accessName(std, sub)) : subjectKey(sub);
    }

    /* EXACT keys needed to EDIT this subject in this standard (admin-assigned subjects) */
    function exactKeysFor(sub, ctx) {
      const std = ctxStd(ctx);
      if (std === 'GUJCET') return [subjectKey(accessName('GUJCET', plainGujcetSubject(sub)))];
      if (std) return [subjectKey(accessName(std, sub))];
      return ACCESS_ITEMS.filter(i => i.subject === sub).map(i => i.key);
    }

    /* keys that give access to READ / USE this subject in this standard */
    function lockKeysFor(sub, ctx) {
      const keys = exactKeysFor(sub, ctx);
      if (ctxStd(ctx) === 'GUJCET') {
        const a = GUJCET_SUBJECT_ALIAS[plainGujcetSubject(sub)];
        if (a) { GUJCET_ALIAS_STDS.forEach(s => keys.push(subjectKey(accessName(s, a)))); keys.push(subjectKey(a)); }
      }
      keys.push(subjectKey(sub));            // old subject-only unlock (until the admin runs the upgrade tool)
      return keys;
    }

    /* adds the GUJCET folder keys that go with Std 11 / 12 Science Maths, Physics, Chemistry */
    function withGujcetAliases(keys) {
      const out = new Set(keys);
      GUJCET_ALIAS_STDS.forEach(std => Object.keys(GUJCET_SUBJECT_ALIAS).forEach(plain => {
        if (out.has(subjectKey(accessName(std, GUJCET_SUBJECT_ALIAS[plain])))) out.add(subjectKey(accessName('GUJCET', plain)));
      }));
      return Array.from(out);
    }

    /* the item to highlight in the unlock window for a locked choice */
    function unlockFocusName(sub, ctx) {
      const std = ctxStd(ctx);
      if (std === 'GUJCET') { const a = GUJCET_SUBJECT_ALIAS[plainGujcetSubject(sub)]; return a ? accessName('Std 12 Science', a) : sub; }
      return std ? accessName(std, sub) : sub;
    }

    /* true when a teacher account has not unlocked this subject in this standard (admin, staff and guests are never locked here) */
    function isSubjectLockedFast(sub, ctx) {
      if (!sub) return false;
      const c = typeof subjectLockCtx === 'function' ? subjectLockCtx() : null;
      if (!c || !c.on) return false;
      const now = Date.now();
      return !lockKeysFor(sub, ctx).some(k => { const e = c.map ? c.map[k] : null; return e && e.expiresAt > now; });
    }

    /* what a subject drop-down is showing: true = GUJCET, {std} = that standard, false = unknown standard */
    function selectLockCtx(sel) {
      if (!sel) return false;
      if (sel.id === 'gujcet-subject') return true;
      const stdId = sel.id === 'filter-sub' ? 'filter-std' : (sel.id === 'paper-sub' ? 'paper-std' : null);
      if (!stdId) return false;
      const std = document.getElementById(stdId)?.value;
      if (std === 'GUJCET' || (sel.id === 'filter-sub' && state.currentBankType === 'GUJCET')) return true;
      return (std && std !== 'ALL') ? { std } : false;
    }

    /* standards that use a subject (GUJCET is not listed: it is covered by the Std 11/12 Science subject) */
    function subjectStdList(name) {
      return Object.keys(GSEB_SUBJECTS).filter(std => std !== 'GUJCET' && GSEB_SUBJECTS[std].includes(name));
    }

    function openMySubjectsModal(focusSubject) {
      renderMySubjects(focusSubject);
      openModal('modal-my-subjects');
    }

    function renderMySubjects(focusSubject) {
      const box = document.getElementById('my-subjects-list');
      const intro = document.getElementById('my-subjects-intro');
      const u = state.currentUser || safeParse(APP_AUTH_CACHE_KEY, null);
      if (!box || !intro || !u || !u.email) return;
      const acc = subjectLockCtx().map;
      const now = Date.now();
      const unlocked = Object.keys(acc).filter(k => acc[k].expiresAt > now).length;
      const price = SUB_CONFIG.priceINR;
      const cloudTeacher = getRole() === 'teacher';
      const chooseMode = !cloudTeacher && unlocked === 0;          // old local plan: the first subject is chosen, not bought
      intro.innerHTML = chooseMode
        ? `Your plan includes <b>ONE Standard + Subject of your choice</b> - choose it below. Every other one costs <b>₹${price}</b> per year.`
        : `Each line is <b>one Standard + one Subject</b>. Only what you unlock (<b>₹${price}</b> per year each) opens for you - every other Standard and Subject stays locked. Items assigned by your admin are included.`;
      window._mySubjList = [];
      const btn = 'px-2.5 py-1.5 rounded-lg font-bold text-white shadow cursor-pointer';
      const reverse = {}; Object.keys(GUJCET_SUBJECT_ALIAS).forEach(p => { reverse[GUJCET_SUBJECT_ALIAS[p]] = p; });
      box.innerHTML = Object.keys(GSEB_SUBJECTS).filter(std => std !== 'GUJCET').map(std => {
        const rows = GSEB_SUBJECTS[std].map(sub => {
          const name = accessName(std, sub);
          const i = window._mySubjList.push(name) - 1;
          const e = acc[subjectKey(name)] || acc[subjectKey(sub)];            // second key = old subject-only unlock
          const on = e && e.expiresAt > now;
          const soon = !pairHasQuestions(std, sub);
          const right = (!on && soon) ? SOON_BADGE_HTML : on
            ? (e.assigned ? '<span class="text-emerald-700 font-bold">Included (assigned)</span>'
                          : `<span class="text-emerald-700 font-bold">Unlocked till ${new Date(e.expiresAt).toLocaleDateString('en-GB')}</span>`) + (soon ? ' ' + SOON_BADGE_HTML : '')
            : (chooseMode
                ? `<button type="button" onclick="chooseIncludedSubject(${i})" class="${btn} bg-emerald-700 hover:bg-emerald-800">Choose (included)</button>`
                : `<button type="button" onclick="startSubjectPayment(${i})" class="${btn} bg-amber-600 hover:bg-amber-700">Unlock ₹${price}</button>`);
          const note = reverse[sub] && GUJCET_ALIAS_STDS.includes(std) ? `<div class="text-[10px] text-slate-500 truncate">Also opens GUJCET ${escapeHtml(reverse[sub])}</div>` : '';
          const hot = (name === focusSubject || (focusSubject && !String(focusSubject).includes(STD_SEP) && sub === focusSubject));
          return `<div class="flex items-center justify-between gap-2 p-2 rounded-lg border ${hot ? 'border-amber-500 bg-amber-50' : 'border-slate-200'}">
            <div class="min-w-0"><div class="font-bold text-slate-800 text-xs truncate">${escapeHtml(sub)}</div>${note}</div>
            <div class="text-[11px] shrink-0">${right}</div></div>`;
        }).join('');
        return `<div class="mt-2"><div class="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-2">${escapeHtml(std)}${stdHasQuestions(std) ? '' : ' ' + SOON_BADGE_HTML}</div><div class="space-y-1.5">${rows}</div></div>`;
      }).join('');
    }

    /* the ONE subject included in the paid plan */
    function chooseIncludedSubject(i) {
      const subject = (window._mySubjList || [])[i];
      const u = state.currentUser || safeParse(APP_AUTH_CACHE_KEY, null);
      if (!subject || !u || !u.email) return;
      const lic = getStoredLicense(u.email);
      if (!lic || !(lic.expiresAt > Date.now())) return alert('Please activate your subscription first.');
      if (!confirm(`Choose "${subject}" as the subject included in your plan?\n\nOther subjects cost ₹${SUB_CONFIG.priceINR} each, so please choose carefully.`)) return;
      saveSubjectAccess(u.email, subjectKey(subject), lic.expiresAt, 'INCLUDED_IN_PLAN');
      refreshSubjectLocks();
      renderMySubjects();
    }

    function firstUnlockedOption(sel) {
      const o = Array.from(sel.options).find(x => x.value !== 'ALL' && !isSubjectLockedFast(x.value, selectLockCtx(sel)));
      return o ? o.value : null;
    }

    /* re-applies every lock-related part of the screen (call after login, sign-out, payment or a server sync) */
    function refreshSubjectLocks() {
      invalidateSubjectLockCache();
      const c = subjectLockCtx();
      const btn = document.getElementById('my-subjects-btn');
      if (btn) { btn.classList.toggle('hidden', !c.on); btn.classList.toggle('flex', c.on); }
      if (typeof refreshComingSoon === 'function') refreshComingSoon();

      // a locked subject must not stay selected
      LOCK_GUARDED_SELECTS.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel || !sel.value || sel.value === 'ALL' || !isSubjectLockedFast(sel.value, selectLockCtx(sel))) { if (sel && sel.value) sel.dataset.okValue = sel.value; return; }
        const alt = firstUnlockedOption(sel);
        if (alt) { sel.value = alt; sel.dataset.okValue = alt; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      if (typeof filterQuestionBank === 'function') filterQuestionBank();

      // first time after paying: ask for the included subject
      if (c.on && getRole() === 'user' && !_subjectPromptShown) {
        const u = state.currentUser || safeParse(APP_AUTH_CACHE_KEY, null);
        const lic = u && u.email ? getStoredLicense(u.email) : null;
        const hasAny = Object.keys(c.map).some(k => c.map[k].expiresAt > Date.now());
        if (lic && lic.expiresAt > Date.now() && !hasAny) { _subjectPromptShown = true; openMySubjectsModal(); }
      }
      if (!c.on) _subjectPromptShown = false;
    }

    /* choosing a locked subject in a drop-down opens the unlock window instead */
    document.addEventListener('change', e => {
      const t = e.target;
      if (!t || !LOCK_GUARDED_SELECTS.includes(t.id) || !t.value || t.value === 'ALL') return;
      if (isSubjectLockedFast(t.value, selectLockCtx(t))) {
        e.stopImmediatePropagation();
        const wanted = t.value;
        const back = (t.dataset.okValue && Array.from(t.options).some(o => o.value === t.dataset.okValue && !isSubjectLockedFast(o.value, selectLockCtx(t)))) ? t.dataset.okValue : firstUnlockedOption(t);
        if (back) t.value = back;
        openMySubjectsModal(unlockFocusName(wanted, selectLockCtx(t)));
      } else t.dataset.okValue = t.value;
    }, true);

    /* ========================= FIREBASE + STAFF ACCESS ========================= */
    /* every Standard + Subject pair that can be unlocked / assigned (GUJCET pairs are assigned by the admin or come with Std 11/12 Science) */
    const ACCESS_ITEMS = [];
    Object.keys(GSEB_SUBJECTS).forEach(std => GSEB_SUBJECTS[std].forEach(sub => {
      const name = accessName(std, sub);
      ACCESS_ITEMS.push({ std, subject: sub, name, key: subjectKey(name) });
    }));
    const ALL_SUBJECT_NAMES = ACCESS_ITEMS.map(i => i.name);
    const KEY_TO_SUBJECT = {}, KEY_TO_ITEM = {};
    ACCESS_ITEMS.forEach(i => { KEY_TO_SUBJECT[i.key] = i.name; KEY_TO_ITEM[i.key] = i; });
    function subjectKey(s) { return String(s || '_general').replace(/[.$#\[\]\/]/g, '_').trim() || '_general'; }

    // questions live at qbank/<subject>/<id>, blueprint rows at bprows/<subject>/<id>
    const CLOUD_COLL = {
      questions: { path: 'qbank', stateKey: 'questions', subjField: 'subject', localKey: APP_STORAGE_KEY_Q },
      blueprint: { path: 'bprows', stateKey: 'blueprintRows', subjField: 'sub', localKey: APP_STORAGE_KEY_MATRIX }
    };
    let cloudMaps = { questions: {}, blueprint: {} };
    let cloudRefs = [];
    const syncTimers = {};
    let lastRejectAlert = 0;

    function isAdminCloud() { return !!state.cloudUser && state.cloudUser.role === 'admin'; }
    function canEditKey(sk) {
      if (!state.cloudUser) return true;               // local-only mode: no cloud restrictions
      if (state.cloudUser.role === 'admin') return true;
      return state.cloudUser.subjects.includes(sk);
    }
    function canEditSubject(sub, ctx) { return exactKeysFor(sub, ctx).some(k => canEditKey(k)); }
    function guardEdit(subject, what, ctx) {
      if (isSubjectLockedFast(subject, ctx)) { openMySubjectsModal(unlockFocusName(subject, ctx)); return false; }
      if (canEditSubject(subject, ctx)) return true;
      alert(`You can only change items in the Standard + Subject assigned to you.\n"${(ctxStd(ctx) ? ctxStd(ctx) + ' | ' : '') + (subject || 'General')}" is not assigned to your account.`);
      return false;
    }
    function requireAdminForShared() {
      if (state.cloudUser && state.cloudUser.role === 'teacher') {
        alert('Saved blueprints are shared by the admin. Only the admin can save or delete them.');
        return false;
      }
      return true;
    }
    function stableStr(o) { return JSON.stringify(o, Object.keys(o).sort()); }
    function withTimeout(p, ms) {
      return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
    }

    function initFirebaseCloud() {
      let cfg = safeParse(APP_FIREBASE_CONFIG_KEY, null);
      if (!cfg || !cfg.databaseURL) {
        cfg = { databaseURL: "https://kt-exam-suit-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "kt-exam-suit" };
      }
      if (cfg.projectId && !cfg.authDomain) cfg.authDomain = cfg.projectId + '.firebaseapp.com';
      if (!cfg.apiKey && DEFAULT_FIREBASE_API_KEY) cfg.apiKey = DEFAULT_FIREBASE_API_KEY;
      state.firebaseCfg = cfg;
      try {
        if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded');
        if (!firebase.apps.length) firebase.initializeApp(cfg);
        firebaseDb = firebase.database();
        state.isFirebaseReady = true;
        firebaseDb.ref('.info/connected').on('value', snap => { state.cloudOnline = snap.val() === true; refreshCloudBadge(); });
        if (cfg.apiKey && firebase.auth) {
          state.authAvailable = true;
          firebase.auth().onAuthStateChanged(handleAuthStateChanged);
        }
        refreshCloudBadge();
      } catch (err) {
        firebaseDb = null;
        state.isFirebaseReady = false;
        updateCloudSyncBadge(false, "Local Safe Mode");
      }
    }

    function updateCloudSyncBadge(isLive, label) {
      const badge = document.getElementById('firebase-sync-badge');
      if (!badge) return;
      badge.className = isLive
        ? "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900 transition cursor-pointer"
        : "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-950 text-amber-300 border border-amber-500/40 hover:bg-amber-900 transition cursor-pointer";
      badge.textContent = `● ${label}`;
    }

    function refreshCloudBadge() {
      if (!state.isFirebaseReady) return updateCloudSyncBadge(false, 'Local Safe Mode');
      if (state.cloudUser) {
        const r = state.cloudUser.role === 'admin' ? 'Admin' : 'Teacher';
        return updateCloudSyncBadge(state.cloudOnline, state.cloudOnline ? `Cloud Synced • ${r}` : 'Offline (will sync)');
      }
      updateCloudSyncBadge(false, 'Local Mode');
    }

    function applyRoleUI() {
      const nav = document.getElementById('nav-teachers');
      if (nav) nav.classList.toggle('hidden', !isAdminCloud());
      const navPay = document.getElementById('nav-payments');
      if (navPay) navPay.classList.toggle('hidden', !isAdminCloud());
      const note = document.getElementById('qbank-role-note');
      if (!note) return;
      const u = state.cloudUser;
      if (u && u.role === 'teacher') {
        const names = u.subjects.map(k => KEY_TO_SUBJECT[k] || k);
        const bought = Object.keys(u.purchased || {}).filter(k => Number(u.purchased[k]) > Date.now() && KEY_TO_SUBJECT[k] && !u.subjects.includes(k)).map(k => KEY_TO_SUBJECT[k]);
        note.textContent = 'Teacher access — you can add / edit / delete questions in: ' + (names.join(', ') || 'no subject assigned') +
          (bought.length ? '.  Purchased (view and use in papers): ' + bought.join(', ') : '');
        note.classList.remove('hidden');
      } else if (u && u.role === 'admin') {
        note.textContent = 'Admin access — full control of all subjects.';
        note.classList.remove('hidden');
      } else {
        note.classList.add('hidden');
      }
    }

    /* ----- staff sign-in (Firebase Auth) ----- */
    async function handleAuthStateChanged(fbUser) {
      if (state.signupInProgress) return;   // account is still being created
      if (!fbUser) {
        const cachedStaff = state.currentUser && String(state.currentUser.role || '').startsWith('staff');
        if (state.cloudUser || cachedStaff) staffSessionEnded('Your staff session ended. Please sign in again.');
        return;
      }
      try {
        let profile = null;
        try {
          const [adm, usr] = await withTimeout(Promise.all([
            firebaseDb.ref('admins/' + fbUser.uid).once('value'),
            firebaseDb.ref('users/' + fbUser.uid).once('value')
          ]), 10000);
          const isAdm = adm.val() === true;
          const u = usr.val();
          if (!isAdm && !(u && u.active === true)) {
            await firebase.auth().signOut();
            showAuthGate();
            switchGateTab('staff');
            showGateAlert('This account is not approved for access, or the administrator has removed it. Please contact the administrator.', false);
            return;
          }
          if (!isAdm && u && u.selfSignup === true && SUB_CONFIG.requireEmailVerification && !fbUser.emailVerified) {
            try { await fbUser.sendEmailVerification(); } catch (e3) {}
            await firebase.auth().signOut();
            showAuthGate();
            switchGateTab('signin');
            showGateAlert('Please verify your email first. We just sent a new verification link to ' + fbUser.email + ' (check Spam too), then sign in again.', false);
            return;
          }
          profile = {
            uid: fbUser.uid, email: fbUser.email, role: isAdm ? 'admin' : 'teacher',
            name: isAdm ? ADMIN_DISPLAY_NAME : ((u && u.name) || (fbUser.email || '').split('@')[0]),      // the administrator's name is fixed
            std: isAdm ? '' : String((u && u.std) || ''),
            medium: isAdm ? '' : String((u && u.medium) || ''),
            want: isAdm ? {} : Object.assign({}, (u && u.want) || {}),                                  // subjects chosen in the sign-up window
            subjects: isAdm ? [] : Object.keys(u.subjects || {}).filter(k => u.subjects[k] === true),
            purchased: isAdm ? {} : Object.assign({}, (u && u.purchased) || {})      // subjects bought online: { subjectKey: expiresAt } (read-only)
          };
          safeSet(APP_STAFF_PROFILE_KEY, profile);
        } catch (e) {
          const saved = safeParse(APP_STAFF_PROFILE_KEY, null);
          if (e.message === 'timeout' && saved && saved.uid === fbUser.uid) profile = saved; // offline: reuse last verified profile
          else throw e;
        }
        state.cloudUser = profile;
        updateAdminOnlyControls();
        completeLoginSuccess({ email: profile.email, displayName: profile.name, role: profile.role === 'admin' ? 'staff-admin' : 'staff-teacher' });
        applyRoleUI();
        refreshCloudBadge();
        startCloudSync();
      } catch (e) {
        showAuthGate();
        switchGateTab('staff');
        showGateAlert('Could not verify staff access: ' + e.message + (/permission/i.test(e.message) ? ' (publish the database rules first)' : ''), false);
      }
    }

    function handleStaffLogin(email, password) {
      if (!state.authAvailable) return showGateAlert('Staff login needs your Firebase API key. Click "Cloud settings" and add it.', false);
      showGateAlert('Signing in…', true);
      firebase.auth().signInWithEmailAndPassword(email, password).catch(err => {
        const bad = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'];
        showGateAlert(bad.includes(err.code) ? 'Incorrect email or password.' : (err.code === 'auth/too-many-requests' ? 'Too many attempts. Try again later.' : err.message), false);
      });
    }

    function handleStaffPasswordReset() {
      const email = (document.getElementById('gate-user-email').value || '').trim();
      if (!state.authAvailable) return showGateAlert('Add your Firebase API key in Cloud settings first.', false);
      if (!email) return showGateAlert('Type your staff email above, then click Forgot Password again.', false);
      firebase.auth().sendPasswordResetEmail(email)
        .then(() => showGateAlert('Password reset email sent. Check your inbox.', true))
        .catch(err => showGateAlert(err.message, false));
    }

    function staffSessionEnded(msg) {
      stopCloudSync();
      state.cloudUser = null;
      updateAdminOnlyControls();
      localStorage.removeItem(APP_AUTH_CACHE_KEY);
      state.currentUser = null;
      applyRoleUI();
      refreshCloudBadge();
      closeModal('modal-subscription-paywall');
      showAuthGate();
      switchGateTab('staff');
      if (msg) showGateAlert(msg, false);
    }

    function staffSignOutCleanup() {
      stopCloudSync();
      state.cloudUser = null;
      updateAdminOnlyControls();
      state.currentUser = null;
      localStorage.removeItem(APP_STAFF_PROFILE_KEY);
      applyRoleUI();
      refreshCloudBadge();
      try { if (state.authAvailable) firebase.auth().signOut(); } catch (e) {}
    }

    /* ----- real-time sync ----- */
    function listen(path, cb) {
      const ref = firebaseDb.ref(path);
      ref.on('value', cb, err => console.warn('Cloud read denied for ' + path, err && err.message));
      cloudRefs.push(ref);
    }

    /* ----- teachers: only the subjects assigned by the admin or bought online (the database rules enforce the same) ----- */
    let cloudPartial = { questions: {}, blueprint: {} };

    function readableSubjectKeys(u) {
      const keys = new Set((u && u.subjects) || []);
      const now = Date.now(), pur = (u && u.purchased) || {};
      Object.keys(pur).forEach(k => { if (Number(pur[k]) > now) keys.add(k); });
      return Array.from(keys);
    }

    function startSubjectListeners() {
      const keys = readableSubjectKeys(state.cloudUser);
      cloudPartial = { questions: {}, blueprint: {} };
      // drop anything cached on this device from subjects the teacher cannot use
      state.isRemoteUpdateRunning = true;
      state.questions = state.questions.filter(q => keys.includes(folderKeyFor(q, 'subject')));
      state.blueprintRows = state.blueprintRows.filter(r => keys.includes(folderKeyFor(r, 'sub')));
      safeSet(APP_STORAGE_KEY_Q, state.questions);
      safeSet(APP_STORAGE_KEY_MATRIX, state.blueprintRows);
      updateQuestionCountBadge(); filterQuestionBank(); renderMatrixTable();
      state.isRemoteUpdateRunning = false;
      keys.forEach(sk => {
        listen('qbank/' + sk, s => { cloudPartial.questions[sk] = s.val() || {}; ingestCollection('questions', cloudPartial.questions); });
        listen('bprows/' + sk, s => { cloudPartial.blueprint[sk] = s.val() || {}; ingestCollection('blueprint', cloudPartial.blueprint); });
      });
    }

    /* re-reads this teacher's record (after a payment) and restarts the listeners if the subject list changed */
    async function refreshCloudProfile() {
      const u = state.cloudUser;
      if (!u || !firebaseDb || u.role === 'admin') return;
      try {
        const usr = (await withTimeout(firebaseDb.ref('users/' + u.uid).once('value'), 10000)).val();
        if (!usr || usr.active !== true) return;
        const before = readableSubjectKeys(u).sort().join('|');
        u.subjects = Object.keys(usr.subjects || {}).filter(k => usr.subjects[k] === true);
        u.purchased = Object.assign({}, usr.purchased || {});
        safeSet(APP_STAFF_PROFILE_KEY, u);
        invalidateSubjectLockCache();
        if (readableSubjectKeys(u).sort().join('|') !== before) startCloudSync();
        applyRoleUI();
        refreshSubjectLocks();
      } catch (e) { console.warn('Profile refresh failed:', e && e.message); }
    }

    function stopCloudSync() {
      cloudRefs.forEach(r => { try { r.off(); } catch (e) {} });
      cloudRefs = [];
      cloudMaps = { questions: {}, blueprint: {} };
    }

    function startCloudSync() {
      if (!firebaseDb || !state.cloudUser) return;
      stopCloudSync();
      if (isAdminCloud()) {
        listen('qbank', s => ingestCollection('questions', s.val()));
        listen('bprows', s => ingestCollection('blueprint', s.val()));
        startPayRequestListener();
      } else {
        startSubjectListeners();
        // the admin writes bought subjects onto this account: unlock them the moment they appear
        listen('users/' + state.cloudUser.uid + '/purchased', () => refreshCloudProfile());
      }
      // every signed-in user: own blueprints and papers (userdata/{uid}); admin: also moves the old shared blueprints into the admin's own folder
      listen('userdata/' + state.cloudUser.uid + '/exams', s => ingestUserWork(s.val()));
      if (isAdminCloud()) listen('database/savedBlueprints', s => ingestLegacySharedBlueprints(s.val()));
      listen('settings/avatarImg', s => {
        const v = s.val();
        if (v && v !== localStorage.getItem(APP_STORAGE_KEY_AVATAR)) {
          safeSet(APP_STORAGE_KEY_AVATAR, v);
          const el = document.getElementById('user-avatar'); if (el) el.src = v;
        }
      });
      listen('settings/logoImg', s => {
        const v = s.val();
        if (v && v !== localStorage.getItem(APP_STORAGE_KEY_LOGO)) {
          safeSet(APP_STORAGE_KEY_LOGO, v);
          applyLogoEverywhere(v);
        }
      });
    }

    function ingestCollection(kind, val, noMigrate) {
      const cfg = CLOUD_COLL[kind];
      const list = [], map = {};
      if (val && typeof val === 'object') {
        Object.keys(val).forEach(sk => {
          const group = val[sk];
          if (!group || typeof group !== 'object') return;
          Object.keys(group).forEach(id => {
            const item = group[id];
            if (!item || typeof item !== 'object') return;
            item.id = item.id || id;
            const known = KEY_TO_ITEM[sk];
            if (known) { item[cfg.subjField] = known.subject; item.std = known.std; }      // the folder decides the standard AND subject, not the item text
            list.push(item);
            map[item.id] = { str: stableStr(item), key: sk };
          });
        });
      }
      cloudMaps[kind] = map;
      if (list.length === 0) {
        if (isAdminCloud() && !noMigrate) syncDiff(kind);   // first sign-in: upload this device's existing data
        return;
      }
      state.isRemoteUpdateRunning = true;
      state[cfg.stateKey] = list;
      safeSet(cfg.localKey, list);
      if (kind === 'questions') { updateQuestionCountBadge(); filterQuestionBank(); if (typeof scheduleCatalogPublish === 'function') scheduleCatalogPublish(); }
      renderMatrixTable();
      state.isRemoteUpdateRunning = false;
    }

    function scheduleSync(kind) {
      if (!state.cloudUser) return;
      clearTimeout(syncTimers[kind]);
      syncTimers[kind] = setTimeout(() => syncDiff(kind), 500);
    }

    // Uploads only what changed, and only inside subjects this user is allowed to edit
    function syncDiff(kind) {
      if (!firebaseDb || !state.cloudUser || state.isRemoteUpdateRunning) return;
      const cfg = CLOUD_COLL[kind];
      const map = cloudMaps[kind] || {};
      const list = state[cfg.stateKey] || [];
      const updates = {};
      const present = new Set();
      const movedFrom = new Set();

      list.forEach(item => {
        if (!item || !item.id) return;
        present.add(item.id);
        const sk = folderKeyFor(item, cfg.subjField);
        if (!canEditKey(sk)) return;
        const prev = map[item.id];
        if (prev && prev.str === stableStr(item) && prev.key === sk) return;
        if (prev && prev.key !== sk) {
          if (!canEditKey(prev.key)) return;
          updates[`${cfg.path}/${prev.key}/${item.id}`] = null;
          movedFrom.add(`${cfg.path}/${prev.key}/${item.id}`);      // the new copy is written right after it: keep both in one request
        }
        updates[`${cfg.path}/${sk}/${item.id}`] = clone(item);
      });
      Object.keys(map).forEach(id => {
        if (present.has(id) || !canEditKey(map[id].key)) return;
        updates[`${cfg.path}/${map[id].key}/${id}`] = null;
      });

      const keys = Object.keys(updates);
      if (!keys.length) return;
      const chunks = [];
      let part = {}, partKeys = 0, partSize = 0;
      keys.forEach(k => {
        const size = updates[k] ? JSON.stringify(updates[k]).length : 40;
        const justAfterMove = partKeys > 0 && movedFrom.has(Object.keys(part)[partKeys - 1]);   // never separate a delete from its new copy
        if (partKeys > 0 && !justAfterMove && (partKeys >= 300 || partSize + size > 1500000)) { chunks.push(part); part = {}; partKeys = 0; partSize = 0; }
        part[k] = updates[k]; partKeys++; partSize += size;
      });
      if (partKeys) chunks.push(part);
      Promise.all(chunks.map(c => firebaseDb.ref().update(c))).catch(err => {
        console.warn('Cloud save rejected', err);
        if (Date.now() - lastRejectAlert > 5000) {
          lastRejectAlert = Date.now();
          alert('The cloud rejected this change (you may not have permission for that subject). Your view will be refreshed from the cloud.');
        }
        firebaseDb.ref(cfg.path).once('value').then(s => ingestCollection(kind, s.val(), true)).catch(() => {});
      });
    }

    // used for admin-only shared data (saved blueprints)
    function pushToCloud(path, value) {
      if (!firebaseDb || !state.cloudUser || state.isRemoteUpdateRunning) return;
      try {
        firebaseDb.ref(path).set(clone(value)).catch(err => console.warn('Firebase sync failed for ' + path, err));
      } catch (e) { console.warn('Firebase sync error for ' + path, e); }
    }

    /* ----- admin: manage teachers ----- */
    function subjectChecklistHtml(idPrefix, selectedKeys) {
      return Object.keys(GSEB_SUBJECTS).map(std => `<div class="col-span-2 md:col-span-3 mt-1 text-[10px] font-extrabold text-slate-600 uppercase">${escapeHtml(std)}</div>` +
        GSEB_SUBJECTS[std].map(sub => {
          const k = subjectKey(accessName(std, sub));
          return `<label class="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-1 cursor-pointer">
          <input type="checkbox" data-sk="${escapeHtml(k)}" name="${idPrefix}" ${selectedKeys.includes(k) ? 'checked' : ''}><span>${escapeHtml(sub)}</span></label>`;
        }).join('')).join('');
    }
    function checkedSubjectKeys(idPrefix) {
      return withGujcetAliases(Array.from(document.querySelectorAll(`input[name="${idPrefix}"]:checked`)).map(i => i.dataset.sk));
    }

    function renderTeachersTab() {
      if (!isAdminCloud()) return;
      const box = document.getElementById('tch-new-subjects');
      if (box && !box.children.length) box.innerHTML = subjectChecklistHtml('tch-new', []);
      const med = document.getElementById('tch-new-medium');
      if (med && !med.options.length) med.innerHTML = '<option value="">Medium…</option>' + SIGNUP_MEDIUMS.map(m => `<option value="${m}">${m} Medium</option>`).join('');
      const fs = document.getElementById('tch-filter-std');
      if (fs && fs.options.length <= 1) fs.innerHTML = '<option value="">All Standards</option>' + Object.keys(GSEB_SUBJECTS).map(s2 => `<option value="${escapeHtml(s2)}">${escapeHtml(s2)}</option>`).join('');
      const fm = document.getElementById('tch-filter-medium');
      if (fm && fm.options.length <= 1) fm.innerHTML = '<option value="">All Mediums</option>' + SIGNUP_MEDIUMS.map(m => `<option value="${m}">${m} Medium</option>`).join('');
      loadTeachersList();
    }

    async function createTeacherAccount() {
      if (!isAdminCloud()) return alert('Only the admin can create teacher accounts.');
      const name = document.getElementById('tch-new-name').value.trim();
      const email = document.getElementById('tch-new-email').value.trim().toLowerCase();
      const pass = document.getElementById('tch-new-pass').value;
      const medium = document.getElementById('tch-new-medium').value;
      const keys = checkedSubjectKeys('tch-new');
      if (!name || !email) return alert('Please enter the teacher name and email.');
      if (pass.length < 6) return alert('Temporary password must be at least 6 characters.');
      if (!medium) return alert('Please choose the teacher\'s medium (Gujarati or English).');
      if (keys.length === 0) return alert('Tick at least one subject for this teacher.');

      const btn = document.getElementById('tch-create-btn');
      btn.disabled = true; btn.textContent = 'Creating…';
      let app2 = null;
      try {
        // a second Firebase app instance creates the login so the admin stays signed in
        app2 = firebase.initializeApp(state.firebaseCfg, 'sec-' + Date.now());
        const cred = await app2.auth().createUserWithEmailAndPassword(email, pass);
        const subjects = {}; keys.forEach(k => { subjects[k] = true; });
        await firebaseDb.ref('users/' + cred.user.uid).set({ name, email, active: true, medium, subjects, createdAt: Date.now() });
        await app2.auth().signOut();
        alert(`Account created for ${name}.\nShare the email and temporary password with them. They sign in from the "Staff Login" tab.`);
        ['tch-new-name', 'tch-new-email', 'tch-new-pass', 'tch-new-medium'].forEach(id => { document.getElementById(id).value = ''; });
        document.querySelectorAll('input[name="tch-new"]').forEach(i => { i.checked = false; });
        loadTeachersList();
      } catch (e) {
        alert(e.code === 'auth/email-already-in-use'
          ? 'That email already has a login. Delete it in Firebase Console → Authentication, then create it again here.'
          : 'Could not create the account: ' + e.message);
      } finally {
        if (app2) app2.delete().catch(() => {});
        btn.disabled = false; btn.textContent = 'Create Teacher Account';
      }
    }

    /* ----- Teachers list: every number / word the search needs is kept on the card ----- */
    function teacherStds(u) {
      const set = new Set();
      Object.keys(u.subjects || {}).concat(Object.keys(u.purchased || {}), Object.keys(u.want || {})).forEach(k => { const i = k.indexOf(STD_SEP); if (i > 0) set.add(k.slice(0, i)); });
      if (u.std) set.add(u.std);
      return Array.from(set);
    }
    function teacherSubjectNames(u) {
      const set = new Set();
      const keys = Object.keys(u.subjects || {}).filter(k => u.subjects[k] === true)
        .concat(Object.keys(u.purchased || {}), Object.keys(u.want || {}).filter(k => u.want[k] === true));
      keys.forEach(k => { const i = k.indexOf(STD_SEP); set.add(i >= 0 ? k.slice(i + STD_SEP.length) : k); });
      return Array.from(set);
    }
    function teacherSearchText(u) {
      const syn = { 'mathematics': ' maths math', 'science & technology': ' science tech', 'elements of accounts': ' accounts accountancy', 'b.a.': ' ba business administration' };
      const subs = teacherSubjectNames(u).map(n => n + (Object.keys(syn).filter(x => n.toLowerCase().includes(x)).map(x => syn[x]).join(' ')));
      return [u.name, u.email, teacherStds(u).join(' '), u.medium, u.medium ? u.medium + ' medium' : '', subs.join(' '), u.active ? 'active enabled' : 'disabled', u.selfSignup ? 'self signup' : 'added by admin'].join(' ').toLowerCase();
    }

    async function loadTeachersList() {
      const box = document.getElementById('tch-list');
      if (!box || !isAdminCloud()) return;
      box.innerHTML = '<p class="text-xs text-slate-400">Loading…</p>';
      try {
        const snap = await firebaseDb.ref('users').once('value');
        const users = snap.val() || {};
        state.tchUsers = users;
        const uids = Object.keys(users).sort((a, b) => String((users[a] || {}).name || '').localeCompare(String((users[b] || {}).name || ''), undefined, { sensitivity: 'base' }));
        if (!uids.length) { box.innerHTML = '<p class="text-xs text-slate-400 italic">No teachers added yet.</p>'; filterTeachers(); return; }
        const now = Date.now();
        const per = Number(SUB_CONFIG.priceINR) || 150;
        box.innerHTML = uids.map(uid => {
          const u = users[uid] || {};
          const sel = Object.keys(u.subjects || {}).filter(k => u.subjects[k] === true);
          const stds = teacherStds(u);
          const paid = Object.keys(u.purchased || {}).filter(k => Number(u.purchased[k]) > now && !k.startsWith('GUJCET' + STD_SEP));
          const want = Object.keys(u.want || {}).filter(k => u.want[k] === true);
          const nm = k => escapeHtml(k.split(STD_SEP).join(' · '));
          const medOpts = '<option value="">Not set</option>' + SIGNUP_MEDIUMS.map(m => `<option value="${m}" ${u.medium === m ? 'selected' : ''}>${m} Medium</option>`).join('');
          return `<div data-tch="${escapeHtml(uid)}" data-hay="${escapeHtml(teacherSearchText(u))}" data-stds="${escapeHtml(stds.join('|'))}" data-medium="${escapeHtml(u.medium || '')}" class="border border-slate-200 rounded-xl p-3 space-y-2 text-xs ${u.active ? '' : 'bg-slate-50 opacity-80'}">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="min-w-0"><span class="font-extrabold text-slate-900">${escapeHtml(u.name || '')}</span>
                <span class="font-mono text-slate-500 ml-2 break-all">${escapeHtml(u.email || '')}</span>
                <span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${u.active ? 'Active' : 'Disabled'}</span>
                ${u.medium ? `<span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-800">${escapeHtml(u.medium)} Medium</span>` : ''}
                ${stds.map(x => `<span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">${escapeHtml(x)}</span>`).join('')}</div>
              <div class="flex gap-1.5 flex-wrap">
                <button type="button" onclick="saveTeacherSubjects('${escapeHtml(uid)}')" class="px-2 py-1 bg-brand-900 text-white rounded font-bold cursor-pointer">Save subjects</button>
                <button type="button" onclick="toggleTeacherActive('${escapeHtml(uid)}', ${!u.active})" class="px-2 py-1 ${u.active ? 'bg-rose-600' : 'bg-emerald-600'} text-white rounded font-bold cursor-pointer">${u.active ? 'Disable' : 'Enable'}</button>
                <button type="button" onclick="deleteTeacher('${escapeHtml(uid)}')" class="px-2 py-1 bg-red-800 hover:bg-red-900 text-white rounded font-bold cursor-pointer">🗑 Delete</button>
                <button type="button" onclick="sendTeacherReset('${escapeHtml(u.email || '')}')" class="px-2 py-1 bg-slate-200 text-slate-800 rounded font-bold cursor-pointer">Send password reset</button>
              </div>
            </div>
            ${want.length ? `<p class="text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5"><b>Chose at sign-up:</b> ${want.map(nm).join(', ')} &nbsp;(${want.length} × ₹${per} = ₹${want.length * per})</p>` : ''}
            ${paid.length ? `<p class="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-1.5"><b>Paid:</b> ${paid.map(k => nm(k) + ' (till ' + new Date(Number(u.purchased[k])).toLocaleDateString('en-IN') + ')').join(', ')}</p>` : ''}
            <div class="flex items-center gap-2"><label class="font-bold text-slate-700">Medium:</label>
              <select id="tch-medium-${escapeHtml(uid)}" class="border rounded-lg p-1.5 border-slate-300 bg-white font-semibold">${medOpts}</select></div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-1.5">${subjectChecklistHtml('tch-' + uid, sel)}</div>
          </div>`;
        }).join('');
        filterTeachers();
      } catch (e) {
        box.innerHTML = `<p class="text-xs text-rose-600">Could not load teachers: ${escapeHtml(e.message)}</p>`;
      }
    }

    /* search bar + Standard / Medium filters: hides cards, never re-draws them, so ticks you have not saved yet are kept */
    function filterTeachers() {
      // "std 12" / "std12" is one unit (so it never matches "Mathematics (Standard - 12)"); every other word just has to appear somewhere
      let q = String((document.getElementById('tch-search') || {}).value || '').toLowerCase().trim();
      const stdTerms = [];
      q = q.replace(/\bstd\.?\s*(\d+)/g, (m, n) => { stdTerms.push(new RegExp('(^|\\s)std ' + n + '(?!\\d)')); return ' '; });
      const words = q.split(/\s+/).filter(Boolean);
      const fs = (document.getElementById('tch-filter-std') || {}).value || '';
      const fm = (document.getElementById('tch-filter-medium') || {}).value || '';
      const cards = document.querySelectorAll('#tch-list [data-tch]');
      let shown = 0;
      cards.forEach(c => {
        const ok = words.every(w => c.dataset.hay.includes(w)) && stdTerms.every(re => re.test(c.dataset.hay))
          && (!fs || c.dataset.stds.split('|').includes(fs))
          && (!fm || c.dataset.medium === fm);
        c.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      const cnt = document.getElementById('tch-count');
      if (cnt) cnt.textContent = cards.length ? (shown === cards.length ? `(${cards.length})` : `(showing ${shown} of ${cards.length})`) : '';
      const empty = document.getElementById('tch-empty');
      if (empty) empty.classList.toggle('hidden', !(cards.length && shown === 0));
    }

    async function saveTeacherSubjects(uid) {
      const keys = checkedSubjectKeys('tch-' + uid);
      if (!keys.length) return alert('Tick at least one subject (or use Disable to remove access).');
      const subjects = {}; keys.forEach(k => { subjects[k] = true; });
      const medium = (document.getElementById('tch-medium-' + uid) || {}).value || null;
      try { await firebaseDb.ref('users/' + uid).update({ subjects, medium }); alert('Saved.'); loadTeachersList(); }
      catch (e) { alert('Could not save: ' + e.message); }
    }

    async function toggleTeacherActive(uid, active) {
      try { await firebaseDb.ref('users/' + uid + '/active').set(!!active); loadTeachersList(); }
      catch (e) { alert('Could not update: ' + e.message); }
    }

    /* removes the teacher's record, so the account can no longer open the app. (A browser cannot remove the Firebase login itself: do that in Firebase > Authentication if the e-mail must be reused.) */
    async function deleteTeacher(uid) {
      if (!isAdminCloud()) return alert('Only the admin can delete a teacher.');
      const u = (state.tchUsers || {})[uid];
      if (!u) return;
      if (!confirm(`Delete ${u.name || 'this teacher'} (${u.email || ''})?\n\nThey lose all access at once. This cannot be undone.\n\n(Use Disable instead if you only want to pause the account.)`)) return;
      try {
        await firebaseDb.ref('users/' + uid).remove();
        alert('Deleted. The teacher can no longer sign in to the app.\n\nTo reuse this e-mail address for a new account, also delete the login in Firebase Console > Authentication.');
        loadTeachersList();
      } catch (e) { alert('Could not delete: ' + e.message); }
    }

    function sendTeacherReset(email) {
      if (!email) return;
      firebase.auth().sendPasswordResetEmail(email).then(() => alert('Password reset email sent to ' + email)).catch(e => alert(e.message));
    }

    function saveCloudConfig() {
      const url = document.getElementById('cfg-database-url').value.trim();
      const apiKey = document.getElementById('cfg-api-key').value.trim();
      const projectId = document.getElementById('cfg-project-id').value.trim();
      if (!url) return alert('Please enter your Firebase Database URL');
      if (!/^https:\/\/.+/i.test(url)) return alert('Database URL must start with https://');
      safeSet(APP_FIREBASE_CONFIG_KEY, { databaseURL: url, apiKey: apiKey || undefined, projectId: projectId || undefined, authDomain: projectId ? projectId + '.firebaseapp.com' : undefined });
      closeModal('modal-cloud-settings');
      alert('Firebase Cloud Sync config saved! Reloading application...');
      window.location.reload();
    }

    // Tests the URL typed in the form (not the already-connected database)
    function testCloudConnection() {
      const url = document.getElementById('cfg-database-url').value.trim();
      const projectId = document.getElementById('cfg-project-id').value.trim();
      const apiKey = document.getElementById('cfg-api-key').value.trim();
      if (!url) return alert('Please input a Database URL first.');
      if (typeof firebase === 'undefined') return alert('Firebase SDK could not be loaded. Check your internet connection.');

      let app;
      try {
        const cfg = { databaseURL: url };
        if (projectId) cfg.projectId = projectId;
        if (apiKey) cfg.apiKey = apiKey;
        app = firebase.initializeApp(cfg, 'test-' + Date.now());
      } catch (e) {
        return alert('Invalid configuration: ' + e.message);
      }
      const ref = app.database().ref('.info/connected');
      let finished = false;
      const finish = ok => {
        if (finished) return;
        finished = true;
        try { ref.off(); app.delete(); } catch (e) {}
        alert(ok ? 'Connected! Cloud Database is reachable.' : 'Could not connect within 6 seconds. Check the URL and your database rules.');
      };
      ref.on('value', snap => { if (snap.val() === true) finish(true); });
      setTimeout(() => finish(false), 6000);
    }

    /* ========================= IMAGES ========================= */
    function resizeImage(base64Str, maxWidth, maxHeight, callback) {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; // avoids black background for transparent PNGs
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => callback(base64Str);
      img.src = base64Str;
    }

    function loadPersistentImages() {
      const savedAvatar = localStorage.getItem(APP_STORAGE_KEY_AVATAR);
      if (savedAvatar) { const el = document.getElementById('user-avatar'); if (el) el.src = savedAvatar; }
      const savedLogo = localStorage.getItem(APP_STORAGE_KEY_LOGO);
      if (savedLogo) applyLogoEverywhere(savedLogo);
    }

    function applyLogoEverywhere(url) {
      document.querySelectorAll('.kt-logo-img').forEach(img => { img.src = url; });
      const f = document.getElementById('app-favicon'); if (f) f.href = url;
      const a = document.getElementById('apple-touch-icon'); if (a) a.href = url;
    }

    function handleLocalPhoto(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => resizeImage(evt.target.result, 256, 256, img => {
        document.getElementById('user-avatar').src = img;
        safeSet(APP_STORAGE_KEY_AVATAR, img);
        if (firebaseDb) {
          firebaseDb.ref('settings/avatarImg').set(img)
            .then(() => alert('Profile picture updated and synced across all devices!'))
            .catch(() => alert('Saved locally. Connect Cloud to sync across devices.'));
        } else alert('Profile picture saved on this device.');
      });
      reader.readAsDataURL(file);
    }

    function handleAppLogoUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => resizeImage(evt.target.result, 256, 256, img => {
        safeSet(APP_STORAGE_KEY_LOGO, img);
        applyLogoEverywhere(img);
        if (firebaseDb) {
          firebaseDb.ref('settings/logoImg').set(img)
            .then(() => alert('App Logo updated and synced across all devices!'))
            .catch(() => alert('Saved locally. Connect Cloud to sync across devices.'));
        } else alert('App logo saved on this device.');
      });
      reader.readAsDataURL(file);
    }

    function openPhotoModal() { openModal('modal-photo'); }

    /* ========================= AUTH ========================= */
    function hideAuthGate() {
      const g = document.getElementById('auth-gate');
      if (g) { g.classList.add('hidden'); g.classList.remove('flex'); }
    }
    function showAuthGate() {
      const g = document.getElementById('auth-gate');
      if (g) { g.classList.remove('hidden'); g.classList.add('flex'); }
    }

    function switchGateTab(tab) {
      state.gateAuthTab = tab;
      const on = "py-2 rounded-lg bg-brand-900 text-white shadow transition cursor-pointer";
      const off = "py-2 rounded-lg text-slate-600 hover:text-brand-900 transition cursor-pointer";
      const ids = { signin: 'tab-auth-signin-btn', signup: 'tab-auth-signup-btn', staff: 'tab-auth-staff-btn' };
      Object.keys(ids).forEach(k => { const b = document.getElementById(ids[k]); if (b) b.className = (k === tab) ? on : off; });
      document.getElementById('gate-name-container').classList.toggle('hidden', tab !== 'signup');
      document.getElementById('gate-staff-hint').classList.toggle('hidden', tab !== 'staff');
      const quick = document.getElementById('admin-quick-login-btn');
      if (quick) quick.classList.toggle('hidden', tab === 'staff');
      const texts = {
        signin: ["Sign In to Portal", "Teacher Sign In"],
        signup: ["Create Account & Sign In", "Create Teacher Account"],
        staff: ["Staff Login", "Staff Login (Shared Question Bank)"]
      };
      document.getElementById('gate-main-submit-btn').innerText = texts[tab][0];
      document.getElementById('gate-header-title').innerText = texts[tab][1];
      const alertBox = document.getElementById('gate-alert-box');
      if (alertBox) alertBox.classList.add('hidden');
    }

    function showGateAlert(msg, isSuccess) {
      const box = document.getElementById('gate-alert-box');
      if (!box) return;
      box.innerText = msg;
      box.className = isSuccess
        ? "p-2.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 block"
        : "p-2.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 block";
    }

    function completeLoginSuccess(userObj) {
      // never keep the password in the session cache
      const safeUser = { email: userObj.email, displayName: userObj.displayName, role: userObj.role };
      state.currentUser = safeUser;
      if (!state.isGuest) safeSet(APP_AUTH_CACHE_KEY, safeUser);
      updateAdminOnlyControls();
      hideAuthGate();
      setTimeout(refreshSubjectLocks, 0);
      // the name in the sidebar header is the administrator's and is fixed; teachers / staff get their own name on a separate button
      const nameEl = document.getElementById('logged-user-name');
      if (nameEl) nameEl.innerText = ADMIN_DISPLAY_NAME;
      const titleEl = document.getElementById('logged-user-title');
      if (titleEl) titleEl.innerText = ADMIN_DISPLAY_TITLE;
      if (window.lucide && lucide.createIcons) lucide.createIcons();
      checkUserSubscription();
    }

    function handleSimpleAuthSubmit(e) {
      if (e && e.preventDefault) e.preventDefault();
      const email = (document.getElementById('gate-user-email').value || '').trim().toLowerCase();
      const password = (document.getElementById('gate-user-password').value || '').trim();
      const nameInput = document.getElementById('gate-user-name');
      const fullName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : (email ? email.split('@')[0] : 'Teacher');

      if (!email || !password) return showGateAlert('Please provide both your email address and password.', false), false;
      if (!SUB_CONFIG.allowLocalAccounts) {
        if (typeof handleCloudAuthSubmit !== 'function') return showGateAlert('Sign-in module (js/secure-auth.js) is missing on the website. Upload it to GitHub and refresh with Ctrl+Shift+R.', false), false;
        handleCloudAuthSubmit(email, password, fullName); return false;
      }
      if (state.gateAuthTab === 'staff') { handleStaffLogin(email, password); return false; }
      if (password.length < 4) return showGateAlert('Password must be at least 4 characters long.', false), false;

      let users = safeParse(APP_USERS_REGISTRY_KEY, []);
      if (!Array.isArray(users)) users = [];

      if (state.gateAuthTab === 'signup') {
        if (isAdminEmail(email)) return showGateAlert('This email is reserved for the administrator. Use the Instant Sign In button.', false), false;
        if (users.find(u => u.email === email)) {
          showGateAlert('Account already exists for this email! Switched to Sign In mode.', false);
          switchGateTab('signin');
          return false;
        }
        const newUser = { email, password, displayName: fullName };
        users.push(newUser);
        safeSet(APP_USERS_REGISTRY_KEY, users);
        completeLoginSuccess(newUser);
        return false;
      }

      const match = users.find(u => u.email === email);
      if (!match) return showGateAlert('No account found for this email. Please use "New? Sign Up".', false), false;
      if (match.password !== password) return showGateAlert('Incorrect password. Click "Forgot Password?" to reset.', false), false;
      completeLoginSuccess(match);
      return false;
    }

    /* Returns the verified user role from Firebase Auth, defaulting to guest if unauthenticated */
    function getRole() {
      if (state.isGuest) return 'guest';          // guest preview: chapters 1-2 only
      // Strictly verify against the authenticated Firebase session profile
      if (state.cloudUser && state.cloudUser.role) {
        return state.cloudUser.role; // 'admin' or 'teacher' verified via Firebase Auth
      }
      
      // Fallback for offline/guest mode only (prevents local cache role spoofing)
      const user = state.currentUser;
      if (!user) return 'guest';
      
      // Non-privileged standard user fallback
      return 'user';
    }
    function updateAdminOnlyControls() {
      // Strictly restrict controls to actively verified Firebase admin session
      const isAdmin = state.cloudUser && state.cloudUser.role === 'admin';
      
      // admin-only controls: file backup / restore panel, Teachers & Access tab, instant master sign-in
      const backup = document.getElementById('backup-panel');
      if (backup) backup.classList.toggle('hidden', !isAdmin);
      
      const teachersNav = document.getElementById('nav-teachers');
      if (teachersNav) teachersNav.classList.toggle('hidden', !isAdmin);
      
      const payNav = document.getElementById('nav-payments');
      if (payNav) payNav.classList.toggle('hidden', !isAdmin);
      
      // Cloud settings: the header badge only opens it for the admin
      document.querySelectorAll('.work-show-all-wrap').forEach(w => { 
        w.classList.toggle('hidden', !isAdmin); 
        w.classList.toggle('flex', isAdmin); 
      });
      
      if (!isAdmin && window._showAllWork) { 
        window._showAllWork = false; 
      }
      
      const syncBadge = document.getElementById('firebase-sync-badge');
      if (syncBadge) { 
        syncBadge.style.pointerEvents = isAdmin ? '' : 'none'; 
        syncBadge.classList.toggle('cursor-pointer', isAdmin); 
      }
      
      const gateHint = document.querySelector('#gate-staff-hint [onclick*="modal-cloud-settings"]');
      if (gateHint) gateHint.classList.toggle('hidden', !!DEFAULT_FIREBASE_API_KEY);
      
      const b = document.getElementById('admin-instant-signin-btn');
      if (b) {
        b.classList.toggle('hidden', !isAdmin);
        b.classList.toggle('flex', isAdmin);
      }
      
      invalidateSubjectLockCache();
    }

    function bypassDemoLogin() {
      if (getRole() !== 'admin') return;      // only an admin who is already logged in can use it
      completeLoginSuccess({ email: SUB_CONFIG.adminEmail, displayName: "KALPESH H TAILOR", role: "Teacher / Examiner" });
    }
    function bypassGuestLogin() {
      if (typeof startGuestSession !== 'function') return alert('The guest module (js/catalog-guest.js) is missing on the website. Upload it to GitHub and refresh with Ctrl+Shift+R.');
      startGuestSession();      // js/catalog-guest.js : first two chapters only, the rest padlocked
    }

    function handleSignOutAction() {
      if (state.isGuest) { localStorage.removeItem(APP_AUTH_CACHE_KEY); location.reload(); return; }
      if (confirm('Are you sure you want to sign out of the portal?')) {
        if (state.cloudUser || (state.currentUser && String(state.currentUser.role || '').startsWith('staff'))) staffSignOutCleanup();
        localStorage.removeItem(APP_AUTH_CACHE_KEY);
        state.currentUser = null;
        stopLicenseWatch();
        updateAdminOnlyControls();
        refreshSubjectLocks();
        closeModal('modal-subscription-paywall');
        closeModal('modal-upi-pay');
        showAuthGate();
        switchGateTab('signin');
      }
    }

    function openForgotPasswordModal() {
      if (!SUB_CONFIG.allowLocalAccounts) return cloudPasswordReset();
      if (state.gateAuthTab === 'staff') return handleStaffPasswordReset();
      const emailEl = document.getElementById('gate-user-email');
      const forgotInput = document.getElementById('forgot-email-input');
      if (emailEl && forgotInput) forgotInput.value = emailEl.value;
      openModal('modal-forgot-password');
    }

    function handlePasswordReset() {
      if (!SUB_CONFIG.allowLocalAccounts) { closeModal('modal-forgot-password'); return cloudPasswordReset(document.getElementById('forgot-email-input').value); }
      const email = (document.getElementById('forgot-email-input').value || '').trim().toLowerCase();
      const newPass = (document.getElementById('forgot-new-password').value || '').trim();
      if (!email || !newPass) return alert('Please enter your email and new password.');
      if (newPass.length < 4) return alert('New password must be at least 4 characters.');
      if (isAdminEmail(email)) return alert('The administrator account has no password. Use the Instant Sign In button.');

      const users = safeParse(APP_USERS_REGISTRY_KEY, []);
      const idx = users.findIndex(u => u.email === email);
      if (idx === -1) return alert('No account found for this email on this device. Please sign up first.');
      users[idx].password = newPass;
      safeSet(APP_USERS_REGISTRY_KEY, users);
      closeModal('modal-forgot-password');
      alert('Password updated successfully! You can now log in.');
      document.getElementById('gate-user-password').value = newPass;
      document.getElementById('gate-user-email').value = email;
    }

    function checkCachedSession() {
      const user = safeParse(APP_AUTH_CACHE_KEY, null);
      // secure mode: a session saved in the browser is only trusted for Firebase (staff) logins, which are re-verified online
      const trusted = user && user.email && (SUB_CONFIG.allowLocalAccounts || String(user.role || '').startsWith('staff'));
      if (user && !trusted) localStorage.removeItem(APP_AUTH_CACHE_KEY);
      if (trusted) { completeLoginSuccess(user); return; }
      showAuthGate();
    }
    /* ========================= PWA ========================= */
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      state.deferredPrompt = e;
    });

    window.addEventListener('appinstalled', () => {
      state.deferredPrompt = null;
      const btn = document.getElementById('sidebar-install-btn');
      if (btn) btn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-emerald-900"></i><span>APP INSTALLED</span>`;
      alert('KT Maths Exam Suite installed successfully on your device!');
      if (window.lucide && lucide.createIcons) lucide.createIcons();
    });

    function triggerPwaInstall() {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      if (isStandalone) return alert('KT Maths Exam Suite is already running as an installed standalone app.');
      if (state.deferredPrompt) {
        state.deferredPrompt.prompt();
        state.deferredPrompt.userChoice.then(() => { state.deferredPrompt = null; });
      } else if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        alert("To Install on iPhone/iPad:\n1. Tap the Share button at the bottom of Safari.\n2. Tap 'Add to Home Screen'.");
      } else {
        alert("To Install:\n1. Open your browser menu (3 dots ⋮ at the top right).\n2. Tap 'Install app' or 'Add to Home screen'.");
      }
    }