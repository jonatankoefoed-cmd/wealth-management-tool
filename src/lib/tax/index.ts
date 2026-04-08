/**
 * Tax Module Index
 * 
 * Exports all tax calculation functionality.
 */

// Main engine
export { calculateTax } from './taxEngine';
export type { TaxInput, TaxOutput } from './taxEngine';

// Individual calculators
export { calculatePersonalTax } from './personalTax';
export type { PersonalIncomeInput, PersonalTaxResult } from './personalTax';

export { calculateEquityTax } from './equityTax';
export type { EquityIncomeInput, EquityTaxResult } from './equityTax';

export { calculateASKTax, getASKDepositCapacity } from './askTax';
export type { ASKInput, ASKTaxResult } from './askTax';

export { calculateMarkToMarketTax } from './markToMarketTax';
export type { MarkToMarketInput, MarkToMarketTaxResult } from './markToMarketTax';

// Cost basis
export {
    calculateAverageCost,
    addPurchase,
    calculateSale,
    adjustForSplit
} from './costBasis';
export type {
    Position,
    Lot,
    SaleCalculation
} from './costBasis';

// Rules and audit
export {
    loadTaxRules,
    validateTaxRulesShape,
    classifyInstrument
} from './taxRules';
export type {
    TaxRules,
    IncomeType,
    TaxationPrinciple,
    WrapperType
} from './taxRules';

export {
    formatAudit,
    createAudit
} from './auditTrail';
export type {
    TaxAudit,
    AuditStep
} from './auditTrail';
