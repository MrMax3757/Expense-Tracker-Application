/**
 * Local deterministic parser. It never saves.
 * A category suggestion must be accepted before save, unless the user taught that phrase.
 * Account detection is a suggestion and is shown. It is not a silent fill of a hidden field.
 */

import { addDays, parseIso, toIso } from "./period.js";

const MULTIPLIERS = {
  k: 1000, thousand: 1000, lakh: 100000, lakhs: 100000, lac: 100000, lacs: 100000,
  crore: 10000000, crores: 10000000, cr: 10000000,
};

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const WEEKDAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

const KEYWORDS = [
  ["electricity", "bills.electricity"], ["bijli", "bills.electricity"], ["recharge", "bills.mobile"],
  ["airtel", "bills.mobile"], ["jio", "bills.mobile"], ["domino", "food.eating"],
  ["swiggy", "food.delivery"], ["zomato", "food.delivery"], ["kirana", "food.groceries"],
  ["groceries", "food.groceries"], ["grocery", "food.groceries"], ["dinner", "food.eating"],
  ["lunch", "food.eating"], ["breakfast", "food.eating"], ["coffee", "food.coffee"],
  ["chai", "food.coffee"], ["tea", "food.coffee"], ["rent", "home.rent"], ["kiraya", "home.rent"],
  ["maid", "home.help"], ["emi", "emi"], ["petrol", "transport.fuel"], ["fuel", "transport.fuel"],
  ["uber", "transport.cab"], ["ola", "transport.cab"], ["auto", "transport.cab"],
  ["metro", "transport.transit"], ["netflix", "subs.streaming"], ["salary", "income.salary"],
  ["tankhwa", "income.salary"], ["mom", "family.support"], ["amazon", "shopping.general"],
  ["reimbursement", "income.reimbursement"], ["cashback", "income.cashback"],
];

const MERCHANTS = ["domino's", "dominos", "swiggy", "zomato", "amazon", "uber", "ola", "netflix", "jio", "airtel"];

export function parseAmountToken(body, suffix) {
  const cleaned = String(body).replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return { error: "amount" };
  const frac = cleaned.split(".")[1];
  if (frac && frac.length > 2 && !suffix) return { error: "decimals" };
  const mult = suffix ? MULTIPLIERS[suffix.toLowerCase()] : 1;
  if (!mult) return { error: "amount" };
  const major = Number(cleaned) * mult;
  if (!Number.isFinite(major) || major <= 0) return { error: "amount" };
  return { minor: Math.round(major * 100) };
}

export function extractAmounts(text) {
  const re = /(?:₹|rs\.?|inr|rupees)?\s*(\d{1,3}(?:,\d{2})*,\d{3}|\d+(?:\.\d+)?)(k|cr)?(?:\s+(thousand|lakh|lakhs|lac|lacs|crore|crores|rupees))?(?!\s*(?:st|nd|rd|th)\b)/gi;
  const found = [];
  let match;
  while ((match = re.exec(text))) {
    const after = text.slice(match.index + match[0].length);
    const word = (after.trim().split(/\s+/)[0] || "").toLowerCase();
    if (MONTHS[word]) continue;
    const suffix = match[2] || match[3] || "";
    const parsed = parseAmountToken(match[1], suffix === "rupees" ? "" : suffix);
    if (parsed.error === "decimals") return { error: "decimals" };
    if (parsed.minor) found.push(parsed.minor);
  }
  return { amounts: found };
}

function shiftDays(iso, days) {
  return addDays(iso, days);
}

export function hasExplicitDate(lower) {
  if (/\b(yesterday|today|tomorrow)\b/.test(lower)) return true;
  if (Object.keys(WEEKDAYS).some((name) => new RegExp("\\b" + name + "\\b").test(lower))) return true;
  if (/\b\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,9}\b/.test(lower)) return true;
  if (/\bon\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?\b/.test(lower)) return true;
  return false;
}

