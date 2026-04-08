/**
 * Danish Personal Income Tax Calculator
 * 
 * Calculates personal income tax including:
 * - AM-bidrag (arbejdsmarkedsbidrag)
 * - Bundskat (bottom tax)
 * - Mellemskat (middle tax) - NEW from 2026
 * - Topskat (top tax)
 * - Toptopskat (top-top tax) - NEW from 2026
 * - Kommuneskat & Kirkeskat (municipal & church tax)
 */

import { TaxRules, loadTaxRules } from './taxRules';
import { AuditStep, createAudit, TaxAudit } from './auditTrail';

// ============================================================================
// Input Types
// ============================================================================

export interface PersonalIncomeInput {
    taxYear: number;
    salaryGross: number;
    bonusGross?: number;
    otherAMIncome?: number; // Other AM-bidrag liable income
    pensionEmployee?: number; // Employee pension contribution (pre-AM)
    atp?: number;
    municipalRate: number; // e.g. 0.25 for 25%
    churchRate?: number; // e.g. 0.007 for 0.7%
    deductions?: {
        fagforening?: number;
        befordring?: number;
        other?: number;
    };
    isMarried?: boolean;
    isSenior?: boolean;
}

// ============================================================================
// Output Types
// ============================================================================

export interface PersonalTaxResult {
    // Summary
    totalTax: number;
    effectiveTaxRate: number;
    netIncome: number;

    // Breakdown
    breakdown: {
        amBidrag: number;
        incomeAfterAM: number;

        // Deductions
        employmentDeduction: number;
        seniorDeduction: number;
        otherDeductions: number;
        totalDeductions: number;
        personalAllowance: number;

        // Tax bases
        taxableIncome: number;
        municipalTaxBase: number;

        // Individual taxes
        municipalTax: number;
        churchTax: number;
        bottomTax: number;
        middleTax: number;
        topTax: number;
        topTopTax: number;
        jobDeduction: number;
    };

    // Audit trail
    audit: TaxAudit;
    warnings: string[];
    assumptions: string[];
}

// ============================================================================
// Calculator
// ============================================================================

