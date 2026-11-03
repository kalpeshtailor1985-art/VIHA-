/* ========================= SECURE AUTH (replaces insecure local accounts) =========================
   - Teachers sign up / sign in with REAL Firebase accounts (password never stored in the browser).
   - Self-signup accounts must verify their e-mail before they can use the app.
   - Old local accounts are hashed at once and moved to Firebase the first time that teacher signs in.
   - Everything is controlled by SUB_CONFIG.allowLocalAccounts (false = secure mode). */

const SECURE_PW_SALT = 'KTM-LOCAL-V1';

async function sha256Hex(text) {
  if (!(window.crypto && crypto.subtle)) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
const legacyHash = (email, pw) => sha256Hex(SECURE_PW_SALT + ':' + email + ':' + pw);

/* 1. Turn every plain-text password in the old local registry into a hash (runs at start-up) */
async function hardenLocalRegistry() {
  if (SUB_CONFIG.allowLocalAccounts) return;
  let users = safeParse(APP_USERS_REGISTRY_KEY, []);
  if (!Array.isArray(users) || !users.length) return;
  let changed = false;
  for (const u of users) {
    if (u && typeof u.password === 'string') {
      const h = await legacyHash(u.email, u.password);
      if (h) { u.pwHash = h; delete u.password; changed = true; }
    }
  }
  if (changed) safeSet(APP_USERS_REGISTRY_KEY, users);
}

/* 2. Hide the unsafe local-only buttons and fix the wording */
function applyAuthModeUI() {
  if (SUB_CONFIG.allowLocalAccounts) return;
  // the Guest button stays: it opens the limited preview (chapters 1-2 only), see js/catalog-guest.js
  const hint = document.getElementById('gate-staff-hint');
  if (hint) hint.firstChild.textContent = 'Sign in with your teacher account. New teachers: use "New? Sign Up" (you must verify your e-mail). ';
  const pass = document.getElementById('gate-user-password');
  if (pass) pass.setAttribute('minlength', '6');
}

/* a request that hangs (blocked by an ad-blocker, a wrong API-key restriction, no network) must end with a clear message */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject({ code: 'auth/timeout' }), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

function cloudAuthMessage(err) {
  const c = String((err && err.code) || '');
  if (c.indexOf('auth/requests-from-referer') === 0 || c.indexOf('api-key') >= 0 || c === 'auth/invalid-api-key')
    return 'The Firebase API key does not allow this website (' + location.origin + '). Google Cloud Console > APIs & Services > Credentials > your Browser key > Website restrictions: add ' + location.origin + '/* (wait 5 minutes, then try again).';
  if (c === 'auth/unauthorized-domain') return 'This website is not allowed in Firebase. Firebase > Authentication > Settings > Authorized domains: add ' + location.hostname;
  if (c === 'auth/configuration-not-found') return 'Firebase Authentication is not set up for this project. Firebase > Authentication > Get started, then Sign-in method > Email/Password > Enable.';
  if (c === 'auth/timeout') return 'The request took too long. Check your internet connection, switch off any ad-blocker for this site, and check the API key restriction (see SECURITY.md).';
  if (c === 'auth/internal-error') return 'Firebase refused the request (internal error). Usually the API key restriction or the Authentication setup. See SECURITY.md.';
  if (c === 'permission_denied' || /permission_denied|PERMISSION_DENIED/.test(String((err && err.message) || ''))) return 'The database rules did not allow this. Publish the latest database.rules.json in Firebase > Realtime Database > Rules.';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(c)) return 'Incorrect email or password.';
  if (c === 'auth/too-many-requests') return 'Too many attempts. Please wait a few minutes and try again.';
  if (c === 'auth/weak-password') return 'Password must be at least 6 characters.';
  if (c === 'auth/email-already-in-use') return 'This email already has an account. Use "Sign In" (or "Forgot Password?").';
  if (c === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (c === 'auth/network-request-failed') return 'No internet connection, or the request is blocked (ad-blocker / firewall). Please try again.';
  if (c === 'auth/operation-not-allowed') return 'Email/Password sign-in is not enabled in Firebase. Ask the administrator.';
  return (err && err.message) || 'Something went wrong. Please try again.';
}

/* 3. Create a real Firebase account (+ the matching "users" record, + verification e-mail) */
async function createCloudAccount(email, password, name, plan) {
  state.signupInProgress = true;
  try {
    const cred = await withTimeout(firebase.auth().createUserWithEmailAndPassword(email, password), 20000);
    const rec = { name: String(name || email.split('@')[0]).slice(0, 100), email, active: true, selfSignup: true, createdAt: Date.now() };
    if (plan && plan.count) {                                   // what the teacher chose in the sign-up window
      rec.std = plan.std; rec.medium = plan.medium;
      rec.want = {}; plan.keys.forEach(k => { rec.want[k] = true; });
    }
    await firebaseDb.ref('users/' + cred.user.uid).set(rec);
    if (SUB_CONFIG.requireEmailVerification) {
      await cred.user.sendEmailVerification().catch(() => {});
      await firebase.auth().signOut();
      switchGateTab('signin');
      showGateAlert('Account created. We sent a verification link to ' + email + '. Open it (check Spam too), then sign in here.' + (plan && plan.count ? ' After signing in, pay Rs ' + plan.amount + ' (' + plan.count + (plan.count > 1 ? ' subjects' : ' subject') + ') to switch your access on.' : ''), true);
    } else {
      state.signupInProgress = false;
      await handleAuthStateChanged(firebase.auth().currentUser);   // continue straight into the app
    }
    return true;
  } finally {
    // keep the guard a moment longer: Firebase reports the sign-out a little later
    setTimeout(() => { state.signupInProgress = false; }, 1500);
  }
}

/* 4. The one entry point for Sign In / Sign Up / Staff login in secure mode */
async function handleCloudAuthSubmit(email, password, fullName) {
  if (typeof firebase === 'undefined') return showGateAlert('Firebase could not load. Check your internet connection and switch off any ad-blocker for this site, then refresh.', false);
  if (!state.authAvailable || !firebaseDb) {
    const hasKey = state.firebaseCfg && state.firebaseCfg.apiKey;
    return showGateAlert(hasKey ? 'The Firebase connection did not start. Check your internet connection and refresh the page.'
                                : 'No Firebase API key is set. Open js/state.js and set DEFAULT_FIREBASE_API_KEY.', false);
  }
  const tab = state.gateAuthTab;
  const btn = document.getElementById('gate-main-submit-btn');
  if (btn) btn.disabled = true;
  try {
    if (tab === 'signup') {
      if (isAdminEmail(email)) return showGateAlert('This email is reserved for the administrator. Use the Staff Login tab.', false);
      if (password.length < 6) return showGateAlert('Password must be at least 6 characters.', false);
      const plan = (typeof getSignupChoice === 'function') ? getSignupChoice() : null;     // Standard + Medium + Subject(s) from the sign-up window
      if (plan) { const bad = validateSignupChoice(plan); if (bad) return showGateAlert(bad, false); }
      showGateAlert('Creating your account…', true);
      await createCloudAccount(email, password, fullName, plan);
      return;
    }
    showGateAlert('Signing in…', true);
    try {
      await withTimeout(firebase.auth().signInWithEmailAndPassword(email, password), 20000);   // handleAuthStateChanged takes over from here
    } catch (err) {
      // an old local account? move it to Firebase using the password the teacher just typed
      const users = safeParse(APP_USERS_REGISTRY_KEY, []);
      const old = Array.isArray(users) ? users.find(u => u && u.email === email) : null;
      const bad = ['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(err.code);
      if (old && bad && old.pwHash && old.pwHash === await legacyHash(email, password)) {
        if (password.length < 6) return showGateAlert('Your old password is too short for the new secure login. Click "New? Sign Up" and choose a password of 6+ characters.', false);
        try {
          showGateAlert('Upgrading your account to the secure login…', true);
          await createCloudAccount(email, password, old.displayName);
          safeSet(APP_USERS_REGISTRY_KEY, users.filter(u => u.email !== email));   // old local copy removed
          return;
        } catch (e2) { return showGateAlert(cloudAuthMessage(e2), false); }
      }
      showGateAlert(cloudAuthMessage(err), false);
    }
  } catch (err) {
    showGateAlert(cloudAuthMessage(err), false);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* 5. "Forgot password" = Firebase reset e-mail (nobody can reset a password on someone else's device any more) */
function cloudPasswordReset(emailFromGate) {
  const email = String(emailFromGate || document.getElementById('gate-user-email')?.value || '').trim().toLowerCase();
  if (!state.authAvailable) return showGateAlert('Online sign-in is not available right now.', false);
  if (!email) return showGateAlert('Type your email above, then click "Forgot Password?" again.', false);
  firebase.auth().sendPasswordResetEmail(email)
    .then(() => showGateAlert('If an account exists for this email, a reset link has been sent. Check your inbox and Spam.', true))
    .catch(err => showGateAlert(cloudAuthMessage(err), false));
}
