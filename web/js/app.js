import { buildBackup, downloadText, toCsv, validateBackup, APP_VERSION } from "./backup.js";
import {
  ACCOUNT_TYPES, defaultMethod, freshLedger, legalMethods, methodLabel, PALETTE, typeLabel as accountTypeLabel,
} from "./defaults.js";
import { buildInsights, homeInsight } from "./insights.js";
import {
  activeAccounts, amountClass, availableCredit, budgetProgress, canDeleteAccount, cardLabel,
  cashYouHave, categoryById, categoryRollup, confirmPending, dailyTotals, displaySign,
  explainHero, heroFor, id, liabilitiesTotal, moveLabel, netWorth, payeeTotals, periodTotals,
  position, reassignAccount, reassignCategory, searchTransactions, skipPending, transactionTitle,
  materializeRecurring, transferKindFor, typeLabel, validateTransaction,
} from "./ledger.js";
import { formatMoney, parseExpression } from "./money.js";
import { addDays, financialPeriod, formatDisplay, formatShort, rangeFor, todayIso } from "./period.js";
import { parseSentence } from "./parser.js";
import { bootLedger, hashSecret, randomSalt, saveLedger } from "./store.js";

let ledger = bootLedger();
const ui = {
  sheet: null,
  dialog: null,
  snack: null,
  undo: null,
  unlocked: !ledger.settings.appLockEnabled,
  pin: "",
  pin2: "",
  lockMode: "enter",
  step: 1,
  draft: null,
  write: "",
  parsed: null,
  categoryAccepted: false,
  filters: {},
  preset: "period",
  explain: false,
  reveal: false,
  formError: "",
  recoveryShown: "",
  voice: false,
};

const app = document.querySelector("#app");
const $ = (s) => esc(s ?? "");

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function money(minor, sign = "none") {
  return formatMoney(minor, { grouping: ledger.settings.numberFormat, showPaise: ledger.settings.showPaise, sign });
}

function save() {
  try { saveLedger(ledger); return true; }
  catch {
    showSnack("Couldn't write the ledger. Free some space in this browser and try again.");
    return false;
  }
}

function today() {
  return todayIso();
}

function currentRange() {
  if (ui.preset === "custom" && ui.filters.start && ui.filters.end) {
    return { start: ui.filters.start, end: ui.filters.end, label: "Custom range" };
  }
  return rangeFor(ui.preset, today(), ledger.settings);
}

function financial() {
  return financialPeriod(today(), ledger.settings);
}

function route() {
  const raw = (location.hash || "#/").slice(1);
  const [path, query] = raw.split("?");
  return { path: path || "/", params: new URLSearchParams(query || "") };
}

function go(hash) {
  location.hash = hash;
}

