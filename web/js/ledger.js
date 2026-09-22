/**
 * Authoritative accounting engine.
 *
 * Widgets must not recompute these numbers. Every screen calls this module.
 *
 * Decisions recorded here:
 * - Transactions are the source of truth. Balances are derived.
 * - Hard delete plus in-memory Undo. No deleted_at column.
 * - A transfer, card payment, cash advance, opening balance, and balance
 *   adjustment are neither income nor spending.
 * - A refund reduces spending in the refund's period. It is not income.
 * - A reimbursement is money received, reported apart from salary. It is not
 *   a refund and does not reduce spending.
 * - Available credit is never added to cash you have.
 * - Card credit (negative amount owed) is a liability credit, not cash.
 * - Investment accounts are manual assets. No prices, no tickers.
 * - Mixed-currency moves are rejected. No invented exchange rate.
 * - Over-limit card purchases are allowed and flagged. Blocking them would
 *   hide a purchase that already happened.
 * - Pending recurring drafts do not affect balances or period totals.
 */

import { legalMethods } from "./defaults.js";
import { compareIso, inRange, nextOccurrence, todayIso } from "./period.js";

export function id(prefix = "id") {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function accountById(ledger, accountId) {
  return ledger.accounts.find((a) => a.id === accountId) || null;
}

export function categoryById(ledger, categoryId) {
  return ledger.categories.find((c) => c.id === categoryId) || null;
}

export function isCard(account) {
  return account?.type === "credit_card";
}

export function isAsset(account) {
  return account && !isCard(account);
}

export function postedTransactions(ledger) {
  return ledger.transactions.filter((tx) => tx.status !== "pending");
}

export function effectOnAccount(tx, account) {
  if (!account || tx.status === "pending") return 0;
  const amt = tx.amountMinor;
  const onThis = tx.accountId === account.id;
  const dest = tx.destinationAccountId === account.id;
  if (tx.type === "expense") return onThis ? (isCard(account) ? amt : -amt) : 0;
  if (tx.type === "income" || tx.type === "reimbursement") return onThis ? (isCard(account) ? -amt : amt) : 0;
  if (tx.type === "refund") return onThis ? (isCard(account) ? -amt : amt) : 0;
  if (tx.type === "transfer") {
    if (onThis) return isCard(account) ? amt : -amt;
    if (dest) return isCard(account) ? -amt : amt;
    return 0;
  }
  if (tx.type === "adjustment" && onThis) {
    return tx.adjustmentDirection === "decrease" ? -amt : amt;
  }
  return 0;
}

export function position(ledger, account, asOf = null) {
  let value = 0;
  for (const tx of postedTransactions(ledger)) {
    if (asOf && compareIso(tx.occurredOn, asOf) > 0) continue;
    value += effectOnAccount(tx, account);
  }
  return value;
}

export function cashYouHave(ledger, asOf = null) {
  return ledger.accounts
    .filter((a) => !a.archivedAt && isAsset(a) && a.includeInSpendable)
    .reduce((sum, a) => sum + position(ledger, a, asOf), 0);
}

export function assetsTotal(ledger, asOf = null) {
  return ledger.accounts
    .filter((a) => !a.archivedAt && isAsset(a) && a.includeInNetWorth !== false)
    .reduce((sum, a) => sum + position(ledger, a, asOf), 0);
}

export function liabilitiesTotal(ledger, asOf = null) {
  return ledger.accounts
    .filter((a) => !a.archivedAt && isCard(a) && a.includeInNetWorth !== false)
    .reduce((sum, a) => sum + position(ledger, a, asOf), 0);
}

export function netWorth(ledger, asOf = null) {
  return assetsTotal(ledger, asOf) - liabilitiesTotal(ledger, asOf);
}

export function availableCredit(account, owed) {
  if (!isCard(account) || account.creditLimitMinor == null) return null;
  return account.creditLimitMinor - owed;
}

export function cardLabel(owed) {
  if (owed < 0) return "Credit balance";
  if (owed === 0) return "Nothing owed";
  return "You owe";
}

export function inPeriod(tx, range) {
  return Boolean(range && inRange(tx.occurredOn, range.start, range.end));
}

export function periodTotals(ledger, range, extra = {}) {
  const categoryId = extra.categoryId || null;
  const accountId = extra.accountId || null;
  let expenses = 0;
  let refunds = 0;
  let income = 0;
  let reimbursements = 0;
  for (const tx of postedTransactions(ledger)) {
    if (range && !inPeriod(tx, range)) continue;
    if (accountId && tx.accountId !== accountId && tx.destinationAccountId !== accountId) continue;
    if (categoryId && !categoryMatches(ledger, tx.categoryId, categoryId)) continue;
    if (tx.type === "expense") expenses += tx.amountMinor;
    else if (tx.type === "refund") refunds += tx.amountMinor;
    else if (tx.type === "income") income += tx.amountMinor;
    else if (tx.type === "reimbursement") reimbursements += tx.amountMinor;
  }
  const spending = expenses - refunds;
  const periodIncome = income + reimbursements;
  return { expenses, refunds, spending, income, reimbursements, periodIncome };
}

export function categoryMatches(ledger, txCategoryId, wantedId) {
  if (!wantedId) return true;
  if (txCategoryId === wantedId) return true;
  const cat = categoryById(ledger, txCategoryId);
  return cat?.parentId === wantedId;
}

export function heroFor(ledger, range, financialRange) {
  const totals = periodTotals(ledger, range);
  const viewingCapPeriod = financialRange && range.start === financialRange.start && range.end === financialRange.end;
  const cap = ledger.settings.periodCapMinor;
  if (viewingCapPeriod && cap != null) {
    const left = cap - totals.spending;
    if (left >= 0) {
      return { label: "Left this period", value: left, kind: "cap", totals, cap };
    }
    return { label: "Over this period", value: left, kind: "over", totals, cap };
  }
  // Left after income uses salary-like income only. A reimbursement is money
// received, reported apart from salary, and must not inflate this hero.
  if (viewingCapPeriod && cap == null && totals.income > 0) {
    return {
      label: "Left after income",
      value: totals.income - totals.spending,
      kind: "after",
      totals,
      cap: null,
    };
  }
  return {
    label: viewingCapPeriod ? "Spent this period" : `Spent · ${range.label || "range"}`,
    value: totals.spending,
    kind: "spent",
    totals,
    cap: null,
  };
}

export function explainHero(hero) {
  const t = hero.totals;
  if (hero.kind === "cap") {
    return `Left against cap is the spending cap minus period spending. Period spending is expenses minus refunds. Transfers, card payments, cash advances, opening balances, and corrections are excluded.`;
  }
  if (hero.kind === "over") {
    return `Over this period is period spending minus the cap. It is not a change in cash.`;
  }
  if (hero.kind === "after") {
    return `Left after income is period income minus period spending. It is not a spending cap, and it is not cash you have.`;
  }
  return `Spent is expenses in this range minus refunds in this range. Income is shown separately and is not subtracted unless you have no cap and the range is the financial period.`;
}

export function categoryRollup(ledger, range, kind = "expense") {
  const parents = ledger.categories.filter((c) => c.kind === kind && !c.parentId && !c.archivedAt);
  const rows = [];
  for (const parent of parents) {
    let amount = 0;
    for (const tx of postedTransactions(ledger)) {
      if (range && !inPeriod(tx, range)) continue;
      if (kind === "expense") {
        if (tx.type === "expense" && categoryMatches(ledger, tx.categoryId, parent.id)) amount += tx.amountMinor;
        if (tx.type === "refund" && categoryMatches(ledger, tx.categoryId, parent.id)) amount -= tx.amountMinor;
      } else if ((tx.type === "income" || tx.type === "reimbursement") && categoryMatches(ledger, tx.categoryId, parent.id)) {
        amount += tx.amountMinor;
      }
    }
    if (amount !== 0) rows.push({ id: parent.id, name: parent.name, amount, color: parent.color });
  }
  const uncategorized = postedTransactions(ledger).filter((tx) => {
    if (range && !inPeriod(tx, range)) return false;
    if (kind === "expense") return (tx.type === "expense" || tx.type === "refund") && !tx.categoryId;
    return (tx.type === "income" || tx.type === "reimbursement") && !tx.categoryId;
  });
  if (uncategorized.length) {
    const amount = uncategorized.reduce((s, tx) => s + (tx.type === "refund" ? -tx.amountMinor : tx.amountMinor), 0);
    if (amount) rows.push({ id: null, name: "Uncategorized", amount, color: "stone" });
  }
  rows.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  return rows;
}

export function dailyTotals(ledger, range) {
  const map = new Map();
  for (const tx of postedTransactions(ledger)) {
    if (!inPeriod(tx, range)) continue;
    if (tx.type !== "expense" && tx.type !== "refund" && tx.type !== "income" && tx.type !== "reimbursement") continue;
    const row = map.get(tx.occurredOn) || { date: tx.occurredOn, spending: 0, income: 0 };
    if (tx.type === "expense") row.spending += tx.amountMinor;
    if (tx.type === "refund") row.spending -= tx.amountMinor;
    if (tx.type === "income" || tx.type === "reimbursement") row.income += tx.amountMinor;
    map.set(tx.occurredOn, row);
  }
  return [...map.values()].sort((a, b) => compareIso(a.date, b.date));
}

export function payeeTotals(ledger, range) {
  const map = new Map();
  for (const tx of postedTransactions(ledger)) {
    if (!inPeriod(tx, range) || tx.type !== "expense") continue;
    const name = tx.payee || "No payee";
    map.set(name, (map.get(name) || 0) + tx.amountMinor);
  }
  return [...map.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
}

export function validateTransaction(ledger, tx, editingId = null) {
  const errors = [];
  if (!tx.type) errors.push("Choose what this is.");
  if (!tx.amountMinor || tx.amountMinor <= 0 || !Number.isInteger(tx.amountMinor)) {
    errors.push("Amount must be greater than zero.");
  }
  if (!tx.occurredOn || !/^\d{4}-\d{2}-\d{2}$/.test(tx.occurredOn)) errors.push("Choose a date.");
  const account = accountById(ledger, tx.accountId);
  if (!account) errors.push("Choose an account.");
  else if (account.archivedAt) errors.push("That account is archived.");
  if (account?.type === "investment" && tx.type !== "adjustment") {
    errors.push("An investment account only holds a manual balance. Move money into a bank or cash account before spending it. Daybook does not track market prices.");
  }
  if (tx.type === "transfer") {
    const dest = accountById(ledger, tx.destinationAccountId);
    if (!dest) errors.push("Choose a destination account.");
    else if (dest.archivedAt) errors.push("The destination account is archived.");
    if (account && dest && account.id === dest.id) errors.push("Choose a different account.");
    if (account && dest && account.currency !== dest.currency) {
      errors.push("Daybook does not invent an exchange rate. Both accounts must use the same currency.");
    }
    if (account && dest && isCard(account) && isCard(dest)) {
      errors.push("Pay each card from a bank, cash, or wallet account. A move between two cards is not supported.");
    }
    if (dest?.type === "investment" || account?.type === "investment") {
      errors.push("Move investments through a balance correction. Daybook does not track buys and sells.");
    }
    if (tx.transferKind === "atm" && (account?.type !== "bank" || dest?.type !== "cash")) {
      errors.push("An ATM move is from a bank account to cash.");
    }
    if (tx.transferKind === "card_payment" && !(dest && isCard(dest) && account && !isCard(account))) {
      errors.push("Pay card moves money from a bank, cash, or wallet onto a credit card.");
    }
    if (tx.transferKind === "cash_advance" && !(account && isCard(account) && dest && !isCard(dest))) {
      errors.push("A cash advance moves money from a credit card to a bank, cash, or wallet.");
    }
  }
  if (["expense", "income", "refund", "reimbursement"].includes(tx.type)) {
    if (!tx.categoryId) errors.push("Pick a category to save this.");
    const cat = categoryById(ledger, tx.categoryId);
    if (cat?.archivedAt) errors.push("That category is archived.");
    if (cat && (tx.type === "expense" || tx.type === "refund") && cat.kind !== "expense") {
      errors.push("Pick a spending category.");
    }
    if (cat && (tx.type === "income" || tx.type === "reimbursement") && cat.kind !== "income") {
      errors.push("Pick an income category.");
    }
    if (tx.type === "reimbursement" && cat && cat.id !== "income.reimbursement" && cat.kind === "income") {
      // allowed, but the UI should prefer the reimbursement category
    }
  }
  if (tx.type === "adjustment") {
    if (tx.adjustmentKind !== "opening_balance" && tx.adjustmentKind !== "balance_adjustment") {
      errors.push("Choose opening balance or balance correction.");
    }
    if (tx.adjustmentKind === "opening_balance") {
      if (tx.adjustmentDirection === "decrease") errors.push("An opening balance increases the starting position.");
      const existing = postedTransactions(ledger).find((row) =>
        row.id !== editingId && row.accountId === tx.accountId && row.adjustmentKind === "opening_balance");
      if (existing) errors.push("This account already has an opening balance. Use a balance correction.");
    }
  }
  if (account && tx.paymentMethod && !legalMethods(account.type).includes(tx.paymentMethod) && tx.type !== "transfer" && tx.type !== "adjustment") {
    errors.push("That payment method does not belong to this account.");
  }
  if (account && isCard(account) && tx.type === "expense" && tx.paymentMethod && tx.paymentMethod !== "credit_card") {
    errors.push("A credit-card purchase uses the credit card itself, not UPI or a debit card.");
  }
  if (account && !isCard(account) && tx.paymentMethod === "credit_card") {
    errors.push("Credit card is an account, not a payment method on this account.");
  }
  return errors;
}

export function transferKindFor(source, dest, requested) {
  if (requested === "atm" || requested === "cash_advance" || requested === "card_payment") return requested;
  if (isCard(dest) && source && !isCard(source)) return "card_payment";
  if (isCard(source) && dest && !isCard(dest)) return "cash_advance";
  if (source?.type === "bank" && dest?.type === "cash") return "standard";
  return "standard";
}

export function moveLabel(kind) {
  if (kind === "card_payment") return "Pay card";
  if (kind === "cash_advance") return "Cash advance";
  if (kind === "atm") return "ATM";
  return "Move";
}

export function typeLabel(type, kind) {
  if (type === "expense") return "Spend";
  if (type === "income") return "Receive";
  if (type === "refund") return "Refund";
  if (type === "reimbursement") return "Reimbursement";
  if (type === "adjustment") return kind === "opening_balance" ? "Opening balance" : "Balance correction";
  if (type === "transfer") return moveLabel(kind);
  return "Transaction";
}

export function countsAsSpending(tx) {
  return tx.type === "expense" || tx.type === "refund";
}

export function budgetProgress(ledger, budget, range) {
  const totals = budget.categoryId
    ? periodTotals(ledger, range, { categoryId: budget.categoryId })
    : periodTotals(ledger, range);
  const spent = totals.spending;
  const left = budget.amountMinor - spent;
  const ratio = budget.amountMinor > 0 ? spent / budget.amountMinor : 0;
  return { spent, left, ratio, over: left < 0 };
}

export function upcomingOccurrences(rule, today, count = 6) {
  const dates = [];
  let cursor = rule.nextOn || rule.startOn;
  let guard = 0;
  while (dates.length < count && guard < 400) {
    if (!rule.endOn || compareIso(cursor, rule.endOn) <= 0) dates.push(cursor);
    else break;
    cursor = nextOccurrence(cursor, rule.frequency, rule.interval);
    guard += 1;
    if (compareIso(cursor, today) < 0 && guard > 1 && dates.length === 0) break;
  }
  return dates.filter((date) => !rule.endOn || compareIso(date, rule.endOn) <= 0);
}

export function occurrenceKey(ruleId, date) {
  return `${ruleId}:${date}`;
}

export function alreadyGenerated(ledger, ruleId, date) {
  if (ledger.skippedOccurrences?.includes(occurrenceKey(ruleId, date))) return true;
  return ledger.transactions.some((tx) => tx.recurringRuleId === ruleId && tx.occurrenceOn === date);
}

/**
 * Creates pending drafts for due rules. Does not post them unless autoPost is on.
 * Never creates a second row for the same rule and date.
 */
export function materializeRecurring(ledger, today = todayIso()) {
  const created = [];
  const errors = [];
  for (const rule of ledger.recurring) {
    if (rule.paused) continue;
    let cursor = rule.nextOn || rule.startOn;
    let guard = 0;
    while (compareIso(cursor, today) <= 0 && guard < 400) {
      if (rule.endOn && compareIso(cursor, rule.endOn) > 0) break;
      if (!alreadyGenerated(ledger, rule.id, cursor)) {
        const account = accountById(ledger, rule.accountId);
        if (!account || account.archivedAt) {
          errors.push({ ruleId: rule.id, message: `${rule.payee || "A repeating item"} needs an active account.` });
          break;
        }
        const tx = transactionFromRule(rule, cursor, rule.autoPost ? "posted" : "pending");
        const problems = tx.status === "posted" ? validateTransaction(ledger, tx) : [];
        if (problems.length) {
          errors.push({ ruleId: rule.id, message: problems[0] });
          break;
        }
        ledger.transactions.push(tx);
        created.push(tx);
      }
      cursor = nextOccurrence(cursor, rule.frequency, rule.interval);
      rule.nextOn = cursor;
      guard += 1;
    }
    if (compareIso(rule.nextOn || rule.startOn, today) <= 0) {
      rule.nextOn = nextOccurrence(cursor, rule.frequency, rule.interval);
    }
  }
  return { created, errors };
}

export function transactionFromRule(rule, date, status) {
  return {
    id: id("tx"),
    type: rule.type,
    status,
    amountMinor: rule.amountMinor,
    currency: rule.currency || "INR",
    accountId: rule.accountId,
    destinationAccountId: rule.destinationAccountId || null,
    categoryId: rule.categoryId || null,
    payee: rule.payee || "",
    note: rule.note || "",
    tags: rule.tags || [],
    occurredOn: date,
    occurredTime: null,
    paymentMethod: rule.paymentMethod || null,
    adjustmentKind: null,
    adjustmentDirection: null,
    transferKind: rule.transferKind || null,
    linkedTransactionId: null,
    recurringRuleId: rule.id,
    occurrenceOn: date,
    templateId: null,
    source: "recurring",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function confirmPending(ledger, txId) {
  const tx = ledger.transactions.find((row) => row.id === txId);
  if (!tx || tx.status !== "pending") return ["That item is not waiting."];
  const problems = validateTransaction(ledger, { ...tx, status: "posted" }, tx.id);
  if (problems.length) return problems;
  tx.status = "posted";
  tx.updatedAt = new Date().toISOString();
  return [];
}

export function skipPending(ledger, txId) {
  const index = ledger.transactions.findIndex((row) => row.id === txId);
  if (index < 0) return;
  const tx = ledger.transactions[index];
  if (tx.recurringRuleId && tx.occurrenceOn) {
    ledger.skippedOccurrences.push(occurrenceKey(tx.recurringRuleId, tx.occurrenceOn));
  }
  ledger.transactions.splice(index, 1);
}

export function searchTransactions(ledger, query) {
  const text = (query.text || "").trim().toLowerCase();
  const numeric = /^\d+(\.\d{1,2})?$/.test(text.replace(/[₹,\s]/g, ""));
  const wantedMinor = numeric ? Math.round(Number(text.replace(/[₹,\s]/g, "")) * 100) : null;
  const rows = ledger.transactions.filter((tx) => query.hidePending ? tx.status !== "pending" : true);
  return rows.filter((tx) => {
    if (query.type && tx.type !== query.type) return false;
    if (query.accountId && tx.accountId !== query.accountId && tx.destinationAccountId !== query.accountId) return false;
    if (query.categoryId && !categoryMatches(ledger, tx.categoryId, query.categoryId)) return false;
    if (query.paymentMethod && tx.paymentMethod !== query.paymentMethod) return false;
    if (query.tag && !(tx.tags || []).includes(query.tag)) return false;
    if (query.start && compareIso(tx.occurredOn, query.start) < 0) return false;
    if (query.end && compareIso(tx.occurredOn, query.end) > 0) return false;
    if (query.minMinor != null && tx.amountMinor < query.minMinor) return false;
    if (query.maxMinor != null && tx.amountMinor > query.maxMinor) return false;
    if (!text) return true;
    if (wantedMinor != null && tx.amountMinor === wantedMinor) return true;
    if (wantedMinor != null && text.replace(/[₹,\s]/g, "") === String(wantedMinor / 100)) return tx.amountMinor === wantedMinor;
    const account = accountById(ledger, tx.accountId);
    const dest = accountById(ledger, tx.destinationAccountId);
    const category = categoryById(ledger, tx.categoryId);
    const hay = [tx.payee, tx.note, category?.name, account?.name, dest?.name, ...(tx.tags || []), tx.type, tx.paymentMethod]
      .filter(Boolean).join(" ").toLowerCase();
    if (numeric) return tx.amountMinor === wantedMinor;
    return hay.includes(text);
  }).sort((a, b) => {
    if (query.sort === "amount") return query.dir === "asc" ? a.amountMinor - b.amountMinor : b.amountMinor - a.amountMinor;
    if (query.sort === "oldest") return compareIso(a.occurredOn, b.occurredOn) || String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    return compareIso(b.occurredOn, a.occurredOn) || String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

export function canDeleteAccount(ledger, accountId) {
  const used = ledger.transactions.some((tx) => tx.accountId === accountId || tx.destinationAccountId === accountId);
  const rules = ledger.recurring.some((rule) => rule.accountId === accountId || rule.destinationAccountId === accountId);
  return { used: used || rules, reason: used || rules ? "This account is used by transactions. Archive it, or move those transactions first." : null };
}

export function reassignAccount(ledger, fromId, toId) {
  if (fromId === toId) return ["Choose a different account."];
  const from = accountById(ledger, fromId);
  const to = accountById(ledger, toId);
  if (!from || !to) return ["Choose an account."];
  if (from.currency !== to.currency) return ["Both accounts must use the same currency."];
  if (isCard(from) !== isCard(to)) {
    return ["Move a card's history only to another credit card, and a bank's history only to another asset. Mixing them would change what the numbers mean."];
  }
  for (const tx of ledger.transactions) {
    if (tx.accountId === fromId) tx.accountId = toId;
    if (tx.destinationAccountId === fromId) tx.destinationAccountId = toId;
  }
  for (const rule of ledger.recurring) {
    if (rule.accountId === fromId) rule.accountId = toId;
    if (rule.destinationAccountId === fromId) rule.destinationAccountId = toId;
  }
  for (const template of ledger.templates) {
    if (template.accountId === fromId) template.accountId = toId;
    if (template.destinationAccountId === fromId) template.destinationAccountId = toId;
  }
  ledger.accounts = ledger.accounts.filter((a) => a.id !== fromId);
  if (ledger.settings.defaultAccountId === fromId) ledger.settings.defaultAccountId = toId;
  return [];
}

export function reassignCategory(ledger, fromId, toId) {
  if (fromId === toId) return ["Choose a different category."];
  const from = categoryById(ledger, fromId);
  const to = categoryById(ledger, toId);
  if (!from || !to) return ["Choose a category."];
  if (from.kind !== to.kind) return ["Those categories are not the same kind."];
  for (const tx of ledger.transactions) if (tx.categoryId === fromId) tx.categoryId = toId;
  for (const rule of ledger.recurring) if (rule.categoryId === fromId) rule.categoryId = toId;
  for (const template of ledger.templates) if (template.categoryId === fromId) template.categoryId = toId;
  for (const budget of ledger.budgets) if (budget.categoryId === fromId) budget.categoryId = toId;
  for (const child of ledger.categories) if (child.parentId === fromId) child.parentId = to.parentId ? to.parentId : toId;
  ledger.categories = ledger.categories.filter((c) => c.id !== fromId);
  return [];
}

export function activeAccounts(ledger) {
  return ledger.accounts.filter((a) => !a.archivedAt).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

export function transactionTitle(ledger, tx) {
  if (tx.payee) return tx.payee;
  const cat = categoryById(ledger, tx.categoryId);
  if (cat) return cat.name;
  return typeLabel(tx.type, tx.adjustmentKind || tx.transferKind);
}

export function amountClass(tx) {
  if (tx.type === "expense") return "spend";
  if (tx.type === "income" || tx.type === "reimbursement" || tx.type === "refund") return "receive";
  return "move";
}

export function displaySign(tx) {
  if (tx.type === "expense") return "minus";
  if (tx.type === "income" || tx.type === "reimbursement" || tx.type === "refund") return "plus";
  return "none";
}
