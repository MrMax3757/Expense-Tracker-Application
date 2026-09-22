# Daybook — Product Plan and Technical Specification

**Status: locked specification, revision 2, 22 September 2026. This revision does not authorize implementation. Do not write Flutter code from this file until implementation is explicitly requested.**

Exploratory files under `lib/`, `docs/review/`, and `docs/screens/` are not the source of truth. Where they disagree with this document, this document wins. Section 33 overrides any earlier sentence on accounts, period math, credit cards, delete, backup, parser scope, or what V1 includes.

| | |
| --- | --- |
| Working name | **Daybook** |
| Document type | Product and technical specification |
| Date | 22 September 2026 |
| Platform intent | Flutter, Android first, offline-first |
| This phase | Decisions only. No screens, no production code, no changes to an application. |
| Repository | Planning repo. The only prior artifact is a one-line README. |

Daybook is a placeholder name, not a trademark clearance. It is the traditional book of first entry: capture the transaction immediately, post it to the right account, and never invent a line the user did not confirm. Backup names if Daybook is unavailable: **Fieldbook**, **Quietbook**.

This plan studies Monefy, Money Manager (Realbyte), Wallet by BudgetBakers, Spendee, Goodbudget, axio (formerly Walnut), and Moneyview. It does not copy their layouts, visual systems, or wording. Public behavior was reviewed as of September 2026 and will drift; the decisions below do not depend on matching any one app.

---

## How to read this

The locked decisions in the next section are the source of truth. Later sections explain them. If a later paragraph conflicts with a locked decision, the locked decision wins. If a later paragraph conflicts with section 33, section 33 wins. Section 33 is the implementation boundary.

Classifications used throughout:

1. **Essential** — without it the product is false, unsafe, or not actually a ledger. Belongs in the MVP.
2. **Important** — a serious user will miss it, and the data model must not block it. Ships in a named later phase, not as MVP ballast.
3. **Nice to have** — pleasant, not a reason anyone chooses the app.
4. **Advanced / future** — real, but only after the daily habit exists, or heavy, regulated, or platform-risky.
5. **Not worth implementing** — a different product, a trust failure, or a feature whose maintenance cost exceeds its value.

---

## Locked decisions

These are recommended locks, not an open brainstorm. Override them explicitly before implementation. Do not relitigate them screen by screen.

| ID | Decision |
| --- | --- |
| D-01 | Daybook is a personal ledger. It is not a lender, not a UPI app, not a tax filer, and not an investment terminal. |
| D-02 | No ads. No sale or secondary use of financial data. Core tracking and CSV/JSON export are never paywalled. |
| D-03 | No account, email, or network connection is required to do the whole core job. |
| D-04 | The phone is the system of record. Balances are derived from transactions. They are never a separately edited number. |
| D-05 | Users see four verbs: **Spend**, **Receive**, **Move**, **Adjust**. The engine posts balanced effects. Users never see debits and credits. |
| D-06 | There is one balance container: **Account**. Debit cards and UPI are payment methods, not accounts. A "digital wallet" account exists only for stored-value balances. |
| D-07 | Credit cards are liabilities in the first ledger version. Retrofitting the sign of a credit card later will corrupt history. |
| D-08 | Opening balances are adjustments, never income. Transfers and card payments are never expenses. Refunds are never income. |
| D-09 | Money is an integer in minor units (paise). No floating point. Each account has one currency. V1 is single-currency. |
| D-10 | Transaction dates are local calendar dates, not UTC timestamps. |
| D-11 | An incomplete capture is never saved. "I spent 500" opens a review, it does not create a row. |
| D-12 | The explicit quick form may preselect the last-used category, because the chip is visible. Natural language, voice, and any future automatic capture may not. |
| D-13 | The hero is "Left this period" only when a spending cap is set. With income and no cap, the label is "Left after income". Otherwise it is "Spent this period". The app must not invent a safe-to-spend figure. |
| D-14 | Card purchases count as spending against that figure. They do not reduce cash. Cash and "left to spend" are different numbers and are never added together. |
| D-15 | Budget periods follow payday if the user sets one. Otherwise they follow the calendar month. |
| D-16 | Navigation is Home, Activity, a center Add sheet, Insights, and More. Accounts, settings, and later goals are not tabs. |
| D-17 | Add is a sheet for the common case and a full editor for everything else. |
| D-18 | Visual system is **Paper & Ink**: warm paper, ink text, one deep-green accent, no rainbow home screen, no glass, no guilt copy. |
| D-19 | V1 themes are Light, Dark, and System. No accent picker. |
| D-20 | Architecture is Flutter, Riverpod, Drift on SQLite, go_router. Not GetX, not Hive, not Isar, not a microservice backend. |
| D-21 | Rules and local dictionaries come before any model. No cloud AI in the first versions. No API keys in the app. |
| D-22 | SMS inbox permission is out of scope. The product must be complete without it, which also makes the Google Play SMS exception a poor and likely unavailable fit. |
| D-23 | If automatic capture is ever built, it is Android notification drafts, on device, allowlisted, opt-in, and never auto-posted. |
| D-24 | Export, backup, sync, and restore are different operations. Only export and local backup/restore are near-term. |
| D-25 | Sample data is forbidden. A finance app that ships fiction teaches the user not to trust it. |
| D-26 | English UI in V1. All strings externalized so Hindi can be added without a rewrite. |
| D-27 | India is the default shape (INR, Indian grouping, payday, UPI as a rail, EMI, cash). It is not a country lock. |
| D-28 | App lock in the MVP is an honest casual gate, not a claim of bank-grade encryption. Database encryption ships before any cloud backup or notification capture. |
| D-29 | Android Auto Backup must not upload the database. |
| D-30 | The natural-language parser is the first enhancement after the core ledger, not a distant "AI phase". It is deterministic. |
| D-31 | The first expense has no category preselected. After one save, the quick form may show the last-used category. Write mode never prefills a category the parser did not find, and a system guess must be tapped once before save. |
| D-32 | The amount calculator never saves an incomplete expression. |
| D-33 | Home has no drawer and no header actions in V1. |
| D-34 | List subtitles are category and account, not a clock time. |
| D-35 | Indian grouping starts at 1,00,000. ₹18,420 has no extra comma. ₹1,04,650 does. |
| D-36 | Paying a card is Move, labeled Pay card, stored as a transfer with `transfer_kind = card_payment`. |
| D-37 | Hierarchy is Account, then account type, then payment method. UPI, Google Pay, PhonePe, BHIM, and debit cards are never accounts. |
| D-38 | "Left this period" means left against the spending cap only. It is not left after income, and it is not cash you have. |
| D-39 | Period spending is expenses in the period minus refunds in that same period. Transfers, card payments, cash advances, opening balances, balance adjustments, and income are excluded. |
| D-40 | The user verb is Adjust. Internally, `opening_balance` and `balance_adjustment` are different. Neither is income or expense. |
| D-41 | V1 delete is an immediate hard delete plus an in-memory Undo. There is no `deleted_at` and no purge job. |
| D-42 | V1 JSON backup is not encrypted. The warning is mandatory. Restore validates the whole file first and imports nothing if validation fails. |
| D-43 | Parser V1 ships in V1.1, not in the first binary. It covers amount, type, date, category, and payee only, and it never autosaves. Lakh, accounts, and learned rules are Parser V2. Voice, Hindi, and notification drafts are Parser V3. |
| D-44 | V1 ships four insight lines and no charts. |
| D-45 | A cash advance is a Move from a credit card to an asset. It is not spending. A fee is a separate expense on the card. |
| D-46 | "Wallet" means only a stored-value account type. It is not a second way to organize money beside Account. |
| D-47 | Refund is a V1 transaction type so a card refund cannot be saved as income. It is not a quick-add verb. |
| D-48 | Archiving an account is not transaction soft delete. An account with history keeps its name. A transaction delete removes the row. |

---

## 1. Product vision

### The problem

People lose track of ordinary money in a specific way. The purchase is over in seconds. The bank SMS, if it arrives, says an amount and a messy UPI reference. Cash leaves no record. By the end of the month the salary is gone and the only explanations on offer are a spreadsheet the person abandoned, a candy-colored tracker that takes too long to open, or an app that read their inbox and then offered them a loan.

The job is not "manage your financial life". The job is: **record what just happened before the context disappears, and be able to answer "where did this period's money go?" without handing the ledger to a company.**

### Who it is for

**Primary.** Salaried people in India, roughly 22 to 40, with one or two bank accounts, UPI as the default rail, sometimes a credit card, and a real amount of cash. They might have 30 to 80 digital payments a month plus cash and a handful of large fixed outflows: rent, EMI, electricity, mobile, subscriptions, family support. They have tried a notes app, a spreadsheet, or an SMS tracker. They stopped, or they did not trust it.

**Secondary.** Anyone, in India or elsewhere, who wants a private manual ledger: students, freelancers with uneven income, a person tracking a trip, a couple who may want a shared view later but can start alone.

**Not the target, and not allowed to distort the product.**

- Households that need real-time joint bookkeeping now.
- People who want the app to pay bills, send UPI, or score credit.
- Investors who want live portfolios.
- Small businesses that need GST invoices.
- Anyone looking for a loan.

Freelancers are in the secondary audience only as people with irregular income. The app will not grow accounts-receivable features for them in the versions described here.

### What "different from an ordinary expense tracker" means

An ordinary tracker is a form in front of a list. Daybook is a ledger with a capture problem and a trust problem.

- Capture has to be fast enough to happen at the counter, and strict enough that a half-understood sentence cannot become a false record.
- The numbers have to obey account rules, including credit cards and transfers, or the insights are fiction.
- The product has to be useful with the phone in airplane mode, and remain the user's property if the company disappears.
- India-shaped money (UPI, payday, EMI, cash, lakh) has to be native, without making the app useless in another currency.

### Core value proposition

**Know where this period's money went, in a ledger that stays on your phone, recorded in a few seconds, with no account and no inbox access.**

The promise is deliberately smaller than "financial freedom". Small promises get kept.

### Primary experience

Open the app and see one honest number: what is left this period, or, if the app cannot know that yet, what has been spent. Add the thing you just paid for without leaving the home screen. Trust that a transfer was not counted as spending, and that a card purchase was.

The daily loop is look, add, leave. Analysis is a second visit, not a tollbooth on the first.

### Philosophy

- Record first, explain second.
- A wrong automatic entry is worse than a missing one.
- Every extra field is a tax on the habit.
- An insight that cannot change a decision does not ship.
- Color is meaning, not decoration.
- The ledger belongs to the user. The company is optional.
- Do not guilt people into budgeting.
- Do not pretend certainty the input did not contain.

### What a shippable product feels like

It feels finished when a new user can install it on a flight, create cash and one bank, record a week of mixed UPI, cash, and card spending, correct a mistake, see a true remaining figure, and copy a backup file to their own storage — without an account, a permission dialog, or a single empty chart.

---

## 2. Competitor research

### What the category actually is

These seven apps are not one category. Treating them as a feature checklist produces a bloated app. They are four jobs wearing similar icons.

| Job | Who does it | What users are really hiring it for |
| --- | --- | --- |
| Fast manual capture | Monefy | "Log this before I forget, then show me the shape of the month." |
| Classic personal books | Money Manager | "Be my long-term account book, with receipts, a calendar, and a one-time purchase." |
| Connected finance suite | Wallet, partly Spendee | "Pull the banks in, plan bills, and show me one picture." |
| Envelope discipline | Goodbudget | "Make me decide before I spend, and show me the envelope getting thin." |
| Zero-effort India capture | axio, Moneyview | "Read the SMS the bank already sent, and don't make me type." |

Daybook takes the capture speed of the first, the accounting honesty of the second, the "what is left" psychology of the fourth, and the India-shaped transaction mix of the fifth. It refuses the lending business of the fifth and the bank-login dependency of the third.

### Pattern notes, not UI notes

**Monefy.** The interaction is amount plus category, often described by the product as needing nothing but the amount. The chart is the reward for logging. Sync goes through the user's own Drive or Dropbox, which is a better trust model than a mandatory vendor account. Widgets, a passcode, recurring records, multiple accounts, and a calculator show up because daily use happens in the real world, not in a settings tour. Friction: manual only, so missed days become missed truth; analytics stay shallow; subscriptions and receipts are common wishes rather than strengths; a category wheel does not scale cleanly past a handful of categories and hides income, transfers, and accounts. Principle to keep: **the common case asks for the amount and one visible choice.** Principle to reject: the chart is not the home screen. A pie does not tell you whether you can afford the rest of the month.

**Money Manager (Realbyte).** Calendar totals, photo receipts, filters, category budgets, transfers, and multiple account kinds (cash, bank, card, and longer-term assets) make it a system of record. Double-entry is a feature they advertise; it is also why transfers and card payments can stay honest. A one-time unlock, rather than a rent, fits a utility people keep for years. Friction: density. The same completeness that makes it powerful makes the first week feel like setup. The visual language is of an earlier Android generation. Principle to keep: **separate money moving between your accounts from money leaving your life, and let people see a day, not only a month.** Principle to reject: do not expose bookkeeping vocabulary, and do not require a photo or a full form to save lunch.

**Wallet by BudgetBakers.** The useful idea is that a record, a transfer, and a planned payment are different objects, and that a budget without upcoming bills lies. Bank sync across a very large institution list, family sharing, investments, and web access make it a suite. Categorization that learns is valuable once data volume is high. Friction: the free product is a sample of the paid one; sync means an aggregator; the surface area is a desktop finance app on a phone; India UPI volume is a poor match for "link your bank and wait" compared with the SMS habit Indian users already have. Principle to keep: **future outflows are part of the truth.** Principle to reject: do not make bank login the front door, and do not put every concept on the same navigation level.

