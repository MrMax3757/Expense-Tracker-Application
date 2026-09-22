# Daybook — Capture rules and screen studies

**Status: planning only. Companion to `PRODUCT_PLAN.md`, revision 2. No application code.**

Section 33 of `PRODUCT_PLAN.md` wins if this file disagrees. Parser V1 is V1.1 and covers only the four example sentences. The longer fixture table below is the later parser vision, not a V1 or V1.1 build list. Core and export stay free. English UI in V1. App lock is a casual gate until encryption ships.

Screen studies live in `docs/screens/`. They are directional. Where a picture disagrees with the text, the text wins.

| Study | Use it for | Ignore |
| --- | --- | --- |
| `home-light.png` | Hierarchy, type, color, list density, insight line, center add | Activity and More icons look too similar. Use a list icon and a more-horiz icon. |
| `home-dark.png` | Dark palette and the same hierarchy | Insights must not be a lightbulb. ATM must not be a random glyph. Use `swap_horiz`. |
| `quick-add.png` | Sheet order, chips, Save above the keypad | No hamburger on Home. The dimmed page is Home, not a menu shell. Keypad is the platform numeric pad plus a `+ − ×` strip, not a custom calculator grid that hides 0. |
| `write-incomplete.png` | Gap chip, banner, disabled Save | No book illustration on Home. No search or overflow icons in the Home header. |
| `activity.png` | Search, date groups, signed amounts, flat rows | Filter chips are a summary of the filter sheet, not four always-on toggles that can contradict the list. |
| `app-icon.png` | Mark direction: open book, two rules, folded corner, no rupee | Final icon is redrawn as a vector. Do not ship the raster. |

Rejected chrome, even if a study shows it: greetings ("Good morning"), slogans, avatars, "Total balance" as the hero, pie charts, brand logos in rows, a navigation drawer, sample illustrations, confidence percentages, sparkles.

---

## Additional locks

| ID | Decision |
| --- | --- |
| D-31 | The first expense has no category preselected. Save stays disabled until the user picks one. After one save, the quick form may show the last-used category as a filled chip. Write mode never prefills a category the parser did not find. |
| D-32 | The amount calculator evaluates only complete expressions. `340+` disables Save. `340+80` displays ₹420 and Save posts 42000 paise. An incomplete expression is never saved as the left-hand number. |
| D-33 | Home has no drawer and no header actions in V1. Search lives on Activity. Accounts are reached from "Cash you have". The cap is edited from the hero, not from a menu. |
| D-34 | List subtitles are `category · account`, plus payment method only when it is not implied by the account. Not a clock time. Time stays on the detail screen. |
| D-35 | Indian grouping applies at 1,00,000 and above. ₹18,420 has no extra comma. ₹1,04,650 does. Both formats must be tested. |
| D-36 | A Move to a credit card is labeled **Pay card** on the button. It is stored as `transfer` with `transfer_kind = card_payment`. |

---

## Home layout

Top to bottom, no scroll required for the hero on a 800dp-tall phone. The recent list may scroll under the bar.

1. Wordmark only. No date in the status row beyond the period line.
2. Period, for example `7 Sep – 6 Oct`, when payday is the 7th. Calendar month otherwise: `Sep 2026`.
3. Hero label, one of: `Spent this period`, `Left this period`, `Left after income`, or `₹400 over`.
4. Hero amount. Serif. Never ellipsized.
5. If a cap exists, a 4px track and `of ₹30,000`. The track is spending against the cap, not a net-worth chart. At 100% it is full. Over the cap, the track stays full and the hero label becomes the over amount in spend color.
6. Context line. Omit a figure that is zero rather than printing `Income ₹0`, except the hero itself when the hero is spent-this-period.
7. `Cash you have` and the amount. Tap opens Accounts. If a card owes money, the next row is the card name and `₹350 owed`. Do not wrap these in cards.
8. `Recent`, then up to five rows.
9. At most one insight line. If none qualifies, the gap collapses. No empty box.
10. Bottom bar: Home, Activity, Add, Insights, More. Add is a 56dp circular button, not a tab.

Row anatomy: 24dp outlined icon, title, subtitle, amount. Hairline, not a card. Minimum row height 64dp. Amounts use tabular figures and a real minus `−`, not a hyphen.

Empty Home: hero `Spent ₹0`, sentence `Nothing recorded yet.`, action `Add an expense` where the list would be. The Add button remains.

