/* ========================= ADMIN TOOL: upgrade old data to "Standard + Subject" access =========================
   Run ONCE (the button is in the UPI Payments tab, admin only). It
   1. moves every question / blueprint row from the old subject-only cloud folder to its Standard+Subject folder,
   2. converts every teacher's old subject keys (assigned and purchased) and every licence to Standard+Subject keys.
      A teacher who had "Mathematics (050)" keeps it for Std 11 Science AND Std 12 Science (nobody loses what they paid for);
      you can remove one of them afterwards in the Teachers tab.
   Nothing is deleted until every copy has been written successfully. Safe to run again. */

function legacyTargetKeys(oldKey) {
  const out = new Set();
  ACCESS_ITEMS.forEach(i => {
    if (i.std !== 'GUJCET' && subjectKey(i.subject) === oldKey) out.add(i.key);
    if (i.std === 'GUJCET' && (subjectKey(i.subject + ' (GUJCET)') === oldKey)) out.add(i.key);
  });
  return withGujcetAliases(Array.from(out));
}

async function runInChunks(map, size) {
  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i += size) {
    const part = {}; keys.slice(i, i + size).forEach(k => { part[k] = map[k]; });
    await firebaseDb.ref().update(part);
  }
}

async function migrateToStdAccess() {
  if (!isAdminCloud() || !firebaseDb) return alert('Sign in with your admin (Firebase) account first.');
  if (!confirm('Upgrade old data to Standard + Subject access?\n\nThis moves questions and teacher access to the new folders. Nothing is deleted before the copies are saved. Continue?')) return;
  const btn = document.getElementById('migrate-std-btn'); if (btn) btn.disabled = true;
  const adds = {}, dels = {};
  const stats = { items: 0, users: 0, licenses: 0, left: 0 };
  try {
    // 1) questions + blueprint rows
    for (const cfg of [CLOUD_COLL.questions, CLOUD_COLL.blueprint]) {
      const root = (await firebaseDb.ref(cfg.path).once('value')).val() || {};
      Object.keys(root).forEach(sk => {
        if (KEY_TO_ITEM[sk]) return;
        const grp = root[sk]; if (!grp || typeof grp !== 'object') return;
        Object.keys(grp).forEach(id => {
          const item = grp[id]; if (!item || typeof item !== 'object') return;
          const nk = folderKeyFor(item, cfg.subjField);
          if (nk !== sk && KEY_TO_ITEM[nk]) { adds[`${cfg.path}/${nk}/${id}`] = item; dels[`${cfg.path}/${sk}/${id}`] = null; stats.items++; }
          else stats.left++;                       // no valid Standard on the item: stays where it is
        });
      });
    }
    // 2) teachers
    const users = (await firebaseDb.ref('users').once('value')).val() || {};
    Object.keys(users).forEach(uid => {
      let touched = false;
      ['subjects', 'purchased'].forEach(field => {
        const m = (users[uid] || {})[field] || {};
        Object.keys(m).forEach(k => {
          if (KEY_TO_ITEM[k]) return;
          const targets = legacyTargetKeys(k); if (!targets.length) return;
          targets.forEach(t => { const path = `users/${uid}/${field}/${t}`; adds[path] = field === 'subjects' ? true : Math.max(Number(adds[path]) || 0, Number(m[k]) || 0); });
          dels[`users/${uid}/${field}/${k}`] = null; touched = true;
        });
      });
      if (touched) stats.users++;
    });
    // 3) licences (public read-only node, used by the teacher's app to show what is unlocked)
    const lic = (await firebaseDb.ref('licenses').once('value')).val() || {};
    Object.keys(lic).forEach(ek => {
      const m = (lic[ek] || {}).subjects || {}; let touched = false;
      Object.keys(m).forEach(k => {
        if (KEY_TO_ITEM[k]) return;
        const targets = legacyTargetKeys(k).filter(t => !t.startsWith(subjectKey('GUJCET' + STD_SEP)));   // licences list only what was paid for
        if (!targets.length) return;
        targets.forEach(t => { const path = `licenses/${ek}/subjects/${t}`; adds[path] = Math.max(Number(adds[path]) || 0, Number(m[k]) || 0); });
        dels[`licenses/${ek}/subjects/${k}`] = null; touched = true;
      });
      if (touched) stats.licenses++;
    });
    if (!Object.keys(adds).length && !Object.keys(dels).length) return alert('Nothing to upgrade - everything already uses Standard + Subject.');
    await runInChunks(adds, 100);       // step 1: write ALL new copies
    await runInChunks(dels, 300);       // step 2: only then remove the old ones
    alert(`Done.\n\nQuestions / rows moved: ${stats.items}\nTeachers upgraded: ${stats.users}\nLicences upgraded: ${stats.licenses}` + (stats.left ? `\nItems without a valid Standard (left in place): ${stats.left}` : '') + '\n\nThe page will reload.');
    location.reload();
  } catch (e) {
    alert('Upgrade stopped: ' + (e && e.message) + '\n\nNothing was deleted. You can run it again.');
  } finally { if (btn) btn.disabled = false; }
}
