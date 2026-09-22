/** Insights are shown only when the ledger supports the sentence. No fabricated activity. */

import { accountById, categoryById, isCard, periodTotals, position, postedTransactions } from "./ledger.js";
import { compareIso, previousPeriod } from "./period.js";
import { formatMoney } from "./money.js";

/** One home line, in the locked order. Later lines are not shown if an earlier one is true. */
export function homeInsight(ledger, range) {
  const dismissed = new Set(ledger.dismissedInsights || []);
  const posted = postedTransactions(ledger).filter((tx) => tx.occurredOn >= range.start && tx.occurredOn <= range.end);
  const uncategorized = posted.filter((tx) => (tx.type === "expense" || tx.type === "refund") && !tx.categoryId);
  const candidates = [];
  if (uncategorized.length) {
    candidates.push({
      id: `uncat:${range.start}`,
      title: uncategorized.length === 1 ? "1 expense has no category." : `${uncategorized.length} expenses have no category.`,
      detail: "A total without a category cannot tell you where the money went.",
      href: "#/activity?uncategorized=1",
    });
  }
  if (ledger.settings.periodCapMinor != null) {
    const spent = periodTotals(ledger, range).spending;
    const ratio = spent / ledger.settings.periodCapMinor;
    if (ratio >= 0.8) {
      candidates.push({
        id: `cap:${range.start}`,
        title: ratio >= 1 ? "Spending is over the cap for this period." : "Spending has reached 80% of the cap.",
        detail: "The cap is a ceiling you set. Income does not raise it.",
        href: "#/budgets",
      });
    }
  }
  const expenses = posted.filter((tx) => tx.type === "expense" && tx.categoryId);
  if (expenses.length >= 3) {
    const byParent = new Map();
    for (const tx of expenses) {
      const cat = categoryById(ledger, tx.categoryId);
      const parent = cat?.parentId ? categoryById(ledger, cat.parentId) : cat;
      if (!parent) continue;
      byParent.set(parent.id, { name: parent.name, amount: (byParent.get(parent.id)?.amount || 0) + tx.amountMinor });
    }
    const largest = [...byParent.values()].sort((a, b) => b.amount - a.amount)[0];
    if (largest) {
      candidates.push({
        id: `largest:${range.start}:${largest.name}`,
        title: `${largest.name} is the largest category, ${formatMoney(largest.amount)}.`,
        detail: "Open reports if you want the rows behind that total.",
        href: "#/reports",
      });
    }
  }
  const allExpenses = posted.filter((tx) => tx.type === "expense").map((tx) => tx.amountMinor).sort((a, b) => a - b);
  if (allExpenses.length >= 5) {
    const median = allExpenses[Math.floor(allExpenses.length / 2)];
    const large = posted.filter((tx) => tx.type === "expense" && tx.amountMinor > median * 3)
      .sort((a, b) => b.amountMinor - a.amountMinor)[0];
    if (large) {
      const title = large.payee || categoryById(ledger, large.categoryId)?.name || "A transaction";
      candidates.push({
        id: `large:${large.id}`,
        title: `${title} is unusually large for this period, ${formatMoney(large.amountMinor)}.`,
        detail: "It is more than three times the median expense. That is a flag, not a judgment.",
        href: `#/tx/${large.id}`,
      });
    }
  }
  return candidates.find((item) => !dismissed.has(item.id)) || null;
}

