import type { PrismaClient } from "@prisma/client";
import { AccountType } from "@prisma/client";
import { calculateTax } from "@/src/lib/tax";
import { normalizeHousingInput, createDefaultHousingInput, deriveLoanSplit } from "@/src/housing/defaults";
import { convertToDKK } from "@/lib/currency";
import { enhanceDebtDetails } from "@/lib/debt";

type ScenarioInputs = Record<string, any>;

export interface BudgetCategoryLine {
  category: string;
  amount: number;
  group: string;
  type: "fixed" | "variable";
}

export interface PortfolioPosition {
  instrumentId: string;
  name: string;
  ticker: string | null;
  isin: string | null;
  quantity: number;
  avgCost: number;
  currency: string | null;
  assetType: string;
  price: number | null;
  priceDate: string | null;
  value: number | null;
  valueDKK: number | null;
  missingPrice: boolean;
}

export interface PortfolioBucket {
  bucketKey: string;
  bucketLabel: string;
  valueDKK: number;
  positions: PortfolioPosition[];
}

export interface HoldingsSnapshotModel {
  asOfDate: string;
  totals: {
    portfolioValueDKK: number;
    cashDKK: number;
    totalDebtDKK: number;
    netWorthDKK: number;
  };
  buckets: PortfolioBucket[];
  positions: PortfolioPosition[];
  debts: Array<ReturnType<typeof enhanceDebtDetails>>;
  status: {
    missingPrices: number;
    hasHoldings: boolean;
  };
}

export interface BudgetMonthModel {
  monthKey: string;
  income: {
    salary: number;
    bonus: number;
    other: number;
    total: number;
  };
  expenses: {
    housing: number;
    utilities: number;
    transport: number;
    food: number;
    subscriptions: number;
    insurance: number;
    other: number;
    total: number;
  };
  tax: {
    amBidrag: number;
    kommune: number;
    church: number;
    bottom: number;
    middle: number;
    top: number;
    equity: number;
    ask: number;
    capital: number;
    total: number;
  };
  netDisposable: number;
  allocations: {
    invest: number;
    liquidSavings: number;
    residual: number;
  };
}

export interface ForecastResponseModel {
  summary: {
    startMonth: string;
    horizonYears: number;
    currentNetWorth: number;
    projectedNetWorth: number;
    projectedPortfolioValue: number;
    monthlyDisposableNow: number;
    monthlyResidualNow: number;
    monthlyInvestmentNow: number;
    portfolioSharePct: number;
    liquiditySharePct: number;
    debtSharePct: number;
    homeValue: number;
  };
  monthlyPnlSeries: Array<{
    month: string;
    grossIncome: number;
    tax: number;
    expenses: number;
    invest: number;
    residual: number;
    netDisposable: number;
  }>;
  netWorthSeries: Array<{
    month: string;
    netWorth: number;
    cash: number;
    portfolioValue: number;
    debt: number;
    homeValue: number;
  }>;
  portfolioSeries: Array<{
    month: string;
    portfolioValue: number;
    contribution: number;
    growth: number;
  }>;
  scenarioMeta: {
    horizonMonths: number;
    inflationRate: number;
    equityReturnPct: number;
    savingsMode: "rate" | "fixed";
    savingsValue: number;
    budgetCategoriesCount: number;
    advanced: {
      housingEnabled: boolean;
      debtEnabled: boolean;
      eventsCount: number;
    };
  };
}

export interface BudgetModel {
  year: number;
  months: BudgetMonthModel[];
  yearly: {
    monthKey: string;
    income: BudgetMonthModel["income"];
    expenses: BudgetMonthModel["expenses"];
    tax: BudgetMonthModel["tax"];
    netDisposable: number;
    allocations: BudgetMonthModel["allocations"];
  };
  dataQuality: {
    hasExpenses: boolean;
    hasIncomeInputs: boolean;
    hasTaxRules: boolean;
  };
}