function applyTheme() {
  document.documentElement.dataset.theme = ledger.settings.theme || "system";
  const dark = ledger.settings.theme === "dark" || (ledger.settings.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector("meta[name=theme-color]")?.setAttribute("content", dark ? "#141311" : "#F6F4EF");
}

function showSnack(text, undo) {
  ui.snack = text;
  ui.undo = undo || null;
  render();
  clearTimeout(showSnack.timer);
  showSnack.timer = setTimeout(() => { ui.snack = null; ui.undo = null; render(); }, 5000);
}

function render() {
  try {
    applyTheme();
    const focus = document.activeElement?.id;
    const caret = document.activeElement?.selectionStart;
    app.innerHTML = page();
    if (focus) {
      const el = document.getElementById(focus);
      if (el) {
        el.focus();
        if (caret != null && el.setSelectionRange) {
          try { el.setSelectionRange(caret, caret); } catch { /* number inputs */ }
        }
      }
    }
  } catch {
    app.innerHTML = `<div class="phone"><div class="screen"><h2 class="page">Daybook couldn't draw this screen.</h2><p>The books were not changed.</p><button class="primary" data-action="go" data-href="#/">Home</button></div></div>`;
  }
}

function page() {
  if (!ui.unlocked) return lockScreen();
  if (!ledger.settings.onboardingDone) return onboarding();
  const { path } = route();
  const body = path === "/" ? home()
    : path === "/activity" ? activity()
    : path.startsWith("/tx/") ? transaction(path.split("/")[2])
    : path === "/accounts" ? accounts()
    : path.startsWith("/account/") ? accountScreen(path.split("/")[2])
    : path === "/budgets" ? budgets()
    : path === "/insights" ? insights()
    : path === "/reports" ? reports()
    : path === "/recurring" ? recurring()
    : path === "/templates" ? templates()
    : path === "/categories" ? categories()
    : path === "/settings" ? settings()
    : path === "/backup" ? backup()
    : path === "/privacy" ? privacy()
    : path === "/help" ? help()
    : path === "/about" ? about()
    : path === "/more" ? more()
    : missing();
  return `<div class="phone ${ledger.settings.privacyMode && !ui.reveal ? "mask" : ""}">
    <div class="screen">${body}</div>
    ${nav()}
    ${ui.sheet ? `<div class="scrim" data-action="close-sheet"></div>${sheet()}` : ""}
    ${ui.dialog ? `<div class="scrim" data-action="close-dialog"></div>${dialog()}` : ""}
    ${ui.snack ? `<div class="snack" role="status"><span>${$(ui.snack)}</span>${ui.undo ? `<button data-action="undo">Undo</button>` : ""}</div>` : ""}
  </div>`;
}

function nav() {
  const { path } = route();
  const on = (p) => path === p ? "on" : "";
  return `<nav class="tabs" aria-label="Primary">
    <button class="${on("/")}" data-action="go" data-href="#/">${icon("home")}<span>Home</span></button>
    <button class="${on("/activity")}" data-action="go" data-href="#/activity">${icon("list")}<span>Activity</span></button>
    <button class="add-btn" data-action="add" aria-label="Add transaction">${icon("plus")}</button>
    <button class="${on("/insights")}" data-action="go" data-href="#/insights">${icon("insight")}<span>Insights</span></button>
    <button class="${on("/more")}" data-action="go" data-href="#/more">${icon("more")}<span>More</span></button>
  </nav>`;
}

function home() {
  const range = currentRange();
  const fin = financial();
  const hero = heroFor(ledger, range, fin);
  const totals = hero.totals;
  const cash = cashYouHave(ledger);
  const owed = liabilitiesTotal(ledger);
  const recent = searchTransactions(ledger, { sort: "newest", hidePending: true }).slice(0, 5);
  const line = homeInsight(ledger, fin);
  const cap = hero.kind === "cap" || hero.kind === "over" ? ledger.settings.periodCapMinor : null;
  const ratio = cap ? Math.min(1, Math.max(0, totals.spending / cap)) : 0;
  return `${top("Daybook", range.label)}
    <div class="chips">${presets()}</div>
    <div class="hero-label">${$(hero.label)}</div>
    <div class="hero ${hero.kind === "over" ? "spend" : ""}" aria-label="${$(hero.label)} ${money(hero.value, hero.value < 0 ? "minus" : "none")}">${hero.value < 0 ? "−" : ""}${money(Math.abs(hero.value))}</div>
    ${cap != null ? `<div class="track" aria-hidden="true"><span style="width:${ratio * 100}%"></span></div><div class="quiet">of ${money(cap)}</div>` : ""}
    <button class="text-btn" data-action="toggle-explain">${ui.explain ? "Hide the numbers" : "How this number is counted"}</button>
    ${ui.explain ? `<p class="quiet">${$(explainHero(hero))}</p>${explainBlock(totals, cash, owed)}` : ""}
    <div class="context"><span>Spent </span><span class="money">${money(totals.spending, "minus")}</span>${totals.income ? ` <span>· Income </span><span class="money">${money(totals.income, "plus")}</span>` : ""}${totals.reimbursements ? ` <span>· Reimbursed </span><span class="money">${money(totals.reimbursements, "plus")}</span>` : ""}</div>
    ${hero.kind === "spent" && range.start === fin.start ? `<p class="quiet">Add income or a spending cap to see what's left.</p>` : ""}
    <button class="plain-row" data-action="go" data-href="#/accounts"><span>Cash you have</span><b class="amt">${money(cash)}</b></button>
    ${owed ? `<button class="plain-row" data-action="go" data-href="#/accounts"><span>Credit card owed</span><b class="amt spend">${money(owed)}</b></button>` : ""}
    <button class="plain-row" data-action="go" data-href="#/accounts"><span>Net worth</span><b class="amt">${money(netWorth(ledger), netWorth(ledger) < 0 ? "minus" : "none")}</b></button>
    <div class="section">Recent</div>
    ${recent.length ? recent.map(row).join("") : `<p class="empty">Nothing recorded yet.</p><button class="primary" data-action="add">Add an expense</button>`}
    ${line ? `<button class="plain-row" data-action="go" data-href="${$(line.href)}"><span><b>${$(line.title)}</b><small class="sub">${$(line.detail)}</small></span></button>` : ""}
    ${pendingBanner()}`;
}

function explainBlock(totals, cash, owed) {
  return `<div class="preview">
    <div class="plain-row"><span>Expenses</span><span>${money(totals.expenses)}</span></div>
    <div class="plain-row"><span>Refunds, subtracted</span><span>${money(totals.refunds)}</span></div>
    <div class="plain-row"><span>Period spending</span><span>${money(totals.spending)}</span></div>
    <div class="plain-row"><span>Income</span><span>${money(totals.income)}</span></div>
    <div class="plain-row"><span>Reimbursements, kept separate from salary</span><span>${money(totals.reimbursements)}</span></div>
    <div class="plain-row"><span>Cash you have</span><span>${money(cash)}</span></div>
    <div class="plain-row"><span>Card owed</span><span>${money(owed)}</span></div>
    <p class="footnote">Transfers, card payments, cash advances, opening balances, and corrections are in none of the income or spending lines. Available credit is not cash.</p>
  </div>`;
}

function presets() {
  return ["period", "today", "week", "month", "previous", "year"].map((key) => {
    const label = { period: "This period", today: "Today", week: "Week", month: "Month", previous: "Previous", year: "Year" }[key];
    return `<button class="chip ${ui.preset === key ? "on" : ""}" data-action="preset" data-id="${key}">${label}</button>`;
  }).join("");
}

function pendingBanner() {
  const waiting = ledger.transactions.filter((tx) => tx.status === "pending");
  if (!waiting.length) return "";
  return `<button class="banner" data-action="go" data-href="#/recurring">${waiting.length} repeating item${waiting.length === 1 ? "" : "s"} waiting. Not counted yet.</button>`;
}

function activity() {
  const params = route().params;
  const filters = { ...ui.filters };
  if (params.get("uncategorized")) filters.uncategorized = true;
  let rows = searchTransactions(ledger, filters);
  if (filters.uncategorized) rows = rows.filter((tx) => !tx.categoryId && (tx.type === "expense" || tx.type === "refund"));
  const groups = new Map();
  for (const tx of rows) {
    const key = formatShort(tx.occurredOn, today());
    groups.set(key, [...(groups.get(key) || []), tx]);
  }
  return `${back("#/", "Activity")}
    <input class="search" id="search" placeholder="Search payee, note, category, amount" value="${$(ui.filters.text || "")}" data-action="search" aria-label="Search transactions">
    <div class="chips">
      <button class="chip" data-action="filter-sheet">Filter</button>
      <button class="chip ${ui.filters.sort === "amount" ? "on" : ""}" data-action="sort" data-id="amount">Largest</button>
      <button class="chip ${ui.filters.sort === "oldest" ? "on" : ""}" data-action="sort" data-id="oldest">Oldest</button>
      ${ui.filters.type ? `<button class="chip on" data-action="clear-filter" data-id="type">${$(ui.filters.type)}</button>` : ""}
    </div>
    ${rows.length ? [...groups.entries()].map(([day, list]) => `<div class="section">${$(day)}</div>${list.map(row).join("")}`).join("") : activityEmpty()}`;
}

function row(tx) {
  const account = ledger.accounts.find((a) => a.id === tx.accountId);
  const category = categoryById(ledger, tx.categoryId);
  const subtitle = [tx.status === "pending" ? "Waiting" : null, category?.name, account?.name].filter(Boolean).join(" · ");
  return `<button class="txn" data-action="go" data-href="#/tx/${$(tx.id)}">
    <span class="icon" aria-hidden="true">${icon(tx.type === "transfer" ? "move" : "dot")}</span>
    <span><span class="title">${$(transactionTitle(ledger, tx))}</span><span class="sub">${$(subtitle || typeLabel(tx.type, tx.transferKind || tx.adjustmentKind))}</span></span>
    <span class="amt ${amountClass(tx)}">${money(tx.amountMinor, displaySign(tx))}</span>
  </button>`;
}

function transaction(txId) {
  const tx = ledger.transactions.find((row) => row.id === txId);
  if (!tx) return `<p class="empty">This was deleted.</p>`;
  const account = ledger.accounts.find((a) => a.id === tx.accountId);
  const dest = ledger.accounts.find((a) => a.id === tx.destinationAccountId);
  const category = categoryById(ledger, tx.categoryId);
  const lines = [
    ["Type", typeLabel(tx.type, tx.adjustmentKind || tx.transferKind)],
    ["Amount", money(tx.amountMinor, displaySign(tx))],
    ["Date", formatDisplay(tx.occurredOn)],
    ["Account", account?.name || "Missing account"],
    dest ? ["To", dest.name] : null,
    category ? ["Category", category.name] : null,
    tx.paymentMethod ? ["Payment method", methodLabel(tx.paymentMethod)] : null,
    tx.linkedTransactionId ? ["Linked purchase", transactionTitle(ledger, ledger.transactions.find((row) => row.id === tx.linkedTransactionId) || { type: "expense" })] : null,
    tx.note ? ["Note", tx.note] : null,
    (tx.tags || []).length ? ["Tags", tx.tags.join(", ")] : null,
    ["Source", tx.source === "parser" ? "From a written note" : tx.source === "recurring" ? "From a repeating rule" : tx.source === "template" ? "From a template" : "Added by you"],
    tx.status === "pending" ? ["Status", "Waiting for confirmation. Not in totals."] : null,
  ].filter(Boolean);
  return `${back("#/activity", "Transaction")}
    <h2 class="page">${$(transactionTitle(ledger, tx))}</h2>
    <p class="hero ${amountClass(tx)}">${money(tx.amountMinor, displaySign(tx))}</p>
    ${lines.map(([k, v]) => `<div class="plain-row"><span class="quiet">${$(k)}</span><span>${$(v)}</span></div>`).join("")}
    ${tx.attachment ? `<img alt="Receipt" src="${tx.attachment}" style="max-width:100%;border-radius:12px;margin-top:12px">` : ""}
    <div class="links" style="margin-top:16px">
      <button class="text-btn" data-action="edit" data-id="${$(tx.id)}">Edit</button>
      <button class="text-btn" data-action="duplicate" data-id="${$(tx.id)}">Duplicate</button>
      <button class="text-btn" data-action="template-from" data-id="${$(tx.id)}">Save as template</button>
      <button class="text-btn danger" data-action="delete-tx" data-id="${$(tx.id)}">Delete</button>
    </div>
    ${tx.status === "pending" ? `<button class="primary" data-action="confirm-pending" data-id="${$(tx.id)}">Confirm</button>` : ""}`;
}

function accounts() {
  const list = ledger.accounts.slice().sort((a, b) => Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)));
  return `${back("#/", "Accounts")}
    <button class="primary" data-action="edit-account">Add account</button>
    ${list.map((account) => {
      const value = position(ledger, account);
      const label = account.type === "credit_card" ? cardLabel(value) : "Balance";
      return `<button class="txn" data-action="go" data-href="#/account/${$(account.id)}">
        <span class="icon">${icon("account")}</span>
        <span><span class="title">${$(account.name)}${account.archivedAt ? " · archived" : ""}</span><span class="sub">${$(accountTypeLabel(account.type))} · ${label}</span></span>
        <span class="amt ${value < 0 && account.type !== "credit_card" ? "spend" : ""}">${money(account.type === "credit_card" ? Math.abs(value) : value, account.type !== "credit_card" && value < 0 ? "minus" : "none")}</span>
      </button>`;
    }).join("")}
    <div class="stat"><span class="quiet">Cash you have</span><b>${money(cashYouHave(ledger))}</b></div>
    <div class="stat"><span class="quiet">Net worth</span><b>${money(netWorth(ledger))}</b></div>
    <p class="footnote">UPI, Google Pay, PhonePe, BHIM, and debit cards are not accounts. A credit card is an account because it has a liability. A stored-value wallet is an account. Available credit is never added to cash.</p>`;
}

function accountScreen(accountId) {
  const account = ledger.accounts.find((a) => a.id === accountId);
  if (!account) return `<p class="empty">That account is gone.</p>`;
  const value = position(ledger, account);
  const credit = availableCredit(account, value);
  const rows = searchTransactions(ledger, { accountId }).slice(0, 30);
  return `${back("#/accounts", account.name)}
    <p class="quiet">${$(accountTypeLabel(account.type))} · ${account.currency}${account.archivedAt ? " · archived" : ""}</p>
    <p class="hero">${account.type === "credit_card" && value < 0 ? "−" : ""}${money(Math.abs(value))}</p>
    <p class="quiet">${account.type === "credit_card" ? cardLabel(value) : "Balance, derived from transactions"}</p>
    ${credit != null ? `<div class="plain-row"><span>Credit limit</span><span>${money(account.creditLimitMinor)}</span></div><div class="plain-row"><span>Available credit</span><span>${money(credit)}</span></div><p class="footnote">Available credit is not cash and is not part of net worth except through the amount owed.</p>` : ""}
    ${account.creditLimitMinor != null && value > account.creditLimitMinor ? `<p class="banner">Over the limit by ${money(value - account.creditLimitMinor)}. The purchase is still recorded.</p>` : ""}
    <div class="links">
      <button class="text-btn" data-action="edit-account" data-id="${$(account.id)}">Edit</button>
      <button class="text-btn" data-action="adjust" data-id="${$(account.id)}">Correct balance</button>
      ${account.archivedAt ? `<button class="text-btn" data-action="unarchive" data-id="${$(account.id)}">Restore</button>` : `<button class="text-btn" data-action="archive" data-id="${$(account.id)}">Archive</button>`}
      <button class="text-btn" data-action="ask-reassign" data-id="${$(account.id)}">${canDeleteAccount(ledger, account.id).used ? "Move history" : "Remove"}</button>
    </div>
    <div class="section">History</div>
    ${rows.length ? rows.map(row).join("") : `<p class="empty">No transactions on this account.</p>`}`;
}

function budgets() {
  const range = financial();
  const cap = ledger.settings.periodCapMinor;
  const totals = periodTotals(ledger, range);
  const cats = ledger.budgets.filter((b) => !b.archivedAt);
  return `${back("#/more", "Budgets")}
    <p class="quiet">A budget is a ceiling, not an account balance. Transfers, card payments, and opening balances are not spending.</p>
    <div class="plain-row"><span>Spending cap for this period</span><b>${cap == null ? "None" : money(cap)}</b></div>
    ${cap != null ? `<div class="track"><span style="width:${Math.min(100, (totals.spending / cap) * 100)}%"></span></div><p class="quiet">${money(Math.max(0, cap - totals.spending))} left against the cap. Spent ${money(totals.spending)}.</p>` : ""}
    <button class="primary" data-action="edit-cap">${cap == null ? "Set a spending cap" : "Edit spending cap"}</button>
    <div class="section">Category budgets</div>
    ${cats.map((budget) => {
      const progress = budgetProgress(ledger, budget, range);
      const name = categoryById(ledger, budget.categoryId)?.name || "Category";
      return `<button class="choice" data-action="edit-budget" data-id="${$(budget.id)}"><b>${$(name)}</b><small>${money(progress.spent)} of ${money(budget.amountMinor)} · ${progress.over ? "over" : `${money(progress.left)} left`}</small></button>`;
    }).join("") || `<p class="empty">No category budgets.</p>`}
    <button class="text-btn" data-action="edit-budget">Add a category budget</button>`;
}

function insights() {
  const range = currentRange();
  const items = buildInsights(ledger, range, financial(), today());
  return `${back("#/", "Insights")}
    <p class="quiet">Only lines that can change a decision. Nothing here is estimated from other people.</p>
    ${items.length ? items.map((item) => `<div class="choice"><button class="choice" data-action="go" data-href="${$(item.href)}"><b>${$(item.title)}</b><small>${$(item.detail)}</small></button><button class="text-btn" data-action="dismiss" data-id="${$(item.id)}">Dismiss</button></div>`).join("") : `<p class="empty">Nothing to flag. Record a few expenses and this page will stay quiet until a number is worth acting on.</p>`}`;
}

function reports() {
  const range = currentRange();
  const spend = categoryRollup(ledger, range, "expense").filter((row) => row.amount > 0);
  const income = categoryRollup(ledger, range, "income");
  const days = dailyTotals(ledger, range);
  const maxDay = Math.max(1, ...days.map((d) => d.spending));
  const payees = payeeTotals(ledger, range).slice(0, 8);
  const cards = ledger.accounts.filter((a) => a.type === "credit_card" && !a.archivedAt);
  const max = Math.max(1, ...spend.map((row) => row.amount));
  return `${back("#/more", "Reports")}
    <div class="chips">${presets()}</div>
    <p class="quiet">${$(range.label)} · ${formatDisplay(range.start)} – ${formatDisplay(range.end)}</p>
    <div class="section">Spending by category</div>
    ${spend.length ? spend.map((row) => bar(row.name, row.amount, max)).join("") : `<p class="empty">Record a few expenses and this page will show a breakdown.</p>`}
    <div class="sr">${spend.map((row) => `${row.name} ${money(row.amount)}`).join(". ") || "No spending in this range."}</div>
    <div class="section">Spending over time</div>
    ${days.length ? `<div class="day-bars" aria-hidden="true">${days.map((d) => `<i style="height:${Math.max(4, (d.spending / maxDay) * 100)}%" title="${d.date}"></i>`).join("")}</div>${days.filter((d) => d.spending).map((d) => `<div class="plain-row"><span>${formatShort(d.date)}</span><span class="money">${money(d.spending)}</span></div>`).join("")}` : `<p class="empty">No days in this range yet.</p>`}
    <div class="section">Income by category</div>
    ${income.length ? income.map((row) => bar(row.name, row.amount, Math.max(1, ...income.map((r) => r.amount)))).join("") : `<p class="empty">No income in this range.</p>`}
    <div class="section">Payees</div>
    ${payees.map((row) => `<div class="plain-row"><span>${$(row.name)}</span><span>${money(row.amount)}</span></div>`).join("") || `<p class="empty">No payees yet.</p>`}
    <div class="section">Credit cards</div>
    ${cards.map((card) => {
      const owed = position(ledger, card);
      const spent = periodTotals(ledger, range, { accountId: card.id }).spending;
      return `<div class="plain-row"><span>${$(card.name)}</span><span>${money(owed)} owed · ${money(spent)} spent</span></div>`;
    }).join("") || `<p class="empty">No credit card.</p>`}
    <p class="footnote">Charts use posted transactions only. Pending repeating items are excluded.</p>`;
}

function bar(name, amount, max) {
  return `<div class="bar-row"><span>${$(name)}</span><span class="bar"><span style="width:${Math.max(2, (amount / max) * 100)}%"></span></span><span>${money(amount)}</span></div>`;
}

function recurring() {
  const waiting = ledger.transactions.filter((tx) => tx.status === "pending");
  return `${back("#/more", "Repeating")}
    ${waiting.map((tx) => `<div class="banner"><b>${$(transactionTitle(ledger, tx))}</b> · ${money(tx.amountMinor)} · ${formatDisplay(tx.occurredOn)}
      <div class="links"><button class="text-btn" data-action="confirm-pending" data-id="${$(tx.id)}">Confirm</button><button class="text-btn" data-action="skip-pending" data-id="${$(tx.id)}">Skip</button></div>
    </div>`).join("")}
    ${ledger.recurring.map((rule) => `<div class="choice"><button class="choice" data-action="edit-rule" data-id="${$(rule.id)}"><b>${$(rule.payee || typeLabel(rule.type))}</b><small>${rule.paused ? "Paused" : `Next ${rule.nextOn || rule.startOn}`} · ${money(rule.amountMinor)} · ${ruleWhen(rule)}${rule.autoPost ? " · posts itself" : ""}</small></button><button class="text-btn" data-action="delete-rule" data-id="${$(rule.id)}">Delete rule</button></div>`).join("") || `<p class="empty">No repeating payments.</p>`}
    <button class="primary" data-action="edit-rule">Add a repeating item</button>
    <p class="footnote">A rule is not a transaction. Confirming creates one row. Skipping writes nothing. Daybook will not create the same date twice.</p>`;
}

function templates() {
  return `${back("#/more", "Templates")}
    ${ledger.templates.map((template) => `<div class="choice"><button class="choice" data-action="use-template" data-id="${$(template.id)}"><b>${$(template.name)}</b><small>${template.amountMinor ? money(template.amountMinor) : "Amount left blank"} · ${$(typeLabel(template.type))}</small></button><button class="text-btn" data-action="delete-template" data-id="${$(template.id)}">Delete</button></div>`).join("") || `<p class="empty">Save a transaction as a template from its detail screen.</p>`}
    <p class="footnote">Using a template fills the form. It does not save until you do.</p>`;
}

function categories() {
  const parents = ledger.categories.filter((c) => !c.parentId);
  return `${back("#/more", "Categories")}
    <button class="text-btn" data-action="edit-category">Add a category</button>
    ${parents.map((parent) => `<div class="choice"><b>${$(parent.name)}${parent.archivedAt ? " · archived" : ""}</b><small>${$(parent.kind)}</small>
      <div class="links"><button class="text-btn" data-action="edit-category" data-id="${$(parent.id)}">Edit</button><button class="text-btn" data-action="merge-category" data-id="${$(parent.id)}">Merge</button></div>
    </div>${ledger.categories.filter((c) => c.parentId === parent.id).map((child) => `<div class="plain-row"><span>${$(child.name)}</span><button class="text-btn" data-action="edit-category" data-id="${$(child.id)}">Edit</button></div>`).join("")}`).join("")}`;
}

function settings() {
  const s = ledger.settings;
  return `${back("#/more", "Settings")}
    <label class="quiet">Theme<select class="field" data-action="setting" data-key="theme">${opt(s.theme, [["system", "System"], ["light", "Light"], ["dark", "Dark"]])}</select></label>
    <label class="quiet">Number format<select class="field" data-action="setting" data-key="numberFormat">${opt(s.numberFormat, [["indian", "Indian 1,00,000"], ["international", "International 100,000"]])}</select></label>
    <label class="quiet">Week starts<select class="field" data-action="setting" data-key="weekStart">${opt(s.weekStart, [["monday", "Monday"], ["sunday", "Sunday"]])}</select></label>
    <label class="quiet">Payday<select class="field" data-action="setting" data-key="paydayMode">${opt(s.paydayMode, [["none", "Calendar month"], ["day", "A day of the month"]])}</select></label>
    ${s.paydayMode === "day" ? `<label class="quiet">Day<input class="field" id="payday" inputmode="numeric" value="${$(s.paydayDay || "")}" data-action="payday"></label>` : ""}
    <label class="quiet">Default account<select class="field" data-action="setting" data-key="defaultAccountId">${opt(s.defaultAccountId, [["", "None"], ...activeAccounts(ledger).map((a) => [a.id, a.name])])}</select></label>
    <p class="plain-row"><span>Privacy mode</span><button class="chip ${s.privacyMode ? "on" : ""}" data-action="toggle" data-key="privacyMode">${s.privacyMode ? "On" : "Off"}</button></p>
    ${s.privacyMode ? `<button class="text-btn" data-action="reveal">${ui.reveal ? "Hide amounts" : "Show amounts"}</button>` : ""}
    <p class="plain-row"><span>Show paise</span><button class="chip ${s.showPaise ? "on" : ""}" data-action="toggle" data-key="showPaise">${s.showPaise ? "On" : "Off"}</button></p>
    <button class="choice" data-action="go" data-href="#/privacy"><b>App lock and privacy</b><small>A casual gate. Not encryption.</small></button>
    <button class="choice" data-action="go" data-href="#/backup"><b>Backup and export</b><small>CSV is not a restore. JSON is not encrypted.</small></button>
    <p class="footnote">Currency is Indian rupees. Accounts store a currency code, and a move between currencies is refused rather than guessed.</p>`;
}

function backup() {
  return `${back("#/settings", "Backup and export")}
    <p class="banner">This file contains your transactions. Anyone who can open it can read them. Daybook does not encrypt the backup.</p>
    <button class="primary" data-action="save-backup">Save backup</button>
    <button class="secondary-btn" data-action="pick-restore">Restore backup</button>
    <input id="restore-file" type="file" accept="application/json" hidden>
    <button class="secondary-btn" data-action="export-csv">Export spreadsheet</button>
    <p class="footnote">The spreadsheet is for reading. Daybook cannot rebuild the ledger from it. Restore checks the file before it changes anything. A damaged file imports nothing. The PIN does not travel in the file.</p>
    ${localStorage.getItem("daybook.safety.v1") ? `<button class="text-btn" data-action="undo-restore">Bring back the ledger from before the last restore</button>` : ""}
    ${ui.formError ? `<p class="banner" role="alert">${$(ui.formError)}</p>` : ""}`;
}

function privacy() {
  const s = ledger.settings;
  return `${back("#/settings", "Privacy")}
    <p>Daybook keeps the ledger in this browser. It does not require an account, and it does not send transactions anywhere.</p>
    <p>The app lock is a PIN gate. It does not encrypt the database. Do not treat it as a bank lock.</p>
    ${s.appLockEnabled ? `<button class="text-btn danger" data-action="disable-lock">Turn off app lock</button>` : `<button class="primary" data-action="setup-lock">Set a PIN</button>`}
    ${ui.recoveryShown ? `<p class="banner">Recovery code, shown once: <b>${$(ui.recoveryShown)}</b>. If you lose the PIN and this code, the only path is to erase the ledger.</p>` : ""}
    <div class="section">Reminders</div>
    ${toggleRow("Repeating items", "notifyRecurring")}
    ${toggleRow("Budget alerts", "notifyBudget")}
    ${toggleRow("Card balance", "notifyCard")}
    ${toggleRow("Daily reminder while the app is open", "notifyDaily")}
    <button class="text-btn" data-action="notify-permission">Allow notifications</button>
    <p class="footnote">If permission is denied, reminders still appear inside Daybook. This browser cannot reliably wake itself after you close the tab. Daybook does not read SMS or notification history.</p>
    <div class="section">Erase</div>
    <button class="text-btn danger" data-action="erase">Erase ledger</button>`;
}

function help() {
  return `${back("#/more", "How Daybook counts")}
    <p><b>Account, then type, then payment method.</b> HDFC Bank is a bank account. UPI and a debit card are ways of spending from it. They are not accounts. ICICI Credit Card is an account because you owe the issuer. Cash is an account. A Paytm balance you loaded is a wallet account. Google Pay used only as UPI is not.</p>
    <p><b>Period spending</b> is expenses in the period minus refunds in that same period.</p>
    <p><b>Left this period</b> is the spending cap minus period spending. It is not cash.</p>
    <p><b>Left after income</b> is period income minus period spending, and only when you have not set a cap.</p>
    <p><b>Cash you have</b> is spendable bank, cash, and wallet balances. Available credit is not added.</p>
    <p><b>Net worth</b> is assets minus what you owe on cards. Paying a card moves money between your accounts and does not change net worth. A card purchase does.</p>
    <p><b>Opening balance</b> means you already had this. <b>Balance correction</b> fixes the books. Neither is income or spending.</p>
    <p><b>Refund</b> reduces spending. <b>Reimbursement</b> is money received and is reported apart from salary. It does not rewrite the original expense.</p>
    <p>A written sentence is a preview. Daybook does not save it until you confirm, and it will not invent a missing category.</p>`;
}

function about() {
  return `${back("#/more", "About")}
    <h2 class="page">Daybook</h2>
    <p>A private daily ledger. Version ${APP_VERSION}.</p>
    <p>Daybook keeps records. It does not move money, give financial advice, or offer credit.</p>
    <p class="footnote">The books stay in this browser unless you export a file yourself.</p>`;
}

function more() {
  const items = [
    ["#/accounts", "Accounts", "Balances derived from transactions"],
    ["#/budgets", "Budgets", "Caps, not balances"],
    ["#/reports", "Reports", "Category, time, payees, cards"],
    ["#/recurring", "Repeating", "Confirm before it counts"],
    ["#/templates", "Templates", "Fill a form, then save"],
    ["#/categories", "Categories", "Rename, archive, merge"],
    ["#/backup", "Backup and export", "JSON restores. CSV does not."],
    ["#/settings", "Settings", "Theme, payday, format"],
    ["#/privacy", "Privacy", "Local ledger, optional PIN"],
    ["#/help", "How the numbers work", "The formulas, in sentences"],
    ["#/about", "About", `Version ${APP_VERSION}`],
  ];
  return `<h2 class="page">More</h2>${items.map(([href, title, sub]) => `<button class="choice" data-action="go" data-href="${href}"><b>${title}</b><small>${sub}</small></button>`).join("")}`;
}

function missing() {
  return `<p class="empty">That page is not in Daybook.</p><button class="text-btn" data-action="go" data-href="#/">Back home</button>`;
}

function onboarding() {
  if (ui.step === 1) {
    return `<div class="screen"><p class="quiet">1 of 3</p><h2 class="page">We'll use rupees.</h2><p class="hero">${money(123456789)}</p><p>22 Sep 2026</p><p class="footnote">Daybook keeps records. It does not move money or give financial advice.</p><button class="primary" data-action="onboard-next">Continue</button><button class="text-btn" data-action="onboard-skip">Skip</button></div>`;
  }
  if (ui.step === 2) {
    return `<div class="screen"><p class="quiet">2 of 3</p><h2 class="page">When does your month start?</h2><input class="field" id="payday-setup" inputmode="numeric" placeholder="Day, or leave blank" value="${$(ledger.settings.paydayDay || "")}"><p class="footnote">Rent and salary rarely care that the calendar says the 1st. Leave this blank for a calendar month.</p><button class="primary" data-action="onboard-payday">Continue</button><button class="text-btn" data-action="onboard-skip">Skip</button></div>`;
  }
  return `<div class="screen"><p class="quiet">3 of 3</p><h2 class="page">Where does money live?</h2><label class="quiet">Bank name, optional<input class="field" id="bank-name" placeholder="HDFC Bank"></label><p class="footnote">UPI and debit cards spend from a bank account. They are not separate accounts. Cash is created either way.</p><button class="primary" data-action="onboard-finish">Finish</button></div>`;
}

