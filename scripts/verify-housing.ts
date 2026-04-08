/**
 * Housing Simulation Verification Script
 * 
 * Run with: npm run housing:verify
 */

import { loadHousingRules } from '../src/housing/rules.server';
import { simulateHomePurchase, HousingPurchaseInput } from '../src/housing';

async function main() {
    console.log('='.repeat(60));
    console.log('Housing Simulation Verification');
    console.log('='.repeat(60));
    console.log('');

    // Load example rules
    const rules = loadHousingRules(2026, { useExample: true });
    console.log('✓ Loaded rules_2026.example.json');
    console.log(`  Min down payment: ${rules.minDownPaymentPct * 100}%`);
    console.log(`  Max LTV: ${rules.mortgageLtvMax * 100}%`);
    console.log('');

    // Define test input
    const input: HousingPurchaseInput = {
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
            scenarioId: 'baseline',
            notes: 'Verification test case',
        },
    };

    console.log('Input:');
    console.log(`  Purchase price: ${input.purchase.price.toLocaleString('da-DK')} DKK`);
    console.log(`  Down payment: ${input.purchase.downPaymentCash.toLocaleString('da-DK')} DKK`);
    console.log(`  Mortgage rate: ${input.financing.mortgage.bondRateNominalAnnual * 100}%`);
    console.log(`  Bank rate: ${input.financing.bankLoan.rateNominalAnnual * 100}%`);
    console.log('');

    // Run simulation
    const result = simulateHomePurchase(input, rules);

    console.log('='.repeat(60));
    console.log('DERIVED VALUES');
    console.log('='.repeat(60));
    console.log(`  Mortgage principal: ${result.derived.mortgagePrincipal.toLocaleString('da-DK')} DKK`);
    console.log(`  Bank principal: ${result.derived.bankPrincipal.toLocaleString('da-DK')} DKK`);
    console.log(`  Deed fee: ${result.derived.deedFee.toLocaleString('da-DK')} DKK`);
    console.log(`  Mortgage pledge fee: ${result.derived.mortgagePledgeFee.toLocaleString('da-DK')} DKK`);
    console.log(`  Total upfront costs: ${result.derived.totalUpfrontCosts.toLocaleString('da-DK')} DKK`);
    console.log('');

    console.log('='.repeat(60));
    console.log('MONTHLY COSTS');
    console.log('='.repeat(60));
    console.log(`  Mortgage payment: ${result.monthly.mortgagePayment.toLocaleString('da-DK')} DKK`);
    console.log(`  Mortgage contribution: ${result.monthly.mortgageContribution.toLocaleString('da-DK')} DKK`);
    console.log(`  Bank payment: ${result.monthly.bankPayment.toLocaleString('da-DK')} DKK`);
    console.log(`  Running costs: ${result.monthly.housingRunningCosts.toLocaleString('da-DK')} DKK`);
    console.log('  ' + '-'.repeat(40));
    console.log(`  TOTAL housing cost/month: ${result.monthly.totalHousingCostPerMonth.toLocaleString('da-DK')} DKK`);
    console.log(`  Disposable after housing: ${result.monthly.disposableAfterHousing.toLocaleString('da-DK')} DKK`);
    console.log('');

    console.log('='.repeat(60));
    console.log('BALANCE IMPACT');
    console.log('='.repeat(60));
    console.log(`  Asset (home value): ${result.balanceImpact.assetHomeValueInitial.toLocaleString('da-DK')} DKK`);
    console.log(`  Liabilities: ${result.balanceImpact.liabilitiesInitial.toLocaleString('da-DK')} DKK`);
    console.log(`  Equity: ${result.balanceImpact.equityInitial.toLocaleString('da-DK')} DKK`);
    console.log('');

    console.log('='.repeat(60));
    console.log('AUDITS');
    console.log('='.repeat(60));
    console.log(`  Total audit objects: ${result.audits.length}`);
    console.log('');

    // Show first audit as example
    const firstAudit = result.audits[0];
    console.log(`  Example audit: "${firstAudit.title}"`);
    console.log(`    Inputs: ${firstAudit.inputs.length}`);
    console.log(`    Steps: ${firstAudit.steps.length}`);
    console.log(`    Outputs: ${firstAudit.outputs.length}`);
    if (firstAudit.steps.length > 0) {
        console.log(`    Sample step: ${firstAudit.steps[0].label} = ${firstAudit.steps[0].value}`);
    }
    console.log('');

    if (result.warnings.length > 0) {
        console.log('⚠️ WARNINGS:');
        result.warnings.forEach(w => console.log(`  - ${w}`));
        console.log('');
    }

    if (result.assumptions.length > 0) {
        console.log('📝 ASSUMPTIONS:');
        result.assumptions.forEach(a => console.log(`  - ${a}`));
        console.log('');
    }

    console.log('✓ Verification complete');
}

main().catch(console.error);