**Spendee.** Wallets here are contexts — a trip, a household — not just balances. Shared access, labels, a daily allowance, and strong visuals are the appeal. Receipt scanning is a newer capture shortcut. Friction: "wallet" already means Paytm, PhonePe, or GPay to the primary user, so a second wallet metaphor will be misunderstood. Shared ledgers explode privacy and sync scope. Charts can outrun the data and become decoration. Extra wallets sitting behind a paywall trains people to think their own structure is a premium object. Principle to keep: **a daily pace can make a monthly cap feel real.** Principle to reject: do not invent a second organizing object beside accounts and categories. A trip is a tag or a goal, later.

**Goodbudget.** Envelopes work because the remaining balance is visible and finite. Filling envelopes when income arrives is a ritual, and the ritual is the product. Manual entry is defended, correctly, as attention. Debt tracking fits that method. Friction: if you do not do the ritual, the app is empty of meaning. Free limits (one account, a cap on envelopes, short history) push ordinary multi-account users to pay before the method has proved itself. Reporting is not why people stay. Principle to keep: **remaining constraint beats historical pie charts, but only if setup is optional.** Principle to reject: do not block the first expense on a budget. Monefy users and Goodbudget users are both legitimate; the first expense must work for both.

**axio (Walnut) and Moneyview.** The insight that built the India category is correct: the bank already wrote the transaction down, in an SMS. Parsing it removes the habit problem. Weekly summaries are more useful than a live pie. Bill reminders match how people actually fail (forgotten electricity, not forgotten coffee). The failure is the business model and the permission. Both products sit inside lending. SMS permission is inbox-wide: OTPs and personal messages are in the same box as "INR 350 debited". iOS cannot offer the same capture. Cash is invisible, so the books look complete while they are not. UPI person-to-person messages categorize badly. Sync and export have historically been weaker than the capture story. A tracker that is also a credit shop cannot be a trusted system of record. Principle to keep: **meet people where the transaction already happened, and summarize the week in a sentence.** Principle to reject: never monetize by lending, never auto-post a parsed message, never make inbox access the price of using the app.

### Feature classification

"Why" is the decision. Competitor presence is not a reason to build.

| Feature | Class | Why |
| --- | --- | --- |
| Transaction tracking | Essential | The product. If logging is slow, nothing else matters. |
| Income tracking | Essential | Without income, "left this period" and net position are guesses. Opening balances must not be smuggled in as income. |
| Categories | Essential | The only way spending becomes an explanation rather than a list of amounts. |
| Subcategories | Important | Useful for Food and Transport, harmful if the first-run picker shows 60 leaves. Schema supports a parent. V1 ships a short child list, collapsed. |
| Accounts | Essential | Cash, bank, and card are different facts. A single balance lies. |
| Wallets as a second metaphor | Not worth implementing | Collides with UPI wallets and with accounts. Stored-value wallets are an account type. Trips and households are tags, later. |
| Budgets | Important | The second job, after a month of records. A cap is useful. A mandatory envelope fill will kill activation. One optional spending cap is in the MVP; category budgets are the next phase. |
| Recurring transactions | Important | Rent, EMI, salary, and subscriptions are why manual trackers fail. They are not required to prove the ledger. Design the link now; build the scheduler after the habit exists. |
| Transfers | Essential | Money moved between your own accounts is not spending. Omit this and every insight is wrong the first time someone withdraws cash. |
| Savings goals | Nice to have | Motivating once the ledger is trusted. A goal with no history behind it is a poster. Later phase. |
| Reports | Important | A month needs a summary. A report builder with custom columns does not. |
| Charts | Important | One comparison and one breakdown are enough. Charts as a gallery are decoration. |
| Search | Essential | After a month, the list is not enough. V1 search is text plus amount. Structured queries come after. |
| Filtering | Essential | Type, category, account, and this period. That set answers the real questions. |
| Calendar views | Important | Money Manager is right that a day is a meaningful unit. A date-grouped list covers the MVP. A month grid is the next step, not a second home. |
| Notifications | Important | Only once there is something to remind. Default off. Local only. |
| Reminders | Important | Same feature as notifications, tied to recurring items and bills. Not a daily "open me" nag. |
| Exports | Essential | A ledger you cannot take with you is a hostage. CSV in the MVP, free forever. |
| Backups | Essential | Phone loss is the real threat model. Local full-fidelity backup and restore in the MVP. |
| Synchronization | Advanced / future | Multi-device is a conflict-resolution product. Do not fake it with a mandatory login. A later option is a user-owned encrypted file, not our database. |
| Authentication | Advanced / future | There is nothing to authenticate until there is a cloud account. Optional, never the front door. |
| Privacy controls | Essential | No account, no phone-home, plain disclosure, delete that really deletes. This is a feature, not a policy page. |
| Offline functionality | Essential | The core loop must work with no radio. This is a requirement, not a mode. |
| Automatic transaction detection | Advanced / future | High value, high trust cost. Drafts only, after the manual product is loved. |
| SMS transaction detection | Advanced / future, and maybe never | See section 4. Optional if it ever exists. Not READ_SMS. Not V1. |
| Bank integrations | Advanced / future | The legitimate India path is the RBI Account Aggregator framework through a licensed partner, not netbanking passwords and not screen scraping. Not a first-party V1 project. |
| AI features as a bundle | Not worth implementing as a bundle | Each use is judged alone in section 16. "AI" is not a feature. |
| Natural-language entry | Important | It is the capture differentiator, but it is a parser, not a model. First enhancement after the ledger. |
| Voice input | Nice to have | The same parser with the platform speech recognizer in front. Do not store audio. Do not build a voice stack. |
| Customization | Important | Custom categories are essential. Custom icon packs, density, and accent colors are nice-to-have and mostly later. |
| Themes | Essential | Light, dark, system. Phones are used at night. Anything beyond that waits. |
| Widgets | Important | On Android, a widget is often the difference between logging and forgetting. Platform work. After the sheet is excellent. |
| Multi-currency | Important | Travel and family abroad are real. A live FX product is not. Schema reserved; engine later; V1 is one currency so the books cannot silently disagree. |
| Multiple accounts | Essential | Same reason as accounts. Two accounts is the normal Indian case, not an upgrade. |
| Shared finances | Advanced / future | A real job for couples, and a different privacy and sync product. Postpone until one person trusts the ledger. |
| Subscriptions | Important as a view, not a product | A category plus recurring dates. Not a cancellation concierge, not a bill-pay rail. |
| Debt tracking | Advanced / future | EMI as a category is enough for the first year. Loan balances and amortization are a later account type. |
| Investment tracking | Not worth implementing as market data | Quotes, brokers, and corporate actions are another company. A manual asset balance may exist someday for net worth. No prices, no tickers, in any version in this plan. |

### Explicit non-goals

- Lending, pay-later, credit score, fixed deposits, insurance marketplace, card applications.
- Sending money, collecting money, or becoming a UPI handle.
- GST returns, invoices, inventory.
- Screen-scraping bank apps, storing netbanking or UPI PINs.
- Becoming the default SMS app in order to qualify for inbox permission.
- Social feeds, public profiles, spending leagues, shame streaks.
- Ads, attribution SDKs, and analytics that include merchant, amount, or note.
- A chatbot that gives regulated financial advice.

---

## 3. Feature architecture

```
Daybook
├── Capture
│   ├── Quick form                  MVP
│   ├── Templates                   first enhancement
│   ├── Natural language + review   first enhancement
│   ├── Voice into that parser      later
│   └── Notification drafts         future, opt-in, Android
├── Ledger
│   ├── Spend, Receive, Move, Adjust
│   ├── Accounts and payment methods
│   ├── Categories
│   ├── History, edit, delete, duplicate
│   ├── Refund type                         V1, full editor only
│   ├── Splits and reimbursements           not in V1, not reserved columns
│   └── Recurring rules                     V3, not built now
├── Picture
│   ├── Home summary
│   ├── Optional period cap          MVP, skippable
│   ├── Category budgets             next
│   ├── Insights that change a decision
│   └── Goals                        later
├── Custody
│   ├── Local database
│   ├── CSV export
│   ├── JSON backup and restore
│   ├── App lock
│   └── Encrypted backup / sync     future
└── Never
    └── Credit products, payments, bank passwords, inbox scraping
```

### Core finance

- **Expenses** reduce an asset or increase a card liability, and count as spending.
- **Income** increases an asset and counts as income. It is not a negative expense. Mixing the two makes "Food" charts lie.
- **Transfers** move value between the user's accounts and count as neither.
- **Adjustments** set opening balances and correct mistakes that are not real income or spending.
- **Accounts** hold balances in one currency.
- **Categories** explain spending and income. They are not accounts.
- **History** is the ledger, grouped by local date, searchable, editable.

### Budgeting

- A single optional period cap in the MVP.
- Category budgets, alerts, and "still due before payday" after recurring exists.
- No envelope-filling ritual required to record a transaction.
- Remaining budget is a number with a plain progress track, not a game.

### Analytics

Ships as a small set, listed in section 17. It is a reader of the ledger, not a second data pipeline.

### Goals

Later. A goal is a named target amount, a date, and an optional linked account or category. It does not get a tab until someone has created one. Emergency fund is a goal template, not a special subsystem.

### Automation

- Recurring rules generate **pending** items. Default is one-tap confirm. Auto-post is an explicit per-rule choice for truly fixed items.
- Categorization suggestions come from the user's own corrections and a small local dictionary.
- Templates are user-authored shortcuts, not a content business.

### Intelligent input

Specified in sections 8 and 16. The contract is: extract what is actually in the sentence, show the extraction, save only when required fields are present and visible.

---

## 4. India-first, not India-only

### Defaults

- Currency INR, symbol ₹, minor unit paise.
- Grouping `en-IN`: ₹12,34,567.89. A setting switches to international grouping ₹1,234,567.89. European comma-decimals are out of scope; document that limitation rather than guessing.
- Dates as `22 Sep 2026`. Never month-first numeric dates.
- Payday optional. Many salaries do not arrive on the 1st. The period runs from payday to the day before the next payday. Day 31 clamps to the last day of a short month.
- First day of week defaults to Monday. Setting exists because it affects weekly insights later.

### Payment rails

| Thing people say | What it is in Daybook |
| --- | --- |
| UPI, GPay, PhonePe, BHIM | Payment method **UPI** on a bank account |
| Debit card | Payment method **Debit card** on a bank account |
| Paytm / Amazon Pay balance that you load | Account type **Wallet** |
| Paytm used only as a UPI front-end | Not a wallet. Payment method UPI |
| Credit card swipe or tap | Expense on a **credit card** account |
| Cash, auto, kirana | Expense on **Cash**, or whichever account they pick |
| NEFT / IMPS / salary credit | Income, payment method bank transfer |
| ATM | Move from bank to cash, not an expense. A fee is a separate expense if they record one |

This distinction is the India-specific design that prevents double counting. The onboarding copy has to say, in one sentence, that GPay is not a new account unless they hold a stored balance there.

### Categories the market actually has

Rent, EMI, mobile recharge, electricity, DTH, household help, family support, and insurance premiums are normal monthly lines, not edge cases. They are in the default category set in section 7. They are also parser aliases: kirana, recharge, auto, maid, emi, fees.

### GST

Not a GST product. A later optional tag, `tax-relevant`, can mark a transaction the user may want to find again. No GSTIN validation, no invoice schema, no return filing, in this plan. Building a partial GST tool would attract the wrong users and the wrong liability.

### Language

V1 UI is English. Examples and parser aliases may recognize common Hindi and mixed words for merchants and categories (kirana, ghar ka kiraya, bijli, tankhwa / salary). Full Hindi UI is a later release, which is why strings are externalized from the first commit. Do not machine-translate the ledger mid-flight.

### SMS and bank access

**SMS inbox reading is not a planned feature.**

Google Play restricts `READ_SMS` and related permissions. A published exception exists for "SMS-based money management", for example apps that track and manage a budget, and it is subject to review. The exception is for core functionality where there is no alternative. Daybook's core must work with no SMS permission at all. That product requirement cuts against the exception test. Review is case-by-case, the permission is still the entire inbox, iOS has no equivalent, and Play's spyware rules specifically warn budgeting and lending apps not to take non-financial SMS off the device. Established manual apps stay manual for this reason, not because they forgot.

**Notification capture**, if built, is a different and still sensitive design:

- Opt-in from a dedicated explanation screen. Never during onboarding. Never again after a dismissal, except from Settings.
- Android Notification Listener only. No inbox history. No iOS pretend-equivalent.
- On-device parse. Allowlist of bank and UPI app packages, edited by the user.
- The result is a draft in a review queue. Saving is explicit.
- Raw notification text is discarded after parse, or kept only until the user saves or dismisses the draft. It is never uploaded.
- One switch disables the listener and deletes unreviewed drafts.
- Cash will still be missing. The UI must say so, or the books will look more complete than they are.

**Account Aggregator** is the legitimate later path for bank data in India: RBI-regulated, consent-based, revocable, read-only if we stay a reader. It requires a licensed Financial Information User or a partner who is one. It is not an SDK weekend. It is not V1, V2, or V3. Netbanking passwords are never collected.

International users are not a skin. The same account types, the same parser pipeline, and a home-currency setting cover them. Locale changes formatting. It does not fork the ledger.

---

## 5. Account model

This section, together with section 33, is the account and dashboard source of truth.

### Hierarchy

