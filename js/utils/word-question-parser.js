/* ===================================================================
   WORD / PASTED TEXT QUESTION PARSER (UPGRADED)
   Used by:  Add Question window   (target 'add')
             Quick Add to Paper    (target 'quick')
             Edit Question modal   (target 'edit')
   - Reads a .docx file (including native Word OMML equations -> LaTeX!)
     or pasted text from Word.
   - Splits Question, Options ((A), A), A., [A], Gujarati અ/બ/ક/ડ),
     Answer (inline or newline, letter or full text) and Marks.
   =================================================================== */

const WQ_TARGETS = {
  add:   { text: 'add-q-text',   options: 'add-q-options',   ans: 'add-q-ans',   marks: 'add-q-marks' },
  quick: { text: 'quick-q-text', options: 'quick-q-options', ans: 'quick-q-ans', marks: 'quick-q-marks', section: 'quick-section' },
  edit:  { text: 'edit-q-text',  options: 'edit-q-options',  ans: 'edit-q-ans',  marks: 'edit-q-marks',  section: 'edit-q-section' }
};
const wqFound = { add: [], quick: [], edit: [] };

/* ---------- small helpers ---------- */
function wqStatus(target, msg, isErr) {
  const el = document.getElementById(target + '-q-word-status');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'text-[11px] font-semibold ' + (isErr ? 'text-rose-700' : 'text-blue-800');
}

function wqClampMarks(n, def) {
  return Math.min(Math.max(parseInt(n, 10) || def || 1, 1), 20);
}

/* "B" / "(b)" / "2" / "(B) 6" -> "(B) <text of option B>" when options are known */
function wqExpandAnswer(ans, options) {
  const a = String(ans || '').trim();
  if (!a) return '';
  const mapGu = { 'અ': 'A', 'બ': 'B', 'ક': 'C', 'ડ': 'D', 'ખ': 'B', 'ગ': 'C', 'ઘ': 'D', 'अ': 'A', 'ब': 'B', 'क': 'C', 'ड': 'D' };
  const m = a.match(/^\(?\[?\s*([A-Da-d1-4અબકડખગઘअबकड])\s*\]?\)?\s*[.):\-–]?\s*(.*)$/);
  if (!m) return a;
  const L = ['A', 'B', 'C', 'D'];
  let rawChar = m[1];
  let restText = (m[2] || '').trim();
  let letter = mapGu[rawChar] || rawChar.toUpperCase();
  if (/[1-4]/.test(letter)) letter = L[+letter - 1];
  if (options) {
    const om = String(options).match(new RegExp('\\(' + letter + '\\)\\s*(.*?)(?=\\s+\\([A-D]\\)|$)', 'i'));
    if (om && om[1].trim()) return `(${letter}) ${om[1].trim()}`;
  }
  return restText ? `(${letter}) ${restText}` : `(${letter})`;
}