const DEFAULT_BUDGET_CATEGORIES: BudgetCategoryLine[] = [
  { category: "Dagligvarer", amount: 1_750, group: "Food", type: "variable" },
  { category: "Restaurant & Takeaway", amount: 1_000, group: "Food", type: "variable" },
  { category: "Transport", amount: 200, group: "Transport", type: "variable" },
  { category: "Fitness", amount: 448, group: "Subscriptions", type: "fixed" },
  { category: "Digital Services", amount: 183, group: "Subscriptions", type: "fixed" },
  { category: "Byen / Socialt", amount: 1_500, group: "Other", type: "variable" },
];

const BUDGET_GROUPS = ["Housing", "Utilities", "Transport", "Food", "Subscriptions", "Insurance", "Other"] as const;

function numberOr(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePercent(value: unknown, fallback = 0): number {
  const parsed = numberOr(value, fallback);
  return Math.abs(parsed) > 1 ? parsed / 100 : parsed;
}

function monthKeyFrom(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function mapExpenseGroup(category: string): (typeof BUDGET_GROUPS)[number] {
  const lower = category.toLowerCase();
  if (lower.includes("bolig") || lower.includes("hus") || lower.includes("rent")) return "Housing";
  if (lower.includes("el") || lower.includes("vand") || lower.includes("varme") || lower.includes("util")) return "Utilities";
  if (lower.includes("transport") || lower.includes("bil") || lower.includes("car")) return "Transport";
  if (lower.includes("mad") || lower.includes("food") || lower.includes("indkøb")) return "Food";
  if (lower.includes("sub") || lower.includes("abonnement") || lower.includes("stream") || lower.includes("netflix")) return "Subscriptions";
  if (lower.includes("forsikring") || lower.includes("insur")) return "Insurance";
  return "Other";
}

function getDefaultInputs(): ScenarioInputs {
  return {
    salary_growth_path: { model: "standard", yearlyPct: Array(10).fill(0.03) },
    bonus_growth_path: { model: "standard", yearlyPct: Array(10).fill(0.2) },
    return_assumptions: { equityPct: 0.07, bondPct: 0.03 },
    housing: createDefaultHousingInput(new Date().getFullYear()),
    baseline: {
      monthlyDisposableIncomeBeforeHousing: 35_000,
      monthlyNonHousingExpenses: 20_000,
      monthlyGrossIncome: 65_000,
      pensionContributionRate: 0.17,
      annualBonus: 150_000,
      retirementAge: 67,
      municipality: "København",
      maritalStatus: "single",
      expenseInflationRate: 0.02,
      monthlyLiquidSavings: 5_000,
    },
    budget_categories: DEFAULT_BUDGET_CATEGORIES,
    events: [],
    months: 120,
  };
}

export async function loadScenarioInputs(prisma: PrismaClient, userId: string): Promise<ScenarioInputs> {
  const defaults = getDefaultInputs();
  const scenario = await prisma.scenario.findFirst({
    where: { userId, isBase: true },
    include: { overrides: true },
  });

  const overrideMap =
    scenario?.overrides.reduce((acc, curr) => {
      acc[curr.key] = curr.valueJson;
      return acc;
    }, {} as ScenarioInputs) ?? {};

  const expenseLines = await prisma.expenseLine.findMany({ where: { userId } });
  const fallbackBudgetCategories = expenseLines.map((line) => ({
    category: line.name || line.category,
    amount:
      line.frequency === "YEARLY"
        ? numberOr(line.amount) / 12
        : line.frequency === "QUARTERLY"
          ? numberOr(line.amount) / 3
          : numberOr(line.amount),
    group: mapExpenseGroup(line.category),
    type: "fixed" as const,
  }));

  const next: ScenarioInputs = {
    ...defaults,
    ...overrideMap,
    baseline: {
      ...defaults.baseline,
      ...(overrideMap.baseline || {}),
    },
    return_assumptions: {
      ...defaults.return_assumptions,
      ...(overrideMap.return_assumptions || {}),
    },
    salary_growth_path: {
      ...defaults.salary_growth_path,
      ...(overrideMap.salary_growth_path || {}),
    },
    bonus_growth_path: {
      ...defaults.bonus_growth_path,
      ...(overrideMap.bonus_growth_path || {}),
    },
    budget_categories:
      Array.isArray(overrideMap.budget_categories) && overrideMap.budget_categories.length > 0
        ? overrideMap.budget_categories
        : fallbackBudgetCategories.length > 0
          ? fallbackBudgetCategories
          : defaults.budget_categories,
    housing: normalizeHousingInput(overrideMap.housing ?? defaults.housing),
    events: Array.isArray(overrideMap.events) ? overrideMap.events : defaults.events,
    months: numberOr(overrideMap.months, defaults.months),
  };

  return next;
}

function buildBudgetGroups(inputs: ScenarioInputs): Record<(typeof BUDGET_GROUPS)[number], number> {
  const grouped = BUDGET_GROUPS.reduce(
    (acc, group) => {
      acc[group] = 0;
      return acc;
    },
    {} as Record<(typeof BUDGET_GROUPS)[number], number>,
  );

  const categories = (inputs.budget_categories as BudgetCategoryLine[]) || [];
  for (const category of categories) {
    const group = BUDGET_GROUPS.includes(category.group as (typeof BUDGET_GROUPS)[number])
      ? (category.group as (typeof BUDGET_GROUPS)[number])
      : mapExpenseGroup(category.group || category.category);
    grouped[group] += numberOr(category.amount);
  }

  const housing = normalizeHousingInput(inputs.housing ?? createDefaultHousingInput());
  const purchasePrice = numberOr(housing.purchase?.price);
  const propertyTaxMonthly =
    purchasePrice > 0 ? (purchasePrice * numberOr(housing.budgetIntegration?.propertyTaxRate, 0.0051)) / 12 : 0;
  const landTaxMonthly =
    purchasePrice > 0 ? (purchasePrice * numberOr(housing.budgetIntegration?.landTaxRate, 0.008)) / 12 : 0;

  grouped.Housing +=
    numberOr(housing.budgetIntegration?.monthlyHousingRunningCosts) +
    numberOr(housing.budgetIntegration?.associationFees) +
    propertyTaxMonthly +
    landTaxMonthly;
  grouped.Utilities += numberOr(housing.budgetIntegration?.utilities);
  grouped.Insurance += numberOr(housing.budgetIntegration?.insurance);

  return grouped;
}

export async function loadHoldingsSnapshot(prisma: PrismaClient, userId: string): Promise<HoldingsSnapshotModel> {
  const uniqueAccounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true, name: true, type: true },
  });

  if (uniqueAccounts.length === 0) {
    return {
      asOfDate: new Date().toISOString().split("T")[0],
      totals: { portfolioValueDKK: 0, cashDKK: 0, totalDebtDKK: 0, netWorthDKK: 0 },
      buckets: [],
      positions: [],
      debts: [],
      status: { missingPrices: 0, hasHoldings: false },
    };
  }

  const snapshots = await Promise.all(
    uniqueAccounts.map(async (account) =>
      prisma.holdingsSnapshot.findFirst({
        where: { userId, accountId: account.id },
        orderBy: { asOfDate: "desc" },
        include: {
          account: true,
          lines: { include: { instrument: true } },
        },
      }),
    ),
  );

  const activeSnapshots = snapshots.filter(Boolean);
  const asOfDate =
    activeSnapshots.length > 0
      ? new Date(Math.max(...activeSnapshots.map((snapshot) => new Date(snapshot!.asOfDate).getTime())))
          .toISOString()
          .split("T")[0]
      : new Date().toISOString().split("T")[0];

  const instrumentIds = activeSnapshots.flatMap((snapshot) => snapshot!.lines.map((line) => line.instrumentId));
  const latestPrices = await prisma.price.findMany({
    where: { instrumentId: { in: instrumentIds } },
    orderBy: { date: "desc" },
  });

  const priceMap = new Map<string, (typeof latestPrices)[number]>();
  for (const price of latestPrices) {
    if (!priceMap.has(price.instrumentId)) {
      priceMap.set(price.instrumentId, price);
    }
  }

  const bucketDefinitions = [
    { key: "ASK", label: "Aktiesparekonto" },
    { key: "DEPOT", label: "Aktiedepot" },
    { key: "CRYPTO", label: "Krypto" },
    { key: "OTHER", label: "Andet" },
  ];
  const bucketMap = new Map(bucketDefinitions.map((bucket) => [bucket.key, { bucketKey: bucket.key, bucketLabel: bucket.label, positions: [] as PortfolioPosition[], valueDKK: 0 }]));

  let totalValueDKK = 0;
  let missingPrices = 0;

  for (const snapshot of activeSnapshots) {
    for (const line of snapshot!.lines) {
      const latestPrice = priceMap.get(line.instrumentId);
      const quantity = numberOr(line.quantity);
      const avgCost = numberOr(line.avgCost);
      const currency = line.instrument.currency || line.costCurrency || "DKK";
      const close = latestPrice ? numberOr(latestPrice.close) : avgCost;
      const value = quantity * close;
      const valueDKK = convertToDKK(value, currency);

      const position: PortfolioPosition = {
        instrumentId: line.instrumentId,
        name: line.instrument.name,
        ticker: line.instrument.ticker,
        isin: line.instrument.isin,
        quantity,
        avgCost,
        currency,
        assetType: line.instrument.assetType,
        price: close,
        priceDate: latestPrice?.date?.toISOString().split("T")[0] ?? null,
        value,
        valueDKK,
        missingPrice: !latestPrice,
      };

      if (!latestPrice) missingPrices += 1;
      totalValueDKK += valueDKK;

      const accountName = snapshot!.account.name.toUpperCase();
      const ticker = (line.instrument.ticker ?? "").toUpperCase();
      const instrumentName = line.instrument.name.toUpperCase();
      let bucketKey = "OTHER";

      if (accountName.includes("ASK") || accountName.includes("AKTIESPAREKONTO")) {
        bucketKey = "ASK";
      } else if (
        accountName.includes("BINANCE") ||
        accountName.includes("KRYPTO") ||
        accountName.includes("COINBASE") ||
        currency === "USDT" ||
        ["BTC", "ETH", "SOL", "ADA", "DOT", "AVAX", "ALGO", "BETH", "EUR"].includes(ticker) ||
        instrumentName.includes("BITCOIN") ||
        instrumentName.includes("ETHEREUM") ||
        instrumentName.includes("SOLANA") ||
        instrumentName.includes("CARDANO") ||
        instrumentName.includes("BINANCE")
      ) {
        bucketKey = "CRYPTO";
      } else if (accountName.includes("DEPOT") || accountName.includes("NORDNET") || accountName.includes("BROKERAGE")) {
        bucketKey = "DEPOT";
      }

      const bucket = bucketMap.get(bucketKey) ?? bucketMap.get("OTHER")!;
      bucket.positions.push(position);
      bucket.valueDKK += valueDKK;
    }
  }

  const positions = Array.from(bucketMap.values()).flatMap((bucket) => bucket.positions);

  const cashAccounts = await prisma.account.findMany({
    where: { userId, type: { in: [AccountType.CASH, AccountType.BROKERAGE] } },
    include: { txs: { where: { instrumentId: null } } },
  });

  const cashDKK = cashAccounts.reduce((sum, account) => {
    return (
      sum +
      account.txs.reduce((accountSum, tx) => {
        const quantity = numberOr(tx.quantity);
        const price = numberOr(tx.price, 1);
        const fees = numberOr(tx.fees);
        const amount = tx.amount !== null ? numberOr(tx.amount) : quantity * price;
        return accountSum + amount + fees;
      }, 0)
    );
  }, 0);

  const debtAccounts = await prisma.debtAccount.findMany({
    where: { userId },
    include: { postings: true },
  });
  const debts = debtAccounts.map((account) => enhanceDebtDetails(account));
  const totalDebtDKK = debts.reduce((sum, debt) => sum + numberOr(debt.balance), 0);

  return {
    asOfDate,
    totals: {
      portfolioValueDKK: totalValueDKK,
      cashDKK,
      totalDebtDKK,
      netWorthDKK: totalValueDKK + cashDKK - totalDebtDKK,
    },
    buckets: Array.from(bucketMap.values()).filter((bucket) => bucket.positions.length > 0),
    positions,
    debts,
    status: {
      missingPrices,
      hasHoldings: positions.length > 0,
    },
  };
}

