 /* ========================= CONFIG ========================= */
    const APP_STORAGE_KEY_Q = "BAI_AVABAI_QUESTIONS_SAFE_V18";
    const APP_STORAGE_KEY_PAPER = "BAI_AVABAI_LIVE_PAPER_SAFE_V18";
    const APP_STORAGE_KEY_ARCHIVE = "BAI_AVABAI_ARCHIVES_SAFE_V18";
    const APP_STORAGE_KEY_MATRIX = "BAI_AVABAI_MATRIX_SAFE_V18";
    const APP_STORAGE_KEY_SAVED_BLUEPRINTS = "BAI_AVABAI_SAVED_BLUEPRINTS_SAFE_V18";
    const APP_AUTH_CACHE_KEY = "BAI_AVABAI_AUTH_CACHE_V18";
    const APP_USERS_REGISTRY_KEY = "BAI_AVABAI_USERS_REGISTRY_V18";
    const APP_STORAGE_KEY_AVATAR = "KT_TEACHER_AVATAR_SAFE_V1";
    const APP_STORAGE_KEY_LOGO = "KT_MATHS_APP_LOGO_SAFE_V1";
    const APP_FIREBASE_CONFIG_KEY = "KT_FIREBASE_CONFIG_V1";
    /* Paste your Firebase "Web API key" here (Firebase console > Project settings > General). It is a public identifier, not a secret.
       With it filled in, teachers can sign in on any device without opening "Cloud settings". */
    const DEFAULT_FIREBASE_API_KEY = "AIzaSyBTiYuYWpyzjz2CPeUSGPkLZ-bT6EEWbUU";
    const APP_SUBSCRIPTION_KEY = "KT_MATHS_LICENSES_SAFE_V1";
    const APP_STAFF_PROFILE_KEY = "KT_STAFF_PROFILE_V1";

    const SUB_CONFIG = {
      priceINR: 150,
      durationDays: 365,
      adminEmail: "kalpeshtailor1985@gmail.com",
      // DIRECT UPI PAYMENTS - no payment gateway, no server, no API key.
      // Put YOUR UPI ID here (for example "kalpesh@oksbi"). The QR code shown to teachers is made from it automatically.
      upiId: "kalpeshtailor1985-2@okhdfcbank",
      upiPayeeName: "Kalpesh Tailor",
      // Optional: file name of your own QR picture (add the file next to index.html, e.g. "upi-qr.png"). Leave "" to use the automatic QR.
      upiQrImage: "",
      // The old offline licence keys can be forged from the page source. Keep false unless you really need them.
      enableLicenseKeys: false,
      // Teacher accounts: the paid plan includes ONE subject; every extra subject costs priceINR per year. Set to false to give teachers all subjects again.
      enablePerSubjectAccess: true,
      // Set to false before sharing the app with students/other teachers
      enableAdminQuickLogin: false,
      // SECURITY: false = every teacher needs a real Firebase account (password never kept in the browser, e-mail must be verified).
      // true = old unsafe local accounts (anyone can fake a login on their own device). Keep false.
      allowLocalAccounts: false,
      requireEmailVerification: true
    };

    /* The administrator's name is FIXED: it is shown in the sidebar for everybody and does not change with the account that signs in.
       Teachers / staff get their own name on a separate button (see js/signup-plan.js). */
    const ADMIN_DISPLAY_NAME = "KALPESH H TAILOR";
    const ADMIN_DISPLAY_TITLE = "M.Sc, B.Ed, GSET (MATHS)";
    const SIGNUP_MEDIUMS = ["Gujarati", "English"];

    const GSEB_SUBJECTS = {
      "Std 9": ["Mathematics", "Science & Technology", "Social Science", "Gujarati", "English", "Hindi", "Sanskrit"],
      "Std 10": ["Mathematics (Standard - 12)", "Mathematics (Basic - 18)", "Science & Technology", "Social Science", "Gujarati", "English"],
      "Std 11 Science": ["Physics (054)", "Chemistry (052)", "Mathematics (050)", "Biology (056)", "English"],
      "Std 12 Science": ["Physics (054)", "Chemistry (052)", "Mathematics (050)", "Biology (056)", "English"],
      "GUJCET": ["Mathematics", "Physics", "Chemistry"],
      "Std 11 Commerce": ["Elements of Accounts", "Statistics", "Economics", "B.A.", "English"],
      "Std 12 Commerce": ["Elements of Accounts", "Statistics", "Economics", "B.A.", "English"],
      "Std 11 Arts": ["Psychology", "Sociology", "Philosophy", "Geography", "History"],
      "Std 12 Arts": ["Psychology", "Sociology", "Philosophy", "Geography", "History"]
    };

    const DEFAULT_BLUEPRINT_ROWS = [
      { id: 'bp-1', std: 'Std 10', sub: 'Mathematics (Standard - 12)', name: 'Ch 1 - Real Numbers', m1_wo: 2, m1_with: 2, m2_wo: 1, m2_with: 2, m3_wo: 1, m3_with: 1, m4_wo: 0, m4_with: 0, c1_wo: 0, c1_with: 0, c2_wo: 0, c2_with: 0 },
      { id: 'bp-2', std: 'Std 10', sub: 'Mathematics (Standard - 12)', name: 'Ch 2 - Polynomials', m1_wo: 2, m1_with: 2, m2_wo: 2, m2_with: 2, m3_wo: 0, m3_with: 1, m4_wo: 1, m4_with: 1, c1_wo: 0, c1_with: 0, c2_wo: 0, c2_with: 0 },
      { id: 'bp-3', std: 'Std 10', sub: 'Mathematics (Standard - 12)', name: 'Ch 3 - Pair of Linear Equations', m1_wo: 1, m1_with: 2, m2_wo: 1, m2_with: 1, m3_wo: 1, m3_with: 2, m4_wo: 1, m4_with: 1, c1_wo: 0, c1_with: 0, c2_wo: 0, c2_with: 0 },
      { id: 'bp-g1', std: 'GUJCET', sub: 'Mathematics', name: 'Ch 1 - Relations and Functions', m1_wo: 4, m1_with: 4, m2_wo: 0, m2_with: 0, m3_wo: 0, m3_with: 0, m4_wo: 0, m4_with: 0, c1_wo: 0, c1_with: 0, c2_wo: 0, c2_with: 0 },
      { id: 'bp-g2', std: 'GUJCET', sub: 'Mathematics', name: 'Ch 2 - Matrices & Determinants', m1_wo: 5, m1_with: 5, m2_wo: 0, m2_with: 0, m3_wo: 0, m3_with: 0, m4_wo: 0, m4_with: 0, c1_wo: 0, c1_with: 0, c2_wo: 0, c2_with: 0 }
    ];

    const DEFAULT_QUESTIONS = [
      { id: 'q-1', bankType: 'GENERAL', std: 'Std 10', subject: 'Mathematics (Standard - 12)', chapter: 'Ch 1 - Real Numbers', medium: 'Gujarati', section: 'SECTION A', marks: 1,
        text: 'ગુ.સા.અ. (12, 18) = ______ થાય.',
        answer: 'જવાબ: (B) 6 [12 = 2^2 * 3 અને 18 = 2 * 3^2 => ગુ.સા.અ. = 6]',
        options: '(A) 2   (B) 6   (C) 12   (D) 36' },
      { id: 'q-1b', bankType: 'GENERAL', std: 'Std 10', subject: 'Mathematics (Standard - 12)', chapter: 'Ch 1 - Real Numbers', medium: 'Gujarati', section: 'SECTION A', marks: 1,
        text: 'જો બે સંખ્યાઓનો ગુ.સા.અ. 4 અને લ.સા.અ. 24 હોય, તો બંને સંખ્યાઓનો ગુણાકાર ______ થાય.',
        answer: 'જવાબ: (C) 96',
        options: '(A) 48   (B) 72   (C) 96   (D) 120' },
      { id: 'q-2', bankType: 'GENERAL', std: 'Std 10', subject: 'Mathematics (Standard - 12)', chapter: 'Ch 2 - Polynomials', medium: 'Gujarati', section: 'SECTION B', marks: 2,
        text: 'દ્વિઘાત બહુપદી $p(x) = x^2 - 2x - 8$ ના શૂન્યો શોધો.',
        answer: 'ઉકેલ: શૂન્યો 4 અને -2 છે.', options: '' },
      { id: 'q-2b', bankType: 'GENERAL', std: 'Std 10', subject: 'Mathematics (Standard - 12)', chapter: 'Ch 2 - Polynomials', medium: 'Gujarati', section: 'SECTION B', marks: 2,
        text: 'બહુપદી $p(x) = 4x^2 - 4x + 1$ ના શૂન્યો તથા સહગુણકો વચ્ચેનો સંબંધ ચકાસો.',
        answer: 'ઉકેલ: શૂન્યો 1/2 અને 1/2 છે.', options: '' },
      { id: 'q-g1', bankType: 'GUJCET', std: 'GUJCET', subject: 'Mathematics', chapter: 'Ch 2 - Matrices & Determinants', medium: 'Gujarati', section: 'GUJCET MCQ', marks: 1,
        text: 'જો $A$ એ $3 \\times 3$ કક્ષાનો ચોરસ શ્રેણિક હોય અને $|A| = 4$, તો $|\\operatorname{adj}(A)| = ______$.',
        answer: 'જવાબ: (C) 16', options: '(A) 4   (B) 64   (C) 16   (D) 8' }
    ];

    let state = {
      questions: [], blueprintRows: [], savedBlueprints: [], livePaperQuestions: [],
      gujcetPaperQuestions: [], archivedPapers: [], currentBankType: 'GENERAL', matrixMode: 'GSEB',
      gateAuthTab: 'signin', currentUser: null, parsedBulkItems: [],
      isFirebaseReady: false, isRemoteUpdateRunning: false, deferredPrompt: null,
      cloudUser: null, cloudOnline: false, authAvailable: false, firebaseCfg: null
    };
    let firebaseDb = null;
    let storageWarned = false;

    /* ========================= HELPERS ========================= */
    function clone(o) { return JSON.parse(JSON.stringify(o)); }

    /* ---- Large data (questions with figures, papers, archive) lives in IndexedDB, not the 5 MB localStorage ---- */
    const BIG_KEYS = new Set([APP_STORAGE_KEY_Q, APP_STORAGE_KEY_PAPER, APP_STORAGE_KEY_ARCHIVE, APP_STORAGE_KEY_MATRIX, APP_STORAGE_KEY_SAVED_BLUEPRINTS]);
    const memStore = {};
    let idbDb = null;

    function idbOpen() {
      return new Promise(res => {
        try {
          const r = indexedDB.open('kt_maths_store', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('kv');
          r.onsuccess = () => res(r.result);
          r.onerror = () => res(null);
          r.onblocked = () => res(null);
        } catch (e) { res(null); }
      });
    }
    function idbGet(key) {
      return new Promise(res => {
        try {
          const r = idbDb.transaction('kv').objectStore('kv').get(key);
          r.onsuccess = () => res(r.result === undefined ? null : r.result);
          r.onerror = () => res(null);
        } catch (e) { res(null); }
      });
    }
    function idbPut(key, val) {
      return new Promise((res, rej) => {
        try {
          const tx = idbDb.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(val, key);
          tx.oncomplete = () => res(true);
          tx.onerror = () => rej(tx.error);
          tx.onabort = () => rej(tx.error);
        } catch (e) { rej(e); }
      });
    }
    async function preloadBigStore() {
      idbDb = await idbOpen();
      for (const key of BIG_KEYS) {
        let raw = idbDb ? await idbGet(key) : null;
        if (raw === null) {                       // one-time move from the old localStorage copy
          const ls = localStorage.getItem(key);
          if (ls !== null) {
            raw = ls;
            if (idbDb) { try { await idbPut(key, ls); localStorage.removeItem(key); } catch (e) {} }
          }
        }
        if (raw !== null) memStore[key] = raw;
      }
    }

    function safeParse(key, fallback) {
      try {
        let raw = BIG_KEYS.has(key) ? memStore[key] : undefined;
        if (raw === undefined) raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) return fallback;
        const val = JSON.parse(raw);
        return val === null || val === undefined ? fallback : val;
      } catch (e) { return fallback; }
    }

    function warnStorage() {
      if (storageWarned) return;
      storageWarned = true;
      alert('Browser storage is full or blocked. Please export a backup now and remove old papers / large images.');
    }

    function safeSet(key, value) {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      if (BIG_KEYS.has(key)) {
        if (memStore[key] === str) return;        // unchanged: skip the write
        memStore[key] = str;
        if (idbDb) { idbPut(key, str).catch(warnStorage); return; }
      }
      try { localStorage.setItem(key, str); } catch (e) { warnStorage(); }
    }
    /* ========================= STORAGE ========================= */
    function loadStorageData() {
      const storedQ = safeParse(APP_STORAGE_KEY_Q, null);
      state.questions = Array.isArray(storedQ) ? storedQ : clone(DEFAULT_QUESTIONS);

      const storedMatrix = safeParse(APP_STORAGE_KEY_MATRIX, null);
      state.blueprintRows = Array.isArray(storedMatrix) ? storedMatrix : clone(DEFAULT_BLUEPRINT_ROWS);
      state.blueprintRows.forEach(r => {
        ['m1', 'm2', 'm3', 'm4', 'c1', 'c2'].forEach(k => {
          if (r[k + '_wo'] === undefined) r[k + '_wo'] = r[k] || 0;
          if (r[k + '_with'] === undefined) r[k + '_with'] = r[k] || 0;
        });
      });

      const savedBp = safeParse(APP_STORAGE_KEY_SAVED_BLUEPRINTS, []);
      state.savedBlueprints = Array.isArray(savedBp) ? savedBp : [];

      const storedPaper = safeParse(APP_STORAGE_KEY_PAPER, null);
      state.livePaperQuestions = Array.isArray(storedPaper) ? storedPaper : state.questions.filter(q => q.bankType === 'GENERAL');

      const storedArchive = safeParse(APP_STORAGE_KEY_ARCHIVE, []);
      state.archivedPapers = Array.isArray(storedArchive) ? storedArchive : [];

      state.gujcetPaperQuestions = state.questions.filter(q => q.bankType === 'GUJCET' || q.std === 'GUJCET').slice(0, 40);
      updateQuestionCountBadge();
    }

    // scope: 'all' | 'questions' | 'matrix'  — only the changed data is pushed to the cloud
    function persistQuestions(scope = 'all') {
      updateQuestionCountBadge();
      renderMatrixTable();
      if (state.isGuest) return;      // a guest preview is never saved on the device or in the cloud
      safeSet(APP_STORAGE_KEY_Q, state.questions);
      safeSet(APP_STORAGE_KEY_MATRIX, state.blueprintRows);
      safeSet(APP_STORAGE_KEY_SAVED_BLUEPRINTS, state.savedBlueprints);
      safeSet(APP_STORAGE_KEY_PAPER, state.livePaperQuestions);
      safeSet(APP_STORAGE_KEY_ARCHIVE, state.archivedPapers);

      if (scope === 'all' || scope === 'questions') scheduleSync('questions');
      if (scope === 'all' || scope === 'matrix') scheduleSync('blueprint');
    }

    function updateQuestionCountBadge() {
      const badge = document.getElementById('badge-qbank-count');
      if (badge) badge.innerText = state.questions.length;
      if (typeof refreshComingSoon === 'function') refreshComingSoon();
    }

    function exportFullDataBackup() {
      const backupData = {
        app: "KT Maths Exam Suite",
        timestamp: new Date().toISOString(),
        questions: state.questions,
        blueprintRows: state.blueprintRows,
        savedBlueprints: state.savedBlueprints,
        livePaperQuestions: state.livePaperQuestions,
        archivedPapers: state.archivedPapers,
        avatarImg: localStorage.getItem(APP_STORAGE_KEY_AVATAR),
        logoImg: localStorage.getItem(APP_STORAGE_KEY_LOGO)
      };
      downloadBlob(new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' }), `KT_Maths_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    }

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function importFullDataBackup(event) {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const imp = JSON.parse(e.target.result);
          if (!imp || typeof imp !== 'object') throw new Error('bad');
          if (!confirm('Importing will replace the current data on this device (and cloud, if connected). Continue?')) return;
          if (Array.isArray(imp.questions)) state.questions = imp.questions;
          if (Array.isArray(imp.blueprintRows)) state.blueprintRows = imp.blueprintRows;
          if (Array.isArray(imp.savedBlueprints)) state.savedBlueprints = imp.savedBlueprints;
          if (Array.isArray(imp.livePaperQuestions)) state.livePaperQuestions = imp.livePaperQuestions;
          if (Array.isArray(imp.archivedPapers)) state.archivedPapers = imp.archivedPapers;

          if (imp.avatarImg) {
            safeSet(APP_STORAGE_KEY_AVATAR, imp.avatarImg);
            document.getElementById('user-avatar').src = imp.avatarImg;
            if (firebaseDb) firebaseDb.ref('settings/avatarImg').set(imp.avatarImg).catch(() => {});
          }
          if (imp.logoImg) {
            safeSet(APP_STORAGE_KEY_LOGO, imp.logoImg);
            applyLogoEverywhere(imp.logoImg);
            if (firebaseDb) firebaseDb.ref('settings/logoImg').set(imp.logoImg).catch(() => {});
          }
          persistQuestions();
          renderSavedBlueprintsList();
          filterQuestionBank();
          renderLivePaper();
          renderArchiveList();
          alert('Backup restored and synced successfully!');
        } catch (err) {
          alert('Invalid backup file. Please choose a valid JSON backup exported from this app.');
        }
      };
      reader.readAsText(file);
    }