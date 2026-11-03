# Who can open what: Standard + Subject access

## The rule
One purchase (or one admin assignment) opens **ONE Standard + ONE Subject**, e.g. `Std 12 Science | Mathematics (050)`.
Everything else stays locked for that teacher, including the same subject in another Standard.

| Teacher bought | Std 12 Science Maths | Std 11 Science Maths | Std 10 Maths | Std 12 Science Physics | GUJCET Maths | GUJCET Physics |
|----------------|:---:|:---:|:---:|:---:|:---:|:---:|
| Std 12 Science - Mathematics (050) | OPEN | locked | locked | locked | OPEN | locked |

GUJCET Mathematics / Physics / Chemistry come free with the same subject of Std 11 Science or Std 12 Science.
Teachers with no purchase see locked items and an "Unlock Rs 150" button for each Standard + Subject.

## Where it is enforced
1. **Screen:** locked Standard/Subject choices open the "My Subjects" window instead; locked questions are hidden from the bank, blueprint, paper maker and GUJCET workspace.
2. **Server (cannot be bypassed from the browser):** every question and blueprint row is stored in a folder named `<Standard> | <Subject>`. The database rules let a teacher read a folder only if that exact key is in their account (`users/<uid>/subjects` = assigned by you, `users/<uid>/purchased` = paid, with an expiry date).
3. **Editing** is allowed only for Standard + Subject pairs that YOU assigned in the Teachers tab. Purchased pairs are view-and-use-in-papers only.

## What changed in this version
- `js/app.js`: lock keys are Standard + Subject; teacher locking now really switches on for Firebase teachers (it was checking the wrong role name, so the screen lock never applied).
- Payment window and admin list are grouped by Standard.
- Teachers tab: tick Standard + Subject pairs (grouped by Standard). Ticking Std 11/12 Science Maths, Physics or Chemistry also ticks the matching GUJCET item.
- Approving a payment writes the exact key, plus the GUJCET key when it applies.
- `js/access-migrate.js`: one-time admin button "Upgrade old data now" (UPI Payments tab).

## One-time upgrade (existing data only)
1. Publish the rules (`database.rules.json` is unchanged from the last version, but publish it if you have not).
2. Push the new site, sign in as admin.
3. Open **UPI Payments** -> **Upgrade old data now** -> OK. It copies every question to its Standard + Subject folder, converts teachers' old subject keys (they keep what they paid for, in every Standard that has that subject; remove extras in the Teachers tab), converts licences, and only then deletes the old copies. Safe to run again.
4. Questions that have no Standard stay where they are (open them in the question bank and set the Standard).
5. Old payment requests that show only a subject (no Standard) cannot be approved: reject them and ask the teacher to choose again.

## Test (use two test teacher accounts)
1. Teacher A: pay Rs 1 for Std 12 Science | Mathematics (050), admin approves.
2. Teacher A can open Std 12 Science Maths and GUJCET Maths, and sees questions there.
3. Teacher A picks Std 11 Science Maths, Std 10 Maths, Std 12 Science Physics: each opens the unlock window and shows no questions.
4. Teacher B (nothing bought): everything is locked.

## Coming Soon (empty Standard / Subject)
- A Standard or Subject that has **no questions** shows a padlock and a yellow **COMING SOON** badge: in the Standard and Subject drop-downs, in the "My Subjects" window (also on the Standard heading when the whole Standard is empty).
- Such an item **cannot be bought** (the Unlock button is replaced by the badge, and the payment is refused if someone tries).
- It switches to normal (Unlock Rs 150) by itself as soon as you add the first question to it.
- How it knows: the admin session publishes a small public list (`catalog`) of Standard + Subject pairs that have questions. It updates itself about 15 seconds after you change questions, and the **UPI Payments** tab has a **Publish now** button. Until the first publish, nothing is marked Coming Soon (so nothing is hidden by mistake).

