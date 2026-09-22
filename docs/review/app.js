import { formatMinor, parseExpression } from "./money.js";
import { periodContaining, inPeriod, formatPeriod, formatDay, formatDayShort, todayIso, addDays } from "./period.js";
import { parseSentence } from "./parser.js";

const KEY = "daybook-review-v1";

const CATS = [
  ["food", "Food", "expense", null],
  ["food.groceries", "Groceries", "expense", "food"],
  ["food.eating", "Eating out", "expense", "food"],
  ["food.coffee", "Tea & coffee", "expense", "food"],
  ["food.delivery", "Delivery", "expense", "food"],
  ["transport", "Transport", "expense", null],
  ["transport.fuel", "Fuel", "expense", "transport"],
  ["transport.transit", "Transit", "expense", "transport"],
  ["transport.cab", "Auto & cab", "expense", "transport"],
  ["home", "Home", "expense", null],
  ["home.rent", "Rent", "expense", "home"],
  ["home.help", "Household help", "expense", "home"],
  ["bills", "Bills", "expense", null],
  ["bills.electricity", "Electricity", "expense", "bills"],
  ["bills.mobile", "Mobile & internet", "expense", "bills"],
  ["emi.parent", "EMI & loans", "expense", null],
  ["subs", "Subscriptions", "expense", null],
  ["subs.streaming", "Streaming", "expense", "subs"],
  ["shopping", "Shopping", "expense", null],
  ["shopping.general", "General", "expense", "shopping"],
  ["health", "Health", "expense", null],
  ["education", "Education", "expense", null],
  ["family", "Family & personal", "expense", null],
  ["family.support", "Family support", "expense", "family"],
  ["entertainment", "Entertainment", "expense", null],
  ["travel", "Travel", "expense", null],
  ["fees", "Fees", "expense", null],
  ["other", "Other", "expense", null],
  ["income.salary", "Salary", "income", null],
  ["income.freelance", "Freelance", "income", null],
  ["income.other", "Other income", "income", null],
];

const ICONS = {
  food: "M4 10h16M6 10v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8M8 10V7a4 4 0 0 1 8 0v3",
  transport: "M4 16h16M6 16V8h12v8M8 19v1M16 19v1M8 8V6h8v2",
  home: "M4 11 12 4l8 7M6 10v9h12v-9",
  bills: "M6 4h12v16H6zM9 8h6M9 12h6",
  "emi.parent": "M5 8h14v10H5zM8 8V6h8v2",
  subs: "M5 8a7 7 0 0 1 14 0v5l2 2H3l2-2V8",
  shopping: "M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 0 1 6 0v2",
  health: "M12 6v12M6 12h12",
  education: "M3 9 12 5l9 4-9 4-9-4zM7 11v4c2 1 8 1 10 0v-4",
  family: "M8 13a3 3 0 1 0-0.01-6A3 3 0 0 0 8 13zM16 12a2.5 2.5 0 1 0-0.01-5A2.5 2.5 0 0 0 16 12zM3 19c1-3 3-4 5-4s4 1 5 4M14 19c.4-2 1.6-3 3-3 1.2 0 2.2.6 3 2",
  entertainment: "M4 8h16v10H4zM8 8V6M16 8V6",
  travel: "M4 18h16M6 18V9l6-3 6 3v9",
  fees: "M12 4v16M7 8h8a3 3 0 0 1 0 6H8",
  other: "M6 12h.01M12 12h.01M18 12h.01",
  income: "M12 5v14M7 10l5-5 5 5",
  move: "M7 8h10M14 5l3 3-3 3M17 16H7M10 13l-3 3 3 3",
  card: "M4 8h16v8H4zM4 11h16",
  cash: "M5 8h14v8H5zM12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
  bank: "M4 10h16M6 10v7M10 10v7M14 10v7M18 10v7M3 17h18M12 4 4 10h16L12 4z",
};

function cat(id) { return CATS.find((c) => c[0] === id); }
function catName(id) { return cat(id)?.[1] || "Uncategorized"; }
function parentId(id) { return cat(id)?.[3] || id; }
function iconFor(id) {
  const p = parentId(id);
  return ICONS[p] || ICONS[id] || ICONS.other;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function svg(d) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
}
function uid() {
  return crypto.randomUUID();
}

function fresh() {
  return {
    settings: {
      theme: "system",
      grouping: "indian",
      paydayMode: "none",
      paydayDay: 1,
      capMinor: null,
      onboarded: false,
      lastExpenseCategoryId: null,
      lastIncomeCategoryId: null,
      lastAccountId: null,
    },
    accounts: [],
    transactions: [],
    rules: [],
  };
}

let state = load();
let route = { name: state.settings.onboarded ? "home" : "onboard", step: 1 };
let sheet = null;
let snack = null;
let draftBank = "";
let search = "";
let filterType = "period";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    return { ...fresh(), ...JSON.parse(raw) };
  } catch {
    return fresh();
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  applyTheme();
}
function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme || "system";
}

function money(minor, sign = "none") {
  return formatMinor(minor, { grouping: state.settings.grouping, sign });
}
function posted() {
  return state.transactions.filter((t) => !t.deletedAt);
}
function accountBy(id) {
  return state.accounts.find((a) => a.id === id);
}
function primaryAccount() {
  return state.accounts.find((a) => a.id === state.settings.lastAccountId && !a.archivedAt)
    || state.accounts.find((a) => a.isPrimary && !a.archivedAt)
    || state.accounts.find((a) => !a.archivedAt && a.type !== "credit_card")
    || state.accounts.find((a) => !a.archivedAt);
}

function balanceOf(account) {
  let asset = 0;
  let owed = 0;
  const card = account.type === "credit_card";
  for (const t of posted()) {
    const amt = t.amountMinor;
    if (t.type === "adjustment" && t.accountId === account.id) card ? owed += amt : asset += amt;
    if (t.type === "expense" && t.accountId === account.id) card ? owed += amt : asset -= amt;
    if (t.type === "income" && t.accountId === account.id) card ? owed -= amt : asset += amt;
    if (t.type === "refund" && t.accountId === account.id) card ? owed -= amt : asset += amt;
    if (t.type === "transfer" && t.accountId === account.id) card ? owed += amt : asset -= amt;
    if (t.type === "transfer" && t.destinationAccountId === account.id) card ? owed -= amt : asset += amt;
  }
  return { asset, owed };
}