function lockScreen() {
  return `<div class="phone"><div class="screen"><h2 class="page">Daybook is locked</h2><p class="quiet">Enter the PIN. This gate does not encrypt the ledger.</p><input class="amount-input" id="pin" inputmode="numeric" autocomplete="off" aria-label="PIN" value="${$(ui.pin)}" data-action="pin"><p class="banner" id="lock-error" hidden></p><button class="primary" data-action="unlock">Unlock</button><button class="text-btn" data-action="recover">Use recovery code</button></div></div>`;
}

function sheet() {
  const kind = ui.sheet;
  if (kind === "add" || kind === "edit") return composer();
  if (kind === "account") return accountForm();
  if (kind === "cap") return capForm();
  if (kind === "budget") return budgetForm();
  if (kind === "rule") return ruleForm();
  if (kind === "category") return categoryForm();
  if (kind === "filter") return filterForm();
  if (kind === "write") return writeForm();
  return "";
}

function composer() {
  const d = ui.draft;
  if (d.mode === "write") return writeForm();
  const account = ledger.accounts.find((a) => a.id === d.accountId);
  const dest = ledger.accounts.find((a) => a.id === d.destinationAccountId);
  const kind = d.type === "transfer" ? transferKindFor(account, dest, d.transferKind) : null;
  const saveLabel = d.type === "transfer" ? moveLabel(kind) : d.type === "adjustment" ? "Save correction" : "Save";
  return `<div class="sheet" role="dialog" aria-label="Add transaction"><div class="grabber"></div>
    ${formBody(d, saveLabel)}
  </div>`;
}