There is one balance container: **Account**. It has an account type. A payment method is only a label on a transaction. It never has a balance.

```
Account
  → account type
    → payment method
```

| Account the user names | Account type | Legal payment methods |
| --- | --- | --- |
| HDFC Bank | Bank | UPI, Debit card, Bank transfer, Cheque, Other |
| ICICI Credit Card | Credit card | Credit card only |
| Cash | Cash | Cash only |
| Paytm stored balance | Wallet | Wallet only |

Rules that must be repeated in onboarding, the account editor, and the parser:

- UPI is not an account.
- Google Pay, PhonePe, and BHIM are not accounts. They are ways of spending from a bank account, so the payment method is UPI.
- A debit card is not an account. It spends from the bank account it draws on.
- A credit card is an account, because it has a liability balance.
- A stored-value wallet is an account, because it contains money. Paytm or Amazon Pay used only as a UPI front-end is not a wallet account.
- "Wallet" is an account type. It is not a second organizing idea beside Account. Trips, households, and contexts are not wallets.

The picker for payment method offers only the legal methods for the selected account. Saving a credit-card purchase with payment method UPI is an impossible state and must be rejected.

### Types in the first ledger

| Type | Economic nature | Typical name | In "cash you have"? | In net worth? |
| --- | --- | --- | --- | --- |
| Cash | Asset | Cash | Yes | Yes |
| Bank | Asset | HDFC Bank | Yes, unless marked savings-not-spendable | Yes |
| Wallet | Asset | Paytm balance | Yes | Yes |
| Credit card | Liability | ICICI Credit Card | No. Show amount owed, or credit balance. Available credit is separate and never added to cash. | Yes, as a subtraction of amount owed |

Bank subtype is `current` or `savings`. A savings account defaults to included in net worth and excluded from spendable cash, with a toggle. An emergency fund must not look like weekend money. The user can turn that off.

Future types, not created in V1: loan liability, manual investment asset. Do not add those screens. The type field is a constrained string so a later migration is a code change, not a new database.

### What a balance is

There is no stored balance column in V1. A balance is derived. If a cache is added later, it is rebuilt from the ledger and never edited.

Amounts below are positive minor units. Direction comes from the transaction type, `adjustment_direction`, and which account is source or destination.

For an asset account A:

```
asset_balance(A) =
    opening_balance(A)
  + balance_adjustment_increases(A)
  − balance_adjustment_decreases(A)
  + income(A)
  + transfers_in(A)
  + refunds(A)
  − expenses(A)
  − transfers_out(A)
```

For a credit-card account C, amount owed is positive when the user owes the issuer:

```
card_owed(C) =
    opening_balance(C)
  + balance_adjustment_increases(C)
  − balance_adjustment_decreases(C)
  + expenses(C)
  + transfers_out(C)
  − transfers_in(C)
  − refunds(C)
  − income(C)
```

`transfers_out` on a card is a cash advance. `transfers_in` on a card is a payment or an overpayment. Income posted onto a card is allowed only from the full editor, with a warning, and reduces `card_owed`. It still counts as income. A card refund must be a refund, not income.

```
cash_you_have =
  sum of asset_balance(A)
  for accounts that are not archived, not a credit card, and include_in_spendable

net_worth =
  sum of asset_balance(A) for included asset accounts
  − sum of card_owed(C) for included credit cards
```

A negative `card_owed` is a credit balance. It increases net worth, because subtracting a negative number adds. It is not added to cash you have.

```
available_credit(C) = credit_limit(C) − card_owed(C)
```

Shown only when a limit is set. If `card_owed` is negative, available credit is above the limit. That is correct. It is never added to cash you have.

### Period math

This is the only definition of the home number. Widgets must not recompute it with a different formula.

Let P be the current period: payday to the day before the next payday, or the calendar month if no payday is set. A transaction is in P when `occurred_on` falls in P.

```
period_spending(P) =
    sum of expense amounts in P
  − sum of refund amounts in P

period_income(P) =
    sum of income amounts in P

left_against_cap(P) =
    period_cap − period_spending(P)
    only when a cap is set

left_after_income(P) =
    period_income(P) − period_spending(P)
    only when no cap is set and period_income(P) > 0
```

Excluded from both period spending and period income: transfers, card payments, cash advances, ATM moves, opening balances, balance adjustments.

A refund reduces spending in the period it is received, not in the period of the original purchase. It is not income.

Hero selection, in order:

| Condition | Hero label | Hero value |
| --- | --- | --- |
| Cap is set and left_against_cap ≥ 0 | Left this period | left_against_cap |
| Cap is set and left_against_cap < 0 | Over this period | absolute value, spend color, shown with a minus |
| No cap, and period income > 0 | Left after income | left_after_income |
| Otherwise | Spent this period | period_spending. If it is negative, show the credit. Do not hide it as ₹0. |

"Left this period" is never used for left_after_income. "Safe to spend" is never used. Cash you have is a second row. It is never added to the hero, and the hero is never added to it.

Income does not raise a cap. Card purchases reduce left_against_cap and left_after_income. They do not reduce cash you have. Card payments and cash advances change cash you have or amount owed, and do not change period spending.

### Effects by verb

| Verb | Asset account | Credit-card account | Counts as |
| --- | --- | --- | --- |
| Spend | Decreases | Amount owed increases | Period spending |
| Receive | Increases | Discouraged. If forced, amount owed decreases and it still counts as income | Period income |
| Move between assets | Source down, destination up | — | Neither |
| Pay card | Bank decreases | Amount owed decreases, and may become a credit balance | Neither |
| Cash advance | Destination asset increases | Amount owed increases | Neither. A fee is a separate Spend |
| Opening balance | Increases the asset | Increases amount owed | Neither |
| Balance adjustment | Increases or decreases that asset only | Increases or decreases amount owed only | Neither |
| Refund | Increases the asset that was charged | Amount owed decreases if the purchase was on the card | Reduces period spending. Not income |

### Worked example

Start of use, before the period of 7 Sep–6 Oct. These are opening balances, not income: Bank ₹50,000, Cash ₹2,000, card owed ₹0, limit ₹1,00,000. Cash you have ₹52,000. Net worth ₹52,000. Period spending ₹0. Hero: Spent ₹0.

1. Salary ₹80,000 received into Bank on 7 Sep, payment method Bank transfer. Bank ₹1,30,000. Period income ₹80,000. Period spending ₹0. Hero: Left after income ₹80,000. This is not an expense and not an opening balance.
2. Rent ₹20,000 spent from Bank, payment method UPI. Bank ₹1,10,000. Period spending ₹20,000. Hero: Left after income ₹60,000. The UPI app is not an account.
3. Dinner ₹350 spent on the card, payment method Credit card. Bank unchanged. Card owed ₹350. Cash you have unchanged at ₹1,12,000. Period spending ₹20,350. Hero falls by ₹350. Available credit ₹99,650, shown only on the card.
4. ATM ₹5,000 moved from Bank to Cash. Bank ₹1,05,000. Cash ₹7,000. Cash you have still ₹1,12,000. Period spending unchanged. Net worth unchanged.
5. Card bill of ₹350 paid from Bank. Bank ₹1,04,650. Card owed ₹0. Period spending still ₹20,350. If this payment had been a Bills expense, the month would be wrong by ₹350. The button label is Pay card.
6. A ₹350 merchant refund on 10 Sep, on the card, linked or unlinked. Card owed decreases by ₹350 if the bill was not yet paid, or becomes a ₹350 credit balance if step 5 already happened. Period spending falls by ₹350 in the refund's period. Period income does not rise.

Set a cap of ₹30,000 after step 5, before the refund. Hero becomes Left this period ₹9,650 (`30,000 − 20,350`). Income does not raise the cap. Cash you have stays ₹1,11,650 and is not added to the hero.

After the refund, period spending is ₹20,000 and Left this period is ₹10,000. The dinner's original month is not rewritten.

Delete the dinner with Undo, after the card payment exists. The dinner row is removed. The payment remains. Card owed becomes a ₹350 credit balance if the payment is still there. Undo does not delete the payment. The payment detail still says Pay card.

A later balance adjustment of ₹200 less cash, because the user cannot find a missing note, decreases cash and net worth by ₹200. It does not change period spending or period income. The copy must say that. If the ₹200 was a real purchase, the user records a Spend instead.

### Rules the UI must enforce

- A Move needs two different accounts.
- V1 rejects a Move between currencies rather than inventing a rate.
- An account with transactions cannot be deleted. It can be archived. Archiving hides it from pickers and keeps the name on old rows. This is not transaction soft delete.
- The last remaining asset account cannot be archived. Cash can always be recreated.
- Credit limit is optional. If absent, do not show available credit or a utilization percentage.
- Overpaying a card is allowed. The label switches from "You owe" to "Credit balance".
- Each account has at most one opening balance. A second one is refused. Use a balance adjustment.
- Adjust is not a segment on the quick-add sheet. It lives on the account. The daily sheet stays Spend, Receive, and Move.

### Payment methods

Stored values: `cash`, `upi`, `debit_card`, `credit_card`, `bank_transfer`, `wallet`, `cheque`, `other`.

Defaults:

- Cash account → cash.
- Bank account → UPI for the India default. Remember the last legal method per account.
- Credit card account → credit card.
- Wallet account → wallet.

The payment method does not move money. The account does. The method is a label for search and, later, for notification matching. It is not a balance.

---

## 5A. Credit card accounting rules

The UI and the database follow this table. A card purchase is spending. A card payment is not. Available credit is not cash.

| Event | Bank or cash | Card owed | Period spending | Period income | Net worth |
| --- | --- | --- | --- | --- | --- |
| Card purchase | Unchanged | Increases | Increases | Unchanged | Decreases |
| Card refund | Unchanged | Decreases | Decreases, in the refund's period | Unchanged | Increases |
| Pay card bill | Bank decreases | Decreases | Unchanged | Unchanged | Unchanged |
| Card opening balance | Unchanged | Increases by the amount already owed | Unchanged | Unchanged | Decreases |
| Annual card fee | Unchanged | Increases | Increases | Unchanged | Decreases |
| Cash advance | Destination asset increases | Increases | Unchanged | Unchanged | Unchanged |
| Cash-advance fee | Unchanged | Increases | Increases | Unchanged | Decreases |
| Card overpayment | Bank decreases | Decreases, and may become negative | Unchanged | Unchanged | Unchanged |
| ATM, bank to cash | Bank down, cash up by the same amount | Unchanged | Unchanged | Unchanged | Unchanged |
| Opening balance on a bank or cash account | That asset increases | Unchanged | Unchanged | Unchanged | Increases |
| Balance adjustment | Only the chosen account changes | Only if the chosen account is the card | Unchanged | Unchanged | Changes with that account |

### Terms

- **Amount owed.** `card_owed`. Positive means the user owes the issuer. This is the number on the card row.
- **Credit balance.** `card_owed` is negative. The label changes. Do not show "you owe a negative number."
- **Credit limit.** Optional ceiling stored on the account. It is not a balance and not a transaction.
- **Available credit.** Limit minus amount owed, only when a limit exists. Never added to cash you have. Never used as the home hero.
- **Overpayment.** A Pay card transfer larger than amount owed. The extra becomes a credit balance. It is not income.
- **Cash advance.** Move with the card as source and an asset as destination. `transfer_kind = cash_advance`. The button label is Cash advance, not Spend and not Pay card. Net worth is unchanged before any fee. The fee, if recorded, is a Spend on the card in Fees.
- **Annual fee.** An ordinary Spend on the card. It is not a transfer and not an adjustment.

V1 Move kinds are `standard`, `atm`, `card_payment`, and `cash_advance`. The quick sheet uses Pay card when the destination is a card, and Cash advance when the source is a card. It does not add a fifth verb.

---

## 6. Transaction system

### Fields

| Field | Required | Who sets it | Editable | Notes |
| --- | --- | --- | --- | --- |
| id | Yes | System, UUID | No | Client-generated so offline creates never collide. |
| type | Yes | User or parser | Yes, with a warning if effects change | `expense`, `income`, `transfer`, `adjustment`, `refund`. V1 has no pending or void status. |
| amount_minor | Yes | User or parser | Yes | Positive integer. Sign lives in the type. Zero rejected. |
| currency | Yes | Account | No in V1 | Copied from the account at save time. |
| account_id | Yes | User, default visible | Yes | Source for spend and move. Destination for receive and adjustment. |
| destination_account_id | Move only | User | Yes | Null otherwise. |
| category_id | Spend, receive, refund | User or high-confidence parser | Yes | One category. If it has a parent, it is the subcategory. Rollups use the parent. |
| payee | No | User or parser | Yes | List title. "Domino's", "Rent", "Electricity". |
| note | No | User | Yes | Full editor only in the MVP. |
| occurred_on | Yes | User, default today | Yes | Local `YYYY-MM-DD`. |
| occurred_time | No | User | Yes | Local `HH:mm`. Absent is fine. |
| payment_method | No | Defaulted | Yes | |
| adjustment_kind | Adjustment only | System from the Adjust screen | No | `opening_balance` or `balance_adjustment`. Null otherwise. |
| adjustment_direction | Adjustment only | System, or the user for a correction | Yes for a correction | `increase` or `decrease`. Opening balance is always `increase`. |
| transfer_kind | Move only | System from UI | Yes | `standard`, `atm`, `card_payment`, `cash_advance`. |
| source | Yes | System | No | V1: `manual` or `adjustment`. `parser` arrives with Parser V1. |
| linked_transaction_id | No | User, optional on a refund | Yes | Nullable. Not required in V1. |
| created_at | Yes | System UTC | No | |
| updated_at | Yes | System UTC | No | |

