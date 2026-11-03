/* ========================= QUESTION BANK ========================= */
    /* Which bank a question belongs to: GENERAL, GUJCET or PREVYEAR (previous years board exam questions) */
    function bankKeyOf(q) {
      if (q.bankType === 'PREVYEAR') return 'PREVYEAR';
      return (q.bankType === 'GUJCET' || q.std === 'GUJCET') ? 'GUJCET' : 'GENERAL';
    }

    /* ---- "Coming Soon" badges for banks and subjects that have no questions yet ---- */
    function updatePrevYearBadge() {
      const n = state.questions.filter(q => q.bankType === 'PREVYEAR').length;
      const el = document.getElementById('badge-prevyear-count');
      if (el) {
        el.innerText = n ? n : 'COMING SOON';
        el.className = n ? 'text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-mono'
                         : 'text-[9px] bg-yellow-300 text-slate-900 px-1.5 py-0.5 rounded font-black';
      }
      const pill = document.getElementById('soon-bank-prevyear');
      if (pill) pill.classList.toggle('hidden', n > 0);
    }

    function updateGujcetSoonBadge() {
      const n = state.questions.filter(q => bankKeyOf(q) === 'GUJCET').length;
      const tag = document.getElementById('badge-gujcet-tag');
      if (tag) {
        tag.innerText = n ? 'MCQ 40M' : 'COMING SOON';
        tag.className = n ? 'text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-black font-mono'
                          : 'text-[9px] bg-yellow-300 text-slate-900 px-1.5 py-0.5 rounded font-black';
      }
      const pill = document.getElementById('soon-bank-gujcet');
      if (pill) pill.classList.toggle('hidden', n > 0);
    }

    /* appends "[Coming Soon]" to subject options that have no questions (the option value is never changed) */
    function decorateComingSoon(selId, bankKey, std) {
      const sel = document.getElementById(selId);
      if (!sel) return;
      const bySubject = {};
      state.questions.forEach(q => {
        if (bankKeyOf(q) !== bankKey) return;
        if (std && std !== 'ALL' && q.std && q.std !== std) return;
        bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
      });
      const pairStd = bankKey === 'GUJCET' ? 'GUJCET' : std;
      const lockCtx = bankKey === 'GUJCET' ? true : ((std && std !== 'ALL') ? { std } : false);
      Array.from(sel.options).forEach(o => {
        if (o.value === 'ALL') return;
        if (o.dataset.base === undefined) o.dataset.base = o.textContent;
        const locked = isSubjectLockedFast(o.value, lockCtx);
        const soon = !bySubject[o.value] && !pairHasQuestions(pairStd, o.value) || !bySubject[o.value] && !locked;   // nothing there at all, or nothing in this bank yet
        o.textContent = o.dataset.base + (soon ? '  🔒 Coming Soon' : (locked ? '  🔒 ₹' + SUB_CONFIG.priceINR : ''));
      });
    }

    function refreshComingSoon() {
      updatePrevYearBadge();
      updateGujcetSoonBadge();
      const pStd = document.getElementById('paper-std')?.value;
      decorateComingSoon('paper-sub', pStd === 'GUJCET' ? 'GUJCET' : 'GENERAL', pStd);
      decorateComingSoon('filter-sub', state.currentBankType || 'GENERAL', document.getElementById('filter-std')?.value);
      decorateComingSoon('gujcet-subject', 'GUJCET', null);
      decorateComingSoon('matrix-filter-sub', 'GENERAL', document.getElementById('matrix-filter-std')?.value);
      ['paper-std', 'filter-std', 'matrix-filter-std'].forEach(decorateStdOptions);
    }

    /* sidebar button: open the Question Bank on the Previous Years Board Qs view */
    function openPrevYearBank() {
      switchTab('tab-qbank');
      switchBankType('PREVYEAR');
    }

    function switchBankType(type) {
      state.currentBankType = type;
      const genBtn = document.getElementById('bank-toggle-general');
      const gujBtn = document.getElementById('bank-toggle-gujcet');
      const pyBtn = document.getElementById('bank-toggle-prevyear');
      const filterStd = document.getElementById('filter-std');
      const on = "px-3 py-1 rounded bg-brand-900 text-white shadow font-black cursor-pointer";
      const off = "px-3 py-1 rounded text-slate-700 hover:text-brand-900 font-bold cursor-pointer";
      genBtn.className = off; gujBtn.className = off; if (pyBtn) pyBtn.className = off;
      if (type === 'GUJCET') {
        gujBtn.className = on;
        filterStd.value = 'GUJCET';
      } else if (type === 'PREVYEAR') {
        if (pyBtn) pyBtn.className = on;
        if (filterStd.value === 'GUJCET') filterStd.value = 'Std 10';
      } else {
        genBtn.className = on;
        if (filterStd.value === 'GUJCET') filterStd.value = 'Std 10';
      }
      const pdfBtn = document.getElementById('btn-gujcet-pdf-import');
      if (pdfBtn) { pdfBtn.classList.toggle('hidden', type !== 'GUJCET'); pdfBtn.classList.toggle('flex', type === 'GUJCET'); }
      syncSubjectDropdown('filter-std', 'filter-sub');
      filterQuestionBank();
      syncPrevYearNav(type);
    }

    /* keep the sidebar highlight and page title in step with the open bank */
    function syncPrevYearNav(type) {
      const qbankOpen = !document.getElementById('tab-qbank')?.classList.contains('hidden');
      if (!qbankOpen) return;
      const nav = document.getElementById('nav-prevyear');
      const qn = document.getElementById('nav-qbank');
      const act = ['bg-blue-600', 'text-white', 'shadow'];
      const idle = ['text-blue-100', 'hover:bg-brand-800'];
      const setOn = (el, on) => { if (!el) return; (on ? idle : act).forEach(c => el.classList.remove(c)); (on ? act : idle).forEach(c => el.classList.add(c)); };
      setOn(nav, type === 'PREVYEAR');
      setOn(qn, type !== 'PREVYEAR');
      const titleEl = document.getElementById('active-tab-title');
      if (titleEl) titleEl.innerText = type === 'PREVYEAR' ? 'Previous Years Board Exam Questions' : 'Question Bank Management';
    }

    const QBANK_RENDER_LIMIT = 150;

    /* ---- Chapter No / Name filter button (Question Bank) ---- */
    window._chapFilter = '';

    function updateChapterFilterLabel() {
      const lbl = document.getElementById('chap-filter-label');
      const btn = document.getElementById('chap-filter-btn');
      if (!lbl) return;
      const v = window._chapFilter || '';
      lbl.textContent = v || 'All Chapters';
      if (btn) btn.classList.toggle('border-brand-600', !!v);
      if (btn) btn.classList.toggle('bg-brand-50', !!v);
    }

    function getChapterFilterOptions() {
      const stdVal = document.getElementById('filter-std')?.value || 'ALL';
      const subVal = document.getElementById('filter-sub')?.value || 'ALL';
      const medVal = document.getElementById('filter-med')?.value || 'ALL';
      const counts = new Map();
      state.questions.forEach(q => {
        if (bankKeyOf(q) !== (state.currentBankType || 'GENERAL') || isSubjectLockedFast(q.subject, q)) return;
        if (stdVal !== 'ALL' && q.std !== stdVal) return;
        if (subVal !== 'ALL' && q.subject !== subVal) return;
        if (medVal !== 'ALL' && q.medium !== medVal) return;
        const c = String(q.chapter || '').trim();
        if (!c) return;
        counts.set(c, (counts.get(c) || 0) + 1);
      });
      const out = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }));
      if (state.isGuest && stdVal !== 'ALL' && subVal !== 'ALL') {          // guest: show the other chapters with a padlock
        const e = state.catalog && state.catalog[keyOfPair(stdVal, subVal)];
        (e && e.ch ? sortChapters(e.ch) : []).forEach(name => { if (isGuestChapterLocked(stdVal, subVal, name) && !out.some(o => chapterMatches(o[0], name))) out.push([name, 0, true]); });
      }
      return out;
    }

    function renderChapterFilterList() {
      const list = document.getElementById('chap-filter-list');
      if (!list) return;
      const term = (document.getElementById('chap-filter-search')?.value || '').trim().toLowerCase();
      const cur = window._chapFilter || '';
      const opts = getChapterFilterOptions().filter(([name]) => !term || name.toLowerCase().includes(term));
      let html = `<button type="button" data-chap="" class="chap-opt w-full text-left px-2 py-1.5 text-xs font-bold hover:bg-brand-50 cursor-pointer ${cur === '' ? 'bg-brand-100 text-brand-900' : 'text-slate-700'}">All Chapters</button>`;
      if (!opts.length) html += '<div class="px-2 py-3 text-center text-[11px] text-slate-400">No chapters found</div>';
      opts.forEach(([name, n, locked]) => {
        if (locked) { html += `<div class="w-full px-2 py-1.5 text-xs flex items-center justify-between gap-2 text-slate-400 bg-slate-50 cursor-not-allowed" title="Sign in to open" onclick="guestLoginPrompt()"><span class="truncate">🔒 ${escapeHtml(name)}</span><span class="text-[9px] font-black text-slate-500 shrink-0">LOCKED</span></div>`; return; }
        html += `<button type="button" data-chap="${escapeHtml(name)}" class="chap-opt w-full text-left px-2 py-1.5 text-xs hover:bg-brand-50 flex items-center justify-between gap-2 cursor-pointer ${cur === name ? 'bg-brand-100 text-brand-900 font-bold' : 'text-slate-800'}"><span class="truncate">${escapeHtml(name)}</span><span class="text-[10px] font-mono text-slate-500 shrink-0">${n}</span></button>`;
      });
      list.innerHTML = html;
      list.querySelectorAll('.chap-opt').forEach(b => {
        b.onclick = () => {
          window._chapFilter = b.getAttribute('data-chap') || '';
          closeChapterFilter();
          filterQuestionBank();
        };
      });
    }

    function toggleChapterFilter(ev) {
      if (ev) ev.stopPropagation();
      const panel = document.getElementById('chap-filter-panel');
      if (!panel) return;
      if (panel.classList.contains('hidden')) {
        closeMarksFilter();
        const s = document.getElementById('chap-filter-search'); if (s) s.value = '';
        renderChapterFilterList();
        panel.classList.remove('hidden');
        setTimeout(() => s && s.focus(), 30);
      } else closeChapterFilter();
    }

    function closeChapterFilter() {
      const panel = document.getElementById('chap-filter-panel');
      if (panel) panel.classList.add('hidden');
    }

    document.addEventListener('click', e => {
      const wrap = document.getElementById('chap-filter-wrap');
      if (wrap && !wrap.contains(e.target)) closeChapterFilter();
    });

    /* ---- Marks filter button (Question Bank) ---- */
    window._marksFilter = '';

    function updateMarksFilterLabel() {
      const lbl = document.getElementById('marks-filter-label');
      const btn = document.getElementById('marks-filter-btn');
      if (!lbl) return;
      const v = window._marksFilter || '';
      lbl.textContent = v ? v + (v === '1' ? ' Mark' : ' Marks') : 'All Marks';
      if (btn) { btn.classList.toggle('border-brand-600', !!v); btn.classList.toggle('bg-brand-50', !!v); }
    }

    function renderMarksFilterList() {
      const list = document.getElementById('marks-filter-list');
      if (!list) return;
      const stdVal = document.getElementById('filter-std')?.value || 'ALL';
      const subVal = document.getElementById('filter-sub')?.value || 'ALL';
      const medVal = document.getElementById('filter-med')?.value || 'ALL';
      const chapVal = window._chapFilter || '';
      const counts = new Map();
      state.questions.forEach(q => {
        if (bankKeyOf(q) !== (state.currentBankType || 'GENERAL') || isSubjectLockedFast(q.subject, q)) return;
        if (stdVal !== 'ALL' && q.std !== stdVal) return;
        if (subVal !== 'ALL' && q.subject !== subVal) return;
        if (medVal !== 'ALL' && q.medium !== medVal) return;
        if (chapVal && String(q.chapter || '') !== chapVal) return;
        const m = String(q.marks);
        if (!m || m === 'undefined') return;
        counts.set(m, (counts.get(m) || 0) + 1);
      });
      const opts = [...counts.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
      const cur = window._marksFilter || '';
      let html = `<button type="button" data-marks="" class="marks-opt w-full text-left px-2 py-1.5 text-xs font-bold hover:bg-brand-50 cursor-pointer ${cur === '' ? 'bg-brand-100 text-brand-900' : 'text-slate-700'}">All Marks</button>`;
      opts.forEach(([m, n]) => {
        html += `<button type="button" data-marks="${escapeHtml(m)}" class="marks-opt w-full text-left px-2 py-1.5 text-xs hover:bg-brand-50 flex items-center justify-between gap-2 cursor-pointer ${cur === m ? 'bg-brand-100 text-brand-900 font-bold' : 'text-slate-800'}"><span>${escapeHtml(m)} ${m === '1' ? 'Mark' : 'Marks'}</span><span class="text-[10px] font-mono text-slate-500 shrink-0">${n}</span></button>`;
      });
      list.innerHTML = html;
      list.querySelectorAll('.marks-opt').forEach(b => {
        b.onclick = () => {
          window._marksFilter = b.getAttribute('data-marks') || '';
          closeMarksFilter();
          filterQuestionBank();
        };
      });
    }

    function toggleMarksFilter(ev) {
      if (ev) ev.stopPropagation();
      const panel = document.getElementById('marks-filter-panel');
      if (!panel) return;
      if (panel.classList.contains('hidden')) {
        closeChapterFilter();
        renderMarksFilterList();
        panel.classList.remove('hidden');
      } else closeMarksFilter();
    }

    function closeMarksFilter() {
      const panel = document.getElementById('marks-filter-panel');
      if (panel) panel.classList.add('hidden');
    }

    document.addEventListener('click', e => {
      const wrap = document.getElementById('marks-filter-wrap');
      if (wrap && !wrap.contains(e.target)) closeMarksFilter();
    });

    function filterQuestionBank() {
      const stdEl = document.getElementById('filter-std');
      const subEl = document.getElementById('filter-sub');
      const medEl = document.getElementById('filter-med');
      if (!stdEl || !subEl || !medEl) return;

      const stdVal = stdEl.value, subVal = subEl.value, medVal = medEl.value;
      const keyword = (document.getElementById('filter-keyword')?.value || '').toLowerCase();

      /* chapter filter resets itself when Standard / Subject / Medium / Bank changes */
      const _chapScope = [state.currentBankType, stdVal, subVal, medVal].join('|');
      if (window._chapScope !== undefined && window._chapScope !== _chapScope) { window._chapFilter = ''; window._marksFilter = ''; }
      window._chapScope = _chapScope;
      const chapVal = window._chapFilter || '';
      updateChapterFilterLabel();
      const marksVal = window._marksFilter || '';
      updateMarksFilterLabel();
      updatePrevYearBadge();

      const filtered = state.questions.filter(q => {
        if (bankKeyOf(q) !== (state.currentBankType || 'GENERAL')) return false;
        if (isSubjectLockedFast(q.subject, q)) return false;
        if (stdVal !== 'ALL' && q.std !== stdVal) return false;
        if (subVal !== 'ALL' && q.subject !== subVal) return false;
        if (medVal !== 'ALL' && q.medium !== medVal) return false;
        if (chapVal && String(q.chapter || '') !== chapVal) return false;
        if (marksVal && String(q.marks) !== marksVal) return false;
        if (document.getElementById('filter-figure-only')?.checked && !q.diagram) return false;
        return !keyword || (q.text && String(q.text).toLowerCase().includes(keyword));
      });

      const lockNote = document.getElementById('qbank-locked-note');
      if (lockNote) {
        const lockedSubs = new Set();
        state.questions.forEach(q => { if (bankKeyOf(q) === (state.currentBankType || 'GENERAL') && (stdVal === 'ALL' || q.std === stdVal) && isSubjectLockedFast(q.subject, q)) lockedSubs.add(q.subject); });
        lockNote.classList.toggle('hidden', lockedSubs.size === 0);
        lockNote.innerText = `🔒 ${lockedSubs.size} locked subject${lockedSubs.size > 1 ? 's' : ''} hidden - Unlock`;
      }

      const container = document.getElementById('qbank-items-container');
      const indEl = document.getElementById('qbank-count-indicator');
      if (indEl) {
        indEl.innerText = filtered.length > QBANK_RENDER_LIMIT
          ? `Showing first ${QBANK_RENDER_LIMIT} of ${filtered.length} Questions (use filters to narrow)`
          : `Showing ${filtered.length} Questions`;
      }
      if (!container) return;
      container.innerHTML = '';
      const showLockedChapters = !chapVal && !marksVal && !keyword;
      if (filtered.length === 0) {
        container.innerHTML = emptyBankHtml(stdVal, subVal);          // 'Coming Soon' card when the Standard + Subject has no questions
        appendGuestLockedChapters(container, stdVal, subVal, showLockedChapters);
        return;
      }

      filtered.slice(0, QBANK_RENDER_LIMIT).forEach(q => {
        const div = document.createElement('div');
        div.className = "p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start justify-between gap-4";
        div.innerHTML = `
          <div class="space-y-1.5 flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span class="bg-blue-100 text-brand-900 font-bold px-2 py-0.5 rounded">${escapeHtml(q.std)}</span>
              <span class="bg-purple-100 text-purple-900 font-semibold px-2 py-0.5 rounded">${escapeHtml(q.subject)}</span>
              <span class="bg-slate-200 text-slate-700 font-mono font-bold px-2 py-0.5 rounded">${escapeHtml(q.chapter)}</span>
              <span class="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">${escapeHtml(q.marks)} Mark(s)</span>${q.diagram ? '<span class="bg-sky-100 text-sky-900 font-bold px-2 py-0.5 rounded">Figure</span>' : ''}
            </div>
            <p class="text-xs font-semibold text-slate-900">${escapeHtml(q.text)}</p>
            ${diagramHtml(q, '320px')}
            ${q.options ? formatInlineOptionsHtml(q.options) : ''}
            <p class="text-emerald-800 font-bold text-xs">Ans: ${escapeHtml(q.answer || 'Not provided')}</p>
          </div>
          <div class="flex items-center space-x-2 shrink-0">
            <button type="button" onclick="insertBankQuestionToPaper('${q.id}')" class="px-2.5 py-1 bg-brand-900 text-white rounded text-xs font-bold hover:bg-brand-800 cursor-pointer">Add to Paper</button>
            <button type="button" onclick="openEditModal('${q.id}', 'bank')" class="p-1.5 text-blue-700 hover:bg-blue-100 rounded cursor-pointer" title="Edit Question"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
            <button type="button" onclick="deleteBankQuestion('${q.id}')" class="p-1.5 text-rose-600 hover:bg-rose-100 rounded cursor-pointer" title="Delete"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>`;
        container.appendChild(div);
      });
      appendGuestLockedChapters(container, stdVal, subVal, showLockedChapters);      // guest: chapters after Ch 2 are padlocked

      if (window.lucide && lucide.createIcons) lucide.createIcons();
      renderMath(container);
    }

    function insertBankQuestionToPaper(id) {
      const q = state.questions.find(item => item.id === id);
      if (!q) return;
      const inPaper = (q.bankType === 'GUJCET' || q.std === 'GUJCET' ? state.gujcetPaperQuestions : state.livePaperQuestions)
        .some(p => bulkQuestionKey(p) === bulkQuestionKey(q));
      if (inPaper && !confirm('This question is already in the paper. Add it again?')) return;
      if (q.bankType === 'GUJCET' || q.std === 'GUJCET') {
        state.gujcetPaperQuestions.push({ ...q });
        renderGujcetPaperList();
        alert('Question added to GUJCET Workspace!');
      } else {
        state.livePaperQuestions.push({ ...q, paperItemId: 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4) });
        savePaperLocal();
        renderLivePaper();
        alert('Question added to live GSEB exam paper!');
      }
    }

    function deleteBankQuestion(id) {
      const _q = state.questions.find(q => q.id === id);
      if (_q && !guardEdit(_q.subject, 'delete', _q)) return;
      if (confirm('Delete question permanently across all devices?')) {
        state.questions = state.questions.filter(q => q.id !== id);
        persistQuestions('questions');
        filterQuestionBank();
      }
    }

    function openAddQuestionModal() {
      const filterStd = document.getElementById('filter-std');
      const addStd = document.getElementById('add-q-std');
      addStd.value = (filterStd && filterStd.value !== 'ALL') ? filterStd.value : 'Std 10';
      syncSubjectDropdown('add-q-std', 'add-q-sub');
      ['add-q-text', 'add-q-options', 'add-q-ans'].forEach(id => { document.getElementById(id).value = ''; });
      clearDiagram('add');
      if (typeof wordFillReset === 'function') wordFillReset('add');
      openModal('modal-add-question');
    }

    function submitNewQuestion() {
      const std = document.getElementById('add-q-std').value;
      const sub = document.getElementById('add-q-sub').value;
      const chap = document.getElementById('add-q-chap').value.trim();
      const med = document.getElementById('add-q-med').value;
      const marks = parseInt(document.getElementById('add-q-marks').value) || 1;
      const text = document.getElementById('add-q-text').value.trim();
      const options = document.getElementById('add-q-options').value.trim();
      const ans = document.getElementById('add-q-ans').value.trim();
      if (!guardEdit(sub, 'add', { std })) return;
      if (!text) return alert('Please enter question statement.');
      if (bulkBankKeySet().has(bulkQuestionKey({ text, options })) && !confirm('This question already exists in the Question Bank. Add it again?')) return;

      state.questions.unshift({
        id: 'q-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        bankType: std === 'GUJCET' ? 'GUJCET' : (state.currentBankType === 'PREVYEAR' ? 'PREVYEAR' : 'GENERAL'),
        std, subject: sub, chapter: chap || 'Ch 1', medium: med, marks,
        section: std === 'GUJCET' ? 'GUJCET MCQ' : sectionForMarks(marks),
        text, answer: ans, options, ...figureProps('add')
      });
      persistQuestions('questions');
      filterQuestionBank();
      closeModal('modal-add-question');
      clearDiagram('add');
    }

    function openEditModal(id, origin) {
      let q = state.questions.find(item => item.id === id);
      if (!q) q = state.livePaperQuestions.find(item => item.id === id || item.paperItemId === id);
      if (!q) return;
      document.getElementById('edit-q-id').value = id;
      document.getElementById('edit-q-origin').value = origin;
      document.getElementById('edit-q-text').value = q.text || '';
      document.getElementById('edit-q-options').value = q.options || '';
      document.getElementById('edit-q-ans').value = q.answer || '';
      document.getElementById('edit-q-marks').value = q.marks || 1;
      ensureSectionOption('edit-q-section', q.section);
      document.getElementById('edit-q-section').value = q.section || 'SECTION A';
      questionDiagrams.edit = q.diagram || ''; questionDiagramMeta.edit = q.diagram ? { w: q.diagramW || 0, h: q.diagramH || 0 } : null;
      const diagramPreview = document.getElementById('edit-q-diagram-preview');
      if (diagramPreview) { diagramPreview.src = q.diagram || ''; diagramPreview.classList.toggle('hidden', !q.diagram); }
      const diagramInput = document.getElementById('edit-q-diagram'); if (diagramInput) diagramInput.value = '';
      openModal('modal-edit-question');
    }

    function saveEditedQuestion() {
      const id = document.getElementById('edit-q-id').value;
      const origin = document.getElementById('edit-q-origin').value;
      const text = document.getElementById('edit-q-text').value.trim();
      const options = document.getElementById('edit-q-options').value.trim();
      const answer = document.getElementById('edit-q-ans').value.trim();
      const marks = parseInt(document.getElementById('edit-q-marks').value) || 1;
      const section = document.getElementById('edit-q-section').value;
      const apply = q => Object.assign(q, { text, options, answer, marks, section, ...figureProps('edit') });

      if (origin === 'paper') {
        // edit only this paper item; the bank copy stays untouched
        const live = state.livePaperQuestions.find(item => (item.paperItemId || item.id) === id);
        if (live) apply(live);
        savePaperLocal();
        renderLivePaper();
      } else {
        const bankQ = state.questions.find(item => item.id === id);
        if (bankQ) {
          if (!guardEdit(bankQ.subject, 'edit', bankQ)) { closeModal('modal-edit-question'); return; }
          apply(bankQ);
          state.livePaperQuestions.filter(item => item.id === id).forEach(apply);
          state.gujcetPaperQuestions.filter(item => item.id === id).forEach(apply);
          persistQuestions('questions');
          filterQuestionBank();
          renderLivePaper();
          renderGujcetPaperList();
        }
      }
      closeModal('modal-edit-question');
      clearDiagram('edit');
    }

    /* ========================= GUJCET ========================= */
    function getGujcetPool(sub, med) {
      return state.questions.filter(q =>
        (q.bankType === 'GUJCET' || q.std === 'GUJCET') && !isSubjectLockedFast(q.subject, q) &&
        (!sub || q.subject === sub) && (!med || !q.medium || q.medium === med));
    }

    function renderGujcetPaperList() {
      const container = document.getElementById('gujcet-paper-preview');
      const countEl = document.getElementById('gujcet-current-count');
      if (countEl) countEl.innerText = state.gujcetPaperQuestions.length;
      if (!container) return;

      if (state.gujcetPaperQuestions.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-center py-8">No MCQs added yet. Click <strong>"Auto-Generate 40 MCQs from Bank"</strong> or insert questions manually.</p>`;
        return;
      }
      let html = '<div class="space-y-3">';
      state.gujcetPaperQuestions.forEach((q, idx) => {
        html += `
          <div class="p-3.5 bg-slate-50 border border-slate-300 rounded-lg flex items-start justify-between">
            <div class="flex-1 pr-3 min-w-0">
              <p class="font-bold text-slate-900 text-sm"><span class="text-brand-900 mr-1.5 font-mono">Q${idx + 1}.</span><span>${escapeHtml(q.text)}</span></p>
              ${diagramHtml(q, '320px')}
              ${q.options ? formatInlineOptionsHtml(q.options) : ''}
              <p class="text-emerald-800 font-bold text-xs mt-2">Ans: ${escapeHtml(q.answer || 'Not provided')}</p>
            </div>
            <button type="button" onclick="removeGujcetQuestion(${idx})" class="text-rose-600 hover:text-rose-800 p-1 font-bold cursor-pointer">×</button>
          </div>`;
      });
      container.innerHTML = html + '</div>';
      renderMath(container);
    }

    function removeGujcetQuestion(idx) {
      state.gujcetPaperQuestions.splice(idx, 1);
      renderGujcetPaperList();
    }

    function addSingleGujcetMcq() {
      const text = document.getElementById('gujcet-quick-text').value.trim();
      const options = document.getElementById('gujcet-quick-options').value.trim();
      const ans = document.getElementById('gujcet-quick-ans').value.trim();
      const sub = document.getElementById('gujcet-subject').value;
      const med = document.getElementById('gujcet-medium').value;
      if (!guardEdit(sub, 'add', true)) return;
      if (!text) return alert('Please enter MCQ statement.');
      if (bulkBankKeySet().has(bulkQuestionKey({ text, options })) && !confirm('This question already exists in the Question Bank. Add it again?')) return;

      const newQ = {
        id: 'g-mcq-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        bankType: 'GUJCET', std: 'GUJCET', subject: sub, chapter: 'GUJCET Practice',
        medium: med, section: 'GUJCET MCQ', marks: 1, text, answer: ans, options, ...figureProps('gujcet')
      };
      state.gujcetPaperQuestions.push({ ...newQ });
      state.questions.unshift(newQ);
      persistQuestions('questions');
      ['gujcet-quick-text', 'gujcet-quick-options', 'gujcet-quick-ans'].forEach(id => { document.getElementById(id).value = ''; });
      clearDiagram('gujcet');
      renderGujcetPaperList();
    }

    function autoPopulateGujcet40Paper() {
      const sub = document.getElementById('gujcet-subject')?.value || 'Mathematics';
      const med = document.getElementById('gujcet-medium')?.value || 'Gujarati';
      const pool = getGujcetPool(sub, med);
      if (pool.length === 0) return alert(`No GUJCET ${sub} questions (${med} medium) in the bank. Please add some first.`);

      // random selection of up to 40 questions
      const shuffled = pool.map(q => ({ q, r: Math.random() })).sort((a, b) => a.r - b.r).map(x => ({ ...x.q }));
      state.gujcetPaperQuestions = shuffled.slice(0, 40);
      renderGujcetPaperList();
      alert(`Loaded ${state.gujcetPaperQuestions.length} MCQs into GUJCET workspace!` + (pool.length < 40 ? `\nOnly ${pool.length} matching questions exist in the bank (40 needed).` : ''));
    }

    function buildGujcetHtml(withAnswers) {
      const school = escapeHtml(document.getElementById('paper-inst-name')?.value || '');
      const sub = escapeHtml(document.getElementById('gujcet-subject')?.value || '');
      const med = escapeHtml(document.getElementById('gujcet-medium')?.value || '');
      const time = escapeHtml(document.getElementById('gujcet-time')?.value || '');
      const neg = escapeHtml(document.getElementById('gujcet-negative')?.value || '');
      const n = state.gujcetPaperQuestions.length;

      let qs = '';
      state.gujcetPaperQuestions.forEach((q, i) => {
        const opts = splitOptions(q.options).map(o => `<span style="display:inline-block;margin-right:16px;">${escapeHtml(o)}</span>`).join('');
        qs += `<div style="margin:0 0 8px 0;font-size:10.5pt;page-break-inside:avoid;">
          <div><b>Q.${i + 1}.</b> ${escapeHtml(q.text)}</div>
          ${q.diagram ? `<div style="margin:4px 0 4px 18px;">${figureImgTag(q, 380)}</div>` : ''}
          ${opts ? `<div style="margin:3px 0 0 18px;font-size:10pt;">${opts}</div>` : ''}
          ${withAnswers ? `<div style="margin:3px 0 0 18px;font-size:9.5pt;font-weight:bold;color:#065f46;">Ans: ${escapeHtml(q.answer || 'Not provided')}</div>` : ''}
        </div>`;
      });

      return `<div style="font-family:'Cambria','Georgia',serif;color:#000;">
        <h1 style="text-align:center;font-size:15pt;font-weight:800;text-transform:uppercase;margin:0 0 2px 0;">${schoolLogoHtml(44)}${school}</h1>
        <h2 style="text-align:center;font-size:11.5pt;margin:0 0 6px 0;">GUJCET PRACTICE EXAMINATION - ${sub}</h2>
        <table width="100%" style="border-top:1px solid #000;border-bottom:1px solid #000;font-size:9.5pt;margin-bottom:8px;border-collapse:collapse;"><tr>
          <td style="padding:3px 0;">MEDIUM: <b>${med}</b></td><td>TIME: <b>${time}</b></td>
          <td>MARKS: <b>${n}</b></td><td style="text-align:right;">NEGATIVE: <b>${neg}</b></td></tr></table>
        <p style="font-size:9.5pt;font-style:italic;margin:0 0 8px 0;">Each question carries 1 mark. Choose the correct option.</p>
        ${qs || '<p style="text-align:center;color:#888;">No questions added.</p>'}
      </div>`;
    }
    /* ========================= BULK OPERATIONS ========================= */
    function onBulkBankTypeChange() {
      const type = document.getElementById('bulk-target-bank-type').value;
      const stdEl = document.getElementById('bulk-target-std');
      if (type === 'GUJCET') stdEl.value = 'GUJCET';
      else if (stdEl.value === 'GUJCET') stdEl.value = 'Std 10';
      syncSubjectDropdown('bulk-target-std', 'bulk-target-sub');
      autoFetchChapterTitle();
    }

    function autoFetchChapterTitle() {
      const std = document.getElementById('bulk-target-std')?.value;
      const sub = document.getElementById('bulk-target-sub')?.value;
      const chapNo = (document.getElementById('bulk-target-chap-no')?.value || '').trim();
      const nameEl = document.getElementById('bulk-target-chap-name');
      if (!nameEl || !std) return;
      const chapNum = extractChapterNumber(chapNo);

      const bpMatch = chapNum && state.blueprintRows.find(r =>
        (r.std === std || !r.std) && (r.sub === sub || !r.sub) && extractChapterNumber(r.name) === chapNum);
      if (bpMatch) { nameEl.value = bpMatch.name; return; }

      const qMatch = chapNum && state.questions.find(q =>
        q.std === std && q.subject === sub && extractChapterNumber(q.chapter) === chapNum);
      nameEl.value = (qMatch && qMatch.chapter) ? qMatch.chapter : `${chapNo}${chapNum ? ' - Topic ' + chapNum : ''}`;
    }

    let bulkImageLib = {};      // lower-case file name -> { dataUrl, w, h }
    let bulkImageCount = 0;
    const IMG_EXT_RE = /\.(png|jpe?g|webp|gif|bmp)$/i;

    function mimeFromName(n) {
      const e = ((String(n).match(/\.(\w+)$/) || [])[1] || '').toLowerCase();
      return e === 'jpg' || e === 'jpeg' ? 'image/jpeg' : e === 'png' ? 'image/png' : e === 'webp' ? 'image/webp' : e === 'gif' ? 'image/gif' : e === 'bmp' ? 'image/bmp' : 'application/octet-stream';
    }

    function openBulkImportModal() {
      const _bt = document.getElementById('bulk-target-bank-type');
      if (_bt) _bt.value = state.currentBankType === 'PREVYEAR' ? 'PREVYEAR' : (state.currentBankType === 'GUJCET' ? 'GUJCET' : 'GENERAL');
      const _sd = document.getElementById('bulk-target-std');
      if (_sd && state.currentBankType === 'PREVYEAR' && _sd.value === 'GUJCET') _sd.value = 'Std 10';
      syncSubjectDropdown('bulk-target-std', 'bulk-target-sub');
      autoFetchChapterTitle();
      state.parsedBulkItems = [];
      bulkImageLib = {}; bulkImageCount = 0;
      bulkSetStatus('');
      updateBulkImageStatus();
      renderBulkParsedTable();
      openModal('modal-bulk-import');
    }

    function updateBulkImageStatus(failed) {
      const el = document.getElementById('bulk-image-status');
      if (!el) return;
      el.textContent = bulkImageCount
        ? `${bulkImageCount} figure image(s) loaded` + (failed ? `, ${failed} could not be read` : '') + '. They are matched by the file name in the Figure column.'
        : 'Optional: select the figure images (or one ZIP). They are matched by the file name in the Figure column.';
    }

    function lookupBulkImage(name) {
      if (!name) return null;
      const base = String(name).trim().split(/[\\/]/).pop().toLowerCase();
      return bulkImageLib[base] || bulkImageLib[base.replace(/\.[a-z0-9]+$/, '')] || null;
    }
    function storeBulkImage(fileName, res) {
      const base = String(fileName).split(/[\\/]/).pop().toLowerCase();
      bulkImageLib[base] = res;
      const noExt = base.replace(/\.[^.]+$/, '');
      if (!bulkImageLib[noExt]) bulkImageLib[noExt] = res;
      bulkImageCount++;
    }
    function attachFigureNames() {
      state.parsedBulkItems.forEach(it => {
        if (!it.fig) it.fig = lookupBulkImage(it.figName || it.figHint);
      });
    }

    async function handleBulkImagesSelect(event) {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      if (!files.length) return;
      const status = document.getElementById('bulk-image-status');
      let failed = 0;
      const addBlob = async (name, blob) => {
        try { storeBulkImage(name, await compressImageBlob(blob)); } catch (e) { failed++; }
        if (status) status.textContent = `Processing figures… ${bulkImageCount} done`;
      };
      for (const f of files) {
        if (/\.zip$/i.test(f.name)) {
          if (typeof JSZip === 'undefined') { alert('ZIP support could not load (check your internet). Select the images directly instead.'); continue; }
          try {
            const zip = await JSZip.loadAsync(f);
            const entries = Object.values(zip.files).filter(en => !en.dir && IMG_EXT_RE.test(en.name) && !/__MACOSX/.test(en.name));
            for (const en of entries) {
              const buf = await en.async('arraybuffer');
              await addBlob(en.name, new Blob([buf], { type: mimeFromName(en.name) }));
            }
          } catch (e) { alert('Could not read the ZIP file: ' + e.message); }
        } else if (/^image\//.test(f.type) || IMG_EXT_RE.test(f.name)) {
          await addBlob(f.name, f);
        }
      }
      attachFigureNames();
      renderBulkParsedTable();
      updateBulkImageStatus(failed);
    }

    function attachBulkFigure(event, idx) {
      const f = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!f || !state.parsedBulkItems[idx]) return;
      compressImageBlob(f).then(r => { state.parsedBulkItems[idx].fig = r; renderBulkParsedTable(); }).catch(e => alert(e.message));
    }
    function removeBulkFigure(idx) {
      if (state.parsedBulkItems[idx]) { state.parsedBulkItems[idx].fig = null; state.parsedBulkItems[idx].figName = ''; state.parsedBulkItems[idx].figHint = ''; renderBulkParsedTable(); }
    }

    /* Reads pictures placed on cells of the first sheet of an .xlsx and returns [{ row (0-based), buf, mime }] */
    async function extractXlsxPicturesRaw(zip, sheetName) {
      const getText = async p => { const f = zip.file(p); return f ? await f.async('string') : null; };
      const attr = (tag, name) => (tag.match(new RegExp('\\b' + name + '="([^"]*)"')) || [])[1];
      const relsOf = txt => (txt.match(/<Relationship\b[^>]*>/g) || []).map(t => ({ id: attr(t, 'Id'), target: attr(t, 'Target'), type: attr(t, 'Type') || '' }));
      const resolve = (basePath, target) => {
        if (target.charAt(0) === '/') return target.slice(1);
        const parts = basePath.split('/'); parts.pop();
        target.split('/').forEach(seg => { if (seg === '..') parts.pop(); else if (seg !== '.' && seg !== '') parts.push(seg); });
        return parts.join('/');
      };
      const unxml = v => String(v).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      const relsPath = p => p.replace(/([^\/]+)$/, '_rels/$1.rels');

      const wb = await getText('xl/workbook.xml');
      const wbRelsTxt = await getText('xl/_rels/workbook.xml.rels');
      if (!wb || !wbRelsTxt) return { pics: [], skipped: 0 };

      const tags = wb.match(/<(?:\w+:)?sheet\b[^>]*>/g) || [];
      let tag = tags.find(t => attr(t, 'name') !== undefined && unxml(attr(t, 'name')) === sheetName) || tags[0];
      if (!tag) return { pics: [], skipped: 0 };
      const rid = (tag.match(/\s\w+:id="([^"]*)"/) || [])[1];
      const wbRel = relsOf(wbRelsTxt).find(r => r.id === rid);
      if (!wbRel) return { pics: [], skipped: 0 };
      const sheetPath = resolve('xl/workbook.xml', wbRel.target);

      const sheetRelsTxt = await getText(relsPath(sheetPath));
      if (!sheetRelsTxt) return { pics: [], skipped: 0 };
      const drawRel = relsOf(sheetRelsTxt).find(r => /\/drawing$/.test(r.type));
      if (!drawRel) return { pics: [], skipped: 0 };
      const drawPath = resolve(sheetPath, drawRel.target);
      const drawXml = await getText(drawPath);
      const drawRelsTxt = await getText(relsPath(drawPath));
      if (!drawXml || !drawRelsTxt) return { pics: [], skipped: 0 };
      const drawRels = relsOf(drawRelsTxt);

      const pics = []; let skipped = 0;
      const anchorRe = /<(?:\w+:)?(twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[^>]*>([\s\S]*?)<\/(?:\w+:)?\1>/g;
      let m;
      while ((m = anchorRe.exec(drawXml))) {
        const inner = m[2];
        const rowM = inner.match(/<(?:\w+:)?from>[\s\S]*?<(?:\w+:)?row>(\d+)<\/(?:\w+:)?row>/);
        const embM = inner.match(/[\w:]*embed="([^"]+)"/);
        if (!rowM || !embM) continue;
        const rel = drawRels.find(r => r.id === embM[1]);
        if (!rel) continue;
        const mediaPath = resolve(drawPath, rel.target);
        if (!IMG_EXT_RE.test(mediaPath)) { skipped++; continue; }
        const f = zip.file(mediaPath);
        if (!f) continue;
        pics.push({ row: parseInt(rowM[1], 10), buf: await f.async('arraybuffer'), mime: mimeFromName(mediaPath) });
      }
      return { pics, skipped };
    }

    /* ========================= BULK IMPORT: PDF / WORD / IMAGE (OCR) / GOOGLE SHEET ========================= */
    const BULK_OCR_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    let bulkOcrPromise = null;

    function bulkSetStatus(msg, isErr) {
      const el = document.getElementById('bulk-import-status');
      if (!el) return;
      el.textContent = msg || '';
      el.className = 'text-[11px] font-semibold ' + (isErr ? 'text-rose-700' : 'text-blue-800');
    }

    function bulkDefaultMarks() {
      const v = parseInt(document.getElementById('bulk-default-marks')?.value, 10);
      return (v >= 1 && v <= 20) ? v : 1;
    }

    function bulkEnsureOcr() {
      if (window.Tesseract) return Promise.resolve();
      if (bulkOcrPromise) return bulkOcrPromise;
      bulkOcrPromise = new Promise((resolve, reject) => {
        const sc = document.createElement('script');
        sc.src = BULK_OCR_URL;
        sc.onload = () => resolve();
        sc.onerror = () => { bulkOcrPromise = null; reject(new Error('Could not load the OCR engine. Please check your internet connection and try again.')); };
        document.head.appendChild(sc);
      });
      return bulkOcrPromise;
    }

    /* OCR `count` items; getSource(i) returns a File / canvas for item i. Returns an array of text lines. */
    async function bulkOcrRun(count, getSource) {
      await bulkEnsureOcr();
      const lang = document.getElementById('bulk-ocr-lang')?.value || 'eng';
      let cur = 1;
      const worker = await Tesseract.createWorker(lang, 1, {
        logger: m => { if (m && m.status === 'recognizing text') bulkSetStatus(`Reading text ${cur}/${count}... ${Math.round((m.progress || 0) * 100)}%`); }
      });
      const lines = [];
      try {
        for (let i = 0; i < count; i++) {
          cur = i + 1;
          const src = await getSource(i);
          const res = await worker.recognize(src);
          String((res && res.data && res.data.text) || '').split(/\r?\n/).forEach(l => lines.push(l));
        }
      } finally { try { await worker.terminate(); } catch (e) {} }
      return lines;
    }

    /* numbered text lines -> question items (marks from section headings / trailing "[3]" / default) */
    function bulkParseTextLines(lines, defMarks) {
      const clampM = n => Math.min(Math.max(parseInt(n, 10) || defMarks, 1), 20);
      const blocks = [], keyLines = [];
      let cur = null, lastNum = null, inKey = false, secMarks = defMarks;
      const flush = () => { if (cur) { blocks.push(cur); cur = null; } };

      for (const raw of lines) {
        const line = String(raw).replace(/\s+/g, ' ').trim();
        if (!line) continue;
        if (/^(page\s*)?\d{1,3}$/i.test(line) || /^page\s*\d+(\s*(of|\/)\s*\d+)?$/i.test(line)) continue;
        if (inKey) { keyLines.push(line); continue; }
        if (line.length < 60 && GPDF_KEY_RE.test(line) && (blocks.length + (cur ? 1 : 0)) > 0) { flush(); inKey = true; continue; }

        if (/^(section|part)\b/i.test(line) || /^(વિભાગ|ભાગ|विभाग)/.test(line)) {
          flush();
          const mm = line.match(/(\d{1,2})\s*(?:marks?|ગુણ|अंक)\s*(?:each|પ્રત્યેક|प्रत्येक)/i) || line.match(/(\d{1,2})\s*(?:marks?|ગુણ|अंक)/i);
          secMarks = mm ? clampM(mm[1]) : defMarks;
          continue;
        }
        const qm = line.match(GPDF_QSTART_RE);
        if (qm) {
          const n = parseInt(qm[1], 10);
          if (lastNum === null || n === 1 || n === lastNum + 1) {
            flush();
            cur = { num: n, marks: secMarks, lines: [qm[2]] };
            lastNum = n;
            continue;
          }
        }
        if (cur) cur.lines.push(line);
      }
      flush();

      const INSTR_RE = /^(all\s+questions|attempt|answer\s+(all|the)|note\b|instructions?|read\s+the|figures?\s+to\s+the\s+right|use\s+of\s+calculator|સૂચના|બધા\s*પ્રશ્ન|નોંધ)/i;
      let items = blocks.map(b => {
        let rawText = b.lines.join(' ').replace(/\s+/g, ' ').trim();
        let marks = b.marks;
        const em = rawText.match(/\[\s*(\d{1,2})\s*(?:marks?|ગુણ|अंक|M)?\s*\]\s*$/i)
                || rawText.match(/\(\s*(\d{1,2})\s*(?:marks?|ગુણ|अंक)\s*\)\s*$/i)
                || rawText.match(/\s(\d{1,2})\s*(?:marks?|ગુણ|अंक)\s*$/i);
        if (em) { marks = clampM(em[1]); rawText = rawText.slice(0, em.index).trim(); }
        const sp = (typeof wqSmartSplitQuestion === 'function') ? wqSmartSplitQuestion(rawText) : gpdfSplitQuestion(rawText);
        return { num: b.num, marks, text: sp.text, options: sp.options, ans: sp.ans };
      }).filter(i => (i.text || i.options) && !INSTR_RE.test(i.text || ''));

      const keyMap = gpdfParseKey(keyLines);
      if (Object.keys(keyMap).length) {
        const mcq = items.filter(i => i.options);          // answer keys belong to the multiple-choice questions
        const nums = mcq.map(i => i.num);
        const unique = new Set(nums).size === nums.length;
        mcq.forEach(it => { if (!it.ans && unique && keyMap[it.num]) it.ans = keyMap[it.num][0]; });
      }
      return items.map(i => ({ marks: clampM(i.marks), text: i.text, options: i.options || '', ans: i.ans || '', figName: '', figHint: '', fig: null }));
    }

    function bulkLoadTextLines(lines, label) {
      const items = bulkParseTextLines(lines, bulkDefaultMarks());
      state.parsedBulkItems = items;
      attachFigureNames();
      renderBulkParsedTable();
      if (!items.length) bulkSetStatus(`No questions detected in ${label}. Questions must be numbered like "1." or "Q1)". For other layouts use the Excel / CSV format.`, true);
      else bulkSetStatus(`${items.length} question(s) detected from ${label}. Check the preview below, then click "Import Questions to Bank".`);
    }

    async function bulkImportPdf(file) {
      bulkSetStatus('Reading the PDF...');
      const res = await gpdfExtractLines(file, (p, n) => bulkSetStatus(`Reading PDF page ${p}/${n}...`));
      let lines = res.lines;
      if (res.chars < 30) {                       // scanned PDF: no selectable text -> OCR the pages
        bulkSetStatus('No selectable text in this PDF - starting OCR (this can take a while)...');
        const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const pages = Math.min(pdf.numPages, 25);
        lines = await bulkOcrRun(pages, async i => {
          const page = await pdf.getPage(i + 1);
          const vp = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width; canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
          return canvas;
        });
        if (pdf.numPages > pages) alert(`Only the first ${pages} pages were read with OCR. Import the remaining pages separately.`);
      }
      bulkLoadTextLines(lines, file.name);
    }

    async function bulkImportDocx(file) {
      if (typeof JSZip === 'undefined') throw new Error('Word support could not load. Please check your internet connection.');
      bulkSetStatus('Reading the Word file...');
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const docFile = zip.file('word/document.xml');
      if (!docFile) throw new Error('This is not a valid .docx file.');
      const xml = new DOMParser().parseFromString(await docFile.async('string'), 'application/xml');
      const body = xml.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'body')[0];
      if (!body) throw new Error('This Word file has no readable content.');

      const paraText = p => {
        let out = '';
        const walk = n => {
          for (const c of n.childNodes) {
            if (c.nodeType !== 1) continue;
            const ln = c.localName;
            if (ln === 'oMath' && typeof wqOmmlToLatex === 'function') out += ' ' + wqOmmlToLatex(c) + ' ';
            else if (ln === 't') out += c.textContent;            // w:t and math m:t
            else if (ln === 'tab') out += ' ';
            else if (ln === 'br' || ln === 'cr') out += '\n';
            else walk(c);
          }
        };
        walk(p);
        return out;
      };

      const lines = [], tables = [];
      for (const el of body.childNodes) {
        if (el.nodeType !== 1) continue;
        if (el.localName === 'p') paraText(el).split('\n').forEach(l => lines.push(l));
        else if (el.localName === 'tbl') {
          const rows = [];
          for (const tr of el.childNodes) {
            if (tr.nodeType !== 1 || tr.localName !== 'tr') continue;
            const cells = [];
            for (const tc of tr.childNodes) {
              if (tc.nodeType !== 1 || tc.localName !== 'tc') continue;
              const ps = [];
              for (const p of tc.childNodes) if (p.nodeType === 1 && p.localName === 'p') ps.push(paraText(p).replace(/\n/g, ' ').trim());
              cells.push(ps.filter(Boolean).join(' '));
            }
            rows.push(cells);
          }
          tables.push(rows);
          rows.forEach(r => lines.push(r.join(' ')));
        }
      }

      // a table in the Marks | Question | Options | Answer layout is read as a table
      const big = tables.slice().sort((a, b) => b.length - a.length)[0];
      if (big && big.length >= 2 && big[0].length >= 2) {
        const numeric = big.filter(r => { const n = parseInt(r[0], 10); return n >= 1 && n <= 20; }).length;
        const header = /question|પ્રશ્ન/i.test((big[0][0] || '') + ' ' + (big[0][1] || ''));
        if (header || numeric >= Math.ceil((big.length - 1) * 0.6)) {
          processRawMatrixRows(big, null);
          bulkSetStatus(`${state.parsedBulkItems.length} question(s) read from the table in ${file.name}. Check the preview below, then click "Import Questions to Bank".`);
          return;
        }
      }
      bulkLoadTextLines(lines, file.name);
    }

    async function bulkImportImages(files) {
      if (!files.length) throw new Error('No image selected.');
      bulkSetStatus('Loading the OCR engine (first time only)...');
      const lines = await bulkOcrRun(files.length, i => files[i]);
      bulkLoadTextLines(lines, files.length > 1 ? `${files.length} images` : files[0].name);
    }

    async function routeBulkSmartImport(files) {
      const f0 = files[0];
      try {
        if (/\.pdf$/i.test(f0.name) || f0.type === 'application/pdf') await bulkImportPdf(f0);
        else if (/\.docx$/i.test(f0.name)) await bulkImportDocx(f0);
        else if (/\.doc$/i.test(f0.name)) bulkSetStatus('Old .doc files are not supported. Open it in Word, choose Save As > .docx, and upload again.', true);
        else await bulkImportImages(files.filter(f => /^image\//.test(f.type) || IMG_EXT_RE.test(f.name)));
      } catch (err) { bulkSetStatus('Import failed: ' + err.message, true); }
    }

    async function importGoogleSheetLink() {
      const url = (document.getElementById('bulk-gsheet-url')?.value || '').trim();
      const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (!m) return alert('Please paste a Google Sheets link (docs.google.com/spreadsheets/d/...).');
      const gid = (url.match(/[#&?]gid=(\d+)/) || [])[1];
      const g = gid ? '&gid=' + gid : '';
      const tries = [
        `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv${g}`,
        `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${g}`
      ];
      bulkSetStatus('Fetching the Google Sheet...');
      let text = null;
      for (const u of tries) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          const t = await r.text();
          if (t && !/^\s*<(!doctype|html)/i.test(t)) { text = t; break; }
        } catch (e) { /* try next address */ }
      }
      if (text === null) {
        bulkSetStatus('Could not read the sheet. Set its sharing to "Anyone with the link - Viewer", or copy the cells and paste them into the box above.', true);
        return;
      }
      try {
        const wb = XLSX.read(text, { type: 'string' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', blankrows: true });
        processRawMatrixRows(rows);
        bulkSetStatus(`${state.parsedBulkItems.length} question(s) read from the Google Sheet. Check the preview below, then click "Import Questions to Bank".`);
      } catch (err) { bulkSetStatus('Could not read the sheet data: ' + err.message, true); }
    }

    function handleBulkFileSelect(event) {
      const _files = Array.from(event.target.files || []);
      if (_files.length && (/\.(pdf|docx?)$/i.test(_files[0].name) || /^image\//.test(_files[0].type) || IMG_EXT_RE.test(_files[0].name))) {
        event.target.value = '';
        routeBulkSmartImport(_files);
        return;
      }
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      if (/\.xlsx?$/i.test(file.name)) {
        reader.onload = async e => {
          try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: true });
            let rowImages = null, found = 0, skipped = 0;
            if (/\.xlsx$/i.test(file.name) && typeof JSZip !== 'undefined') {
              try {
                const zip = await JSZip.loadAsync(e.target.result);
                const out = await extractXlsxPicturesRaw(zip, wb.SheetNames[0]);
                skipped = out.skipped;
                const startRow = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']).s.r : 0;
                rowImages = {};
                for (const p of out.pics) {
                  const idx = p.row - startRow;
                  if (idx < 0 || rowImages[idx]) continue;
                  try { rowImages[idx] = await compressImageBlob(new Blob([p.buf], { type: p.mime })); found++; } catch (er) { skipped++; }
                }
              } catch (er) { console.warn('Could not read pictures from the workbook', er); }
            }
            processRawMatrixRows(rows, rowImages);
            const matched = state.parsedBulkItems.filter(i => i.fig).length;
            if (found || skipped) {
              alert(`Found ${found} picture(s) in the Excel file; ${matched} question(s) now have a figure.` +
                    (skipped ? `\n${skipped} picture(s) could not be used (unsupported format such as EMF). Use "Attach" in the preview to add them.` : ''));
            }
          } catch (err) { alert('Error parsing Excel spreadsheet: ' + err.message); }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = e => processCsvOrTsvText(e.target.result);
        reader.readAsText(file);
      }
    }

    function parsePastedBulkQuestions() {
      const raw = (document.getElementById('bulk-paste-area')?.value || '').trim();
      if (!raw) return alert('Please paste text or table rows from Google Sheets / CSV.');
      processCsvOrTsvText(raw);
    }

    // Quote-aware splitting so commas inside "quoted" CSV fields don't break a question
    function parseDelimitedLine(line, delim) {
      const out = []; let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQ) {
          if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
          else cur += ch;
        } else if (ch === '"' && cur === '') inQ = true;
        else if (ch === delim) { out.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      out.push(cur.trim());
      return out;
    }

    function processCsvOrTsvText(text) {
      const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter(l => l.trim().length > 0);
      processRawMatrixRows(lines.map(line => parseDelimitedLine(line, line.includes('\t') ? '\t' : ',')));
    }

    // rowImages (optional): { rowIndex: {dataUrl,w,h} } for pictures found inside an Excel sheet
    function processRawMatrixRows(rawRows, rowImages) {
      state.parsedBulkItems = [];
      if (rawRows && rawRows.length) {
        const rows = rawRows.map(r => Array.from(r || [], c => (c === null || c === undefined) ? '' : String(c).trim()));
        const startIdx = (rows[0].length > 1 && isNaN(parseInt(rows[0][0]))) ? 1 : 0; // skip header row
        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i];
          if (!row.length || row.every(c => !c)) continue;
          let marks = 1, text = '', options = '', ans = '', fileCell = '';
          if (row.length === 1) { text = row[0]; }
          else if (row.length === 2) { marks = parseInt(row[0]) || 1; text = row[1]; }
          else if (row.length === 3) { marks = parseInt(row[0]) || 1; text = row[1]; ans = row[2]; }
          else { marks = parseInt(row[0]) || 1; text = row[1]; options = row[2]; ans = row[3]; fileCell = row[4] || ''; }
          if (!text) continue;
          state.parsedBulkItems.push({
            marks: Math.min(Math.max(marks, 1), 20), text, options: options || '', ans: ans || '',
            figName: IMG_EXT_RE.test(fileCell) ? fileCell : '', figHint: fileCell || '',
            fig: (rowImages && rowImages[i]) || null
          });
        }
      }
      attachFigureNames();
      renderBulkParsedTable();
    }

    /* duplicate detection: same question statement + options (ignores case, spacing and end punctuation) */
    function bulkQuestionKey(q) {
      const norm = v => String(v || '').toLowerCase().replace(/\s+/g, '').replace(/[.,;:!?]+$/, '');
      return norm(q.text) + '||' + norm(q.options);
    }
    /* Picks up to `count` questions from `cands` for a paper. A question is skipped when the same question (same statement + options)
       is already in the paper, even if it is stored in the bank twice under different IDs. stats.dup counts the skipped copies. */
    function pickDistinctQuestions(cands, count, usedIds, usedKeys, stats) {
      const out = [];
      for (let i = 0; i < cands.length && out.length < count; i++) {
        const q = cands[i];
        if (usedIds.has(q.id)) continue;
        const k = bulkQuestionKey(q);
        if (usedKeys.has(k)) { if (stats) stats.dup++; continue; }
        usedIds.add(q.id);
        usedKeys.add(k);
        out.push(q);
      }
      return out;
    }

    function bulkBankKeySet() {
      const set = new Set();
      state.questions.forEach(q => set.add(bulkQuestionKey(q)));
      return set;
    }

    function renderBulkParsedTable() {
      const tbody = document.getElementById('bulk-parsed-body');
      const countEl = document.getElementById('bulk-parsed-count');
      if (!tbody) return;
      tbody.innerHTML = '';
      const withFig = state.parsedBulkItems.filter(i => i.fig).length;
      if (countEl) countEl.innerText = `${state.parsedBulkItems.length} questions detected` + (withFig ? `, ${withFig} with figures` : '');
      if (countEl && document.getElementById('bulk-skip-dupes')?.checked) {
        const _ks = bulkBankKeySet(); let _d = 0;
        state.parsedBulkItems.forEach(it => { const k = bulkQuestionKey(it); if (_ks.has(k)) _d++; else _ks.add(k); });
        if (_d) countEl.innerText += `, ${_d} duplicate(s) will be skipped`;
      }
      if (state.parsedBulkItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-slate-400 italic">No questions parsed yet. Upload a file or click "Parse Pasted Data". Format: Marks, Question, Options, Answer, Figure.</td></tr>`;
        return;
      }
      const _dupSeen = (document.getElementById('bulk-skip-dupes')?.checked) ? bulkBankKeySet() : null;
      let _dupCount = 0;
      state.parsedBulkItems.forEach((item, idx) => {
        const tr = document.createElement('tr');
        let _isDup = false;
        if (_dupSeen) { const _k = bulkQuestionKey(item); _isDup = _dupSeen.has(_k); _dupSeen.add(_k); if (_isDup) _dupCount++; }
        tr.className = _isDup ? "bg-amber-50 opacity-80" : "hover:bg-slate-50";
        const figCell = item.fig
          ? `<img src="${item.fig.dataUrl}" class="max-h-14 max-w-[90px] mx-auto border rounded bg-white" alt="Figure"><button type="button" onclick="removeBulkFigure(${idx})" class="text-[10px] text-rose-700 underline cursor-pointer">Remove</button>`
          : (item.figName ? `<div class="text-[9px] text-amber-700 font-semibold">${escapeHtml(item.figName)} not found</div>` : '<span class="text-slate-300">—</span>');
        tr.innerHTML = `
          <td class="p-2 text-center font-bold font-mono text-brand-900">${item.marks}</td>
          <td class="p-2">${_isDup ? '<span class="inline-block mb-0.5 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[9px] font-black">DUPLICATE - will be skipped</span>' : ''}<p class="font-semibold text-slate-900">${escapeHtml(item.text)}</p>
            ${item.options ? `<p class="text-slate-500 font-mono text-[10px] mt-0.5">${escapeHtml(item.options)}</p>` : ''}</td>
          <td class="p-2 text-emerald-800 font-bold text-center">${escapeHtml(item.ans || '—')}</td>
          <td class="p-2 text-center">${figCell}
            <label class="block text-[10px] text-blue-700 underline cursor-pointer">${item.fig ? 'Replace' : 'Attach'}
              <input type="file" accept="image/*" class="hidden" onchange="attachBulkFigure(event, ${idx})"></label></td>`;
        tbody.appendChild(tr);
      });
      if (typeof renderMath === 'function') renderMath(tbody);
    }

    function commitBulkImport() {
      if (state.parsedBulkItems.length === 0) return alert('No parsed questions to import. Please upload a file or parse pasted data.');

      let bankType = document.getElementById('bulk-target-bank-type').value;
      let std = document.getElementById('bulk-target-std').value;
      const sub = document.getElementById('bulk-target-sub').value;
      const med = document.getElementById('bulk-target-med').value;
      if (!guardEdit(sub, 'import', { std, bankType })) return;
      const chapName = document.getElementById('bulk-target-chap-name').value.trim() || document.getElementById('bulk-target-chap-no').value.trim();

      if (bankType === 'GUJCET' || std === 'GUJCET') { bankType = 'GUJCET'; std = 'GUJCET'; }
      const skipDupes = !!document.getElementById('bulk-skip-dupes')?.checked;
      const seenKeys = skipDupes ? bulkBankKeySet() : null;
      let count = 0, skipped = 0, withFig = 0;

      state.parsedBulkItems.forEach(item => {
        if (seenKeys) {
          const k = bulkQuestionKey(item);
          if (seenKeys.has(k)) { skipped++; return; }
          seenKeys.add(k);
        }
        count++; if (item.fig) withFig++;
        state.questions.unshift({
          id: 'q-b-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
          bankType, std, subject: sub, chapter: chapName, medium: med, marks: item.marks,
          section: bankType === 'GUJCET' ? 'GUJCET MCQ' : sectionForMarks(item.marks),
          text: item.text, options: item.options || '', answer: item.ans || '',
          ...(item.fig ? { diagram: item.fig.dataUrl, diagramW: item.fig.w, diagramH: item.fig.h } : {})
        });
      });

      if (count === 0) return alert(`Nothing imported: all ${skipped} question(s) already exist in the Question Bank. Untick "Skip questions already in the Question Bank" to import them anyway.`);

      state.parsedBulkItems = []; // prevents duplicate import on a second click
      persistQuestions('questions');
      filterQuestionBank();
      closeModal('modal-bulk-import');
      alert(`Successfully imported ${count} questions for ${chapName}` + (bankType === 'PREVYEAR' ? ' into Previous Years Board Questions' : '') + (withFig ? ` (${withFig} with figures)` : '') + '!' + (skipped ? `\n${skipped} duplicate question(s) already in the bank were skipped.` : ''));
    }

    function openBulkDeleteModal() {
      syncSubjectDropdown('del-bulk-std', 'del-bulk-sub');
      const _mk = document.getElementById('del-bulk-marks'); if (_mk) _mk.value = '';
      updateBulkDeleteCount();
      openModal('modal-bulk-delete');
    }

    function bulkDeleteMatches(q, std, sub, chapKey, marksKey) {
      if (!chapKey) return false;
      if (!canEditSubject(q.subject, q)) return false;
      if ((q.bankType === 'PREVYEAR') !== (state.currentBankType === 'PREVYEAR')) return false;
      if (std !== 'ALL' && q.std !== std) return false;
      if (sub !== 'ALL' && q.subject !== sub) return false;
      if (marksKey && String(q.marks) !== String(marksKey)) return false;
      return chapterMatches(q.chapter, chapKey); // "Ch 1" no longer matches "Ch 10"
    }

    /* fill the Marks dropdown with the mark values present in the targeted chapter */
    function refreshBulkDeleteMarks(std, sub, key) {
      const sel = document.getElementById('del-bulk-marks');
      if (!sel) return '';
      const prev = sel.value;
      const marks = new Set();
      state.questions.forEach(q => { if (bulkDeleteMatches(q, std, sub, key, '')) marks.add(String(q.marks)); });
      const list = [...marks].filter(m => m && m !== 'undefined').sort((a, b) => parseFloat(a) - parseFloat(b));
      sel.innerHTML = '<option value="">All Marks</option>' + list.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)} ${m === '1' ? 'Mark' : 'Marks'}</option>`).join('');
      sel.value = list.includes(prev) ? prev : '';
      return sel.value;
    }

    function updateBulkDeleteCount() {
      const std = document.getElementById('del-bulk-std')?.value;
      const sub = document.getElementById('del-bulk-sub')?.value;
      const key = (document.getElementById('del-bulk-chap')?.value || '').trim();
      const countEl = document.getElementById('del-affected-count');
      if (!countEl || !std) return;
      const marksKey = refreshBulkDeleteMarks(std, sub, key);
      countEl.innerText = state.questions.filter(q => bulkDeleteMatches(q, std, sub, key, marksKey)).length;
    }

    function confirmBulkDeleteChapter() {
      const std = document.getElementById('del-bulk-std').value;
      const sub = document.getElementById('del-bulk-sub').value;
      const key = (document.getElementById('del-bulk-chap').value || '').trim();
      if (!key) return alert('Please specify the chapter number or name to delete.');

      const marksKey = document.getElementById('del-bulk-marks')?.value || '';
      const count = state.questions.filter(q => bulkDeleteMatches(q, std, sub, key, marksKey)).length;
      if (count === 0) return alert('No matching questions found to delete.');

      const marksTxt = marksKey ? ` (${marksKey} ${marksKey === '1' ? 'Mark' : 'Marks'} only)` : '';
      if (confirm(`Are you sure you want to permanently delete ALL ${count} questions for "${key}"${marksTxt} across all devices?`)) {
        state.questions = state.questions.filter(q => !bulkDeleteMatches(q, std, sub, key, marksKey));
        persistQuestions('questions');
        filterQuestionBank();
        closeModal('modal-bulk-delete');
        alert(`Deleted ${count} questions successfully!`);
      }
    }
    /* ========================= GUJCET PDF IMPORT (subject-wise) ========================= */
    const GPDF_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const GPDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const GPDF_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics'];
    let gpdfItems = [];
    let gpdfFileName = '';
    let gpdfLibPromise = null;

    /* ---- subject heading detection (English + Gujarati) ---- */
    const GPDF_SUBJECT_WORDS = {
      physics: 'Physics', 'ભૌતિક': 'Physics', 'ભૌતિકવિજ્ઞાન': 'Physics',
      chemistry: 'Chemistry', 'રસાયણ': 'Chemistry', 'રસાયણવિજ્ઞાન': 'Chemistry',
      mathematics: 'Mathematics', maths: 'Mathematics', math: 'Mathematics', 'ગણિત': 'Mathematics'
    };
    const GPDF_FILLER = new Set(['section', 'part', 'subject', 'paper', 'gujcet', 'marks', 'mark', 'questions', 'question', 'a', 'b', 'c', 'i', 'ii', 'iii',
      'of', 'and', 'the', 'std', 'board', 'exam', 'test', 'time', 'તમામ', 'વિજ્ઞાન', 'વિષય', 'વિભાગ', 'પ્રશ્ન', 'પ્રશ્નો', 'ગુણ']);

    function gpdfDetectSubject(line) {
      const t = (line || '').trim();
      if (!t || t.length > 70) return null;
      if (/^\(?\d{1,3}\s*[.)\]]/.test(t)) return null;
      const tokens = t.toLowerCase().split(/[^a-z\u0A80-\u0AFF]+/).filter(Boolean).filter(w => !GPDF_FILLER.has(w));
      if (!tokens.length || tokens.length > 2) return null;
      const subs = new Set();
      for (const w of tokens) {
        if (!GPDF_SUBJECT_WORDS[w]) return null;
        subs.add(GPDF_SUBJECT_WORDS[w]);
      }
      return subs.size === 1 ? [...subs][0] : null;
    }

    const GPDF_KEY_RE = /answer\s*key|ans(?:wer)?s?\s*key|ઉત્તર\s*ચાવી|ઉત્તરમાળા|ઉત્તર\s*કી/i;
    const GPDF_QSTART_RE = /^\s*(?:Q(?:ue(?:stion)?)?\.?\s*)?(\d{1,3})\s*[.)\]:]\s*(.*)$/i;

    /* ---- split one question block into statement / options / inline answer ---- */
    function gpdfSplitQuestion(raw) {
      let s = String(raw).replace(/\s+/g, ' ').trim();
      let ans = '';
      const am = s.match(/(?:\b(?:Ans(?:wer)?|Correct(?:\s*Answer)?)\b|ઉત્તર|જવાબ)\s*[:\-–]?\s*\(?\s*([A-Da-d1-4])\s*\)?\s*$/i);
      if (am) { ans = am[1]; s = s.slice(0, am.index).trim(); }

      const L = ['A', 'B', 'C', 'D'];
      const styles = [
        i => `\\(\\s*${L[i]}\\s*\\)`,
        i => `\\(\\s*${L[i].toLowerCase()}\\s*\\)`,
        i => `\\(\\s*${i + 1}\\s*\\)`,
        i => `(?:^|\\s)[${L[i]}${L[i].toLowerCase()}][.)](?=\\s)`,
        i => `(?:^|\\s)${i + 1}[.)](?=\\s)`
      ];
      for (const mk of styles) {
        const firsts = [...s.matchAll(new RegExp(mk(0), 'g'))].map(m => m.index);
        for (let f = firsts.length - 1; f >= 0; f--) {
          const marks = [];
          let from = firsts[f];
          for (let i = 0; i < 4; i++) {
            const re = new RegExp(mk(i), 'g'); re.lastIndex = from + (i === 0 ? 0 : 1);
            const m = re.exec(s);
            if (!m) break;
            marks.push({ start: m.index, end: m.index + m[0].length });
            from = m.index + m[0].length - 1;
          }
          if (marks.length >= 3) {
            const text = s.slice(0, marks[0].start).trim();
            const opts = marks.map((mk2, i) => {
              const endPos = i + 1 < marks.length ? marks[i + 1].start : s.length;
              return `(${L[i]}) ${s.slice(mk2.end, endPos).trim()}`.trim();
            });
            return { text, options: opts.join('   '), ans: ans ? ans.toUpperCase().replace(/[1-4]/, d => L[+d - 1]) : '', hasOpts: true };
          }
        }
      }
      return { text: s, options: '', ans: ans ? ans.toUpperCase().replace(/[1-4]/, d => L[+d - 1]) : '', hasOpts: false };
    }

    /* ---- answer key parsing: returns { num: [letters in order of appearance] } ---- */
    function gpdfParseKey(keyLines) {
      const text = keyLines.join(' ').replace(/[|]/g, ' ');
      const L = ['A', 'B', 'C', 'D'];
      const re = /(\d{1,3})\s*[-–—:.)]*\s*\(?\s*([A-Da-d1-4])\s*\)?(?=\s|$|[,;.])/g;
      const map = {};
      let m;
      while ((m = re.exec(text))) {
        const n = parseInt(m[1], 10);
        let a = m[2].toUpperCase();
        if (/[1-4]/.test(a)) a = L[+a - 1];
        (map[n] = map[n] || []).push(a);
      }
      return map;
    }

    /* ---- main parser: array of text lines -> question items ---- */
    function gpdfParseLines(lines, opts) {
      opts = opts || {};
      const blocks = [];
      const keyLines = [];
      let cur = null, curSub = null, lastNum = null, inKey = false, sawHeading = false;

      const flush = () => { if (cur) { blocks.push(cur); cur = null; } };

      for (let raw of lines) {
        const line = String(raw).replace(/\s+/g, ' ').trim();
        if (!line) continue;
        if (/^(page\s*)?\d{1,3}$/i.test(line) || /^page\s*\d+(\s*(of|\/)\s*\d+)?$/i.test(line)) continue;

        if (inKey) { keyLines.push(line); continue; }

        if (line.length < 60 && GPDF_KEY_RE.test(line) && blocks.length + (cur ? 1 : 0) > 0) {
          flush(); inKey = true; continue;
        }
        const sub = gpdfDetectSubject(line);
        if (sub) { flush(); curSub = sub; sawHeading = true; continue; }

        const qm = line.match(GPDF_QSTART_RE);
        if (qm) {
          const n = parseInt(qm[1], 10);
          if (lastNum === null || n === 1 || n === lastNum + 1) {
            flush();
            cur = { num: n, subject: curSub, lines: [qm[2]] };
            lastNum = n;
            continue;
          }
        }
        if (cur) cur.lines.push(line);
      }
      flush();

      let items = blocks.map(b => {
        const sp = gpdfSplitQuestion(b.lines.join(' '));
        return { num: b.num, subject: b.subject, text: sp.text, options: sp.options, ans: sp.ans, hasOpts: sp.hasOpts };
      });

      // drop instruction lines like "1. All questions are compulsory" when most blocks are MCQs
      const withOpts = items.filter(i => i.hasOpts).length;
      if (items.length && withOpts / items.length >= 0.3) items = items.filter(i => i.hasOpts);
      items = items.filter(i => i.text || i.options);

      // subject fallback when the PDF has no subject headings
      const defSub = opts.defaultSubject || 'Mathematics';
      if (!sawHeading && opts.splitMode === 'every40') {
        items.forEach((it, idx) => { it.subject = GPDF_SUBJECTS[Math.min(Math.floor(idx / 40), 2)]; });
      }
      items.forEach(it => { if (!it.subject) it.subject = defSub; });

      // answers from key (only fill what the question itself did not carry)
      const keyMap = gpdfParseKey(keyLines);
      if (Object.keys(keyMap).length) {
        const order = [];
        items.forEach(it => { if (!order.includes(it.subject)) order.push(it.subject); });
        order.forEach((sub, subIdx) => {
          const subItems = items.filter(i => i.subject === sub);
          subItems.forEach((it, idx) => {
            if (!it.ans) {
              const numKey = it.num || (idx + 1);
              const answers = keyMap[numKey] || [];
              if (answers.length > subIdx) it.ans = answers[subIdx];
              else if (answers.length === 1 && order.length === 1) it.ans = answers[0];
            }
          });
        });
      }
      return items;
    }

    async function ensurePdfJsLoaded() {
      if (window.pdfjsLib) return;
      if (gpdfLibPromise) return gpdfLibPromise;
      gpdfLibPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = GPDF_LIB_URL;
        s.onload = () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = GPDF_WORKER_URL;
            resolve();
          } else reject(new Error('PDF.js failed to initialize.'));
        };
        s.onerror = () => reject(new Error('Failed to load PDF library.'));
        document.head.appendChild(s);
      });
      return gpdfLibPromise;
    }

    async function gpdfExtractLines(file, onProgress) {
      await ensurePdfJsLoaded();
      const ab = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
      const lines = [];
      let totalChars = 0;
      for (let p = 1; p <= pdf.numPages; p++) {
        if (onProgress) onProgress(p, pdf.numPages);
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        let lastY = null;
        let lineAcc = '';
        tc.items.forEach(item => {
          totalChars += item.str.length;
          const y = Math.round(item.transform[5]);
          if (lastY === null || Math.abs(y - lastY) > 4) {
            if (lineAcc.trim()) lines.push(lineAcc.trim());
            lineAcc = item.str;
            lastY = y;
          } else {
            lineAcc += ' ' + item.str;
          }
        });
        if (lineAcc.trim()) lines.push(lineAcc.trim());
      }
      return { lines, chars: totalChars };
    }

    function openGujcetPdfModal() {
      gpdfItems = [];
      gpdfFileName = '';
      const stat = document.getElementById('gpdf-status');
      if (stat) stat.textContent = '';
      renderGpdfTable();
      openModal('modal-gujcet-pdf');
    }

    let gpdfRawLines = [];
    async function handleGujcetPdfSelect(event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!file) return;
      gpdfFileName = file.name;
      const stat = document.getElementById('gpdf-status');
      if (stat) stat.textContent = 'Reading PDF...';
      try {
        const res = await gpdfExtractLines(file, (cur, total) => {
          if (stat) stat.textContent = `Reading PDF page ${cur} of ${total}...`;
        });
        gpdfRawLines = res.lines;
        gpdfReparse();
        if (stat) stat.textContent = `Loaded ${gpdfItems.length} question(s) from ${gpdfFileName}.`;
      } catch (err) {
        if (stat) stat.textContent = 'Error: ' + err.message;
      }
    }

    function gpdfReparse() {
      if (!gpdfRawLines.length) return;
      const splitMode = document.getElementById('gpdf-split-mode')?.value || 'all';
      const defSub = document.getElementById('gpdf-default-sub')?.value || 'Mathematics';
      gpdfItems = gpdfParseLines(gpdfRawLines, { splitMode, defaultSubject: defSub });
      renderGpdfTable();
    }

    function renderGpdfTable() {
      const tbody = document.getElementById('gpdf-body');
      const countEl = document.getElementById('gpdf-count');
      const chipsEl = document.getElementById('gpdf-chips');
      if (!tbody) return;
      tbody.innerHTML = '';
      if (countEl) countEl.innerText = `${gpdfItems.length} questions detected`;

      const subCounts = {};
      gpdfItems.forEach(i => { subCounts[i.subject] = (subCounts[i.subject] || 0) + 1; });
      if (chipsEl) {
        chipsEl.innerHTML = Object.keys(subCounts).map(s => 
          `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">${escapeHtml(s)}: ${subCounts[s]}</span>`
        ).join(' ');
      }

      if (!gpdfItems.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">No questions loaded yet. Choose a PDF above.</td></tr>`;
        return;
      }

      gpdfItems.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50";
        tr.innerHTML = `
          <td class="p-2 text-center font-mono text-slate-500">${idx + 1}</td>
          <td class="p-2">
            <p class="font-semibold text-slate-900">${escapeHtml(item.text)}</p>
            ${item.options ? `<p class="text-slate-500 font-mono text-[10px] mt-0.5">${escapeHtml(item.options)}</p>` : ''}
          </td>
          <td class="p-2 text-center">
            <input type="text" maxlength="4" value="${escapeHtml(item.ans || '')}" onchange="gpdfItems[${idx}].ans=this.value.toUpperCase()" class="w-10 p-1 border rounded text-center font-bold text-emerald-800">
          </td>
          <td class="p-2">
            <select onchange="gpdfItems[${idx}].subject=this.value" class="w-full border rounded p-1 text-xs">
              ${GPDF_SUBJECTS.map(s => `<option value="${s}" ${s === item.subject ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
          <td class="p-2 text-center">
            <button type="button" onclick="gpdfItems.splice(${idx},1); renderGpdfTable();" class="text-rose-600 hover:text-rose-800 font-bold">&times;</button>
          </td>`;
        tbody.appendChild(tr);
      });
    }

    function commitGujcetPdfImport() {
      if (!gpdfItems.length) return alert('No parsed questions to import.');
      const med = document.getElementById('gpdf-medium')?.value || 'Gujarati';
      const chap = document.getElementById('gpdf-chapter')?.value.trim() || 'GUJCET Practice';

      let count = 0;
      gpdfItems.forEach(item => {
        if (!item.text) return;
        state.questions.unshift({
          id: 'q-gpdf-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
          bankType: 'GUJCET', std: 'GUJCET', subject: item.subject,
          chapter: chap, medium: med, section: 'GUJCET MCQ', marks: 1,
          text: item.text, options: item.options || '', answer: item.ans || ''
        });
        count++;
      });

      persistQuestions('questions');
      filterQuestionBank();
      closeModal('modal-gujcet-pdf');
      alert(`Imported ${count} GUJCET questions from PDF successfully!`);
    }