export async function buildBudgetModel(prisma: PrismaClient, userId: string): Promise<BudgetModel> {
  const inputs = await loadScenarioInputs(prisma, userId);
  const year = new Date().getFullYear();
  const baseline = inputs.baseline || {};
  const groupedExpenses = buildBudgetGroups(inputs);
  const annualBonus = numberOr(baseline.annualBonus);
  const monthlyGross = numberOr(baseline.monthlyGrossIncome, 65_000);
  const bonusMonth = 2;
  const tax = calculateTax({
    taxYear: year,
    municipality: { rate: 0.2505, churchRate: 0.007 },
    personalIncome: {
      salaryGross: monthlyGross * 12,
      bonusGross: annualBonus,
      atp: 1_135,
    },
  });

  const monthlyTax = {
    amBidrag: numberOr(tax.breakdown.personal?.breakdown?.amBidrag) / 12,
    kommune: numberOr(tax.breakdown.personal?.breakdown?.municipalTax) / 12,
    church: numberOr(tax.breakdown.personal?.breakdown?.churchTax) / 12,
    bottom: numberOr(tax.breakdown.personal?.breakdown?.bottomTax) / 12,
    middle: numberOr(tax.breakdown.personal?.breakdown?.middleTax) / 12,
    top: numberOr(tax.breakdown.personal?.breakdown?.topTax) / 12,
    equity: numberOr(tax.totals.equityTaxTotal) / 12,
    ask: numberOr(tax.totals.askTaxTotal) / 12,
    capital: numberOr(tax.totals.capitalTaxTotal) / 12,
    total: numberOr(tax.totals.totalTax) / 12,
  };

  const expensesTotal = Object.values(groupedExpenses).reduce((sum, amount) => sum + amount, 0);
  const savingsRate = normalizePercent(baseline.savingsRatePct, 0);
  const fixedContribution = numberOr(baseline.monthlyLiquidSavings, 5_000);
  const averageNetBeforeExpenses = monthlyGross + annualBonus / 12 - monthlyTax.total;
  const monthlyInvest = savingsRate > 0 ? Math.max(0, averageNetBeforeExpenses * savingsRate) : fixedContribution;

  const months: BudgetMonthModel[] = Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(year, index, 1);
    const bonus = index === bonusMonth ? annualBonus : 0;
    const totalIncome = monthlyGross + bonus;
    const netDisposable = totalIncome - monthlyTax.total - expensesTotal;
    return {
      monthKey: monthKeyFrom(monthDate),
      income: {
        salary: monthlyGross,
        bonus,
        other: 0,
        total: totalIncome,
      },
      expenses: {
        housing: groupedExpenses.Housing,
        utilities: groupedExpenses.Utilities,
        transport: groupedExpenses.Transport,
        food: groupedExpenses.Food,
        subscriptions: groupedExpenses.Subscriptions,
        insurance: groupedExpenses.Insurance,
        other: groupedExpenses.Other,
        total: expensesTotal,
      },
      tax: monthlyTax,
      netDisposable,
      allocations: {
        invest: monthlyInvest,
        liquidSavings: 0,
        residual: netDisposable - monthlyInvest,
      },
    };
  });

  const yearly = months.reduce(
    (acc, month) => {
      acc.income.salary += month.income.salary;
      acc.income.bonus += month.income.bonus;
      acc.income.other += month.income.other;
      acc.income.total += month.income.total;

      acc.expenses.housing += month.expenses.housing;
      acc.expenses.utilities += month.expenses.utilities;
      acc.expenses.transport += month.expenses.transport;
      acc.expenses.food += month.expenses.food;
      acc.expenses.subscriptions += month.expenses.subscriptions;
      acc.expenses.insurance += month.expenses.insurance;
      acc.expenses.other += month.expenses.other;
      acc.expenses.total += month.expenses.total;

      acc.tax.amBidrag += month.tax.amBidrag;
      acc.tax.kommune += month.tax.kommune;
      acc.tax.church += month.tax.church;
      acc.tax.bottom += month.tax.bottom;
      acc.tax.middle += month.tax.middle;
      acc.tax.top += month.tax.top;
      acc.tax.equity += month.tax.equity;
      acc.tax.ask += month.tax.ask;
      acc.tax.capital += month.tax.capital;
      acc.tax.total += month.tax.total;

      acc.netDisposable += month.netDisposable;
      acc.allocations.invest += month.allocations.invest;
      acc.allocations.liquidSavings += month.allocations.liquidSavings;
      acc.allocations.residual += month.allocations.residual;
      return acc;
    },
    {
      monthKey: `${year}`,
      income: { salary: 0, bonus: 0, other: 0, total: 0 },
      expenses: { housing: 0, utilities: 0, transport: 0, food: 0, subscriptions: 0, insurance: 0, other: 0, total: 0 },
      tax: { amBidrag: 0, kommune: 0, church: 0, bottom: 0, middle: 0, top: 0, equity: 0, ask: 0, capital: 0, total: 0 },
      netDisposable: 0,
      allocations: { invest: 0, liquidSavings: 0, residual: 0 },
    },
  );

  return {
    year,
    months,
    yearly,
    dataQuality: {
      hasExpenses: expensesTotal > 0,
      hasIncomeInputs: Boolean(inputs.baseline),
      hasTaxRules: true,
    },
  };
}

