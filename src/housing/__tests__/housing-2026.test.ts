/**
 * Housing Simulation Tests (Node 20 built-in test runner)
 * 
 * Run with: npm run housing:test
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { HousingPurchaseInput, HousingRules, simulateHomePurchase } from '../../housing';
import { loadHousingRules, clearRulesCache } from '../rules.server';
import { annuityPaymentMonthly, round2, roundNearest100 } from '../math';
import { resetAuditCounter } from '../audit';

// Test rules fixture
const testRules: HousingRules = {
    year: 2026,
    minDownPaymentPct: 0.05,
    mortgageLtvMax: 0.80,
    deedRegistration: {
        fixedFee: 1850,
        rateOfPrice: 0.006,
        rounding: 'NEAREST_100',
    },
    pledgeRegistration: {
        fixedFee: 1850,
        rateOfPrincipal: 0.014,
        rounding: 'NEAREST_100',
    },
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

// Standard test input
function createTestInput(overrides?: Partial<HousingPurchaseInput>): HousingPurchaseInput {
    return {
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
            scenarioId: 'test',
        },
        ...overrides,
    };
}

describe('Math Utilities', () => {
    it('calculates annuity payment correctly', () => {
        // 1,000,000 DKK at 4% for 30 years
        const payment = annuityPaymentMonthly(1_000_000, 0.04, 30);
        // Expected ~4,774 DKK/month
        assert.ok(payment > 4700 && payment < 4850, `Payment ${payment} should be ~4774`);
    });

    it('handles 0% interest', () => {
        const payment = annuityPaymentMonthly(120_000, 0, 10);
        assert.equal(payment, 1000); // 120,000 / 120 months
    });

    it('rounds to nearest 100', () => {
        assert.equal(roundNearest100(1849), 1800);
        assert.equal(roundNearest100(1850), 1900);
        assert.equal(roundNearest100(1851), 1900);
    });

    it('rounds to 2 decimal places', () => {
        assert.equal(round2(123.456), 123.46);
        assert.equal(round2(123.454), 123.45);
    });
});

describe('Loan Split Derivation', () => {
    beforeEach(() => {
        resetAuditCounter();
    });

    it('derives mortgage and bank principals correctly', () => {
        const input = createTestInput();
        const result = simulateHomePurchase(input, testRules);

        // Price 3M, down 300K (10%) -> funding gap 2.7M
        // Max mortgage 80% of 3M = 2.4M
        // Mortgage principal = min(2.7M, 2.4M) = 2.4M
        // Bank principal = 2.7M - 2.4M = 300K

        assert.equal(result.derived.mortgagePrincipal, 2_400_000);
        assert.equal(result.derived.bankPrincipal, 300_000);
    });

    it('handles exact 80% LTV (no bank loan needed)', () => {
        const input = createTestInput({
            purchase: {
                price: 3_000_000,
                downPaymentCash: 600_000, // Exactly 20%
                closeDate: '2026-04-15',
            },
        });
        const result = simulateHomePurchase(input, testRules);

        assert.equal(result.derived.mortgagePrincipal, 2_400_000);
        assert.equal(result.derived.bankPrincipal, 0);
    });

    it('warns when down payment is below minimum', () => {
        const input = createTestInput({
            purchase: {
                price: 3_000_000,
                downPaymentCash: 100_000, // Only 3.3%, below 5% minimum
                closeDate: '2026-04-15',
            },
        });
        const result = simulateHomePurchase(input, testRules);

        assert.ok(result.warnings.some(w => w.includes('below minimum')));
    });
});

describe('Registration Fees', () => {
    beforeEach(() => {
        resetAuditCounter();
    });

    it('calculates deed fee with rounding', () => {
        const input = createTestInput();
        const result = simulateHomePurchase(input, testRules);

        // Deed fee: 1850 + 0.006 * 3,000,000 = 1850 + 18000 = 19850
        // Rounded to nearest 100 = 19900
        assert.equal(result.derived.deedFee, 19900);
    });

    it('calculates mortgage pledge fee with rounding', () => {
        const input = createTestInput();
        const result = simulateHomePurchase(input, testRules);

        // Pledge fee: 1850 + 0.014 * 2,400,000 = 1850 + 33600 = 35450
        // Rounded to nearest 100 = 35500
        assert.equal(result.derived.mortgagePledgeFee, 35500);
    });
});

describe('Monthly Costs', () => {
    beforeEach(() => {
        resetAuditCounter();
    });

    it('calculates total monthly housing cost including taxes and maintenance', () => {
        const input = createTestInput();
        const result = simulateHomePurchase(input, testRules);

        // Price 3M. 
        // Prop Tax: (3M * 0.0051 / 12) + (3M * 0.007 / 12) = 1275 + 1750 = 3025
        // Maintenance: 3M * 0.01 / 12 = 2500

        assert.equal(result.monthly.propertyTax, 3025);
        assert.equal(result.monthly.maintenanceProvision, 2500);
        assert.ok(result.monthly.mortgagePayment > 0);
        assert.ok(result.monthly.mortgageContribution > 0);
        assert.ok(result.monthly.bankPayment > 0);
        assert.equal(result.monthly.housingRunningCosts, 4000);

        const expected = result.monthly.mortgagePayment +
            result.monthly.mortgageContribution +
            result.monthly.bankPayment +
            result.monthly.propertyTax +
            result.monthly.maintenanceProvision +
            result.monthly.housingRunningCosts;

        assert.equal(result.monthly.totalHousingCostPerMonth, expected);
    });

    it('calculates tiered bidragssats correctly', () => {
        const input = createTestInput({
            financing: {
                mortgage: {
                    enabled: true,
                    termYears: 30,
                    amortizationProfile: 'FULL',
                    bondRateNominalAnnual: 0.04,
                    paymentsPerYear: 12,
                    loanType: 'FAST'
                },
                bankLoan: { enabled: false, rateNominalAnnual: 0, termYears: 0, paymentsPerYear: 12 }
            }
        });
        const result = simulateHomePurchase(input, testRules);

        // Principal 2.4M (80% LTV of 3M)
        // Tranche 1 (0-1.2M): 1.2M * 0.0050 / 12 = 500
        // Tranche 2 (1.2-1.8M): 0.6M * 0.0085 / 12 = 425
        // Tranche 3 (1.8-2.4M): 0.6M * 0.0125 / 12 = 625
        // Total = 1550

        assert.equal(result.monthly.mortgageContribution, 1550);
    });
});

describe('Audit Trail', () => {
    beforeEach(() => {
        resetAuditCounter();
    });

    it('produces at least 7 audit objects', () => {
        const input = createTestInput();
        const result = simulateHomePurchase(input, testRules);

        assert.ok(result.audits.length >= 7, `Expected >= 7 audits, got ${result.audits.length}`);
    });

    it('each audit has required fields', () => {
        const input = createTestInput();
        const result = simulateHomePurchase(input, testRules);

        for (const audit of result.audits) {
            assert.ok(audit.auditId, 'Audit must have auditId');
            assert.ok(audit.title, 'Audit must have title');
            assert.ok(Array.isArray(audit.inputs), 'Audit must have inputs array');
            assert.ok(Array.isArray(audit.steps), 'Audit must have steps array');
            assert.ok(Array.isArray(audit.outputs), 'Audit must have outputs array');
        }
    });
});

describe('Balance Impact', () => {
    beforeEach(() => {
        resetAuditCounter();
    });

    it('calculates initial equity correctly', () => {
        const input = createTestInput();
        const result = simulateHomePurchase(input, testRules);

        assert.equal(result.balanceImpact.assetHomeValueInitial, 3_000_000);
        assert.equal(result.balanceImpact.liabilitiesInitial, 2_700_000); // 2.4M + 300K
        assert.equal(result.balanceImpact.equityInitial, 300_000);
    });
});
