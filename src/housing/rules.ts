import { HousingRules, RoundingRule } from './types';

/**
 * Validate housing rules object.
 */
export function validateHousingRules(rules: HousingRules): void {
    const errors: string[] = [];

    // Required fields
    if (rules.year === undefined || rules.year === null) {
        errors.push('year is required');
    }

    // Percentage ranges
    if (rules.minDownPaymentPct === null || rules.minDownPaymentPct === undefined) {
        errors.push('minDownPaymentPct is required');
    } else if (rules.minDownPaymentPct < 0 || rules.minDownPaymentPct > 1) {
        errors.push('minDownPaymentPct must be between 0 and 1');
    }

    if (rules.mortgageLtvMax === null || rules.mortgageLtvMax === undefined) {
        errors.push('mortgageLtvMax is required');
    } else if (rules.mortgageLtvMax < 0 || rules.mortgageLtvMax > 1) {
        errors.push('mortgageLtvMax must be between 0 and 1');
    }

    // Deed registration
    if (!rules.deedRegistration) {
        errors.push('deedRegistration is required');
    } else {
        if (rules.deedRegistration.fixedFee === null || rules.deedRegistration.fixedFee === undefined) {
            errors.push('deedRegistration.fixedFee is required');
        } else if (rules.deedRegistration.fixedFee < 0) {
            errors.push('deedRegistration.fixedFee must be >= 0');
        }

        if (rules.deedRegistration.rateOfPrice === null || rules.deedRegistration.rateOfPrice === undefined) {
            errors.push('deedRegistration.rateOfPrice is required');
        } else if (rules.deedRegistration.rateOfPrice < 0) {
            errors.push('deedRegistration.rateOfPrice must be >= 0');
        }

        if (!isValidRounding(rules.deedRegistration.rounding)) {
            errors.push('deedRegistration.rounding must be NEAREST_100 or NONE');
        }
    }

    // Pledge registration
    if (!rules.pledgeRegistration) {
        errors.push('pledgeRegistration is required');
    } else {
        if (rules.pledgeRegistration.fixedFee === null || rules.pledgeRegistration.fixedFee === undefined) {
            errors.push('pledgeRegistration.fixedFee is required');
        } else if (rules.pledgeRegistration.fixedFee < 0) {
            errors.push('pledgeRegistration.fixedFee must be >= 0');
        }

        if (rules.pledgeRegistration.rateOfPrincipal === null || rules.pledgeRegistration.rateOfPrincipal === undefined) {
            errors.push('pledgeRegistration.rateOfPrincipal is required');
        } else if (rules.pledgeRegistration.rateOfPrincipal < 0) {
            errors.push('pledgeRegistration.rateOfPrincipal must be >= 0');
        }

        if (!isValidRounding(rules.pledgeRegistration.rounding)) {
            errors.push('pledgeRegistration.rounding must be NEAREST_100 or NONE');
        }
    }

    // Mortgage rules (Tiered) [NEW]
    if (!rules.mortgageRules || !Array.isArray(rules.mortgageRules.tieredContributions)) {
        errors.push('mortgageRules.tieredContributions array is required');
    }

    // Defaults [NEW]
    if (rules.defaults.propertyTaxRate === undefined) errors.push('defaults.propertyTaxRate is required');
    if (rules.defaults.landTaxRate === undefined) errors.push('defaults.landTaxRate is required');
    if (rules.defaults.maintenanceRateAnnual === undefined) errors.push('defaults.maintenanceRateAnnual is required');

    if (errors.length > 0) {
        throw new Error(`Invalid housing rules:\n  - ${errors.join('\n  - ')}`);
    }
}

function isValidRounding(rounding: unknown): rounding is RoundingRule {
    return rounding === 'NEAREST_100' || rounding === 'NONE';
}
