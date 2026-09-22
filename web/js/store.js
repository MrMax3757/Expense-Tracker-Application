import { freshLedger } from "./defaults.js";
import { materializeRecurring } from "./ledger.js";
import { todayIso } from "./period.js";

const KEY = "daybook.ledger.v1";

export function loadLedger() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshLedger();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== 1) return freshLedger();
    const base = freshLedger();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
      categories: parsed.categories?.length ? parsed.categories : base.categories,
      accounts: (parsed.accounts || []).map(normalizeAccount),
      transactions: parsed.transactions || [],
      budgets: parsed.budgets || [],
      recurring: parsed.recurring || [],
      templates: parsed.templates || [],
      parserRules: parsed.parserRules || [],
      skippedOccurrences: parsed.skippedOccurrences || [],
      dismissedInsights: parsed.dismissedInsights || [],
    };
  } catch {
    return freshLedger();
  }
}

export function saveLedger(ledger) {
  localStorage.setItem(KEY, JSON.stringify(ledger));
}

export function bootLedger() {
  const ledger = loadLedger();
  materializeRecurring(ledger, todayIso());
  saveLedger(ledger);
  return ledger;
}

export async function hashSecret(secret, salt) {
  const data = new TextEncoder().encode(`${salt}:${secret}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function normalizeAccount(account) {
  const next = { ...account };
  if (next.type === "credit_card" || next.type === "investment") next.includeInSpendable = false;
  if (next.type === "savings" && next.includeInSpendable == null) next.includeInSpendable = false;
  return next;
}

export function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
