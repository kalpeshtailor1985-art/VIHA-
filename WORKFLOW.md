# KT Maths Exam Suite - Secure workflow

```
TEACHER                                          ADMIN (you)
-------                                          -----------
New? Sign Up (name, email, password 6+)
   -> Firebase account + profile created
   -> verification e-mail sent
Open the e-mail link  (check Spam)
Sign In  -> app opens (no subjects yet)
My Subjects -> choose Standard + Subject -> Unlock -> scan UPI QR, pay Rs 150
Type UTR -> Submit for approval
                                                 Left menu -> UPI Payments (red number)
                                                 Open GPay/PhonePe: find amount + UTR + note code
                                                 Approve -> type last 4 chars of UTR (safety check)
                                                   (or Reject + reason)
ONLY that Standard + Subject unlocks (live); all others stay locked  <───────────── licence written to database
Question Bank -> add / bulk import (Excel, CSV; General, GUJCET, Previous Year)
Blueprint matrix (chapter x marks) -> Generate paper
Preview -> replace / edit -> Designer -> Print / PDF / Word
Saved in "My Saved Work"

OLD LOCAL TEACHER (already used the app before)
Sign In with the old e-mail + old password
   -> app moves the account to Firebase (hashes old copy, deletes it)
   -> verification e-mail -> verify -> Sign In again
   (old password shorter than 6 characters: use "New? Sign Up" with a new one)
```

## Guest and Coming Soon
```
Visitor sees the running line (only Standard + Subject that have questions)
Visitor -> Continue as Guest -> VIEW ONLY: Question Bank + Blueprint, chapters 1-2 readable, rest padlocked,
          every other tab / button padlocked -> click a padlock -> sign-in window -> Sign Up + pay for that Standard + Subject
Empty Standard / Subject -> padlock + COMING SOON badge, cannot be bought -> becomes buyable when you add its first question
Admin: changes questions -> catalog + guest copy publish automatically (or UPI Payments -> Publish now)
```

## Access rule
One payment = one Standard + one Subject (details and test list: `ACCESS.md`). Std 11/12 Science Maths, Physics, Chemistry also open the matching GUJCET subject.

## Release steps
1. Firebase console: publish `database.rules.json`.
2. Google Cloud console: restrict the API key (see SECURITY.md).
3. Change `CACHE_VERSION` in `sw.js`.
3b. First time only: UPI Payments tab -> "Upgrade old data now" (see `ACCESS.md`).
4. `git push` to `main`.
5. Test: sign up in a private window -> verify -> sign in -> pay Rs 1 -> approve -> unlock.
