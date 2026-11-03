# KT Maths Exam Suite - Setup Guide (direct UPI payments)

No Razorpay. No Cloud Functions. No payment API key. No paid Firebase plan.
Teachers pay your UPI ID / QR, send you the UPI reference number (UTR), and you approve it inside the app.

## 1. Files

| File / folder                         | On the website? | What it is for |
|---------------------------------------|:---------------:|----------------|
| `index.html`                          | YES | Page layout, all windows (modals), UPI pay window, admin tabs. |
| `css/app.css`, `css/print-paper.css`  | YES | Screen styles and the printed question-paper styles. |
| `js/state.js`                         | YES | Settings (`SUB_CONFIG`, UPI ID, price), default data, storage helpers. |
| `js/utils/media-math.js`              | YES | Images and maths (KaTeX / MathJax) helpers. |
| `js/utils/word-question-parser.js`    | YES | Reads questions from Word (.docx) files for bulk import. |
| `js/modules/blueprint-matrix.js`      | YES | Chapter x marks blueprint matrix and auto question picking. |
| `js/modules/paper-workspace.js`       | YES | Paper preview, designer, PDF / Word / print export. |
| `js/modules/gujcet-workspace.js`      | YES | GUJCET 40-MCQ workspace, question bank, bulk import. |
| `js/app.js`                           | YES | Login, subscription, Firebase, teachers, UPI payments. |
| `js/secure-auth.js`                   | YES | Real Firebase sign-up / sign-in, e-mail verification, old-account migration. |
| `js/signup-plan.js`                   | YES | Sign-up Standard / Medium / Subjects with Rs 150 x subjects, the teacher's own name button and My Account. |
| `js/access-migrate.js`                | YES | Admin one-time button: moves old data to Standard + Subject access. |
| `js/catalog-guest.js`                 | YES | Coming Soon list (padlock + badge for empty Standard / Subject) and the Guest login (first two chapters). |
| `js/init.js`                          | YES | Starts the app, KaTeX auto-render, image shrinker. LOADED LAST. |
| `sw.js`, `manifest.json`, `web_206.png` | YES | Offline mode, auto-update, app logo. |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | YES | Real PNG install icons used by `manifest.json` (made from the logo). |
| `upi-qr.png` (optional, you add it)   | YES | Your own printed QR picture, if you prefer it to the automatic QR. |
| `.github/workflows/deploy-pages.yml`  | -   | Publishes ONLY the website files to GitHub Pages on every push. |
| `database.rules.json`                 | no  | Firebase database security (who may read / write what). |
| `firebase.json`, `.firebaserc`        | no  | Tells the Firebase tool which project and rules file to use. |
| `.gitignore`                          | no  | Keeps private backups out of GitHub. |
| `SECURITY.md`, `WORKFLOW.md`, `ACCESS.md` | no  | Security checklist, full workflow, and the Standard + Subject access rules with a test list. |

Script order in `index.html` matters: state -> media-math -> word-question-parser -> blueprint-matrix -> paper-workspace -> gujcet-workspace -> app -> access-migrate -> catalog-guest -> secure-auth -> signup-plan -> init.

### Every release
Open `sw.js` and change `CACHE_VERSION` (for example `kt-maths-v16` -> `kt-maths-v17`) before you push, so phones drop the old copy.

**New in this version:** running line of available subjects in the login window; guest is view-only (Question Bank + Blueprint, padlock after chapter 2, every button padlocked); empty Standard / Subject show a padlock + Coming Soon; the Guest login opens chapters 1-2 only (publish the rules, then UPI Payments -> Publish now).  each purchase opens ONE Standard + ONE Subject (see `ACCESS.md`; run the one-time upgrade button once). teachers need a verified Firebase account, and approving a payment asks for the last 4 characters of the UTR. Do the steps in `SECURITY.md` once (publish the NEW rules, lock the API key).

## 2. How a payment works

```
Teacher: taps "Pay by UPI"  -> scans your QR / copies your UPI ID -> pays 150
Teacher: types the UPI reference number (UTR) -> "Submit for approval"
   (saved in the database: payRequests/<id> + utrIndex/<UTR>; a UTR can be used only once)
You:     open the app -> left menu "UPI Payments" (red number = waiting)
You:     open GPay / PhonePe -> find the payment (amount, UTR, note KT-XXXXXX)
You:     press Approve  -> the app writes the licence / subject for that e-mail
Teacher: the app unlocks by itself, live (no refresh needed)
```
You can also Reject (the teacher sees your message) or give access manually (cash / bank payments).

## 3. One-time setup (about 30 minutes)

