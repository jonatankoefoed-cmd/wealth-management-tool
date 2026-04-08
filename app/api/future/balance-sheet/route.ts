import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { fail, ok } from "@/app/api/_lib/response";
import { getTodayBalanceSheetSnapshot } from "@/lib/future/balance-sheet-snapshot";
import { calculateFutureEvolution } from "@/lib/projection-engine";

export async function GET(request: Request): Promise<Response> {
    try {
        const { searchParams } = new URL(request.url);
        const horizonYears = Number(searchParams.get("horizonYears") || 10);
        const startYear = 2026; // TODO: Make dynamic or aligned with system "current year"

        const prisma = getPrismaClient();
        const userId = await requireDefaultUserId();

        // 1. Fetch Today Snapshot
        const todaySnapshot = await getTodayBalanceSheetSnapshot(userId);

        // 2. Fetch Inputs & Expenses for Monthly Evolution
        const scenario = await prisma.scenario.findFirst({
            where: { userId, isBase: true },
            include: { overrides: true },
        });

        const inputs = scenario?.overrides.reduce((acc, curr) => {
            acc[curr.key] = curr.valueJson;
            return acc;
        }, {} as Record<string, any>) || {};

        const monthlyGrossStart = Number(inputs.baseline?.monthlyGrossIncome || 65000);
        const pensionRate = Number(inputs.baseline?.pensionContributionRate || 0);
        const liquidSavingsBase = Number(inputs.baseline?.monthlyLiquidSavings || 5000);
        const inflationRate = 0.02;
        const growthPath = inputs.salary_growth_path?.yearlyPct || Array(horizonYears).fill(2);

        const expenses = await prisma.expenseLine.findMany({ where: { userId } });

        const mapCategory = (cat: string): string => {
            const lower = cat.toLowerCase();
            if (lower.includes("bolig") || lower.includes("hus") || lower.includes("rent")) return "Housing";
            if (lower.includes("el") || lower.includes("vand") || lower.includes("varme") || lower.includes("util")) return "Utilities";
            if (lower.includes("transport") || lower.includes("bil") || lower.includes("car")) return "Transport";
            if (lower.includes("mad") || lower.includes("food") || lower.includes("indkøb")) return "Food";
            if (lower.includes("sub") || lower.includes("abonnement") || lower.includes("stream")) return "Subscriptions";
            if (lower.includes("forsikring") || lower.includes("insur")) return "Insurance";
            return "Other";
        };

        const monthlyExpensesByGroup = expenses.reduce((acc, exp) => {
            const amount = Number(exp.amount);
            let monthly = amount;
            if (exp.frequency === "YEARLY") monthly = amount / 12;
            if (exp.frequency === "QUARTERLY") monthly = amount / 3;

            const group = mapCategory(exp.category);
            acc[group] = (acc[group] || 0) + monthly;
            return acc;
        }, {} as Record<string, number>);

        // 3. Calculate Monthly Evolution
        const evolutionYears = calculateFutureEvolution({
            monthlyGrossStart,
            pensionRate,
            liquidSavingsBase,
            inflationRate,
            growthPath,
            monthlyExpensesByGroup
        }, startYear, horizonYears);

        // 4. Derive Yearly Balance Sheet
        const yearlyBalanceSheets = [];

        // Initialize running balances with Today's snapshot
        let currentCash = todaySnapshot.assets.cashDKK;
        // If today's portfolio is missing price, we can't project it properly, but we can project contributions?
        // Let's assume 0 if null for projection base, but keep tracking quality.
        let currentPortfolio = todaySnapshot.assets.portfolioValueDKK || 0;

        // Housing and Debt: 
        // Housing Value: If not in snapshot, maybe it starts in future?
        // For now, assume simple evolution or constant.
        let currentHousing = todaySnapshot.assets.housingValueDKK || 0;
        let currentSuDebt = todaySnapshot.liabilities.suDebtDKK || 0;
        let currentHousingLoan = todaySnapshot.liabilities.housingLoanDKK || 0;
        let currentOtherDebt = todaySnapshot.liabilities.otherDebtDKK || 0;

        let previousNetWorth = (currentCash + currentPortfolio + currentHousing) - (currentSuDebt + currentHousingLoan + currentOtherDebt);

        // Add Year 0 (Today)
        const year0 = {
            yearIndex: 0,
            calendarYear: new Date().getFullYear(),
            eoy: { ...todaySnapshot.assets, ...todaySnapshot.liabilities, netWorthDKK: todaySnapshot.netWorthDKK },
            deltas: {
                cashChangeDKK: null,
                portfolioChangeDKK: null,
                debtChangeDKK: null,
                housingChangeDKK: null
            },
            reconciliation: {
                ok: true,
                notes: ["Starting snapshot"],
                components: []
            },
            notes: ["Real data from latest snapshot"]
        };

        // We don't push year0 to the "years" array in the return payload based on the requirement structure 
        // which has `today` separate, but the UI requirement says "Year 0 (Today) + Year 1..N".
        // The previous implementation plan said "return specific Step 8 payload" which had `today` and `years`.
        // I will stick to the payload structure defined in the prompt.

        for (const year of evolutionYears) {
            // Aggregate 12 months (using typical month * 12)
            // Note: `calculateFutureEvolution` returns `typicalMonth`. 
            // We assume 12 identical months for simplicity unless we have seasonality.

            const annualInvest = (year.typicalMonth.allocations.invest || 0) * 12;
            const annualLiquid = (year.typicalMonth.allocations.liquidSavings || 0) * 12;
            const annualResidual = (year.typicalMonth.allocations.residual || 0) * 12;
            const annualNetDisposable = year.typicalMonth.netDisposable * 12;

            // --- Apply Deltas ---

            // Cash Change
            // Cash grows by: Liquid Savings + Residual (if not invested)
            // Wait, typicalMonth.allocations.invest is derived from residual.
            // If invest > 0, then residual was used.
            // Let's check logic:
            // `invest = Math.max(0, residual)`
            // `residual` in typicalMonth was `netDisposable - liquidSavings`.
            // So `invest` consumes that residual.
            // So Cash explicitly grows by `liquidSavings`. 
            // AND if `invest` is 0 (maybe negative residual?), we need to handle debt?
            // `calculateFutureEvolution` sets `residual` as `netDisposable - liquidSavings`.
            // If `residual` > 0, it goes to `invest`.
            // If `residual` < 0, it means we are burning cash? or debt?
            // The simplistic engine puts it to `invest` if positive. 
            // If negative, `invest` is 0. The deficit remains in `residual` allocation? 
            // Actually the engine code: `const residual = netDisposable - liquidSavings; const invest = Math.max(0, residual);`
            // So if `residual` is negative, `invest` is 0. 
            // The "Cash Flow" for the year into Cash Account is `liquidSavings`.
            // What if `residual` is negative? It means we can't save `liquidSavings`. 
            // We should reduce cash growth?
            // The engine doesn't feedback loop. 
            // Let's assume:
            // Cash Delta = (Liquid Savings Alloc) + (Residual - Invest).
            // If Residual > 0, Invest = Residual, so (Residual - Invest) = 0. Cash Delta = Liquid Savings.
            // If Residual < 0, Invest = 0, so (Residual - Invest) = Negative. Cash Delta = Liquid Savings + Negative = Real Net Flow.
            // Example: NetDisp = 4000. Liquid = 5000. Residual = -1000. Invest = 0.
            // Cash Delta = 5000 + (-1000) = 4000. Correct.

            const cashChange = annualLiquid + (annualResidual - annualInvest);

            currentCash += cashChange;

            // Portfolio Change
            // Portfolio grows by: Investments + Market Returns
            // Market Return: Not explicitly modeled in `calculateFutureEvolution` yet?
            // The prompt says: "If engine does not provide a component, it must remain null or explicitly 'Not modeled'."
            // The engine only returns typical flows. 
            // We *could* apply a simple return rate here derived from inputs or hardcoded safe assumption if "modeled"?
            // Prompt says "Grossly derived... C) Optional modeled market returns ... if your engine provides it".
            // Our engine *doesn't* return "marketReturn" in `typicalMonth`.
            // So we should treat it as "Not modeled" or "0" for now to be safe and specific?
            // Or we can verify if the user has an assumption for "portfolio return".
            // Let's check `inputs`. There was `growthPath` for salary. Maybe `marketReturn`?
            // Schema `ScenarioOverride` might have it.
            // If not found, imply 0 and mark "not modeled".
            // Let's check `inputs.assumptions?.marketReturnPct`.

            const marketReturnPct = Number(inputs.assumptions?.marketReturnPct || 0) / 100;
            // If 0, maybe it's not modeled.
            // Let's calculate a return if > 0.
            const marketReturnAmt = currentPortfolio * marketReturnPct; // Simple BOP or Avg balance return?
            // Let's use BOP for simplicity.

            const portfolioChange = annualInvest + marketReturnAmt;
            currentPortfolio += portfolioChange;

            // Debt Change
            // Engine logic doesn't explicitly pay down debt yet.
            // So Debt Change = 0 (Interest handling is in expenses usually).
            // If housing loan principal payment is in expenses?
            // "Housing costs" in engine are just inflation adjusted expenses.
            // Step 8 rules: "If monthly engine models interest/principal, use it; otherwise keep debt constant".
            // Engine groups "Housing" expense. It doesn't split principal.
            // So Debt Change = 0.
            // Mark "debtPrincipalChange" as "not_modeled".

            // Housing Asset
            // Does it appreciate? "Housing asset value (DKK) if housing is enabled and ownership started"
            // If we have an inflation rate, maybe housing value grows?
            // But prompt says "No independent assumptions". 
            // Let's keep it constant unless we add appreciation to the engine.
            // Engine uses `inflationRate` for expenses.
            // Let's mark housing appreciation as "not_modeled" and keep constant.

            const eoyAssets = {
                cashDKK: currentCash,
                portfolioDKK: todaySnapshot.assets.portfolioValueDKK !== null ? currentPortfolio : null,
                housingDKK: currentHousing
            };

            const eoyLiabilities = {
                suDebtDKK: currentSuDebt,
                housingLoanDKK: currentHousingLoan,
                otherDebtDKK: currentOtherDebt
            };

            const eoyNetWorth = (eoyAssets.cashDKK || 0) + (eoyAssets.portfolioDKK || 0) + (eoyAssets.housingDKK || 0)
                - ((eoyLiabilities.suDebtDKK || 0) + (eoyLiabilities.housingLoanDKK || 0) + (eoyLiabilities.otherDebtDKK || 0));

            // Reconciliation
            // Start NW + Net Disposable ? 
            // Net Disposable = Income - Tax - Expenses.
            // "Net Worth EOY = Net Worth BoY + Sum(Annual Net Disposable) + Net Market Returns + Scenario Cash Impacts - Debt Principal Changes"
            // Let's Check:
            // Delta NW = (Cash Change + Portfolio Change + Housing Change) - (Debt Change)
            //          = (Liquid + ModResidual + Invest + MktRet) - 0
            //          = (Liquid + (NetDisp - Liquid) + MktRet)   [substituting ModResidual = NetDisp - Liquid (if Invest=0) OR Invest=Residual]
            //          Wait.
            //          Case 1: Residual > 0. Invest = Residual. CashChange = Liquid. PortChange = Residual + MktRet.
            //          Total Asset Change = Liquid + Residual + MktRet = NetDisp + MktRet.
            //          Case 2: Residual < 0. Invest = 0. CashChange = Liquid + Residual (which is NetDisp). PortChange = MktRet.
            //          Total Asset Change = NetDisp + MktRet.
            // Perfect.
            // So Delta NW = Net Disposable + Market Return.
            // This holds if Debt Change is 0 and Housing Change is 0.

            const startNetWorth = previousNetWorth;
            const calcEndNetWorth = startNetWorth + annualNetDisposable + marketReturnAmt;

            // Tolerance for floating point
            const diff = Math.abs(eoyNetWorth - calcEndNetWorth);
            const isReconciled = diff < 1.0;

            yearlyBalanceSheets.push({
                yearIndex: year.yearIndex,
                calendarYear: year.calendarYear,
                eoy: {
                    assets: eoyAssets,
                    liabilities: eoyLiabilities,
                    netWorthDKK: eoyNetWorth // Use the computed one
                },
                deltas: {
                    cashChangeDKK: cashChange,
                    portfolioChangeDKK: portfolioChange,
                    debtChangeDKK: 0,
                    housingChangeDKK: 0
                },
                reconciliation: {
                    ok: isReconciled,
                    notes: isReconciled ? [] : [`Diff: ${diff.toFixed(2)}`],
                    components: [
                        { key: "startNetWorth", label: "Start net worth", value: startNetWorth },
                        { key: "netDisposableSum", label: "Sum net disposable", value: annualNetDisposable },
                        { key: "modeledMarketReturn", label: "Modeled market return", value: marketReturnAmt, status: marketReturnPct > 0 ? "ok" : "not_modeled" },
                        { key: "debtPrincipalChange", label: "Debt principal change", value: 0, status: "not_modeled" },
                        { key: "endNetWorth", label: "End net worth (EOY)", value: eoyNetWorth }
                    ]
                },
                notes: year.notes
            });

            previousNetWorth = eoyNetWorth;
        }

        return ok({
            asOfDate: todaySnapshot.asOfDate,
            startYear,
            horizonYears,
            today: todaySnapshot,
            years: yearlyBalanceSheets,
            lastUpdated: new Date().toISOString(),
            dataQuality: {
                ok: yearlyBalanceSheets.every(y => y.reconciliation.ok),
                warnings: [],
                missingPrices: todaySnapshot.dataQuality.missingPrices,
                missingFX: todaySnapshot.dataQuality.missingFX,
                notModeled: ["debtPrincipalChange", "housingAppreciation", "marketReturn"] // TODO: dynamic check
            }
        });

    } catch (error) {
        console.error("Balance Sheet API Error:", error);
        return fail(error);
    }
}