Location is not a V1 column. Add it only with an explicit opt-in feature. Attachments are a later table, not a blob on the transaction.

### Editing

All business fields can change. Posting is recomputed. There is no immutable posted period in a personal app; people remember rent two days late. `updated_at` is the only audit in the MVP. A revision table is future work and not worth the complexity until sync exists.

Changing type (spend → move) is allowed from the full editor, with the sentence "This will stop counting as spending." Do not allow type changes from the list swipe.

### Deleting

V1 does not soft-delete transactions. There is no `deleted_at`, no purge job, and no deleted rows in a backup.

Swipe or the detail action removes the row from the database immediately and shows Undo for about five seconds. Undo reinserts that same row from memory. If the app is killed before Undo, the delete stands. No dialog. Dialogs are for restore, erase-ledger, and archive-account.

Soft delete was rejected for V1. Nothing syncs, so a tombstone has no consumer, and a forgotten `deleted_at` filter is how spending gets counted twice or not at all. Undo does not need a column.

Archiving an account is different and stays. Old transactions still need the account's name. That is `archived_at` on the account, not a hidden transaction.

### Duplicating

New id, same economic fields, date set to today, time cleared, source `manual`, no recurring link, no refund link. Opens the editor with those fields rather than saving blindly, because the amount is often the thing that changed.

### Splits

Not in V1. Do not add split columns or split business logic. A later migration can add them. Recording one category per transaction is enough for the first ledger.

### Recurring

This is V3. Do not build the scheduler, pending rows, or reminders in V1. The description is the later contract, not a V1 task.

A rule is a template plus a schedule (monthly on a day, weekly, yearly, every N months for some insurance premiums). It materializes a **pending** transaction on the due date. The user confirms or skips. Auto-post is off unless they turn it on for that rule. Skipping writes nothing. Confirming posts a normal transaction linked to the rule. Editing one occurrence does not edit the rule. Editing the rule asks "only future, or also this pending item?"

### Opening balance and balance adjustment

Both use the user verb Adjust. Reports and the home hero exclude both from income and from spending.

**Opening balance** means "I already had this when I started." It is used once per account. An asset increases. A card's amount owed increases. Direction is always increase. A second opening balance on the same account is refused.

**Balance adjustment** means "the recorded balance is wrong." It is used later. The user chooses increase or decrease. The screen says this will not appear as spending or income. If the missing money was a real purchase, the user records a Spend instead.

### Refunds and reimbursements

A refund is a V1 type, available from the full editor, not from the quick-add segments. It reverses the account effect, requires a category, reduces period spending in the refund's period, and is not income. Linking it to the original purchase is optional.

Reimbursement is not a V1 column and not a V1 screen. When it exists, a settlement is a refund, not income.

### What the list row shows

Title: payee, else category name, else "Transfer" / "Adjustment".
Amount: `−₹350` spend color, `+₹25,000` receive color, `₹5,000` with a move icon in neutral ink for transfers.
Subtitle: category · account · payment method if not obvious.
Pending rows, later, are visually distinct and excluded from posted totals.

---

## 7. Category system

### Design rules

- A short list beats a clever taxonomy. Users can add; they rarely reorganize a 40-item tree on day one.
- "Other" is a real category and a failure signal. It is never the silent default.
- System categories exist for the engine and are hidden from the picker: Transfer, Card payment, Opening balance, Adjustment.
- Archiving hides a category from the picker and leaves history alone.
- Deleting a category that has transactions requires a reassignment. No orphans.
- A category has one kind: expense or income. It is not both.
- Budgets attach to top-level expense categories. Subcategory budgets are out of scope. Spending rolls up.
- Color comes from a fixed accessible palette. Free RGB is out of scope; it fails contrast and makes charts noisy.
- Icon comes from one outlined icon set, same stroke, same size. Emoji are not the system icon. A later option may allow an emoji override; not MVP.

### Default expense categories

Chosen for Indian salaried life and still legible elsewhere. This is intentionally not the generic 12-item list in the brief.

| Category | Children shown after expand | Why it exists |
| --- | --- | --- |
| Food | Groceries, Eating out, Tea & coffee, Delivery | The largest discretionary bucket. Children stop "Food" becoming meaningless. |
| Transport | Fuel, Transit, Auto & cab, Parking & tolls, Maintenance | "Auto" and fuel are not the same decision. |
| Home | Rent, Society & maintenance, Household help, Furnishings | Rent and help are fixed, large, and constantly mis-filed as Other. |
| Bills | Electricity, Mobile & internet, Water, Gas, Other bills | Utilities are not shopping. |
| EMI & loans | Home, Vehicle, Education, Personal, Card charges | Cash that is gone every month. Not a loan-amortization engine. |
| Subscriptions | Streaming, Software, Memberships | So Netflix is not Entertainment one month and Bills the next. |
| Shopping | Clothes, Electronics, General | |
| Health | Pharmacy, Doctor, Insurance, Fitness | Insurance premium is not a doctor visit. |
| Education | Fees, Books & courses | |
| Family & personal | Family support, Personal care, Gifts | Support sent to parents is a first-class outflow. |
| Entertainment | Going out, Hobbies, Games | Eating out stays under Food so the food number stays honest. |
| Travel | Stay, Tickets, Local, Fees & visa | A trip should not permanently distort Transport. |
| Fees | Bank charges, ATM fees, Late fees | Small, easy to miss, useful when people say "I don't know where ₹2,000 went." |
| Other | — | Visible escape hatch, never a default. |

Income defaults: Salary, Freelance, Business, Interest, Gift, Other income. Refund is not in this picker.

Onboarding does not ask the user to prune this list. That is a false chore. Rare categories sit in the "more" grid, not in the quick row.

### How a category is chosen

1. Quick form: preselect last-used expense or income category. The chip is filled and obvious. One tap changes it. Recent and frequent chips sit in a row; the full grid is one tap away.
2. Template: the template's category wins.
3. Parser or future notification: a suggestion chip only if a local rule matches. Empty if not. Save stays disabled until the user accepts the suggestion or picks another.
4. User correction: "Swiggy → Food / Delivery" is stored as a local rule and wins next time, for that user, on that device.
5. Never categorize by uploading the payee to a server.

### Icons and color

Palette of 14 colors tested against both paper backgrounds for graphical objects, plus a label so color is never the only signal. Assignment is automatic at creation and editable. Two categories may share a color; they may not share a name case-insensitively.

### Category budgets

Out of the MVP except the single period cap. When they arrive, a category budget is: category id, amount, period anchor (the same payday anchor as the app), and alert thresholds at 80 and 100, each firing once per period. Uncategorized spending is not silently parked in Other for budget math; it is reported as uncategorized.

---

## 8. Quick add

This is the product. Everything else is a report on whether this stayed fast.

### Target times

- Repeat expense, category already right: under 5 seconds. Amount, glance at the chip, save.
- New kind of expense: under 15 seconds.
- A clear sentence: type, glance at the preview, confirm. Under 10 seconds once the parser exists.
- The common case never pushes a new full screen.

### Method 1 — Quick form

A sheet over Home, amount focused, numeric keypad.

Visible, in order:

1. Spend / Receive / Move
2. Amount, large, with a lightweight calculator (`+`, `−`, `×`) so "340 + 80" does not require leaving the app. Monefy earned this feature by use, not by decoration.
3. Category chips, or the destination account if Move
4. Account chip
5. Date chip, default today
6. Save

Under **Details**, collapsed: description, payment method, time. Description is optional. Save does not require it.

Enter on the amount does not save. A thumb hitting enter should not post a half-typed number. The Save button is the only commit.

Last-used category and last-used account are allowed here because they are visible chips, not hidden assumptions. If the user has one account, it is selected and the chip still shows its name.

Move changes the sheet: From, To, amount, date. No category. The Save label becomes "Move". If the destination is a credit card and the source is a bank, the label becomes "Pay card".

### Method 2 — Natural language

Write mode is V1.1, not V1. Do not add the control to the first binary. When it ships, it is Parser V1 only, as section 33 defines it.

A "Write" control in the sheet switches modes. It does not sit expanded under the form. Two input methods at once is how speed dies.

The user writes:

- `Spent ₹350 on dinner`
- `Paid 1200 for electricity yesterday`
- `Received ₹25,000 salary`
- `₹450 lunch at Domino's`

A preview card shows type, amount, category, description, date, account, payment method, and payee. Each missing required field is a gap chip, not a silent fill.

**Save is disabled until type, amount, and category (for spend and receive) are present.** Account may use the visible default. Date may use today. Description may be empty.

The original sentence is kept in `raw_input`. The list title uses the extracted payee, not the whole sentence.

### Method 3 — Voice

Voice is Parser V3, future. Do not leave a live microphone in the V1 sheet.

A microphone in Write mode. Platform speech-to-text, on device where the OS allows it. Audio is not recorded to a file. The transcript lands in the same text field and runs the same parser. End of speech does not save. If recognition fails, the sheet stays empty of transactions and says "Didn't catch that."

Voice is not in the MVP. The sheet should leave a place for the mic so the layout does not get redesigned later.

### Method 4 — Templates

Chips such as Morning coffee, Rent, Electricity, Mobile recharge, Metro. Seeded suggestions are created only after the user saves a matching transaction, or from an explicit "save as template" action. The app does not ship fake template history.

A template fills amount (editable), category, account, payment method, and payee. Save is still required, so a coffee price change is a one-character edit rather than a wrong row.

### Parser contract

The pipeline below is the full vision. It is not a V1 build list. Phases are in section 33. Parser V1 implements only amount, type, date, category, and payee, for the four example sentences, and it never saves by itself. Do not implement account recognition, lakh and crore, learned rules, Hindi, voice, or notification drafts in that first parser.

Local, deterministic, tested by fixtures. No network. No automatic save, in any phase.

Pipeline:

1. Normalize whitespace and case. Recognize `₹`, `rs`, `inr`, `rupees`.
2. Detect type from words. Spend: spent, paid, bought, pay. Receive: received, got, salary, credited, income. Move: transferred, moved, atm, only if the destination matches an account of the user. "Sent to Rahul" is a spend, not a move. "Sent to my savings" is a move if an account matches savings.
3. Extract amount. First currency-adjacent number wins. Support `1,20,000`, `1200`, `1.2k`, `1.2 thousand`, `2 lakh`, `2.5 lakhs`, `1 crore`. More than one amount (`500 plus 50 tip`, `500 or 600`) does not guess. The preview explains that it found two amounts.
4. Extract date. Today if absent. Yesterday, tomorrow, weekdays, `on 5th`, `5 Sep`. Relative to the phone's local date.
5. Extract account by alias (`hdfc`, `cash`, `icici card`).
6. Extract payment method by rail words. Paytm is UPI unless the matched account is a wallet.
7. Extract payee from a known local merchant list or the leftover noun phrase. Merchant list starts small and local: a few dozen common Indian and global merchants, plus the user's corrections. It is not a scraped directory.
8. Category from user rules, then merchant map, then keyword map (dinner, lunch, petrol, rent, electricity, emi, recharge). Else empty.
9. Confidence is internal. The UI uses it only to decide whether to show a suggestion or a gap. It does not show "87% confident".

### Ambiguity

| Input | Result |
| --- | --- |
| `I spent 500` | Preview: spend, ₹500, date today, account shown, category **missing**. Not saved. |
| `500` | Type and category missing. Not saved. |
| `paid 1200 for electricity yesterday` | Spend, ₹1,200, Bills / Electricity suggested, date yesterday. Confirm saves. |
| `Received ₹25,000 salary` | Receive, ₹25,000, Salary suggested. Confirm saves. |
| `₹450 lunch at Domino's` | Spend, ₹450, Food / Eating out or Delivery if the user has taught Swiggy-like rules; Domino's maps to Eating out, payee Domino's. Confirm saves. |
| `transferred 5000 to savings` | Move if a savings account exists. Otherwise ask which account. Not saved as an expense. |
| `sent 500 to mom` | Spend, Family & personal suggested, payee mom. Not a transfer. |
| `got 200 back from Amazon` | Suggested **refund**, not income. Category from the link if they pick the original; otherwise category required. |
| `2.5 lakh rent` | ₹2,50,000, Home / Rent suggested. The lakh parser is not optional in an India-first app. |

Low confidence never posts. High confidence still requires Confirm in Write mode. The quick form is the only path where Save posts without a preview card, and only because the user filled the form.

---

## 9. Dashboard

### Hierarchy

**Immediately, without scrolling, on a current phone:**

1. The hero number. Either "Left this period", "Spent this period", or, if a cap exists, left against the cap. One number. Serif, large.
2. A context line in smaller ink: spent today, spent this period, income this period. Omit income if none.
3. Cash you have, as a secondary figure, with "Card ₹350 owed" only if a card balance is non-zero.
4. The five most recent posted transactions.
5. A single insight line **only when a condition is true**.

**One tap away:**

- All activity
- Account list
- The period breakdown, once Insights exists
- Add

**Must not appear unless the data exists:**

- Empty goal cards
- Empty budget lectures
- "Connect your bank"
- SMS permission
- Investment rows
- A chart with fewer than two categorized expenses
- Streaks, confetti, or "you're doing great"
- More than one insight

### Hero rules

| User state | Hero | Subline |
| --- | --- | --- |
| No cap, no income this period | Spent this period | "Add income or a spending cap to see what's left." Quiet, not a modal. |
| Cap set | Left of cap | Spent, and the cap. |
| Income and no cap | Income minus expenses | Label it "Left after income", not "Safe to spend". It is not advice. |
| Cap and income | The cap remainder | Income is context, and does not raise the cap. |

