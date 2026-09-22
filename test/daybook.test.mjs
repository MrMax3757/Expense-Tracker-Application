import assert from "node:assert/strict";
import test from "node:test";
import { buildBackup, validateBackup } from "../web/js/backup.js";
import { freshLedger, legalMethods } from "../web/js/defaults.js";
import {
  availableCredit,
  cashYouHave,
  confirmPending,
  heroFor,
  materializeRecurring,
  netWorth,
  periodTotals,
  position,
  reassignAccount,
  validateTransaction,
} from "../web/js/ledger.js";
import { parseExpression, groupIndian } from "../web/js/money.js";
import { financialPeriod, nextOccurrence } from "../web/js/period.js";
import { parseSentence } from "../web/js/parser.js";

function account(partial) {
  return {
    currency: "INR",
    includeInSpendable: partial.type !== "credit_card" && partial.type !== "savings" && partial.type !== "investment",
    includeInNetWorth: true,
    archivedAt: null,
    aliases: [],
    creditLimitMinor: null,
    isPrimary: false,
    ...partial,
  };
}

function tx(partial) {
  return {
    id: partial.id,
    status: "posted",
    currency: "INR",
    destinationAccountId: null,
    categoryId: partial.type === "expense" ? "food" : partial.type === "income" ? "income.salary" : null,
    payee: "",
    note: "",
    tags: [],
    occurredTime: null,
    paymentMethod: null,
    adjustmentKind: null,
    adjustmentDirection: null,
    transferKind: null,
    source: "manual",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...partial,
  };
}

function books() {
  const ledger = freshLedger();
  ledger.accounts = [
    account({ id: "bank", name: "HDFC Bank", type: "bank", isPrimary: true, aliases: ["hdfc"] }),
    account({ id: "cash", name: "Cash", type: "cash", aliases: ["cash"] }),
    account({ id: "card", name: "ICICI Credit Card", type: "credit_card", creditLimitMinor: 10000000, includeInSpendable: false, aliases: ["icici"] }),
  ];
  ledger.transactions = [
    tx({ id: "o1", type: "adjustment", adjustmentKind: "opening_balance", adjustmentDirection: "increase", accountId: "bank", amountMinor: 5000000, occurredOn: "2026-09-01", categoryId: null }),
    tx({ id: "o2", type: "adjustment", adjustmentKind: "opening_balance", adjustmentDirection: "increase", accountId: "cash", amountMinor: 200000, occurredOn: "2026-09-01", categoryId: null }),
  ];
  ledger.settings.paydayMode = "day";
  ledger.settings.paydayDay = 7;
  return ledger;
}

const period = { start: "2026-09-07", end: "2026-10-06", label: "period" };

test("indian grouping starts at one lakh", () => {
  assert.equal(groupIndian(18420), "18,420");
  assert.equal(groupIndian(104650), "1,04,650");
});

test("calculator does not save an incomplete expression", () => {
  assert.equal(parseExpression("340+").error, "Finish the calculation before saving.");
  assert.equal(parseExpression("340+80").minor, 42000);
  assert.equal(parseExpression("340.555").error, "Use at most two decimal places.");
});

test("worked example matches the credit-card matrix", () => {
  const ledger = books();
  assert.equal(cashYouHave(ledger), 5200000);
  assert.equal(netWorth(ledger), 5200000);
  assert.equal(periodTotals(ledger, period).spending, 0);
  assert.equal(periodTotals(ledger, period).income, 0);

  ledger.transactions.push(tx({ id: "s", type: "income", accountId: "bank", amountMinor: 8000000, occurredOn: "2026-09-07", paymentMethod: "bank_transfer" }));
  assert.equal(position(ledger, ledger.accounts[0]), 13000000);
  assert.equal(periodTotals(ledger, period).income, 8000000);
  assert.equal(heroFor(ledger, period, period).label, "Left after income");
  assert.equal(heroFor(ledger, period, period).value, 8000000);

  ledger.transactions.push(tx({ id: "r", type: "expense", accountId: "bank", categoryId: "home.rent", amountMinor: 2000000, occurredOn: "2026-09-07", paymentMethod: "upi" }));
  assert.equal(position(ledger, ledger.accounts[0]), 11000000);
  assert.equal(periodTotals(ledger, period).spending, 2000000);
  assert.equal(cashYouHave(ledger), 11200000);

  ledger.transactions.push(tx({ id: "d", type: "expense", accountId: "card", categoryId: "food.eating", amountMinor: 35000, occurredOn: "2026-09-08", paymentMethod: "credit_card" }));
  assert.equal(position(ledger, ledger.accounts[0]), 11000000);
  assert.equal(position(ledger, ledger.accounts[2]), 35000);
  assert.equal(cashYouHave(ledger), 11200000);
  assert.equal(periodTotals(ledger, period).spending, 2035000);
  assert.equal(netWorth(ledger), 5200000 + 8000000 - 2000000 - 35000);
  assert.equal(availableCredit(ledger.accounts[2], 35000), 9965000);

  const beforeAtm = netWorth(ledger);
  ledger.transactions.push(tx({ id: "a", type: "transfer", transferKind: "atm", accountId: "bank", destinationAccountId: "cash", amountMinor: 500000, occurredOn: "2026-09-08", categoryId: null }));
  assert.equal(position(ledger, ledger.accounts[0]), 10500000);
  assert.equal(position(ledger, ledger.accounts[1]), 700000);
  assert.equal(cashYouHave(ledger), 11200000);
  assert.equal(periodTotals(ledger, period).spending, 2035000);
  assert.equal(netWorth(ledger), beforeAtm);

  const beforePay = netWorth(ledger);
  ledger.transactions.push(tx({ id: "p", type: "transfer", transferKind: "card_payment", accountId: "bank", destinationAccountId: "card", amountMinor: 35000, occurredOn: "2026-09-09", categoryId: null }));
  assert.equal(position(ledger, ledger.accounts[0]), 10465000);
  assert.equal(position(ledger, ledger.accounts[2]), 0);
  assert.equal(periodTotals(ledger, period).spending, 2035000);
  assert.equal(netWorth(ledger), beforePay);
  assert.equal(cashYouHave(ledger), 11165000);

  ledger.settings.periodCapMinor = 3000000;
  const capped = heroFor(ledger, period, period);
  assert.equal(capped.label, "Left this period");
  assert.equal(capped.value, 3000000 - 2035000);

  ledger.transactions.push(tx({ id: "f", type: "refund", accountId: "card", categoryId: "food.eating", amountMinor: 35000, occurredOn: "2026-09-10", linkedTransactionId: "d" }));
  assert.equal(position(ledger, ledger.accounts[2]), -35000);
  assert.equal(periodTotals(ledger, period).spending, 2000000);
  assert.equal(periodTotals(ledger, period).income, 8000000);
  assert.equal(availableCredit(ledger.accounts[2], -35000), 10035000);
  assert.equal(cashYouHave(ledger), 11165000);
});

