/* ---- Figures / diagrams ---- */
    const questionDiagrams = { quick: '', add: '', edit: '', gujcet: '' };
    const questionDiagramMeta = { quick: null, add: null, edit: null, gujcet: null };

    // Shrinks any picture to a small white-background JPEG so hundreds of figures fit in storage and sync quickly
    function compressImageBlob(blob) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          try {
            let maxSide = 800, quality = 0.8, out = '', w = 1, h = 1;
            for (let attempt = 0; attempt < 4; attempt++) {
              const nw = img.naturalWidth || img.width || 1, nh = img.naturalHeight || img.height || 1;
              const scale = Math.min(1, maxSide / Math.max(nw, nh));
              w = Math.max(1, Math.round(nw * scale)); h = Math.max(1, Math.round(nh * scale));
              const c = document.createElement('canvas'); c.width = w; c.height = h;
              const ctx = c.getContext('2d');
              ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);    // transparent PNGs would turn black in JPEG
              ctx.drawImage(img, 0, 0, w, h);
              out = c.toDataURL('image/jpeg', quality);
              if (out.length <= 150000) break;
              maxSide = Math.round(maxSide * 0.8); quality = Math.max(0.55, quality - 0.08);
            }
            URL.revokeObjectURL(url);
            resolve({ dataUrl: out, w, h });
          } catch (e) { URL.revokeObjectURL(url); reject(e); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be read (use JPG, PNG or WebP).')); };
        img.src = url;
      });
    }

    function setDiagram(target, res) {
      questionDiagrams[target] = res ? res.dataUrl : '';
      questionDiagramMeta[target] = res ? { w: res.w, h: res.h } : null;
      const preview = document.getElementById(target + '-q-diagram-preview');
      if (preview) {
        if (res) { preview.src = res.dataUrl; preview.classList.remove('hidden'); }
        else { preview.removeAttribute('src'); preview.classList.add('hidden'); }
      }
    }
    function loadDiagramFile(event, target) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { alert('Please choose an image file (JPG, PNG or WebP).'); event.target.value = ''; return; }
      compressImageBlob(file).then(r => setDiagram(target, r)).catch(e => alert(e.message));
    }
    function clearDiagram(target) {
      setDiagram(target, null);
      const input = document.getElementById(target + '-q-diagram'); if (input) input.value = '';
    }
    function figureProps(target) {
      const m = questionDiagramMeta[target] || {};
      return { diagram: questionDiagrams[target] || '', diagramW: m.w || 0, diagramH: m.h || 0 };
    }

    // <img> with explicit width/height so it also sizes correctly in Word
    function figureImgTag(q, maxW) {
      if (!q || !q.diagram || !/^data:image\/(jpeg|png|webp|gif);base64,/i.test(q.diagram)) return '';
      let w = q.diagramW || 360, h = q.diagramH || 270;
      const k = Math.min(1, maxW / w, 300 / h);
      w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
      return `<img src="${q.diagram}" width="${w}" height="${h}" alt="Figure" style="display:block;border:1px solid #cbd5e1;padding:2px;background:#fff;" />`;
    }
    function diagramHtml(q, maxWidth = '440px') {
      const tag = figureImgTag(q, parseInt(maxWidth) || 440);
      return tag ? `<div class="question-diagram" style="margin:7px 0 8px 28px;">${tag}</div>` : '';
    }

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* MathJax: calls are chained (MathJax 3 requirement) and wait until MathJax is loaded */
    function renderMath(target, done) {
      const mj = window.MathJax;
      if (mj && mj.typesetPromise && mj.startup && mj.startup.promise) {
        mj.startup.promise = mj.startup.promise
          .then(() => mj.typesetPromise(target ? [target] : undefined))
          .catch(() => {})
          .then(() => { if (done) done(); });
      } else if (done) {
        done();
      }
    }

    function extractChapterNumber(str) {
      if (!str) return '';
      const match = String(str).match(/(?:ch|chapter|પ્રકરણ)?\s*(\d+)/i);
      return match ? match[1] : '';
    }

    /* Strict chapter matching: "Ch 1" must NOT match "Ch 10" */
    function chapterMatches(a, b) {
      const na = extractChapterNumber(a), nb = extractChapterNumber(b);
      if (na && nb) return na === nb;
      const la = String(a || '').toLowerCase().trim(), lb = String(b || '').toLowerCase().trim();
      return !!la && !!lb && (la.includes(lb) || lb.includes(la));
    }

    function splitOptions(optionsText) {
      if (!optionsText || !String(optionsText).trim()) return [];
      const clean = String(optionsText).trim();
      if (/\(A\)|\(B\)|\(C\)|\(D\)/i.test(clean)) {
        const parts = clean.split(/(?=\([A-D]\))/i).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) return parts;
      }
      return [clean];
    }

    function formatInlineOptionsHtml(optionsText) {
      const parts = splitOptions(optionsText);
      if (!parts.length) return '';
      return `<div class="mcq-options-inline text-slate-800 text-[11px] font-sans font-medium">` +
        parts.map(p => `<span class="mcq-option-col">${escapeHtml(p)}</span>`).join('') + `</div>`;
    }

    /* 1-4 marks keep SECTION A-D; higher marks get their own section: 5 -> SECTION E, 6 -> SECTION F ... */
    function sectionForMarks(marks) {
      const m = Math.min(Math.max(parseInt(marks, 10) || 1, 1), 26);
      return 'SECTION ' + String.fromCharCode(64 + m);
    }

    /* make sure a <select> has an option for this section (needed for SECTION E, F ... in the edit window) */
    function ensureSectionOption(selectId, section) {
      const sel = document.getElementById(selectId);
      if (!sel || !section) return;
      if (!Array.from(sel.options).some(o => o.value === section)) {
        const opt = document.createElement('option');
        opt.value = section; opt.textContent = section;
        const guj = Array.from(sel.options).find(o => o.value === 'GUJCET MCQ');
        sel.insertBefore(opt, guj || null);
      }
    }

    function sectionLabel(secName) {
      const _ex = /^SECTION ([E-Z])$/.exec(secName || '');
      if (_ex) return (_ex[1].charCodeAt(0) - 64) + ' Marks Each';
      return secName === 'SECTION A' ? '1 Mark Each' : secName === 'SECTION B' ? '2 Marks Each' : secName === 'SECTION C' ? '3 Marks Each' : (secName === 'SECTION D' ? 'Detailed Questions' : '');
    }

    function getOrderedPaperSections() {
      const base = ['SECTION A', 'SECTION B', 'SECTION C', 'SECTION D'];
      const extra = [];
      state.livePaperQuestions.forEach(q => {
        const s = q.section || 'SECTION A';
        if (!base.includes(s) && !extra.includes(s)) extra.push(s);
      });
      extra.sort();
      return [...base, ...extra]
        .map(name => ({ name, list: state.livePaperQuestions.filter(q => (q.section || 'SECTION A') === name) }))
        .filter(s => s.list.length > 0);
    }