### A. Firebase (free plan)
1. Firebase console -> project **kt-exam-suit** (the free "Spark" plan is enough).
2. Build -> Authentication -> Sign-in method -> **Email/Password -> Enable**.
3. Build -> **Realtime Database** must exist.
4. Project settings -> General -> **Web API key** -> copy it. In `js/state.js` find `DEFAULT_FIREBASE_API_KEY` and paste it between the quotes.
   (This key is only an identifier for sign-in. It is NOT a payment key and is safe in the page. Your own login and teachers' logins need it.)

### B. Your admin account
1. Authentication -> Users -> **Add user** (your e-mail + strong password). Copy the **User UID**.
2. Realtime Database -> Data -> add `admins` -> a child named with that UID -> value `true`.

### C. Publish the security rules (no command line needed)
1. Realtime Database -> **Rules** tab.
2. Delete everything, paste the full text of `database.rules.json`, click **Publish**.
   (Or, with the Firebase tool: `firebase deploy --only database`.)

### D. Put YOUR UPI ID in the app
Open `js/state.js`, find `SUB_CONFIG` and change:
```
upiId: "yourname@upi",          -> your real UPI ID, e.g. "kalpesh@oksbi"
upiPayeeName: "Kalpesh Tailor", -> the name your bank shows
upiQrImage: "",                 -> leave empty (automatic QR), or "upi-qr.png" to show your own picture
```
The automatic QR already contains the amount (150) and a note code, so the teacher only confirms.
Own picture: save your QR from your UPI app as `upi-qr.png` next to `index.html`, set `upiQrImage: "upi-qr.png"`.
Until you replace `yourname@upi`, the app says "UPI payment is not set up yet".

### E. Publish the website
1. Create a GitHub repository and upload ALL files of this folder (keep `.github/workflows/`).
2. Repo -> Settings -> Pages -> Source: **GitHub Actions**.
3. `git push` to `main`. After 1-2 minutes the site is at `https://<your-username>.github.io/<repo>/`.

### F. Protect "Cloud settings"
Cloud settings opens only for the admin (Firebase login), so no extra password is needed.

### G. Create teachers
Sign in as admin -> Teachers & Access -> create the teacher and tick the first subject. More subjects: the teacher pays 150 each ("My Subjects & Unlock").

## 4. Every day: approving payments
1. Left menu -> **UPI Payments** (a red number shows how many are waiting).
2. For each request check in your UPI app: the amount, the UTR (reference) number and the note code.
3. Right -> **Approve**. Wrong or missing payment -> **Reject** and type a short reason.
4. Paid by cash / bank? Use "Give access manually" at the bottom of the same page.

## 5. Updating later
| You changed | Do this |
|-------------|---------|
| anything in `index.html`, `css/`, `js/`, `sw.js`, icon, `upi-qr.png` | bump `CACHE_VERSION` in `sw.js`, then `git push` (site updates by itself) |
| `database.rules.json` | Paste into Firebase Rules tab and Publish (or `firebase deploy --only database`) |

Order when you change both: publish the rules first, then push the website.

## 6. Test list (do before real use)
1. Website opens. Login screen has no "Instant Sign In".
2. Admin login works. Left menu shows **UPI Payments**, Teachers & Access, Backup.
3. In a private window: create a teacher account, sign in, open My Subjects -> Unlock -> you see the QR, UPI ID, note code.
4. Pay 1 rupee yourself (temporarily set `priceINR: 1`), type the UTR, submit.
5. Admin -> UPI Payments shows it. Approve. The teacher window unlocks the subject by itself.
6. Submit the same UTR again -> refused ("already submitted").
7. Set `priceINR` back to 150 and push.

## 7. Please read - what this system can and cannot do
- The app cannot see your bank. **You** must check every payment in your UPI app before pressing Approve. Fake UTRs are possible; a UTR can be used only once.
- Anyone can send a request (even without logging in), so junk requests can appear. They cannot unlock anything. Reject them or delete them in the Firebase console (`payRequests`, `utrIndex`).
- A person's access record is readable by anyone who knows the exact e-mail address (expiry date only, no payment details). Payment details are private (`licenseLog`, `payRequests` - admin only).
- Every teacher now has a real Firebase account (self sign-up + verified e-mail, or created by you), so the database rules protect them. Local accounts are switched off (`allowLocalAccounts: false`).
- Approving needs your admin (Firebase) login, so keep the admin password private.
- Refunds, receipts and GST are not handled. Banks may limit a personal account that receives many payments - consider a business / merchant UPI ID.
- The old offline "licence key" box is hidden (`enableLicenseKeys: false`) because keys can be forged from the page source.