test("cash advance and annual fee follow the matrix", () => {
  const ledger = books();
  ledger.transactions.push(tx({
    id: "adv", type: "transfer", transferKind: "cash_advance", accountId: "card", destinationAccountId: "cash",
    amountMinor: 100000, occurredOn: "2026-09-08", categoryId: null,
  }));
  const worth = netWorth(ledger);
  assert.equal(position(ledger, ledger.accounts[2]), 100000);
  assert.equal(position(ledger, ledger.accounts[1]), 300000);
  assert.equal(periodTotals(ledger, period).spending, 0);
  ledger.transactions.push(tx({
    id: "fee", type: "expense", accountId: "card", categoryId: "fees.atm", amountMinor: 5000, occurredOn: "2026-09-08", paymentMethod: "credit_card",
  }));
  assert.equal(periodTotals(ledger, period).spending, 5000);
  assert.equal(position(ledger, ledger.accounts[2]), 105000);
  assert.equal(netWorth(ledger), worth - 5000);
});

test("opening balance is rejected twice and is not income", () => {
  const ledger = books();
  const second = tx({ id: "o3", type: "adjustment", adjustmentKind: "opening_balance", adjustmentDirection: "increase", accountId: "bank", amountMinor: 100, occurredOn: "2026-09-02", categoryId: null });
  assert.match(validateTransaction(ledger, second).join(" "), /already has an opening balance/);
  assert.equal(periodTotals(ledger, period).income, 0);
});

test("card payment cannot be saved as a bill on the bank", () => {
  const ledger = books();
  const bad = tx({ id: "bad", type: "expense", accountId: "bank", paymentMethod: "credit_card", amountMinor: 35000, occurredOn: "2026-09-09" });
  assert.match(validateTransaction(ledger, bad).join(" "), /Credit card is an account/);
});

test("upi is not a legal method on a credit card", () => {
  assert.deepEqual(legalMethods("credit_card"), ["credit_card"]);
  assert.ok(legalMethods("bank").includes("upi"));
  assert.ok(!legalMethods("bank").includes("credit_card"));
});

test("parser does not autosave an incomplete sentence", () => {
  const ledger = books();
  const parsed = parseSentence("I spent 500", { today: "2026-09-22", accounts: ledger.accounts, rules: [] });
  assert.equal(parsed.type, "expense");
  assert.equal(parsed.amountMinor, 50000);
  assert.equal(parsed.canSave, false);
  assert.ok(parsed.gaps.includes("category"));
  const lakh = parseSentence("2.5 lakh rent", { today: "2026-09-22", accounts: ledger.accounts, rules: [] });
  assert.equal(lakh.amountMinor, 25000000);
  assert.equal(lakh.categoryId, "home.rent");
  assert.equal(lakh.canSave, false);
});

test("restore rejects a bad checksum and does not require mutating the caller", async () => {
  const ledger = books();
  const backup = await buildBackup(ledger);
  const good = await validateBackup(backup);
  assert.equal(good.ok, true);
  assert.equal(good.ledger.transactions.length, ledger.transactions.length);
  backup.checksum = "deadbeef";
  const bad = await validateBackup(backup);
  assert.equal(bad.ok, false);
  assert.match(bad.errors[0], /damaged/);
  assert.equal(ledger.transactions.length, 2);
});

