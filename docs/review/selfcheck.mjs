import { formatMinor, groupIndian, parseExpression } from "./money.js";
import { periodContaining } from "./period.js";
import { parseSentence } from "./parser.js";

const accounts = [
  { id: "cash", name: "Cash", type: "cash", aliases: ["cash"] },
  { id: "hdfc", name: "HDFC Salary", type: "bank", aliases: ["hdfc", "hdfc salary"], isPrimary: true },
  { id: "card", name: "ICICI Card", type: "credit_card", aliases: ["icici card", "icici"] },
  { id: "savings", name: "Savings", type: "bank", aliases: ["savings"] },
];
const ctx = { today: "2026-09-22", accounts, rules: [] };

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  }
}

assert(groupIndian("18420") === "18,420", "18420");
assert(groupIndian("104650") === "1,04,650", "104650");
assert(groupIndian("1234567") === "12,34,567", "1234567");
assert(formatMinor(1842000) === "₹18,420", formatMinor(1842000));
assert(formatMinor(10465000) === "₹1,04,650", formatMinor(10465000));
assert(formatMinor(35000, { sign: "minus" }) === "−₹350", "minus");
assert(formatMinor(50, { showPaise: false }) === "₹0.50", formatMinor(50));

const expr = parseExpression("340+80");
assert(expr.ok && expr.amountMinor === 42000, JSON.stringify(expr));
assert(parseExpression("340+").ok === false, "incomplete");
assert(parseExpression("10.555").ok === false, "decimals");

const p7 = periodContaining("2026-09-22", "day", 7);
assert(p7.start === "2026-09-07" && p7.end === "2026-10-06", JSON.stringify(p7));
const p6 = periodContaining("2026-09-06", "day", 7);
assert(p6.start === "2026-08-07" && p6.end === "2026-09-06", JSON.stringify(p6));
const p31 = periodContaining("2026-02-28", "day", 31);
assert(p31.start === "2026-02-28" && p31.end === "2026-03-30", JSON.stringify(p31));
const pJan = periodContaining("2026-01-31", "day", 31);
assert(pJan.start === "2026-01-31" && pJan.end === "2026-02-27", JSON.stringify(pJan));

function check(input, pred, label) {
  const parsed = parseSentence(input, ctx);
  if (!pred(parsed)) {
    console.error("FAIL", label, JSON.stringify(parsed, null, 2));
    process.exitCode = 1;
  }
}

check("I spent 500", (p) => p.type === "expense" && p.amountMinor === 50000 && p.gaps.includes("category") && !p.canSave, "spent 500");
check("500", (p) => p.amountMinor === 50000 && p.gaps.includes("category") && !p.canSave, "bare 500");
check("Paid 1200 for electricity yesterday", (p) => p.amountMinor === 120000 && p.occurredOn === "2026-09-21" && p.categoryId === "bills.electricity" && !p.canSave, "electricity");
check("Received ₹25,000 salary", (p) => p.type === "income" && p.amountMinor === 2500000 && p.categoryId === "income.salary" && !p.canSave, "salary");
check("₹450 lunch at Domino's", (p) => p.amountMinor === 45000 && p.payee === "Domino's" && p.categoryId === "food.eating", "domino");
check("2.5 lakh rent", (p) => p.amountMinor === 25000000 && p.categoryId === "home.rent", "lakh");
check("1.2k coffee", (p) => p.amountMinor === 120000 && p.categoryId === "food.coffee", "coffee k");
check("rs 1,20,000 emi", (p) => p.amountMinor === 12000000, "emi grouping");
check("transferred 5000 to savings", (p) => p.type === "transfer" && p.destinationAccountId === "savings" && p.canSave, "transfer savings");
check("atm 2000", (p) => p.type === "transfer" && p.transferKind === "atm" && p.destinationAccountId === "cash" && p.canSave, "atm");
check("sent 500 to mom", (p) => p.type === "expense" && p.categoryId === "family.support" && p.payee.toLowerCase() === "mom" && !p.canSave, "mom");
check("paid 5000 to icici card", (p) => p.type === "transfer" && p.transferKind === "card_payment" && p.destinationAccountId === "card" && p.canSave, "pay card");
check("got 200 back from Amazon", (p) => p.type === "refund" && p.amountMinor === 20000 && !p.canSave, "refund");
check("500 or 600 dinner", (p) => p.banner && p.banner.includes("two amounts") && !p.canSave, "two amounts");
check("spent 500.555", (p) => p.banner && p.banner.includes("decimal") && !p.canSave, "decimals sentence");

if (!process.exitCode) console.log("selfcheck ok");