/* Enhanced splitter that handles (A), A), A., [A], (a), a), (1), 1), and Gujarati/Hindi option markers */
function wqSmartSplitQuestion(raw) {
  let s = String(raw || '').replace(/\t+/g, '  ').replace(/\s+/g, ' ').trim();
  let ans = '';

  // 1. Extract inline Answer / Solution / જવાબ / ઉત્તર at the end of the text (supports full answer text too)
  const inlineAnsRe = /(?:\b(?:Ans(?:wer)?|Correct\s*(?:Answer|Option)?|Solution|Sol)\b|ઉત્તર|જવાબ|उत्तर|ઉકેલ)\s*[:：\-–.=]\s*(.+)$/i;
  const am = s.match(inlineAnsRe);
  if (am) {
    ans = am[1].trim();
    s = s.slice(0, am.index).trim();
  }

  const L = ['A', 'B', 'C', 'D'];
  const gu1 = ['અ', 'બ', 'ક', 'ડ'];
  const gu2 = ['ક', 'ખ', 'ગ', 'ઘ'];
  const hi1 = ['अ', 'ब', 'क', 'ड'];

  const styles = [
    // (A) (B) (C) (D) or [A] [B] [C] [D]
    i => `[(\\[\\s]?\\(\\s*${L[i]}\\s*\\)|\\[\\s*${L[i]}\\s*\\]`,
    i => `\\(\\s*${L[i].toLowerCase()}\\s*\\)|\\[\\s*${L[i].toLowerCase()}\\s*\\]`,
    // A) B) C) D) or A. B. C. D.
    i => `(?:^|\\s)[${L[i]}${L[i].toLowerCase()}][.)]\\s+`,
    // (1) (2) (3) (4) or 1) 2) 3) 4)
    i => `\\(\\s*${i + 1}\\s*\\)`,
    i => `(?:^|\\s)${i + 1}[.)]\\s+`,
    // Gujarati (અ) (બ) (ક) (ડ) or અ) બ) ક) ડ)
    i => `(?:\\(\\s*${gu1[i]}\\s*\\)|(?:^|\\s)${gu1[i]}[.)]\\s+)`,
    // Gujarati (ક) (ખ) (ગ) (ઘ)
    i => `(?:\\(\\s*${gu2[i]}\\s*\\)|(?:^|\\s)${gu2[i]}[.)]\\s+)`,
    // Hindi (अ) (ब) (क) (ड)
    i => `(?:\\(\\s*${hi1[i]}\\s*\\)|(?:^|\\s)${hi1[i]}[.)]\\s+)`
  ];

  for (const mk of styles) {
    const firsts = [...s.matchAll(new RegExp(mk(0), 'g'))].map(m => m.index);
    for (let f = firsts.length - 1; f >= 0; f--) {
      const marks = [];
      let from = firsts[f];
      for (let i = 0; i < 4; i++) {
        const re = new RegExp(mk(i), 'g');
        re.lastIndex = from + (i === 0 ? 0 : 1);
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
        const optStr = opts.join('   ');
        return { text, options: optStr, ans: wqExpandAnswer(ans, optStr), hasOpts: true };
      }
    }
  }

  // Fallback to gpdfSplitQuestion if available
  if (typeof gpdfSplitQuestion === 'function') {
    const sp = gpdfSplitQuestion(s);
    const finalAns = wqExpandAnswer(ans || sp.ans, sp.options);
    return { text: sp.text, options: sp.options || '', ans: finalAns, hasOpts: sp.hasOpts };
  }
  return { text: s, options: '', ans: wqExpandAnswer(ans, ''), hasOpts: false };
}

/* ---------- parse ONE question block (lines already belong to the same question) ---------- */
function wqParseBlock(lines, defMarks, secMarks) {
  const ANS_LINE = /^\s*(?:Ans(?:wer)?|Correct\s*(?:Answer|Option)|Solution|Sol|Key)\s*[:：\-–.=]\s*(.*)$|^\s*(?:ઉત્તર|જવાબ|उत्तर|ઉકેલ)\s*[:：\-–.=]\s*(.*)$/i;
  const OPT_LABEL = /^\s*(?:Options?|વિકલ્પો?|विकल्प)\s*[:：\-–]\s*(.*)$/i;
  const Q_LABEL = /^\s*(?:Q(?:ue(?:stion)?)?\.?\s*\d*|પ્રશ્ન\s*\d*|प्रश्न\s*\d*|\(\d+\)|\d+)\s*[:：.)\-–]\s*/i;

  const q = [], a = [];
  let inAns = false, first = true;
  for (const raw of lines) {
    let line = String(raw).replace(/\t+/g, '  ').replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (first) { line = line.replace(Q_LABEL, ''); first = false; }
    const am = line.match(ANS_LINE);
    if (am) { inAns = true; const rest = (am[1] || am[2] || '').trim(); if (rest) a.push(rest); continue; }
    const om = line.match(OPT_LABEL);
    if (om && !inAns) { if (om[1].trim()) q.push(om[1].trim()); continue; }
    (inAns ? a : q).push(line);
  }

  let raw = q.join(' ').replace(/\s+/g, ' ').trim();
  let marks = secMarks || defMarks;
  const em = raw.match(/\[\s*(\d{1,2})\s*(?:marks?|ગુણ|अंक|M)?\s*\]\s*$/i)
          || raw.match(/\(\s*(\d{1,2})\s*(?:marks?|ગુણ|अंक|M)\s*\)\s*$/i)
          || raw.match(/\s(\d{1,2})\s*(?:marks?|ગુણ|अंक)\s*$/i);
  if (em) { marks = wqClampMarks(em[1], defMarks); raw = raw.slice(0, em.index).trim(); }

  const sp = wqSmartSplitQuestion(raw);
  let ans = a.join(' ').replace(/\s+/g, ' ').trim() || sp.ans;
  ans = wqExpandAnswer(ans, sp.options);
  return { marks: wqClampMarks(marks, defMarks), text: sp.text, options: sp.options || '', ans, num: null };
}

