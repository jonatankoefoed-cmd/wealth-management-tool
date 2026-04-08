/**
 * Projection Engine + Housing Integration Tests
 * 
 * Run with: npm run projection:test
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    runProjection,
    createHousingPurchaseModule,
    ProjectionInput,
    listMonths,
    addMonths,
    buildAmortizationSchedule,
} from '../index';
import { HousingPurchaseInput, HousingRules } from '../../housing';
import { resetProjectionAuditCounter } from '../audit';

// Test rules
const testRules: HousingRules = {
    year: 2026,
    minDownPaymentPct: 0.05,
    mortgageLtvMax: 0.80,
    deedRegistration: { fixedFee: 1850, rateOfPrice: 0.006, rounding: 'NEAREST_100' },
    pledgeRegistration: { fixedFee: 1850, rateOfPrincipal: 0.014, rounding: 'NEAREST_100' },
    defaults: {
        buyerAttorneyFee: 15000,
        bankEstablishmentFee: 5000,
        valuationFee: 3000,
        propertyTaxRate: 0.0051,
        landTaxRate: 0.007,
        maintenanceRateAnnual: 0.01
    },
    mortgageRules: {
        tieredContributions: [
            { ltvFrom: 0, ltvTo: 0.40, rate: 0.0050 },
            { ltvFrom: 0.40, ltvTo: 0.60, rate: 0.0085 },
            { ltvFrom: 0.60, ltvTo: 0.80, rate: 0.0125 }
        ]
    }
};

// Test housing input
function createHousingInput(): HousingPurchaseInput {
    return {
        year: 2026,
        purchase: { price: 3_000_000, downPaymentCash: 300_000, closeDate: '2026-04-15' },
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
        transactionCosts: { includeDefaultCosts: true, customCosts: [] },
        budgetIntegration: { monthlyDisposableIncomeBeforeHousing: 35_000, monthlyHousingRunningCosts: 4_000 },
        scenarioMeta: { scenarioId: 'test' },
    };
}

// Base projection input
function createBaseInput(modules: any[] = []): ProjectionInput {
    return {
        horizon: { startMonth: '2026-01', months: 24 },
        startingBalanceSheet: { cash: 200_000, portfolioValue: 500_000 },
        baseline: { monthlyDisposableIncomeBeforeHousing: 35_000, monthlyNonHousingExpenses: 20_000 },
        modules,
    };
}

describe('Month Utilities', () => {
    it('lists correct number of months', () => {
        const months = listMonths('2026-01', 12);
        assert.equal(months.length, 12);
        assert.equal(months[0], '2026-01');
        assert.equal(months[11], '2026-12');
    });

    it('adds months correctly', () => {
        assert.equal(addMonths('2026-01', 1), '2026-02');
        assert.equal(addMonths('2026-12', 1), '2027-01');
        assert.equal(addMonths('2026-06', 6), '2026-12');
    });
});

describe('Amortization Schedule', () => {
    it('builds schedule with correct length', () => {
        const schedule = buildAmortizationSchedule({
            startMonth: '2026-01',
            months: 12,
            principal: 100_000,
            nominalAnnualRate: 0.06,
            termMonths: 120, // 10 years
        });
        assert.equal(schedule.length, 12);
    });

    it('reduces balance over time', () => {
        const schedule = buildAmortizationSchedule({
            startMonth: '2026-01',
            months: 12,
            principal: 100_000,
            nominalAnnualRate: 0.06,
            termMonths: 120,
        });
        assert.ok(schedule[11].closingBalance < schedule[0].openingBalance);
    });

    it('interest plus principal equals payment', () => {
        const schedule = buildAmortizationSchedule({
            startMonth: '2026-01',
            months: 3,
            principal: 100_000,
            nominalAnnualRate: 0.06,
            termMonths: 120,
        });
        for (const row of schedule) {
            const sum = row.interest + row.principal;
            assert.ok(Math.abs(sum - row.payment) < 0.01, `Interest + principal should equal payment`);
        }
    });
});

describe('Projection Without Housing', () => {
    beforeEach(() => {
        resetProjectionAuditCounter();
    });

    it('produces correct number of series points', () => {
        const result = runProjection(createBaseInput());
        assert.equal(result.series.length, 24);
    });

    it('has zero home value without housing module', () => {
        const result = runProjection(createBaseInput());
        for (const point of result.series) {
            assert.equal(point.balanceSheet.homeValue, 0);
            assert.equal(point.balanceSheet.mortgageBalance, 0);
            assert.equal(point.balanceSheet.bankLoanBalance, 0);
        }
    });

    it('accumulates cash from savings', () => {
        const result = runProjection(createBaseInput());
        const first = result.series[0];
        const last = result.series[result.series.length - 1];

        // Monthly savings = 35000 - 20000 = 15000
        // After 24 months: 200000 + 24*15000 = 560000
        assert.ok(last.balanceSheet.cash > first.balanceSheet.cash);
        assert.equal(last.balanceSheet.cash, 200_000 + 24 * 15_000);
    });
});

describe('Projection With Housing', () => {
    beforeEach(() => {
        resetProjectionAuditCounter();
    });

    it('sets home value on close month', () => {
        const module = createHousingPurchaseModule({ input: createHousingInput(), rules: testRules });
        const result = runProjection(createBaseInput([module]));

        const closeMonth = result.series.find(s => s.month === '2026-04');
        assert.ok(closeMonth, 'Close month should exist');
        assert.equal(closeMonth!.balanceSheet.homeValue, 3_000_000);
    });

    it('reduces cash by down payment plus upfront costs on close month', () => {
        const module = createHousingPurchaseModule({ input: createHousingInput(), rules: testRules });
        const result = runProjection(createBaseInput([module]));

        const closeMonth = result.series.find(s => s.month === '2026-04');
        assert.ok(closeMonth, 'Close month should exist');
        assert.ok(closeMonth!.cashFlow.upfrontHousingCashOut > 300_000); // Down payment + fees
    });

    it('mortgage balance decreases after close month', () => {
        const module = createHousingPurchaseModule({ input: createHousingInput(), rules: testRules });
        const result = runProjection(createBaseInput([module]));

        const april = result.series.find(s => s.month === '2026-04');
        const may = result.series.find(s => s.month === '2026-05');

        assert.ok(april && may, 'Both months should exist');
        assert.ok(may!.balanceSheet.mortgageBalance < april!.balanceSheet.mortgageBalance,
            'Mortgage should decrease after payment');
    });

    it('has audits on close month', () => {
        const module = createHousingPurchaseModule({ input: createHousingInput(), rules: testRules });
        const result = runProjection(createBaseInput([module]));

        const closeMonth = result.series.find(s => s.month === '2026-04');
        assert.ok(closeMonth, 'Close month should exist');
        assert.ok(closeMonth!.audits.length >= 3, `Expected >= 3 audits, got ${closeMonth!.audits.length}`);
    });

    it('housing expenses affect P&L after close', () => {
        const module = createHousingPurchaseModule({ input: createHousingInput(), rules: testRules });
        const result = runProjection(createBaseInput([module]));

        const may = result.series.find(s => s.month === '2026-05');
        assert.ok(may, 'May should exist');
        assert.ok(may!.pnl.housingInterest > 0, 'Housing interest should be positive');
        assert.ok(may!.pnl.housingContribution > 0, 'Housing contribution should be positive');
        assert.equal(
            may!.pnl.housingRunningCosts,
            9525,
            'Running costs should include operations + property tax + maintenance'
        );
    });
});

describe('Net Worth Consistency', () => {
    beforeEach(() => {
        resetProjectionAuditCounter();
    });

    it('net worth equals assets minus liabilities', () => {
        const module = createHousingPurchaseModule({ input: createHousingInput(), rules: testRules });
        const result = runProjection(createBaseInput([module]));

        for (const point of result.series) {
            const bs = point.balanceSheet;
            const expected = bs.cash + bs.portfolioValue + bs.homeValue - bs.mortgageBalance - bs.bankLoanBalance;
            assert.ok(Math.abs(bs.netWorth - expected) < 0.01,
                `Net worth should equal assets - liabilities at ${point.month}`);
        }
    });
});
