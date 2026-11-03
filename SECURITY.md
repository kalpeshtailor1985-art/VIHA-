# KT Maths Exam Suite - Security guide

## What was fixed in the code
| Risk | Fix |
|------|-----|
| Teachers' passwords were saved as plain text in the browser, and anyone could fake a login on their own device | Teachers now use **real Firebase accounts**. No password is kept in the browser. Old local accounts are hashed at start-up and moved to Firebase the first time that teacher signs in (`js/secure-auth.js`). |
| Anyone could sign up with another person's e-mail and see that person's paid licence | New sign-ups **must verify their e-mail** (link sent by Firebase) before the app opens. |
| A copied/edited browser session (even one with your admin e-mail) could open the app | Saved sessions are trusted only for Firebase logins, and are re-checked online. "Master Lifetime" is given only to the verified Firebase admin. |
| "Guest" button and local "Forgot password" (reset on someone else's device) | Guest button hidden. Forgot password now sends a Firebase reset e-mail. |
| Fake / mistyped UTR approved by mistake | Approve now needs a **safety check**: you type the LAST 4 characters of the UTR you see in GPay/PhonePe. Requests whose number is not 12 digits are marked with a warning. Obvious fakes (0000000000) are refused. A UTR can still be used only once. |

Switch: `SUB_CONFIG.allowLocalAccounts` in `js/state.js` (keep `false`).

## Do these once in the Google / Firebase consoles (no code)

### 1. Lock the Firebase API key to your website  (fixes "API key is visible")
The key must stay in the page, so make it useless anywhere else:
1. Open https://console.cloud.google.com -> select project **kt-exam-suit**.
2. APIs & Services -> **Credentials** -> click the key named "Browser key" (the one that starts `AIza...`).
3. **Application restrictions** -> *Websites* -> add  
   `https://YOUR-USERNAME.github.io/*`  
   (add `http://localhost:*` only while you test, remove it later).
4. **API restrictions** -> *Restrict key* -> tick only **Identity Toolkit API** and **Token Service API**. Save.
5. Test: sign in on the live site. If it says "requests from this referer are blocked", the website address in step 3 is wrong.

The Realtime Database does not use this key; your **database rules** protect the data.

### 2. Firebase Authentication settings
Firebase console -> Authentication:
- Sign-in method -> Email/Password -> **Enabled** (Email link is not needed).
- Settings -> **Authorized domains**: keep only `localhost` (optional) and `YOUR-USERNAME.github.io`.
- Settings -> User actions: tick **Enable email enumeration protection**.
- Settings -> Password policy: minimum length **8**.
- Templates -> Email address verification: change the sender name to "KT Maths Exam Suite".

### 3. Publish the NEW database rules  (required - they changed)
Realtime Database -> Rules -> paste the full `database.rules.json` -> **Publish**.
Publish the rules BEFORE you push the website, otherwise new sign-ups cannot save their profile.

### 4. Your UPI ID is public - that is normal
A payee's UPI ID must be shown for people to pay. It cannot be used to take money out of your account. To reduce spam and privacy risk:
- Use a separate bank account / business UPI ID only for this app.
- Never share your UPI PIN or approve any "collect request" you did not start.
- If a bank limits a personal account that receives many payments, move to a merchant UPI ID.

## Daily habits
1. Never press Approve until you SEE the payment in your UPI app (amount + reference + note code).
2. Reject anything you cannot find. Delete junk in the Firebase console (`payRequests`, `utrIndex`).
3. Keep the admin password long and private. Sign out on shared computers.

## Public data (by design)
`catalog` (which Standard + Subject has questions, and chapter names) and `guestdemo` (a copy of chapters 1-2 for guests) can be read by anyone, so the Guest login works without an account. Only the admin can write them. The rest of the question bank stays private.

## What is still true
- Anyone can submit a payment request (without logging in). It cannot unlock anything until you approve it.
- A self-registered teacher can open the app but sees **no question bank** until a payment is approved or you tick a subject for them.
- Refunds, GST and receipts are not handled.