function extractDate(text, today) {
  const lower = text.toLowerCase();
  if (/\byesterday\b/.test(lower)) return shiftDays(today, -1);
  if (/\btomorrow\b/.test(lower)) return shiftDays(today, 1);
  if (/\btoday\b/.test(lower)) return today;
  for (const [name, day] of Object.entries(WEEKDAYS)) {
    if (new RegExp("\\b" + name + "\\b").test(lower)) {
      const { y, m, d } = parseIso(today);
      const date = new Date(y, m - 1, d);
      const delta = (date.getDay() - day + 7) % 7;
      return addDays(today, -delta);
    }
  }
  const named = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})(?:\s+(\d{4}))?\b/);
  if (named && MONTHS[named[2]]) {
    const year = named[3] ? Number(named[3]) : parseIso(today).y;
    const month = MONTHS[named[2]];
    const dim = new Date(year, month, 0).getDate();
    return toIso(year, month, Math.min(Number(named[1]), dim));
  }
  const dayOnly = lower.match(/\bon\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dayOnly) {
    const wanted = Number(dayOnly[1]);
    const { y, m, d } = parseIso(today);
    if (wanted >= 1 && wanted <= 31 && wanted <= d) return toIso(y, m, wanted);
    const prev = new Date(y, m - 2, 1);
    const py = prev.getFullYear();
    const pm = prev.getMonth() + 1;
    const dim = new Date(py, pm, 0).getDate();
    return toIso(py, pm, Math.min(wanted, dim));
  }
  return today;
}

function aliasPattern(alias) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?:^|\\b)" + escaped + "(?:\\b|$)", "i");
}

function findAccount(text, accounts) {
  const lower = text.toLowerCase();
  let best = null;
  for (const account of accounts) {
    const aliases = [account.name, ...(account.aliases || [])].map((a) => String(a).toLowerCase()).filter((a) => a.length >= 3);
    for (const alias of aliases) {
      if (aliasPattern(alias).test(lower) && (!best || alias.length > best.alias.length)) best = { account, alias };
    }
  }
  return best?.account || null;
}

function suggestCategory(text, rules) {
  const lower = text.toLowerCase();
  for (const rule of rules || []) {
    if (rule.pattern && lower.includes(String(rule.pattern).toLowerCase())) {
      return { categoryId: rule.categoryId, fromUser: true };
    }
  }
  for (const [word, categoryId] of KEYWORDS) {
    if (lower.includes(word)) return { categoryId, fromUser: false };
  }
  return null;
}