---

## Quick-add sheet

Height about 90% when the keypad is open, so Home remains a dimmed context, not a destination the user fears losing.

Order:

1. Spend / Receive / Move. Spend is the default.
2. Amount. Focused. Platform numeric keypad. Decimal key allowed. Indian grouping may appear as the user types once the number is unambiguous; do not regroup on every keystroke if it fights the cursor.
3. Category chips: last used, then frequent, then More. More opens the full grid in the same sheet, replacing the chips, with a back control. It does not push a route.
4. Account chip and date chip.
5. `Details` and `Write instead`.
6. Save. Label follows the verb: Save, Move, Pay card.
7. Calculator strip, then keypad.

Details, when opened, adds description, payment method, and time. It does not add a second amount.

Move hides category chips and shows From and To. Same account disables Save with the inline sentence `Choose a different account.`

Pay card is not a fourth segment. It is Move with a card destination.

Dismiss the sheet by dragging down or tapping the scrim. If the amount is non-empty, dismiss is still immediate in V1. A confirm dialog on dismiss would tax the habit. The draft is discarded. Write mode with text follows the same rule; the sentence is not a transaction until Save.

---

## Write mode

Same sheet. `Form` returns to the quick form without saving. If the parser has a complete result, switching to Form copies the fields into the form so the user can fix a chip without retyping.

Preview rows, in order: type, amount, category, date, account, payment method if detected, payee if detected. Missing required fields are dashed chips, not guesses.

Banner copy is one of:

- `Pick a category to save this.`
- `This has two amounts. Keep one, or split it later from the editor.`
- `Which account should receive this?`
- `Didn't catch that.` for a failed voice transcript later

Save enables only when type, amount, and category are resolved for spend, receive, and refund. For a detected Move, category is not required; both accounts are. A visible default account counts as resolved and must be shown.

Confirming writes one posted transaction, closes the sheet, and shows `Saved ₹500 to Food.` with Undo. Undo removes that row. It is a hard delete plus in-memory Undo, not a soft delete.

---

## Activity

Title `Activity`. Search field. One chip row that reflects active filters, plus `Filter` if none are active beyond the default period. Tapping a chip removes it. Tapping Filter opens the sheet: period, type, category, account, payment method, sort.

Groups are local dates: `Today`, `Yesterday`, then `22 Sep`. Inside a day, newest time first, then newest `created_at`.

Swipe reveals Delete only. Delete does not ask. The row is removed immediately. Snackbar: `Expense deleted.` Undo reinserts that same row from memory. There is no `deleted_at`.

Search `500` matches ₹500.00 exactly, not ₹1,500 and not ₹50. Search `food` matches category name and children. Search is case-insensitive. It does not leave the device.

---

## Onboarding copy

Three screens. Skip on each. No progress theater beyond `1 of 3`.

**Money.** Title `We'll use rupees.` Body shows `₹12,34,567.89` and `22 Sep 2026`. Action `Continue`. Text button `Change`. Changing opens currency and grouping before the first transaction only. Footnote: `Daybook keeps records. It does not move money or give financial advice.`

**Payday.** Title `When does your month start?` A day control, and `No fixed payday`. Helper: `Rent and salary rarely care that the calendar says the 1st.`

**Accounts.** Title `Where does money live?` Cash is on. Optional bank name. Helper: `UPI and debit cards spend from a bank account. They are not separate accounts.` Finish creates Cash, and the bank only if a name was entered. No credit card on this screen. No SMS. No email.

---

## More

A short list, not a settings junk drawer mixed with marketing.

- Accounts
- Categories
- Backup and export
- Appearance
- Format and payday
- App lock
- Privacy
- About

Backup screen has two actions with different consequences, labeled so they cannot be confused:

- `Export spreadsheet` — CSV, cannot restore the ledger from it.
- `Save backup` — full file, with the warning `This file contains your transactions. Anyone who can open it can read them.`
- `Restore backup` — replace, after counts and a safety copy.

Privacy screen's destructive action is `Erase ledger`, not `Delete account`. There is no account.

---

## Payday periods

If payday mode is none, the period is the calendar month in the phone's local zone.

If payday is day D:

- Clamp D to the length of the month in question. 31 in February 2026 is 28. 31 in February 2028 is 29.
- The period that contains a date starts on the clamped payday of that month if `date.day >= clamped`, otherwise on the clamped payday of the previous month.
- It ends the day before the next start.