## Guest login (view only, first two chapters)
- **Continue as Guest** opens the Question Bank. A guest can only look at the **first two chapters** (lowest chapter numbers, e.g. Ch 1 and Ch 2).
- **Question Bank:** the questions of chapters 1-2 are shown in full. After them, every other chapter appears as a padlock card ("Ch 3 - ... 12 questions - opens after you sign in"). Choosing a Standard + Subject is needed to see the padlocks; the chapter filter also lists them with a padlock.
- **Blueprint matrix:** chapters 1-2 show all their marks details. Chapter 3 onward show a padlock and "SIGN IN TO OPEN". Every number box is read-only.
- **No other tab or button:** only Question Bank and Blueprint can be opened. The other sidebar items, and every button, form and menu (add / edit / delete / import / save / print / generate / payment) show a padlock. Clicking any padlock asks "Go to the sign-in window?" and a registered user signs in there; **the padlocks open only after sign-in**.
- What a guest CAN use: the Standard / Subject / Medium / marks / chapter / keyword filters, the General - GUJCET - Previous-year toggles, the matrix view switch, Sign out.
- Guests need no account and see no payment window. Nothing is saved on the device or in the cloud, and the guest session is forgotten on reload.
- Guest data is a **public copy of chapters 1-2 only** (`guestdemo` in the database), published by the admin with the catalog. The paid question bank stays private.

## Running line in the login window
- Above the Sign In / Sign Up tabs a **continuous running line** scrolls what the Question Bank really holds. First item: `📚 Total in Question Bank: 952 Questions`. Then one item per Standard + Subject, e.g. `📚 Std 12 Science · Mathematics (050) (120 Questions)`.
- **The numbers are exact.** They are counted straight from the Question Bank (General + GUJCET + Previous Year questions together) when the admin publishes the catalog. The per-subject items always add up to the total; questions that have no Standard yet are shown as `Standard not set yet (N Questions)`, so nothing is missing.
- Only pairs with questions are listed (empty ones are never shown). It pauses when the mouse is over it, and stops moving for people who set "reduce motion".
- It updates by itself about 15 seconds after the admin adds, edits, imports or deletes questions (or at once with UPI Payments -> **Publish now**). It stays hidden until the first publish. If a number ever looks old, sign in as admin and press **Publish now**.

## Coming Soon (reminder)
- Empty Standard / Subject: padlock + COMING SOON badge in the drop-downs and My Subjects window; the Question Bank and the Blueprint matrix show a big "Coming Soon" card when you pick such a pair. It cannot be bought.

## Check list for this feature
1. Publish the NEW `database.rules.json` (it adds `catalog` and `guestdemo`).
2. Push the site, sign in as admin, open **UPI Payments** and click **Publish now**.
3. Open the site in a private window: the running line shows only subjects with questions. Click **Continue as Guest**: only Question Bank + Blueprint open, Ch 1-2 are readable, Ch 3+ show a padlock, every button / other tab shows a padlock, empty subjects show Coming Soon.
4. As a teacher: an empty Standard / Subject shows the Coming Soon badge and cannot be bought.

## Sign-up, Teacher Access search, Delete, names (v17)
- **Sign-up window.** "New? Sign Up" now asks for Standard, Medium (Gujarati / English) and one or more Subjects. The amount is shown live: **Rs 150 x number of subjects** (1 subject = 150, 2 = 300, 3 = 450 ...). Subjects that are still "Coming Soon" cannot be ticked. GUJCET is not listed: it opens together with Std 11 / 12 Science Maths, Physics and Chemistry.
- **After the first sign-in** the pay window shows the chosen subjects and the exact amount. One payment = one request in UPI Payments (kind `bundle`). When the administrator approves it, **every** chosen subject and the 1-year plan are switched on at once.
- **Teachers & Access (admin).** Search bar: type any part of a teacher's name, e-mail, Standard, medium or subject (for example `priya`, `std 12`, `gujarati`, `maths`; several words must all match). Two drop-downs filter by Standard and Medium. The list shows "(showing 3 of 20)". Each card shows the medium, the Standards, what the teacher chose at sign-up and what is paid.
- **Delete** (red button beside Enable / Disable) removes the teacher's record, so the account can no longer open the app. A website cannot remove the Firebase login itself: to reuse the same e-mail, also delete it in Firebase Console > Authentication. Use **Disable** to pause an account without deleting it.
- **Names.** The name in the sidebar header is the administrator's and is fixed (`ADMIN_DISPLAY_NAME` in `js/state.js`). Teachers and staff see a separate button with their own name; it opens **My Account** (name, e-mail, Standard, medium, subjects).
- Medium is also asked when the admin adds a teacher, and can be changed on the teacher's card (press **Save subjects**).
- **Publish the new `database.rules.json`** (Firebase > Realtime Database > Rules): it allows the new fields `std`, `medium`, `want` and the new payment kind `bundle`. The amount of a bundle must equal 150 x the number of subjects; if you change the price in `js/state.js`, change the `150` in the `payRequests` rule too.
