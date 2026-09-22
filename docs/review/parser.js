/** Deterministic capture parser. System guesses are suggestions, never auto-saved. */

const MULTIPLIERS = {
  k: 1000,
  thousand: 1000,
  lakh: 100000,
  lakhs: 100000,
  lac: 100000,
  lacs: 100000,
  crore: 10000000,
  crores: 10000000,
  cr: 10000000,
};

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const KEYWORDS = [
  ["electricity", "bills.electricity"],
  ["bijli", "bills.electricity"],
  ["recharge", "bills.mobile"],
  ["airtel", "bills.mobile"],
  ["jio", "bills.mobile"],
  ["domino", "food.eating"],
  ["swiggy", "food.delivery"],
  ["zomato", "food.delivery"],
  ["kirana", "food.groceries"],
  ["groceries", "food.groceries"],
  ["grocery", "food.groceries"],
  ["dinner", "food.eating"],
  ["lunch", "food.eating"],
  ["breakfast", "food.eating"],
  ["coffee", "food.coffee"],
  ["tea", "food.coffee"],
  ["rent", "home.rent"],
  ["kiraya", "home.rent"],
  ["maid", "home.help"],
  ["emi", "emi.parent"],
  ["petrol", "transport.fuel"],
  ["fuel", "transport.fuel"],
  ["uber", "transport.cab"],
  ["ola", "transport.cab"],
  ["metro", "transport.transit"],
  ["netflix", "subs.streaming"],
  ["salary", "income.salary"],
  ["mom", "family.support"],
  ["amazon", "shopping.general"],
];