/* ---------- parse a whole text (one or many questions) ---------- */
function wqParseText(lines, defMarks) {
  const clean = lines.map(l => String(l).replace(/\t+/g, '  ').replace(/\s+/g, ' ').trim()).filter(Boolean)
    .filter(l => !/^(page\s*)?\d{1,3}$/i.test(l));
  const blocks = [], keyLines = [];
  let cur = null, lastNum = null, inKey = false, secMarks = defMarks;
  const flush = () => { if (cur) { blocks.push(cur); cur = null; } };

  const SINGLE_OPT_START = /^\s*(?:\(?[A-Da-dઅબકડખગઘअबकड]\)|[A-Da-dઅબકડખગઘअबकड][.)])\s+/;

  for (const line of clean) {
    if (inKey) { keyLines.push(line); continue; }
    if (line.length < 60 && typeof GPDF_KEY_RE !== 'undefined' && GPDF_KEY_RE.test(line) && (blocks.length + (cur ? 1 : 0)) > 0) { flush(); inKey = true; continue; }
    if (/^(section|part)\b/i.test(line) || /^(વિભાગ|ભાગ|विभाग)/.test(line)) {
      flush();
      const mm = line.match(/(\d{1,2})\s*(?:marks?|ગુણ|अंक)/i);
      secMarks = mm ? wqClampMarks(mm[1], defMarks) : defMarks;
      continue;
    }
    // Do not treat option lines like "A) 2" as question numbers
    if (!SINGLE_OPT_START.test(line) && typeof GPDF_QSTART_RE !== 'undefined') {
      const qm = line.match(GPDF_QSTART_RE);
      if (qm) {
        const n = parseInt(qm[1], 10);
        if (lastNum === null || n === lastNum + 1 || (n === 1 && qm[2].length >= 15)) {
          flush();
          cur = { num: n, marks: secMarks, lines: [qm[2]] };
          lastNum = n;
          continue;
        }
      }
    }
    if (cur) cur.lines.push(line);
    else if (lastNum === null) { cur = { num: null, marks: secMarks, lines: [line] }; }
  }
  flush();

  let items = blocks.map(b => ({ ...wqParseBlock(b.lines, defMarks, b.marks), num: b.num }))
    .filter(i => i.text || i.options);

  if (typeof gpdfParseKey === 'function') {
    const keyMap = gpdfParseKey(keyLines);
    if (Object.keys(keyMap).length) {
      items.forEach(it => {
        if (!it.ans && it.options && it.num && keyMap[it.num]) it.ans = wqExpandAnswer(keyMap[it.num][0], it.options);
      });
    }
  }
  return items;
}

