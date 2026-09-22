/**
 * Money is an integer in minor units. INR uses paise. Never store a float.
 * Sign lives on the transaction type, not on the stored amount.
 */

export function groupIndian(digits) {
  const text = String(digits);
  if (text.length <= 3) return text;
  const last3 = text.slice(-3);
  let rest = text.slice(0, -3);
  const parts = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(",")},${last3}`;
}

export function groupInternational(digits) {
  const text = String(digits);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const fromEnd = text.length - i;
    if (i > 0 && fromEnd % 3 === 0) out += ",";
    out += text[i];
  }
  return out;
}

export function formatMoney(amountMinor, options = {}) {
  const {
    grouping = "indian",
    symbol = "₹",
    showPaise = false,
    sign = "auto",
  } = options;
  const value = Number(amountMinor) || 0;
  const abs = Math.abs(value);
  const major = Math.floor(abs / 100);
  const minor = abs % 100;
  const digits = grouping === "international" ? groupInternational(major) : groupIndian(major);
  const fraction = showPaise || minor !== 0 ? `.${String(minor).padStart(2, "0")}` : "";
  const body = `${symbol}${digits}${fraction}`;
  if (sign === "minus" || (sign === "auto" && value < 0)) return `−${body}`;
  if (sign === "plus" || (sign === "always" && value > 0)) return `+${body}`;
  return body;
}

export function parseMajor(text) {
  const cleaned = String(text ?? "").replace(/[₹,\s]/g, "").replace(/rs\.?/i, "");
  if (!cleaned) return { error: "Enter an amount." };
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return { error: "Use numbers only." };
  const frac = cleaned.split(".")[1];
  if (frac && frac.length > 2) return { error: "Use at most two decimal places." };
  const minor = Math.round(Number(cleaned) * 100);
  if (!Number.isFinite(minor) || minor <= 0) return { error: "Amount must be greater than zero." };
  return { minor };
}

/**
 * Evaluates `340+80`. A trailing operator never saves the left-hand number.
 */
export function parseExpression(raw) {
  const text = String(raw ?? "").replace(/₹/g, "").replace(/,/g, "").replace(/\s/g, "");
  if (!text) return { error: "Enter an amount." };
  if (!/^[\d.+×x*\-]+$/.test(text)) return { error: "Use numbers only." };
  if (/[+×x*\-]$/.test(text)) return { error: "Finish the calculation before saving." };
  const parts = text.split(/([+×x*\-])/).filter(Boolean);
  let total = null;
  let op = "+";
  for (const part of parts) {
    if (part === "+" || part === "-" || part === "×" || part === "x" || part === "*") {
      op = part === "x" || part === "*" ? "×" : part;
      continue;
    }
    if (!/^\d+(\.\d+)?$/.test(part)) return { error: "Use numbers only." };
    const frac = part.split(".")[1];
    if (frac && frac.length > 2) return { error: "Use at most two decimal places." };
    const minor = Math.round(Number(part) * 100);
    if (total == null) total = op === "-" ? -minor : minor;
    else if (op === "+") total += minor;
    else if (op === "-") total -= minor;
    else total = Math.round((total * minor) / 100);
    op = "+";
  }
  if (total == null || total <= 0) return { error: "Amount must be greater than zero." };
  return { minor: total };
}
