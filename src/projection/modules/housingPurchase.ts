/**
 * Housing Purchase Scenario Module
 * 
 * Integrates housing simulation into projection engine.
 */

import {
    ScenarioModule,
    ModuleContext,
    ModuleResult,
    MonthKey,
    MonthDeltas
} from './types';
import {
    HousingPurchaseInput,
    HousingRules,
} from '../../housing/types';
import { simulateHomePurchase } from '../../housing/engine';
import {
    buildAmortizationSchedule,
    AmortizationRow,
    round2
} from '../math';
import { toMonthKey, isOnOrAfter, monthDiff } from '../months';
import { makeProjectionAudit, dkkInput, stepCalc, stepOutput } from '../audit';
import { Audit } from '../types';

/**
 * Create a housing purchase scenario module.
 */
export function createHousingPurchaseModule(params: {
    input: HousingPurchaseInput;
    rules: HousingRules;
}): ScenarioModule {
    const { input, rules } = params;

    return {
        key: 'housing_purchase',

        apply(ctx: ModuleContext): ModuleResult {
            const perMonth: Record<MonthKey, MonthDeltas> = {};
            const warnings: string[] = [];

            // Run housing simulation
            const housingResult = simulateHomePurchase(input, rules);
            warnings.push(...housingResult.warnings);

            // Determine close month
            const closeDate = new Date(input.purchase.closeDate);
            const closeMonth = toMonthKey(closeDate);

            // Check if close month is within projection range
            if (!ctx.months.includes(closeMonth)) {
                // Find first month on or after close
                const firstActive = ctx.months.find(m => isOnOrAfter(m, closeMonth));
                if (!firstActive) {
                    warnings.push(`Housing close date ${closeMonth} is after projection range`);
                    return { perMonth, warnings };
                }
            }

            // Build amortization schedules
            let mortgageRate = input.financing.mortgage.bondRateNominalAnnual;
            if (Math.abs(mortgageRate) > 1) mortgageRate /= 100;

            let bankRate = input.financing.bankLoan.rateNominalAnnual;
            if (Math.abs(bankRate) > 1) bankRate /= 100;

            const mortgageSchedule = buildAmortizationSchedule({
                startMonth: closeMonth,
                months: input.financing.mortgage.termYears * 12,
                principal: housingResult.derived.mortgagePrincipal,
                nominalAnnualRate: mortgageRate,
                termMonths: input.financing.mortgage.termYears * 12,
            });

            const bankSchedule = buildAmortizationSchedule({
                startMonth: closeMonth,
                months: input.financing.bankLoan.termYears * 12,
                principal: housingResult.derived.bankPrincipal,
                nominalAnnualRate: bankRate,
                termMonths: input.financing.bankLoan.termYears * 12,
            });

            // Create lookup maps
            const mortgageByMonth = new Map<MonthKey, AmortizationRow>();
            mortgageSchedule.forEach(r => mortgageByMonth.set(r.month, r));

            const bankByMonth = new Map<MonthKey, AmortizationRow>();
            bankSchedule.forEach(r => bankByMonth.set(r.month, r));

            // Upfront costs
            const upfrontCashOut = input.purchase.downPaymentCash + housingResult.derived.totalUpfrontCosts;

            // Monthly contribution
            const monthlyContribution = housingResult.monthly.mortgageContribution;
            const monthlyRunningCosts = housingResult.monthly.housingRunningCosts;
            const monthlyPropertyTax = housingResult.monthly.propertyTax;
            const monthlyMaintenanceProvision = housingResult.monthly.maintenanceProvision;
            const monthlyTotalRunningCosts = monthlyRunningCosts + monthlyPropertyTax + monthlyMaintenanceProvision;

            // Process each month
            for (const month of ctx.months) {
                // Skip months before close
                if (!isOnOrAfter(month, closeMonth)) {
                    continue;
                }

                const isCloseMonth = month === closeMonth;
                const monthsSinceClose = monthDiff(closeMonth, month);

                const deltas: MonthDeltas = {
                    pnl: {},
                    cashFlow: {},
                    balanceSheet: {},
                    audits: [],
                };

                // Get amortization rows for this month
                const mortgageRow = mortgageByMonth.get(month);
                const bankRow = bankByMonth.get(month);

                // ============================================================
                // CLOSE MONTH: Upfront costs
                // ============================================================

                if (isCloseMonth) {
                    deltas.cashFlow!.upfrontHousingCashOut = upfrontCashOut;
                    deltas.balanceSheet!.homeValue = input.purchase.price;
                    deltas.balanceSheet!.mortgageBalance = housingResult.derived.mortgagePrincipal;
                    deltas.balanceSheet!.bankLoanBalance = housingResult.derived.bankPrincipal;

                    // Upfront audit
                    deltas.audits!.push(makeProjectionAudit({
                        title: 'Housing Purchase - Upfront Cash Outflow',
                        month,
                        context: { scenarioId: input.scenarioMeta?.scenarioId || 'housing_purchase' },
                        inputs: [
                            dkkInput('Down payment', input.purchase.downPaymentCash, 'input'),
                            dkkInput('Deed fee', housingResult.derived.deedFee, 'derived'),
                            dkkInput('Mortgage pledge fee', housingResult.derived.mortgagePledgeFee, 'derived'),
                            dkkInput('Bank pledge fee', housingResult.derived.bankPledgeFee, 'derived'),
                            dkkInput('Other upfront costs',
                                housingResult.derived.totalUpfrontCosts -
                                housingResult.derived.deedFee -
                                housingResult.derived.mortgagePledgeFee -
                                housingResult.derived.bankPledgeFee,
                                'derived'),
                        ],
                        steps: [
                            stepCalc('Total upfront costs',
                                'deed + pledge fees + defaults',
                                housingResult.derived.totalUpfrontCosts),
                            stepCalc('Total cash out',
                                'down payment + upfront costs',
                                upfrontCashOut),
                        ],
                        outputs: [
                            stepOutput('Cash outflow', upfrontCashOut),
                        ],
                    }));
                }

                // ============================================================
                // MONTHLY: Mortgage
                // ============================================================

                let mortgageInterest = 0;
                let mortgagePrincipalPayment = 0;
                let mortgagePayment = 0;

                if (mortgageRow) {
                    mortgageInterest = mortgageRow.interest;
                    mortgagePrincipalPayment = mortgageRow.principal;
                    mortgagePayment = mortgageRow.payment;

                    deltas.pnl!.housingInterest = (deltas.pnl!.housingInterest ?? 0) + mortgageInterest;
                    deltas.cashFlow!.principalRepayment = (deltas.cashFlow!.principalRepayment ?? 0) + mortgagePrincipalPayment;
                    deltas.balanceSheet!.mortgageBalance = mortgageRow.closingBalance;

                    // Audit only for first month (pattern repeats)
                    if (isCloseMonth || monthsSinceClose === 1) {
                        deltas.audits!.push(makeProjectionAudit({
                            title: 'Mortgage Payment Split',
                            month,
                            inputs: [
                                dkkInput('Opening balance', mortgageRow.openingBalance, 'schedule'),
                                { label: 'Monthly rate', value: `${(input.financing.mortgage.bondRateNominalAnnual / 12 * 100).toFixed(4)}%`, unit: '%' },
                            ],
                            steps: [
                                stepCalc('Interest', 'balance × monthly_rate', mortgageInterest),
                                stepCalc('Principal', 'payment - interest', mortgagePrincipalPayment),
                            ],
                            outputs: [
                                stepOutput('Total payment', mortgagePayment),
                                stepOutput('Closing balance', mortgageRow.closingBalance),
                            ],
                            notes: monthsSinceClose === 1
                                ? ['This pattern repeats monthly until loan is paid off']
                                : [],
                        }));
                    }
                } else if (isOnOrAfter(month, closeMonth)) {
                    // Loan paid off
                    deltas.balanceSheet!.mortgageBalance = 0;
                }

                // ============================================================
                // MONTHLY: Contribution (Bidragssats)
                // ============================================================

                const mortgageBalance = mortgageRow?.closingBalance ??
                    (mortgageByMonth.get(ctx.months[ctx.months.indexOf(month) - 1])?.closingBalance ?? 0);

                if (mortgageBalance > 0 || isCloseMonth) {
                    deltas.pnl!.housingContribution = monthlyContribution;

                    if (isCloseMonth) {
                        deltas.audits!.push(makeProjectionAudit({
                            title: 'Mortgage Monthly Contribution (Bidragssats)',
                            month,
                            inputs: [
                                dkkInput('Mortgage principal', housingResult.derived.mortgagePrincipal, 'derived'),
                                { label: 'Annual rate', value: `${((input.financing.mortgage.contributionRateAnnual ?? 0) * 100).toFixed(2)}%`, unit: '%' },
                            ],
                            steps: [
                                stepCalc('Monthly contribution', 'principal × rate / 12', monthlyContribution),
                            ],
                            outputs: [
                                stepOutput('Monthly contribution', monthlyContribution),
                            ],
                            notes: ['Simplified: calculated on original principal (decreases with amortization in practice)'],
                        }));
                    }
                }

                // ============================================================
                // MONTHLY: Bank Loan
                // ============================================================

                let bankInterest = 0;
                let bankPrincipalPayment = 0;
                let bankPayment = 0;

                if (bankRow) {
                    bankInterest = bankRow.interest;
                    bankPrincipalPayment = bankRow.principal;
                    bankPayment = bankRow.payment;

                    deltas.pnl!.housingInterest = (deltas.pnl!.housingInterest ?? 0) + bankInterest;
                    deltas.cashFlow!.principalRepayment = (deltas.cashFlow!.principalRepayment ?? 0) + bankPrincipalPayment;
                    deltas.balanceSheet!.bankLoanBalance = bankRow.closingBalance;

                    if (isCloseMonth) {
                        deltas.audits!.push(makeProjectionAudit({
                            title: 'Bank Loan Payment Split',
                            month,
                            inputs: [
                                dkkInput('Opening balance', bankRow.openingBalance, 'schedule'),
                                { label: 'Monthly rate', value: `${(input.financing.bankLoan.rateNominalAnnual / 12 * 100).toFixed(4)}%`, unit: '%' },
                            ],
                            steps: [
                                stepCalc('Interest', 'balance × monthly_rate', bankInterest),
                                stepCalc('Principal', 'payment - interest', bankPrincipalPayment),
                            ],
                            outputs: [
                                stepOutput('Total payment', bankPayment),
                                stepOutput('Closing balance', bankRow.closingBalance),
                            ],
                        }));
                    }
                } else if (isOnOrAfter(month, closeMonth)) {
                    deltas.balanceSheet!.bankLoanBalance = 0;
                }

                // ============================================================
                // MONTHLY: Running Costs
                // ============================================================

                deltas.pnl!.housingRunningCosts = monthlyTotalRunningCosts;

                if (isCloseMonth) {
                    deltas.audits!.push(makeProjectionAudit({
                        title: 'Monthly Ownership Cost Breakdown',
                        month,
                        inputs: [
                            dkkInput('Property tax', monthlyPropertyTax, 'derived'),
                            dkkInput('Maintenance provision', monthlyMaintenanceProvision, 'derived'),
                            dkkInput('Utilities / insurance / association', monthlyRunningCosts, 'derived'),
                        ],
                        steps: [
                            stepCalc('Monthly running costs', 'property tax + maintenance + operating', monthlyTotalRunningCosts),
                        ],
                        outputs: [
                            stepOutput('Housing running costs (P&L)', monthlyTotalRunningCosts),
                        ],
                    }));
                }

                // ============================================================
                // MONTHLY: Net Cash Flow Impact
                // ============================================================

                // Total monthly outflow = payments + contribution + running costs
                const totalMonthlyOutflow = mortgagePayment + monthlyContribution + bankPayment + monthlyTotalRunningCosts;
                deltas.cashFlow!.netCashFlow = -totalMonthlyOutflow;

                // ============================================================
                // Set home value for subsequent months
                // ============================================================

                if (!isCloseMonth) {
                    deltas.balanceSheet!.homeValue = input.purchase.price; // MVP: constant
                }

                perMonth[month] = deltas;
            }

            return { perMonth, warnings };
        },
    };
}
