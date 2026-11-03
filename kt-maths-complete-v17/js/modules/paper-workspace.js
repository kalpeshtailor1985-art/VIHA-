/* ========================= PAPER WORKSPACE ========================= */
    function renderLivePaper() {
      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
      const getVal = (id, def) => { const el = document.getElementById(id); return el ? el.value : def; };

      setTxt('view-school-name', getVal('paper-inst-name', ''));
      const schoolEl = document.getElementById('view-school-name');
      if (schoolEl) schoolEl.classList.toggle('hidden', !schoolEl.innerText.trim());      // no school name typed = nothing printed
      if (typeof applyWatermarkPreview === 'function') applyWatermarkPreview();
      setTxt('view-exam-title', getVal('paper-exam-title', 'FIRST TERM EXAMINATION'));
      setTxt('view-std', stdNumberOnly(getVal('paper-std', 'Std 10')));
      setTxt('view-sub', getVal('paper-sub', 'Mathematics'));
      setTxt('view-medium', getVal('paper-medium', 'Gujarati'));
      setTxt('view-time', getVal('paper-time', '2 Hours'));
      setTxt('view-marks', getVal('paper-marks', '50'));
      setTxt('view-instructions', getVal('paper-instructions', '1. All questions compulsory.'));

      const totalPaperMarks = state.livePaperQuestions.reduce((s, q) => s + (parseInt(q.marks) || 0), 0);
      setTxt('total-marks-badge', `Max: ${getVal('paper-marks', '50')} M • Paper: ${totalPaperMarks} M`);

      const container = document.getElementById('paper-sections-container');
      if (!container) return;
      container.innerHTML = '';

      if (state.livePaperQuestions.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-center py-10 italic">No questions added to current exam paper yet.</p>`;
        return;
      }

      let questionIndex = 1;
      getOrderedPaperSections().forEach((sec, secIdx) => {
        const secDiv = document.createElement('div');
        secDiv.className = "space-y-3 pt-2";
        secDiv.innerHTML = `
          <div class="border-y border-slate-900 py-1 font-bold text-center uppercase tracking-wider text-xs bg-slate-50 flex justify-between px-3">
            <span>${escapeHtml(sec.name)}</span><span>${escapeHtml(sectionLabel(sec.name) ? '(' + sectionLabel(sec.name) + ')' : '')}</span>
          </div>
          <div class="space-y-3.5 pt-1" id="sec-list-${secIdx}"></div>`;
        const listDiv = secDiv.querySelector(`#sec-list-${secIdx}`);

        sec.list.forEach(q => {
          const itemId = q.paperItemId || q.id;
          const qBox = document.createElement('div');
          qBox.className = "flex items-start justify-between text-xs leading-relaxed group";
          qBox.innerHTML = `
            <div class="flex-1 pr-3">
              <p class="font-normal text-slate-900"><span class="font-bold mr-1.5 font-mono">Q.${questionIndex}.</span><span>${escapeHtml(q.text)}</span></p>
              ${diagramHtml(q)}
              ${q.options ? formatInlineOptionsHtml(q.options) : ''}
              <div class="answer-key-box hidden mt-1.5 p-2 bg-emerald-50 border border-emerald-300 rounded text-[11px] font-bold text-emerald-900">Ans: ${escapeHtml(q.answer || 'Not provided')}</div>
            </div>
            <div class="flex items-center space-x-2">
              <span class="font-bold font-mono text-slate-800">[${escapeHtml(q.marks)}]</span>
              <div class="no-print flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                <button type="button" onclick="swapPaperQuestion('${itemId}')" title="Swap Question" class="p-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded cursor-pointer"><i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i></button>
                <button type="button" onclick="openEditModal('${itemId}', 'paper')" title="Edit Question" class="p-1 bg-blue-50 hover:bg-blue-100 text-brand-800 border border-blue-300 rounded cursor-pointer"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
                <button type="button" onclick="removePaperQuestion('${itemId}')" title="Remove" class="p-1 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
              </div>
            </div>`;
          listDiv.appendChild(qBox);
          questionIndex++;
        });
        container.appendChild(secDiv);
      });

      if (window.lucide && lucide.createIcons) lucide.createIcons();
      renderMath(container);
    }

    function savePaperLocal() { safeSet(APP_STORAGE_KEY_PAPER, state.livePaperQuestions); }

    function quickAddQuestionToPaper() {
  const sec = document.getElementById('quick-section').value;
  const text = document.getElementById('quick-q-text').value.trim();
  const options = document.getElementById('quick-q-options').value.trim();
  const ans = document.getElementById('quick-q-ans').value.trim();
  const marks = parseInt(document.getElementById('quick-q-marks').value) || 1;
  if (!text) return alert('Please enter question statement.');

  const uid = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  state.livePaperQuestions.push({
    id: 'q-' + uid, paperItemId: 'p-' + uid, bankType: 'GENERAL',
    std: document.getElementById('paper-std').value, subject: document.getElementById('paper-sub').value,
    chapter: 'General Topic', medium: document.getElementById('paper-medium').value,
    section: sec, marks, text, answer: ans, options, ...figureProps('quick')
  });
  savePaperLocal();
  renderLivePaper();

  // Clear text fields
  ['quick-q-text', 'quick-q-options', 'quick-q-ans'].forEach(id => { 
    const el = document.getElementById(id);
    if (el) el.value = ''; 
  });

  // Explicitly wipe the file input and clear preview
  const fileInput = document.getElementById('quick-q-diagram');
  if (fileInput) fileInput.value = '';
  clearDiagram('quick');
  if (typeof wordFillReset === 'function') wordFillReset('quick');
}

    function removePaperQuestion(itemId) {
      state.livePaperQuestions = state.livePaperQuestions.filter(q => (q.paperItemId || q.id) !== itemId);
      savePaperLocal();
      renderLivePaper();
    }

    function swapPaperQuestion(itemId) {
      const idx = state.livePaperQuestions.findIndex(q => (q.paperItemId || q.id) === itemId);
      if (idx === -1) return;
      const target = state.livePaperQuestions[idx];

      const paperKeys = new Set(state.livePaperQuestions.map(p => bulkQuestionKey(p)));
      let candidates = state.questions.filter(q =>
        q.id !== target.id && !paperKeys.has(bulkQuestionKey(q)) && q.bankType !== 'GUJCET' && q.bankType !== 'PREVYEAR' && !isSubjectLockedFast(q.subject, q) &&
        parseInt(q.marks) === parseInt(target.marks) &&
        q.subject === target.subject && q.std === target.std &&
        (!target.medium || !q.medium || q.medium === target.medium) &&
        !state.livePaperQuestions.some(p => p.id === q.id));

      if (candidates.length === 0) return alert('No alternative question found in the bank with the same standard, subject, medium and marks!');

      const sameChapter = candidates.filter(q => chapterMatches(q.chapter, target.chapter));
      if (sameChapter.length > 0) candidates = sameChapter;

      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      state.livePaperQuestions[idx] = { ...pick, paperItemId: target.paperItemId || ('p-' + Date.now()), section: target.section };
      savePaperLocal();
      renderLivePaper();
    }
    /* ========================= EXAM NAMES + MY SAVED WORK (per user, per exam folder) ========================= */
    const EXAM_TYPES = [
      { key: 'UNIT_TEST', name: 'UNIT TEST' },
      { key: 'FIRST_TERMINAL', name: 'FIRST TERMINAL EXAM' },
      { key: 'SECOND_TERMINAL', name: 'SECOND / PRELIMINARY TERMINAL EXAM' },
      { key: 'ANNUAL', name: 'ANNUAL EXAM' }
    ];
    const EXAM_UNSORTED_NAME = 'OLDER ITEMS (NO EXAM)';
    window._showAllWork = false;
    window._archExam = 'ALL';

    function examName(key) { const e = EXAM_TYPES.find(x => x.key === key); return e ? e.name : EXAM_UNSORTED_NAME; }
    function examFolderKey(item) { return EXAM_TYPES.some(e => e.key === item.exam) ? item.exam : 'UNSORTED'; }
    function getCurrentExamKey() { return document.getElementById('paper-exam-type')?.value || 'FIRST_TERMINAL'; }

    /* the full exam title printed on the paper = exam name + academic year */
    function syncExamTitle() {
      const year = (document.getElementById('paper-exam-year')?.value || '').trim();
      const hidden = document.getElementById('paper-exam-title');
      if (hidden) hidden.value = examName(getCurrentExamKey()) + (year ? ' - ' + year : '');
    }

    function onExamChange() {
      syncExamTitle();
      const m = document.getElementById('matrix-exam-type');
      if (m) m.value = getCurrentExamKey();
      if (typeof renderLivePaper === 'function') renderLivePaper();
    }

    function setCurrentExam(key) {
      const sel = document.getElementById('paper-exam-type');
      if (sel && EXAM_TYPES.some(e => e.key === key)) { sel.value = key; onExamChange(); }
    }
    function setExamFromMatrix(key) { setCurrentExam(key); }

    /* when a saved paper is opened: show its exam name / year in the controls */
    function applyExamTitleToControls(title, key) {
      const t = String(title || '').trim();
      let k = key;
      if (!k) { const hit = EXAM_TYPES.find(e => t.toUpperCase().startsWith(e.name)); k = hit ? hit.key : null; }
      const hidden = document.getElementById('paper-exam-title');
      if (k && EXAM_TYPES.some(e => e.key === k)) {
        document.getElementById('paper-exam-type').value = k;
        const ym = t.match(/(\d{4}\s*-\s*\d{2,4})\s*$/);
        const yr = document.getElementById('paper-exam-year');
        if (yr && ym) yr.value = ym[1].replace(/\s+/g, '');
        syncExamTitle();
        const m = document.getElementById('matrix-exam-type'); if (m) m.value = k;
      } else if (hidden) hidden.value = t;            // older paper with a free-text title: keep it as it was
    }

    /* ----- who owns saved work ----- */
    function currentOwner() {
      const u = state.currentUser || safeParse(APP_AUTH_CACHE_KEY, null);
      if (u && u.email) return String(u.email).toLowerCase().trim();
      return getRole() === 'guest' ? 'guest' : '';
    }

    /* a user sees only their own work; the admin also sees older items that have no owner (and everyone's, if switched on) */
    function workVisible(item) {
      if (!item) return false;
      if (getRole() === 'admin') return window._showAllWork === true || !item.owner || item.owner === currentOwner();
      const me = currentOwner();
      return !!me && item.owner === me;
    }
    function workIsMine(item) { return item.owner === currentOwner() || (!item.owner && getRole() === 'admin'); }

    function stampWork(item) {
      item.owner = currentOwner();
      item.ownerName = (state.currentUser && state.currentUser.displayName) || item.owner;
      item.exam = getCurrentExamKey();
      item.examName = examName(item.exam);
      item.pending = true;                              // until the cloud copy is confirmed
      return item;
    }

    function setShowAllWork(on) {
      window._showAllWork = !!on;
      document.querySelectorAll('.work-show-all-cb').forEach(c => { c.checked = !!on; });
      renderSavedBlueprintsList();
      renderArchiveList();
    }

    /* ----- cloud copy: userdata/{uid}/exams/{exam}/blueprints|papers/{id}  (readable only by that user and the admin) ----- */
    function persistWorkLocal() {
      safeSet(APP_STORAGE_KEY_SAVED_BLUEPRINTS, state.savedBlueprints);
      safeSet(APP_STORAGE_KEY_ARCHIVE, state.archivedPapers);
    }
    function cloudWorkRef(kind, item) {
      if (!firebaseDb || !state.cloudUser || !state.cloudUser.uid) return null;
      return firebaseDb.ref('userdata/' + state.cloudUser.uid + '/exams/' + examFolderKey(item) + '/' + kind + '/' + item.id);
    }
    function cloudSaveWork(kind, item) {
      const ref = cloudWorkRef(kind, item);
      if (!ref || item.owner !== currentOwner()) return;
      const clean = JSON.parse(JSON.stringify(item));
      delete clean.pending;
      ref.set(clean).then(() => { if (item.pending) { delete item.pending; persistWorkLocal(); } })
        .catch(e => console.warn('Saving to your cloud folder failed:', e && e.message));
    }
    function cloudRemoveWork(kind, item) {
      const ref = cloudWorkRef(kind, item);
      if (ref) ref.remove().catch(() => {});
    }

    /* cloud -> device: replaces this user's items with the cloud copies, uploads anything created while offline */
    function ingestUserWork(val) {
      const mine = currentOwner();
      if (!mine) return;
      const cb = [], cp = [];
      Object.keys(val || {}).forEach(ex => {
        const f = val[ex] || {};
        Object.keys(f.blueprints || {}).forEach(k => cb.push(f.blueprints[k]));
        Object.keys(f.papers || {}).forEach(k => cp.push(f.papers[k]));
      });
      const merge = (local, cloud, kind) => {
        const cloudIds = new Set(cloud.map(x => x.id));
        const keep = [];
        local.forEach(x => {
          if (x.owner !== mine) { keep.push(x); return; }          // other people's / older items stay untouched
          if (cloudIds.has(x.id)) return;                          // the cloud copy below replaces it
          if (x.pending) { cloudSaveWork(kind, x); keep.push(x); } // created offline: upload it
          // otherwise it was deleted on another device: drop it
        });
        return [...cloud.filter(Boolean), ...keep];
      };
      state.savedBlueprints = merge(state.savedBlueprints, cb, 'blueprints');
      state.archivedPapers = merge(state.archivedPapers, cp, 'papers');
      persistWorkLocal();
      renderSavedBlueprintsList();
      renderArchiveList();
    }

    /* admin only: blueprints saved in the old shared list become the admin's own */
    function ingestLegacySharedBlueprints(val) {
      if (!val || !isAdminCloud()) return;
      const legacy = (Array.isArray(val) ? val : Object.values(val)).filter(Boolean);
      let added = 0;
      legacy.forEach(b => {
        if (state.savedBlueprints.some(x => x.id === b.id)) return;
        const item = Object.assign({}, b, { owner: currentOwner(), exam: b.exam || '', pending: true });
        state.savedBlueprints.push(item);
        cloudSaveWork('blueprints', item);
        added++;
      });
      if (added) { persistWorkLocal(); renderSavedBlueprintsList(); renderArchiveList(); }
    }

    /* ----- cards ----- */
    function blueprintCardEl(bp) {
      const own = workIsMine(bp);
      const div = document.createElement('div');
      div.className = "p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 shadow-sm hover:border-brand-500 transition text-xs";
      div.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="font-bold text-brand-900 bg-blue-100 px-2 py-0.5 rounded text-[10px]">${escapeHtml(bp.std)}</span>
            <span class="font-mono text-slate-400 text-[10px]">${escapeHtml(bp.date)}</span>
          </div>
          <div>
            <h4 class="font-extrabold text-slate-900 truncate">${escapeHtml(bp.sub)}</h4>
            <div class="flex items-center space-x-2 mt-1 font-mono text-[10px] text-slate-600">
              <span class="font-bold text-emerald-800">W/O: ${escapeHtml(bp.totalMarksWo)}</span><span>•</span>
              <span class="font-bold text-emerald-600">With: ${escapeHtml(bp.totalMarksWith)}</span><span>•</span>
              <span>${(bp.rows || []).length} Chs</span>
            </div>
            ${own ? '' : `<p class="mt-1 text-[10px] text-amber-700 font-bold">By ${escapeHtml(bp.ownerName || bp.owner || '')}</p>`}
          </div>
          <div class="pt-2 border-t border-slate-200 flex items-center space-x-2">
            <button type="button" onclick="loadSavedBlueprint('${bp.id}')" class="flex-1 py-1.5 bg-brand-900 hover:bg-brand-800 text-white rounded font-bold text-[11px] cursor-pointer shadow flex items-center justify-center space-x-1">
              <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i><span>Restore to Matrix</span>
            </button>
            ${own ? `<button type="button" onclick="deleteSavedBlueprint('${bp.id}')" class="p-1.5 text-rose-600 hover:bg-rose-100 rounded cursor-pointer" title="Delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : ''}
          </div>`;
      return div;
    }

    function paperCardEl(item) {
      const own = workIsMine(item);
      const div = document.createElement('div');
      div.className = "p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3 flex flex-col justify-between text-xs";
      div.innerHTML = `
          <div>
            <div class="flex items-center justify-between text-[11px] mb-1">
              <span class="font-bold text-brand-900 bg-blue-100 px-2 py-0.5 rounded">${escapeHtml(item.std)}</span>
              <span class="font-mono text-slate-500">${escapeHtml(item.date)}</span>
            </div>
            <h4 class="font-extrabold text-slate-800">${escapeHtml(item.title)}</h4>
            <p class="text-slate-600 mt-1 font-semibold">${escapeHtml(item.sub)}</p>
            ${own ? '' : `<p class="mt-1 text-[10px] text-amber-700 font-bold">By ${escapeHtml(item.ownerName || item.owner || '')}</p>`}
          </div>
          <div class="pt-2 border-t border-slate-200 flex items-center space-x-2">
            <button type="button" onclick="loadArchivedPaper('${item.id}')" class="flex-1 py-1.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-xs font-bold cursor-pointer">Load Paper</button>
            ${own ? `<button type="button" onclick="deleteArchivedPaper('${item.id}')" class="p-1.5 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : ''}
          </div>`;
      return div;
    }

    function folderHeading(key, n) {
      return `<div class="col-span-full flex items-center gap-2 text-[11px] font-black text-slate-700 pt-1"><i data-lucide="folder-open" class="w-4 h-4 text-amber-600"></i>${escapeHtml(examName(key))} <span class="font-mono text-slate-400">(${n})</span></div>`;
    }

    function renderSavedBlueprintsList() {
      const container = document.getElementById('saved-blueprints-grid');
      const badge = document.getElementById('saved-bp-count-badge');
      if (!container) return;
      const f = document.getElementById('bp-exam-filter')?.value || 'ALL';
      const mine = state.savedBlueprints.filter(workVisible);
      if (badge) badge.innerText = `${mine.length} Saved`;
      container.innerHTML = '';
      if (mine.length === 0) {
        container.innerHTML = `<div class="col-span-full p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400">No saved blueprints found. Choose the exam, then click "Save Blueprint" above.</div>`;
        return;
      }
      EXAM_TYPES.map(e => e.key).concat('UNSORTED').forEach(k => {
        if (f !== 'ALL' && f !== k) return;
        const list = mine.filter(b => examFolderKey(b) === k);
        if (!list.length) return;
        container.insertAdjacentHTML('beforeend', folderHeading(k, list.length));
        list.forEach(bp => container.appendChild(blueprintCardEl(bp)));
      });
      if (window.lucide && lucide.createIcons) lucide.createIcons();
    }

    function setArchiveExam(k) { window._archExam = k; renderArchiveList(); }

    /* My Saved Work: one folder per exam, each with a Blueprints folder and a Papers folder */
    function renderArchiveList() {
      const container = document.getElementById('archive-list-container');
      const chips = document.getElementById('archive-exam-chips');
      if (!container) return;
      const bps = state.savedBlueprints.filter(workVisible);
      const papers = state.archivedPapers.filter(workVisible);
      const all = bps.concat(papers);
      const sel = window._archExam || 'ALL';
      const keys = EXAM_TYPES.map(e => e.key).concat('UNSORTED');
      if (chips) {
        const chip = (k, label, n) => `<button type="button" onclick="setArchiveExam('${k}')" class="px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer ${sel === k ? 'bg-brand-900 text-white border-brand-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}">${escapeHtml(label)} <span class="font-mono opacity-70">(${n})</span></button>`;
        chips.innerHTML = chip('ALL', 'ALL EXAMS', all.length) +
          keys.filter(k => k !== 'UNSORTED' || all.some(x => examFolderKey(x) === 'UNSORTED'))
              .map(k => chip(k, examName(k), all.filter(x => examFolderKey(x) === k).length)).join('');
      }
      container.innerHTML = '';
      if (all.length === 0) {
        container.innerHTML = `<p class="col-span-full text-slate-400 text-center py-8 text-xs italic">Nothing saved yet. Pick an exam name, then use "Save Blueprint" (Blueprint tab) or "Save to Archive" (Paper tab).</p>`;
        return;
      }
      keys.forEach(k => {
        if (sel !== 'ALL' && sel !== k) return;
        const b = bps.filter(x => examFolderKey(x) === k), p = papers.filter(x => examFolderKey(x) === k);
        if (!b.length && !p.length && sel === 'ALL') return;
        const block = document.createElement('div');
        block.className = 'col-span-full space-y-3';
        const empty = '<p class="text-[11px] text-slate-400 italic">Nothing saved here yet.</p>';
        block.innerHTML = `
          <h3 class="flex items-center gap-2 text-sm font-black text-slate-800"><i data-lucide="folder-open" class="w-4 h-4 text-amber-600"></i>${escapeHtml(examName(k))}</h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="space-y-2"><h4 class="text-[11px] font-black text-blue-800 uppercase tracking-wide">Blueprints folder (${b.length})</h4><div data-f="bp" class="space-y-3">${b.length ? '' : empty}</div></div>
            <div class="space-y-2"><h4 class="text-[11px] font-black text-emerald-800 uppercase tracking-wide">Papers folder (${p.length})</h4><div data-f="pp" class="space-y-3">${p.length ? '' : empty}</div></div>
          </div>`;
        const bpBox = block.querySelector('[data-f="bp"]'), ppBox = block.querySelector('[data-f="pp"]');
        b.forEach(x => bpBox.appendChild(blueprintCardEl(x)));
        p.forEach(x => ppBox.appendChild(paperCardEl(x)));
        container.appendChild(block);
      });
      if (window.lucide && lucide.createIcons) lucide.createIcons();
    }

    document.addEventListener('DOMContentLoaded', () => { syncExamTitle(); const m = document.getElementById('matrix-exam-type'); if (m) m.value = getCurrentExamKey(); });

    /* ========================= ARCHIVE ========================= */
    function savePaperToArchive() {
      if (state.livePaperQuestions.length === 0) return alert('Current paper has no questions to save.');
      syncExamTitle();
      const paperItem = stampWork({
        id: 'arch-' + Date.now(),
        date: new Date().toLocaleDateString(),
        school: document.getElementById('paper-inst-name').value,
        title: document.getElementById('paper-exam-title').value,
        std: document.getElementById('paper-std').value,
        sub: document.getElementById('paper-sub').value,
        med: document.getElementById('paper-medium').value,
        marks: document.getElementById('paper-marks').value,
        time: document.getElementById('paper-time').value,
        instructions: document.getElementById('paper-instructions').value,
        questions: clone(state.livePaperQuestions)
      });
      state.archivedPapers.unshift(paperItem);
      persistQuestions('none');
      renderArchiveList();
      cloudSaveWork('papers', paperItem);
      alert(`Paper saved in "${examName(paperItem.exam)}" > Papers folder.`);
    }

    function loadArchivedPaper(id) {
      const item = state.archivedPapers.find(a => a.id === id);
      if (!item || !workVisible(item)) return;
      state.livePaperQuestions = clone(item.questions);
      savePaperLocal();
      document.getElementById('paper-inst-name').value = item.school;
      applyExamTitleToControls(item.title, item.exam);
      document.getElementById('paper-std').value = item.std;
      syncSubjectDropdown('paper-std', 'paper-sub');
      document.getElementById('paper-sub').value = item.sub;
      document.getElementById('paper-medium').value = item.med;
      document.getElementById('paper-marks').value = item.marks;
      document.getElementById('paper-time').value = item.time;
      if (item.instructions) document.getElementById('paper-instructions').value = item.instructions;
      renderLivePaper();
      switchTab('tab-generator');
    }

    function deleteArchivedPaper(id) {
      const item = state.archivedPapers.find(a => a.id === id);
      if (!item || !workIsMine(item)) return;
      if (confirm('Delete this paper from your folder?')) {
        cloudRemoveWork('papers', item);
        state.archivedPapers = state.archivedPapers.filter(a => a.id !== id);
        persistQuestions('none');
        renderArchiveList();
      }
    }

    /* clears only the papers that belong to the signed-in user */
    function clearAllArchivedPapers() {
      if (confirm('Delete ALL of your saved papers (every exam folder)?')) {
        state.archivedPapers.filter(workIsMine).forEach(a => cloudRemoveWork('papers', a));
        state.archivedPapers = state.archivedPapers.filter(a => !workIsMine(a));
        persistQuestions('none');
        renderArchiveList();
      }
    }

    /* shows only the standard number: "Std 10" -> "10", "Std 11 Science" -> "11" (GUJCET stays as it is) */
    function stdNumberOnly(std) {
      const m = String(std || '').match(/\d{1,2}/);
      return m ? m[0] : String(std || '').replace(/^\s*std\.?\s*/i, '').trim();
    }

    /* "KALPESHTAILOR1985" (made from an e-mail address) -> "KALPESH TAILOR" */
    function cleanDisplayName(name) {
      let n = String(name || '').trim();
      if (/^kalpesh\s*tailor\d*$/i.test(n)) return 'KALPESH TAILOR';
      if (/^[A-Za-z]+\d+$/.test(n)) n = n.replace(/\d+$/, '');
      return n;
    }

    /* ========================= WATERMARK + SCHOOL LOGO + PAGE FRAME ========================= */
    const WM_KEY = 'KT_MATHS_WATERMARK_V1';
    const WM_DEFAULT = { on: true, text: '', size: 48, opacity: 8, angle: -30 };
    const SCHOOL_LOGO_KEY = 'KT_MATHS_SCHOOL_LOGO_V1';

    function getWatermarkSettings() {
      const v = Object.assign({}, WM_DEFAULT, safeParse(WM_KEY, {}) || {});
      v.size = Math.min(Math.max(parseInt(v.size, 10) || WM_DEFAULT.size, 20), 120);
      v.opacity = Math.min(Math.max(parseInt(v.opacity, 10) || WM_DEFAULT.opacity, 3), 40);
      v.angle = Math.min(Math.max(parseInt(v.angle, 10) || 0, -90), 90);
      v.on = !!v.on; v.text = String(v.text || '');
      return v;
    }

    function getWatermarkText(wm) {
      wm = wm || getWatermarkSettings();
      if (!wm.on) return '';
      return wm.text.trim() || (document.getElementById('paper-inst-name')?.value || '').trim().toUpperCase();
    }

    /* faint preview on the on-screen paper */
    function applyWatermarkPreview() {
      const wm = getWatermarkSettings();
      const r = document.documentElement.style;
      r.setProperty('--wm-text', JSON.stringify(getWatermarkText(wm)));
      r.setProperty('--wm-pt', wm.size);
      r.setProperty('--wm-alpha', (wm.opacity / 100).toFixed(3));
      r.setProperty('--wm-angle', wm.angle + 'deg');
    }

    function openWatermarkModal() {
      const wm = getWatermarkSettings();
      document.getElementById('wm-on').checked = wm.on;
      document.getElementById('wm-text').value = wm.text;
      document.getElementById('wm-size').value = wm.size;
      document.getElementById('wm-opacity').value = wm.opacity;
      document.getElementById('wm-angle').value = wm.angle;
      onWatermarkChange(true);
      openModal('modal-watermark');
    }

    function onWatermarkChange(skipSave) {
      const wm = {
        on: document.getElementById('wm-on').checked,
        text: document.getElementById('wm-text').value,
        size: parseInt(document.getElementById('wm-size').value, 10),
        opacity: parseInt(document.getElementById('wm-opacity').value, 10),
        angle: parseInt(document.getElementById('wm-angle').value, 10)
      };
      document.getElementById('wm-size-val').innerText = wm.size + ' pt';
      document.getElementById('wm-opacity-val').innerText = wm.opacity + ' %';
      document.getElementById('wm-angle-val').innerText = wm.angle + '°';
      if (skipSave !== true) safeSet(WM_KEY, wm);
      applyWatermarkPreview();
    }

    function setWatermarkPreset(text) {
      document.getElementById('wm-text').value = text;
      document.getElementById('wm-on').checked = true;
      onWatermarkChange();
    }

    function resetWatermark() {
      safeSet(WM_KEY, WM_DEFAULT);
      openWatermarkModal();
    }

    /* ---- school logo ---- */
    function getSchoolLogo() {
      try { return localStorage.getItem(SCHOOL_LOGO_KEY) || ''; } catch (e) { return ''; }
    }

    function schoolLogoHtml(heightPx) {
      const logo = getSchoolLogo();
      return logo ? `<img src="${logo}" alt="School logo" style="height:${heightPx}px;width:auto;max-width:${heightPx * 2}px;object-fit:contain;vertical-align:middle;margin-right:10px;">` : '';
    }

    function applySchoolLogo() {
      const logo = getSchoolLogo();
      const view = document.getElementById('view-school-logo');
      const prev = document.getElementById('school-logo-preview');
      const rem = document.getElementById('school-logo-remove');
      if (view) { if (logo) { view.src = logo; view.classList.remove('hidden'); } else { view.removeAttribute('src'); view.classList.add('hidden'); } }
      if (prev) { if (logo) { prev.src = logo; prev.classList.remove('hidden'); } else { prev.removeAttribute('src'); prev.classList.add('hidden'); } }
      if (rem) rem.classList.toggle('hidden', !logo);
    }

    function handleSchoolLogoUpload(event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!file) return;
      if (!/^image\//.test(file.type)) return alert('Please choose an image file (JPG, PNG or WebP).');
      compressImageBlob(file).then(r => { safeSet(SCHOOL_LOGO_KEY, r.dataUrl); applySchoolLogo(); }).catch(e => alert(e.message));
    }

    function removeSchoolLogo() {
      try { localStorage.removeItem(SCHOOL_LOGO_KEY); } catch (e) {}
      applySchoolLogo();
    }

    /* wraps printable HTML so that EVERY page gets the full border, the watermark and the logo */
    function wrapPrintSheet(contentHtml, opts) {
      const wm = getWatermarkSettings();
      const text = (opts && opts.noWatermark) ? '' : getWatermarkText(wm);
      const wmHtml = text
        ? `<div class="print-wm" style="font-size:${wm.size}pt;color:rgba(0,0,0,${(wm.opacity / 100).toFixed(3)});transform:translate(-50%,-50%) rotate(${wm.angle}deg);">${escapeHtml(text)}</div>`
        : '';
      return `<div class="print-frame"></div>${wmHtml}
        <table class="print-sheet"><thead><tr><td><div class="ps-space"></div></td></tr></thead>
          <tbody><tr><td class="ps-body">${contentHtml}</td></tr></tbody>
          <tfoot><tr><td><div class="ps-space"></div></td></tr></tfoot></table>`;
    }

    document.addEventListener('DOMContentLoaded', () => { applySchoolLogo(); applyWatermarkPreview(); refreshComingSoon(); const lk = document.getElementById('paywall-license-key-box'); if (lk && SUB_CONFIG.enableLicenseKeys) lk.classList.remove('hidden'); });

    /* ========================= OMR ANSWER SHEET ========================= */
    function openOmrModal() {
      const el = id => document.getElementById(id);
      const val = id => (el(id)?.value || '').trim();
      const isG = getActiveTabId() === 'tab-gujcet';
      const d = new Date();
      const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      let qn;
      if (isG) qn = state.gujcetPaperQuestions.length || 40;
      else qn = state.livePaperQuestions.filter(q => (q.options || '').trim()).length || 20;
      el('omr-school').value = val('paper-inst-name');
      el('omr-title').value = isG ? 'GUJCET PRACTICE EXAMINATION' : val('paper-exam-title');
      el('omr-std').value = isG ? 'GUJCET' : stdNumberOnly(val('paper-std'));
      el('omr-sub').value = isG ? val('gujcet-subject') : val('paper-sub');
      el('omr-med').value = isG ? val('gujcet-medium') : val('paper-medium');
      el('omr-time').value = isG ? val('gujcet-time') : val('paper-time');
      el('omr-marks').value = isG ? String(qn) : val('paper-marks');
      el('omr-date').value = iso;
      el('omr-qcount').value = Math.min(qn, 100);
      openModal('modal-omr');
    }

    function buildOmrSheetHtml(c) {
      const letters = 'ABCDE'.slice(0, c.opts).split('');
      const e = escapeHtml;
      const bub = (label, size, mr, filled) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}mm;height:${size}mm;border:${filled ? (size / 2).toFixed(2) + 'mm' : '1.2px'} solid #000;border-radius:50%;box-sizing:border-box;font-size:${size > 5 ? 7 : 6.5}pt;font-weight:bold;margin-right:${mr}mm;flex:none;${filled ? 'color:transparent;' : ''}">${label}</span>`;
      // scanner marks (solid shapes drawn with borders so they print even without "background graphics")
      const tmark = '<span style="display:inline-block;flex:none;width:0;height:0;border:0.8mm solid #000;border-left-width:1.5mm;border-right-width:1.5mm;"></span>';
      const corner = pos => `<div style="position:fixed;${pos}width:0;height:0;border:2mm solid #000;z-index:6;"></div>`;
      const dateTxt = c.date ? c.date.split('-').reverse().join('/') : '';

      // answer grid (numbered down each column)
      const n = c.qcount;
      const cols = (n > 60 && c.opts <= 4) ? 5 : 4;
      const rows = Math.ceil(n / cols);
      const rowH = rows > 20 ? 6.4 : 7.2;
      let grid = '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>';
      for (let col = 0; col < cols; col++) {
        grid += `<td style="vertical-align:top;padding:0 2mm;${col < cols - 1 ? 'border-right:1px solid #999;' : ''}">`;
        for (let r = 0; r < rows; r++) {
          const q = col * rows + r + 1;
          const tmL = (c.scan && col === 0) ? tmark.replace('flex:none;', 'flex:none;margin-right:1.5mm;') : '';
          const tmR = (c.scan && col === cols - 1) ? tmark.replace('flex:none;', 'flex:none;margin-left:auto;') : '';
          if (q > n) {
            if (c.scan && col === cols - 1) { grid += `<div style="display:flex;align-items:center;height:${rowH}mm;">${tmR}</div>`; continue; }   // keep the right timing track complete
            break;
          }
          grid += `<div style="display:flex;align-items:center;height:${rowH}mm;">${tmL}<b style="width:8mm;font-size:9pt;text-align:right;margin-right:2mm;flex:none;">${q}.</b>${letters.map(L => bub(L, 4.8, 1.4, !!(c.key && c.key[q - 1] === L))).join('')}${tmR}</div>`;
        }
        grid += '</td>';
      }
      grid += '</tr></table>';

      // roll number bubbles (4 digits)
      let roll = '';
      if (c.roll) {
        roll = '<div style="display:flex;gap:1.6mm;">';
        for (let k = 0; k < 4; k++) {
          roll += '<div><div style="width:6mm;height:6.5mm;border:1.2px solid #000;margin-bottom:1.5mm;box-sizing:border-box;"></div>';
          for (let dgt = 0; dgt <= 9; dgt++) roll += `<div style="margin-bottom:0.9mm;">${bub(dgt, 4.6, 0)}</div>`;
          roll += '</div>';
        }
        roll += '</div>';
      }

      const lbl = 'font-size:9pt;font-weight:bold;';
      const cell = 'padding:2mm 2.5mm;border:1px solid #000;font-size:9.5pt;';
      const keyCount = c.key ? c.key.filter(Boolean).length : 0;
      return `<div style="font-family:'Cambria','Georgia',serif;color:#000;">
        ${c.scan ? corner('top:9mm;left:9mm;') + corner('top:9mm;right:9mm;') + corner('bottom:9mm;left:9mm;') + corner('bottom:9mm;right:9mm;') : ''}
        <div style="text-align:center;">
          <div style="font-size:15pt;font-weight:800;text-transform:uppercase;">${schoolLogoHtml(44)}${e(c.school)}</div>
          <div style="font-size:11.5pt;font-weight:700;margin-top:1mm;">${c.key ? 'OMR ANSWER KEY (TEACHER COPY)' : 'OMR ANSWER SHEET'}${c.title ? ' - ' + e(c.title) : ''}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:3mm;">
          <tr><td style="${cell}" colspan="2"><span style="${lbl}">STD:</span> ${e(c.std)}</td><td style="${cell}" colspan="2"><span style="${lbl}">SUBJECT:</span> ${e(c.sub)}</td><td style="${cell}" colspan="2"><span style="${lbl}">MEDIUM:</span> ${e(c.med)}</td></tr>
          <tr><td style="${cell}" colspan="2"><span style="${lbl}">DATE:</span> ${e(dateTxt)}</td><td style="${cell}" colspan="2"><span style="${lbl}">MAX MARKS:</span> ${e(c.marks)}</td><td style="${cell}" colspan="2"><span style="${lbl}">TIME:</span> ${e(c.time)}</td></tr>
        </table>
        <table style="width:100%;border-collapse:collapse;margin-top:3mm;table-layout:fixed;">
          <tr>
            <td style="vertical-align:top;padding-right:4mm;">
              <div style="${lbl}margin-bottom:1mm;">STUDENT NAME:</div>
              <div style="border-bottom:1px solid #000;height:7mm;margin-bottom:3mm;"></div>
              <div style="display:flex;gap:4mm;">
                <div style="flex:1;"><div style="${lbl}margin-bottom:1mm;">ROLL NO.:</div><div style="border-bottom:1px solid #000;height:7mm;"></div></div>
                <div style="flex:1;"><div style="${lbl}margin-bottom:1mm;">DIVISION:</div><div style="border-bottom:1px solid #000;height:7mm;"></div></div>
              </div>
              <div style="display:flex;gap:4mm;margin-top:4mm;">
                <div style="flex:1;"><div style="${lbl}margin-bottom:1mm;">STUDENT SIGN:</div><div style="border-bottom:1px solid #000;height:7mm;"></div></div>
                <div style="flex:1;"><div style="${lbl}margin-bottom:1mm;">INVIGILATOR SIGN:</div><div style="border-bottom:1px solid #000;height:7mm;"></div></div>
              </div>
            </td>
            ${c.roll ? `<td style="width:34mm;vertical-align:top;border-left:1px solid #999;border-right:1px solid #999;padding:0 3mm;"><div style="${lbl}text-align:center;margin-bottom:1.5mm;">ROLL NO. BUBBLES</div>${roll}</td>` : ''}
            <td style="width:${c.roll ? 58 : 80}mm;vertical-align:top;padding-left:4mm;font-size:8.5pt;line-height:1.35;">
              <div style="${lbl}margin-bottom:1mm;">INSTRUCTIONS</div>
              1. Use only a blue / black ball pen.<br>
              2. Darken the circle completely.<br>
              3. Mark only ONE circle per question.<br>
              4. Do not tear, fold or make stray marks.<br>
              5. Answers cannot be changed once marked.
              <div style="display:flex;align-items:center;gap:2mm;margin-top:2mm;font-size:8pt;">
                <b>Right:</b>${bub('', 4.8, 0, true)}
                <b>Wrong:</b>${bub('&#10003;', 4.8, 0)}${bub('&#10005;', 4.8, 0)}
              </div>
            </td>
          </tr>
        </table>
        <div style="margin-top:4mm;border-top:2px solid #000;padding-top:2mm;">
          <div style="${lbl}text-align:center;margin-bottom:2mm;">ANSWERS - ${n} QUESTION${n > 1 ? 'S' : ''}</div>
          ${grid}
        </div>
        <div style="margin-top:4mm;border:1.2px solid #000;padding:2mm 3mm;font-size:9pt;page-break-inside:avoid;">
          <b>FOR OFFICE USE ONLY (MANUAL CHECKING)</b>${c.key ? ` &nbsp;-&nbsp; Answer key: ${keyCount} of ${n} questions have a saved answer` : ''}
          <div style="display:flex;gap:5mm;margin-top:3mm;align-items:flex-end;">
            <span>Correct: ______</span><span>Wrong: ______</span><span>Not attempted: ______</span>
            <span>Marks obtained: ______ / ${e(c.marks)}</span><span style="margin-left:auto;">Checked by: ____________</span>
          </div>
        </div>
      </div>`;
    }

    /* correct option letter for each OMR question, taken from the saved answers (MCQs in paper order) */
    function omrKeyLetters(isG, n, optCount) {
      const allowed = 'ABCDE'.slice(0, optCount);
      const list = isG ? state.gujcetPaperQuestions : getOrderedPaperSections().flatMap(sec => sec.list).filter(q => (q.options || '').trim());
      return Array.from({ length: n }, (_, i) => {
        const q = list[i];
        if (!q) return '';
        const m = String(q.answer || '').toUpperCase().match(/(?:^|[^A-Z])\(?([A-E])\)?(?![A-Z])/);
        return (m && allowed.includes(m[1])) ? m[1] : '';
      });
    }

    function printOmrSheet(isKey) {
      const v = id => (document.getElementById(id)?.value || '').trim();
      const qcount = parseInt(v('omr-qcount'), 10);
      if (!qcount || qcount < 1) return alert('Please enter the number of questions.');
      const cfg = {
        school: v('omr-school'), title: v('omr-title'), std: v('omr-std'), sub: v('omr-sub'), med: v('omr-med'),
        date: v('omr-date'), marks: v('omr-marks'), time: v('omr-time'),
        qcount: Math.min(qcount, 100), opts: parseInt(v('omr-opts'), 10) || 4,
        roll: !!document.getElementById('omr-roll')?.checked,
        scan: !!document.getElementById('omr-scan')?.checked,
        key: null
      };
      if (isKey === true) {
        cfg.key = omrKeyLetters(getActiveTabId() === 'tab-gujcet', cfg.qcount, cfg.opts);
        if (!cfg.key.some(Boolean)) return alert('No saved answers were found for the questions of the open paper, so an answer key cannot be filled. Add the answers to the questions first.');
      }
      closeModal('modal-omr');
      executeDirectPrint(`<div class="print-page-box">${buildOmrSheetHtml(cfg)}</div>`, { noWatermark: true });
    }

    /* ========================= EXPORT & PRINT ========================= */
    function buildGsebWordBody() {
      const g = id => escapeHtml(document.getElementById(id)?.value || '');
      let html = `
        <div style="text-align:center;"><h2 style="margin:0;text-transform:uppercase;">${schoolLogoHtml(44)}${g('paper-inst-name')}</h2>
        <h4 style="margin:2px 0 6px 0;">${g('paper-exam-title')}</h4></div>
        <table width="100%" style="border-top:1px solid #000;border-bottom:1px solid #000;font-size:10pt;border-collapse:collapse;"><tr>
          <td>STD: <b>${stdNumberOnly(g('paper-std'))}</b></td><td>SUBJECT: <b>${g('paper-sub')}</b></td>
          <td>MEDIUM: <b>${g('paper-medium')}</b></td>
          <td align="right">TIME: <b>${g('paper-time')}</b> | MARKS: <b>${g('paper-marks')}</b></td></tr></table>
        <p style="font-size:10pt;"><i><b>General Instructions:</b> ${g('paper-instructions')}</i></p>`;

      let n = 1;
      getOrderedPaperSections().forEach(sec => {
        html += `<table width="100%" style="border-top:1px solid #000;border-bottom:1px solid #000;margin:10px 0 4px 0;border-collapse:collapse;"><tr>
          <td style="font-weight:bold;">${escapeHtml(sec.name)}</td><td align="right" style="font-weight:bold;">${escapeHtml(sectionLabel(sec.name))}</td></tr></table>`;
        sec.list.forEach(q => {
          const opts = splitOptions(q.options).map(o => escapeHtml(o)).join('&nbsp;&nbsp;&nbsp;&nbsp;');
          html += `<table width="100%" style="border-collapse:collapse;margin-bottom:6px;"><tr>
            <td valign="top" style="font-size:11pt;"><b>Q.${n}.</b> ${escapeHtml(q.text)}${q.diagram ? `<br/>${figureImgTag(q, 420)}` : ''}${opts ? `<br/><span style="font-size:10pt;">&nbsp;&nbsp;&nbsp;&nbsp;${opts}</span>` : ''}</td>
            <td valign="top" align="right" width="40" style="font-size:11pt;"><b>[${escapeHtml(q.marks)}]</b></td></tr></table>`;
          n++;
        });
      });
      html += `<p style="margin-top:30px;font-size:10pt;">Subject Teacher: <b>KALPESH H TAILOR</b> (M.Sc, B.Ed, GSET Maths) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Principal / Examiner: ____________</p>`;
      return html;
    }

    // Word export: pictures are packed as real attachments (MHTML), because Word ignores inline base64 images
    function utf8ToB64(str) {
      const bytes = new TextEncoder().encode(str);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    }
    function wrap76(b64) { return b64.replace(/(.{76})/g, '$1\r\n'); }

    function buildMhtmlDoc(title, bodyHtml) {
      const images = [];
      const base = 'file:///C:/ktmaths/';
      const html = bodyHtml.replace(/src="data:image\/(jpeg|png|gif|webp);base64,([A-Za-z0-9+\/=]+)"/g, (m, ext, b64) => {
        const e = ext === 'jpeg' ? 'jpg' : ext;
        const loc = `img${images.length + 1}.${e}`;
        images.push({ loc, mime: 'image/' + ext, b64 });
        return `src="${base}${loc}"`;
      });
      /* Word page border (repeats on every page) - Word reads it from the @page rule */

      /* Word watermark: a text shape placed in the page header, so it repeats on every page behind the text */
      const wm = (typeof getWatermarkSettings === 'function') ? getWatermarkSettings() : null;
      const wmText = wm ? getWatermarkText(wm) : '';
      let headerDiv = '';
      if (wmText) {
        const chars = Math.max(wmText.length, 1);
        let wPt = chars * wm.size * 0.62, hPt = wm.size * 1.25;
        if (wPt > 480) { hPt = hPt * 480 / wPt; wPt = 480; }
        const rot = ((wm.angle % 360) + 360) % 360;
        const op = Math.min(Math.max(wm.opacity / 100, 0.02), 0.6).toFixed(2);
        headerDiv = `<div style='mso-element:header' id=h1><p class=MsoHeader style='margin:0'><span style='mso-no-proof:yes'><!--[if gte vml 1]><v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e"><v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/><v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/><v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/><v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/><v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas><v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/><v:textpath on="t" fitshape="t"/><v:handles><v:h position="#0,bottomRight" xrange="6629,14971"/></v:handles><o:lock v:ext="edit" text="t" shapetype="t"/></v:shapetype><v:shape id="PowerPlusWaterMarkObject1" o:spid="_x0000_s2049" type="#_x0000_t136" style='position:absolute;margin-left:0;margin-top:0;width:${wPt.toFixed(1)}pt;height:${hPt.toFixed(1)}pt;rotation:${rot};z-index:-251658752;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin' o:allowincell="f" fillcolor="black" stroked="f"><v:fill opacity="${op}"/><v:textpath style='font-family:"Cambria";font-size:1pt;font-weight:bold' string="${escapeHtml(wmText)}"/></v:shape><![endif]--></span></p></div>`;
      }

      const pageCss = `@page WordSection1 { size:595.3pt 841.9pt; margin:42pt 42pt 42pt 42pt;
        border:solid windowtext 1.5pt; mso-border-alt:solid windowtext 1.5pt; padding:12pt 12pt 12pt 12pt;
        mso-header-margin:20pt; mso-footer-margin:20pt;${headerDiv ? ' mso-header:h1;' : ''} }
        div.WordSection1 { page:WordSection1; }`;

      const full = `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>${pageCss} body{font-family:'Cambria',serif;font-size:11pt;color:#000;}</style></head>
<body><div class="WordSection1">${html}</div>${headerDiv}</body></html>`;
      const boundary = '----=_NextPart_KTMATHS_' + Date.now();
      let mht = 'MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="' + boundary + '"; type="text/html"\r\n\r\n';
      mht += '--' + boundary + '\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\nContent-Location: ' + base + 'paper.htm\r\n\r\n' + wrap76(utf8ToB64(full)) + '\r\n\r\n';
      images.forEach(im => {
        mht += '--' + boundary + '\r\nContent-Type: ' + im.mime + '\r\nContent-Transfer-Encoding: base64\r\nContent-Location: ' + base + im.loc + '\r\n\r\n' + wrap76(im.b64) + '\r\n\r\n';
      });
      return mht + '--' + boundary + '--\r\n';
    }

    function exportToWordDoc() {
      const isGujcet = getActiveTabId() === 'tab-gujcet';
      const body = isGujcet ? buildGujcetHtml(false) : buildGsebWordBody();
      const rawTitle = isGujcet ? 'GUJCET_Paper' : (document.getElementById('paper-exam-title').value || 'Exam_Paper');
      downloadBlob(new Blob([buildMhtmlDoc(rawTitle, body)], { type: 'application/msword' }), `${rawTitle.replace(/[^a-zA-Z0-9]+/g, '_')}.doc`);
    }

    function savePaperAsPdf() { printStandardPaper(); }

    function executeDirectPrint(contentHtml, opts) {
      const zone = document.getElementById('print-zone');
      if (!zone) return;
      zone.innerHTML = wrapPrintSheet(contentHtml, opts);
      zone.classList.remove('hidden');

      const cleanup = () => {
        zone.classList.add('hidden');
        zone.innerHTML = '';
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      // wait for MathJax to finish typesetting before opening the print dialog
      renderMath(zone, () => setTimeout(() => window.print(), 200));
    }

    function printPaper(withAnswers) {
      if (getActiveTabId() === 'tab-gujcet') {
        executeDirectPrint(`<div class="print-page-box">${buildGujcetHtml(withAnswers)}</div>`);
        return;
      }
      const canvas = document.getElementById('printable-paper');
      if (!canvas) return;
      const c = canvas.cloneNode(true);
      c.querySelectorAll('.no-print').forEach(el => el.remove());
      if (withAnswers) c.querySelectorAll('.answer-key-box').forEach(el => el.classList.remove('hidden'));
      else c.querySelectorAll('.answer-key-box').forEach(el => el.remove());
      executeDirectPrint(`<div class="print-page-box">${c.innerHTML}</div>`);
    }
    function printStandardPaper() { printPaper(false); }
    function printPaperWithAnswers() { printPaper(true); }

    function printBlueprintMatrix() {
      recalculateMatrix();
      const school = document.getElementById('paper-inst-name').value;
      const std = document.getElementById('matrix-filter-std').value;
      const sub = document.getElementById('matrix-filter-sub').value;
      const w = getMatrixWeights();
      const td = (v, extra = '') => `<td style="padding:4px;border:1px solid #000;${extra}">${v}</td>`;

      let rows = '';
      getFilteredMatrixRows().forEach((r, idx) => {
        const t = rowTotals(r, w);
        rows += `<tr style="text-align:center;font-size:8pt;">
          ${td(idx + 1)}${td(escapeHtml(r.name), 'text-align:left;')}
          ${td(r.m1_wo || 0)}${td(r.m1_with || 0, 'background:#f8fafc;')}
          ${td(r.m2_wo || 0)}${td(r.m2_with || 0, 'background:#f8fafc;')}
          ${td(r.m3_wo || 0)}${td(r.m3_with || 0, 'background:#f8fafc;')}
          ${td(r.m4_wo || 0)}${td(r.m4_with || 0, 'background:#f8fafc;')}
          ${td(r.c1_wo || 0)}${td(r.c1_with || 0, 'background:#faf5ff;')}
          ${td(r.c2_wo || 0)}${td(r.c2_with || 0, 'background:#eef2ff;')}
          ${td(t.qWo, 'font-weight:bold;')}${td(t.qWith, 'font-weight:bold;')}
          ${td(t.mWo + ' M', 'font-weight:bold;')}${td(t.mWith + ' M', 'font-weight:bold;')}</tr>`;
      });

      const f = id => document.getElementById(id)?.innerText || 0;
      const th = (v, extra = '') => `<th style="padding:3px;border:1px solid #000;${extra}">${v}</th>`;
      const wo = th('W/O', 'font-size:7.5pt;'), wi = th('With', 'font-size:7.5pt;');
      const pair = wo + wi;

      executeDirectPrint(`
        <div class="print-page-box" style="font-family:'Cambria',serif;color:#000;">
          <h1 style="text-align:center;font-size:15pt;font-weight:800;text-transform:uppercase;margin-bottom:2px;">${schoolLogoHtml(44)}${escapeHtml(school)}</h1>
          <h2 style="text-align:center;font-size:11pt;font-weight:700;margin-bottom:6px;">CHAPTERWISE ALLOCATION BLUEPRINT MATRIX (WITH &amp; WITHOUT OPTION)</h2>
          <div style="display:flex;justify-content:space-between;font-size:8.5pt;font-weight:600;border-top:1px solid #000;border-bottom:1px solid #000;padding:4px 0;margin-bottom:8px;">
            <span>STANDARD: <b>${escapeHtml(std)}</b></span><span>SUBJECT: <b>${escapeHtml(sub)}</b></span>
            <span>CUSTOM WEIGHTS: <b>C1=${w.c1}M, C2=${w.c2}M</b></span>
          </div>
          <table width="100%" style="border-collapse:collapse;border:1.5px solid #000;font-size:8pt;">
            <thead>
              <tr style="background:#f1f5f9;text-align:center;">
                ${th('#').replace('<th ', '<th rowspan="2" ')}${th('Chapter Name', 'text-align:left;').replace('<th ', '<th rowspan="2" ')}
                ${['1M', '2M', '3M', '4M', `C1 (${w.c1}M)`, `C2 (${w.c2}M)`, 'Total Qs', 'Total Marks'].map(h => th(h).replace('<th ', '<th colspan="2" ')).join('')}
              </tr>
              <tr style="background:#f8fafc;text-align:center;">${pair.repeat(8)}</tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="background:#f1f5f9;font-weight:bold;text-align:center;">
                ${td('TOTAL:', 'text-align:right;').replace('<td ', '<td colspan="2" ')}
                ${['1m-wo', '1m-with', '2m-wo', '2m-with', '3m-wo', '3m-with', '4m-wo', '4m-with', 'c1-wo', 'c1-with', 'c2-wo', 'c2-with', 'q-no-opt', 'q-with-opt', 'm-no-opt', 'm-with-opt'].map(k => td(f('foot-' + k))).join('')}
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:35px;display:flex;justify-content:space-between;font-size:8.5pt;font-weight:bold;">
            <span>Teacher Signature: ____________</span><span>Examiner: KALPESH H TAILOR</span><span>Principal: ____________</span>
          </div>
        </div>`);
    }
    /* ========================= PAPER PREVIEW: FIT / ZOOM / FULL SCREEN ========================= */
    const paperZoom = { mode: 'fit', scale: 1 };
    function applyPaperZoom() {
      const vp = document.getElementById('paper-viewport');
      const sizer = document.getElementById('paper-sizer');
      const paper = document.getElementById('printable-paper');
      if (!vp || !sizer || !paper) return;
      const cs = getComputedStyle(vp);
      const availW = vp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const pw = paper.offsetWidth, ph = paper.offsetHeight;
      if (!pw || !availW || availW < 50) return; // tab hidden
      const s = paperZoom.mode === 'fit' ? Math.min(1, availW / pw) : paperZoom.scale;
      paper.style.transform = `scale(${s})`;
      sizer.style.width = Math.round(pw * s) + 'px';
      sizer.style.height = Math.round(ph * s) + 'px';
      const lbl = document.getElementById('paper-zoom-label');
      if (lbl) lbl.textContent = Math.round(s * 100) + '%';
      const fitBtn = document.getElementById('paper-fit-btn');
      if (fitBtn) fitBtn.classList.toggle('active', paperZoom.mode === 'fit');
      paperZoom.current = s;
    }
    function fitPaper() { paperZoom.mode = 'fit'; applyPaperZoom(); }
    function setPaperZoom100() { paperZoom.mode = 'manual'; paperZoom.scale = 1; applyPaperZoom(); }
    function zoomPaper(delta) {
      paperZoom.scale = Math.min(2.5, Math.max(0.25, Math.round(((paperZoom.current || 1) + delta) * 100) / 100));
      paperZoom.mode = 'manual';
      applyPaperZoom();
    }
    function togglePaperFullscreen() {
      const vp = document.getElementById('paper-viewport');
      if (!vp) return;
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      if (vp.requestFullscreen) vp.requestFullscreen().catch(() => alert('Full screen is not available in this browser.'));
      else alert('Full screen is not available in this browser.');
    }
    window.addEventListener('DOMContentLoaded', () => {
      const vp = document.getElementById('paper-viewport');
      const paper = document.getElementById('printable-paper');
      if (window.ResizeObserver && vp && paper) {
        let roRaf = 0;
        const ro = new ResizeObserver(() => {
          if (roRaf) cancelAnimationFrame(roRaf);
          roRaf = requestAnimationFrame(() => { roRaf = 0; applyPaperZoom(); });
        });
        ro.observe(vp); ro.observe(paper);
      }
      window.addEventListener('resize', applyPaperZoom);
      document.addEventListener('fullscreenchange', () => setTimeout(applyPaperZoom, 50));
      setTimeout(applyPaperZoom, 0);
    });