function formBody(d, saveLabel) {
  const types = composerTypes(d);
  return `<div class="segments">${types.map((type) => `<button class="${d.type === type ? "on" : ""}" data-action="draft-type" data-id="${type}">${type === "expense" ? "Spend" : type === "income" ? "Receive" : type === "transfer" ? "Move" : type === "adjustment" ? "Adjust" : type === "refund" ? "Refund" : "Reimburse"}</button>`).join("")}</div>
    ${!ledger.settings.coachDismissed && d.type === "expense" && !ledger.transactions.some((tx) => tx.type === "expense") ? `<p class="quiet">Enter what you just spent.</p>` : ""}
    <div class="amount-row"><span class="rupee" aria-hidden="true">₹</span><input class="amount-input" id="amount" inputmode="decimal" aria-label="Amount in rupees" placeholder="0" value="${$(d.amountText || "")}" data-action="amount"></div>
    ${ui.formError ? `<p class="banner" role="alert">${$(ui.formError)}</p>` : ""}
    ${d.originalType && d.originalType !== d.type ? `<p class="banner">This will stop counting as ${d.originalType === "expense" ? "spending" : typeLabel(d.originalType)}.</p>` : ""}
    ${d.type === "transfer" ? moveFields(d) : d.type === "adjustment" ? adjustFields(d) : spendFields(d)}
    <label class="quiet">Date<input class="field" id="date" type="date" value="${$(d.occurredOn)}" data-action="draft-text" data-key="occurredOn"></label>
    ${d.type === "income" && ledger.accounts.find((a) => a.id === d.accountId)?.type === "credit_card" ? `<p class="banner">Income on a card reduces what you owe. It still counts as income. A merchant refund should be a refund, not income.</p>` : ""}
    ${!d.full ? `<button class="text-btn" data-action="full-types">Refund or reimbursement</button>` : ""}
    <div class="links"><button class="text-btn" data-action="toggle-details">${d.details ? "Hide details" : "Details"}</button><button class="text-btn" data-action="write-mode">Write instead</button></div>
    ${d.details ? detailFields(d) : ""}
    <div class="calc">${["+", "−", "×"].map((op) => `<button data-action="calc" data-id="${op}">${op}</button>`).join("")}</div>
    <button class="primary" data-action="save-tx" ${canSaveDraft(d) ? "" : "disabled"}>${saveLabel}</button>`;
}

function spendFields(d) {
  const kind = d.type === "income" || d.type === "reimbursement" ? "income" : "expense";
  const cats = ledger.categories.filter((c) => c.kind === kind && !c.archivedAt && !c.parentId);
  return `<div class="chips">${cats.slice(0, 8).map((c) => `<button class="chip ${d.categoryId === c.id ? "on" : ""}" data-action="draft-cat" data-id="${$(c.id)}">${$(c.name)}</button>`).join("")}<button class="chip" data-action="more-cats">More</button></div>
    ${d.moreCats ? `<div class="chips">${ledger.categories.filter((c) => c.kind === kind && !c.archivedAt).map((c) => `<button class="chip ${d.categoryId === c.id ? "on" : ""}" data-action="draft-cat" data-id="${$(c.id)}">${$(c.parentId ? "· " : "")}${$(c.name)}</button>`).join("")}</div>` : ""}
    ${accountSelect(d, "accountId", "Account")}`;
}

function moveFields(d) {
  const source = ledger.accounts.find((a) => a.id === d.accountId);
  const dest = ledger.accounts.find((a) => a.id === d.destinationAccountId);
  const atm = source?.type === "bank" && dest?.type === "cash";
  return `${accountSelect(d, "accountId", "From")}${accountSelect(d, "destinationAccountId", "To")}
    ${atm ? `<button class="chip ${d.transferKind === "atm" ? "on" : ""}" data-action="atm-toggle">${d.transferKind === "atm" ? "ATM withdrawal" : "Mark as ATM"}</button>` : ""}
    <p class="footnote">A move does not change spending or net worth. Pay card and cash advance are moves.</p>`;
}

function adjustFields(d) {
  return `${accountSelect(d, "accountId", "Account")}
    <div class="chips">
      <button class="chip ${d.adjustmentKind === "opening_balance" ? "on" : ""}" data-action="adj-kind" data-id="opening_balance">I already had this</button>
      <button class="chip ${d.adjustmentKind === "balance_adjustment" ? "on" : ""}" data-action="adj-kind" data-id="balance_adjustment">Correct the balance</button>
    </div>
    ${d.adjustmentKind === "balance_adjustment" ? `<div class="chips"><button class="chip ${d.adjustmentDirection !== "decrease" ? "on" : ""}" data-action="adj-dir" data-id="increase">Increase</button><button class="chip ${d.adjustmentDirection === "decrease" ? "on" : ""}" data-action="adj-dir" data-id="decrease">Decrease</button></div>` : ""}
    <p class="footnote">This corrects the balance. It will not appear as spending or income. If the missing money was a real purchase, record a Spend instead.</p>`;
}

function detailFields(d) {
  const account = ledger.accounts.find((a) => a.id === d.accountId);
  const methods = account ? legalMethods(account.type) : [];
  return `<input class="field" id="payee" placeholder="Payee" value="${$(d.payee || "")}" data-action="draft-text" data-key="payee">
    <input class="field" id="note" placeholder="Note" value="${$(d.note || "")}" data-action="draft-text" data-key="note">
    <input class="field" id="tags" placeholder="Tags, comma separated" value="${$( (d.tags || []).join(", ") )}" data-action="tags">
    ${methods.length ? `<label class="quiet">Payment method<select class="field" data-action="draft-method">${methods.map((m) => `<option value="${m}" ${d.paymentMethod === m ? "selected" : ""}>${methodLabel(m)}</option>`).join("")}</select></label>` : ""}
    ${d.type === "refund" ? `<label class="quiet">Original purchase, optional<select class="field" data-action="draft-text" data-key="linkedTransactionId"><option value="">Not linked</option>${ledger.transactions.filter((tx) => tx.type === "expense" && tx.id !== d.id).slice(-12).reverse().map((tx) => `<option value="${$(tx.id)}" ${d.linkedTransactionId === tx.id ? "selected" : ""}>${$(transactionTitle(ledger, tx))} · ${money(tx.amountMinor)}</option>`).join("")}</select></label>` : ""}
    ${d.type === "expense" && account?.type === "credit_card" ? `<button class="chip" data-action="draft-cat" data-id="fees">This is a card fee</button>` : ""}
    <label class="quiet">Receipt, optional, under 350 KB<input class="field" type="file" accept="image/*" data-action="file"></label>`;
}

function accountSelect(d, key, label) {
  const options = activeAccounts(ledger).map((a) => `<option value="${$(a.id)}" ${d[key] === a.id ? "selected" : ""}>${$(a.name)}</option>`).join("");
  return `<label class="quiet">${label}<select class="field" data-action="draft-account" data-key="${key}"><option value="">Choose</option>${options}</select></label>`;
}

function writeForm() {
  const parsed = ui.parsed;
  return `<div class="sheet" role="dialog" aria-label="Write a transaction"><div class="grabber"></div>
    <textarea class="field" id="write" aria-label="Sentence" placeholder="Spent ₹350 on dinner">${$(ui.write)}</textarea>
    <div class="links"><button class="text-btn" data-action="voice">Speak</button><button class="text-btn" data-action="form-mode">Form</button></div>
    ${parsed?.banner ? `<p class="banner">${$(parsed.banner)}</p>` : ""}
    ${parsed ? preview(parsed) : ""}
    <button class="primary" data-action="save-parsed" ${parsed?.canSave ? "" : "disabled"}>Save</button>
    <p class="footnote">Nothing is saved until you confirm. A guess is not a record.</p>
  </div>`;
}

function preview(parsed) {
  const account = ledger.accounts.find((a) => a.id === parsed.accountId);
  const category = categoryById(ledger, parsed.categoryId);
  const line = (label, value, uncertain) => `<div class="plain-row"><span>${label}</span><span class="${uncertain ? "quiet" : ""}">${value || "—"}</span></div>`;
  return `<div class="preview">
    ${line("Type", parsed.type ? typeLabel(parsed.type, parsed.transferKind) : "", parsed.uncertain.includes("type"))}
    ${line("Amount", parsed.amountMinor ? money(parsed.amountMinor) : "", !parsed.amountMinor)}
    ${line("Category", category?.name || (parsed.gaps.includes("category") ? "Needed" : ""), !parsed.categoryAccepted)}
    ${line("Date", parsed.occurredOn, !parsed.dateCertain)}
    ${line("Account", account?.name || "Needed", !parsed.accountCertain)}
    ${parsed.payee ? line("Payee", parsed.payee, false) : ""}
    ${parsed.destinationAccountId ? line("To", ledger.accounts.find((a) => a.id === parsed.destinationAccountId)?.name || "Needed", !parsed.destinationCertain) : ""}
  </div>
  ${parsed.categorySuggested && !parsed.categoryAccepted ? `<button class="chip" data-action="accept-cat">Use ${$(category?.name || "category")}</button>` : ""}
  ${categoryChoices(parsed)}`;
}

function accountForm() {
  const d = ui.draft;
  return `<div class="sheet" role="dialog" aria-label="Account"><div class="grabber"></div>
    <input class="field" id="acct-name" placeholder="Name" value="${$(d.name || "")}" data-action="draft-text" data-key="name">
    <label class="quiet">Type<select class="field" data-action="draft-text" data-key="type" ${d.hasHistory ? "disabled" : ""}>${ACCOUNT_TYPES.map((t) => `<option value="${t.id}" ${d.type === t.id ? "selected" : ""}>${t.label}</option>`).join("")}</select></label>
    ${d.type === "credit_card" ? `<input class="field" id="limit" inputmode="decimal" placeholder="Credit limit, optional" value="${$(d.limitText || "")}" data-action="draft-text" data-key="limitText">` : ""}
    ${["savings", "bank", "wallet"].includes(d.type) ? `<p class="plain-row"><span>Include in cash you have</span><button class="chip ${d.includeInSpendable ? "on" : ""}" data-action="draft-flag" data-key="includeInSpendable">${d.includeInSpendable ? "Yes" : "No"}</button></p>` : ""}
    ${d.hasHistory ? `<p class="footnote">This account already has transactions, so its type stays ${$(accountTypeLabel(d.type))}. Changing the type would change what the old rows mean.</p>` : ""}
    ${!d.id ? `<input class="field" id="opening" inputmode="decimal" placeholder="Opening balance, optional" value="${$(d.openingText || "")}" data-action="draft-text" data-key="openingText"><p class="footnote">An opening balance is not income. For a card, it is what you already owe.</p>` : ""}
    ${ui.formError ? `<p class="banner">${$(ui.formError)}</p>` : ""}
    <button class="primary" data-action="save-account">Save account</button>
  </div>`;
}

function capForm() {
  return `<div class="sheet"><div class="grabber"></div><h2 class="page">Spending cap</h2><input class="amount-input" id="cap" inputmode="decimal" value="${$(ui.draft.amountText || "")}" data-action="amount"><button class="primary" data-action="save-cap">Save cap</button><button class="text-btn" data-action="clear-cap">Remove cap</button></div>`;
}

function budgetForm() {
  const d = ui.draft;
  const cats = ledger.categories.filter((c) => c.kind === "expense" && !c.parentId && !c.archivedAt);
  return `<div class="sheet"><div class="grabber"></div>
    <label class="quiet">Category<select class="field" data-action="draft-text" data-key="categoryId">${cats.map((c) => `<option value="${c.id}" ${d.categoryId === c.id ? "selected" : ""}>${$(c.name)}</option>`).join("")}</select></label>
    <input class="amount-input" id="amount" inputmode="decimal" value="${$(d.amountText || "")}" data-action="amount">
    <button class="primary" data-action="save-budget">Save budget</button>
    ${d.id ? `<button class="text-btn danger" data-action="archive-budget" data-id="${$(d.id)}">Archive</button>` : ""}
  </div>`;
}