function calculateHousingBalances(inputs: ScenarioInputs) {
  const housing = normalizeHousingInput(inputs.housing ?? createDefaultHousingInput());
  const split = deriveLoanSplit({
    price: numberOr(housing.purchase?.price),
    downPaymentCash: numberOr(housing.purchase?.downPaymentCash),
    mortgageEnabled: housing.financing?.mortgage?.enabled !== false,
    mortgageLtvMax: numberOr(housing.financing?.mortgage?.ltvMax, 0.8),
    bankLoanEnabled: housing.financing?.bankLoan?.enabled !== false,
  });

  return {
    homeValue: numberOr(housing.purchase?.price),
    mortgageBalance: split.mortgagePrincipal,
    bankLoanBalance: split.bankPrincipal,
  };
}

export async function buildForecastModel(prisma: PrismaClient, userId: string): Promise<ForecastResponseModel> {
  const [inputs, holdingsSnapshot, budgetModel] = await Promise.all([
    loadScenarioInputs(prisma, userId),
    loadHoldingsSnapshot(prisma, userId),
    buildBudgetModel(prisma, userId),
  ]);

  const baseline = inputs.baseline || {};
  const housingBalances = calculateHousingBalances(inputs);
  const startDate = new Date();
  const horizonMonths = Math.max(12, numberOr(inputs.months, 120));
  const horizonYears = Math.max(1, Math.round(horizonMonths / 12));
  const salaryGrowth = (inputs.salary_growth_path?.yearlyPct as number[] | undefined) ?? Array(horizonYears).fill(0.03);
  const bonusGrowth = (inputs.bonus_growth_path?.yearlyPct as number[] | undefined) ?? Array(horizonYears).fill(0.2);
  const inflationRate = normalizePercent(baseline.expenseInflationRate, 0.02);
  const equityReturnPct = normalizePercent(inputs.return_assumptions?.equityPct, 0.07);
  const budgetGroups = buildBudgetGroups(inputs);
  const baseExpenses = Object.values(budgetGroups).reduce((sum, amount) => sum + amount, 0);
  const baseMonthlyGross = numberOr(baseline.monthlyGrossIncome, 65_000);
  const annualBonusBase = numberOr(baseline.annualBonus, 0);
  const savingsRate = normalizePercent(baseline.savingsRatePct, 0);
  const fixedContribution = numberOr(baseline.monthlyLiquidSavings, 5_000);
  const debtDetails = [
    ...holdingsSnapshot.debts.map((debt) => ({
      balance: numberOr(debt.balance),
      rate: normalizePercent(debt.interestRate, 0.04),
      remainingMonths: Math.max(12, numberOr(debt.paymentPeriodYears, 10) * 12),
      repaymentStart: debt.repaymentStartDate ? debt.repaymentStartDate.slice(0, 7) : null,
    })),
    {
      balance: housingBalances.mortgageBalance,
      rate: normalizePercent(inputs.housing?.financing?.mortgage?.bondRateNominalAnnual, 0.0409),
      remainingMonths: Math.max(12, numberOr(inputs.housing?.financing?.mortgage?.termYears, 30) * 12),
      repaymentStart: monthKeyFrom(startDate),
    },
    {
      balance: housingBalances.bankLoanBalance,
      rate: normalizePercent(inputs.housing?.financing?.bankLoan?.rateNominalAnnual, 0.055),
      remainingMonths: Math.max(12, numberOr(inputs.housing?.financing?.bankLoan?.termYears, 20) * 12),
      repaymentStart: monthKeyFrom(startDate),
    },
  ].filter((debt) => debt.balance > 0);

  let cash = holdingsSnapshot.totals.cashDKK;
  let portfolioValue = holdingsSnapshot.totals.portfolioValueDKK;
  let debtValue = debtDetails.reduce((sum, debt) => sum + debt.balance, 0);
  const monthlyPnlSeries: ForecastResponseModel["monthlyPnlSeries"] = [];
  const netWorthSeries: ForecastResponseModel["netWorthSeries"] = [];
  const portfolioSeries: ForecastResponseModel["portfolioSeries"] = [];

  for (let index = 0; index < horizonMonths; index += 1) {
    const currentDate = addMonths(startDate, index);
    const month = monthKeyFrom(currentDate);
    const yearIndex = Math.floor(index / 12);
    const growthPct = normalizePercent(salaryGrowth[yearIndex] ?? salaryGrowth[salaryGrowth.length - 1] ?? 0.03, 0.03);
    const bonusPct = normalizePercent(bonusGrowth[yearIndex] ?? bonusGrowth[bonusGrowth.length - 1] ?? 0.2, 0.2);
    const inflationFactor = Math.pow(1 + inflationRate, yearIndex);
    const monthlyGross = baseMonthlyGross * Math.pow(1 + growthPct, yearIndex);
    const annualBonus = annualBonusBase > 0 ? monthlyGross * 12 * bonusPct : 0;
    const annualTax = calculateTax({
      taxYear: currentDate.getFullYear(),
      municipality: { rate: 0.2505, churchRate: 0.007 },
      personalIncome: {
        salaryGross: monthlyGross * 12,
        bonusGross: annualBonus,
        atp: 1_135,
      },
    });
    const monthlyTax = numberOr(annualTax.totals.totalTax) / 12;
    const totalExpenses = baseExpenses * inflationFactor;
    const monthlyNetBeforeExpenses = monthlyGross + annualBonus / 12 - monthlyTax;
    const monthlyContribution = savingsRate > 0 ? Math.max(0, monthlyNetBeforeExpenses * savingsRate) : fixedContribution;

    let monthlyDebtPayment = 0;
    let monthlyDebtInterest = 0;
    for (const debt of debtDetails) {
      if (debt.balance <= 0) continue;
      const active = debt.repaymentStart === null || month >= debt.repaymentStart;
      const monthlyRate = debt.rate / 12;
      const interest = debt.balance * monthlyRate;
      monthlyDebtInterest += interest;
      if (!active) {
        debt.balance += interest;
        continue;
      }
      const remainingMonths = Math.max(1, debt.remainingMonths);
      const payment =
        monthlyRate > 0
          ? (debt.balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -remainingMonths))
          : debt.balance / remainingMonths;
      const principal = Math.min(debt.balance, Math.max(0, payment - interest));
      debt.balance = Math.max(0, debt.balance - principal);
      debt.remainingMonths = Math.max(0, debt.remainingMonths - 1);
      monthlyDebtPayment += payment;
    }

    debtValue = debtDetails.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0);
    const residual = monthlyNetBeforeExpenses - totalExpenses - monthlyContribution - monthlyDebtPayment;
    cash += residual;
    const portfolioStart = portfolioValue;
    const growth = (portfolioValue + monthlyContribution) * (equityReturnPct / 12);
    portfolioValue += monthlyContribution + growth;

    monthlyPnlSeries.push({
      month,
      grossIncome: monthlyGross + annualBonus / 12,
      tax: monthlyTax,
      expenses: totalExpenses + monthlyDebtInterest,
      invest: monthlyContribution,
      residual,
      netDisposable: monthlyNetBeforeExpenses - totalExpenses - monthlyDebtPayment,
    });
    portfolioSeries.push({
      month,
      portfolioValue,
      contribution: monthlyContribution,
      growth,
    });
    netWorthSeries.push({
      month,
      netWorth: cash + portfolioValue + housingBalances.homeValue - debtValue,
      cash,
      portfolioValue,
      debt: debtValue,
      homeValue: housingBalances.homeValue,
    });
  }

  const currentBudget = budgetModel.months[0];
  const finalPoint = netWorthSeries[netWorthSeries.length - 1];
  const denominator = Math.max(1, holdingsSnapshot.totals.netWorthDKK || 1);

  return {
    summary: {
      startMonth: monthKeyFrom(startDate),
      horizonYears,
      currentNetWorth: holdingsSnapshot.totals.netWorthDKK + housingBalances.homeValue - housingBalances.mortgageBalance - housingBalances.bankLoanBalance,
      projectedNetWorth: finalPoint?.netWorth ?? holdingsSnapshot.totals.netWorthDKK,
      projectedPortfolioValue: portfolioSeries[portfolioSeries.length - 1]?.portfolioValue ?? holdingsSnapshot.totals.portfolioValueDKK,
      monthlyDisposableNow: currentBudget?.netDisposable ?? 0,
      monthlyResidualNow: currentBudget?.allocations.residual ?? 0,
      monthlyInvestmentNow: currentBudget?.allocations.invest ?? 0,
      portfolioSharePct: holdingsSnapshot.totals.portfolioValueDKK / denominator,
      liquiditySharePct: holdingsSnapshot.totals.cashDKK / denominator,
      debtSharePct: holdingsSnapshot.totals.totalDebtDKK / denominator,
      homeValue: housingBalances.homeValue,
    },
    monthlyPnlSeries,
    netWorthSeries,
    portfolioSeries,
    scenarioMeta: {
      horizonMonths,
      inflationRate,
      equityReturnPct,
      savingsMode: savingsRate > 0 ? "rate" : "fixed",
      savingsValue: savingsRate > 0 ? savingsRate : fixedContribution,
      budgetCategoriesCount: ((inputs.budget_categories as BudgetCategoryLine[]) || []).length,
      advanced: {
        housingEnabled: housingBalances.homeValue > 0,
        debtEnabled: holdingsSnapshot.debts.length > 0 || housingBalances.mortgageBalance > 0 || housingBalances.bankLoanBalance > 0,
        eventsCount: Array.isArray(inputs.events) ? inputs.events.length : 0,
      },
    },
  };
}