function cashYouHave() {
  return state.accounts
    .filter((a) => !a.archivedAt && a.type !== "credit_card" && a.includeInSpendable !== false)
    .reduce((sum, a) => sum + balanceOf(a).asset, 0);
}
function netWorth() {
  return state.accounts.filter((a) => !a.archivedAt).reduce((sum, a) => {
    const b = balanceOf(a);
    return sum + (a.type === "credit_card" ? -b.owed : b.asset);
  }, 0);
}

function periodNow() {
  return periodContaining(todayIso(), state.settings.paydayMode, state.settings.paydayDay);
}

function periodTotals(period = periodNow()) {
  let expense = 0;
  let income = 0;
  let todaySpend = 0;
  const today = todayIso();
  for (const t of posted()) {
    if (!inPeriod(t.occurredOn, period)) continue;
    if (t.type === "expense") expense += t.amountMinor;
    if (t.type === "refund") expense -= t.amountMinor;
    if (t.type === "income") income += t.amountMinor;
    if (t.occurredOn === today && t.type === "expense") todaySpend += t.amountMinor;
    if (t.occurredOn === today && t.type === "refund") todaySpend -= t.amountMinor;
  }
  return { expense, income, todaySpend };
}

function heroModel() {
  const totals = periodTotals();
  const cap = state.settings.capMinor;
  if (cap != null) {
    const left = cap - totals.expense;
    if (left < 0) return { label: "Over this period", amount: Math.abs(left), cls: "spend", cap, spent: totals.expense, ...totals };
    return { label: "Left this period", amount: left, cls: "", cap, spent: totals.expense, ...totals };
  }
  if (totals.income > 0) {
    const left = totals.income - totals.expense;
    return { label: "Left after income", amount: left, cls: left < 0 ? "spend" : "", ...totals };
  }
  return { label: "Spent this period", amount: Math.max(0, totals.expense), cls: "", ...totals };
}

function recent() {
  return posted().slice().sort((a, b) => (b.occurredOn + b.createdAt).localeCompare(a.occurredOn + a.createdAt)).slice(0, 5);
}

function insight() {
  const missing = posted().filter((t) => (t.type === "expense" || t.type === "income") && !t.categoryId).length;
  if (missing) return { text: `${missing} ${missing === 1 ? "expense has" : "expenses have"} no category.`, go: "activity" };
  const cap = state.settings.capMinor;
  if (cap) {
    const { expense } = periodTotals();
    if (expense >= cap) return { text: "This period is over its cap.", go: "activity" };
    if (expense >= cap * 0.8) return { text: "This period is at 80% of its cap.", go: "activity" };
  }
  return null;
}

function showSnack(text, undo) {
  snack = { text, undo };
  render();
  clearTimeout(showSnack.timer);
  showSnack.timer = setTimeout(() => { snack = null; render(); }, 4000);
}

function openAdd(prefill) {
  const last = state.settings.lastExpenseCategoryId;
  const account = primaryAccount();
  sheet = {
    mode: "form",
    verb: "expense",
    amountText: "",
    categoryId: last,
    categoryAccepted: Boolean(last),
    accountId: account?.id || null,
    destinationId: null,
    date: todayIso(),
    payee: "",
    showDetails: false,
    writeText: "",
    editingId: null,
    ...prefill,
  };
  render();
}

function parsedAmount() {
  if (!sheet) return { ok: false };
  return parseExpression(sheet.amountText || "");
}

function saveSheet() {
  if (!sheet) return;
  let type = sheet.verb;
  let amountMinor = parsedAmount().amountMinor;
  let categoryId = sheet.categoryId;
  let accountId = sheet.accountId;
  let destinationId = sheet.destinationId;
  let date = sheet.date;
  let payee = sheet.payee.trim();
  let transferKind = null;
  let source = "manual";
  if (sheet.mode === "write") {
    const parsed = liveParse();
    if (!writeCanSave(parsed)) return;
    type = parsed.type === "refund" ? "refund" : parsed.type === "transfer" ? "transfer" : parsed.type === "income" ? "income" : "expense";
    amountMinor = parsed.amountMinor;
    categoryId = parsed.categoryFromUser || sheet.categoryAccepted ? (sheet.categoryId || parsed.categoryId) : null;
    accountId = parsed.accountId;
    destinationId = parsed.destinationAccountId;
    date = parsed.occurredOn;
    payee = parsed.payee || payee;
    transferKind = parsed.transferKind;
    source = "parser";
    if (payee && categoryId) {
      state.rules = state.rules.filter((r) => r.pattern !== payee.toLowerCase());
      state.rules.push({ pattern: payee.toLowerCase(), categoryId });
    }
  }
  if (!amountMinor || amountMinor <= 0) return;
  if ((type === "expense" || type === "income" || type === "refund") && !categoryId) return;
  if (type === "transfer") {
    if (!destinationId || destinationId === accountId) return;
    const dest = accountBy(destinationId);
    const src = accountBy(accountId);
    transferKind = transferKind || (dest?.type === "credit_card" ? "card_payment" : "standard");
    if (src?.type === "bank" && dest?.type === "cash" && transferKind === "standard") transferKind = "atm";
  }
  const method = methodFor(type, accountId);
  if (sheet.editingId) {
    const txn = state.transactions.find((t) => t.id === sheet.editingId);
    Object.assign(txn, { type, amountMinor, categoryId, accountId, destinationAccountId: destinationId, occurredOn: date, payee, paymentMethod: method, transferKind, updatedAt: new Date().toISOString() });
  } else {
    state.transactions.push({
      id: uid(),
      type,
      amountMinor,
      categoryId: type === "transfer" ? null : categoryId,
      accountId,
      destinationAccountId: type === "transfer" ? destinationId : null,
      occurredOn: date,
      payee,
      paymentMethod: method,
      transferKind,
      source,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    });
  }
  if (type === "expense") state.settings.lastExpenseCategoryId = categoryId;
  if (type === "income") state.settings.lastIncomeCategoryId = categoryId;
  state.settings.lastAccountId = accountId;
  const label = type === "transfer" ? "Move saved." : `Saved ${money(amountMinor)} to ${catName(categoryId)}.`;
  sheet = null;
  save();
  showSnack(label, null);
}

