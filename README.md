# Daybook

A private, offline-first ledger. No account, no ads, no bank login, and no sample transactions.

The app you can run here is the browser build in [`web/`](web/). Open `web/index.html` through a local server. It keeps the books in this browser's storage and does not send them anywhere.

```bash
python3 -m http.server 4173 --bind 0.0.0.0 --directory web
```

## Install on a phone

Open this address on the phone. It is the same Daybook app:

https://cdn.jsdelivr.net/gh/MrMax3757/Expense-Tracker-Application@arena/01a0c7e1-expense-tracker-application/web/index.html

This is not a Play Store or App Store package. Flutter and the Android SDK are not available here.

1. Android Chrome: open the link, then the browser menu, then **Add to Home screen** or **Install app**.
2. iPhone Safari: open the link, tap **Share**, then **Add to Home Screen**.
3. Open Daybook from the new icon.

The ledger stays in that browser. It is not uploaded. This address is a public file host, so it is not a private website of your own. Do not treat it as a bank lock. A home-screen install from your own GitHub Pages address is better once Pages is switched on.

Publishing to GitHub Pages needs one setting this environment cannot change.

1. Open [Pages settings](https://github.com/MrMax3757/Expense-Tracker-Application/settings/pages).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**. Save.
3. Re-run the **Publish Daybook** workflow. The phone address is then `https://mrmax3757.github.io/Expense-Tracker-Application/`.

`docs/review/` is an earlier shell study. It is not this app.

## What this build does

- Spend, Receive, and Move on the daily sheet. Adjust is on the account, not the daily sheet. Refund and reimbursement are in the full editor.
- Accounts: cash, bank, savings, wallet, credit card, and a manual investment balance. UPI, Google Pay, PhonePe, BHIM, and debit cards are payment methods, not accounts.
- Balances are derived. There is no stored balance to edit.
- A credit-card purchase is spending. Paying the card is a move. A cash advance is a move. A fee is a separate spend.
- Opening balances and balance corrections are not income and not spending.
- A refund reduces spending in the refund's period. It is not income.
- A reimbursement is money received. It is kept apart from salary, and it does not reduce spending or raise "Left after income".
- Home shows one number: left against the cap, left after income, or spent. Cash you have is a separate row. Available credit is never added to cash.
- Categories, an optional period cap, category budgets, repeating rules (including every third month), templates, search, filters, reports, and a local sentence parser with a review preview. The last legal payment method is remembered per account.
- CSV export is for a spreadsheet. It cannot restore the ledger.
- JSON backup is the full ledger. It is not encrypted. Restore checks the file first and imports nothing if the check fails.
- Optional PIN gate and privacy mode. The PIN does not encrypt the books, and it is not written into the backup file.

## How the books are stored

One JSON document, schema version 1, in `localStorage` under `daybook.ledger.v1`.

- `settings` — theme, payday, cap, grouping, lock flags. PIN hashes stay on the device and are stripped from backups.
- `accounts` — name, type, currency, optional credit limit, spendable and net-worth flags, archive time.
- `categories` — expense or income, optional parent, archive time.
- `transactions` — the source of truth. Amounts are positive integers in paise. The type carries the sign.
- `budgets`, `recurring`, `templates`, `parserRules`, `skippedOccurrences`, `dismissedInsights`.

There is no `deleted_at`. Delete removes the row and offers Undo for a few seconds. Archiving an account keeps its name on old rows.

## Tests that ran

```bash
node --test test/daybook.test.mjs
```

That covers the credit-card worked example, Indian grouping, the calculator, opening-balance refusal, the parser's refusal to save an incomplete sentence, `on the 5th` and weekday dates, backup checksum failure, recurring confirm-once, and payday 31 in February. A DOM smoke also passed: onboarding, an empty home, a disabled Save, a saved ₹350 expense, a blocked incomplete sentence, category chips on the parser preview, a savings account left out of cash you have, and delete wording that follows the transaction type.

## What did not run

`flutter` and `dart` are not installed here. The official SDK hosts could not be reached. These commands were **not** run, and they did not pass:

```bash
dart format .
flutter analyze
flutter test
flutter run
```

The Dart files under `lib/` are an uncompiled start. They are not the running app. `pubspec.yaml` still describes the intended Flutter stack (Riverpod, go_router, Drift) for a machine that can reach `pub.dev`.

## Limitations

- This browser cannot wake itself after the tab is closed, so reminders are in-app, plus a browser notification only if you allow it. Amounts are not put on the lock screen.
- Speech recognition is used only when the browser provides it. Audio is not stored. Typing always works.
- A receipt over 350 KB is refused. A smaller image is stored inside the ledger, which can fill browser storage.
- The home currency is rupees. A move between currencies is refused rather than guessed.
- Savings defaults out of "cash you have". You can turn that on.
- Cash can pay a card. The effect is a transfer, not a second expense.
- An investment account accepts only a balance correction. There are no prices or tickers.
- The app lock is a casual gate. Do not treat it as encryption.