const MERCHANTS = ["domino's", "dominos", "swiggy", "zomato", "amazon", "uber", "ola", "netflix", "jio", "airtel"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIso(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parseToday(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function shiftDays(iso, days) {
  const { y, m, d } = parseToday(iso);
  const date = new Date(y, m - 1, d + days);
  return toIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function weekdayOnOrBefore(iso, target) {
  const { y, m, d } = parseToday(iso);
  const date = new Date(y, m - 1, d);
  const delta = (date.getDay() - target + 7) % 7;
  date.setDate(date.getDate() - delta);
  return toIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

const WEEKDAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

export function parseAmountToken(body, suffix) {
  const cleaned = body.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return { error: "amount" };
  const frac = cleaned.split(".")[1];
  if (frac && frac.length > 2 && !suffix) return { error: "decimals" };
  const value = Number(cleaned);
  const mult = suffix ? MULTIPLIERS[suffix.toLowerCase()] : 1;
  if (!mult) return { error: "amount" };
  const major = value * mult;
  if (!Number.isFinite(major) || major <= 0) return { error: "amount" };
  return { minor: Math.round(major * 100) };
}

export function extractAmounts(text) {
  const re = /(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{2})*,\d{3}|\d+(?:\.\d+)?)(k|cr)?(?:\s+(thousand|lakh|lakhs|lac|lacs|crore|crores))?(?!\s*(?:st|nd|rd|th)\b)/gi;
  const found = [];
  let match;
  while ((match = re.exec(text))) {
    const after = text.slice(match.index + match[0].length);
    if (/^\s+[a-z]{3,9}\b/i.test(after)) {
      const word = after.trim().split(/\s+/)[0].toLowerCase();
      if (MONTHS[word]) continue;
    }
    const suffix = match[2] || match[3] || "";
    const parsed = parseAmountToken(match[1], suffix);
    if (parsed.error === "decimals") return { error: "decimals" };
    if (parsed.minor) found.push({ minor: parsed.minor, index: match.index, raw: match[0] });
  }
  return { amounts: found };
}

function extractDate(text, today) {
  const lower = text.toLowerCase();
  if (/\byesterday\b/.test(lower)) return shiftDays(today, -1);
  if (/\btomorrow\b/.test(lower)) return shiftDays(today, 1);
  if (/\btoday\b/.test(lower)) return today;
  for (const [name, day] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${name}\\b`).test(lower)) return weekdayOnOrBefore(today, day);
  }
  const named = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})(?:\s+(\d{4}))?\b/);
  if (named && MONTHS[named[2]]) {
    const { y } = parseToday(today);
    const month = MONTHS[named[2]];
    const day = Number(named[1]);
    const year = named[3] ? Number(named[3]) : y;
    return toIso(year, month, day);
  }
  const onDay = lower.match(/\bon\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (onDay) {
    const { y, m } = parseToday(today);
    return toIso(y, m, Number(onDay[1]));
  }
  return today;
}

function findAccount(text, accounts, excludeId) {
  const lower = text.toLowerCase();
  let best = null;
  for (const account of accounts) {
    if (account.id === excludeId) continue;
    const aliases = [account.name, ...(account.aliases || [])].map((a) => a.toLowerCase());
    for (const alias of aliases) {
      if (alias.length < 3) continue;
      if (lower.includes(alias) && (!best || alias.length > best.alias.length)) {
        best = { account, alias };
      }
    }
  }
  return best?.account || null;
}

function suggestCategory(text, rules) {
  const lower = text.toLowerCase();
  for (const rule of rules || []) {
    if (rule.pattern && lower.includes(rule.pattern)) {
      return { categoryId: rule.categoryId, fromUser: true };
    }
  }
  for (const [word, id] of KEYWORDS) {
    if (lower.includes(word)) return { categoryId: id, fromUser: false };
  }
  return null;
}

function payeeFrom(text) {
  const lower = text.toLowerCase();
  for (const merchant of MERCHANTS) {
    if (lower.includes(merchant)) {
      if (merchant.startsWith("domino")) return "Domino's";
      return merchant[0].toUpperCase() + merchant.slice(1);
    }
  }
  const toPerson = text.match(/\bto\s+([A-Za-z][A-Za-z ]{1,24})/);
  if (toPerson && !/savings|hdfc|icici|cash|card|bank/i.test(toPerson[1])) {
    return toPerson[1].trim();
  }
  return "";
}

function paymentMethod(text, account) {
  const lower = text.toLowerCase();
  if (account?.type === "credit_card") return "credit_card";
  if (account?.type === "cash") return "cash";
  if (account?.type === "wallet") return "wallet";
  if (/\bupi\b|\bgpay\b|\bphonepe\b|\bbhim\b/.test(lower)) return "upi";
  if (/\bpaytm\b/.test(lower)) return account?.type === "wallet" ? "wallet" : "upi";
  if (/\bdebit\b/.test(lower)) return "debit_card";
  if (/\bcash\b/.test(lower)) return "cash";
  if (/\bimps\b|\bneft\b/.test(lower)) return "bank_transfer";
  if (account?.type === "bank") return "upi";
  return null;
}

export function parseSentence(input, context) {
  const original = String(input || "");
  const text = original.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const today = context.today;
  const accounts = context.accounts || [];
  const primary = accounts.find((a) => a.isPrimary) || accounts.find((a) => a.type !== "credit_card") || accounts[0] || null;
  const gaps = [];
  const result = {
    raw: original,
    type: null,
    amountMinor: null,
    categoryId: null,
    categorySuggested: false,
    categoryFromUser: false,
    occurredOn: extractDate(lower, today),
    accountId: primary?.id || null,
    accountDefaulted: true,
    destinationAccountId: null,
    paymentMethod: null,
    payee: payeeFrom(text),
    transferKind: null,
    gaps,
    banner: null,
    canSave: false,
  };

  if (!text) {
    result.banner = "Write what you spent, received, or moved.";
    return result;
  }

  const amounts = extractAmounts(lower);
  if (amounts.error === "decimals") {
    result.banner = "Use at most two decimal places.";
    result.gaps.push("amount");
    return result;
  }
  if (amounts.amounts.length > 1) {
    result.banner = "This has two amounts. Keep one, or split it later from the editor.";
    result.gaps.push("amount");
    result.type = /\b(received|salary|credited)\b/.test(lower) ? "income" : "expense";
    return result;
  }
  if (amounts.amounts.length === 1) result.amountMinor = amounts.amounts[0].minor;
  else {
    result.gaps.push("amount");
    result.banner = "Add an amount to save this.";
  }

  const ownDest = findAccount(lower, accounts);
  const mentionsOwn = ownDest && (/\bto\b/.test(lower) || /\binto\b/.test(lower) || /\batm\b/.test(lower));
  const refund = /\brefund\b/.test(lower) || /\bback from\b/.test(lower);
  const transferWord = /\b(transferred|transfer|moved|move|atm)\b/.test(lower) || mentionsOwn && /\b(paid|sent|pay)\b/.test(lower) && /card|savings|hdfc|icici|cash/.test(lower);

  if (refund) {
    result.type = "refund";
    result.gaps.push("category");
    result.banner = "Pick a category to save this.";
  } else if (transferWord || (/\bto my\b/.test(lower) && ownDest)) {
    result.type = "transfer";
    result.categoryId = null;
    if (/\batm\b/.test(lower)) {
      result.transferKind = "atm";
      const cash = accounts.find((a) => a.type === "cash");
      result.destinationAccountId = cash?.id || null;
      result.accountId = primary && primary.type !== "cash" ? primary.id : result.accountId;
      if (!cash) {
        result.gaps.push("destination");
        result.banner = "Which account should receive this?";
      }
    } else if (ownDest) {
      result.destinationAccountId = ownDest.id;
      result.transferKind = ownDest.type === "credit_card" ? "card_payment" : "standard";
      if (result.accountId === ownDest.id) {
        const other = accounts.find((a) => a.id !== ownDest.id && a.type !== "credit_card");
        result.accountId = other?.id || null;
        result.accountDefaulted = false;
      }
      if (!result.accountId || result.accountId === result.destinationAccountId) {
        result.gaps.push("account");
        result.banner = "Which account should this come from?";
      }
    } else {
      result.gaps.push("destination");
      result.banner = "Which account should receive this?";
    }
  } else if (/\b(received|salary|credited|income|got)\b/.test(lower) && !/\bspent\b/.test(lower)) {
    result.type = "income";
  } else if (/\b(spent|paid|bought|pay|sent)\b/.test(lower) || result.amountMinor) {
    result.type = "expense";
  } else {
    result.gaps.push("type");
    result.banner = "Say whether this was spent, received, or moved.";
  }

  if (result.type === "expense" || result.type === "income" || result.type === "refund") {
    const suggestion = suggestCategory(lower, context.rules);
    if (result.type === "income" && /\bsalary\b/.test(lower)) {
      result.categoryId = "income.salary";
      result.categorySuggested = true;
    } else if (suggestion && (result.type !== "income" || suggestion.categoryId.startsWith("income"))) {
      result.categoryId = suggestion.categoryId;
      result.categorySuggested = true;
      result.categoryFromUser = suggestion.fromUser;
    }
    if (!result.categoryFromUser) result.gaps.push("category");
    if (!result.banner && result.gaps.includes("category")) result.banner = "Pick a category to save this.";
  }

  const namedAccount = findAccount(lower, accounts);
  if (namedAccount && result.type !== "transfer") {
    result.accountId = namedAccount.id;
    result.accountDefaulted = false;
  }
  result.paymentMethod = paymentMethod(lower, accounts.find((a) => a.id === result.accountId));

  result.canSave = Boolean(result.amountMinor && result.type && result.gaps.length === 0 && (result.type === "transfer" ? result.destinationAccountId && result.accountId && result.accountId !== result.destinationAccountId : result.categoryFromUser));
  return result;
}