function payeeFrom(text) {
  const lower = text.toLowerCase();
  for (const merchant of MERCHANTS) {
    if (lower.includes(merchant)) return merchant.startsWith("domino") ? "Domino's" : merchant[0].toUpperCase() + merchant.slice(1);
  }
  const at = text.match(/\bat\s+([A-Za-z][A-Za-z' ]{1,24})/);
  if (at) return at[1].trim();
  const toPerson = text.match(/\bto\s+([A-Za-z][A-Za-z ]{1,24})/);
  if (toPerson && !/savings|hdfc|icici|cash|card|bank|wallet/i.test(toPerson[1])) return toPerson[1].trim();
  return "";
}

function paymentMethod(text, account) {
  const lower = text.toLowerCase();
  if (account?.type === "credit_card") return "credit_card";
  if (account?.type === "cash") return "cash";
  if (account?.type === "wallet") return "wallet";
  if (/\bupi\b|\bgpay\b|\bgoogle pay\b|\bphonepe\b|\bbhim\b/.test(lower)) return "upi";
  if (/\bpaytm\b/.test(lower)) return account?.type === "wallet" ? "wallet" : "upi";
  if (/\bdebit\b/.test(lower)) return "debit_card";
  if (/\bcash\b/.test(lower)) return "cash";
  if (/\bimps\b|\bneft\b|\btransfer\b/.test(lower)) return "bank_transfer";
  return null;
}

export function parseSentence(input, context) {
  const original = String(input || "");
  const text = original.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const today = context.today;
  const accounts = (context.accounts || []).filter((a) => !a.archivedAt);
  const primary = accounts.find((a) => a.id === context.defaultAccountId)
    || accounts.find((a) => a.isPrimary)
    || accounts.find((a) => a.type !== "credit_card")
    || null;
  const result = {
    raw: original,
    type: null,
    amountMinor: null,
    categoryId: null,
    categorySuggested: false,
    categoryFromUser: false,
    categoryAccepted: false,
    occurredOn: extractDate(lower, today),
    dateCertain: hasExplicitDate(lower),
    accountId: primary?.id || null,
    accountCertain: false,
    destinationAccountId: null,
    destinationCertain: false,
    paymentMethod: null,
    paymentCertain: false,
    payee: payeeFrom(text),
    transferKind: null,
    gaps: [],
    uncertain: [],
    banner: null,
  };

  if (!text) {
    result.banner = "Write what you spent, received, or moved.";
    result.gaps.push("text");
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
  if (amounts.amounts.length === 1) result.amountMinor = amounts.amounts[0];
  else {
    result.gaps.push("amount");
    result.banner = "Add an amount to save this.";
  }

  const named = findAccount(lower, accounts);
  const suggestion = suggestCategory(lower, context.rules);
  const refund = /\brefund\b/.test(lower) || /\bback from\b/.test(lower);
  const reimbursement = /\breimburs/.test(lower);
  const transferWord = /\b(transferred|transfer|moved|move|atm)\b/.test(lower);
  const toOwnAccount = named && /\bto\b/.test(lower) && /\b(my\s+)?(savings|cash|hdfc|icici|card|bank)\b/.test(lower);

  if (refund) {
    result.type = "refund";
  } else if (reimbursement) {
    result.type = "reimbursement";
  } else if (transferWord || toOwnAccount) {
    result.type = "transfer";
    if (/\batm\b/.test(lower)) {
      result.transferKind = "atm";
      const cash = accounts.find((a) => a.type === "cash");
      const bank = accounts.find((a) => a.type === "bank");
      result.destinationAccountId = cash?.id || null;
      result.destinationCertain = Boolean(cash);
      if (bank) result.accountId = bank.id;
      if (!cash) {
        result.gaps.push("destination");
        result.banner = "Which account should receive this?";
      }
    } else if (named) {
      result.destinationAccountId = named.id;
      result.destinationCertain = true;
      result.transferKind = named.type === "credit_card" ? "card_payment" : "standard";
      if (result.accountId === named.id) {
        const other = accounts.find((a) => a.id !== named.id && a.type !== "credit_card");
        result.accountId = other?.id || null;
      }
      if (!result.accountId || result.accountId === result.destinationAccountId) {
        result.gaps.push("account");
        result.banner = "Which account should this come from?";
      }
    } else {
      result.gaps.push("destination");
      result.uncertain.push("destination");
      result.banner = "Which account should receive this?";
    }
  } else if (/\b(received|credited|got|tankhwa)\b/.test(lower) && !/\bspent\b/.test(lower)) {
    result.type = "income";
  } else if (/\b(spent|paid|bought|pay|sent)\b/.test(lower)) {
    result.type = "expense";
  } else if (suggestion?.categoryId?.startsWith("income")) {
    result.type = "income";
  } else if (suggestion) {
    result.type = "expense";
  } else {
    result.gaps.push("type");
    result.uncertain.push("type");
    result.banner = result.banner || "Say whether this was spent, received, or moved.";
  }

  if (["expense", "income", "refund", "reimbursement"].includes(result.type)) {
    const suggestion = suggestCategory(lower, context.rules);
    if (result.type === "reimbursement") {
      result.categoryId = "income.reimbursement";
      result.categorySuggested = true;
      result.categoryFromUser = false;
    } else if (suggestion && (result.type !== "income" || String(suggestion.categoryId).startsWith("income"))) {
      result.categoryId = suggestion.categoryId;
      result.categorySuggested = true;
      result.categoryFromUser = suggestion.fromUser;
    }
    if (result.categoryFromUser) result.categoryAccepted = true;
    else result.gaps.push("category");
    if (!result.banner && result.gaps.includes("category")) result.banner = "Pick a category to save this.";
    if (named) {
      result.accountId = named.id;
      result.accountCertain = true;
    } else result.uncertain.push("account");
    const method = paymentMethod(lower, accounts.find((a) => a.id === result.accountId));
    result.paymentMethod = method;
    result.paymentCertain = Boolean(method && /\bupi\b|\bcash\b|\bdebit\b|\bgpay\b|\bphonepe\b|\bbhim\b|\bpaytm\b/.test(lower));
    if (!result.paymentCertain) result.uncertain.push("payment");
  }

  result.canSave = Boolean(
    result.amountMinor && result.type && !result.gaps.includes("amount") && !result.gaps.includes("destination") && !result.gaps.includes("account") && !result.gaps.includes("type")
    && (result.type === "transfer" || result.categoryAccepted)
  );
  return result;
}
