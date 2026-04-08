/**
 * Projection Engine
 * 
 * Runs monthly financial projections with scenario modules.
 */

import {
    ProjectionInput,
    ProjectionResult,
    ProjectionSeriesPoint,
    PnLData,
    CashFlowData,
    BalanceSheetData,
    Audit,
    MonthKey,
} from './types';
import { listMonths } from './months';
import { round2 } from './math';
import { calculateTax, TaxInput } from '../lib/tax/taxEngine';

/**
 * Run a monthly projection with optional scenario modules.
 */
export function runProjection(input: ProjectionInput): ProjectionResult {
    const { horizon, startingBalanceSheet, baseline, modules } = input;

    const months = listMonths(horizon.startMonth, horizon.months);
    const warnings: string[] = [];
    const series: ProjectionSeriesPoint[] = [];

    // ============================================================
    // APPLY ALL MODULES
    // ============================================================

    const moduleDeltas: Array<{ key: string; perMonth: Record<MonthKey, any>; warnings?: string[] }> = [];

    for (const mod of modules) {
        const result = mod.apply({
            months,
            base: baseline,
        });
        moduleDeltas.push({ key: mod.key, perMonth: result.perMonth, warnings: result.warnings });
        if (result.warnings) {
            warnings.push(...result.warnings);
        }
    }

    // ============================================================
    // INITIALIZE STATE
    // ============================================================

    let cash = startingBalanceSheet.cash;
    let portfolioValue = startingBalanceSheet.portfolioValue;
    const otherAssets = startingBalanceSheet.otherAssets ?? 0;
    let otherLiabilities = startingBalanceSheet.otherLiabilities ?? 0;

    // Balance sheet items that modules can modify
    let homeValue = 0;
    let mortgageBalance = 0;
    let bankLoanBalance = 0;

    // ============================================================
    // PROCESS EACH MONTH
    // ============================================================

    const currentYear = parseInt(horizon.startMonth.split('-')[0]);

    for (const month of months) {
        const monthYear = parseInt(month.split('-')[0]);

        // Initialize P&L for this month (baseline)
        const pnl: PnLData = {
            income: baseline.monthlyDisposableIncomeBeforeHousing,
            salary: baseline.monthlyDisposableIncomeBeforeHousing, // Base salary
            bonus: 0,
            expensesNonHousing: baseline.monthlyNonHousingExpenses,
            housingInterest: 0,
            housingContribution: 0,
            housingRunningCosts: 0,
            debtInterest: 0,
            investmentIncome: 0,
            tax: 0,
            totalExpenses: 0,
            net: 0,
        };

        let incomeDelta = 0;
        let salaryDelta = 0;
        let bonusDelta = 0;

        // Initialize cash flow for this month
        const cashFlow: CashFlowData = {
            netCashFlow: baseline.monthlyDisposableIncomeBeforeHousing - baseline.monthlyNonHousingExpenses,
            upfrontHousingCashOut: 0,
            principalRepayment: 0,
            debtPrincipalRepayment: 0,
            investmentContribution: 0,
        };

        // Collect audits for this month
        const audits: Audit[] = [];

        // MERGE MODULE DELTAS
        for (const mod of moduleDeltas) {
            const deltas = mod.perMonth[month];
            if (!deltas) continue;

            if (deltas.pnl) {
                incomeDelta += deltas.pnl.income ?? 0;
                salaryDelta += deltas.pnl.salary ?? 0;
                bonusDelta += deltas.pnl.bonus ?? 0;
                pnl.housingInterest += deltas.pnl.housingInterest ?? 0;
                pnl.housingContribution += deltas.pnl.housingContribution ?? 0;
                pnl.housingRunningCosts += deltas.pnl.housingRunningCosts ?? 0;
                pnl.debtInterest += deltas.pnl.debtInterest ?? 0;
                pnl.investmentIncome += deltas.pnl.investmentIncome ?? 0;
            }

            // Merge cash flow deltas
            if (deltas.cashFlow) {
                // netCashFlow adjustment? NO, usually modules specify explicit flows
                // We shouldn't double count if we add specific lines
                cashFlow.upfrontHousingCashOut += deltas.cashFlow.upfrontHousingCashOut ?? 0;
                cashFlow.principalRepayment += deltas.cashFlow.principalRepayment ?? 0;
                cashFlow.debtPrincipalRepayment += deltas.cashFlow.debtPrincipalRepayment ?? 0;
                cashFlow.investmentContribution += deltas.cashFlow.investmentContribution ?? 0;
                // Add investment income to cash flow?
                if (deltas.pnl?.investmentIncome) {
                    // Assume dividends are paid out to cash -> reinvested or kept?
                    // If portfolio module handles reinvestment, it might not be cash flow.
                    // Let's assume it IS cash flow inflow.
                    cashFlow.netCashFlow += deltas.pnl.investmentIncome;
                }
            }

            // Merge balance sheet updates
            if (deltas.balanceSheet) {
                if (deltas.balanceSheet.homeValue !== undefined) homeValue = deltas.balanceSheet.homeValue;
                if (deltas.balanceSheet.mortgageBalance !== undefined) mortgageBalance = deltas.balanceSheet.mortgageBalance;
                if (deltas.balanceSheet.bankLoanBalance !== undefined) bankLoanBalance = deltas.balanceSheet.bankLoanBalance;
                if (deltas.balanceSheet.portfolioValue !== undefined) portfolioValue = deltas.balanceSheet.portfolioValue;
                // Accumulate other liabilities? Or set?
                // Debt module sets it.
                if (deltas.balanceSheet.otherLiabilities !== undefined) otherLiabilities = deltas.balanceSheet.otherLiabilities;
            }

            // Collect audits
            if (deltas.audits) {
                audits.push(...deltas.audits);
            }
        }

        // ============================================================
        // TAX CALCULATION (Simplified Integration)
        // ============================================================

        // We only calculate tax on Investment Income for now, assuming Salary is already Net.
        // In future: convert to Gross Salary input.

        // Equity Tax?
        // If we have realized gains (not yet tracking) or dividends (investmentIncome).
        // Let's assume investmentIncome is taxable.

        const taxInput: TaxInput = {
            taxYear: monthYear,
            municipality: { rate: 0.2506, churchRate: 0 }, // Copenhagen default for now
            investments: {
                // Only tax if positive
                equityIncome: pnl.investmentIncome > 0 ? {
                    dividends: pnl.investmentIncome,
                    realizedGains: 0,
                } : undefined
            },
            isMarried: false
        };
        pnl.income += incomeDelta;
        pnl.salary += salaryDelta;
        pnl.bonus += bonusDelta;

        // Ensure salary reflected at least baseline if no delta provided
        if (salaryDelta === 0 && pnl.salary === 0) {
            pnl.salary = pnl.income - pnl.bonus;
        }

        // Calculate tax only if there is income
        if (pnl.investmentIncome > 0) {
            const taxRes = calculateTax(taxInput);
            const monthlyTax = round2(taxRes.totals.totalTax);

            pnl.tax = monthlyTax;

            // Add tax audit
            if (taxRes.summaryAudit) {
                audits.push({
                    title: `Tax: ${month}`,
                    description: `Tax on ${pnl.investmentIncome} investment income`,
                    details: taxRes.summaryAudit
                });
            }
        }

        // APPLY BASELINE GROWTH & BONUSES
        let currentSalary = baseline.monthlyDisposableIncomeBeforeHousing;
        const monthIndex = months.indexOf(month);
        const yearsPassed = Math.floor(monthIndex / 12);

        if (yearsPassed > 0 && baseline.annualIncomeIncreasePercent) {
            currentSalary = currentSalary * Math.pow(1 + baseline.annualIncomeIncreasePercent, yearsPassed);
        }

        pnl.income = round2(currentSalary + incomeDelta);

        pnl.totalExpenses = round2(
            pnl.expensesNonHousing +
            pnl.housingInterest +
            pnl.housingContribution +
            pnl.housingRunningCosts +
            pnl.debtInterest +
            pnl.tax
        );

        // Net Income = (Salary + Investment Income) - Expenses
        pnl.net = round2((pnl.income + pnl.investmentIncome) - pnl.totalExpenses);

        // Dynamic Investment: If net > 0 and user wants to save surplus?
        // Using investmentContribution from CashFlow means we treat it as an expense/outflow from cash.
        // But if we want to model "Save X% of Net", we need to compute it here.
        // For now, let's keep explicit contribution from input, but add a note or logic later.


        // ============================================================
        // UPDATE CASH
        // ============================================================

        // Cash Start 
        // + Net P&L (Income - Expenses) -> This is "Savings" capacity
        // - Principal Repayments (Appears in CashFlow, not P&L expense)
        // - Investments Contributions (Appears in CashFlow, not P&L expense)
        // - Upfront Costs

        const cashChange =
            pnl.net
            - cashFlow.principalRepayment
            - cashFlow.debtPrincipalRepayment
            - cashFlow.investmentContribution
            - cashFlow.upfrontHousingCashOut;

        cash = round2(cash + cashChange);

        // ============================================================
        // COMPUTE NET WORTH
        // ============================================================

        const netWorth = round2(
            cash +
            portfolioValue +
            homeValue +
            otherAssets -
            mortgageBalance -
            bankLoanBalance -
            otherLiabilities
        );

        // ============================================================
        // BUILD SERIES POINT
        // ============================================================

        const balanceSheet: BalanceSheetData = {
            cash: round2(cash),
            portfolioValue: round2(portfolioValue),
            homeValue: round2(homeValue),
            mortgageBalance: round2(mortgageBalance),
            bankLoanBalance: round2(bankLoanBalance),
            otherLiabilities: round2(otherLiabilities),
            otherAssets: round2(otherAssets),
            netWorth,
        };

        series.push({
            month,
            pnl: {
                income: round2(pnl.income),
                salary: round2(pnl.salary),
                bonus: round2(pnl.bonus),
                expensesNonHousing: round2(pnl.expensesNonHousing),
                housingInterest: round2(pnl.housingInterest),
                housingContribution: round2(pnl.housingContribution),
                housingRunningCosts: round2(pnl.housingRunningCosts),
                debtInterest: round2(pnl.debtInterest),
                investmentIncome: round2(pnl.investmentIncome),
                tax: round2(pnl.tax),
                totalExpenses: round2(pnl.totalExpenses),
                net: round2(pnl.net),
            },
            cashFlow: {
                netCashFlow: round2(cashChange),
                upfrontHousingCashOut: round2(cashFlow.upfrontHousingCashOut),
                principalRepayment: round2(cashFlow.principalRepayment),
                debtPrincipalRepayment: round2(cashFlow.debtPrincipalRepayment),
                investmentContribution: round2(cashFlow.investmentContribution),
            },
            balanceSheet,
            audits,
        });
    }

    return { series, warnings };
}