/* ---------- Convert Word OMML math nodes (<m:oMath>) into LaTeX ---------- */
function wqOmmlToLatex(node) {
  if (!node) return '';
  const walk = n => {
    let out = '';
    for (const c of n.childNodes) {
      if (c.nodeType !== 1) continue;
      const ln = c.localName;
      if (ln === 't') {
        out += c.textContent;
      } else if (ln === 'f') {
        const num = c.getElementsByTagNameNS('*', 'num')[0];
        const den = c.getElementsByTagNameNS('*', 'den')[0];
        out += `\\frac{${walk(num)}}{${walk(den)}}`;
      } else if (ln === 'rad') {
        const deg = c.getElementsByTagNameNS('*', 'deg')[0];
        const e = c.getElementsByTagNameNS('*', 'e')[0];
        const degTxt = deg ? walk(deg).trim() : '';
        out += degTxt ? `\\sqrt[${degTxt}]{${walk(e)}}` : `\\sqrt{${walk(e)}}`;
      } else if (ln === 'sSup') {
        const e = c.getElementsByTagNameNS('*', 'e')[0];
        const sup = c.getElementsByTagNameNS('*', 'sup')[0];
        out += `{${walk(e)}}^{${walk(sup)}}`;
      } else if (ln === 'sSub') {
        const e = c.getElementsByTagNameNS('*', 'e')[0];
        const sub = c.getElementsByTagNameNS('*', 'sub')[0];
        out += `{${walk(e)}}_{${walk(sub)}}`;
      } else if (ln === 'sSubSup') {
        const e = c.getElementsByTagNameNS('*', 'e')[0];
        const sub = c.getElementsByTagNameNS('*', 'sub')[0];
        const sup = c.getElementsByTagNameNS('*', 'sup')[0];
        out += `{${walk(e)}}_{${walk(sub)}}^{${walk(sup)}}`;
      } else if (ln === 'd') {
        const beg = c.getElementsByTagNameNS('*', 'begChr')[0];
        const end = c.getElementsByTagNameNS('*', 'endChr')[0];
        const bChr = (beg && beg.getAttributeNS('*', 'val')) || '(';
        const eChr = (end && end.getAttributeNS('*', 'val')) || ')';
        const inner = Array.from(c.childNodes).filter(x => x.localName === 'e').map(walk).join(', ');
        out += `${bChr}${inner}${eChr}`;
      } else {
        out += walk(c);
      }
    }
    return out;
  };
  const tex = walk(node).trim();
  return tex ? `$${tex}$` : '';
}

/* ---------- read a .docx: text lines + equations + first picture ---------- */
async function wqReadDocx(file) {
  if (typeof JSZip === 'undefined') throw new Error('Word support could not load. Please check your internet connection.');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('This is not a valid .docx file. (Old .doc files: open in Word, Save As .docx.)');
  const xml = new DOMParser().parseFromString(await docFile.async('string'), 'application/xml');
  const NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const body = xml.getElementsByTagNameNS(NS, 'body')[0];
  if (!body) throw new Error('This Word file has no readable content.');

  const paraText = p => {
    let out = '';
    const walk = n => {
      for (const c of n.childNodes) {
        if (c.nodeType !== 1) continue;
        const ln = c.localName;
        if (ln === 'oMath') {
          out += ' ' + wqOmmlToLatex(c) + ' ';
        } else if (ln === 't') {
          out += c.textContent;
        } else if (ln === 'tab') {
          out += ' ';
        } else if (ln === 'br' || ln === 'cr') {
          out += '\n';
        } else {
          walk(c);
        }
      }
    };
    walk(p);
    return out;
  };

  const lines = [];
  for (const el of body.childNodes) {
    if (el.nodeType !== 1) continue;
    if (el.localName === 'p') paraText(el).split('\n').forEach(l => lines.push(l));
    else if (el.localName === 'tbl') {
      for (const tr of el.childNodes) {
        if (tr.nodeType !== 1 || tr.localName !== 'tr') continue;
        const cells = [];
        for (const tc of tr.childNodes) {
          if (tc.nodeType !== 1 || tc.localName !== 'tc') continue;
          const ps = [];
          for (const p of tc.childNodes) if (p.nodeType === 1 && p.localName === 'p') ps.push(paraText(p).replace(/\n/g, ' ').trim());
          cells.push(ps.filter(Boolean).join(' '));
        }
        lines.push(cells.join(' '));
      }
    }
  }

  // first picture (JPG / PNG / GIF / WebP) in document order
  let image = null;
  try {
    const blip = xml.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'blip')[0];
    const rid = blip && blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (rid && relsFile) {
      const rels = new DOMParser().parseFromString(await relsFile.async('string'), 'application/xml');
      const rel = Array.from(rels.getElementsByTagName('Relationship')).find(r => r.getAttribute('Id') === rid);
      const target = rel && rel.getAttribute('Target');
      const ext = target && (target.match(/\.(png|jpe?g|gif|webp)$/i) || [])[1];
      if (ext) {
        const path = target.startsWith('/') ? target.slice(1) : 'word/' + target.replace(/^\.\//, '');
        const f = zip.file(path);
        if (f) {
          const type = 'image/' + (/^jpe?g$/i.test(ext) ? 'jpeg' : ext.toLowerCase());
          image = await compressImageBlob(new Blob([await f.async('uint8array')], { type }));
        }
      }
    }
  } catch (e) { image = null; }
  return { lines, image };
}