Examples, payday 7:

| Date | Period |
| --- | --- |
| 7 Sep 2026 | 7 Sep – 6 Oct |
| 6 Sep 2026 | 7 Aug – 6 Sep |
| 22 Sep 2026 | 7 Sep – 6 Oct |

Examples, payday 31:

| Date | Period |
| --- | --- |
| 31 Jan 2026 | 31 Jan – 27 Feb |
| 28 Feb 2026 | 28 Feb – 30 Mar |
| 1 Mar 2026 | 28 Feb – 30 Mar |

`Last month` in later search means the previous period, not the previous calendar month, when a payday is set.

The cap, once set, applies to the current definition of a period. Changing payday does not rewrite transactions. It changes which rows fall in the current hero. Say so: `This changes which expenses count toward the current period. It does not edit them.`

---

## Calculator

The strip inserts `+`, `−`, or `×`. No division in V1; division creates rounding arguments this product does not need.

Evaluation uses integer paise at the end, half-up, only when the expression is complete. Display may show the expression `340+80` until the user taps `=` or Save. Save on a complete expression posts the result. Save on a trailing operator is disabled. A result of zero or negative disables Save. More than two decimal places in any operand disables Save with `Use at most two decimal places.`

---

## Parser fixtures

Parser V1, in V1.1, must pass only the four example sentences: `Spent ₹350 on dinner`, `Paid 1200 for electricity yesterday`, `Received ₹25,000 salary`, and `₹450 lunch at Domino's`. It extracts amount, type, date, category, and payee. It does not extract accounts, payment methods, lakh, or crore. The other rows are Parser V2 fixtures. Do not treat them as a V1.1 task.

Today for these fixtures is 22 Sep 2026, a Tuesday. Accounts: Cash (`cash`), HDFC Salary (`hdfc`, bank, primary), ICICI Card (`icici card`, credit card), Savings (`savings`, bank, not spendable). No user rules yet. System keyword and merchant maps apply.

`canSave` is false until the gaps listed are filled in the preview. A default account counts as filled only if it is shown.

| Input | Type | Amount | Category | Date | Account | Other | canSave |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `I spent 500` | expense | 50000 | gap | 22 Sep | HDFC Salary shown | | no |
| `500` | gap | 50000 | gap | 22 Sep | HDFC Salary shown | | no |
| `Spent ₹350 on dinner` | expense | 35000 | Food / Eating out | 22 Sep | HDFC Salary | payee empty or dinner | yes, after the suggestion chip is accepted if the rule is a suggestion rather than a locked fill. Keyword dinner is a suggestion the user must accept the first time. See below. |
| `Paid 1200 for electricity yesterday` | expense | 120000 | Bills / Electricity | 21 Sep | HDFC Salary | payee Electricity | suggestion must be accepted |
| `Received ₹25,000 salary` | income | 2500000 | Salary | 22 Sep | HDFC Salary | | suggestion must be accepted |
| `₹450 lunch at Domino's` | expense | 45000 | Food / Eating out | 22 Sep | HDFC Salary | payee Domino's | suggestion must be accepted |
| `2.5 lakh rent` | expense | 25000000 | Home / Rent | 22 Sep | HDFC Salary | | suggestion must be accepted |
| `1.2k coffee` | expense | 120000 | Food / Tea & coffee | 22 Sep | HDFC Salary | | suggestion must be accepted |
| `rs 1,20,000 emi` | expense | 12000000 | EMI & loans | 22 Sep | HDFC Salary | | suggestion must be accepted |
| `2 crore` | gap | 2000000000 | gap | 22 Sep | shown | amount only | no |
| `transferred 5000 to savings` | transfer | 500000 | none | 22 Sep | from HDFC Salary to Savings | transfer_kind standard | yes, both accounts shown |
| `atm 2000` | transfer | 200000 | none | 22 Sep | from HDFC Salary to Cash | transfer_kind atm | yes if Cash exists, else gap |
| `sent 500 to mom` | expense | 50000 | Family & personal suggested | 22 Sep | HDFC Salary | payee mom. Not a transfer | no until suggestion accepted |
| `paid 5000 to icici card` | transfer | 500000 | none | 22 Sep | from HDFC to ICICI Card | transfer_kind card_payment | yes |
| `got 200 back from Amazon` | refund | 20000 | gap unless linked | 22 Sep | HDFC Salary | payee Amazon. Not income | no until category or link |
| `500 or 600 dinner` | expense | gap, two amounts | Food suggested | 22 Sep | shown | banner about two amounts | no |
| `spent 500.555` | expense | invalid | | | | banner about decimal places | no |
| `moved 100 to hdfc` | transfer | 10000 | | | same-account risk if source is HDFC | if source would equal destination, gap on source | no until two different accounts |