test("recurring does not duplicate a confirmed occurrence", () => {
  const ledger = books();
  ledger.recurring.push({
    id: "rent", type: "expense", amountMinor: 2000000, accountId: "bank", categoryId: "home.rent",
    payee: "Rent", paymentMethod: "upi", frequency: "monthly", interval: 1,
    startOn: "2026-09-07", nextOn: "2026-09-07", paused: false, autoPost: false, currency: "INR",
  });
  const first = materializeRecurring(ledger, "2026-09-07");
  assert.equal(first.created.length, 1);
  assert.equal(first.created[0].status, "pending");
  assert.equal(periodTotals(ledger, period).spending, 0);
  confirmPending(ledger, first.created[0].id);
  assert.equal(periodTotals(ledger, period).spending, 2000000);
  const second = materializeRecurring(ledger, "2026-09-07");
  assert.equal(second.created.length, 0);
  assert.equal(ledger.transactions.filter((tx) => tx.recurringRuleId === "rent").length, 1);
});

test("reassign refuses to mix a card with a bank", () => {
  const ledger = books();
  assert.match(reassignAccount(ledger, "card", "bank").join(" "), /credit card/);
});

test("parser fixtures stay unconfirmed until a category is accepted", () => {
  const ledger = books();
  const ctx = { today: "2026-09-22", accounts: ledger.accounts, rules: [], defaultAccountId: "bank" };
  const dinner = parseSentence("Spent ₹350 on dinner", ctx);
  assert.equal(dinner.amountMinor, 35000);
  assert.equal(dinner.categoryId, "food.eating");
  assert.equal(dinner.canSave, false);
  const bill = parseSentence("Paid 1200 for electricity yesterday", ctx);
  assert.equal(bill.amountMinor, 120000);
  assert.equal(bill.occurredOn, "2026-09-21");
  assert.equal(bill.categoryId, "bills.electricity");
  const salary = parseSentence("Received ₹25,000 salary", ctx);
  assert.equal(salary.type, "income");
  assert.equal(salary.amountMinor, 2500000);
  assert.equal(salary.categoryId, "income.salary");
  const lunch = parseSentence("₹450 lunch at Domino's", ctx);
  assert.equal(lunch.payee, "Domino's");
  assert.equal(lunch.amountMinor, 45000);
  const bare = parseSentence("500", ctx);
  assert.equal(bare.type, null);
  assert.equal(bare.canSave, false);
  const mom = parseSentence("sent 500 to mom", ctx);
  assert.equal(mom.type, "expense");
  assert.equal(mom.categoryId, "family.support");
  const fifth = parseSentence("paid 80 on the 5th", ctx);
  assert.equal(fifth.occurredOn, "2026-09-05");
  assert.equal(fifth.dateCertain, true);
  const monday = parseSentence("Spent 200 on Monday", ctx);
  assert.equal(monday.occurredOn, "2026-09-21");
});

test("a reimbursement does not change spending or left after income", () => {
  const ledger = books();
  ledger.transactions.push(tx({ id: "s", type: "income", accountId: "bank", amountMinor: 8000000, occurredOn: "2026-09-07" }));
  ledger.transactions.push(tx({ id: "e", type: "expense", accountId: "bank", amountMinor: 100000, occurredOn: "2026-09-08", categoryId: "food" }));
  const before = heroFor(ledger, period, period);
  ledger.transactions.push(tx({ id: "re", type: "reimbursement", accountId: "bank", amountMinor: 100000, occurredOn: "2026-09-09", categoryId: "income.reimbursement" }));
  const after = heroFor(ledger, period, period);
  assert.equal(periodTotals(ledger, period).spending, 100000);
  assert.equal(periodTotals(ledger, period).income, 8000000);
  assert.equal(periodTotals(ledger, period).reimbursements, 100000);
  assert.equal(after.value, before.value);
  assert.equal(position(ledger, ledger.accounts[0]), 5000000 + 8000000 - 100000 + 100000);
});

test("backup omits the PIN and a bad file changes nothing", async () => {
  const ledger = books();
  ledger.settings.pinHash = "secret";
  ledger.settings.appLockEnabled = true;
  const file = await buildBackup(ledger);
  assert.equal(file.encrypted, false);
  assert.equal(file.payload.settings.pinHash, undefined);
  assert.equal(file.payload.settings.appLockEnabled, false);
  assert.equal(ledger.settings.pinHash, "secret");
});

test("payday 31 clamps in February", () => {
  const range = financialPeriod("2026-03-01", { paydayMode: "day", paydayDay: 31 });
  assert.equal(range.start, "2026-02-28");
  assert.equal(range.end, "2026-03-30");
});

test("every third month steps three months and clamps the day", () => {
  assert.equal(nextOccurrence("2026-01-05", "monthly", 3), "2026-04-05");
  assert.equal(nextOccurrence("2026-01-31", "monthly", 3), "2026-04-30");
});
