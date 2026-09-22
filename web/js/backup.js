/**
 * CSV is a readable export. It is not a restore format.
 * JSON is the full ledger. It is not encrypted. Anyone with the file can read it.
 * Restore validates the checksum and schema before replacing anything.
 * A failure imports nothing and does not change the current ledger.
 */

import { freshLedger } from "./defaults.js";

export const SCHEMA_VERSION = 1;
export const APP_VERSION = "1.0.0";

export function canonical(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = sortValue(value[key]);
      return out;
    }, {});
  }
  return value;
}

export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function publicSettings(settings) {
  const copy = { ...settings };
  // The PIN is a local gate. It is not a key, and it does not travel in the file.
  delete copy.pinHash;
  delete copy.pinSalt;
  delete copy.recoveryHash;
  copy.appLockEnabled = false;
  return copy;
}

export async function buildBackup(ledger) {
  const payload = {
    settings: publicSettings(ledger.settings),
    accounts: ledger.accounts,
    categories: ledger.categories,
    transactions: ledger.transactions,
    budgets: ledger.budgets,
    recurring: ledger.recurring,
    templates: ledger.templates,
    parserRules: ledger.parserRules,
    skippedOccurrences: ledger.skippedOccurrences,
    dismissedInsights: ledger.dismissedInsights,
  };
  const body = canonical(payload);
  return {
    format: "daybook-backup",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    encrypted: false,
    payload,
    checksum: await sha256(body),
  };
}

export async function validateBackup(file) {
  const errors = [];
  if (!file || typeof file !== "object") return { ok: false, errors: ["This file is damaged or not a Daybook backup."] };
  if (file.format !== "daybook-backup") errors.push("This file is damaged or not a Daybook backup.");
  if (file.schemaVersion !== SCHEMA_VERSION) errors.push(`This backup uses schema ${file.schemaVersion}. Daybook can restore schema ${SCHEMA_VERSION} only.`);
  if (!file.payload || typeof file.payload !== "object") errors.push("This file is damaged or not a Daybook backup.");
  if (!file.checksum) errors.push("This file is damaged or not a Daybook backup.");
  if (errors.length) return { ok: false, errors };
  const expected = await sha256(canonical(file.payload));
  if (expected !== file.checksum) return { ok: false, errors: ["This file is damaged or not a Daybook backup."] };
  const structural = validatePayload(file.payload);
  if (structural.length) return { ok: false, errors: structural };
  return { ok: true, errors: [], ledger: payloadToLedger(file.payload) };
}

function validatePayload(payload) {
  const errors = [];
  const accounts = payload.accounts || [];
  const categories = payload.categories || [];
  const accountIds = new Set(accounts.map((a) => a.id));
  const categoryIds = new Set(categories.map((c) => c.id));
  const txIds = new Set();
  if (!Array.isArray(accounts) || !Array.isArray(payload.transactions)) {
    return ["This file is damaged or not a Daybook backup."];
  }
  for (const account of accounts) {
    if (!account.id || !account.name || !account.type) errors.push("A backup account is missing a name or type.");
    if (accountIds.size !== accounts.length) errors.push("This backup contains a duplicate account.");
  }
  if (new Set(accounts.map((a) => a.id)).size !== accounts.length) errors.push("This backup contains a duplicate account.");
  for (const tx of payload.transactions || []) {
    if (!tx.id || txIds.has(tx.id)) errors.push("This backup contains a duplicate transaction.");
    txIds.add(tx.id);
    if (!accountIds.has(tx.accountId)) errors.push("A transaction points at an account that is not in the backup.");
    if (tx.destinationAccountId && !accountIds.has(tx.destinationAccountId)) {
      errors.push("A transfer points at an account that is not in the backup.");
    }
    if (tx.categoryId && !categoryIds.has(tx.categoryId)) errors.push("A transaction points at a category that is not in the backup.");
    if (!Number.isInteger(tx.amountMinor) || tx.amountMinor <= 0) errors.push("A transaction has an invalid amount.");
  }
  for (const rule of payload.recurring || []) {
    if (rule.accountId && !accountIds.has(rule.accountId)) errors.push("A repeating item points at a missing account.");
  }
  return [...new Set(errors)];
}

function payloadToLedger(payload) {
  const base = freshLedger();
  return {
    ...base,
    schemaVersion: SCHEMA_VERSION,
    settings: publicSettings({ ...base.settings, ...payload.settings }),
    accounts: payload.accounts || [],
    categories: payload.categories?.length ? payload.categories : base.categories,
    transactions: payload.transactions || [],
    budgets: payload.budgets || [],
    recurring: payload.recurring || [],
    templates: payload.templates || [],
    parserRules: payload.parserRules || [],
    skippedOccurrences: payload.skippedOccurrences || [],
    dismissedInsights: payload.dismissedInsights || [],
  };
}

export function toCsv(ledger) {
  const headers = ["date", "time", "type", "amount", "currency", "account", "destination account", "category", "parent category", "payee", "note", "payment method", "status"];
  const lines = [headers.join(",")];
  const note = "Daybook CSV is for reading in a spreadsheet. It cannot restore the ledger. Amounts use a dot decimal, not Indian grouping.";
  lines.unshift(`# ${note}`);
  for (const tx of ledger.transactions) {
    const account = ledger.accounts.find((a) => a.id === tx.accountId);
    const dest = ledger.accounts.find((a) => a.id === tx.destinationAccountId);
    const category = ledger.categories.find((c) => c.id === tx.categoryId);
    const parent = category?.parentId ? ledger.categories.find((c) => c.id === category.parentId) : null;
    const amount = (tx.amountMinor / 100).toFixed(2);
    lines.push([
      tx.occurredOn, tx.occurredTime || "", tx.type, amount, tx.currency || "INR",
      account?.name || "", dest?.name || "", category?.name || "", parent?.name || "",
      tx.payee || "", tx.note || "", tx.paymentMethod || "", tx.status || "posted",
    ].map(csvCell).join(","));
  }
  return lines.join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
