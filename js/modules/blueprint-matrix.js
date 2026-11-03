/* ========================= DROPDOWNS ========================= */
    function initSubjectDropdowns() {
      ['paper', 'filter', 'chapter-add', 'add-q', 'matrix-filter', 'bulk-target', 'del-bulk'].forEach(p => {
        const stdId = p === 'paper' ? 'paper-std' : p + '-std';
        const subId = p === 'paper' ? 'paper-sub' : p + '-sub';
        syncSubjectDropdown(stdId, subId);
      });
    }

    function syncSubjectDropdown(stdId, subId) {
      const stdEl = document.getElementById(stdId);
      const subEl = document.getElementById(subId);
      if (!stdEl || !subEl) return;
      const subjects = GSEB_SUBJECTS[stdEl.value] || GSEB_SUBJECTS["Std 10"];
      subEl.innerHTML = '';
      if (stdId === 'filter-std' || stdId === 'del-bulk-std') {
        const optAll = document.createElement('option');
        optAll.value = "ALL"; optAll.innerText = "All Subjects";
        subEl.appendChild(optAll);
      }
      subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub;
        subEl.appendChild(opt);
      });
      if (typeof refreshComingSoon === 'function' && (subId === 'paper-sub' || subId === 'filter-sub')) {
        // a locked subject must not be the default selection after a Standard change
        if (typeof isSubjectLockedFast === 'function' && subEl.value && subEl.value !== 'ALL' && isSubjectLockedFast(subEl.value, selectLockCtx(subEl))) {
          const alt = firstUnlockedOption(subEl);
          if (alt) subEl.value = alt;
        }
        refreshComingSoon();
      }
    }

    /* ========================= BLUEPRINT MATRIX ========================= */
    function getChapterBankBreakdown(row) {
      const activeStd = row.std || document.getElementById('matrix-filter-std')?.value || 'Std 10';
      const activeSub = row.sub || document.getElementById('matrix-filter-sub')?.value || '';

      const matched = state.questions.filter(q => {
        if (q.bankType === 'PREVYEAR' || isSubjectLockedFast(q.subject, q)) return false;
        if (activeStd === 'GUJCET') {
          if (q.bankType !== 'GUJCET' && q.std !== 'GUJCET') return false;
        } else {
          if (q.bankType === 'GUJCET' || q.std === 'GUJCET') return false;
          if (q.std && q.std !== activeStd) return false;
        }
        if (activeSub && q.subject && q.subject !== activeSub) return false;
        return chapterMatches(q.chapter, row.name);
      });

      // a question stored twice counts once (same statement + options + marks)
      const seenKeys = new Set();
      const distinct = matched.filter(q => {
        const k = bulkQuestionKey(q) + '|' + (parseInt(q.marks) || 0);
        if (seenKeys.has(k)) return false;
        seenKeys.add(k);
        return true;
      });
      const count = m => distinct.filter(q => parseInt(q.marks) === m).length;
      return { total: distinct.length, m1: count(1), m2: count(2), m3: count(3), m4: count(4) };
    }

    function setMatrixMode(mode) {
      state.matrixMode = mode;
      const gsebBtn = document.getElementById('matrix-mode-gseb');
      const gujcetBtn = document.getElementById('matrix-mode-gujcet');
      const filterStd = document.getElementById('matrix-filter-std');
      const on = "px-3 py-1 rounded bg-brand-900 text-white cursor-pointer";
      const off = "px-3 py-1 rounded text-slate-700 hover:text-brand-900 cursor-pointer";
      if (mode === 'GUJCET') {
        gujcetBtn.className = on; gsebBtn.className = off;
        filterStd.value = 'GUJCET';
      } else {
        gsebBtn.className = on; gujcetBtn.className = off;
        if (filterStd.value === 'GUJCET') filterStd.value = 'Std 10';
      }
      syncSubjectDropdown('matrix-filter-std', 'matrix-filter-sub');
      applyMatrixSelectorFilter();
    }

    function applyMatrixSelectorFilter() {
      const stdVal = document.getElementById('matrix-filter-std')?.value || 'Std 10';
      const subVal = document.getElementById('matrix-filter-sub')?.value || '';
      const badgeEl = document.getElementById('matrix-active-filter-badge');
      if (badgeEl) badgeEl.innerText = `${stdVal} - ${subVal}`;
      renderMatrixTable();
      renderSavedBlueprintsList();
    }

    function getMatrixWeights() {
      return {
        c1: parseInt(document.getElementById('custom-weight-c1')?.value) || 5,
        c2: parseInt(document.getElementById('custom-weight-c2')?.value) || 6
      };
    }

    function rowTotals(r, w) {
      const g = k => r[k] || 0;
      return {
        qWo: g('m1_wo') + g('m2_wo') + g('m3_wo') + g('m4_wo') + g('c1_wo') + g('c2_wo'),
        qWith: g('m1_with') + g('m2_with') + g('m3_with') + g('m4_with') + g('c1_with') + g('c2_with'),
        mWo: g('m1_wo') + 2 * g('m2_wo') + 3 * g('m3_wo') + 4 * g('m4_wo') + g('c1_wo') * w.c1 + g('c2_wo') * w.c2,
        mWith: g('m1_with') + 2 * g('m2_with') + 3 * g('m3_with') + 4 * g('m4_with') + g('c1_with') * w.c1 + g('c2_with') * w.c2
      };
    }

    function getFilteredMatrixRows() {
      const std = document.getElementById('matrix-filter-std')?.value;
      const sub = document.getElementById('matrix-filter-sub')?.value;
      return state.blueprintRows.filter(r => (!r.std || r.std === std) && (!r.sub || r.sub === sub));
    }

    function renderMatrixTable() {
      const tbody = document.getElementById('matrix-body');
      const filterStdEl = document.getElementById('matrix-filter-std');
      const filterSubEl = document.getElementById('matrix-filter-sub');
      if (!tbody || !filterStdEl || !filterSubEl) return;

      const w = getMatrixWeights();
      const thC1 = document.getElementById('th-custom-1');
      const thC2 = document.getElementById('th-custom-2');
      if (thC1) thC1.innerHTML = `Custom 1 (${w.c1}M)`;
      if (thC2) thC2.innerHTML = `Custom 2 (${w.c2}M)`;

      tbody.innerHTML = '';
      const rows = getFilteredMatrixRows();
      let totalBank = 0;

      if (rows.length === 0 && filterStdEl.value !== 'ALL' && filterSubEl.value !== 'ALL' && !pairHasQuestions(filterStdEl.value, filterSubEl.value)) {
        tbody.innerHTML = `<tr><td colspan="19" class="p-8 text-center space-y-2"><div class="text-2xl">🔒</div>${SOON_BADGE_HTML}<div class="text-xs text-slate-500">${escapeHtml(filterStdEl.value)} | ${escapeHtml(filterSubEl.value)} will be added soon.</div></td></tr>`;
        recalculateMatrix();
        const ind0 = document.getElementById('matrix-bank-total-indicator');
        if (ind0) ind0.innerText = `Bank Avail: 0 Qs`;
        return;
      }
      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="19" class="p-6 text-center text-slate-400 italic">No chapters configured yet for ${escapeHtml(filterStdEl.value)} (${escapeHtml(filterSubEl.value)}). Click "+ Add Chapter" or "Add Matrix Row".</td></tr>`;
        recalculateMatrix();
        const indEl = document.getElementById('matrix-bank-total-indicator');
        if (indEl) indEl.innerText = `Bank Avail: 0 Qs`;
        return;
      }

      const cell = (row, key, bg, inputCls) => `
        <td class="p-1 text-center ${bg}">
          <input type="number" min="0" value="${row[key] || 0}" ${(state.isGuest || row.locked || isGuestChapterLocked(row.std, row.sub, row.name)) ? 'disabled' : ''} onchange="updateMatrixRow('${row.id}', '${key}', this.value)" class="w-10 text-center border rounded p-1 mx-auto block text-xs ${inputCls}">
        </td>`;

      rows.forEach((row, idx) => {
        const t = rowTotals(row, w);
        const bd = getChapterBankBreakdown(row);
        totalBank += bd.total;
        const gLocked = !!row.locked || isGuestChapterLocked(row.std, row.sub, row.name);      // guest: only the first two chapters are open

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition border-b border-slate-100 text-[11px]" + (gLocked ? " opacity-60 bg-slate-50" : "");
        if (gLocked && state.isGuest) { tr.style.cursor = 'pointer'; tr.addEventListener('click', e => { if (!e.target.closest('input')) guestLoginPrompt(); }); }
        tr.innerHTML = `
          <td class="p-2 font-mono text-slate-400 font-bold border-r border-slate-200 text-center">${idx + 1}</td>
          <td class="p-2 font-semibold text-slate-800 border-r border-slate-200">
            <div class="text-[12px] font-bold text-slate-900">${gLocked ? '🔒 ' : ''}${escapeHtml(row.name)}${gLocked ? ' <span onclick="guestLoginPrompt()" class="ml-1 px-1.5 py-0.5 rounded bg-yellow-300 text-slate-900 text-[9px] font-black cursor-pointer">SIGN IN TO OPEN</span>' : ''}</div>
            <div class="mt-1 flex flex-wrap items-center gap-1 text-[9px] font-mono no-print">
              <span class="px-1 rounded font-bold ${bd.total > 0 ? 'bg-blue-100 text-brand-900 border border-blue-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}">Avail: ${bd.total} Qs</span>
              <span class="px-1 rounded bg-slate-100 text-slate-700">1M:${bd.m1}</span>
              <span class="px-1 rounded bg-slate-100 text-slate-700">2M:${bd.m2}</span>
              <span class="px-1 rounded bg-slate-100 text-slate-700">3M:${bd.m3}</span>
              <span class="px-1 rounded bg-slate-100 text-slate-700">4M:${bd.m4}</span>
            </div>
          </td>
          ${cell(row, 'm1_wo', 'bg-blue-50/20', 'font-semibold border-slate-300')}
          ${cell(row, 'm1_with', 'border-r border-slate-200 bg-blue-100/30', 'font-bold border-blue-300 text-blue-900 bg-white')}
          ${cell(row, 'm2_wo', 'bg-sky-50/20', 'font-semibold border-slate-300')}
          ${cell(row, 'm2_with', 'border-r border-slate-200 bg-sky-100/30', 'font-bold border-sky-300 text-sky-900 bg-white')}
          ${cell(row, 'm3_wo', 'bg-cyan-50/20', 'font-semibold border-slate-300')}
          ${cell(row, 'm3_with', 'border-r border-slate-200 bg-cyan-100/30', 'font-bold border-cyan-300 text-cyan-900 bg-white')}
          ${cell(row, 'm4_wo', 'bg-teal-50/20', 'font-semibold border-slate-300')}
          ${cell(row, 'm4_with', 'border-r border-slate-200 bg-teal-100/30', 'font-bold border-teal-300 text-teal-900 bg-white')}
          ${cell(row, 'c1_wo', 'bg-purple-50/20', 'font-semibold border-purple-200 text-purple-900 bg-white')}
          ${cell(row, 'c1_with', 'border-r border-slate-200 bg-purple-100/30', 'font-bold border-purple-400 text-purple-950 bg-white')}
          ${cell(row, 'c2_wo', 'bg-indigo-50/20', 'font-semibold border-indigo-200 text-indigo-900 bg-white')}
          ${cell(row, 'c2_with', 'border-r border-slate-200 bg-indigo-100/30', 'font-bold border-indigo-400 text-indigo-950 bg-white')}
          <td class="p-1 text-center font-mono font-bold bg-amber-50 text-amber-900">${t.qWo}</td>
          <td class="p-1 text-center font-mono font-black border-r border-slate-200 bg-amber-100/70 text-amber-950">${t.qWith}</td>
          <td class="p-1 text-center font-mono font-bold bg-emerald-50 text-emerald-900">${t.mWo}M</td>
          <td class="p-1 text-center font-mono font-black border-r border-slate-200 bg-emerald-100/70 text-emerald-950">${t.mWith}M</td>
          <td class="p-1 text-center no-print">
            ${gLocked || state.isGuest ? '' : `<button type="button" onclick="deleteMatrixRow('${row.id}')" class="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>`}
          </td>`;
        tbody.appendChild(tr);
      });

      const totalInd = document.getElementById('matrix-bank-total-indicator');
      if (totalInd) totalInd.innerText = `Bank Avail: ${totalBank} Qs`;
      recalculateMatrix();
      if (window.lucide && lucide.createIcons) lucide.createIcons();
    }

    function updateMatrixRow(id, field, value) {
      const row = state.blueprintRows.find(r => r.id === id);
      if (row) {
        if (!guardEdit(row.sub, 'edit', row)) { renderMatrixTable(); return; }
        row[field] = Math.max(0, parseInt(value) || 0);
        persistQuestions('matrix'); // also re-renders the table
      }
    }

    function addBlueprintRow() {
      const activeStd = document.getElementById('matrix-filter-std')?.value || 'Std 10';
      const activeSub = document.getElementById('matrix-filter-sub')?.value || '';
      const count = state.blueprintRows.filter(r => r.std === activeStd && r.sub === activeSub).length + 1;
      if (!guardEdit(activeSub, 'add', { std: activeStd })) return;
      state.blueprintRows.push({
        id: 'bp-' + Date.now(), std: activeStd, sub: activeSub, name: `Ch ${count} - Topic`,
        m1_wo: 1, m1_with: 1, m2_wo: 1, m2_with: 1, m3_wo: 0, m3_with: 0, m4_wo: 0, m4_with: 0, c1_wo: 0, c1_with: 0, c2_wo: 0, c2_with: 0
      });
      persistQuestions('matrix');
    }

    function deleteMatrixRow(id) {
      const _r = state.blueprintRows.find(r => r.id === id);
      if (_r && !guardEdit(_r.sub, 'remove', _r)) return;
      if (confirm('Remove this chapter from matrix?')) {
        state.blueprintRows = state.blueprintRows.filter(r => r.id !== id);
        persistQuestions('matrix');
      }
    }

    function recalculateMatrix() {
      if (!document.getElementById('matrix-filter-std')) return;
      const w = getMatrixWeights();
      const rows = getFilteredMatrixRows();
      const sums = {};
      ['m1', 'm2', 'm3', 'm4', 'c1', 'c2'].forEach(k => { sums[k + '_wo'] = 0; sums[k + '_with'] = 0; });
      let qWo = 0, qWith = 0, mWo = 0, mWith = 0;
      rows.forEach(r => {
        Object.keys(sums).forEach(k => { sums[k] += r[k] || 0; });
        const t = rowTotals(r, w);
        qWo += t.qWo; qWith += t.qWith; mWo += t.mWo; mWith += t.mWith;
      });
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
      ['1m', '2m', '3m', '4m', 'c1', 'c2'].forEach(k => {
        const key = k.startsWith('c') ? k : 'm' + k[0];
        setVal(`foot-${k}-wo`, sums[key + '_wo']);
        setVal(`foot-${k}-with`, sums[key + '_with']);
      });
      setVal('foot-q-no-opt', qWo + " Qs");
      setVal('foot-q-with-opt', qWith + " Qs");
      setVal('foot-m-no-opt', mWo + " M");
      setVal('foot-m-with-opt', mWith + " M");
    }

    function saveCurrentBlueprint() {
      recalculateMatrix();
      const std = document.getElementById('matrix-filter-std').value;
      const sub = document.getElementById('matrix-filter-sub').value;
      const med = document.getElementById('matrix-filter-med').value;
      const w = getMatrixWeights();
      const filtered = getFilteredMatrixRows();
      if (filtered.length === 0) return alert('No chapters configured in matrix to save.');
      const bpItem = stampWork({
        id: 'saved-bp-' + Date.now(),
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        std, sub, med, c1Weight: w.c1, c2Weight: w.c2,
        totalMarksWo: document.getElementById('foot-m-no-opt')?.innerText || '0 M',
        totalMarksWith: document.getElementById('foot-m-with-opt')?.innerText || '0 M',
        rows: clone(filtered)
      });
      state.savedBlueprints.unshift(bpItem);
      persistQuestions('none');
      renderSavedBlueprintsList();
      renderArchiveList();
      cloudSaveWork('blueprints', bpItem);
      alert(`Blueprint for "${std} - ${sub}" saved in "${examName(bpItem.exam)}" > Blueprints folder.`);
    }

    function loadSavedBlueprint(id) {
      const bp = state.savedBlueprints.find(b => b.id === id);
      if (!bp) return;
      if (!guardEdit(bp.sub, 'restore', bp)) return;
      state.blueprintRows = state.blueprintRows.filter(r => !(r.std === bp.std && r.sub === bp.sub));
      state.blueprintRows.push(...clone(bp.rows || []));

      const filterStd = document.getElementById('matrix-filter-std');
      const filterSub = document.getElementById('matrix-filter-sub');
      filterStd.value = bp.std;
      syncSubjectDropdown('matrix-filter-std', 'matrix-filter-sub');
      filterSub.value = bp.sub;
      if (bp.med) document.getElementById('matrix-filter-med').value = bp.med;
      if (bp.c1Weight) document.getElementById('custom-weight-c1').value = bp.c1Weight;
      if (bp.c2Weight) document.getElementById('custom-weight-c2').value = bp.c2Weight;

      if (bp.exam) setCurrentExam(bp.exam);
      persistQuestions('matrix');
      applyMatrixSelectorFilter();
      if (getActiveTabId() !== 'tab-blueprint') switchTab('tab-blueprint');
      alert(`Restored Blueprint for ${bp.std} - ${bp.sub}!`);
    }

    function deleteSavedBlueprint(id) {
      const bp = state.savedBlueprints.find(b => b.id === id);
      if (!bp || !workIsMine(bp)) return;
      if (confirm('Delete this saved blueprint?')) {
        cloudRemoveWork('blueprints', bp);
        state.savedBlueprints = state.savedBlueprints.filter(b => b.id !== id);
        persistQuestions('none');
        renderSavedBlueprintsList();
        renderArchiveList();
      }
    }

    function applyBlueprintToPaper() {
      recalculateMatrix();
      const activeStd = document.getElementById('matrix-filter-std')?.value || 'Std 10';
      const activeSub = document.getElementById('matrix-filter-sub')?.value || '';
      const activeMed = document.getElementById('matrix-filter-med')?.value || 'Gujarati';
      const totalMarksWo = (document.getElementById('foot-m-no-opt')?.innerText || '50').replace(' M', '');
      const rows = getFilteredMatrixRows();

      if (rows.length === 0) return alert('No chapters configured for this selection.');

      if (activeStd === 'GUJCET') {
        const gSub = document.getElementById('gujcet-subject');
        const gMed = document.getElementById('gujcet-medium');
        if (gSub && Array.from(gSub.options).some(o => o.value === activeSub)) gSub.value = activeSub;
        if (gMed && Array.from(gMed.options).some(o => o.value === activeMed)) gMed.value = activeMed;

        const pool = getGujcetPool(activeSub, activeMed);
        const used = new Set();
        const usedKeys = new Set();
        const stats = { dup: 0 };
        const chosen = [];
        let short = 0;
        rows.forEach(row => {
          const need = row.m1_with || row.m1_wo || 0;
          const cands = pool.filter(q => !used.has(q.id) && chapterMatches(q.chapter, row.name));
          const picked = pickDistinctQuestions(cands, need, used, usedKeys, stats);
          picked.forEach(q => chosen.push(q));
          short += need - picked.length;
        });
        if (chosen.length === 0) return alert('No matching GUJCET questions found in the bank for this subject/medium/chapters.');
        state.gujcetPaperQuestions = chosen.map(q => ({ ...q }));
        switchTab('tab-gujcet');
        renderGujcetPaperList();
        alert(`Loaded ${chosen.length} MCQs from the matrix.` + (stats.dup ? `\n${stats.dup} duplicate copy/copies of a question already chosen were skipped.` : '') + (short ? `\n${short} MCQ(s) are missing in the bank for the requested counts.` : ''));
        return;
      }

      const w = getMatrixWeights();
      const newPaper = [];
      const usedIds = new Set();
      const usedKeys = new Set();          // same question stored twice in the bank is chosen only once
      const stats = { dup: 0 };
      let missing = 0;

      rows.forEach(row => {
        const plan = [
          { count: row.m1_with || row.m1_wo || 0, marks: 1, sec: 'SECTION A' },
          { count: row.m2_with || row.m2_wo || 0, marks: 2, sec: 'SECTION B' },
          { count: row.m3_with || row.m3_wo || 0, marks: 3, sec: 'SECTION C' },
          { count: row.m4_with || row.m4_wo || 0, marks: 4, sec: 'SECTION D' },
          { count: row.c1_with || row.c1_wo || 0, marks: w.c1, sec: 'SECTION D' },
          { count: row.c2_with || row.c2_wo || 0, marks: w.c2, sec: 'SECTION D' }
        ];
        plan.forEach(s => {
          if (!s.count) return;
          const candidates = state.questions.filter(q =>
            !usedIds.has(q.id) && q.bankType !== 'GUJCET' && q.bankType !== 'PREVYEAR' && !isSubjectLockedFast(q.subject, q) && q.std === activeStd && q.subject === activeSub &&
            parseInt(q.marks) === s.marks && chapterMatches(q.chapter, row.name));

          const picked = pickDistinctQuestions(candidates, s.count, usedIds, usedKeys, stats);
          for (let i = 0; i < s.count; i++) {
            const uid = Date.now() + '-' + Math.random().toString(36).substr(2, 6);
            if (picked[i]) {
              newPaper.push({ ...picked[i], paperItemId: 'p-' + uid, section: s.sec });
            } else {
              missing++;
              newPaper.push({
                id: 'gen-' + uid, paperItemId: 'p-' + uid, bankType: 'GENERAL', std: activeStd, subject: activeSub,
                chapter: row.name, medium: activeMed, section: s.sec, marks: s.marks,
                text: `[${row.name}] Sample examination problem for ${s.marks} mark(s).`,
                answer: `Solution steps for ${row.name}.`,
                options: s.marks === 1 ? '(A) Option 1  (B) Option 2  (C) Option 3  (D) Option 4' : ''
              });
            }
          }
        });
      });

      state.livePaperQuestions = newPaper;
      safeSet(APP_STORAGE_KEY_PAPER, state.livePaperQuestions);

      document.getElementById('paper-marks').value = totalMarksWo || 50;
      document.getElementById('paper-std').value = activeStd;
      syncSubjectDropdown('paper-std', 'paper-sub');
      document.getElementById('paper-sub').value = activeSub;
      document.getElementById('paper-medium').value = activeMed;

      renderLivePaper();
      switchTab('tab-generator');
      alert(`Populated ${newPaper.length} questions into the paper from the Blueprint.` + (stats.dup ? `\n${stats.dup} duplicate copy/copies of a question already chosen were skipped.` : '') + (missing ? `\n${missing} placeholder question(s) were added because the bank has too few matching questions.` : ''));
    }

    function openAddChapterModal() {
      const activeStd = document.getElementById('matrix-filter-std')?.value || 'Std 10';
      const activeSub = document.getElementById('matrix-filter-sub')?.value || '';
      const cStd = document.getElementById('chapter-add-std');
      cStd.value = activeStd;
      syncSubjectDropdown('chapter-add-std', 'chapter-add-sub');
      document.getElementById('chapter-add-sub').value = activeSub;
      openModal('modal-add-chapter');
    }

    function saveNewChapter() {
      const std = document.getElementById('chapter-add-std').value;
      const sub = document.getElementById('chapter-add-sub').value;
      const chapNo = document.getElementById('chapter-add-no').value.trim();
      const chapName = document.getElementById('chapter-add-name').value.trim();
      if (!chapNo || !chapName) return alert('Please provide chapter number and title.');
      if (!guardEdit(sub, 'add', { std: document.getElementById('chapter-add-std')?.value })) return;

      state.blueprintRows.push({
        id: 'bp-' + Date.now(), std, sub, name: `${chapNo} - ${chapName}`,
        m1_wo: 1, m1_with: 1, m2_wo: 1, m2_with: 1, m3_wo: 0, m3_with: 0, m4_wo: 0, m4_with: 0, c1_wo: 0, c1_with: 0, c2_wo: 0, c2_with: 0
      });
      persistQuestions('matrix');
      closeModal('modal-add-chapter');
      document.getElementById('chapter-add-name').value = '';
    }