export function buildInsights(ledger, range, financialRange, today) {
  const dismissed = new Set(ledger.dismissedInsights || []);
  const items = [];
  const posted = postedTransactions(ledger).filter((tx) => tx.occurredOn >= range.start && tx.occurredOn <= range.end);
  const uncategorized = posted.filter((tx) => (tx.type === "expense" || tx.type === "refund") && !tx.categoryId);
  if (uncategorized.length) {
    items.push({
      id: `uncat:${range.start}`,
      title: uncategorized.length === 1 ? "1 expense has no category." : `${uncategorized.length} expenses have no category.`,
      detail: "A total without a category cannot tell you where the money went.",
      href: "#/activity?uncategorized=1",
    });
  }

  const nowTotals = periodTotals(ledger, financialRange);
  const byCategory = new Map();
  for (const tx of posted) {
    if (tx.type !== "expense" || !tx.categoryId) continue;
    const cat = categoryById(ledger, tx.categoryId);
    const parent = cat?.parentId ? categoryById(ledger, cat.parentId) : cat;
    if (!parent) continue;
    byCategory.set(parent.id, { name: parent.name, amount: (byCategory.get(parent.id)?.amount || 0) + tx.amountMinor });
  }
  const largest = [...byCategory.values()].sort((a, b) => b.amount - a.amount)[0];
  const expenseCount = posted.filter((tx) => tx.type === "expense").length;
  if (largest && expenseCount >= 3) {
    items.push({
      id: `largest:${range.start}:${largest.name}`,
      title: `${largest.name} is the largest category, ${formatMoney(largest.amount)}.`,
      detail: "Open it if you want to see the rows behind that total.",
      href: "#/reports",
    });
  }

  if (ledger.settings.periodCapMinor != null && financialRange.start === range.start) {
    const ratio = nowTotals.spending / ledger.settings.periodCapMinor;
    if (ratio >= 0.8) {
      items.push({
        id: `cap:${financialRange.start}`,
        title: ratio >= 1 ? "Spending is over the cap for this period." : "Spending has reached 80% of the cap.",
        detail: "The cap is a ceiling you set. Income does not raise it.",
        href: "#/budgets",
      });
    }
  }

  const expenses = posted.filter((tx) => tx.type === "expense").map((tx) => tx.amountMinor).sort((a, b) => a - b);
  if (expenses.length >= 5) {
    const median = expenses[Math.floor(expenses.length / 2)];
    const large = posted.filter((tx) => tx.type === "expense" && tx.amountMinor > median * 3)
      .sort((a, b) => b.amountMinor - a.amountMinor)[0];
    if (large) {
      const title = large.payee || categoryById(ledger, large.categoryId)?.name || "A transaction";
      items.push({
        id: `large:${large.id}`,
        title: `${title} is unusually large for this period, ${formatMoney(large.amountMinor)}.`,
        detail: "It is more than three times the median expense. That is a flag, not a judgment.",
        href: `#/tx/${large.id}`,
      });
    }
  }

  const previous = previousPeriod(financialRange, ledger.settings);
  const prevTotals = periodTotals(ledger, previous);
  if (prevTotals.expenses > 0 && nowTotals.spending !== prevTotals.spending) {
    const delta = nowTotals.spending - prevTotals.spending;
    const direction = delta > 0 ? "more" : "less";
    items.push({
      id: `compare:${financialRange.start}`,
      title: `Spending is ${formatMoney(Math.abs(delta))} ${direction} than the previous period.`,
      detail: "This compares eligible spending only. Transfers and card payments are not included.",
      href: "#/reports",
    });
  }

  for (const rule of ledger.recurring || []) {
    if (rule.paused || !rule.nextOn) continue;
    if (compareIso(rule.nextOn, today) >= 0 && compareIso(rule.nextOn, addSafe(today, 3)) <= 0) {
      items.push({
        id: `recur:${rule.id}:${rule.nextOn}`,
        title: `${rule.payee || "A repeating item"} is due ${rule.nextOn === today ? "today" : "soon"}.`,
        detail: "Confirm it when it happens. Daybook will not post it twice.",
        href: "#/recurring",
      });
    }
  }

  const pending = ledger.transactions.filter((tx) => tx.status === "pending");
  if (pending.length) {
    items.push({
      id: `pending:${pending.length}`,
      title: pending.length === 1 ? "1 repeating item is waiting." : `${pending.length} repeating items are waiting.`,
      detail: "They are not in your totals until you confirm them.",
      href: "#/recurring",
    });
  }

  for (const account of ledger.accounts) {
    if (account.archivedAt) continue;
    const owed = position(ledger, account);
    if (isCard(account) && owed > 0) {
      items.push({
        id: `card:${account.id}`,
        title: `${account.name} has ${formatMoney(owed)} owed.`,
        detail: account.creditLimitMinor != null && owed > account.creditLimitMinor
          ? "This is over the limit you set. Available credit is not cash."
          : "A card payment is a move, not another expense.",
        href: `#/account/${account.id}`,
      });
    }
    if (!isCard(account) && account.includeInSpendable && owed < 0) {
      items.push({
        id: `neg:${account.id}`,
        title: `${account.name} is below zero.`,
        detail: "Check for a missing receipt or record a balance correction. A correction is not spending.",
        href: `#/account/${account.id}`,
      });
    }
  }

  return items.filter((item) => !dismissed.has(item.id)).slice(0, 6);
}

function addSafe(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function accountByIdSafe(ledger, id) {
  return accountById(ledger, id);
}