function ruleForm() {
  const d = ui.draft;
  const kind = d.type === "income" ? "income" : "expense";
  const cats = ledger.categories.filter((c) => c.kind === kind && !c.archivedAt);
  return `<div class="sheet"><div class="grabber"></div>
    <input class="field" id="payee" placeholder="Name" value="${$(d.payee || "")}" data-action="draft-text" data-key="payee">
    <div class="amount-row"><span class="rupee" aria-hidden="true">₹</span><input class="amount-input" id="amount" inputmode="decimal" aria-label="Amount" value="${$(d.amountText || "")}" data-action="amount"></div>
    <label class="quiet">Type<select class="field" data-action="draft-text" data-key="type"><option value="expense" ${d.type !== "income" ? "selected" : ""}>Spend</option><option value="income" ${d.type === "income" ? "selected" : ""}>Receive</option></select></label>
    <label class="quiet">Category<select class="field" data-action="draft-text" data-key="categoryId">${cats.map((c) => `<option value="${$(c.id)}" ${d.categoryId === c.id ? "selected" : ""}>${$(c.parentId ? "· " : "")}${$(c.name)}</option>`).join("")}</select></label>
    ${accountSelect(d, "accountId", "Account")}
    <label class="quiet">Repeats<select class="field" data-action="draft-text" data-key="frequency">${["daily", "weekly", "monthly", "yearly"].map((f) => `<option value="${f}" ${d.frequency === f ? "selected" : ""}>${f}</option>`).join("")}</select></label>
    <label class="quiet">Every<input class="field" id="interval" inputmode="numeric" value="${$(d.interval || 1)}" data-action="draft-text" data-key="interval"></label>
    <p class="footnote">1 is every month, week, or year. 3 is every third one. A yearly premium can also be every 12 months.</p>
    <label class="quiet">Next date<input class="field" id="date" type="date" value="${$(d.startOn || today())}" data-action="draft-text" data-key="startOn"></label>
    <p class="plain-row"><span>Paused</span><button class="chip ${d.paused ? "on" : ""}" data-action="draft-flag" data-key="paused">${d.paused ? "Yes" : "No"}</button></p>
    <p class="plain-row"><span>Post without asking</span><button class="chip ${d.autoPost ? "on" : ""}" data-action="draft-flag" data-key="autoPost">${d.autoPost ? "On" : "Off"}</button></p>
    ${d.autoPost ? `<p class="banner">This will post on the due date without a confirm. It still will not post the same date twice.</p>` : ""}
    ${ui.formError ? `<p class="banner">${$(ui.formError)}</p>` : ""}
    <button class="primary" data-action="save-rule">Save rule</button>
    <p class="footnote">Editing this rule does not rewrite rows you already confirmed.</p>
  </div>`;
}

function categoryForm() {
  const d = ui.draft;
  const parents = ledger.categories.filter((c) => c.kind === (d.kind || "expense") && !c.parentId && c.id !== d.id && !c.archivedAt);
  return `<div class="sheet"><div class="grabber"></div>
    <input class="field" id="cat-name" placeholder="Name" value="${$(d.name || "")}" data-action="draft-text" data-key="name">
    <label class="quiet">Kind<select class="field" data-action="draft-text" data-key="kind"><option value="expense" ${d.kind !== "income" ? "selected" : ""}>Spending</option><option value="income" ${d.kind === "income" ? "selected" : ""}>Income</option></select></label>
    <label class="quiet">Parent, optional<select class="field" data-action="draft-text" data-key="parentId"><option value="">None</option>${parents.map((c) => `<option value="${$(c.id)}" ${d.parentId === c.id ? "selected" : ""}>${$(c.name)}</option>`).join("")}</select></label>
    <div class="chips">${PALETTE.map((color) => `<button class="chip ${d.color === color ? "on" : ""}" data-action="draft-text" data-key="color" data-id="${color}">${color}</button>`).join("")}</div>
    ${ui.formError ? `<p class="banner">${$(ui.formError)}</p>` : ""}
    <button class="primary" data-action="save-category">Save category</button>
    ${d.id ? `<button class="text-btn" data-action="archive-category" data-id="${$(d.id)}">${d.archivedAt ? "Restore" : "Archive"}</button>` : ""}
  </div>`;
}

function filterForm() {
  const f = ui.filters;
  return `<div class="sheet"><div class="grabber"></div>
    <label class="quiet">Type<select class="field" data-action="filter" data-key="type">${opt(f.type, [["", "Any"], ["expense", "Spend"], ["income", "Receive"], ["transfer", "Move"], ["refund", "Refund"], ["adjustment", "Adjust"], ["reimbursement", "Reimbursement"]])}</select></label>
    <label class="quiet">Account<select class="field" data-action="filter" data-key="accountId">${opt(f.accountId, [["", "Any"], ...ledger.accounts.map((a) => [a.id, a.name])])}</select></label>
    <label class="quiet">Category<select class="field" data-action="filter" data-key="categoryId">${opt(f.categoryId, [["", "Any"], ...ledger.categories.filter((c) => !c.parentId).map((c) => [c.id, c.name])])}</select></label>
    <label class="quiet">Payment method<select class="field" data-action="filter" data-key="paymentMethod">${opt(f.paymentMethod, [["", "Any"], ["upi", "UPI"], ["cash", "Cash"], ["debit_card", "Debit card"], ["credit_card", "Credit card"], ["bank_transfer", "Bank transfer"], ["wallet", "Wallet"], ["cheque", "Cheque"], ["other", "Other"]])}</select></label>
    <div class="chips"><button class="chip" data-action="filter-period" data-id="period">This period</button><button class="chip" data-action="filter-period" data-id="previous">Previous period</button><button class="chip" data-action="filter-period" data-id="month">This month</button></div>
    <label class="quiet">From<input class="field" type="date" value="${$(f.start || "")}" data-action="filter" data-key="start"></label>
    <label class="quiet">To<input class="field" type="date" value="${$(f.end || "")}" data-action="filter" data-key="end"></label>
    <button class="primary" data-action="close-sheet">Apply</button>
    <button class="text-btn" data-action="reset-filters">Clear</button>
  </div>`;
}

function dialog() {
  const d = ui.dialog;
  return `<div class="dialog" role="dialog" aria-modal="true"><h2 class="page">${$(d.title)}</h2><p>${$(d.body)}</p>
    ${d.field ? d.field : ""}
    <button class="primary" data-action="${$(d.confirm)}">${$(d.confirmLabel || "Confirm")}</button>
    ${d.alt ? `<button class="text-btn" data-action="${$(d.alt)}">${$(d.altLabel || "Other")}</button>` : ""}
    <button class="text-btn" data-action="close-dialog">Cancel</button>
  </div>`;
}

function opt(current, pairs) {
  return pairs.map(([value, label]) => `<option value="${$(value)}" ${String(current ?? "") === String(value) ? "selected" : ""}>${$(label)}</option>`).join("");
}

function toggleRow(label, key) {
  const on = ledger.settings[key];
  return `<p class="plain-row"><span>${label}</span><button class="chip ${on ? "on" : ""}" data-action="toggle" data-key="${key}">${on ? "On" : "Off"}</button></p>`;
}

function top(title, sub) {
  return `<div class="word">${$(title)}</div><div class="period">${$(sub || "")}</div>`;
}

function back(href, title) {
  return `<button class="back" data-action="go" data-href="${href}">Back</button><h2 class="page">${$(title)}</h2>`;
}

function icon(name) {
  const paths = {
    home: "M4 10.5 12 4l8 6.5V20H4z",
    list: "M5 7h14M5 12h14M5 17h14",
    plus: "M12 5v14M5 12h14",
    insight: "M12 4v8M12 16h.01",
    more: "M6 12h.01M12 12h.01M18 12h.01",
    move: "M7 7h10M7 12h10M7 17h10",
    account: "M5 8h14v8H5z",
    dot: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  };
  return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${paths[name] || paths.dot}"></path></svg>`;
}

function canSaveDraft(d) {
  if (!d || !parseExpression(d.amountText || "").minor) return false;
  if (!ledger.categories.some((c) => !c.archivedAt)) return false;
  if (!d.accountId && d.type !== "transfer") return false;
  if (["expense", "income", "refund", "reimbursement"].includes(d.type) && !d.categoryId) return false;
  if (d.type === "transfer" && (!d.accountId || !d.destinationAccountId || d.accountId === d.destinationAccountId)) return false;
  if (d.type === "adjustment" && !d.adjustmentKind) return false;
  return true;
}

function composerTypes(d) {
  const types = ["expense", "income", "transfer"];
  if (d.full) types.push("refund", "reimbursement");
  if (d.type === "adjustment" || d.originalType === "adjustment" || d.fromAccount) types.push("adjustment");
  return types;
}

function methodForAccount(account, explicit) {
  if (!account) return explicit || null;
  const legal = legalMethods(account.type);
  if (explicit && legal.includes(explicit)) return explicit;
  const remembered = ledger.settings.lastMethods?.[account.id];
  if (remembered && legal.includes(remembered)) return remembered;
  return defaultMethod(account.type);
}

function activityEmpty() {
  const filtered = Boolean(ui.filters.text || ui.filters.type || ui.filters.accountId || ui.filters.categoryId || ui.filters.paymentMethod || ui.filters.start || ui.filters.end || route().params.get("uncategorized"));
  if (!filtered && !ledger.transactions.length) return `<p class="empty">Nothing recorded yet.</p><button class="primary" data-action="add">Add an expense</button>`;
  return `<p class="empty">No transactions match.</p>${filtered ? `<button class="text-btn" data-action="reset-filters">Clear filters</button>` : ""}`;
}

function ruleWhen(rule) {
  const step = Number(rule.interval) || 1;
  if (step <= 1) return rule.frequency;
  const unit = { daily: "days", weekly: "weeks", monthly: "months", yearly: "years" }[rule.frequency] || rule.frequency;
  return `every ${step} ${unit}`;
}

function draftFromTx(tx, full = true) {
  return {
    ...tx,
    full,
    mode: "form",
    originalType: tx.type,
    amountText: (tx.amountMinor / 100).toString(),
    details: true,
    tags: tx.tags || [],
    adjustmentKind: tx.adjustmentKind || "balance_adjustment",
    adjustmentDirection: tx.adjustmentDirection || "decrease",
  };
}

function blankDraft(type = "expense") {
  const lastCat = type === "income" ? ledger.settings.lastIncomeCategoryId : ledger.settings.lastExpenseCategoryId;
  const hasSaved = ledger.transactions.some((tx) => tx.type === "expense" && tx.source !== "adjustment");
  const accountId = ledger.settings.lastAccountId || ledger.settings.defaultAccountId || activeAccounts(ledger).find((a) => a.includeInSpendable)?.id || activeAccounts(ledger)[0]?.id || "";
  return {
    id: id("tx"),
    type,
    full: false,
    mode: "form",
    amountText: "",
    accountId,
    destinationAccountId: "",
    categoryId: hasSaved ? lastCat : null,
    payee: "",
    note: "",
    tags: [],
    occurredOn: today(),
    paymentMethod: methodForAccount(ledger.accounts.find((a) => a.id === accountId)),
    adjustmentKind: "balance_adjustment",
    adjustmentDirection: "decrease",
    details: false,
    source: "manual",
    status: "posted",
  };
}

function openAdd() {
  if (!ledger.categories.some((c) => c.kind === "expense" && !c.archivedAt)) {
    ui.dialog = {
      title: "Categories are missing",
      body: "Daybook cannot file a spend without a category. Restore the defaults. Transactions already saved stay.",
      confirm: "restore-categories",
      confirmLabel: "Restore categories",
    };
    render();
    return;
  }
  ui.draft = blankDraft();
  ui.sheet = "add";
  ui.formError = "";
  render();
}

function closeSheet() {
  if (ui.sheet === "add" && !ledger.settings.coachDismissed) {
    ledger.settings.coachDismissed = true;
    save();
  }
  ui.sheet = null;
  render();
}

function restoreCategories() {
  const have = new Set(ledger.categories.map((c) => c.id));
  for (const cat of freshLedger().categories) {
    if (!have.has(cat.id)) ledger.categories.push(cat);
  }
  ui.dialog = null;
  save();
  showSnack("Categories restored");
}

