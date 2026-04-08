/**
 * Projection Engine Verification Script
 * 
 * Run with: npm run projection:verify
 */

import {
    runProjection,
    createHousingPurchaseModule,
    ProjectionInput,
} from '../src/projection';
import { loadHousingRules } from '../src/housing/rules.server';
import { HousingPurchaseInput } from '../src/housing';

async function main() {
    console.log('='.repeat(60));
    console.log('Projection Engine Verification');
    console.log('='.repeat(60));
    console.log('');

    // Load housing rules
    const rules = loadHousingRules(2026, { useExample: true });
    console.log('✓ Loaded housing rules_2026.example.json');
    console.log('');

    // ============================================================
    // BASELINE INPUT (no modules)
    // ============================================================

    const baseInput: ProjectionInput = {
        horizon: {
            startMonth: '2026-01',
            months: 24,
        },
        startingBalanceSheet: {
            cash: 200_000,
            portfolioValue: 500_000,
        },
        baseline: {
            monthlyDisposableIncomeBeforeHousing: 35_000,
            monthlyNonHousingExpenses: 20_000,
        },
        modules: [],
    };

    console.log('='.repeat(60));
    console.log('SCENARIO A: Baseline (No Housing)');
    console.log('='.repeat(60));

    const resultA = runProjection(baseInput);
    const lastA = resultA.series[resultA.series.length - 1];

    console.log(`  Start cash: ${baseInput.startingBalanceSheet.cash.toLocaleString('da-DK')} DKK`);
    console.log(`  Month 24 cash: ${lastA.balanceSheet.cash.toLocaleString('da-DK')} DKK`);
    console.log(`  Month 24 net worth: ${lastA.balanceSheet.netWorth.toLocaleString('da-DK')} DKK`);
    console.log(`  Monthly savings: ${(baseInput.baseline.monthlyDisposableIncomeBeforeHousing - baseInput.baseline.monthlyNonHousingExpenses).toLocaleString('da-DK')} DKK`);
    console.log(`  Home value: ${lastA.balanceSheet.homeValue.toLocaleString('da-DK')} DKK`);
    console.log('');

    // ============================================================
    // WITH HOUSING MODULE
    // ============================================================

    const housingInput: HousingPurchaseInput = {
        year: 2026,
        purchase: {
            price: 3_000_000,
            downPaymentCash: 300_000,
            closeDate: '2026-04-15',
        },
        financing: {
            mortgage: {
                enabled: true,
                termYears: 30,
                loanType: 'FAST',
                amortizationProfile: 'FULL',
                bondRateNominalAnnual: 0.04,
                paymentsPerYear: 12,
            },
            bankLoan: {
                enabled: true,
                rateNominalAnnual: 0.065,
                termYears: 10,
                paymentsPerYear: 12,
            },
        },
        transactionCosts: {
            includeDefaultCosts: true,
            customCosts: [],
        },
        budgetIntegration: {
            monthlyDisposableIncomeBeforeHousing: 35_000,
            monthlyHousingRunningCosts: 4_000,
        },
        scenarioMeta: {
            scenarioId: 'with_housing',
        },
    };

    const housingModule = createHousingPurchaseModule({ input: housingInput, rules });

    const inputB: ProjectionInput = {
        ...baseInput,
        modules: [housingModule],
    };

    console.log('='.repeat(60));
    console.log('SCENARIO B: With Housing Purchase');
    console.log('='.repeat(60));

    const resultB = runProjection(inputB);

    // Find close month (2026-04)
    const closeMonth = resultB.series.find(s => s.month === '2026-04');
    const lastB = resultB.series[resultB.series.length - 1];

    if (closeMonth) {
        console.log('');
        console.log('📍 Close Month (2026-04):');
        console.log(`  Cash: ${closeMonth.balanceSheet.cash.toLocaleString('da-DK')} DKK`);
        console.log(`  Upfront outflow: ${closeMonth.cashFlow.upfrontHousingCashOut.toLocaleString('da-DK')} DKK`);
        console.log(`  Home value: ${closeMonth.balanceSheet.homeValue.toLocaleString('da-DK')} DKK`);
        console.log(`  Mortgage balance: ${closeMonth.balanceSheet.mortgageBalance.toLocaleString('da-DK')} DKK`);
        console.log(`  Bank loan balance: ${closeMonth.balanceSheet.bankLoanBalance.toLocaleString('da-DK')} DKK`);
        console.log(`  Net worth: ${closeMonth.balanceSheet.netWorth.toLocaleString('da-DK')} DKK`);
        console.log(`  Audits in month: ${closeMonth.audits.length}`);
    }

    console.log('');
    console.log('📍 Month After Close (2026-05):');
    const monthAfter = resultB.series.find(s => s.month === '2026-05');
    if (monthAfter) {
        console.log(`  Housing interest: ${monthAfter.pnl.housingInterest.toLocaleString('da-DK')} DKK`);
        console.log(`  Housing contribution: ${monthAfter.pnl.housingContribution.toLocaleString('da-DK')} DKK`);
        console.log(`  Housing running costs: ${monthAfter.pnl.housingRunningCosts.toLocaleString('da-DK')} DKK`);
        console.log(`  Total expenses: ${monthAfter.pnl.totalExpenses.toLocaleString('da-DK')} DKK`);
        console.log(`  Net P&L: ${monthAfter.pnl.net.toLocaleString('da-DK')} DKK`);
        console.log(`  Principal repayment: ${monthAfter.cashFlow.principalRepayment.toLocaleString('da-DK')} DKK`);
    }

    console.log('');
    console.log('📍 Month 24 (2026-12):');
    console.log(`  Cash: ${lastB.balanceSheet.cash.toLocaleString('da-DK')} DKK`);
    console.log(`  Home value: ${lastB.balanceSheet.homeValue.toLocaleString('da-DK')} DKK`);
    console.log(`  Mortgage balance: ${lastB.balanceSheet.mortgageBalance.toLocaleString('da-DK')} DKK`);
    console.log(`  Bank loan balance: ${lastB.balanceSheet.bankLoanBalance.toLocaleString('da-DK')} DKK`);
    console.log(`  Net worth: ${lastB.balanceSheet.netWorth.toLocaleString('da-DK')} DKK`);

    console.log('');
    console.log('='.repeat(60));
    console.log('COMPARISON');
    console.log('='.repeat(60));
    console.log(`  Net worth without housing: ${lastA.balanceSheet.netWorth.toLocaleString('da-DK')} DKK`);
    console.log(`  Net worth with housing: ${lastB.balanceSheet.netWorth.toLocaleString('da-DK')} DKK`);
    console.log(`  Difference: ${(lastB.balanceSheet.netWorth - lastA.balanceSheet.netWorth).toLocaleString('da-DK')} DKK`);
    console.log('');

    if (resultB.warnings.length > 0) {
        console.log('⚠️ Warnings:');
        resultB.warnings.forEach(w => console.log(`  - ${w}`));
    }

    // Show sample audit
    console.log('');
    console.log('='.repeat(60));
    console.log('SAMPLE AUDITS');
    console.log('='.repeat(60));

    let totalAudits = 0;
    resultB.series.forEach(s => totalAudits += s.audits.length);
    console.log(`  Total audits across all months: ${totalAudits}`);

    if (closeMonth && closeMonth.audits.length > 0) {
        console.log('');
        console.log('  Sample from close month:');
        const sample = closeMonth.audits[0];
        console.log(`    Title: "${sample.title}"`);
        console.log(`    Inputs: ${sample.inputs?.length || 0}`);
        console.log(`    Steps: ${sample.steps?.length || 0}`);
        console.log(`    Outputs: ${sample.outputs?.length || 0}`);
    }

    console.log('');
    console.log('✓ Verification complete');
}

main().catch(console.error);
