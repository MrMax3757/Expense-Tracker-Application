/** Money display. Amounts are integer paise. Grouping matches Daybook D-35. */

export function groupIndian(digits) {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const parts = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(",")},${last3}`;
}

export function groupInternational(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatMinor(amountMinor, options = {}) {
  const {
    grouping = "indian",
    showPaise = false,
    sign = "none",
    symbol = "₹",
  } = options;
  const negative = amountMinor < 0;
  const abs = Math.abs(Math.trunc(amountMinor));
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;
  const grouped =
    grouping === "indian"
      ? groupIndian(String(rupees))
      : groupInternational(String(rupees));
  let body = `${symbol}${grouped}`;
  if (showPaise || paise !== 0) {
    body += `.${String(paise).padStart(2, "0")}`;
  }
  if (sign === "minus" || (sign === "auto" && negative)) return `−${body}`;
  if (sign === "plus") return `+${body}`;
  return body;
}

export function parseExpression(raw) {
  const text = String(raw).trim().replace(/₹/g, "").replace(/,/g, "").replace(/\s/g, "");
  if (!text) return { ok: false, reason: "empty" };
  if (!/^[\d.+\-×x*]+$/.test(text)) return { ok: false, reason: "chars" };
  if (/[+\-×x*]$/.test(text)) return { ok: false, reason: "incomplete" };
  const parts = text.split(/([+×x*\-])/).filter(Boolean);
  let total = null;
  let op = "+";
  for (const part of parts) {
    if (part === "+" || part === "-" || part === "×" || part === "x" || part === "*") {
      op = part === "x" || part === "*" ? "×" : part;
      continue;
    }
    if (!/^\d+(\.\d+)?$/.test(part)) return { ok: false, reason: "operand" };
    const dot = part.split(".")[1];
    if (dot && dot.length > 2) return { ok: false, reason: "decimals" };
    const minor = Math.round(Number(part) * 100);
    if (total == null) {
      total = op === "-" ? -minor : minor;
    } else if (op === "+") total += minor;
    else if (op === "-") total -= minor;
    else total = Math.round((total * minor) / 100);
    op = "+";
  }
  if (total == null || total <= 0) return { ok: false, reason: "nonpositive" };
  return { ok: true, amountMinor: total };
}