function readDraft() {
  const d = ui.draft;
  const parsed = parseExpression(d.amountText || "");
  const account = ledger.accounts.find((a) => a.id === d.accountId);
  const dest = ledger.accounts.find((a) => a.id === d.destinationAccountId);
  return {
    id: d.id,
    type: d.type,
    status: d.status || "posted",
    amountMinor: parsed.minor || 0,
    currency: account?.currency || "INR",
    accountId: d.accountId,
    destinationAccountId: d.type === "transfer" ? d.destinationAccountId : null,
    categoryId: ["expense", "income", "refund", "reimbursement"].includes(d.type) ? d.categoryId : null,
    payee: d.payee || "",
    note: d.note || "",
    tags: d.tags || [],
    occurredOn: d.occurredOn || today(),
    occurredTime: d.occurredTime || null,
    paymentMethod: methodForAccount(account, d.paymentMethod),
    adjustmentKind: d.type === "adjustment" ? d.adjustmentKind : null,
    adjustmentDirection: d.type === "adjustment" ? (d.adjustmentKind === "opening_balance" ? "increase" : d.adjustmentDirection) : null,
    transferKind: d.type === "transfer" ? transferKindFor(account, dest, d.transferKind) : null,
    linkedTransactionId: d.linkedTransactionId || null,
    recurringRuleId: d.recurringRuleId || null,
    occurrenceOn: d.occurrenceOn || null,
    templateId: d.templateId || null,
    source: d.source || "manual",
    attachment: d.attachment || null,
    createdAt: d.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function ensureCash() {
  if (ledger.accounts.some((a) => a.type === "cash" && !a.archivedAt)) return;
  ledger.accounts.push({
    id: id("acct"), name: "Cash", type: "cash", currency: "INR", creditLimitMinor: null,
    includeInSpendable: true, includeInNetWorth: true, archivedAt: null, aliases: ["cash"],
    isPrimary: ledger.accounts.length === 0, displayOrder: ledger.accounts.length,
  });
}

app.addEventListener("click", async (event) => {
  const el = event.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  const dataId = el.dataset.id;
  if (action === "go") go(el.dataset.href);
  else if (action === "add") openAdd();
  else if (action === "close-sheet") closeSheet();
  else if (action === "close-dialog") { ui.dialog = null; render(); }
  else if (action === "preset") { ui.preset = dataId; render(); }
  else if (action === "toggle-explain") { ui.explain = !ui.explain; render(); }
  else if (action === "undo" && ui.undo) { ui.undo(); ui.undo = null; ui.snack = null; save(); render(); }
  else if (action === "draft-type") { ui.draft.type = dataId; if (dataId === "adjustment") ui.draft.adjustmentKind = ui.draft.adjustmentKind || "balance_adjustment"; render(); }
  else if (action === "full-types") { ui.draft.full = true; render(); }
  else if (action === "atm-toggle") { ui.draft.transferKind = ui.draft.transferKind === "atm" ? "standard" : "atm"; render(); }
  else if (action === "draft-text" && el.dataset.id && ui.draft) { ui.draft[el.dataset.key] = el.dataset.id; render(); }
  else if (action === "draft-cat") { ui.draft.categoryId = dataId; ui.categoryAccepted = true; render(); }
  else if (action === "more-cats") { ui.draft.moreCats = !ui.draft.moreCats; render(); }
  else if (action === "toggle-details") { ui.draft.details = !ui.draft.details; render(); }
  else if (action === "write-mode") { ui.draft.mode = "write"; ui.sheet = "add"; refreshParse(); render(); }
  else if (action === "form-mode") { ui.draft.mode = "form"; render(); }
  else if (action === "calc") { ui.draft.amountText = `${ui.draft.amountText || ""}${el.dataset.id === "−" ? "-" : el.dataset.id === "×" ? "×" : el.dataset.id}`; render(); }
  else if (action === "adj-kind") { ui.draft.adjustmentKind = dataId; render(); }
  else if (action === "adj-dir") { ui.draft.adjustmentDirection = dataId; render(); }
  else if (action === "save-tx") saveTx();
  else if (action === "save-parsed") saveParsed();
  else if (action === "accept-cat") { acceptParsedCategory(ui.parsed?.categoryId); render(); }
  else if (action === "pick-parsed-cat") { acceptParsedCategory(dataId); render(); }
  else if (action === "edit") { const tx = ledger.transactions.find((t) => t.id === dataId); ui.draft = draftFromTx(tx); ui.sheet = "edit"; ui.formError = ""; render(); }
  else if (action === "duplicate") duplicate(dataId);
  else if (action === "delete-tx") deleteTx(dataId);
  else if (action === "confirm-pending") { confirmPending(ledger, dataId); save(); showSnack("Confirmed"); }
  else if (action === "skip-pending") { skipPending(ledger, dataId); save(); showSnack("Skipped"); }
  else if (action === "edit-account") openAccount(dataId);
  else if (action === "save-account") saveAccount();
  else if (action === "archive") archiveAccount(dataId);
  else if (action === "unarchive") { const a = ledger.accounts.find((x) => x.id === dataId); if (a) a.archivedAt = null; save(); render(); }
  else if (action === "adjust") { ui.draft = blankDraft("adjustment"); ui.draft.accountId = dataId; ui.draft.fromAccount = true; ui.draft.full = true; ui.sheet = "add"; render(); }
  else if (action === "edit-cap") { ui.draft = { amountText: ledger.settings.periodCapMinor ? String(ledger.settings.periodCapMinor / 100) : "" }; ui.sheet = "cap"; render(); }
  else if (action === "save-cap") saveCap();
  else if (action === "clear-cap") { ledger.settings.periodCapMinor = null; ui.sheet = null; save(); render(); }
  else if (action === "edit-budget") openBudget(dataId);
  else if (action === "save-budget") saveBudget();
  else if (action === "archive-budget") { const b = ledger.budgets.find((x) => x.id === dataId); if (b) b.archivedAt = new Date().toISOString(); ui.sheet = null; save(); render(); }
  else if (action === "edit-rule") openRule(dataId);
  else if (action === "save-rule") saveRule();
  else if (action === "rule-also-pending") saveRule(true);
  else if (action === "rule-future-only") saveRule(false);
  else if (action === "restore-categories") restoreCategories();
  else if (action === "edit-category") openCategory(dataId);
  else if (action === "save-category") saveCategory();
  else if (action === "archive-category") toggleCategory(dataId);
  else if (action === "merge-category") askMerge(dataId);
  else if (action === "do-merge") doMerge();
  else if (action === "template-from") saveTemplate(dataId);
  else if (action === "use-template") useTemplate(dataId);
  else if (action === "filter-sheet") { ui.sheet = "filter"; render(); }
  else if (action === "sort") { ui.filters.sort = dataId; render(); }
  else if (action === "clear-filter") { delete ui.filters[dataId]; render(); }
  else if (action === "reset-filters") { ui.filters = {}; ui.sheet = null; if (location.hash.includes("?")) go("#/activity"); render(); }
  else if (action === "dismiss") { ledger.dismissedInsights.push(dataId); save(); render(); }
  else if (action === "toggle") { ledger.settings[el.dataset.key] = !ledger.settings[el.dataset.key]; save(); render(); }
  else if (action === "reveal") { ui.reveal = !ui.reveal; render(); }
  else if (action === "draft-flag") { ui.draft[el.dataset.key] = !ui.draft[el.dataset.key]; render(); }
  else if (action === "save-backup") await saveBackup();
  else if (action === "pick-restore") document.querySelector("#restore-file")?.click();
  else if (action === "export-csv") downloadText(`daybook-${today()}.csv`, toCsv(ledger), "text/csv");
  else if (action === "confirm-restore") confirmRestore();
  else if (action === "setup-lock") { ui.lockMode = "setup"; ui.pin = ""; ui.sheet = null; ui.dialog = { title: "Choose a PIN", body: "At least 4 digits. This does not encrypt the ledger.", confirm: "set-pin", confirmLabel: "Continue", field: `<input class="field" id="new-pin" inputmode="numeric" aria-label="New PIN">` }; render(); }
  else if (action === "set-pin") await setPin();
  else if (action === "unlock") await unlock();
  else if (action === "disable-lock") { ledger.settings.appLockEnabled = false; ledger.settings.pinHash = null; save(); render(); }
  else if (action === "recover") { ui.dialog = { title: "Recovery code", body: "Enter the code shown when you set the PIN. If it matches, the lock opens. It still does not decrypt anything, because the file was never encrypted.", confirm: "use-recovery", confirmLabel: "Unlock", field: `<input class="field" id="recovery" aria-label="Recovery code">` }; render(); }
  else if (action === "use-recovery") await useRecovery();
  else if (action === "erase") { ui.dialog = { title: "Erase ledger", body: "This deletes the books in this browser. It cannot recall a file you already saved. Type ERASE to continue.", confirm: "do-erase", confirmLabel: "Erase", field: `<input class="field" id="erase" aria-label="Type ERASE">` }; render(); }
  else if (action === "do-erase") doErase();
  else if (action === "notify-permission") notifyPermission();
  else if (action === "onboard-next") { ui.step = 2; render(); }
  else if (action === "onboard-skip") { ui.step += 1; if (ui.step > 3) finishOnboarding(""); render(); }
  else if (action === "onboard-payday") {
    const day = Number(document.querySelector("#payday-setup")?.value);
    if (day >= 1 && day <= 31) { ledger.settings.paydayMode = "day"; ledger.settings.paydayDay = day; }
    ui.step = 3; render();
  }
  else if (action === "onboard-finish") finishOnboarding(document.querySelector("#bank-name")?.value || "");
  else if (action === "voice") startVoice();
  else if (action === "do-reassign") doReassign();
  else if (action === "ask-reassign") askReassign(dataId);
  else if (action === "do-archive") doArchive();
  else if (action === "undo-restore") undoRestore();
  else if (action === "delete-template") { ledger.templates = ledger.templates.filter((t) => t.id !== dataId); save(); showSnack("Template deleted"); }
  else if (action === "delete-rule") deleteRule(dataId);
  else if (action === "filter-period") {
    const range = rangeFor(dataId, today(), ledger.settings);
    ui.filters.start = range.start;
    ui.filters.end = range.end;
    ui.sheet = null;
    render();
  }
});

app.addEventListener("input", (event) => {
  const el = event.target;
  const action = el.dataset.action;
  if (action === "amount" && ui.draft) { ui.draft.amountText = el.value; if (el.value && ui.draft.type === "expense" && !ledger.settings.coachDismissed) { ledger.settings.coachDismissed = true; save(); } const parsed = parseExpression(el.value); ui.formError = el.value && parsed.error ? parsed.error : ""; render(); }
  else if (action === "search") { ui.filters.text = el.value; render(); }
  else if (action === "draft-text" && ui.draft) { ui.draft[el.dataset.key] = el.dataset.id || el.value; }
  else if (action === "tags" && ui.draft) ui.draft.tags = el.value.split(",").map((t) => t.trim()).filter(Boolean);
  else if (action === "write" || el.id === "write") { ui.write = el.value; refreshParse(); render(); }
  else if (action === "pin") ui.pin = el.value;
  else if (action === "payday") {
    const day = Number(el.value);
    if (day >= 1 && day <= 31) { ledger.settings.paydayMode = "day"; ledger.settings.paydayDay = day; save(); }
  }
  else if (action === "filter") { ui.filters[el.dataset.key] = el.value; }
});

app.addEventListener("change", (event) => {
  const el = event.target;
  if (el.dataset.action === "setting") {
    ledger.settings[el.dataset.key] = el.value || null;
    if (el.dataset.key === "paydayMode" && el.value === "none") ledger.settings.paydayDay = null;
    save(); render();
  } else if (el.dataset.action === "draft-account" && ui.draft) {
    ui.draft[el.dataset.key] = el.value;
    const account = ledger.accounts.find((a) => a.id === ui.draft.accountId);
    ui.draft.paymentMethod = methodForAccount(account);
    render();
  } else if (el.dataset.action === "draft-method" && ui.draft) ui.draft.paymentMethod = el.value;
  else if (el.dataset.action === "draft-text" && ui.draft) {
    ui.draft[el.dataset.key] = el.value;
    if (el.dataset.key === "type" && ui.sheet === "account") {
      ui.draft.includeInSpendable = el.value === "bank" || el.value === "wallet" || el.value === "cash";
    }
    render();
  }
  else if (el.dataset.action === "file") readFile(el.files?.[0]);
  else if (el.id === "restore-file") readRestore(el.files?.[0]);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { ui.sheet = null; ui.dialog = null; render(); }
});

function refreshParse() {
  ui.parsed = parseSentence(ui.write, {
    today: today(),
    accounts: ledger.accounts,
    rules: ledger.parserRules,
    defaultAccountId: ledger.settings.defaultAccountId,
  });
}


function categoryChoices(parsed) {
  if (!parsed.type || parsed.type === "transfer" || parsed.type === "adjustment") return "";
  const kind = parsed.type === "income" || parsed.type === "reimbursement" ? "income" : "expense";
  const cats = ledger.categories.filter((c) => c.kind === kind && !c.archivedAt && !c.parentId).slice(0, 8);
  if (!cats.length) return "";
  return `<div class="chips">${cats.map((c) => `<button class="chip ${parsed.categoryAccepted && parsed.categoryId === c.id ? "on" : ""}" data-action="pick-parsed-cat" data-id="${$(c.id)}">${$(c.name)}</button>`).join("")}</div>`;
}

function parsedCanSave(parsed) {
  return Boolean(
    parsed.amountMinor && parsed.type && parsed.accountId
    && !parsed.gaps.includes("destination") && !parsed.gaps.includes("account") && !parsed.gaps.includes("type")
    && (parsed.type === "transfer" || parsed.categoryAccepted)
  );
}

function acceptParsedCategory(categoryId) {
  if (!ui.parsed || !categoryId) return;
  ui.parsed.categoryId = categoryId;
  ui.parsed.categoryAccepted = true;
  ui.parsed.categorySuggested = true;
  ui.parsed.gaps = ui.parsed.gaps.filter((g) => g !== "category");
  ui.parsed.canSave = parsedCanSave(ui.parsed);
  learnRule();
}

function learnRule() {
  const payee = (ui.parsed?.payee || "").toLowerCase();
  if (!payee || !ui.parsed?.categoryId) return;
  ledger.parserRules = ledger.parserRules.filter((rule) => rule.pattern !== payee);
  ledger.parserRules.push({ pattern: payee, categoryId: ui.parsed.categoryId, type: ui.parsed.type });
}

function deleteRule(ruleId) {
  ledger.recurring = ledger.recurring.filter((rule) => rule.id !== ruleId);
  ledger.transactions = ledger.transactions.filter((tx) => !(tx.recurringRuleId === ruleId && tx.status === "pending"));
  save();
  showSnack("Rule deleted. Confirmed rows stay.");
}

function saveTx() {
  const tx = readDraft();
  if (tx.occurredOn > addDays(today(), 370) && !ui.draft.farDateOk) {
    ui.draft.farDateOk = true;
    ui.formError = "That date is more than a year ahead. Save again if that is what you meant.";
    render();
    return;
  }
  const errors = validateTransaction(ledger, tx, ledger.transactions.some((row) => row.id === tx.id) ? tx.id : null);
  if (errors.length) { ui.formError = errors[0]; render(); return; }
  const index = ledger.transactions.findIndex((row) => row.id === tx.id);
  const previous = index >= 0 ? structuredClone(ledger.transactions[index]) : null;
  if (index >= 0) ledger.transactions[index] = tx;
  else ledger.transactions.push(tx);
  if (tx.type === "expense" && tx.categoryId) ledger.settings.lastExpenseCategoryId = tx.categoryId;
  if (tx.type === "income" && tx.categoryId) ledger.settings.lastIncomeCategoryId = tx.categoryId;
  ledger.settings.lastAccountId = tx.accountId;
  if (tx.type === "expense") ledger.settings.coachDismissed = true;
  if (tx.paymentMethod && tx.accountId && tx.type !== "adjustment") {
    ledger.settings.lastMethods = ledger.settings.lastMethods || {};
    ledger.settings.lastMethods[tx.accountId] = tx.paymentMethod;
  }
  ui.sheet = null;
  save();
  const account = ledger.accounts.find((a) => a.id === tx.accountId);
  const owed = account ? position(ledger, account) : 0;
  const over = account?.type === "credit_card" && account.creditLimitMinor != null && owed > account.creditLimitMinor;
  const filed = categoryById(ledger, tx.categoryId);
  const where = filed ? ` to ${filed.name}` : "";
  showSnack(over ? `Saved ${money(tx.amountMinor)}${where}. Over the limit you set.` : `Saved ${money(tx.amountMinor)}${where}.`, () => {
    if (previous) {
      const at = ledger.transactions.findIndex((row) => row.id === tx.id);
      if (at >= 0) ledger.transactions[at] = previous;
    } else {
      ledger.transactions = ledger.transactions.filter((row) => row.id !== tx.id);
    }
  });
}

function saveParsed() {
  const parsed = ui.parsed;
  if (!parsed?.canSave) return;
  ui.draft = blankDraft(parsed.type === "income" ? "income" : "expense");
  ui.draft.type = parsed.type;
  ui.draft.amountText = String(parsed.amountMinor / 100);
  ui.draft.accountId = parsed.accountId;
  ui.draft.destinationAccountId = parsed.destinationAccountId;
  ui.draft.categoryId = parsed.categoryId;
  ui.draft.payee = parsed.payee;
  ui.draft.occurredOn = parsed.occurredOn;
  ui.draft.paymentMethod = parsed.paymentMethod;
  ui.draft.transferKind = parsed.transferKind;
  ui.draft.source = "parser";
  ui.draft.note = parsed.raw;
  saveTx();
}

function duplicate(txId) {
  const tx = ledger.transactions.find((row) => row.id === txId);
  if (!tx) return;
  ui.draft = draftFromTx({ ...tx, id: id("tx"), occurredOn: today(), occurredTime: null, source: "manual", status: "posted", recurringRuleId: null, occurrenceOn: null, linkedTransactionId: null });
  ui.sheet = "edit";
  render();
}

function deleteTx(txId) {
  const tx = ledger.transactions.find((row) => row.id === txId);
  if (!tx) return;
  const copy = structuredClone(tx);
  ledger.transactions = ledger.transactions.filter((row) => row.id !== txId);
  if (tx.status === "pending" && tx.recurringRuleId) ledger.skippedOccurrences.push(`${tx.recurringRuleId}:${tx.occurrenceOn}`);
  save();
  go("#/activity");
  showSnack(`${typeLabel(tx.type, tx.adjustmentKind || tx.transferKind)} deleted.`, () => { ledger.transactions.push(copy); });
}

function openAccount(accountId) {
  const existing = ledger.accounts.find((a) => a.id === accountId);
  ui.draft = existing ? {
    ...existing,
    limitText: existing.creditLimitMinor ? String(existing.creditLimitMinor / 100) : "",
    hasHistory: ledger.transactions.some((tx) => tx.accountId === existing.id || tx.destinationAccountId === existing.id),
  } : {
    name: "", type: "bank", includeInSpendable: true, limitText: "", openingText: "", hasHistory: false,
  };
  ui.formError = "";
  ui.sheet = "account";
  render();
}

function saveAccount() {
  const d = ui.draft;
  if (!d.name?.trim()) { ui.formError = "Name the account."; render(); return; }
  let account = ledger.accounts.find((a) => a.id === d.id);
  if (!account) {
    account = {
      id: id("acct"), name: d.name.trim(), type: d.type, currency: "INR",
      includeInNetWorth: true, archivedAt: null, aliases: [d.name.trim().toLowerCase()],
      isPrimary: ledger.accounts.length === 0, displayOrder: ledger.accounts.length,
    };
    ledger.accounts.push(account);
  }
  account.name = d.name.trim();
  if (!ledger.transactions.some((tx) => tx.accountId === account.id || tx.destinationAccountId === account.id)) account.type = d.type;
  if (account.type === "credit_card" || account.type === "investment") account.includeInSpendable = false;
  else if (account.type === "savings") account.includeInSpendable = d.includeInSpendable === true;
  else account.includeInSpendable = d.includeInSpendable !== false;
  if (account.type === "credit_card") {
    account.includeInSpendable = false;
    const limit = parseExpression(d.limitText || "");
    account.creditLimitMinor = d.limitText ? limit.minor || null : account.creditLimitMinor;
  }
  if (d.openingText) {
    const opening = parseExpression(d.openingText);
    if (opening.error) { ui.formError = opening.error; render(); return; }
    const row = {
      id: id("tx"), type: "adjustment", adjustmentKind: "opening_balance", adjustmentDirection: "increase",
      accountId: account.id, amountMinor: opening.minor, occurredOn: today(), currency: "INR", status: "posted",
      categoryId: null, payee: "", note: "", tags: [], source: "adjustment", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const errors = validateTransaction(ledger, row);
    if (errors.length) { ui.formError = errors[0]; render(); return; }
    ledger.transactions.push(row);
  }
  if (!ledger.settings.defaultAccountId && account.includeInSpendable) ledger.settings.defaultAccountId = account.id;
  ui.sheet = null;
  save();
  showSnack("Account saved");
}

function archiveAccount(accountId) {
  const assets = activeAccounts(ledger).filter((a) => a.type !== "credit_card");
  const account = ledger.accounts.find((a) => a.id === accountId);
  if (!account) return;
  if (assets.length === 1 && assets[0].id === accountId) {
    ui.formError = "Keep at least one asset account. Cash can always be recreated.";
    render();
    return;
  }
  ui.dialog = { title: "Archive account", body: `${account.name} will leave the pickers. Old transactions keep the name. This does not delete those rows.`, confirm: "do-archive", confirmLabel: "Archive", fromId: accountId };
  render();
}

function doArchive() {
  const account = ledger.accounts.find((a) => a.id === ui.dialog?.fromId);
  if (account) account.archivedAt = new Date().toISOString();
  ui.dialog = null;
  save();
  showSnack("Archived. History keeps the name.");
}

function askReassign(accountId) {
  const account = ledger.accounts.find((a) => a.id === accountId);
  if (!account) return;
  const used = canDeleteAccount(ledger, accountId).used;
  if (!used) {
    ui.dialog = { title: "Remove account", body: `${account.name} has no transactions. Removing it cannot be undone from the list.`, confirm: "do-reassign", confirmLabel: "Remove", fromId: accountId, field: "" };
    ui.dialog.removeEmpty = true;
    render();
    return;
  }
  const options = ledger.accounts.filter((a) => a.id !== accountId && !a.archivedAt && (a.type === "credit_card") === (account.type === "credit_card"))
    .map((a) => `<option value="${$(a.id)}">${$(a.name)}</option>`).join("");
  if (!options) { ui.formError = "Add another account of the same kind before moving this history."; render(); return; }
  ui.dialog = { title: "Move history", body: "Every transaction on this account moves to the account you pick. A card's history can only move to another card.", confirm: "do-reassign", confirmLabel: "Move", fromId: accountId, field: `<select class="field" id="reassign">${options}</select>` };
  render();
}

function saveCap() {
  const parsed = parseExpression(ui.draft.amountText || "");
  if (parsed.error) { ui.formError = parsed.error; render(); return; }
  ledger.settings.periodCapMinor = parsed.minor;
  ui.sheet = null;
  save();
  render();
}

function openBudget(budgetId) {
  const existing = ledger.budgets.find((b) => b.id === budgetId);
  ui.draft = existing ? { ...existing, amountText: String(existing.amountMinor / 100) } : {
    categoryId: "food", amountText: "",
  };
  ui.sheet = "budget";
  render();
}

function saveBudget() {
  const parsed = parseExpression(ui.draft.amountText || "");
  if (parsed.error) { ui.formError = parsed.error; render(); return; }
  if (ui.draft.id) {
    const budget = ledger.budgets.find((b) => b.id === ui.draft.id);
    budget.amountMinor = parsed.minor;
    budget.categoryId = ui.draft.categoryId;
  } else {
    ledger.budgets.push({ id: id("bud"), categoryId: ui.draft.categoryId, amountMinor: parsed.minor, archivedAt: null });
  }
  ui.sheet = null;
  save();
  render();
}

function openRule(ruleId) {
  const existing = ledger.recurring.find((r) => r.id === ruleId);
  ui.draft = existing ? { ...existing, amountText: String(existing.amountMinor / 100), interval: existing.interval || 1 } : {
    payee: "", amountText: "", accountId: ledger.settings.defaultAccountId || "", frequency: "monthly", interval: 1, startOn: today(), paused: false, type: "expense", categoryId: "home.rent",
  };
  ui.sheet = "rule";
  render();
}

function saveRule(applyPending) {
  const parsed = parseExpression(ui.draft.amountText || "");
  if (parsed.error || !ui.draft.accountId || !ui.draft.categoryId) { ui.formError = parsed.error || "Choose an account and a category."; render(); return; }
  const account = ledger.accounts.find((a) => a.id === ui.draft.accountId);
  const startOn = ui.draft.startOn || today();
  let nextOn = ui.draft.id ? (ui.draft.nextOn || startOn) : startOn;
  if (nextOn < startOn) nextOn = startOn;
  const row = {
    id: ui.draft.id || id("rule"),
    type: ui.draft.type || "expense",
    amountMinor: parsed.minor,
    accountId: ui.draft.accountId,
    categoryId: ui.draft.categoryId,
    payee: ui.draft.payee || "Repeating",
    paymentMethod: methodForAccount(account),
    frequency: ui.draft.frequency || "monthly",
    interval: Math.max(1, Number(ui.draft.interval) || 1),
    startOn,
    nextOn,
    paused: Boolean(ui.draft.paused),
    autoPost: Boolean(ui.draft.autoPost),
    currency: "INR",
  };
  const waiting = ledger.transactions.filter((tx) => tx.recurringRuleId === row.id && tx.status === "pending");
  if (ui.draft.id && waiting.length && applyPending == null) {
    ui.dialog = {
      title: "Update the waiting item?",
      body: "Confirmed rows stay as they are. The waiting item can take the new amount, or you can leave it and change only what comes next.",
      confirm: "rule-also-pending",
      confirmLabel: "Also this waiting item",
      alt: "rule-future-only",
      altLabel: "Only future",
    };
    render();
    return;
  }
  const index = ledger.recurring.findIndex((r) => r.id === row.id);
  if (index >= 0) ledger.recurring[index] = row;
  else ledger.recurring.push(row);
  if (applyPending) {
    for (const tx of waiting) {
      tx.amountMinor = row.amountMinor;
      tx.accountId = row.accountId;
      tx.categoryId = row.categoryId;
      tx.payee = row.payee;
      tx.paymentMethod = row.paymentMethod;
      tx.type = row.type;
    }
  }
  materializeRecurring(ledger, today());
  ui.dialog = null;
  ui.sheet = null;
  save();
  render();
}

function openCategory(categoryId) {
  const existing = ledger.categories.find((c) => c.id === categoryId);
  ui.draft = existing ? { ...existing } : { name: "", kind: "expense", color: "pine" };
  ui.sheet = "category";
  render();
}

function saveCategory() {
  if (!ui.draft.name?.trim()) { ui.formError = "Name the category."; render(); return; }
  const duplicate = ledger.categories.some((c) => c.id !== ui.draft.id && c.name.toLowerCase() === ui.draft.name.trim().toLowerCase());
  if (duplicate) { ui.formError = "A category already has that name."; render(); return; }
  const parent = ui.draft.parentId ? ledger.categories.find((c) => c.id === ui.draft.parentId) : null;
  if (parent?.parentId) { ui.formError = "A category can sit under a parent, not under another child."; render(); return; }
  if (parent && parent.kind !== (ui.draft.kind || "expense")) { ui.formError = "The parent has to be the same kind."; render(); return; }
  if (ui.draft.id) {
    const cat = ledger.categories.find((c) => c.id === ui.draft.id);
    if (ledger.categories.some((c) => c.parentId === cat.id) && parent) { ui.formError = "This category already has children, so it cannot become a child."; render(); return; }
    cat.name = ui.draft.name.trim();
    cat.color = ui.draft.color || cat.color;
    cat.kind = ui.draft.kind || cat.kind;
    cat.parentId = parent ? parent.id : null;
  } else {
    ledger.categories.push({
      id: id("cat"), name: ui.draft.name.trim(), kind: ui.draft.kind || "expense", parentId: parent ? parent.id : null,
      icon: "dot", color: ui.draft.color || "pine", isDefault: false, archivedAt: null,
    });
  }
  ui.sheet = null;
  save();
  render();
}

function toggleCategory(categoryId) {
  const cat = ledger.categories.find((c) => c.id === categoryId);
  cat.archivedAt = cat.archivedAt ? null : new Date().toISOString();
  ui.sheet = null;
  save();
  render();
}

function askMerge(categoryId) {
  const options = ledger.categories.filter((c) => c.id !== categoryId && !c.archivedAt).map((c) => `<option value="${$(c.id)}">${$(c.name)}</option>`).join("");
  ui.dialog = { title: "Merge category", body: "Transactions move to the category you pick. This cannot be split apart automatically.", confirm: "do-merge", confirmLabel: "Merge", field: `<select class="field" id="merge-target">${options}</select>`, fromId: categoryId };
  render();
}

function doMerge() {
  const target = document.querySelector("#merge-target")?.value;
  const errors = reassignCategory(ledger, ui.dialog.fromId, target);
  if (errors.length) { ui.formError = errors[0]; ui.dialog = null; render(); return; }
  ui.dialog = null;
  save();
  showSnack("Categories merged");
}

function saveTemplate(txId) {
  const tx = ledger.transactions.find((row) => row.id === txId);
  if (!tx) return;
  ledger.templates.push({
    id: id("tpl"), name: tx.payee || transactionTitle(ledger, tx), type: tx.type, amountMinor: tx.amountMinor,
    accountId: tx.accountId, destinationAccountId: tx.destinationAccountId, categoryId: tx.categoryId,
    payee: tx.payee, note: tx.note, tags: tx.tags || [], paymentMethod: tx.paymentMethod, transferKind: tx.transferKind,
  });
  save();
  showSnack("Template saved");
}

function useTemplate(templateId) {
  const template = ledger.templates.find((t) => t.id === templateId);
  ui.draft = draftFromTx({
    ...template, id: id("tx"), occurredOn: today(), source: "template", status: "posted", templateId,
  });
  ui.sheet = "add";
  go("#/");
  render();
}

async function saveBackup() {
  try {
    const file = await buildBackup(ledger);
    downloadText(`daybook-backup-${today()}.json`, JSON.stringify(file, null, 2), "application/json");
  } catch {
    ui.formError = "Couldn't write the backup. Free some space and try again.";
    render();
  }
}

async function readRestore(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const result = await validateBackup(parsed);
    if (!result.ok) { ui.formError = result.errors[0]; render(); return; }
    ui.pendingRestore = result.ledger;
    ui.dialog = {
      title: "Restore backup",
      body: `${result.ledger.accounts.length} accounts and ${result.ledger.transactions.length} transactions. The current ledger is kept as a safety copy until you erase it. A damaged file would not have reached this screen.`,
      confirm: "confirm-restore",
      confirmLabel: "Replace ledger",
    };
    ui.formError = "";
    render();
  } catch {
    ui.formError = "This file is damaged or not a Daybook backup.";
    render();
  }
}

function confirmRestore() {
  if (!ui.pendingRestore) return;
  const lock = {
    appLockEnabled: ledger.settings.appLockEnabled,
    pinHash: ledger.settings.pinHash,
    pinSalt: ledger.settings.pinSalt,
    recoveryHash: ledger.settings.recoveryHash,
  };
  localStorage.setItem("daybook.safety.v1", JSON.stringify(ledger));
  ledger = ui.pendingRestore;
  Object.assign(ledger.settings, lock);
  ui.pendingRestore = null;
  ui.dialog = null;
  save();
  showSnack("Restored");
  go("#/");
}

function undoRestore() {
  const raw = localStorage.getItem("daybook.safety.v1");
  if (!raw) return;
  ledger = JSON.parse(raw);
  ui.dialog = null;
  save();
  showSnack("Previous ledger restored");
  go("#/");
}

async function setPin() {
  const pin = document.querySelector("#new-pin")?.value || "";
  if (!/^\d{4,8}$/.test(pin)) { ui.formError = "Use 4 to 8 digits."; render(); return; }
  const salt = randomSalt();
  ledger.settings.pinSalt = salt;
  ledger.settings.pinHash = await hashSecret(pin, salt);
  const recovery = randomSalt().slice(0, 8);
  ledger.settings.recoveryHash = await hashSecret(recovery, salt);
  ledger.settings.appLockEnabled = true;
  ui.recoveryShown = recovery;
  ui.dialog = null;
  save();
  render();
}

async function unlock() {
  if (ui.lockUntil && Date.now() < ui.lockUntil) {
    const error = document.querySelector("#lock-error");
    if (error) { error.hidden = false; error.textContent = "Too many tries. Wait a moment."; }
    return;
  }
  const pin = ui.pin || document.querySelector("#pin")?.value || "";
  const hash = await hashSecret(pin, ledger.settings.pinSalt || "");
  if (hash === ledger.settings.pinHash) { ui.unlocked = true; ui.pin = ""; ui.pinFails = 0; render(); return; }
  ui.pinFails = (ui.pinFails || 0) + 1;
  if (ui.pinFails >= 5) ui.lockUntil = Date.now() + 30000;
  const error = document.querySelector("#lock-error");
  if (error) { error.hidden = false; error.textContent = ui.pinFails >= 5 ? "Too many tries. Wait a moment." : "That PIN does not match."; }
}

async function useRecovery() {
  const code = document.querySelector("#recovery")?.value || "";
  const hash = await hashSecret(code.trim(), ledger.settings.pinSalt || "");
  if (hash !== ledger.settings.recoveryHash) { ui.formError = "That recovery code does not match."; ui.dialog = null; render(); return; }
  ui.unlocked = true;
  ui.dialog = null;
  render();
}

function doErase() {
  if (document.querySelector("#erase")?.value !== "ERASE") { ui.formError = "Type ERASE to confirm."; render(); return; }
  ledger = freshLedger();
  ledger.settings.onboardingDone = false;
  ui.dialog = null;
  ui.unlocked = true;
  ui.step = 1;
  localStorage.removeItem("daybook.safety.v1");
  save();
  render();
}

function finishOnboarding(bankName) {
  ensureCash();
  if (bankName.trim()) {
    ledger.accounts.push({
      id: id("acct"), name: bankName.trim(), type: "bank", currency: "INR", creditLimitMinor: null,
      includeInSpendable: true, includeInNetWorth: true, archivedAt: null, aliases: [bankName.trim().toLowerCase()],
      isPrimary: true, displayOrder: 1,
    });
  }
  ledger.settings.onboardingDone = true;
  ledger.settings.defaultAccountId = ledger.accounts.find((a) => a.type === "bank")?.id || ledger.accounts[0]?.id;
  save();
  go("#/");
  render();
}

function readFile(file) {
  if (!file) return;
  if (file.size > 350000) { ui.formError = "That image is too large to keep inside the ledger. Use a note instead."; render(); return; }
  const reader = new FileReader();
  reader.onload = () => { ui.draft.attachment = reader.result; render(); };
  reader.readAsDataURL(file);
}

function startVoice() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) { ui.formError = "Speech recognition is not available here. Type the sentence instead. Audio is not stored."; render(); return; }
  const rec = new Rec();
  rec.lang = "en-IN";
  rec.onresult = (event) => {
    ui.write = event.results[0][0].transcript;
    refreshParse();
    render();
  };
  rec.onerror = () => { ui.formError = "Didn't catch that."; render(); };
  rec.start();
}

