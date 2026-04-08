/**
 * Housing Simulation Engine
 * 
 * Pure, deterministic simulation of home purchase financials.
 * No IO, no DB - just calculations with audit trail.
 */

import {
    HousingPurchaseInput,
    HousingRules,
    HousingPurchaseOutput,
    Audit
} from './types';
import { annuityPaymentMonthly, applyRounding, round2 } from './math';
import { makeAudit, amountInput, rateInput, calcStep, output } from './audit';

/**
 * Simulate a home purchase and return financial projections.
 */
export function simulateHomePurchase(
    input: HousingPurchaseInput,
    rules: HousingRules
): HousingPurchaseOutput {
    const audits: Audit[] = [];
    const warnings: string[] = [];
    const assumptions: string[] = [];

    const {
        purchase = { price: 0, downPaymentCash: 0 },
        financing = { mortgage: { enabled: false }, bankLoan: { enabled: false } },
        transactionCosts = { includeDefaultCosts: true, customCosts: [] },
        budgetIntegration = { monthlyDisposableIncomeBeforeHousing: 0, monthlyHousingRunningCosts: 0 },
        scenarioMeta = { scenarioId: 'default' }
    } = input;

    // Ensure scenarioMeta has scenarioId for audit logging
    const scenarioId = scenarioMeta?.scenarioId || 'default';

    // Ensure nested objects exist to prevent "Cannot read property of undefined"
    const mortgage = financing.mortgage || { enabled: false };
    const bankLoan = financing.bankLoan || { enabled: false };
    const price = purchase.price || 0;
    const downPaymentCash = purchase.downPaymentCash || 0;

    // ============================================================
    // 1. LOAN SPLIT DERIVATION
    // ============================================================

    const minDownPaymentRequired = price * rules.minDownPaymentPct;
    const maxMortgage = price * rules.mortgageLtvMax;
    const equity = downPaymentCash;
    const fundingGap = price - equity;

    // Derive mortgage principal
    let mortgagePrincipal: number;
    if ((mortgage as any).principal !== undefined) {
        mortgagePrincipal = (mortgage as any).principal;
    } else if (mortgage.enabled) {
        mortgagePrincipal = Math.min(fundingGap, maxMortgage);
    } else {
        mortgagePrincipal = 0;
    }

    // Derive bank principal
    let bankPrincipal: number;
    if ((bankLoan as any).principal !== undefined) {
        bankPrincipal = (bankLoan as any).principal;
    } else if (bankLoan.enabled) {
        bankPrincipal = Math.max(0, fundingGap - mortgagePrincipal);
    } else {
        bankPrincipal = 0;
    }

    // Warnings
    if (downPaymentCash < minDownPaymentRequired) {
        warnings.push(`Down payment ${downPaymentCash} DKK is below minimum required ${round2(minDownPaymentRequired)} DKK (${rules.minDownPaymentPct * 100}%)`);
    }
    if (mortgagePrincipal > maxMortgage) {
        warnings.push(`Mortgage principal ${mortgagePrincipal} DKK exceeds max LTV ${round2(maxMortgage)} DKK (${rules.mortgageLtvMax * 100}%)`);
    }

    // Loan split audit
    audits.push(makeAudit({
        title: 'Loan Split Calculation',
        context: { scenarioId, year: input.year },
        inputs: [
            amountInput('Purchase price', price, 'input'),
            amountInput('Down payment', downPaymentCash, 'input'),
            rateInput('Min down payment %', rules.minDownPaymentPct, 'rules'),
            rateInput('Max LTV %', rules.mortgageLtvMax, 'rules'),
        ],
        steps: [
            calcStep('Min down payment required', `${price} × ${rules.minDownPaymentPct}`, round2(minDownPaymentRequired)),
            calcStep('Max mortgage allowed', `${price} × ${rules.mortgageLtvMax}`, round2(maxMortgage)),
            calcStep('Equity (down payment)', `${downPaymentCash}`, equity),
            calcStep('Funding gap', `${price} - ${downPaymentCash}`, fundingGap),
            calcStep('Mortgage principal', `min(${fundingGap}, ${round2(maxMortgage)})`, mortgagePrincipal),
            calcStep('Bank principal', `max(0, ${fundingGap} - ${mortgagePrincipal})`, bankPrincipal),
        ],
        outputs: [
            output('Mortgage principal', mortgagePrincipal),
            output('Bank principal', bankPrincipal),
        ],
        notes: warnings.length > 0 ? warnings.slice() : [],
    }));

    // ============================================================
    // 2. DEED REGISTRATION FEE
    // ============================================================

    const deedFeeRaw = rules.deedRegistration.fixedFee +
        rules.deedRegistration.rateOfPrice * price;
    const deedFee = applyRounding(deedFeeRaw, rules.deedRegistration.rounding);

    audits.push(makeAudit({
        title: 'Deed Registration Fee (Skødetinglysning)',
        context: { scenarioId },
        inputs: [
            amountInput('Purchase price', price, 'input'),
            amountInput('Fixed fee', rules.deedRegistration.fixedFee, 'rules'),
            rateInput('Rate of price', rules.deedRegistration.rateOfPrice, 'rules'),
        ],
        steps: [
            calcStep('Variable fee', `${price} × ${rules.deedRegistration.rateOfPrice}`, round2(rules.deedRegistration.rateOfPrice * price)),
            calcStep('Total before rounding', `${rules.deedRegistration.fixedFee} + variable`, round2(deedFeeRaw)),
            calcStep('Rounded', `round to ${rules.deedRegistration.rounding}`, deedFee),
        ],
        outputs: [
            output('Deed registration fee', deedFee),
        ],
    }));

    // ============================================================
    // 3. MORTGAGE PLEDGE FEE
    // ============================================================

    const mortgagePledgeFeeRaw = mortgagePrincipal > 0
        ? rules.pledgeRegistration.fixedFee + rules.pledgeRegistration.rateOfPrincipal * mortgagePrincipal
        : 0;
    const mortgagePledgeFee = applyRounding(mortgagePledgeFeeRaw, rules.pledgeRegistration.rounding);

    audits.push(makeAudit({
        title: 'Mortgage Pledge Registration Fee (Panttinglysning)',
        context: { scenarioId },
        inputs: [
            amountInput('Mortgage principal', mortgagePrincipal, 'derived'),
            amountInput('Fixed fee', rules.pledgeRegistration.fixedFee, 'rules'),
            rateInput('Rate of principal', rules.pledgeRegistration.rateOfPrincipal, 'rules'),
        ],
        steps: [
            calcStep('Variable fee', `${mortgagePrincipal} × ${rules.pledgeRegistration.rateOfPrincipal}`, round2(rules.pledgeRegistration.rateOfPrincipal * mortgagePrincipal)),
            calcStep('Total before rounding', `${rules.pledgeRegistration.fixedFee} + variable`, round2(mortgagePledgeFeeRaw)),
            calcStep('Rounded', `round to ${rules.pledgeRegistration.rounding}`, mortgagePledgeFee),
        ],
        outputs: [
            output('Mortgage pledge fee', mortgagePledgeFee),
        ],
    }));

    // Bank pledge fee (simplified: same rate if enabled)
    const bankPledgeFee = bankPrincipal > 0
        ? applyRounding(
            rules.pledgeRegistration.fixedFee + rules.pledgeRegistration.rateOfPrincipal * bankPrincipal,
            rules.pledgeRegistration.rounding
        )
        : 0;

    // ============================================================
    // 4. TOTAL UPFRONT COSTS
    // ============================================================

    const defaultCosts = transactionCosts.includeDefaultCosts
        ? rules.defaults.buyerAttorneyFee + rules.defaults.bankEstablishmentFee + rules.defaults.valuationFee
        : 0;
    const customCosts = transactionCosts.customCosts.reduce((sum, c) => sum + c.amount, 0);
    const totalUpfrontCosts = deedFee + mortgagePledgeFee + bankPledgeFee + defaultCosts + customCosts;

    // ============================================================
    // 5. MONTHLY MORTGAGE PAYMENT
    // ============================================================

    const mortgagePayment = mortgage.enabled && mortgagePrincipal > 0
        ? annuityPaymentMonthly(
            mortgagePrincipal,
            (mortgage as any).bondRateNominalAnnual,
            (mortgage as any).termYears
        )
        : 0;

    const r = ((mortgage as any).bondRateNominalAnnual || 0) / 12;
    const n = ((mortgage as any).termYears || 0) * 12;

    audits.push(makeAudit({
        title: 'Mortgage Annuity Payment',
        context: { scenarioId },
        inputs: [
            amountInput('Mortgage principal', mortgagePrincipal, 'derived'),
            rateInput('Bond rate (annual)', (mortgage as any).bondRateNominalAnnual || 0, 'input'),
            { label: 'Term', value: (mortgage as any).termYears || 0, unit: 'years', source: 'input' },
        ],
        steps: [
            calcStep('Monthly rate (r)', `${(mortgage as any).bondRateNominalAnnual || 0} / 12`, round2(r * 10000) / 10000, '%'),
            calcStep('Number of payments (n)', `${(mortgage as any).termYears || 0} × 12`, n, 'months'),
            calcStep('Payment', `principal × r / (1 - (1+r)^(-n))`, mortgagePayment),
        ],
        outputs: [
            output('Monthly mortgage payment', mortgagePayment),
        ],
    }));

    // ============================================================
    // 6. MONTHLY MORTGAGE CONTRIBUTION (Bidragssats - Tiered)
    // ============================================================

    let mortgageContribution = 0;
    const ltv = mortgagePrincipal / price;

    if (mortgage.enabled && mortgagePrincipal > 0) {
        if ((mortgage as any).contributionRateAnnual !== undefined) {
            // Manual override
            mortgageContribution = round2(mortgagePrincipal * ((mortgage as any).contributionRateAnnual / 12));
        } else {
            // Tiered calculation based on LTV tranches
            let remainingPrincipal = mortgagePrincipal;
            const tiers = rules.mortgageRules.tieredContributions;

            for (const tier of tiers) {
                if (remainingPrincipal <= 0) break;

                const trancheFrom = price * tier.ltvFrom;
                const trancheTo = price * tier.ltvTo;
                const trancheSize = trancheTo - trancheFrom;

                // How much of the principal falls into this tranche?
                // Example: principal 2.4M. Tranche 0-1.2M. Use 1.2M.
                // Tranche 1.2-1.8M. Use 0.6M.
                // Tranche 1.8-2.4M. Use 0.6M.
                const principalInTranche = Math.min(remainingPrincipal, trancheSize);

                mortgageContribution += (principalInTranche * (tier.rate / 12));
                remainingPrincipal -= principalInTranche;
            }
            mortgageContribution = round2(mortgageContribution);
        }
    }

    audits.push(makeAudit({
        title: 'Mortgage Monthly Contribution (Tiered Bidragssats)',
        context: { scenarioId },
        inputs: [
            amountInput('Mortgage principal', mortgagePrincipal, 'derived'),
            rateInput('LTV ratio', ltv, 'derived'),
        ],
        steps: [
            calcStep('Calculation', `Tiered based on LTV tranches`, mortgageContribution),
        ],
        outputs: [
            output('Monthly contribution', mortgageContribution),
        ],
        notes: ['Tiered rates applied correctly to LTV tranches (e.g. 0-40, 40-60, 60-80).'],
    }));

    // ============================================================
    // 6.5 PROPERTY TAX & MAINTENANCE
    // ============================================================

    const propTaxRate = budgetIntegration.propertyTaxRate ?? rules.defaults.propertyTaxRate;
    const landTaxRate = budgetIntegration.landTaxRate ?? rules.defaults.landTaxRate;
    const maintenanceRate = rules.defaults.maintenanceRateAnnual;

    const propertyTaxMonthly = round2((price * propTaxRate / 12) + (price * landTaxRate / 12));
    const maintenanceProvisionMonthly = round2(price * maintenanceRate / 12);

    // ============================================================
    // 7. BANK LOAN PAYMENT
    // ============================================================

    const bankPayment = bankLoan.enabled && bankPrincipal > 0
        ? annuityPaymentMonthly(
            bankPrincipal,
            (bankLoan as any).rateNominalAnnual,
            (bankLoan as any).termYears
        )
        : 0;

    audits.push(makeAudit({
        title: 'Bank Loan Monthly Payment',
        context: { scenarioId },
        inputs: [
            amountInput('Bank principal', bankPrincipal, 'derived'),
            rateInput('Bank rate (annual)', (bankLoan as any).rateNominalAnnual || 0, 'input'),
            { label: 'Term', value: (bankLoan as any).termYears || 0, unit: 'years', source: 'input' },
        ],
        steps: [
            calcStep('Payment', `annuity formula`, bankPayment),
        ],
        outputs: [
            output('Monthly bank payment', bankPayment),
        ],
    }));

    // ============================================================
    // 8. BUDGET IMPACT
    // ============================================================

    // ============================================================
    // 8. AMORTIZATION SCHEDULE (30 YEARS)
    // ============================================================

    const amortizationSchedule: import('./types').AmortizationYear[] = [];

    // Simulation state
    let simMortgagePrincipal = mortgagePrincipal;
    let simBankPrincipal = bankPrincipal;
    const simMortgageRate = ((mortgage as any).bondRateNominalAnnual || 0) / 12;
    const simBankRate = ((bankLoan as any).rateNominalAnnual || 0) / 12;
    const simMortgageTermMonths = ((mortgage as any).termYears || 30) * 12;
    const simBankTermMonths = ((bankLoan as any).termYears || 20) * 12;
    const simIO_Months = ((mortgage as any).ioYears || 0) * 12;

    // We simulate 30 years (360 months)
    for (let year = 1; year <= 30; year++) {
        let yearMortgageInterest = 0;
        let yearMortgagePrincipal = 0;
        let yearMortgageContribution = 0;
        let yearBankInterest = 0;
        let yearBankPrincipal = 0;

        for (let month = 1; month <= 12; month++) {
            const currentMonthIndex = (year - 1) * 12 + month;

            // --- Mortgage ---
            let monthlyMortgagePayment = 0;
            let monthlyMortgageInterest = simMortgagePrincipal * simMortgageRate;
            let monthlyMortgagePrincipalInfo = 0;

            if (simMortgagePrincipal > 0) {
                if (currentMonthIndex <= simIO_Months) {
                    // Interest Only
                    monthlyMortgagePayment = monthlyMortgageInterest;
                    monthlyMortgagePrincipalInfo = 0;
                } else {
                    // Annuity (remaining principal over remaining term)
                    const remainingMonths = simMortgageTermMonths - currentMonthIndex + 1;
                    if (remainingMonths > 0) { // Safety check
                        monthlyMortgagePayment = annuityPaymentMonthly(simMortgagePrincipal, simMortgageRate * 12, remainingMonths / 12);
                    } else {
                        monthlyMortgagePayment = simMortgagePrincipal + monthlyMortgageInterest; // Pay off last bit
                    }
                    monthlyMortgagePrincipalInfo = monthlyMortgagePayment - monthlyMortgageInterest;
                }
            }

            // Dynamic Bidragssats Calculation (based on current LTV)
            let monthlyContribution = 0;
            if (simMortgagePrincipal > 0 && mortgage.enabled) {
                // Determine rate based on CURRENT principal vs INITIAL price (LTV)
                // Note: Bidrag is usually based on the loan's placement in the hierarchy related to the VURDERING (Assessment).
                // We assume Assessment = Purchase Price for this simulation.

                let remainingForBidrag = simMortgagePrincipal;
                const tiers = rules.mortgageRules.tieredContributions;

                for (const tier of tiers) {
                    if (remainingForBidrag <= 0) break;

                    const trancheFrom = price * tier.ltvFrom;
                    const trancheTo = price * tier.ltvTo;
                    const trancheSize = trancheTo - trancheFrom;

                    const principalInTranche = Math.min(remainingForBidrag, trancheSize);

                    // Simple approximation: we pay bidrag on the full remaining principal, distributed across tranches.
                    // Strictly speaking, as you pay down, top tranches disappear first.
                    // This simulation logic: "Top Slice" method.
                    // The 'remainingForBidrag' assumes we are paying off the "top" (most expensive) debt first?
                    // No, usually Realkredit loans cover 0-80%.
                    // If you owe 2.0M on a 3.0M house (66%), you have debt in 0-40, 40-60, and 60-66.
                    // Our 'simMortgagePrincipal' represents the 0-X% slice?
                    // Actually, standard Danish mortgages are "Top-Down" risk? No, the bond is the bond.
                    // The Bidrag calculation is: slice the current debt into the LTV bands.
                    // BUT: Does the loan "shrink" from the top (expensive part) or proportionally?
                    // Realkredit loans in Denmark: You have a loan from 0-80%. When you amortize, you lower the 80%.
                    // So yes, you pay off the most expensive bidrag-part first.

                    // The correct logic:
                    // Current Debt covers the range [0, simMortgagePrincipal].
                    // Wait, usually the loan covers [0, 80%] of value.
                    // If I pay down 100k, my debt is now [0, 77%].
                    // So I no longer pay the high bidrag for 77-80%.
                    // YES. The debt shrinks from the Top LTV downwards.

                    // So we must map [0, simMortgagePrincipal] against the tiers.
                    // Wait, if it's a mix of multiple loans, it's complex.
                    // Assuming ONE mortgage covering [0, InitialLTV].

                    // Let's assume the mortgage sits at the "bottom" of funding gap?
                    // No, mortgage is 0-80%. Bank is 80-95%.
                    // So Mortgage Principal covers LTV 0% to (MortgagePrincipal / Price)%.

                    // Logic check:
                    // If Price 100, Mortgage 80.
                    // Tier 1: 0-40 (rate 0.5)
                    // Tier 2: 40-60 (rate 1.0)
                    // Tier 3: 60-80 (rate 1.5)

                    // Princ = 80.
                    // 0-40: 40 * 0.5
                    // 40-60: 20 * 1.0
                    // 60-80: 20 * 1.5

                    // After 10 years, Princ = 50.
                    // 0-40: 40 * 0.5
                    // 40-50: 10 * 1.0
                    // 50-80: 0 * 1.5 (Saved money!)

                    // Correct implementation:
                    // Iterate through tiers. Calculate overlap between [0, simMortgagePrincipal] and [TierStart, TierEnd].

                    // Tier range in nominal DKK
                    const tierStartVal = price * tier.ltvFrom;
                    const tierEndVal = price * tier.ltvTo;

                    // Overlap between [0, simMortgagePrincipal] and [tierStartVal, tierEndVal]
                    const overlapStart = Math.max(0, tierStartVal);
                    const overlapEnd = Math.min(simMortgagePrincipal, tierEndVal);
                    const overlapSize = Math.max(0, overlapEnd - overlapStart);

                    monthlyContribution += (overlapSize * (tier.rate / 12));
                }
            }

            // Update Mortgage State
            simMortgagePrincipal -= monthlyMortgagePrincipalInfo;
            if (simMortgagePrincipal < 0) simMortgagePrincipal = 0;

            // --- Bank Loan ---
            let monthlyBankPayment = 0;
            let monthlyBankInterest = simBankPrincipal * simBankRate;
            let monthlyBankPrincipalInfo = 0;

            if (simBankPrincipal > 0) {
                const remainingBankMonths = simBankTermMonths - currentMonthIndex + 1;
                if (remainingBankMonths > 0) {
                    monthlyBankPayment = annuityPaymentMonthly(simBankPrincipal, simBankRate * 12, remainingBankMonths / 12);
                } else {
                    monthlyBankPayment = simBankPrincipal + monthlyBankInterest;
                }
                monthlyBankPrincipalInfo = monthlyBankPayment - monthlyBankInterest;
            }

            // Update Bank State
            simBankPrincipal -= monthlyBankPrincipalInfo;
            if (simBankPrincipal < 0) simBankPrincipal = 0;


            // Accumulate Year Totals
            yearMortgageInterest += monthlyMortgageInterest;
            yearMortgagePrincipal += monthlyMortgagePrincipalInfo;
            yearMortgageContribution += monthlyContribution;
            yearBankInterest += monthlyBankInterest;
            yearBankPrincipal += monthlyBankPrincipalInfo;
        }

        const yearTotalCost = yearMortgageInterest + yearMortgagePrincipal + yearMortgageContribution +
            yearBankInterest + yearBankPrincipal;

        amortizationSchedule.push({
            year,
            mortgageInterest: round2(yearMortgageInterest),
            mortgagePrincipal: round2(yearMortgagePrincipal),
            mortgageContribution: round2(yearMortgageContribution),
            bankInterest: round2(yearBankInterest),
            bankPrincipal: round2(yearBankPrincipal),
            totalCost: round2(yearTotalCost),
            debtRemaining: round2(simMortgagePrincipal + simBankPrincipal)
        });
    }

    // ============================================================
    // 9. BUDGET IMPACT
    // ============================================================

    // Granular Costs from Input
    const insuranceCost = budgetIntegration.insurance || 0;
    const utilitiesCost = budgetIntegration.utilities || 0;
    const associationCost = budgetIntegration.associationFees || 0;
    const miscMaintenance = budgetIntegration.maintenance || 0;

    // Legacy support or explicit sum
    const manualRunningCosts = budgetIntegration.monthlyHousingRunningCosts || 0;

    // Total operational (excluding taxes/loans)
    // If granular are provided, use them. If not, use legacy.
    const hasGranular = (budgetIntegration.insurance !== undefined ||
        budgetIntegration.utilities !== undefined ||
        budgetIntegration.associationFees !== undefined);

    const housingRunningCosts = hasGranular
        ? (insuranceCost + utilitiesCost + associationCost)
        : manualRunningCosts;

    // Maintenance Provision logic (can be overridden by input)
    // If 'maintenance' in budgetIntegration is set, use it. Else calculate from rate.
    const maintenanceProvision = budgetIntegration.maintenance !== undefined
        ? budgetIntegration.maintenance
        : maintenanceProvisionMonthly; // From earlier calculation (1% of price / 12)

    const totalHousingCostPerMonth = mortgagePayment + mortgageContribution + bankPayment +
        housingRunningCosts + propertyTaxMonthly + maintenanceProvision;

    const disposableAfterHousing = budgetIntegration.monthlyDisposableIncomeBeforeHousing - totalHousingCostPerMonth;

    audits.push(makeAudit({
        title: 'Budget Impact - Total Monthly Housing Cost',
        context: { scenarioId },
        inputs: [
            amountInput('Disposable income before housing', budgetIntegration.monthlyDisposableIncomeBeforeHousing, 'input'),
            amountInput('Mortgage payment', mortgagePayment, 'derived'),
            amountInput('Mortgage contribution', mortgageContribution, 'derived'),
            amountInput('Bank payment', bankPayment, 'derived'),
            amountInput('Property tax', propertyTaxMonthly, 'derived'),
            amountInput('Maintenance provision', maintenanceProvision, 'derived'),
            amountInput('Operational (Insurance/Util/Assoc)', housingRunningCosts, 'derived'),
        ],
        steps: [
            calcStep('Total housing cost', `Sum of all components`, totalHousingCostPerMonth),
            calcStep('Disposable after housing', `${budgetIntegration.monthlyDisposableIncomeBeforeHousing} - ${totalHousingCostPerMonth}`, disposableAfterHousing),
        ],
        outputs: [
            output('Total monthly housing cost', totalHousingCostPerMonth),
            output('Disposable after housing', disposableAfterHousing),
        ],
    }));

    // ============================================================
    // 10. BALANCE IMPACT
    // ============================================================

    const assetHomeValueInitial = price;
    const liabilitiesInitial = mortgagePrincipal + bankPrincipal;
    const equityInitial = price - liabilitiesInitial;

    // ============================================================
    // RETURN OUTPUT
    // ============================================================

    return {
        derived: {
            mortgagePrincipal,
            bankPrincipal,
            deedFee,
            mortgagePledgeFee,
            bankPledgeFee,
            totalUpfrontCosts,
        },
        monthly: {
            mortgagePayment,
            mortgageContribution,
            bankPayment,
            propertyTax: propertyTaxMonthly,
            maintenanceProvision: maintenanceProvision,
            housingRunningCosts,
            totalHousingCostPerMonth,
            disposableAfterHousing,
        },
        amortizationSchedule,
        balanceImpact: {
            assetHomeValueInitial,
            liabilitiesInitial,
            equityInitial,
        },
        audits,
        warnings,
        assumptions,
    };
}
