import { ProjectionModule, ModuleInput, ModuleOutput, MonthKey } from '../types';
import { round2 } from '../math';
import { makeProjectionAudit, dkkInput, stepCalc, stepOutput } from '../audit';

export interface HoldingInput {
    id: string;
    name: string;
    currentValue: number;
    expectedReturnAnnual: number; // e.g., 0.07 for 7%
    dividendYieldAnnual?: number; // e.g., 0.02 for 2%
    type: 'ASK' | 'DEPOT' | 'CRYPTO' | 'PENSION';
}

export interface PortfolioModuleConfig {
    holdings: HoldingInput[];
    monthlyContribution: number;
}

export class PortfolioModule implements ProjectionModule {
    readonly key = 'portfolio';
    private holdings: HoldingInput[];
    private monthlyContribution: number;

    constructor(config: PortfolioModuleConfig) {
        this.holdings = config.holdings;
        this.monthlyContribution = config.monthlyContribution;
    }

    apply(input: ModuleInput): ModuleOutput {
        const perMonth: ModuleOutput['perMonth'] = {};
        const warnings: string[] = [];

        // Track current value for each holding
        const values = new Map<string, number>();
        this.holdings.forEach(h => values.set(h.id, h.currentValue));

        for (const month of input.months) {
            let totalDividendIncome = 0;
            let totalAppreciation = 0;
            let totalValue = 0;

            // Distribute contribution propotionally to value? Or to specific asset?
            // For MVP, add strictly to cash/generic bucket or split evenly?
            // Let's assume contribution goes to a generic "New Savings" bucket if not specified, 
            // or split proportionally across existing.
            // Simplified: Add contribution to first holding or split.
            // Better: Add to total value directly? But we need to track gain per asset type for tax.

            // Let's split contribution by valid holdings weight
            const totalStartValue = Array.from(values.values()).reduce((a, b) => a + b, 0);

            for (const holding of this.holdings) {
                const startValue = values.get(holding.id) || 0;

                // 1. Contribution allocation
                const allocationWeight = totalStartValue > 0 ? startValue / totalStartValue : 1 / this.holdings.length;
                const addedContribution = this.monthlyContribution * allocationWeight;

                // 2. Growth (Appreciation)
                let annualRate = holding.expectedReturnAnnual;
                if (Math.abs(annualRate) > 1) annualRate = annualRate / 100;
                const monthlyReturn = annualRate / 12;
                const appreciation = round2((startValue + addedContribution) * monthlyReturn);

                // 3. Dividend (Income)
                let annualYield = holding.dividendYieldAnnual || 0;
                if (Math.abs(annualYield) > 1) annualYield = annualYield / 100;
                const monthlyYield = annualYield / 12;
                const dividend = round2((startValue + addedContribution) * monthlyYield);

                // Update Value
                const endValue = round2(startValue + addedContribution + appreciation);

                values.set(holding.id, endValue);

                totalAppreciation += appreciation;
                totalDividendIncome += dividend;
                totalValue += endValue;
            }

            // Create Audit
            const portfolioAudit = makeProjectionAudit({
                title: 'Portfolio Growth',
                month,
                inputs: [
                    dkkInput('Start Value', totalStartValue),
                    dkkInput('Contribution', this.monthlyContribution),
                ],
                steps: [
                    stepCalc('Appreciation', `~${(0.07 / 12 * 100).toFixed(2)}% monthly return`, totalAppreciation),
                    stepCalc('Dividends', `Yield`, totalDividendIncome)
                ],
                outputs: [
                    stepOutput('End Value', totalValue)
                ],
                notes: [`Allocated across ${this.holdings.length} holdings`]
            });

            perMonth[month] = {
                pnl: {
                    investmentIncome: totalDividendIncome,
                },
                cashFlow: {
                    investmentContribution: this.monthlyContribution,
                },
                balanceSheet: {
                    portfolioValue: totalValue,
                },
                audits: [portfolioAudit]
            };
        }

        return { perMonth, warnings };
    }
}

export function createPortfolioModule(config: PortfolioModuleConfig): PortfolioModule {
    return new PortfolioModule(config);
}