function notifyPermission() {
  if (!("Notification" in window)) { ui.formError = "This browser has no notifications. Reminders stay inside Daybook."; render(); return; }
  Notification.requestPermission().then(() => checkReminders());
}

function checkReminders() {
  if (!ledger.settings.onboardingDone) return;
  const due = ledger.recurring.filter((rule) => !rule.paused && rule.nextOn && rule.nextOn <= today());
  if (ledger.settings.notifyRecurring && due.length && Notification.permission === "granted") {
    new Notification("A bill is due", { body: "Open Daybook to confirm it. The amount stays off the lock screen." });
  }
  const cap = ledger.settings.periodCapMinor;
  if (cap && ledger.settings.notifyBudget) {
    const spent = periodTotals(ledger, financial()).spending;
    if (spent >= cap * 0.8) ui.snack = ui.snack || "Spending has reached 80% of the cap.";
  }
}

function doReassign() {
  if (ui.dialog?.removeEmpty) {
    ledger.accounts = ledger.accounts.filter((a) => a.id !== ui.dialog.fromId);
    ui.dialog = null;
    save();
    go("#/accounts");
    return;
  }
  const target = document.querySelector("#reassign")?.value;
  const errors = reassignAccount(ledger, ui.dialog.fromId, target);
  if (errors.length) { ui.formError = errors[0]; ui.dialog = null; render(); return; }
  ui.dialog = null;
  save();
  go("#/accounts");
}

window.addEventListener("hashchange", render);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
checkReminders();
render();
