import { calculateTax } from "@/src/lib/tax";

interface ProjectionInputs {
    monthlyGrossStart: number;
    pensionRate: number;
    liquidSavingsBase: number;
    inflationRate: number;
    growthPath: number[];
    monthlyExpensesByGroup: Record<string, number>;
}

export function calculateFutureEvolution(inputs: ProjectionInputs, startYear: number, horizonYears: number) {
    const years = [];
    let currentGross = inputs.monthlyGrossStart;

    for (let i = 0; i < horizonYears; i++) {
        const year = startYear + i;
        const growthPct = (inputs.growthPath[i] || 2) / 100;

        // Inflate expenses
        const inflationFactor = Math.pow(1 + inputs.inflationRate, i);

        // Evolve Income
        if (i > 0) currentGross = currentGross * (1 + growthPct);

        // Calculate Tax
        const taxInput = {
            taxYear: 2026, // Stable tax rules
            municipality: { rate: 0.2505, churchRate: 0.007 },
            personalIncome: {
                salaryGross: currentGross * 12,
                atp: 1135,
            }
        };
        const taxResult = calculateTax(taxInput);
        const tb = taxResult.breakdown.personal?.breakdown;

        const monthlyTax = {
            amBidrag: (tb?.amBidrag || 0) / 12,
            kommune: (tb?.municipalTax || 0) / 12,
            church: (tb?.churchTax || 0) / 12,
            bottom: (tb?.bottomTax || 0) / 12,
            middle: (tb?.middleTax || 0) / 12,
            top: (tb?.topTax || 0) / 12,
            equity: (taxResult.totals.equityTaxTotal || 0) / 12,
            ask: (taxResult.totals.askTaxTotal || 0) / 12,
            capital: (taxResult.totals.capitalTaxTotal || 0) / 12,
            total: taxResult.totals.totalTax / 12
        };

        const evolvedExpenses = {
            housing: (inputs.monthlyExpensesByGroup["Housing"] || 0) * inflationFactor,
            utilities: (inputs.monthlyExpensesByGroup["Utilities"] || 0) * inflationFactor,
            transport: (inputs.monthlyExpensesByGroup["Transport"] || 0) * inflationFactor,
            food: (inputs.monthlyExpensesByGroup["Food"] || 0) * inflationFactor,
            subscriptions: (inputs.monthlyExpensesByGroup["Subscriptions"] || 0) * inflationFactor,
            insurance: (inputs.monthlyExpensesByGroup["Insurance"] || 0) * inflationFactor,
            other: (inputs.monthlyExpensesByGroup["Other"] || 0) * inflationFactor,
        };
        const totalEvolvedExpenses = Object.values(evolvedExpenses).reduce((a, b) => a + b, 0);

        const netDisposable = currentGross - monthlyTax.total - totalEvolvedExpenses;

        const liquidSavings = inputs.liquidSavingsBase * inflationFactor;

        // Simple allocation rule for now: Invest = Residual - Liquid Savings target
        const residual = netDisposable - liquidSavings;
        const invest = Math.max(0, residual);
        // Note: In monthly-evolution route we set invest=0 and residual=net-savings. 
        // Let's align with that for now to match the "Residual Cash Flow" concept.

        const typicalMonth = {
            income: { salary: currentGross, bonus: 0, other: 0, total: currentGross },
            expenses: { ...evolvedExpenses, total: totalEvolvedExpenses },
            tax: { ...monthlyTax, audit: taxResult }, // Include audit for usage
            netDisposable,
            allocations: { invest: 0, liquidSavings, residual }
        };

        years.push({
            yearIndex: i + 1,
            calendarYear: year,
            typicalMonth,
            notes: [`Growth: ${growthPct * 100}%`, `Inflation: ${inputs.inflationRate * 100}%`]
        });
    }

    return years;
}