Suggestion rule, made strict so no parser phase can drift back into silent saves: a parser category is always a chip the user accepts, even when the keyword is obvious. Acceptance is one tap. It is not a second form. After the user corrects or accepts a payee once, that user rule may show as already accepted next time, because they taught it. System guesses never auto-accept.

Amount words: `k` and `thousand` × 1,000; `lakh`, `lac`, `lacs`, `lakhs` × 1,00,000; `crore`, `cr` × 1,00,00,000. `2.5 lakh` is 2,50,000. Commas are grouping, not decimals. A dot is the decimal mark. `1.500` is 1.5, not 1500. European `1.500,00` is out of scope and must not be guessed.

Type words: spent, paid, bought, pay → expense, unless the destination is the user's own account (`to savings`, `to icici card`, `to my hdfc`). Received, got, salary, credited → income, unless `back from` or `refund` → refund. Transferred, moved, atm → transfer only with an own-account destination. Otherwise those words do not invent a transfer.

---

## Posting vectors

Start, 7 Sep 2026, payday 7. No cap. All amounts in rupees; storage is paise.

| Step | Action | HDFC | Cash | Card owed | Period expense | Period income | Cash you have | Hero |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Adjust HDFC +50000, Cash +2000 on 1 Sep | 50000 | 2000 | 0 | 0 | 0 | 52000 | Spent ₹0 |
| 1 | Receive 80000 salary on 7 Sep | 130000 | 2000 | 0 | 0 | 80000 | 132000 | Left after income ₹80,000 |
| 2 | Spend 20000 rent, UPI, HDFC, 7 Sep | 110000 | 2000 | 0 | 20000 | 80000 | 112000 | Left after income ₹60,000 |
| 3 | Spend 350 dinner on card, 8 Sep | 110000 | 2000 | 350 | 20350 | 80000 | 112000 | Left after income ₹59,650 |
| 4 | ATM move 5000, 8 Sep | 105000 | 7000 | 350 | 20350 | 80000 | 112000 | unchanged |
| 5 | Pay card 350, 9 Sep | 104650 | 7000 | 0 | 20350 | 80000 | 111650 | unchanged |

Set a cap of 30000 after step 5. Hero becomes Left this period ₹9,650 (`30000 − 20350`). Income does not raise the cap. Cash you have stays ₹1,11,650 and is not added to the hero.

Delete the dinner with undo. Card owed returns to 0 only if the dinner was the cause; the later card payment of 350 then overpays. The books must allow that and label `Credit balance ₹350` if the payment remains. Undo of the dinner does not silently delete the payment. This is the correct, slightly uncomfortable result, and the detail screen of the payment should still say Pay card.

A refund of 350 on 10 Sep linked to the dinner, if the dinner still exists, reduces period expense to 20000 and reduces card owed. It does not increase period income.

---

## Strings that must exist as keys

Externalize from the first commit. Do not concatenate amounts into untranslated fragments in a way that breaks Hindi later; use placeholders.

`hero_spent`, `hero_left`, `hero_left_after_income`, `hero_over`, `cash_you_have`, `amount_owed`, `credit_balance`, `nothing_recorded`, `add_expense`, `pick_category`, `two_amounts`, `saved_to`, `expense_deleted`, `choose_different_account`, `use_two_decimals`, `backup_warning`, `export_spreadsheet`, `save_backup`, `restore_backup`, `erase_ledger`, `not_advice`, `upi_not_an_account`, `currency_locked`, `payday_changes_period`.

No string contains "Oops", "safe to spend", "connect your bank", "credit score", or "AI".

---

## Still not in scope

No Flutter project, no Drift schema file, no widget code. The next implementation step, when asked, is V0: shell, tokens, router, `Money`, `LocalDate`, empty Home that can render `₹12,34,567`. Not the parser. Not SMS.
