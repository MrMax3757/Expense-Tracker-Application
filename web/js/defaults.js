/** Default categories. No sample transactions are ever created from this list. */

export const PALETTE = ["pine", "clay", "ink", "sea", "sand", "plum", "olive", "rust", "slate", "gold", "moss", "wine", "sky", "stone"];

export function defaultCategories() {
  const expense = (id, name, parentId = null, icon = "dot") => ({
    id, name, kind: "expense", parentId, icon, color: PALETTE[Math.abs(hash(id)) % PALETTE.length],
    sortOrder: 0, isDefault: true, archivedAt: null,
  });
  const income = (id, name, icon) => ({
    id, name, kind: "income", parentId: null, icon, color: "pine",
    sortOrder: 0, isDefault: true, archivedAt: null,
  });
  return [
    expense("food", "Food", null, "food"),
    expense("food.groceries", "Groceries", "food", "food"),
    expense("food.eating", "Eating out", "food", "food"),
    expense("food.coffee", "Tea & coffee", "food", "food"),
    expense("food.delivery", "Delivery", "food", "food"),
    expense("transport", "Transport", null, "transport"),
    expense("transport.fuel", "Fuel", "transport", "transport"),
    expense("transport.transit", "Transit", "transport", "transport"),
    expense("transport.cab", "Auto & cab", "transport", "transport"),
    expense("transport.parking", "Parking & tolls", "transport", "transport"),
    expense("transport.maintenance", "Maintenance", "transport", "transport"),
    expense("home", "Home", null, "home"),
    expense("home.rent", "Rent", "home", "home"),
    expense("home.society", "Society & maintenance", "home", "home"),
    expense("home.help", "Household help", "home", "home"),
    expense("home.furnishings", "Furnishings", "home", "home"),
    expense("bills", "Bills", null, "bills"),
    expense("bills.electricity", "Electricity", "bills", "bills"),
    expense("bills.mobile", "Mobile & internet", "bills", "bills"),
    expense("bills.water", "Water", "bills", "bills"),
    expense("bills.gas", "Gas", "bills", "bills"),
    expense("bills.other", "Other bills", "bills", "bills"),
    expense("emi", "EMI & loans", null, "emi"),
    expense("emi.home", "Home", "emi", "emi"),
    expense("emi.vehicle", "Vehicle", "emi", "emi"),
    expense("emi.education", "Education", "emi", "emi"),
    expense("emi.personal", "Personal", "emi", "emi"),
    expense("emi.card", "Card charges", "emi", "emi"),
    expense("subs", "Subscriptions", null, "subs"),
    expense("subs.streaming", "Streaming", "subs", "subs"),
    expense("subs.software", "Software", "subs", "subs"),
    expense("subs.memberships", "Memberships", "subs", "subs"),
    expense("shopping", "Shopping", null, "shopping"),
    expense("shopping.clothes", "Clothes", "shopping", "shopping"),
    expense("shopping.electronics", "Electronics", "shopping", "shopping"),
    expense("shopping.general", "General", "shopping", "shopping"),
    expense("health", "Health", null, "health"),
    expense("health.pharmacy", "Pharmacy", "health", "health"),
    expense("health.doctor", "Doctor", "health", "health"),
    expense("health.insurance", "Insurance", "health", "health"),
    expense("health.fitness", "Fitness", "health", "health"),
    expense("education", "Education", null, "education"),
    expense("education.fees", "Fees", "education", "education"),
    expense("education.books", "Books & courses", "education", "education"),
    expense("family", "Family & personal", null, "family"),
    expense("family.support", "Family support", "family", "family"),
    expense("family.care", "Personal care", "family", "family"),
    expense("family.gifts", "Gifts", "family", "family"),
    expense("entertainment", "Entertainment", null, "entertainment"),
    expense("entertainment.out", "Going out", "entertainment", "entertainment"),
    expense("entertainment.hobbies", "Hobbies", "entertainment", "entertainment"),
    expense("entertainment.games", "Games", "entertainment", "entertainment"),
    expense("travel", "Travel", null, "travel"),
    expense("travel.stay", "Stay", "travel", "travel"),
    expense("travel.tickets", "Tickets", "travel", "travel"),
    expense("travel.local", "Local", "travel", "travel"),
    expense("travel.visa", "Fees & visa", "travel", "travel"),
    expense("fees", "Fees", null, "fees"),
    expense("fees.bank", "Bank charges", "fees", "fees"),
    expense("fees.atm", "ATM fees", "fees", "fees"),
    expense("fees.late", "Late fees", "fees", "fees"),
    expense("other", "Other", null, "other"),
    income("income.salary", "Salary", "income"),
    income("income.freelance", "Freelance", "income"),
    income("income.business", "Business", "income"),
    income("income.interest", "Interest", "income"),
    income("income.gift", "Gift", "income"),
    income("income.cashback", "Cashback", "income"),
    income("income.reimbursement", "Reimbursement", "income"),
    income("income.other", "Other income", "income"),
  ];
}