Days-left pace ("about ₹640 a day") is a later subline, and only after the period is underway. It is not the hero. Pace as a hero feels like a diet app.

### Insight slot

V1 shows at most one line, and only when it is true. The priority order is in section 33. There is no Insights gallery and no chart in V1. If none of the four lines is true, the slot is not drawn.

---

## 10. Navigation

### Structure

Bottom bar, four destinations plus a center action:

| Place | Job | Why it is here |
| --- | --- | --- |
| Home | The number, the recent list, add | Daily open |
| Activity | The ledger, search, filters | "What was that payment?" |
| Add | Opens the sheet. Not a route that abandons Home | The habit |
| Insights | Breakdown, comparison, and later budgets | Weekly, not every open |
| More | Accounts, categories, backup, settings, later goals | Infrequent and dangerous actions live away from the thumb's daily path |

Budgets do not get a tab. Until category budgets exist, the cap is edited from Home. After they exist, they are a section of Insights. Accounts do not get a tab. They are on Home as "cash you have" and in More.

Goals, recurring, and drafts become rows in More or sections on Home when they have content. They do not earn a permanent tab in advance.

### Why a sheet, not a screen, not a wizard

A full screen costs the feeling of "I'll be back in the app I was just in". A wizard costs fields. A modal dialog cannot hold an amount keypad honestly.

- Sheet: amount, category, account, date, save. Home remains underneath.
- "More details" or an existing transaction opens the full editor.
- Write mode is the same sheet, swapped contents, not a second product.
- The center control is a button, not a tab. Tabs imply a place. Adding is an act.