function methodFor(type, accountId) {
  const account = accountBy(accountId);
  if (!account) return null;
  if (account.type === "credit_card") return "credit_card";
  if (account.type === "cash") return "cash";
  if (account.type === "wallet") return "wallet";
  return "upi";
}

function liveParse() {
  return parseSentence(sheet.writeText, {
    today: todayIso(),
    accounts: state.accounts.filter((a) => !a.archivedAt).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      aliases: [a.name, ...(a.aliases || [])],
      isPrimary: a.isPrimary,
    })),
    rules: state.rules,
  });
}
function writeCanSave(parsed) {
  if (!parsed.amountMinor || !parsed.type) return false;
  if (parsed.type === "transfer") return Boolean(parsed.destinationAccountId && parsed.accountId && parsed.accountId !== parsed.destinationAccountId && !parsed.gaps.includes("destination") && !parsed.gaps.includes("account") && !parsed.gaps.includes("amount"));
  return Boolean((sheet.categoryAccepted || parsed.categoryFromUser) && (sheet.categoryId || parsed.categoryId) && !parsed.gaps.includes("amount"));
}

function deleteTxn(id) {
  const txn = state.transactions.find((t) => t.id === id);
  txn.deletedAt = new Date().toISOString();
  save();
  if (route.name === "detail") route = { name: "activity" };
  showSnack("Expense deleted.", () => {
    txn.deletedAt = null;
    save();
  });
}

function finishOnboarding(withBank) {
  if (!state.accounts.length) {
    const cash = { id: uid(), name: "Cash", type: "cash", includeInSpendable: true, isPrimary: !withBank, aliases: ["cash"], archivedAt: null };
    state.accounts.push(cash);
    if (withBank && draftBank.trim()) {
      const bank = { id: uid(), name: draftBank.trim(), type: "bank", includeInSpendable: true, isPrimary: true, aliases: aliasesFor(draftBank.trim()), archivedAt: null };
      state.accounts.push(bank);
      state.settings.lastAccountId = bank.id;
    } else {
      state.settings.lastAccountId = cash.id;
    }
  }
  state.settings.onboarded = true;
  route = { name: "home" };
  save();
  render();
}

function aliasesFor(name) {
  const lower = name.toLowerCase();
  const aliases = [lower];
  if (lower.includes("hdfc")) aliases.push("hdfc");
  if (lower.includes("icici")) aliases.push("icici", "icici card");
  if (lower.includes("sbi")) aliases.push("sbi");
  if (lower.includes("axis")) aliases.push("axis");
  if (lower.includes("saving")) aliases.push("savings");
  return aliases;
}

function addAccount(fields) {
  const account = {
    id: uid(),
    name: fields.name.trim(),
    type: fields.type,
    includeInSpendable: fields.type === "credit_card" ? false : fields.spendable !== false,
    isPrimary: state.accounts.length === 0,
    aliases: aliasesFor(fields.name),
    creditLimitMinor: fields.limitMinor || null,
    archivedAt: null,
  };
  state.accounts.push(account);
  if (!state.settings.lastAccountId) state.settings.lastAccountId = account.id;
  if (fields.openingMinor > 0) {
    state.transactions.push({
      id: uid(),
      type: "adjustment",
      amountMinor: fields.openingMinor,
      accountId: account.id,
      destinationAccountId: null,
      categoryId: null,
      occurredOn: todayIso(),
      payee: account.type === "credit_card" ? "Opening amount owed" : "Opening balance",
      paymentMethod: null,
      transferKind: null,
      source: "adjustment",
      createdAt: new Date().toISOString(),
      deletedAt: null,
    });
  }
  save();
  route = { name: "accounts" };
  render();
}

function filteredTxns() {
  const period = periodNow();
  return posted().filter((t) => {
    if (filterType === "period" && !inPeriod(t.occurredOn, period)) return false;
    if (filterType === "expense" && t.type !== "expense") return false;
    if (filterType === "income" && t.type !== "income") return false;
    if (filterType === "transfer" && t.type !== "transfer") return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    if (/^\d+$/.test(q)) return t.amountMinor === Number(q) * 100;
    const blob = `${t.payee} ${catName(t.categoryId)} ${accountBy(t.accountId)?.name || ""} ${t.note || ""}`.toLowerCase();
    return blob.includes(q);
  }).sort((a, b) => (b.occurredOn + b.createdAt).localeCompare(a.occurredOn + a.createdAt));
}

function txnTitle(t) {
  if (t.payee) return t.payee;
  if (t.type === "transfer") return t.transferKind === "card_payment" ? "Card payment" : t.transferKind === "atm" ? "ATM" : "Transfer";
  if (t.type === "adjustment") return t.payee || "Adjustment";
  return catName(t.categoryId);
}
function txnSub(t) {
  const account = accountBy(t.accountId);
  const dest = accountBy(t.destinationAccountId);
  if (t.type === "transfer") return `${account?.name || "Account"} → ${dest?.name || "Account"}`;
  const bits = [catName(t.categoryId), account?.name].filter(Boolean);
  if (t.paymentMethod === "upi") bits.push("UPI");
  return bits.join(" · ");
}
function txnSign(t) {
  if (t.type === "expense") return "minus";
  if (t.type === "income" || t.type === "refund") return "plus";
  return "none";
}
function txnClass(t) {
  if (t.type === "expense") return "spend";
  if (t.type === "income" || t.type === "refund") return "receive";
  return "move";
}

function renderTxn(t) {
  return `<button class="txn" data-open="${esc(t.id)}">
    <span class="icon">${svg(t.type === "transfer" ? ICONS.move : iconFor(t.categoryId || "other"))}</span>
    <span><span class="title">${esc(txnTitle(t))}</span><span class="sub">${esc(txnSub(t))}</span></span>
    <span class="amt ${txnClass(t)}">${esc(money(t.amountMinor, txnSign(t)))}</span>
  </button>`;
}