function hash(text) {
  let n = 0;
  for (const ch of text) n = (n * 33 + ch.charCodeAt(0)) >>> 0;
  return n;
}

export function emptySettings() {
  return {
    homeCurrency: "INR",
    numberFormat: "indian",
    paydayMode: "none",
    paydayDay: null,
    theme: "system",
    privacyMode: false,
    appLockEnabled: false,
    pinHash: null,
    pinSalt: null,
    recoveryHash: null,
    defaultAccountId: null,
    defaultPaymentMethod: null,
    periodCapMinor: null,
    showPaise: false,
    weekStart: "monday",
    notifyRecurring: true,
    notifyBudget: true,
    notifyDaily: false,
    notifyCard: true,
    onboardingDone: false,
    lastExpenseCategoryId: null,
    lastIncomeCategoryId: null,
    lastAccountId: null,
    lastMethods: {},
  };
}

export function freshLedger() {
  return {
    schemaVersion: 1,
    settings: emptySettings(),
    accounts: [],
    categories: defaultCategories(),
    transactions: [],
    budgets: [],
    recurring: [],
    templates: [],
    parserRules: [],
    skippedOccurrences: [],
    dismissedInsights: [],
  };
}

export const ACCOUNT_TYPES = [
  { id: "cash", label: "Cash", nature: "asset" },
  { id: "bank", label: "Bank", nature: "asset" },
  { id: "savings", label: "Savings", nature: "asset" },
  { id: "wallet", label: "Wallet", nature: "asset" },
  { id: "credit_card", label: "Credit card", nature: "liability" },
  { id: "investment", label: "Investment", nature: "asset" },
];

export const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "upi", label: "UPI" },
  { id: "debit_card", label: "Debit card" },
  { id: "credit_card", label: "Credit card" },
  { id: "bank_transfer", label: "Bank transfer" },
  { id: "wallet", label: "Wallet" },
  { id: "cheque", label: "Cheque" },
  { id: "other", label: "Other" },
];

export function legalMethods(type) {
  if (type === "cash") return ["cash"];
  if (type === "credit_card") return ["credit_card"];
  if (type === "wallet") return ["wallet"];
  if (type === "investment") return ["bank_transfer", "other"];
  return ["upi", "debit_card", "bank_transfer", "cheque", "other"];
}

export function defaultMethod(type) {
  if (type === "cash") return "cash";
  if (type === "credit_card") return "credit_card";
  if (type === "wallet") return "wallet";
  if (type === "investment") return "bank_transfer";
  return "upi";
}

export function methodLabel(id) {
  return PAYMENT_METHODS.find((m) => m.id === id)?.label || "Other";
}

export function typeLabel(id) {
  return ACCOUNT_TYPES.find((t) => t.id === id)?.label || id;
}