export function calculatePersonalTax(input: PersonalIncomeInput): PersonalTaxResult {
    const rules = loadTaxRules(input.taxYear);
    const steps: AuditStep[] = [];
    const warnings: string[] = [];
    const assumptions: string[] = [];

    // -------------------------------------------------------------------------
    // Step 1: Calculate AM-bidrag base and contribution
    // -------------------------------------------------------------------------
    const salaryGross = input.salaryGross || 0;
    const bonusGross = input.bonusGross || 0;
    const otherAMIncome = input.otherAMIncome || 0;
    const pensionEmployee = input.pensionEmployee || 0;
    const atp = input.atp || 0;

    // AM-grundlag = løn + bonus + anden AM-indkomst - ATP - egen pension
    const amBase = salaryGross + bonusGross + otherAMIncome - atp - pensionEmployee;

    steps.push({
        label: 'AM-grundlag',
        formula: `${salaryGross} + ${bonusGross} + ${otherAMIncome} - ${atp} - ${pensionEmployee}`,
        value: amBase,
        unit: 'DKK',
    });

    const amBidrag = amBase * rules.amContribution.rate;

    steps.push({
        label: 'AM-bidrag',
        formula: `${amBase} × ${rules.amContribution.rate * 100}%`,
        value: amBidrag,
        unit: 'DKK',
    });

    const incomeAfterAM = amBase - amBidrag;

    steps.push({
        label: 'Indkomst efter AM',
        formula: `${amBase} - ${amBidrag}`,
        value: incomeAfterAM,
        unit: 'DKK',
    });

    // -------------------------------------------------------------------------
    // Step 2: Calculate deductions
    // -------------------------------------------------------------------------

    // Beskæftigelsesfradrag
    const employmentDeductionRaw = amBase * rules.personal.employmentDeduction.rate;
    const employmentDeduction = Math.min(employmentDeductionRaw, rules.personal.employmentDeduction.maxAmount);

    steps.push({
        label: 'Beskæftigelsesfradrag',
        formula: `min(${amBase} × ${rules.personal.employmentDeduction.rate * 100}%, ${rules.personal.employmentDeduction.maxAmount})`,
        value: employmentDeduction,
        unit: 'DKK',
    });

    // Senior deduction
    let seniorDeduction = 0;
    if (input.isSenior) {
        const seniorRaw = amBase * rules.personal.seniorEmploymentDeduction.rate;
        seniorDeduction = Math.min(seniorRaw, rules.personal.seniorEmploymentDeduction.maxAmount);
    }

    // Other deductions
    const fagforening = input.deductions?.fagforening || 0;
    const befordring = input.deductions?.befordring || 0;
    const otherDeductions = input.deductions?.other || 0;
    const customDeductions = fagforening + befordring + otherDeductions;

    const totalDeductions = employmentDeduction + seniorDeduction + customDeductions;

    steps.push({
        label: 'Sum ligningsmæssige fradrag',
        formula: `${employmentDeduction} + ${seniorDeduction} + ${customDeductions}`,
        value: totalDeductions,
        unit: 'DKK',
    });

    const personalAllowance = rules.personal.personalAllowance;

    // -------------------------------------------------------------------------
    // Step 3: Calculate taxable income
    // -------------------------------------------------------------------------

    // Skattepligtig indkomst (forenklet)
    const taxableIncome = incomeAfterAM - totalDeductions;

    steps.push({
        label: 'Skattepligtig indkomst',
        formula: `${incomeAfterAM} - ${totalDeductions}`,
        value: taxableIncome,
        unit: 'DKK',
    });

    // Skattegrundlag (kommune/kirke) = skattepligtig indkomst - personfradrag
    const municipalTaxBase = Math.max(0, taxableIncome - personalAllowance);

    steps.push({
        label: 'Skattegrundlag (kommune/kirke)',
        formula: `max(0, ${taxableIncome} - ${personalAllowance})`,
        value: municipalTaxBase,
        unit: 'DKK',
    });

    // -------------------------------------------------------------------------
    // Step 4: Calculate individual taxes
    // -------------------------------------------------------------------------

    // Kommuneskat
    const municipalTax = municipalTaxBase * input.municipalRate;

    steps.push({
        label: 'Kommuneskat',
        formula: `${municipalTaxBase} × ${(input.municipalRate * 100).toFixed(1)}%`,
        value: municipalTax,
        unit: 'DKK',
    });

    // Kirkeskat
    const churchRate = input.churchRate || 0;
    const churchTax = municipalTaxBase * churchRate;

    if (churchRate > 0) {
        steps.push({
            label: 'Kirkeskat',
            formula: `${municipalTaxBase} × ${(churchRate * 100).toFixed(2)}%`,
            value: churchTax,
            unit: 'DKK',
        });
    }

    // Bundskat
    const bottomTax = municipalTaxBase * rules.personal.bottomTax.rate;

    steps.push({
        label: 'Bundskat',
        formula: `${municipalTaxBase} × ${(rules.personal.bottomTax.rate * 100).toFixed(2)}%`,
        value: bottomTax,
        unit: 'DKK',
    });

    // Mellemskat (NEW from 2026)
    const middleTaxBase = Math.max(0, incomeAfterAM - rules.personal.middleTax.threshold);
    const middleTax = middleTaxBase * rules.personal.middleTax.rate;

    if (middleTax > 0) {
        steps.push({
            label: 'Mellemskat',
            formula: `max(0, ${incomeAfterAM} - ${rules.personal.middleTax.threshold}) × ${(rules.personal.middleTax.rate * 100).toFixed(1)}%`,
            value: middleTax,
            unit: 'DKK',
        });
    }

    // Topskat
    const topTaxBase = Math.max(0, incomeAfterAM - rules.personal.topTax.threshold);
    const topTax = topTaxBase * rules.personal.topTax.rate;

    if (topTax > 0) {
        steps.push({
            label: 'Topskat',
            formula: `max(0, ${incomeAfterAM} - ${rules.personal.topTax.threshold}) × ${(rules.personal.topTax.rate * 100).toFixed(1)}%`,
            value: topTax,
            unit: 'DKK',
        });
    }

    // Toptopskat (NEW from 2026)
    const topTopTaxBase = Math.max(0, incomeAfterAM - rules.personal.topTopTax.threshold);
    const topTopTax = topTopTaxBase * rules.personal.topTopTax.rate;

    if (topTopTax > 0) {
        steps.push({
            label: 'Toptopskat',
            formula: `max(0, ${incomeAfterAM} - ${rules.personal.topTopTax.threshold}) × ${(rules.personal.topTopTax.rate * 100).toFixed(1)}%`,
            value: topTopTax,
            unit: 'DKK',
        });
    }

    // Job deduction (reduces tax, not income)
    const jobDeduction = rules.personal.jobDeduction.amount;

    steps.push({
        label: 'Jobfradrag (fratrækkes skat)',
        formula: `−${jobDeduction}`,
        value: -jobDeduction,
        unit: 'DKK',
    });

    // -------------------------------------------------------------------------
    // Step 5: Calculate totals
    // -------------------------------------------------------------------------

    const totalTaxBeforeJobDeduction = amBidrag + municipalTax + churchTax + bottomTax + middleTax + topTax + topTopTax;
    const totalTax = totalTaxBeforeJobDeduction - jobDeduction;

    steps.push({
        label: 'Total skat inkl. AM',
        formula: `${amBidrag} + ${municipalTax} + ${churchTax} + ${bottomTax} + ${middleTax} + ${topTax} + ${topTopTax} - ${jobDeduction}`,
        value: totalTax,
        unit: 'DKK',
    });

    const grossIncome = salaryGross + bonusGross + otherAMIncome;
    const netIncome = grossIncome - totalTax;
    const effectiveTaxRate = grossIncome > 0 ? totalTax / grossIncome : 0;

    steps.push({
        label: 'Effektiv skatteprocent',
        formula: `${totalTax} / ${grossIncome}`,
        value: effectiveTaxRate,
        unit: '%',
    });

    // -------------------------------------------------------------------------
    // Assumptions
    // -------------------------------------------------------------------------
    assumptions.push('Forenklet model: Anvender standardiserede fradrag.');
    assumptions.push('Kapitalindkomst ikke inkluderet i denne beregning.');

    if (middleTax === 0 && topTax === 0 && topTopTax === 0) {
        assumptions.push('Indkomst under mellemskattegrænsen - kun bundskat beregnet.');
    }

    // -------------------------------------------------------------------------
    // Build audit
    // -------------------------------------------------------------------------
    const audit = createAudit({
        title: 'Personlig indkomstskat',
        context: { taxYear: input.taxYear },
        inputs: [
            { label: 'Bruttoløn', value: salaryGross, unit: 'DKK', source: 'input' },
            { label: 'Bonus', value: bonusGross, unit: 'DKK', source: 'input' },
            { label: 'Kommuneskat sats', value: input.municipalRate, unit: '%', source: 'input' },
            { label: 'Kirkeskat sats', value: churchRate, unit: '%', source: 'input' },
        ],
        steps,
        outputs: [
            { label: 'Total skat', value: totalTax, unit: 'DKK' },
            { label: 'Netto indkomst', value: netIncome, unit: 'DKK' },
            { label: 'Effektiv skatteprocent', value: effectiveTaxRate * 100, unit: '%' },
        ],
        notes: assumptions,
    });

    return {
        totalTax,
        effectiveTaxRate,
        netIncome,
        breakdown: {
            amBidrag,
            incomeAfterAM,
            employmentDeduction,
            seniorDeduction,
            otherDeductions: customDeductions,
            totalDeductions,
            personalAllowance,
            taxableIncome,
            municipalTaxBase,
            municipalTax,
            churchTax,
            bottomTax,
            middleTax,
            topTax,
            topTopTax,
            jobDeduction,
        },
        audit,
        warnings,
        assumptions,
    };
}