/* ---------- put one parsed question into the form ---------- */
function wqApplyItem(target, item) {
  const t = WQ_TARGETS[target];
  if (!t) return;
  const textEl = document.getElementById(t.text);
  const optEl = document.getElementById(t.options);
  const ansEl = document.getElementById(t.ans);
  const marksEl = document.getElementById(t.marks);
  if (textEl) textEl.value = item.text || '';
  if (optEl) optEl.value = item.options || '';
  if (ansEl) ansEl.value = item.ans || '';
  if (marksEl) marksEl.value = item.marks || 1;
  if (t.section && typeof sectionForMarks === 'function') {
    const sec = sectionForMarks(item.marks);
    if (typeof ensureSectionOption === 'function') ensureSectionOption(t.section, sec);
    const secEl = document.getElementById(t.section);
    if (secEl) secEl.value = sec;
  }
}

function wqShowResult(target, items, sourceLabel, image) {
  wqFound[target] = items;
  const pick = document.getElementById(target + '-q-word-pick');
  if (!items.length) {
    if (pick) pick.classList.add('hidden');
    wqStatus(target, `No question found in ${sourceLabel}. Put the question first, then options like (A) (B) (C) (D), then "Ans: B".`, true);
    return;
  }
  wqApplyItem(target, items[0]);
  if (image && items.length === 1 && typeof setDiagram === 'function') { setDiagram(target, image); }
  if (pick) {
    if (items.length > 1) {
      pick.innerHTML = items.map((it, i) => {
        const label = (it.text || it.options || '').replace(/\s+/g, ' ').slice(0, 60);
        return `<option value="${i}">${i + 1}. ${escapeHtml(label)}</option>`;
      }).join('');
      pick.value = '0';
      pick.classList.remove('hidden');
    } else pick.classList.add('hidden');
  }
  wqStatus(target, items.length === 1
    ? `✓ Parsed: Question${items[0].options ? ' + 4 Options' : ''}${items[0].ans ? ' + Answer' : ''}${image ? ' + Diagram' : ''} filled below!`
    : `✓ ${items.length} questions found in ${sourceLabel}. Showing question 1 — select another from the dropdown after inserting.`);
}

function wqPickChanged(target) {
  const pick = document.getElementById(target + '-q-word-pick');
  const item = wqFound[target][parseInt(pick.value, 10)];
  if (item) wqApplyItem(target, item);
}

/* ---------- entry points used by the buttons ---------- */
async function wordFillFromFile(event, target) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    if (/\.doc$/i.test(file.name)) throw new Error('Old .doc files are not supported. Open it in Word, choose Save As > .docx, and upload again.');
    if (!/\.docx$/i.test(file.name)) throw new Error('Please choose a Word (.docx) file.');
    wqStatus(target, 'Reading the Word file...');
    const res = await wqReadDocx(file);
    const defMarks = wqClampMarks(document.getElementById(WQ_TARGETS[target].marks)?.value, 1);
    wqShowResult(target, wqParseText(res.lines, defMarks), file.name, res.image);
  } catch (e) {
    wqStatus(target, e.message || 'Could not read this file.', true);
  }
  event.target.value = '';
}

function wordFillFromPaste(target) {
  const box = document.getElementById(target + '-q-paste');
  const txt = (box ? box.value : '').trim();
  if (!txt) return wqStatus(target, 'Paste the question (with options and answer) from Word first.', true);
  const defMarks = wqClampMarks(document.getElementById(WQ_TARGETS[target].marks)?.value, 1);
  wqShowResult(target, wqParseText(txt.split(/\r?\n/), defMarks), 'the pasted text', null);
}

function wordFillReset(target) {
  const box = document.getElementById(target + '-q-paste'); if (box) box.value = '';
  const pick = document.getElementById(target + '-q-word-pick'); if (pick) pick.classList.add('hidden');
  wqFound[target] = [];
  wqStatus(target, '');
}
