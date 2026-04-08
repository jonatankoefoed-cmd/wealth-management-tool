import { ProjectionModule, ModuleInput, ModuleOutput, MonthKey } from '../types';
import { round2 } from '../math';

export interface IncomeModuleInput {
    startingSalary: number;
    yearlyGrowth: number[]; // 10 years
    yearlyBonusPct: number[]; // 10 years, e.g. [0.25, 0.25, ...]
    bonusMonth?: number; // 0-11, default 2 (March)
}

export function createIncomeModule(input: IncomeModuleInput): ProjectionModule {
    return {
        key: 'income',
        apply(context: ModuleInput): ModuleOutput {
            const { months, base } = context;
            const perMonth: Record<MonthKey, any> = {};

            const bonusMonth = input.bonusMonth ?? 2; // Default March
            let currentSalary = input.startingSalary;

            months.forEach((month, index) => {
                const monthInYear = index % 12;
                const yearIndex = Math.floor(index / 12);

                // Apply growth at the start of each year (except year 0)
                if (index > 0 && monthInYear === 0) {
                    let rate = input.yearlyGrowth[yearIndex] ?? 0.02;
                    // Robust handling: if user input 30.5, treat as 30.5%. If 0.305, also 30.5%.
                    if (Math.abs(rate) > 1) rate = rate / 100;
                    currentSalary = currentSalary * (1 + rate);
                }

                let monthlySalaryDelta = currentSalary - base.monthlyDisposableIncomeBeforeHousing;
                let monthlyBonus = 0;

                // Add Bonus
                if (monthInYear === bonusMonth) {
                    const bonusPct = input.yearlyBonusPct[yearIndex] ?? (input.yearlyBonusPct[input.yearlyBonusPct.length - 1] ?? 0);
                    // Bonus is percentage of ANNUAL salary (estimated as current monthly * 12)
                    monthlyBonus = (currentSalary * 12) * bonusPct;
                }

                const totalDelta = monthlySalaryDelta + monthlyBonus;

                if (totalDelta !== 0) {
                    perMonth[month] = {
                        pnl: {
                            income: round2(totalDelta),
                            salary: round2(monthlySalaryDelta),
                            bonus: round2(monthlyBonus)
                        },
                        audits: totalDelta > monthlyBonus ? [
                            {
                                title: `Income Adjustment: ${month}`,
                                description: `Salary growth + Bonus applied. New monthly base: ${round2(currentSalary)}`
                            }
                        ] : []
                    };
                }
            });

            return { perMonth };
        }
    };
}