Desktop-style navigation drawers hide the daily action. Top tabs compete with the system status bar and do not fit five concepts. A 6-item bottom bar (the brief's Home / Transactions / Add / Budgets / Analytics / Accounts set) would make every item equally important, which is how Wallet becomes heavy and how a new user gets lost.

### Stacks

Each tab keeps its own stack. Editing a transaction from Home returns to Home. Editing from Activity returns to Activity. Restore and backup flows are pushed on More, never as a surprise from Home.

---

## 11. Design system — Paper & Ink

### Philosophy

A well-printed cashbook, not a crypto dashboard and not a candy tracker. Numbers are the interface. Space is part of the trust: a finance app that crowds the screen looks like it is hiding the fee. Motion is short and physical. Nothing bounces. Nothing celebrates a purchase.

The system is named Paper & Ink so implementation has a reference other than "modern".

### Typography

- UI and tables: **IBM Plex Sans**, bundled, tabular figures for every amount. It has a rupee-capable Latin set and a Devanagari companion for a later Hindi UI, under an open license.
- Hero amounts only: **Literata**. A serif on the one number you opened the app to see. Not on buttons, not on charts.
- If the user's text size would clip the hero, the hero falls back to Plex Sans. Do not shrink below a readable minimum and do not truncate an amount with an ellipsis. Ever.

| Role | Size | Weight |
| --- | --- | --- |
| Caption | 12 | 400 |
| Body | 14–16 | 400 |
| Transaction title | 16 | 500 |
| Section | 13, tracking slight, ink secondary | 500 |
| Sheet amount | 36–44 | 500 |
| Hero | 40 | 450 serif |

Minimum touch label 14. System text scaling supported up to 200%. Layouts wrap. They do not overlap.

### Space

4-point scale: 4, 8, 12, 16, 24, 32, 48. Screen edge 20. Card padding 16. Gap between list rows 0, with a 1px rule, not a stack of separated cards. Cards are for the hero and the sheet, not for every transaction.

### Radius

12 on cards, 10 on inputs, full capsule on chips, 16 on the top of sheets. Not 28 on everything.

### Color

Light:

| Token | Value | Use |
| --- | --- | --- |
| paper | `#F6F4EF` | Background |
| paper-elevated | `#FFFcf7` | Sheet, hero card |
| ink | `#1C1915` | Primary text |
| ink-secondary | `#6B645C` | Context |
| line | `#E6E1D8` | Rules, borders |
| accent | `#1F4D3A` | Primary button, links, focus |
| accent-ink | `#F6F4EF` | Text on accent |
| spend | `#9C3B2E` | Outgoing amounts |
| receive | `#1F6B4A` | Incoming amounts |
| move | `#3D5A73` | Transfers |
| warning | `#8A5A12` | Gaps, approaching cap |

Dark:

| Token | Value |
| --- | --- |
| paper | `#141311` |
| paper-elevated | `#1E1C19` |
| ink | `#F3EFE7` |
| ink-secondary | `#B7AFA4` |
| line | `#2C2925` |
| accent | `#8FCBB2` |
| spend | `#E08A7A` |
| receive | `#7DCEA8` |
| move | `#A9C0D4` |
| warning | `#E0B15A` |

No purple gradient, no neon green, no full-row red background for an expense. Spend color is for the amount and, sparingly, an icon. Category colors appear in the picker and in Insights, not as Home wallpaper.

Contrast target is WCAG AA for text. Do not communicate spend versus receive by color alone; the sign and the verb are always present.

### Components

- **Primary button.** Height 48, filled accent, one per screen. Label is a verb: Save, Move, Pay card, Restore.
- **Secondary.** Text button, ink, no border soup.
- **Destructive.** Text in spend color until the confirm step. Not a red button sitting next to Save.
- **Amount field.** Largest control in the product. No floating label inside it. Currency symbol is a prefix, not a placeholder that disappears.
- **Chips.** Height 36 minimum, 40 preferred. Selected state is ink fill, not a rainbow.
- **List row.** Height at least 64. Icon, title, subtitle, amount. No nested card.
- **Sheet.** Top radius 16, grabber, scrim 40% ink. Sticky Save above the keyboard.
- **Dialog.** Used for restore, erase, and archive. Title, one sentence, cancel, confirm. No illustration.
- **Snackbar.** Undo only. One line.
- **Banner.** For missing category or a failed restore. Sits in the sheet. Not a toast the user can miss.
- **Progress track.** 4px, rounded, accent on paper. For caps later. No gauge needles.
- **Charts.** Horizontal bars. Direct labels. No pie on Home. No 3D, no gradient fills, no legend that requires a hunt. A data table is the accessible alternative, not a hidden extra.

### Iconography

One outlined family, 24px, consistent stroke. Material Symbols Outlined is acceptable if the weight is locked and filled icons are not mixed in. A custom set can replace it later without changing layout. The app icon is a paper square with a simple open-book mark: two rules and a corner. No rupee sign, no coin, no piggy bank, so the mark is not country-locked and not cute.

### Voice of the interface

Calm clerk. Short. Specific. No "Oops", no "Let's crush your goals", no "Uh oh, you overspent!"

| Moment | Copy |
| --- | --- |
| Empty ledger | "Nothing recorded yet." Action: "Add an expense" |
| Missing category | "Pick a category to save this." |
| Saved | Snackbar: "Saved ₹350 to Food." Undo. |
| Deleted | "Expense deleted." Undo. |
| Cap reached, later | "Food is at its limit for this period." |
| Parser gap | "Add a category to save this." |
| Two amounts | "This has two amounts. Keep one, or split it later from the editor." |
| Backup warning | "This file contains your transactions. Anyone who can open it can read them." |

### Empty, loading, error, confirm

- **Empty** is one sentence and one action. No stock illustration scene.
- **Loading** of local data should be rare. If a list is rebuilding, use skeleton rows in the paper color, not a centered spinner. Spinners are for export and restore, which touch the filesystem.
- **Error** says what failed and what to do. "Couldn't write the backup. Free some space and try again." Never a stack trace, never "Error 14".
- **Confirm** is reserved for operations that destroy or replace: restore, erase all data, archive an account. Saving a transaction is not a confirm.

---

## 12. Themes

- Light, Dark, System. Default System.
- Dark is a real palette, not an inverted light theme. Paper stays warm, not blue-black.
- Category colors are remapped only if a specific palette entry fails contrast on dark. Do not let users pick arbitrary colors in V1.
- Accent customization: a later choice among about six pre-tested pairs. Not a color wheel.
- Density: later, comfortable and compact. Comfortable is the only density until the list is proven.
- Icon style packs: not worth implementing. One style is the brand.

Theme is a setting, applied immediately, stored locally, included in backup.

---

## 13. UX details and edge cases

### First launch

No splash theater beyond the app icon. No account wall. Three skippable steps, each one screen, each with a visible Skip:

1. **Money.** "We'll use rupees." Preview of the grouping. Change currency here. After the first transaction, currency is locked. Changing it would rewrite the meaning of every integer. The escape hatch, later, is a new ledger, not a silent conversion.
2. **Payday.** "When does your month start?" Day of month, or "No fixed payday". Skip means calendar month.
3. **Accounts.** Cash is created if they continue. Optional bank name. Copy under the bank field: "UPI and debit cards spend from this account. They are not separate accounts." No card required. No SMS. No email.

A one-line disclaimer in About, and a smaller one on step 1: Daybook keeps records. It does not give financial, tax, or credit advice, and it does not move money.

### First transaction

A single coach on the amount field: "Enter what you just spent." Dismissed by typing or by skipping. Never shown again. No sample transactions.

### Empty states

| State | Behavior |
| --- | --- |
| No transactions | Hero is "Spent ₹0". Recent list is the empty sentence. Not a chart. |
| No extra accounts | Legal. Cash alone is a valid ledger. |
| No custom categories | Defaults exist, so this state should be unreachable. If defaults fail to seed, block Add and offer "Restore categories". |
| No cap | Hero follows D-13. No empty budget card. |
| Search miss | "No transactions match." Clear filters. |
| Insights before data | "Record a few expenses and this page will show a breakdown." No fake chart. |

### Editing and deleting

Detail screen shows every stored field in plain language, including source ("Added by you", later "From a template", "From a written note"). Edit opens the full editor. Delete undoes via snackbar.

### Search, filter, sort

MVP search is a text field over Activity. Filters: this period, type, category, account. Sort: newest first by default, oldest, largest amount. Sort and filter are a sheet, not a second page with 20 dropdowns.

### Errors

- Amount with more than two decimal places: "Use at most two decimal places." Do not round silently.
- Move to the same account: inline, Save disabled.
- Disk full on backup: the sentence above, no partial file left behind.
- Restore checksum failure: "This file is damaged or not a Daybook backup." Do not import half of it.
- Future date beyond a year: allow, but ask once. People post annual insurance early; do not forbid it.

### Offline

There is no offline banner in the MVP, because offline is the normal state. A banner would imply a degraded mode. If a future feature needs the network, that feature's screen says so. The rest of the app does not.

### Backup, restore, updates

- Backup writes a full file through the system share or save sheet. The user chooses the folder.
- Before a schema migration on app update, write a local safety copy automatically and keep the last two.
- Restore shows date, app version, and counts of accounts and transactions. Requires an explicit confirm. Takes a safety backup of the current ledger first.
- What's new is a short sheet only when behavior the user can see has changed. Not a release-notes blog.

### Other edges

- Forgotten PIN: recovery code shown once at setup, or erase the ledger. No email reset. Say this in the setup sentence.
- Shared phone: app lock is the answer, not a second profile. Profiles are out of scope.
- User archives the account that still has the cap: cap remains. It is not tied to an account.
- Timezone travel: `occurred_on` does not move. "Today" is the phone's current local date at the moment of save.
- Duplicate tap on Save: the button disables on first accept. One row.

---

## 14. Privacy

Privacy is the architecture, not a settings paragraph.

### Never leaves the device unless the user performs an explicit export, share, or a future opt-in sync

- Transactions, amounts, payees, notes, categories, accounts, budgets, goals
- Raw parser input
- Notification text, if that feature ever exists
- Voice audio (it should not be stored even locally)
- Attachments
- Location, if it ever exists
- PIN, recovery code, database key

### Not collected, because there is no account

Name, email, phone number, contacts, SMS history, bank credentials, device advertising id.

### Telemetry

None in the first versions. Play Console install statistics are enough. If crash reporting is ever added, it is opt-in, it is not on by default, and the pipeline strips amounts, notes, payees, and account names before anything is sent. No exception is worth a merchant name in a vendor dashboard.

### Permissions

MVP requests none. Notification permission is asked only when the user enables a reminder, later, with a one-sentence reason. Biometric is asked only from the app-lock setting. Notification listener is a future dedicated screen, not a permission buried in onboarding.

### Deletion

"Erase ledger" deletes the database, templates, rules, backups in app storage, and secure-storage secrets. It does not recall a file the user already saved to Drive. The confirm copy says that.

### Future cloud

If it exists, the server stores ciphertext the server cannot read, or the file lives in the user's own Drive or disk, Monefy-style. A Daybook account that can read the user's rent is a different product and requires a new decision, not a quiet addition.

### Regulatory posture

Design for purpose limitation: collect the minimum, use it for the ledger, delete it when asked. This matches the direction of India's Digital Personal Data Protection Act without claiming a legal certification in the app. A privacy policy is required before any public store listing, even if the policy's main sentence is "we do not run a server."

---

## 15. Offline-first architecture

The repository layer has no network client. Features that do not need the network are not allowed to import a connectivity library.

| Always local | Needs a network, later, and still optional |
| --- | --- |
| Create, edit, delete, balances | Live FX rates |
| Categories, caps | Account Aggregator |
| Search and filters | Optional encrypted sync |
| Parser and templates | Cloud assist parser, if ever |
| Insights | Nothing in insights requires it |
| JSON backup to a file the user holds | A hosted backup |
| App lock | Account recovery |
| Notifications scheduled on device | Push marketing, which we will not send |

Speech recognition may use an OS service that is on-device or OS-managed. Daybook still does not run its own backend for it. If the recognizer needs a network and fails, Write mode still accepts typing.

There is no sync queue in the MVP, because there is nothing to sync. Do not build an outbox "for later" that has no consumer.

---

## 16. AI features

Useful means it changes capture speed or a money decision. Complexity is engineering and ongoing rule maintenance, not model glamour. Privacy risk is about data leaving the device or being stored longer than needed.

| Feature | Usefulness | Complexity | Privacy | Version |
| --- | --- | --- | --- | --- |
| Deterministic language parser | High | Medium | None, if local | First enhancement after MVP |
| Voice into that parser | Medium | Low, if the OS recognizes speech | Low, if audio is not stored | After the parser |
| Local category rules from corrections | High | Medium | None | With the parser |
| Templated period summary ("Food was ₹4,200, up ₹800") | High | Low | None | Insights phase |
| Budget recommendation | Low | Medium | Low locally, high if a model sees history | Postpone. Easily becomes fake advice |
| Anomaly alerts | Medium, and noisy | Medium | Low locally | Only after three periods of data, and only as an in-app line at first |
| Natural-language questions ("Swiggy this month") | Medium | Medium if compiled to filters | None if local | After filters are solid |
| Cloud LLM parse or chat | Low incremental value over rules for this domain | High | High | Not in this roadmap unless rules demonstrably fail |
| Receipt OCR | Medium | High | High if a vision API sees the receipt | Not planned. A photo attachment later is enough |
| Spending coach chatbot | Low | High | High | Not worth implementing. Regulated-advice risk, and the tone fights the product |

The parser is specified in section 8. It is the only "intelligent" capture in the near roadmap, and it is not marketed as AI. If the word AI appears in the store listing before a feature truly uses a model, that is a product bug.

A future cloud parser, if it is ever justified, must:

- Be off by default
- Show the exact text that will be sent, before the first send
- Send that text to a Daybook-controlled endpoint, not a key embedded in the binary
- Refuse to send if the user is only trying to save a manual form
- Be swappable behind a `TransactionParser` interface whose default implementation is the local rules engine

---

## 17. Analytics

Compute on the device from posted transactions. V1 has no pending or void rows. Transfers, card payments, cash advances, and adjustments do not count as spending or income. Refunds reduce spending. There are no split children in V1.

### Worth building

| View | Question it answers | When |
| --- | --- | --- |
| Spent, income, left | "How is this period going?" | MVP, on Home, not as a chart |
| Category bars, top 5 plus Other | "Where did it go?" | Insights phase, hidden until there is data |
| This period versus last period, one pair of totals and the top category delta | "What changed?" | Insights phase |
| Largest five transactions | "What were the spikes?" | Insights phase |
| Daily totals for the period | "Which days ran hot?" | Insights phase, a simple bar row |
| Fixed versus flexible, once recurring exists | "How much was already committed?" | Automation phase |
| Cap used | "Am I near the line?" | With category budgets |

### Not worth building

Net-worth sparklines before investments exist, forecast cones, heatmaps, gauge meters, 3D pies, per-merchant leaderboards that shame, gender or peer comparisons, "financial health scores". A score implies advice and a formula the user cannot see. If a number cannot be explained in one sentence from the ledger, it is not shown.

Month-over-month is a comparison of two periods, not a 12-month chart on day one. A 6-month trend can come after people have 6 months of data. Do not show a chart that is mostly empty axes.

---

## 18. Search and filtering

### MVP

- Text match on payee, note, category name, account name
- Exact amount match when the query is numeric (`500` finds ₹500.00, not ₹1,500)
- Filters: period, type, category including its children, account, payment method
- Sort: date, amount
- Combine with AND

### Later query phrases

These compile to the same filter model. They are not sent to a model.

| Query | Filter |
| --- | --- |
| food | Category Food and children |
| ₹500 | Amount equal |
| last month | Previous period, respecting payday |
| Amazon | Payee contains |
| cash expenses | Account type cash, type expense |
| expenses above ₹1000 | Type expense, amount greater than |
| transport this month | Category plus current period |
| upi | Payment method |

Implementation note: start with indexed columns and `LIKE` for short lists. Add FTS5 when notes get long, not before, unless it is cheap at schema creation. A personal ledger stays well under 100,000 rows for a decade. Do not build a search service.

Saved filters are nice to have, later. The recent-search list is local and clearable.

---

## 19. Export, backup, sync, restore

| | Export | Backup | Restore | Sync |
| --- | --- | --- | --- | --- |
| Purpose | Read in a spreadsheet | Disaster recovery | Replace or merge from a backup | Keep two devices current |
| Fidelity | Lossy on purpose | Full | Full | Full, with conflict rules |
| Format | CSV | JSON with schema version and checksum | Reads that JSON | Does not exist yet |
| Includes settings, rules, ids | No | Yes | Yes | — |
| MVP | Yes | Yes, local file | Yes | No |

CSV columns: date, time, type, amount, currency, account, destination account, category, parent category, payee, note, payment method, status. Amounts in major units with a dot decimal, so spreadsheets open them. A note in the header says grouping is not Indian in the CSV decimal sense, to avoid `1,20,000` being split into columns.

JSON backup:

- `format: daybook-backup`
- `schemaVersion`
- `exportedAt`
- `appVersion`
- settings, accounts, categories, transactions, and later rules
- SHA-256 of the canonical payload

The V1 JSON file is not encrypted. Say that in the share sheet, in the words of section 11: anyone who can open the file can read the transactions. Do not imply a lock. Passphrase encryption is future, and it must exist before any upload convenience. A false lock is worse than a clear warning.

Restore validates the checksum and the schema before it writes anything. If either fails, it imports nothing, shows "This file is damaged or not a Daybook backup.", and leaves the current database unchanged. There is no partial import.

Restore does not merge in V1. It replaces the ledger only after validation succeeds, and only after a safety copy of the current ledger. Merge is how rent gets recorded twice.

Cloud sync is future and must not be implemented. When it is designed, it needs its own conflict rules. V1 does not keep deletion tombstones for that future.

---

## 20. Notifications

Local only. No push token. No marketing.

| Notification | Default | Rule |
| --- | --- | --- |
| Recurring item due | Off until they create a rule, then on for that rule | One notification on the morning of the due date. Confirm in app. |
| Cap at 80% and at 100% | Off until a cap exists, then on | Once per period per threshold. Not on every later expense. |
| Upcoming bill | Same as recurring | One day before, only if they asked |
| Period summary | Off | One line on payday morning, in-app first. Notification only if enabled. |
| Goal milestone | Off | Later. Once at 50 and once at 100. |
| Unusual spend | Off | Do not ship until anomaly detection is trusted. |
| "You haven't opened the app" | Never | This is spam. |
| Per-transaction mirror of SMS | Never | This is how notification capture becomes a second inbox. Drafts wait quietly in the app. |

A notification deep-links to the relevant row or review queue. It does not contain the payee in the lock-screen text if the OS preview cannot be controlled; use "A bill is due" rather than "Rent ₹20,000" on the lock screen. Amounts on lock screens are a privacy bug.

---

## 21. Accessibility

- Text contrast AA on paper and on accent buttons.
- Amounts have screen-reader labels: "Spent 350 rupees, Food, today, HDFC Salary." Not "minus two three five zero".
- Touch targets at least 48 by 48 dp. Chips included.
- System font scaling to 200% without clipped amounts.
- Spend and receive are signed and labeled, not only colored.
- Charts have a text table alternative on the same screen, not behind a hidden gesture.
- Focus order in the sheet is amount, category, account, date, save.
- Reduce-motion: sheet appears without the slide.
- No information that exists only in a placeholder that disappears.
- Haptics on save are optional and default subtle. Not required to understand success; the snackbar is.

The serif hero is a visual choice. The accessibility tree ignores the typeface.

---

## 22. Security

| Surface | MVP posture |
| --- | --- |
| Database | App-private storage. Not a claim of encryption. |
| Android Auto Backup | Excluded for the database and backup directory. |
| App lock | Optional PIN, hashed, rate-limited locally. Biometric unlocks the same gate and is not the only factor; PIN remains the fallback. |
| Recovery | Code shown once, hash stored. No server. |
| Forgotten PIN and recovery code | Data stays locked behind the gate, with an erase path. Do not add a hidden bypass. |
| Encryption at rest | Before cloud backup or notification capture. Key in the platform keystore. PIN and recovery code wrap access. Until that ships, do not market encryption. |
| Exports | Unencrypted by design in the MVP, with a warning. |
| Logs | No amounts, payees, notes, or raw parser input in logs. |
| API keys | None in the binary. None in the repo. A future proxy holds provider secrets. |
| Screenshots | Allow them. Blocking screenshots frustrates people who keep records and does not stop a determined copy. App lock is the control. |
| Rooted devices | No custom detection theater. It does not meaningfully protect a local ledger. |

Dependency rule: no advertising SDK, no social SDK, no analytics SDK in the MVP. Review new native plugins as if they were permissions.

---

## 23. Technical architecture

### Recommendation

Flutter and Dart, current stable channel at implementation start. Android minSdk 26. iOS can follow from the same codebase once the Android ledger is trusted; do not maintain two capture implementations.

**State and dependency injection: Riverpod.** It is testable without a widget tree, it scopes well, and it is enough DI for this app. Do not add GetIt beside it. Do not use GetX. Do not start with a code-generated Riverpod style unless the team already prefers it; hand-written providers are easier to debug in a first build. Bloc would also work, and it is more ceremony than this product needs.

**Database: Drift on SQLite.** The ledger is relational. Reports are joins and aggregates. Migrations are inevitable. SQLite is the most understood embedded database available, and Drift gives type-safe queries and a migration story. Hive is a key-value store and will hurt the first time a category total is needed. Isar's original maintenance story is a reason not to bet a multi-year ledger on it. ObjectBox is unnecessary speed for tens of thousands of rows.

**Navigation: go_router** with a stateful shell for the four tabs. The Add sheet is an overlay controller, plus a `/add` route reserved for a future widget.

**Structure:** feature folders, not a premature package split.

```
lib/
  app/            bootstrap, router, theme
  core/           Money, LocalDate, errors
  data/           Drift database, mappers
  features/
    ledger/       posting rules, transaction repository
    accounts/
    categories/
    capture/      sheet, parser, templates
    home/
    activity/
    insights/
    backup/
    settings/
```

The posting rules are pure functions. Widgets do not compute balances. Repositories do not decide hero-number policy. A small `PeriodSummary` use case does, so the hero cannot drift from Insights.

### Money and dates

`Money` is `amountMinor` plus ISO currency code. Formatting is a dedicated function with tests for Indian grouping, hidden trailing paise, and signs. `LocalDate` is a year-month-day value object. Do not pass `DateTime` through the ledger layer; it will be converted wrongly exactly once, in production.

### Parser boundary

```
TransactionParser.parse(String, ParseContext) -> ParseResult
```

`RulesTransactionParser` is the implementation. `ParseContext` carries account aliases, category rules, and today's local date. Tests feed fixtures. UI tests do not reimplement the grammar.

### What not to build

A domain-driven folder for every noun, a freezed class for every row, a remote data source with a fake API, feature flags as a service, or a CQRS bus. One database, one posting module, one sheet.

### Testing bar before any release

- Posting invariants, including the worked example in section 5
- Payday period boundaries, including day 31 and February
- Parser fixtures, including lakh, crore, two amounts, and "sent to mom"
- Formatter fixtures for ₹ and grouping
- Backup round-trip: write, checksum, restore into a fresh database, balances match
- Widget test only for the sheet's disabled-save rule

That set is the release gate. Golden screenshots can wait until the visual system has survived one redesign.

---

## 24. Data model

### Relationships

- An **Account** has many transactions as source, and many as transfer destination.
- A **Category** may have one parent category. A transaction points at one category, which may be a child.
- A **Transaction** may optionally link to another as a refund. Splits are not in the V1 schema.
- **Settings** is a single row.
- **Category rules** and **templates** and **recurring rules** are later tables. Reserved columns on transactions let those tables arrive without rewriting history.
- Tags, attachments, merchants, notifications, and goals are later entities. They are not empty tables in V1.

Transactions are hard-deleted. Accounts and categories use `archived_at` so history keeps a name. Erase-ledger deletes the database file. There is no transaction purge job, because there is nothing to purge.

### V1 tables

**accounts**

| Column | Type | Notes |
| --- | --- | --- |
| id | text pk | UUID |
| name | text | |
| type | text | `cash`, `bank`, `wallet`, `credit_card` |
| bank_subtype | text null | `savings`, `current` |
| currency | text | ISO, locked to home currency in V1 |
| credit_limit_minor | integer null | |
| include_in_spendable | int | 0/1 |
| include_in_net_worth | int | 0/1 |
| icon | text | |
| color | text | palette id, not raw hex from the user |
| display_order | int | |
| is_primary | int | |
| archived_at | int null | epoch ms |
| created_at, updated_at | int | |

**categories**

| Column | Type | Notes |
| --- | --- | --- |
| id | text pk | |
| name | text | |
| kind | text | `expense`, `income`, `system` |
| parent_id | text null | fk categories |
| icon | text | |
| color | text | |
| sort_order | int | |
| is_default | int | |
| archived_at | int null | |
| created_at, updated_at | int | |

**transactions**

Columns as in section 6. Foreign keys to accounts and categories. `destination_account_id` and `category_id` nullable. Check constraint in the repository, not only the UI:

- amount_minor > 0
- expense and income require category_id and null destination
- transfer requires destination and null category
- adjustment requires null category and null destination
- refund requires category_id

**user_settings** (one row)

home_currency, number_format (`indian` or `international`), first_day_of_week, payday_mode (`none` or `day_of_month`), payday_day, theme, app_lock_enabled, biometric_enabled, primary_account_id, last_account_id, last_expense_category_id, last_income_category_id, period_cap_minor null, show_paise, created_at, updated_at.

PIN hash and recovery hash are not in this table. They live in platform secure storage.

### Indexes

- transactions (occurred_on)
- transactions (account_id, occurred_on)
- transactions (destination_account_id)
- transactions (category_id, occurred_on)
- categories (parent_id)
- categories (kind, archived_at)

### Later tables, not created yet

- `templates` — name, prefilled fields, use_count, last_used_at
- `category_rules` — normalized pattern, category_id, priority, source (`system` or `user`)
- `recurring_rules` — template fields, schedule, next_due, auto_post, enabled
- `attachments` — transaction_id, local relative path, mime, created_at
- `goals` — name, target_minor, target_date, linked_account_id null
- `tags`, `transaction_tags`

### ER, in words

Settings stands alone and points at a primary account. Accounts and categories are dimensions. Transactions are the fact table. A transfer transaction references two accounts. A category tree is one level deep in the product, even if the foreign key would allow more; the app rejects grandchildren. A refund may reference one original. Nothing references the user, because there is no user row. There is no split parent in V1.

---

## 25. Version roadmap

Phases are release trains, not a promise of dates. A phase does not start by pulling in the next phase's UI "while we're here".

### V0 — Foundation

App shell, Paper & Ink tokens, router, Drift, `Money`, `LocalDate`, empty states, no feature depth. Proves the project builds offline and the hero number can render ₹12,34,567.

### V1 — MVP ledger

The must-have list in section 26. This is the first version a person can keep.

### V1.1 — First parser

Parser V1 only: the four example sentences, amount, type, date, category, and payee, review preview, no autosave. Templates may ship here. This is not an AI version, and it is not the full parser.

### V2 — Picture

Category budgets, the small Insights set, period summary in the app, cap notifications, calendar grid, richer filters.

### V3 — Automation

Recurring rules, reminders, refunds UI, splits, receipt photo attachment, tags, reimbursement status surfaced.

### V4 — Reach

Android home-screen widget, voice into the parser, optional notification-draft capture behind the rules in section 4. Database encryption before notification capture ships.

### V5 — Wider books

Goals, loan account type, subscription view over recurring, manual multi-currency with a user-entered rate, passphrase-encrypted backup file.

### V6 — Custody across devices

Optional encrypted backup to a place the user controls. No mandatory account. Conflict policy written before code. Excel export if CSV has proved insufficient. Hindi UI if the strings stayed clean.

### V7 — Questions

Local natural-language filters ("transport this month"). Templated insights that mention merchants only from the local ledger. Still no advice chatbot.

### Not scheduled

Account Aggregator partnership, shared ledgers, investment quotes, any credit product, cloud LLM.

The brief's sketch put smart input at V3 and automation at V4. That order was adjusted. A fast honest ledger without a parser is already useful, so the parser must not block V1. A parser buried behind budgets and charts wastes the thing this product can be known for. Recurring matters, and it is still correctly after the picture of a month, because reminders without a month of trust are noise.

---

## 26. MVP definition

The smallest version that already feels like a real ledger, not a demo.

### Must have

- Onboarding as specified, skippable, no account, no sample data
- Cash, bank, wallet, and credit card accounts
- Spend, Receive, Move, Pay card, opening adjustment
- Derived balances, net worth available on the accounts screen, cash-you-have on Home
- Default categories, custom categories, archive, color, icon
- Quick-add sheet with calculator, visible defaults, details collapsed
- Activity grouped by date
- Edit, hard delete with in-memory Undo, duplicate into the editor
- Search by text and exact amount
- Filters: period, type, category, account
- Home hero obeying D-13 and D-14
- Optional period cap, skippable
- Light, dark, system
- Indian formatting by default, international grouping as a setting
- Payday setting
- CSV export
- JSON backup and restore with checksum and a safety copy
- App lock PIN with recovery code, honest copy about what it does not encrypt
- Auto Backup exclusion
- Empty, error, and undo states
- Posting and formatter tests
- Fully usable in airplane mode

### Not in V1, even if they are next

- Templates and Write mode: V1.1
- Biometric unlock: may follow app lock, still not required for V1 honesty
- Haptic on save: optional, not a release gate

### Could have

- One category bar chart
- A home-screen widget
- Voice

### Future

Everything in V2 and after.

### Explicitly not in the MVP, even if a competitor has it

Bank sync, SMS, goals, recurring scheduler, splits, photos, tags, multi-currency engine, shared wallets, investments, accent themes, cloud login, insights gallery.

If the MVP schedule slips, cut the cap before cutting transfers, credit cards, backup, or the disabled-save rule. A pretty remaining number on false books is the failure mode this plan exists to avoid.

---

## 27. Feature priority matrix

User value, complexity, and privacy risk are Low, Medium, or High. Priority is the class from section 2. Version is when it ships, not when the column is reserved.

| Feature | User value | Complexity | Privacy risk | Priority | Version |
| --- | --- | --- | --- | --- | --- |
| Spend / receive | High | Low | Low | Essential | V1 |
| Transfers and card payments | High | Medium | Low | Essential | V1 |
| Credit card liability | High | Medium | Low | Essential | V1 |
| Multiple accounts | High | Medium | Low | Essential | V1 |
| Categories, custom | High | Low | Low | Essential | V1 |
| Quick form | High | Medium | Low | Essential | V1 |
| Home hero with honest rules | High | Medium | Low | Essential | V1 |
| Search and basic filters | High | Low | Low | Essential | V1 |
| CSV export | High | Low | Medium, the file is sensitive | Essential | V1 |
| Local backup and restore | High | Medium | Medium | Essential | V1 |
| Themes | Medium | Low | Low | Essential | V1 |
| App lock | Medium | Medium | Low | Essential | V1 |
| Optional period cap | High | Low | Low | Important | V1 |
| Subcategories, collapsed | Medium | Low | Low | Important | V1 |
| Templates | High | Low | Low | Important | V1.1 |
| Parser V1: amount, type, date, category, payee | High | Medium | Low | Important | V1.1 |
| Parser V2: accounts, Indian amounts, learned rules | High | Medium | Low | Important | V2 |
| Learned local rules | High | Medium | Low | Important | V2 |
| Category budgets and alerts | High | Medium | Low | Important | V2 |
| Useful charts and comparison | High | Medium | Low | Important | V2 |
| Calendar grid | Medium | Medium | Low | Important | V2 |
| Structured search phrases | Medium | Medium | Low | Important | V2–V7 |
| Recurring and reminders | High | Medium | Low | Important | V3 |
| Refund posting | High | Medium | Low | Essential | V1 |
| Splits and reimbursement UI | Medium | Medium | Low | Important | V3 |
| Attachments | Medium | Medium | Medium | Nice | V3 |
| Tags | Medium | Low | Low | Nice | V3 |
| Widgets | Medium | Medium | Low | Important | V4 |
| Voice | Medium | Low | Medium | Nice | V4 |
| Notification drafts | High for some | High | High | Advanced | V4 |
| Goals | Medium | Medium | Low | Nice | V5 |
| Manual multi-currency | Medium | High | Low | Important | V5 |
| Encrypted backup file | High | High | Low if done right | Important | V5 |
| Loan accounts | Medium | High | Low | Advanced | V5 |
| User-controlled file sync | Medium | High | High | Advanced | V6 |
| Hindi UI | Medium | Medium | Low | Important | V6 |
| Local question queries | Medium | Medium | Low | Nice | V7 |
| Account Aggregator | High for some | High | High | Advanced | Unscheduled |
| Shared finances | Medium | High | High | Advanced | Unscheduled |
| Investment quotes | Low for this product | High | Medium | Not worth it | — |
| Lending or bill pay | Negative | High | High | Not worth it | — |
| Cloud chatbot | Low | High | High | Not worth it | — |
| READ_SMS inbox | Medium | High | High | Not in this plan | — |
| Context wallets | Low | Medium | Low | Not worth it | — |
| Accent and icon packs | Low | Low | Low | Not in V1 | Maybe never |

Privacy risk "Medium" on export and backup means the artifact is sensitive, not that the feature is untrustworthy. The mitigation is a warning, a checksum, and no silent upload.

---

## 28. User journeys

### New user

Install. Open. See rupees and a grouping preview. Accept. Skip payday or set the 7th. Keep Cash, add "HDFC Salary". Land on Home. Hero is "Spent ₹0". Tap Add. Type 350. Category chip shows the default first category; they tap Food. Account shows Cash; they switch to HDFC if this was UPI. Save. Snackbar confirms. Home shows Spent ₹350, cash you have reduced or unchanged depending on the account, and one row. No permission dialog occurred. No account was created. They can force-quit and the row is still there.

### Daily user

Open. The hero is the only thing they need if a cap exists. Tap Add. Amount is focused. Last category is Food from yesterday; today is Transport, so they tap Transit. Save. Under five seconds. They leave. They do not visit Insights. That is a successful session.

### Budget user

After a week, they set a cap of ₹30,000 from Home. The hero switches to left-of-cap. Card dinners reduce it; ATM withdrawals do not. At 80%, one local notification fires if they allowed it, and the insight line appears. They tap it, see Food as the large bar (V2) or the filtered list (V1), and decide. The app does not raise the cap for them and does not scold them at 101%. The number simply goes negative in the spend color: "₹400 over".

### Analytics user

Open Insights. See top categories as bars, this period versus last, and the five largest rows. Tap Food. Land in Activity filtered to Food. Tap a Swiggy row. Edit the category to Delivery. Return. The bar has moved. They learned something they can act on: delivery, not "food" in the abstract. If they have fewer than a handful of expenses, they never see an empty dashboard of charts.

### Capture user

Tap Add, then Write. Type `Paid 1200 for electricity yesterday`. Preview shows spend, ₹1,200, Electricity, yesterday, HDFC, UPI. They confirm. Or they type `I spent 500`. Preview shows the amount and a gap. The confirm button is disabled. They tap Food. Then it saves. They never have to delete a guessed transaction, because none was written.

Voice, later, is the same journey with the transcript typed by the OS.

### Backup user

More → Backup. Read the warning that the file is readable. Save to a folder they control. Later, on a new phone, install, Restore, see counts and date, confirm. A safety copy of the empty new ledger is taken anyway. Balances match the old phone. Export CSV is a different action, used when they want a spreadsheet, and they cannot restore from that CSV in the MVP. The screen says so.

---

## 29. Screen inventory

Shared states are defined once. **Loading:** skeleton or a spinner only for file IO. **Error:** one sentence and a retry. **Empty:** one sentence and one action. Screens below note only what differs.

| Screen | Purpose | Key components | Actions | Goes to | Empty / error |
| --- | --- | --- | --- | --- | --- |
| Launch | Open the DB, route | None visible beyond the icon | None | Onboarding or Home | If the DB cannot open: do not create a second silent DB. Offer restore or erase. |
| Onboarding: money | Lock formatting expectations | Grouping preview, currency | Continue, skip, change currency | Payday | — |
| Onboarding: payday | Set the period | Day picker, "no fixed day" | Continue, skip | Accounts | — |
| Onboarding: accounts | Create the first containers | Cash toggle, bank name | Finish | Home | Cannot finish with zero accounts. Cash is the escape. |
| Home | Daily picture | Hero, context line, cash line, recent rows, one insight slot, Add | Add, open row, open accounts | Sheet, detail, accounts | Spent ₹0 and the empty sentence |
| Quick-add sheet | Capture | Segmented verb, amount, chips, date, Save, Details | Save, switch to Write, expand details | Stays, or full editor | Banner if category missing. Save disabled. |
| Write mode | Parse a sentence | Text field, preview, gap chips, mic later | Confirm, edit in form | Sheet form or saved | Two-amount and missing-field banners |
| Full editor | Completeness and corrections | All editable fields | Save, delete | Back to caller | Field-level errors |
| Transaction detail | Explain one row | Amount, category, account, method, date, source, note | Edit, duplicate, delete | Editor | If deleted underneath: "This was deleted." |
| Activity | Find history | Grouped list, search, filter entry | Open, swipe delete, filter | Detail, filter sheet | No matches, or no transactions yet |
| Filter sheet | Narrow the list | Period, type, category, account, sort | Apply, clear | Activity | — |
| Insights | Explain the period | Bars, comparison, largest rows, later budgets | Open category filter, edit cap | Activity, budget editor | Not enough data sentence |
| Budget editor | Set a cap or category budget | Amount, category, thresholds later | Save, remove | Back | — |
| Accounts | See containers | Balances, owed, net worth | Add, open, archive | Editor, detail | Should not be empty |
| Account detail | One account's history | Balance, limit, recent rows | Edit, archive | Editor, activity filtered | No transactions on this account |
| Account editor | Create or rename | Type, name, savings toggle, limit | Save | Back | Duplicate name allowed; type locked after transactions exist, to protect signs |
| Categories | Manage the tree | Parents and children | Add, archive, recolor | Editor | Defaults re-seed action if needed |
| Category editor | Name, icon, color, parent | Palette, icon grid | Save | Back | Name required |
| Templates | Shortcuts | List of chips' sources | Create, delete | Editor | "Save a transaction as a template from its detail screen." |
| Recurring list | Future | Due, skipped, auto-post flag | Confirm, skip, edit rule | Editor | "No repeating payments." |
| Draft queue | Future notification capture | Parsed drafts | Save, dismiss, disable capture | Editor | "No drafts." Also the off switch. |
| Goals list | Future | Progress | Add | Detail | Hidden until the feature ships; then empty with one action |
| Settings | Custody and preferences | Rows, not a junk drawer | Navigate | Child screens | — |
| Appearance | Theme | Light, dark, system | Select | — | — |
| Format & payday | Locale behavior | Grouping, payday, week start, paise | Save | — | Currency locked explanation |
| App lock | Casual gate | PIN, biometric, recovery explanation | Enable, disable | PIN pad | — |
| Backup & export | Leave with the data | Backup, restore, CSV | Run | System sheet, restore preview | File errors as specified |
| Restore preview | Avoid a bad replace | Counts, date, version | Confirm, cancel | Home or error | Checksum error |
| Notifications | Later | Per-type toggles | Toggle | System permission if needed | — |
| Privacy | Explain the stance | Plain sentences, erase | Erase | Confirm dialog | — |
| About | Version, disclaimer, licenses | Text | View licenses | — | — |

There is no login screen, no bank-connection screen, and no marketplace screen in any version covered by this plan. Do not add placeholder tabs for them.

---

## 30. Design inspiration analysis

This section records principles. It is not a mood board, and it is not permission to reuse layouts.

### Monefy

People stay because logging is shorter than the regret of forgetting. The chart closes a reward loop: you typed a number, you saw the month change shape. Sync through a file the user already owns is a trust pattern worth more than a login form. What creates friction is the ceiling: more accounts, more categories, transfers, and "what is left" do not fit a wheel. We keep the two-tap spirit inside a sheet that can also express a move and a card. We do not make a pie the identity of the app.

### Money Manager

People stay for years because the books can represent a real life: calendar days, receipts, several account kinds, a purchase that is not a subscription. Friction is density and an older visual system that makes every feature look equally urgent. We keep the honesty of typed accounts and the usefulness of a day. We do not lead with double-entry language, and we do not put receipt capture on the critical path.

### Wallet

People who want one picture of banks, bills, and budgets are served by treating planned payments as objects. Friction is weight, paywalled sync, and a model that assumes an aggregator. We keep "a bill you have not confirmed is not yet spending, but you should see it coming" for a later phase. We do not open with Connect your bank, and we do not give every object a tab.

### Spendee

Shared context and a daily allowance are the ideas worth remembering. Visual polish without a decision underneath becomes a poster. The wallet metaphor is the idea to avoid in this market, because the word is already taken by the payment apps our primary user opens ten times a day. Labels can return as tags once a single user is overflowing categories. Sharing waits until custody across devices is real.

### Goodbudget

Remaining-balance psychology is the strongest budgeting idea in the set. It works because the constraint is concrete. It fails when the ritual is mandatory and when one account is a price fence. We take the remaining number, make it optional, and let the first session succeed with no budget at all.

### axio and Moneyview

Zero-effort capture is why the India category exists, and weekly sentences are the right shape for an insight. Friction, and the reason many people will switch, is trust: inbox access, lending upsells, cash blindness, and books that cannot be inspected or exported cleanly. We take the sentence-shaped insight and the respect for UPI volume. We do not take the permission, the credit shop, or the silent post. The existence of these apps is evidence of demand for automatic capture. It is also evidence that automatic capture, done as the business model, consumes the product.

### Cross-cutting principle

The apps that last either reduce the cost of telling the truth, or increase the cost of lying to yourself. Daybook's MVP does the first. The optional cap begins the second, without punishing people who only wanted the first.

---

## 31. Product differentiation

These five are consequences of the research, not a branding exercise.

1. **Confirm-first capture.** Fast when the input is complete, incapable of saving when it is not. Monefy is fast and silent. SMS apps are fast and often wrong. The review card is the original combination: speed without fiction.

2. **A ledger, not a feed.** Transfers, card payments, opening balances, and refunds have defined effects. Most "simple" trackers become untrustworthy the first month someone uses a card and an ATM. Most "complete" trackers show the machinery. Daybook keeps the machinery under four verbs.

3. **Privacy as the default path, not a mode.** No account, no inbox, no bank password, no ads, no lending, export that cannot be priced. The India category's weakness is trust. That is the opening, provided the manual loop is actually fast enough that people do not crawl back to SMS apps.

4. **India-shaped money without a country lock.** Payday periods, UPI as a rail, lakh in the parser, EMI and household help as normal categories, cash still first-class. A traveler changes currency formatting. They do not need a different product.

5. **One decision number, withheld when it would be a lie.** Safe-to-spend clones show a confident figure from incomplete data. Daybook shows spent, until income or a cap exists. Honesty on the home screen is a feature users can feel.

What is not a differentiator, despite appearing in the brief as a candidate: a beautiful chart gallery, a customizable theme studio, and "local AI" as a phrase. Charts are a tool. Themes are hygiene. Local rules are an implementation of differentiator 1, not a marketing pillar.

---

## 32. Final product blueprint

1. **Name.** Daybook (placeholder). A private daily ledger.
2. **Vision.** Record ordinary money in seconds and answer where this period went, without giving the ledger away.
3. **Users.** Indian salaried individuals who pay by UPI, card, and cash; secondarily, anyone who wants a private manual ledger.
4. **Value.** A few seconds to record, books that treat cards and transfers honestly, data that stays on the phone.
5. **Main features.** Quick capture, spend / receive / move, accounts, categories, an honest home number, search, backup and export. Then parser, budgets, insights, recurring.
6. **MVP.** Section 26. Airplane-mode complete. No account. No inbox. No sample data.
7. **Future.** Parser and templates first; then picture, automation, widget and optional drafts, goals and multi-currency, user-controlled sync, local questions. Not lending, not payments, not market data.
8. **Navigation.** Home, Activity, Add sheet, Insights, More.
9. **Screens.** Section 29. No login, no bank link, no marketplace.
10. **Data.** Accounts, categories, transactions, settings. Balances derived. Integers. Local dates. Hard delete plus Undo. Schema in section 24. Section 33 wins on conflicts.
11. **Technical.** Flutter, Riverpod, Drift, go_router, pure posting rules, fixture tests as the release gate.
12. **AI.** A local rules parser behind an interface. Voice is speech-to-text in front of that parser. No model in the early versions. No keys in the app.
13. **Privacy.** No mandatory account. No telemetry. No SMS permission. Encryption before any cloud or notification-capture feature. Export never paywalled.
14. **Design.** Paper & Ink. Literata for the hero, IBM Plex Sans elsewhere. Warm paper, one green accent, spend and receive as ink colors, not alarms.
15. **Roadmap.** V0 shell, V1 ledger, V1.1 Parser V1, V2 picture and Parser V2, V3 automation, V4 reach, V5 wider books, V6 custody, V7 questions. Marks are in section 33.

---


---

## 33. Implementation boundary

This section wins over every earlier sentence, including sections 8, 17, 25, 26, 27, and 32, and over `docs/CAPTURE_AND_SCREENS.md`. It does not authorize implementation.

### Version marks

| Feature | Mark |
| --- | --- |
| Spend, Receive, Move, Adjust | V1 |
| Cash, bank, wallet, credit card accounts | V1 |
| Payment method as a label, not a balance | V1 |
| Pay card, cash advance, ATM as Move kinds | V1 |
| Refund type, full editor only | V1 |
| Opening balance and balance adjustment | V1 |
| Optional period cap and the period formulas in section 5 | V1 |
| Four insight lines, no charts | V1 |
| CSV export, unencrypted JSON backup, all-or-nothing restore | V1 |
| Hard delete plus in-memory Undo | V1 |
| Account archive | V1 |
| Templates | V1.1 |
| Parser V1 | V1.1 |
| Parser V2 | V2 |
| Category budgets, charts, calendar grid | V2 |
| Recurring rules and reminders | V3 |
| Splits, reimbursement status, receipt photos, tags | V3 |
| Parser V3: Hindi, Hinglish, complex sentences, voice, notification drafts | Future |
| Goals | Future |
| Manual multi-currency | Future |
| Debt and loan balances | Future. EMI as a category is V1 |
| Encrypted backup file | Future, before any upload |
| Cloud sync | Future. Do not implement |
| Bank integrations and Account Aggregator | Future. Do not implement |
| Shared finances | Future. Do not implement |
| Investment quotes | Out of scope |
| SMS inbox reading | Out of scope |
| Lending, bill pay, credit score | Out of scope |

### Parser phases

Keep the pipeline in section 8 as the vision. Build it in three phases. No phase autosaves.

**Parser V1, in V1.1.** Amount, type, date, category, and payee only. The four sentences are `Spent ₹350 on dinner`, `Paid 1200 for electricity yesterday`, `Received ₹25,000 salary`, and `₹450 lunch at Domino's`. Review preview is required. A missing category blocks save. Account is the visible default, not something the sentence is trusted to name. Do not parse lakh, crore, account aliases, payment methods, or user rules in this phase.

**Parser V2, in V2.** Accounts, payment methods, Indian grouping, lakh and crore, merchant aliases, and local rules learned from the user's corrections. Still no autosave. Still English UI.

**Parser V3, future.** Hindi and Hinglish, complex sentences, voice into the same review card, and notification drafts. Voice does not save when speech ends. Notification text is a draft, never a posted row.

### V1 insights

At most one line, in this order, and only if it is true:

1. Uncategorized transactions, if any expense or refund in the period has no category. Tap opens that filter.
2. Cap approaching, if a cap is set and period spending has reached 80 percent of it.
3. Largest category this period, if at least three categorized expenses exist. One name and one amount.
4. Unusually large transaction, if one expense is more than three times the median expense in the period and at least five expenses exist.

Versus previous period is not in V1. It needs a prior period and a comparison screen. That is V2.

Do not ship an analytics gallery, a pie, a streak, or a score.

The Insights tab stays, because D-16 locked the navigation. In V1 it shows the same qualifying line, or one sentence that there is not enough to compare yet. It does not show charts.

### Custody

CSV is for a person reading a spreadsheet. It is not a restore format. V1 cannot restore from CSV, and the screen says so.

JSON backup is the full ledger: accounts, categories, transactions, and settings. Later versions add budgets, recurring rules, and any other state required to rebuild the books. V1 JSON is not encrypted. The share sheet must warn that anyone who can open the file can read it.

Restore checks the checksum and the schema before writing. Failure imports nothing, shows a clear error, and does not change the database. Success replaces the ledger only after a safety copy.

Cloud sync is future and must not be implemented.

### Schema notes

These are the corruption risks the V1 model must refuse. They are checks, not new features.

- A payment method cannot have a balance. Saving UPI as an account is an impossible state.
- A credit-card expense must use payment method credit card. A bank expense must not use payment method credit card.
- A transfer must have two different accounts. A card payment must have a bank or wallet as source and a credit card as destination. A cash advance is the reverse. An ATM move is bank to cash.
- A card purchase and the later card payment are two rows. Deleting one must not delete the other. That is not double counting. Logging the payment as a Bills expense is double counting, and the UI must not offer that path for Pay card.
- Opening balance is not income. A balance adjustment is not income or expense. A refund is not income. A transfer is not spending.
- Each account has at most one `opening_balance` row.
- Do not add `deleted_at`, split columns, reimbursement status, or a stored balance in V1. Those columns would create states the UI does not explain.
- Account `archived_at` stays, because history needs the name. That is not transaction soft delete.
- `include_in_spendable` must be false for every credit card. The repository rejects the other combination.
- Available credit is computed. It is never stored as cash and never added to cash you have.

### Decisions still required

None. The choices in D-37 through D-48 are locked by this revision. Override them in writing before implementation if one of them is wrong. Do not rediscover them in code.

---

## Overrides

Accepted. Do not relitigate these unless a new constraint appears.

- Working name Daybook.
- Credit cards in the first ledger, not added later.
- Parser V1 in V1.1, not inside the first binary. The full pipeline is not that release.
- No monetization design beyond "core and export stay free".
- English-only UI in V1.
- App lock as a casual gate until encryption ships, with copy that says so.

Screen studies and the fixture tables that implement D-11, D-31, and the worked example are in `docs/CAPTURE_AND_SCREENS.md`.

---

## Sources

Public material used to ground the competitor and policy sections. Product behavior changes; the decisions do not require feature parity.

- Monefy product site and store listings, including quick entry, Drive/Dropbox sync, recurring records, widgets, multi-currency, passcode, budgets, and accounts. https://www.monefy.com/ and Google Play listing for `com.monefy.app.lite`.
- Wallet by BudgetBakers product and features pages: budgets, planned payments, bank sync, multi-currency. https://budgetbakers.com/en/products/wallet/
- Spendee store listing: wallets, shared finances, labels, budgets, receipt scan, multi-currency.
- Realbyte Money Manager features: calendar, double-entry framing, budgets, photos, account types. https://www.realbyteapps.com/
- Goodbudget as an envelope system with manual entry and account limits, from public reviews (NerdWallet and others). Details of whether paid import is live sync or a file import differ by source and were not treated as a decision input.
- axio / Walnut and Moneyview public descriptions: SMS-based categorization, reminders, and lending or credit products alongside tracking.
- Google Play SMS and Call Log permissions policy, including the reviewed exception for SMS-based money management and the spyware note on budgeting apps. https://support.google.com/googleplay/android-developer/answer/10208820
- RBI Account Aggregator as the consent-based alternative to inbox reading and credential sharing, from public personal-finance guidance.

Competitor names are used for analysis only. Daybook's interface, icon, and copy should be designed from this document, not from screenshots of those products.