function renderHome() {
  const h = heroModel();
  const period = periodNow();
  const cards = state.accounts.filter((a) => a.type === "credit_card" && !a.archivedAt && balanceOf(a).owed !== 0);
  const ins = insight();
  const rows = recent();
  const capTrack = h.cap ? Math.min(100, Math.round((h.spent / h.cap) * 100)) : 0;
  return `<h1 class="word">Daybook</h1>
    <div class="period">${esc(formatPeriod(period))}</div>
    <div class="hero-label">${esc(h.label)}</div>
    <div class="hero ${h.amount < 0 || h.label.startsWith("Over") ? "spend" : ""}">${esc(money(Math.abs(h.amount), h.amount < 0 || h.label.startsWith("Over") ? "minus" : "none"))}</div>
    ${h.cap != null ? `<div class="track" aria-hidden="true"><span style="width:${capTrack}%"></span></div><div class="quiet">of ${esc(money(h.cap))}</div>` : ""}
    <div class="context">${h.income ? `Spent ${esc(money(h.expense))} · Income ${esc(money(h.income))}` : `Spent ${esc(money(Math.max(0, h.expense)))}`}${h.todaySpend ? ` · Today ${esc(money(h.todaySpend))}` : ""}</div>
    <button class="plain-row" data-go="accounts"><span>Cash you have</span><span class="amt">${esc(money(cashYouHave()))}</span></button>
    ${cards.map((c) => {
      const owed = balanceOf(c).owed;
      const label = owed < 0 ? "Credit balance" : "owed";
      return `<button class="plain-row" data-go="accounts"><span>${esc(c.name)}</span><span class="owed">${esc(money(Math.abs(owed)))} ${label}</span></button>`;
    }).join("")}
    ${h.cap == null && h.income === 0 ? `<button class="text-btn" data-open-cap>Add income or a spending cap to see what's left.</button>` : `<button class="text-btn" data-open-cap>${h.cap == null ? "Set a spending cap" : "Edit spending cap"}</button>`}
    <div class="section">Recent</div>
    ${rows.length ? rows.map(renderTxn).join("") : `<p class="empty">Nothing recorded yet.</p><button class="text-btn" data-add>Add an expense</button>`}
    ${ins ? `<button class="insight" data-go="${ins.go}"><i></i><span>${esc(ins.text)}</span></button>` : ""}`;
}

function renderActivity() {
  const list = filteredTxns();
  let lastDay = "";
  const parts = [];
  for (const t of list) {
    const day = t.occurredOn === todayIso() ? "Today" : t.occurredOn === addDays(todayIso(), -1) ? "Yesterday" : formatDayShort(t.occurredOn);
    if (day !== lastDay) {
      parts.push(`<div class="section">${esc(day)}</div>`);
      lastDay = day;
    }
    parts.push(renderTxn(t));
  }
  return `<h2 class="page">Activity</h2>
    <input class="search" id="search" placeholder="Search" value="${esc(search)}" />
    <div class="chips">
      ${["period", "expense", "income", "transfer"].map((f) => `<button class="chip ${filterType === f ? "on" : ""}" data-filter="${f}">${f === "period" ? "This period" : f[0].toUpperCase() + f.slice(1)}</button>`).join("")}
      ${filterType !== "all" ? `<button class="chip" data-filter="all">Clear</button>` : ""}
    </div>
    ${parts.join("") || `<p class="empty">${search || filterType !== "all" ? "No transactions match." : "Nothing recorded yet."}</p>`}`;
}

function renderInsights() {
  const txns = posted().filter((t) => t.type === "expense" && inPeriod(t.occurredOn, periodNow()));
  if (txns.length < 2) return `<h2 class="page">Insights</h2><p class="empty">Record a few expenses and this page will show a breakdown.</p>`;
  const totals = new Map();
  for (const t of txns) {
    const key = parentId(t.categoryId || "other");
    totals.set(key, (totals.get(key) || 0) + t.amountMinor);
  }
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const max = rows[0][1];
  const largest = txns.slice().sort((a, b) => b.amountMinor - a.amountMinor).slice(0, 5);
  return `<h2 class="page">Insights</h2>
    <div class="quiet">${esc(formatPeriod(periodNow()))}</div>
    <div class="section">Where it went</div>
    ${rows.slice(0, 6).map(([id, amt]) => `<div class="bar-row"><span>${esc(catName(id))}</span><span class="bar"><span style="width:${Math.round(amt / max * 100)}%"></span></span><span class="amt">${esc(money(amt))}</span></div>`).join("")}
    <div class="section">Largest</div>
    ${largest.map(renderTxn).join("")}`;
}

function renderMore() {
  const items = [
    ["accounts", "Accounts", "Cash, banks, and cards"],
    ["categories", "Categories", "Names, not a second wallet"],
    ["backup", "Backup and export", "A spreadsheet is not a backup"],
    ["appearance", "Appearance", "Light, dark, or the system"],
    ["format", "Format and payday", "Grouping and when the month starts"],
    ["privacy", "Privacy", "Erase what is on this browser"],
    ["about", "About", "What this review is"],
  ];
  return `<h2 class="page">More</h2>${items.map(([go, title, sub]) => `<button class="choice" data-go="${go}"><strong>${title}</strong><small>${sub}</small></button>`).join("")}`;
}

function renderAccounts() {
  const rows = state.accounts.filter((a) => !a.archivedAt).map((a) => {
    const b = balanceOf(a);
    const text = a.type === "credit_card"
      ? (b.owed < 0 ? `${money(Math.abs(b.owed))} credit` : `${money(b.owed)} owed`)
      : money(b.asset);
    return `<button class="plain-row" data-go="accounts"><span>${esc(a.name)}<span class="sub">${esc(a.type.replace("_", " "))}</span></span><span class="${a.type === "credit_card" ? "owed" : "amt"}">${esc(text)}</span></button>`;
  }).join("");
  return `<button class="back" data-go="more">Back</button><h2 class="page">Accounts</h2>
    <p class="quiet">Net worth ${esc(money(netWorth()))}</p>${rows}
    <button class="primary" data-go="account-new" style="margin-top:16px">Add account</button>`;
}

function renderAccountNew() {
  return `<button class="back" data-go="accounts">Back</button><h2 class="page">Add account</h2>
    <p class="quiet">UPI and debit cards spend from a bank account. They are not separate accounts.</p>
    <input class="field" id="acc-name" placeholder="Name" />
    <div class="chips" id="acc-types">
      ${["cash", "bank", "wallet", "credit_card"].map((t, i) => `<button class="chip ${i === 1 ? "on" : ""}" data-type="${t}">${t === "credit_card" ? "Credit card" : t[0].toUpperCase() + t.slice(1)}</button>`).join("")}
    </div>
    <input class="field" id="acc-open" inputmode="decimal" placeholder="Opening amount, optional" />
    <p class="footnote">An opening amount is an adjustment, not income.</p>
    <button class="primary" id="acc-save" style="margin-top:16px">Save account</button>`;
}

function renderCategories() {
  const parents = CATS.filter((c) => !c[3]);
  return `<button class="back" data-go="more">Back</button><h2 class="page">Categories</h2>
    ${parents.map((c) => `<div class="plain-row"><span>${esc(c[1])}</span><span class="quiet">${esc(c[2])}</span></div>`).join("")}
    <p class="footnote">Other is never chosen for you.</p>`;
}

function renderAppearance() {
  return `<button class="back" data-go="more">Back</button><h2 class="page">Appearance</h2>
    <div class="chips">
      ${["system", "light", "dark"].map((t) => `<button class="chip ${state.settings.theme === t ? "on" : ""}" data-theme="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}
    </div>`;
}

function renderFormat() {
  return `<button class="back" data-go="more">Back</button><h2 class="page">Format and payday</h2>
    <div class="chips">
      <button class="chip ${state.settings.grouping === "indian" ? "on" : ""}" data-group="indian">₹12,34,567</button>
      <button class="chip ${state.settings.grouping === "international" ? "on" : ""}" data-group="international">₹1,234,567</button>
    </div>
    <p class="quiet">When does your month start?</p>
    <input class="day-input" id="payday" inputmode="numeric" value="${state.settings.paydayMode === "day" ? state.settings.paydayDay : ""}" placeholder="—" />
    <div class="links"><button class="text-btn" id="no-payday">No fixed payday</button><button class="text-btn" id="save-payday">Save day</button></div>
    <p class="footnote">This changes which expenses count toward the current period. It does not edit them.</p>`;
}

function renderBackup() {
  return `<button class="back" data-go="more">Back</button><h2 class="page">Backup and export</h2>
    <p>This file contains your transactions. Anyone who can open it can read them.</p>
    <button class="choice" id="export-csv"><strong>Export spreadsheet</strong><small>CSV. This cannot restore the ledger.</small></button>
    <button class="choice" id="export-json"><strong>Save backup</strong><small>Full file for this review.</small></button>
    <button class="choice" id="import-json"><strong>Restore backup</strong><small>Replaces what is in this browser.</small></button>
    <input id="file" type="file" accept="application/json" hidden />`;
}

function renderPrivacy() {
  return `<button class="back" data-go="more">Back</button><h2 class="page">Privacy</h2>
    <p>This review stays in this browser. It does not read SMS, and it does not have an account.</p>
    <button class="text-btn" id="erase" style="color:var(--spend)">Erase ledger</button>`;
}

function renderAbout() {
  return `<button class="back" data-go="more">Back</button><h2 class="page">About</h2>
    <p>Daybook keeps records. It does not move money or give financial advice.</p>
    <p class="footnote">This is the visual review of the V0 shell. The Flutter project is in the repository and has not been compiled here, because the Flutter SDK host is blocked in this environment. Numbers on this page follow the same posting rules as the Dart ledger.</p>`;
}

function renderDetail() {
  const t = state.transactions.find((x) => x.id === route.id);
  if (!t || t.deletedAt) return `<button class="back" data-go="activity">Back</button><p>This was deleted.</p>`;
  const rows = [
    ["Type", t.type === "transfer" && t.transferKind === "card_payment" ? "Pay card" : t.type],
    ["Amount", money(t.amountMinor)],
    ["Category", t.categoryId ? catName(t.categoryId) : "—"],
    ["Account", accountBy(t.accountId)?.name || "—"],
    ["To", accountBy(t.destinationAccountId)?.name || "—"],
    ["Date", formatDay(t.occurredOn)],
    ["Description", t.payee || "—"],
    ["Source", t.source === "parser" ? "From a written note" : t.source === "adjustment" ? "Opening balance" : "Added by you"],
  ].filter(([, v]) => v !== "—");
  return `<button class="back" data-back>Back</button>
    <div class="hero">${esc(money(t.amountMinor, txnSign(t)))}</div>
    <div class="quiet">${esc(txnTitle(t))}</div>
    ${rows.map(([k, v]) => `<div class="plain-row"><span class="quiet">${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}
    <div class="links"><button class="text-btn" data-edit="${esc(t.id)}">Edit</button><button class="text-btn" data-dup="${esc(t.id)}">Duplicate</button><button class="text-btn" data-del="${esc(t.id)}" style="color:var(--spend)">Delete</button></div>`;
}

function renderOnboard() {
  const step = route.step || 1;
  if (step === 1) {
    return `<div class="step">1 of 3</div><h1 class="word">We'll use rupees.</h1>
      <p class="hero" style="font-size:36px">₹12,34,567.89</p>
      <p>22 Sep 2026</p>
      <button class="primary" id="on-next">Continue</button>
      <div class="links"><button class="text-btn" id="on-group">Use international grouping</button><button class="text-btn" id="on-skip">Skip</button></div>
      <p class="footnote">Daybook keeps records. It does not move money or give financial advice.</p>`;
  }
  if (step === 2) {
    return `<div class="step">2 of 3</div><h1 class="word">When does your month start?</h1>
      <p>Rent and salary rarely care that the calendar says the 1st.</p>
      <input class="day-input" id="on-day" inputmode="numeric" placeholder="7" />
      <button class="primary" id="on-next">Continue</button>
      <div class="links"><button class="text-btn" id="on-skip">No fixed payday</button></div>`;
  }
  return `<div class="step">3 of 3</div><h1 class="word">Where does money live?</h1>
    <p>UPI and debit cards spend from a bank account. They are not separate accounts.</p>
    <div class="plain-row"><span>Cash</span><span>On</span></div>
    <input class="field" id="on-bank" placeholder="Bank name, optional" value="${esc(draftBank)}" />
    <button class="primary" id="on-finish" style="margin-top:16px">Finish</button>
    <div class="links"><button class="text-btn" id="on-skip">Skip</button></div>`;
}

function chipRow(kind) {
  const last = kind === "income" ? state.settings.lastIncomeCategoryId : state.settings.lastExpenseCategoryId;
  const parents = CATS.filter((c) => c[2] === kind && !c[3]).slice(0, 4);
  const ids = [];
  if (last && !ids.includes(last)) ids.push(last);
  for (const p of parents) if (!ids.includes(p[0]) && ids.length < 4) ids.push(p[0]);
  return ids.map((id) => `<button class="chip ${sheet.categoryId === id && sheet.categoryAccepted ? "on" : ""}" data-cat="${esc(id)}">${esc(catName(id))}</button>`).join("") + `<button class="chip" data-more-cats>More</button>`;
}

function renderSheet() {
  if (!sheet) return "";
  if (sheet.mode === "cap") {
    return `<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-label="Spending cap">
      <div class="grabber"></div>
      <h2 class="page">Spending cap</h2>
      <p class="quiet">Optional. Income does not raise it.</p>
      <input class="amount-input" id="cap-input" inputmode="decimal" placeholder="₹0" />
      <button class="primary" id="cap-save">Save cap</button>
      ${state.settings.capMinor != null ? `<button class="text-btn" id="cap-clear">Remove cap</button>` : ""}
    </div>`;
  }
  if (sheet.mode === "categories") {
    const kind = sheet.verb === "income" ? "income" : "expense";
    const parents = CATS.filter((c) => c[2] === kind && !c[3]);
    return `<div class="scrim" data-close></div><div class="sheet"><div class="grabber"></div>
      <button class="back" data-sheet-back>Back</button>
      <div class="grid">${parents.map((c) => `<button class="chip" data-cat="${esc(c[0])}">${esc(c[1])}</button>`).join("")}</div>
      ${sheet.parentOpen ? `<div class="section">${esc(catName(sheet.parentOpen))}</div><div class="chips">${CATS.filter((c) => c[3] === sheet.parentOpen).map((c) => `<button class="chip" data-cat="${esc(c[0])}">${esc(c[1])}</button>`).join("")}</div>` : ""}
    </div>`;
  }
  if (sheet.mode === "write") {
    const parsed = liveParse();
    const accepted = sheet.categoryAccepted || parsed.categoryFromUser;
    const showCat = parsed.type !== "transfer";
    const can = writeCanSave(parsed);
    return `<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-label="Write a transaction">
      <div class="grabber"></div>
      <button class="back" data-mode="form">Form</button>
      <textarea class="field" id="write" placeholder="Spent ₹350 on dinner">${esc(sheet.writeText)}</textarea>
      <div class="preview">
        <div class="plain-row"><span>Type</span><span>${esc(parsed.type || "—")}</span></div>
        <div class="plain-row"><span>Amount</span><span>${parsed.amountMinor ? esc(money(parsed.amountMinor)) : "—"}</span></div>
        ${showCat ? `<div class="plain-row"><span>Category</span><span>${accepted && (sheet.categoryId || parsed.categoryId) ? esc(catName(sheet.categoryId || p(catName(sheet.categoryId || parsed.categoryId)) : ""}</span></div>` : ""}
        <div class="plain-row"><span>Date</span><span>${esc(formatDayShort(parsed.occurredOn))}</span></div>
        <div class="plain-row"><span>Account</span><span>${esc(accountBy(parsed.accountId)?.name || "—")}</span></div>
        ${parsed.destinationAccountId ? `<div class="plain-row"><span>To</span><span>${esc(accountBy(parsed.destinationAccountId)?.name || "")}</span></div>` : ""}
      </div>
      ${parsed.banner ? `<div class="banner">${esc(parsed.banner)}</div>` : ""}
      ${showCat ? `<div class="chips">${(parsed.categoryId ? [parsed.categoryId] : ["food", "transport", "shopping"]).map((id) => `<button class="chip ${accepted && (sheet.categoryId || parsed.categoryId) === id ? "on" : ""}" data-accept="${esc(id)}">${esc(catName(id))}</button>`).join("")}</div>` : ""}
      <button class="primary" id="save" ${can ? "" : "disabled"}>Save</button>
    </div>`;
  }
  const amount = parsedAmount();
  const dest = accountBy(sheet.destinationId);
  const src = accountBy(sheet.accountId);
  const payCard = sheet.verb === "transfer" && dest?.type === "credit_card";
  const same = sheet.verb === "transfer" && sheet.destinationId && sheet.destinationId === sheet.accountId;
  const needsCat = sheet.verb !== "transfer";
  const can = amount.ok && (!needsCat || sheet.categoryId) && (sheet.verb !== "transfer" || (sheet.destinationId && !same));
  const accounts = state.accounts.filter((a) => !a.archivedAt);
  return `<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-label="Add">
    <div class="grabber"></div>
    <div class="segments">
      ${[["expense", "Spend"], ["income", "Receive"], ["transfer", "Move"]].map(([id, label]) => `<button class="${sheet.verb === id ? "on" : ""}" data-verb="${id}">${label}</button>`).join("")}
    </div>
    <input class="amount-input" id="amount" inputmode="decimal" placeholder="₹0" value="${esc(sheet.amountText)}" />
    ${needsCat ? `<div class="chips">${chipRow(sheet.verb === "income" ? "income" : "expense")}</div>` : `<div class="chips">${accounts.filter((a) => a.id !== sheet.accountId).map((a) => `<button class="chip ${sheet.destinationId === a.id ? "on" : ""}" data-dest="${esc(a.id)}">${esc(a.name)}</button>`).join("")}</div>`}
    <div class="meta">
      <button class="chip" data-cycle-account>${esc(src?.name || "Account")}</button>
      <button class="chip" data-date>${esc(sheet.date === todayIso() ? "Today" : formatDayShort(sheet.date))}</button>
    </div>
    ${same ? `<div class="banner">Choose a different account.</div>` : ""}
    ${amount.reason === "decimals" ? `<div class="banner">Use at most two decimal places.</div>` : ""}
    ${amount.reason === "incomplete" ? `<div class="banner">Finish the calculation before saving.</div>` : ""}
    ${sheet.showDetails ? `<input class="field" id="payee" placeholder="Description" value="${esc(sheet.payee)}" />` : ""}
    <div class="links"><button class="text-btn" data-details>Details</button><button class="text-btn" data-mode="write">Write instead</button></div>
    <button class="primary" id="save" ${can ? "" : "disabled"}>${payCard ? "Pay card" : sheet.verb === "transfer" ? "Move" : "Save"}</button>
    <div class="calc">${["+", "−", "×"].map((op) => `<button data-op="${op}">${op}</button>`).join("")}</div>
  </div>`;
}

function renderTabs() {
  if (!state.settings.onboarded || sheet) return "";
  const tab = ["home", "activity", "insights", "more"].includes(route.name) ? route.name : "";
  const item = (name, label, d) => `<button class="${tab === name ? "on" : ""}" data-tab="${name}">${svg(d)}<span>${label}</span></button>`;
  return `<nav class="tabs">
    ${item("home", "Home", "M4 11 12 4l8 7M6 10v9h12v-9")}
    ${item("activity", "Activity", "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01")}
    <button class="add-btn" data-add aria-label="Add">${svg("M12 5v14M5 12h14")}</button>
    ${item("insights", "Insights", "M5 19V9M12 19V5M19 19v-7")}
    ${item("more", "More", "M6 12h.01M12 12h.01M18 12h.01")}
  </nav>`;
}

function render() {
  applyTheme();
  const app = document.getElementById("app");
  let body = "";
  if (!state.settings.onboarded) body = renderOnboard();
  else if (route.name === "home") body = renderHome();
  else if (route.name === "activity") body = renderActivity();
  else if (route.name === "insights") body = renderInsights();
  else if (route.name === "more") body = renderMore();
  else if (route.name === "accounts") body = renderAccounts();
  else if (route.name === "account-new") body = renderAccountNew();
  else if (route.name === "categories") body = renderCategories();
  else if (route.name === "appearance") body = renderAppearance();
  else if (route.name === "format") body = renderFormat();
  else if (route.name === "backup") body = renderBackup();
  else if (route.name === "privacy") body = renderPrivacy();
  else if (route.name === "about") body = renderAbout();
  else if (route.name === "detail") body = renderDetail();
  app.innerHTML = `<div class="screen">${body}</div>${renderTabs()}${renderSheet()}${snack ? `<div class="snack"><span>${esc(snack.text)}</span>${snack.undo ? `<button id="undo">Undo</button>` : ""}</div>` : ""}`;
  bind();
}

function bind() {
  const app = document.getElementById("app");
  app.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { route = { name: b.dataset.tab }; render(); });
  app.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => { route = { name: b.dataset.go }; render(); });
  app.querySelectorAll("[data-add]").forEach((b) => b.onclick = () => openAdd());
  app.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => { route = { name: "detail", id: b.dataset.open, back: route.name }; render(); });
  app.querySelectorAll("[data-back]").forEach((b) => b.onclick = () => { route = { name: route.back || "home" }; render(); });
  app.querySelectorAll("[data-open-cap]").forEach((b) => b.onclick = () => { sheet = { mode: "cap" }; render(); });
  app.querySelectorAll("[data-close]").forEach((b) => b.onclick = () => { sheet = null; render(); });
  const undo = app.querySelector("#undo");
  if (undo) undo.onclick = () => { const fn = snack?.undo; snack = null; if (fn) fn(); render(); };

  const searchEl = app.querySelector("#search");
  if (searchEl) searchEl.oninput = () => { search = searchEl.value; const pos = searchEl.selectionStart; render(); const again = document.getElementById("search"); if (again) { again.focus(); again.selectionStart = again.selectionEnd = pos; } };
  app.querySelectorAll("[data-filter]").forEach((b) => b.onclick = () => { filterType = b.dataset.filter; render(); });

  app.querySelectorAll("[data-theme]").forEach((b) => b.onclick = () => { state.settings.theme = b.dataset.theme; save(); render(); });
  app.querySelectorAll("[data-group]").forEach((b) => b.onclick = () => { state.settings.grouping = b.dataset.group; save(); render(); });
  const savePayday = app.querySelector("#save-payday");
  if (savePayday) savePayday.onclick = () => {
    const day = Number(document.getElementById("payday").value);
    if (day >= 1 && day <= 31) { state.settings.paydayMode = "day"; state.settings.paydayDay = day; save(); render(); }
  };
  const noPayday = app.querySelector("#no-payday");
  if (noPayday) noPayday.onclick = () => { state.settings.paydayMode = "none"; save(); render(); };

  const onNext = app.querySelector("#on-next");
  if (onNext) onNext.onclick = () => {
    if (route.step === 2) {
      const day = Number(document.getElementById("on-day").value);
      if (day >= 1 && day <= 31) { state.settings.paydayMode = "day"; state.settings.paydayDay = day; }
    }
    route = { name: "onboard", step: (route.step || 1) + 1 };
    render();
  };
  const onSkip = app.querySelector("#on-skip");
  if (onSkip) onSkip.onclick = () => {
    if ((route.step || 1) === 3) finishOnboarding(false);
    else if (route.step === 2) { state.settings.paydayMode = "none"; route = { name: "onboard", step: 3 }; render(); }
    else { route = { name: "onboard", step: 2 }; render(); }
  };
  const onGroup = app.querySelector("#on-group");
  if (onGroup) onGroup.onclick = () => { state.settings.grouping = state.settings.grouping === "indian" ? "international" : "indian"; save(); render(); };
  const onFinish = app.querySelector("#on-finish");
  if (onFinish) onFinish.onclick = () => { draftBank = document.getElementById("on-bank").value; finishOnboarding(Boolean(draftBank.trim())); };
  const onBank = app.querySelector("#on-bank");
  if (onBank) onBank.oninput = () => { draftBank = onBank.value; };

  const accSave = app.querySelector("#acc-save");
  if (accSave) accSave.onclick = () => {
    const name = document.getElementById("acc-name").value.trim();
    const type = app.querySelector("[data-type].on")?.dataset.type || "bank";
    const opening = parseExpression(document.getElementById("acc-open").value || "");
    if (!name) return;
    addAccount({ name, type, openingMinor: opening.ok ? opening.amountMinor : 0 });
  };
  app.querySelectorAll("[data-type]").forEach((b) => b.onclick = () => {
    app.querySelectorAll("[data-type]").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
  });

  const exportCsv = app.querySelector("#export-csv");
  if (exportCsv) exportCsv.onclick = downloadCsv;
  const exportJson = app.querySelector("#export-json");
  if (exportJson) exportJson.onclick = downloadJson;
  const importJson = app.querySelector("#import-json");
  if (importJson) importJson.onclick = () => document.getElementById("file").click();
  const file = app.querySelector("#file");
  if (file) file.onchange = async () => {
    const text = await file.files[0].text();
    const data = JSON.parse(text);
    if (data.format !== "daybook-review") return alert("This file is damaged or not a Daybook backup.");
    state = data.state;
    save();
    route = { name: "home" };
    render();
  };
  const erase = app.querySelector("#erase");
  if (erase) erase.onclick = () => {
    if (!confirm("Erase the ledger in this browser? A file you already saved is not deleted.")) return;
    state = fresh();
    save();
    route = { name: "onboard", step: 1 };
    render();
  };

  app.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => deleteTxn(b.dataset.del));
  app.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => startEdit(b.dataset.edit));
  app.querySelectorAll("[data-dup]").forEach((b) => b.onclick = () => startEdit(b.dataset.dup, true));

  if (!sheet) return;
  const amount = app.querySelector("#amount");
  if (amount) {
    amount.oninput = () => { sheet.amountText = amount.value; paintSave(); };
    amount.focus();
  }
  const write = app.querySelector("#write");
  if (write) {
    write.oninput = () => { sheet.writeText = write.value; sheet.categoryAccepted = false; render(); const w = document.getElementById("write"); if (w) { w.focus(); w.selectionStart = w.selectionEnd = w.value.length; } };
    write.focus();
  }
  app.querySelectorAll("[data-verb]").forEach((b) => b.onclick = () => {
    sheet.verb = b.dataset.verb;
    sheet.categoryId = sheet.verb === "income" ? state.settings.lastIncomeCategoryId : state.settings.lastExpenseCategoryId;
    sheet.categoryAccepted = Boolean(sheet.categoryId);
    render();
  });
  app.querySelectorAll("[data-cat]").forEach((b) => b.onclick = () => {
    const id = b.dataset.cat;
    const children = CATS.filter((c) => c[3] === id);
    if (children.length && sheet.mode === "categories" && sheet.parentOpen !== id) {
      sheet.parentOpen = id;
      render();
      return;
    }
    sheet.categoryId = id;
    sheet.categoryAccepted = true;
    sheet.mode = "form";
    render();
  });
  app.querySelectorAll("[data-accept]").forEach((b) => b.onclick = () => {
    sheet.categoryId = b.dataset.accept;
    sheet.categoryAccepted = true;
    render();
  });
  app.querySelectorAll("[data-more-cats]").forEach((b) => b.onclick = () => { sheet.mode = "categories"; sheet.parentOpen = null; render(); });
  app.querySelectorAll("[data-sheet-back]").forEach((b) => b.onclick = () => { sheet.mode = "form"; render(); });
  app.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => { sheet.mode = b.dataset.mode; render(); });
  app.querySelectorAll("[data-dest]").forEach((b) => b.onclick = () => { sheet.destinationId = b.dataset.dest; render(); });
  app.querySelectorAll("[data-cycle-account]").forEach((b) => b.onclick = () => {
    const list = state.accounts.filter((a) => !a.archivedAt);
    const i = list.findIndex((a) => a.id === sheet.accountId);
    sheet.accountId = list[(i + 1) % list.length].id;
    render();
  });
  app.querySelectorAll("[data-date]").forEach((b) => b.onclick = () => {
    sheet.date = sheet.date === todayIso() ? addDays(todayIso(), -1) : todayIso();
    render();
  });
  app.querySelectorAll("[data-details]").forEach((b) => b.onclick = () => { sheet.showDetails = !sheet.showDetails; render(); });
  app.querySelectorAll("[data-op]").forEach((b) => b.onclick = () => {
    const op = b.dataset.op === "−" ? "-" : b.dataset.op === "×" ? "×" : "+";
    sheet.amountText = (sheet.amountText || "") + op;
    render();
  });
  const payee = app.querySelector("#payee");
  if (payee) payee.oninput = () => { sheet.payee = payee.value; };
  const saveBtn = app.querySelector("#save");
  if (saveBtn) saveBtn.onclick = saveSheet;
  const capSave = app.querySelector("#cap-save");
  if (capSave) capSave.onclick = () => {
    const parsed = parseExpression(document.getElementById("cap-input").value || "");
    if (!parsed.ok) return;
    state.settings.capMinor = parsed.amountMinor;
    sheet = null;
    save();
    render();
  };
  const capClear = app.querySelector("#cap-clear");
  if (capClear) capClear.onclick = () => { state.settings.capMinor = null; sheet = null; save(); render(); };
}

function paintSave() {
  const btn = document.getElementById("save");
  if (!btn || !sheet || sheet.mode !== "form") return;
  const amount = parsedAmount();
  const needsCat = sheet.verb !== "transfer";
  const same = sheet.verb === "transfer" && sheet.destinationId && sheet.destinationId === sheet.accountId;
  btn.disabled = !(amount.ok && (!needsCat || sheet.categoryId) && (sheet.verb !== "transfer" || (sheet.destinationId && !same)));
}

function startEdit(id, duplicate) {
  const t = state.transactions.find((x) => x.id === id);
  openAdd({
    verb: t.type === "income" ? "income" : t.type === "transfer" ? "transfer" : "expense",
    amountText: String(t.amountMinor / 100),
    categoryId: t.categoryId,
    categoryAccepted: Boolean(t.categoryId),
    accountId: t.accountId,
    destinationId: t.destinationAccountId,
    date: duplicate ? todayIso() : t.occurredOn,
    payee: t.payee || "",
    showDetails: Boolean(t.payee),
    editingId: duplicate ? null : t.id,
  });
}

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function downloadJson() {
  download("daybook-backup.json", JSON.stringify({ format: "daybook-review", exportedAt: new Date().toISOString(), state }, null, 2), "application/json");
}
function downloadCsv() {
  const lines = ["date,type,amount,currency,account,destination,category,payee,payment_method"];
  for (const t of posted()) {
    const cols = [t.occurredOn, t.type, (t.amountMinor / 100).toFixed(2), "INR", accountBy(t.accountId)?.name || "", accountBy(t.destinationAccountId)?.name || "", catName(t.categoryId), t.payee || "", t.paymentMethod || ""];
    lines.push(cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
  }
  download("daybook-export.csv", lines.join("\n"), "text/csv");
}

applyTheme();
render();
