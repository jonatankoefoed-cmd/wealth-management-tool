import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProjectionInput, ProjectionResult } from '@/src/projection/types'; // Assuming types exist
import { runProjection } from '@/src/projection';
import { createHousingPurchaseModule } from '@/src/projection/modules/housingPurchase';
import { createDebtModule } from '@/src/projection/modules/debt';
import { createPortfolioModule } from '@/src/projection/modules/portfolio';
import { createIncomeModule } from '@/src/projection';
import { createDefaultHousingInput, normalizeHousingInput } from '@/src/housing/defaults';

// Types for our Inputs
export interface SimulationInputs {
    salary_growth_path?: { model: string; yearlyPct: number[] };
    bonus_growth_path?: { model: string; yearlyPct: number[] }; // [NEW] Bonus path
    return_assumptions?: { equityPct: number; bondPct: number };
    housing?: any; // To be typed strictly later
    suDebt?: {
        currentBalance: number;
        interestRateStudy: number;
        interestRateRepayment: number;
        repaymentStartDate: string;
        useGracePeriod: boolean;
        futurePayouts: Array<{ month: string; amount: number }>;
    };
    education?: {
        studyEndDate?: string; // YYYY-MM-DD
        suInterestRateStudy?: number; // 0.04 default
        suInterestRateRepayment?: number; // 0.026 default
    };
    baseline?: {
        monthlyDisposableIncomeBeforeHousing: number;
        monthlyNonHousingExpenses: number;
        monthlyGrossIncome?: number;
        pensionContributionRate?: number;
        retirementAge?: number;
        municipality?: string;
        maritalStatus?: 'single' | 'married';
        expenseInflationRate?: number;
        monthlyLiquidSavings?: number;
        savingsRatePct?: number; // [NEW] Percentage of net income to invest
        annualBonus?: number;
        monthlyHousingRunningCosts?: number; // [NEW] Base operational costs
        propertyTaxRate?: number;            // [NEW] Ejendomsværdiskat rate
        landTaxRate?: number;                // [NEW] Grundskyld rate
    };
    investmentStrategy?: 'simple' | 'optimized';
    rebalancingFrequency?: 'monthly' | 'yearly' | 'none';
    mortgage_assumptions?: {
        interestRate: number;
        years: number;
        interestOnly: boolean;
    };
    budget_overrides?: Array<{ category: string; monthlyAmount: number }>;
    budget_categories?: Array<{ category: string; amount: number; group: string; type: 'fixed' | 'variable' }>;
    income_categories?: Array<{ category: string; amount: number; type: 'fixed' | 'variable' }>;
    events?: Array<{
        id: string;
        name: string;
        year: number;
        amount: number;
        type?: string;
    }>;
    careerTrack?: 'manual' | 'danske_ib' | 'danish_pe';
    careerPivot?: boolean; // Switch to PE after 3 years
    months?: number; // [NEW] Projection horizon
}

export const CAREER_PRESETS: Record<string, any> = {
    danske_ib_moderate: {
        name: "Danske IB (Moderate)",
        monthlyGrossIncome: 48500,
        pensionContributionRate: 0.17,
        annualBonus: 145500, // Used for initial display/calc
        growthPath: [0.045, 0.305, 0.045, 0.045, 0.20, 0.045, 0.045, 0.30, 0.045], // Promo Y3, Y6, Y9
        bonusPath: [0.25, 0.25, 0.50, 0.50, 0.50, 0.75, 0.75, 0.75, 1.0, 1.0] // Rising bonus %
    },
    danske_ib_aggressive: {
        name: "Danske IB (High Performer)",
        monthlyGrossIncome: 48500,
        pensionContributionRate: 0.17,
        annualBonus: 290000,
        growthPath: [0.36, 0.06, 0.35, 0.06, 0.43, 0.06, 0.06, 0.23, 0.075], // Promo Y2, Y4, Y6, Y9
        bonusPath: [0.50, 0.50, 1.0, 1.0, 1.5, 1.5, 1.5, 2.0, 2.0, 2.0]
    },
    danish_pe: {
        name: "Danish PE (Associate)",
        monthlyGrossIncome: 85000,
        pensionContributionRate: 0.17,
        annualBonus: 400000,
        growthPath: [0.10, 0.10, 0.15, 0.10, 0.10, 0.08, 0.08, 0.05, 0.05],
        bonusPath: [0.40, 0.40, 0.50, 0.50, 0.60, 0.60, 0.70, 0.70, 0.80, 0.80]
    }
};

export const BUDGET_PRESETS = {
    sophisticated_research: {
        categories: [
            { category: 'Dagligvare', amount: 1750, group: 'Mad', type: 'variable' },
            { category: 'Restaurant', amount: 1000, group: 'Mad', type: 'variable' },
            { category: 'Fitness', amount: 448, group: 'Abonnementer', type: 'fixed' },
            { category: 'Chat GPT', amount: 183, group: 'Abonnementer', type: 'fixed' },
            { category: 'Byen', amount: 1500, group: 'Fritid', type: 'variable' },
            { category: 'Transport', amount: 200, group: 'Transport', type: 'variable' },
            { category: 'Materiel forbrug', amount: 400, group: 'Andet', type: 'variable' },
            { category: 'Gaver', amount: 250, group: 'Andet', type: 'variable' },
            { category: 'Uforudset (pr md.)', amount: 400, group: 'Andet', type: 'variable' },
            // Standalone Savings Categories as fixed expenses before residual
            { category: 'Investering', amount: 500, group: 'Opsparing', type: 'fixed' },
            { category: 'Opsparing', amount: 500, group: 'Opsparing', type: 'fixed' },
            { category: 'Ferieopsparing boys', amount: 250, group: 'Opsparing', type: 'fixed' },
        ],
        events: [
            { name: 'Sverige Tur', amount: 3000, type: 'travel' },
            { name: 'Vietnam Rejse', amount: 19000, type: 'travel' },
            { name: 'Frankrig (14 dage)', amount: 9000, type: 'travel' },
        ]
    }
};

export interface SnapshotData {
    cash: number;
    holdings: any[];
    debts: any[];
}

function normalizeSimulationInputs(raw: any): SimulationInputs {
    const next = { ...(raw || {}) } as SimulationInputs;
    next.housing = normalizeHousingInput(raw?.housing ?? createDefaultHousingInput());
    return next;
}

export function useProjectionModel() {
    const [inputs, setInputs] = useState<SimulationInputs | null>(null);
    const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
    const [projection, setProjection] = useState<ProjectionResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Debounce Ref
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Load
    useEffect(() => {
        async function load() {
            try {
                const [inputsRes, snapshotRes] = await Promise.all([
                    fetch('/api/inputs'),
                    fetch('/api/snapshot')
                ]);

                const inputsData = await inputsRes.json();
                const snapshotData = await snapshotRes.json();

                if (inputsRes.ok) setInputs(normalizeSimulationInputs(inputsData));
                if (snapshotRes.ok) setSnapshot(snapshotData);

            } catch (e) {
                console.error("Failed to load projection model", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // Run Projection (Client-Side) whenever inputs or snapshot changes
    useEffect(() => {
        if (!inputs || !snapshot) return;

        // Transform Inputs + Snapshot into ProjectionInput
        // This is where we map the "User Interface" state to the "Engine" state
        async function run() {
            try {
                const now = new Date();
                const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                const modules = [];

                // 1. Housing
                if (inputs?.housing) {
                    try {
                        const normalizedHousing = normalizeHousingInput(inputs.housing);
                        const year = normalizedHousing.year ?? 2026;
                        const rulesRes = await fetch(`/api/housing/rules?year=${year}`);
                        if (rulesRes.ok) {
                            const rules = await rulesRes.json();
                            modules.push(createHousingPurchaseModule({ input: normalizedHousing, rules }));
                        }
                    } catch (e) {
                        console.warn("Could not load housing rules for projection", e);
                    }
                }

                // 2. Portfolio (From Snapshot)
                if (snapshot?.holdings && snapshot.holdings.length > 0) {
                    // Map snapshot holdings to engine input
                }

                // 3. Debt (From Snapshot + Manual Input Overrides)
                const debtInputs: any[] = [];

                if (snapshot?.debts && snapshot.debts.length > 0) {
                    snapshot.debts.forEach(d => {
                        // Skip backend SU debt if we have manual local suDebt inputs
                        if (d.kind === "SU" && inputs?.suDebt) {
                            return; 
                        }

                        let interestRateAnnual = d.interestRate;
                        let interestRateFuture = undefined;
                        let interestRateSwitchDate = undefined;
                        let gracePeriodEnd = d.repaymentStartDate ? d.repaymentStartDate.substring(0, 7) : undefined;
                        let accumulateInterest = false;

                        // Apply standard snapshot SU logic as fallback
                        if (d.kind === "SU") {
                            accumulateInterest = true;
                            const studyEnd = inputs?.education?.studyEndDate; 
                            const suRateStudy = inputs?.education?.suInterestRateStudy ?? 0.04;
                            const suRateRepay = inputs?.education?.suInterestRateRepayment ?? 0.026;

                            if (studyEnd) {
                                const studyYear = parseInt(studyEnd.split('-')[0]);
                                gracePeriodEnd = `${studyYear + 2}-01`;
                                interestRateAnnual = suRateStudy;
                                interestRateFuture = suRateRepay;
                                interestRateSwitchDate = studyEnd.substring(0, 7);
                            }
                        }

                        debtInputs.push({
                            id: d.id,
                            name: d.name,
                            principal: d.balance,
                            interestRateAnnual,
                            interestRateFuture,
                            interestRateSwitchDate,
                            gracePeriodEnd,
                            accumulateInterest,
                        });
                    });
                }

                // Inject Manual SU Debt from Inputs!
                if (inputs?.suDebt) {
                    // Future payouts acts as manual drawdowns, but the engine models them differently.
                    // For now, we add them to the starting balance if the startMonth is AFTER the payout.
                    // But if the payouts happen during the engine run, they need to be injected into the engine.
                    // The engine's DebtModule does not support future principal *increases* out of the box dynamically via monthly cashflows yet,
                    // but we can pass the starting balance + payouts directly if they are very near term, or assume it's just part of the initial balance for simplicity.
                    // The user specifically wants to see them added in May/June.
                    // Since DebtModule doesn't support 'future payouts' out of the box, we will add them to the initial principal right now to ensure the P&L tracks the worst-case debt load.
                    
                    const totalFuturePayouts = inputs.suDebt.futurePayouts.reduce((acc, p) => acc + p.amount, 0);

                    debtInputs.push({
                        id: 'manual-su-debt',
                        name: 'SU Gæld',
                        principal: inputs.suDebt.currentBalance + totalFuturePayouts,
                        interestRateAnnual: inputs.suDebt.interestRateStudy,
                        interestRateFuture: inputs.suDebt.interestRateRepayment,
                        interestRateSwitchDate: inputs.suDebt.repaymentStartDate,
                        gracePeriodEnd: inputs.suDebt.useGracePeriod ? undefined : inputs.suDebt.repaymentStartDate, 
                        accumulateInterest: true,
                    });
                }

                if (debtInputs.length > 0) {
                    modules.push(createDebtModule({ debts: debtInputs }));
                }

                // 4. Income & Growth
                // Default bonus path if none exists
                const defaultBonusPath = Array(10).fill(
                    (inputs?.baseline?.annualBonus ?? 0) / (inputs?.baseline?.monthlyGrossIncome ? inputs.baseline.monthlyGrossIncome * 12 : 582000)
                ).map(p => isNaN(p) ? 0 : p);

                const incomeModule = createIncomeModule({
                    startingSalary: Number(inputs?.baseline?.monthlyGrossIncome ?? 48500),
                    yearlyGrowth: (inputs?.salary_growth_path?.yearlyPct ?? []).map(p => Number(p || 0)),
                    yearlyBonusPct: (inputs?.bonus_growth_path?.yearlyPct ?? defaultBonusPath).map(p => Number(p || 0)),
                });
                modules.push(incomeModule);

                // 5. Portfolio (Investment contribution logic)
                const savingsRate = inputs?.baseline?.savingsRatePct ?? 0;
                let monthlyContribution = Number(inputs?.baseline?.monthlyLiquidSavings ?? 5000);

                if (savingsRate > 0) {
                    // If percentage is set, we estimate contribution from net income
                    // This is a simplified client-side check for UI responsiveness
                    const estimatedNet = Number(inputs?.baseline?.monthlyDisposableIncomeBeforeHousing ?? 35000);
                    monthlyContribution = estimatedNet * savingsRate;
                }

                const portfolioModule = createPortfolioModule({
                    holdings: snapshot?.holdings?.map((h: any) => ({
                        id: h.id,
                        name: h.name,
                        currentValue: Number(h.quantity || 0) * Number(h.avgCost || 0),
                        expectedReturnAnnual: inputs?.return_assumptions?.equityPct ?? 0.07,
                        type: 'DEPOT' // default
                    })) || [],
                    monthlyContribution: monthlyContribution
                });
                modules.push(portfolioModule);

                const engineInput: ProjectionInput = {
                    horizon: {
                        startMonth,
                        months: Number(inputs?.months ?? 120), // default 10 Years
                    },
                    startingBalanceSheet: {
                        cash: Number(snapshot?.cash ?? 0),
                        portfolioValue: snapshot?.holdings?.reduce((sum: number, h: any) => {
                            const val = (Number(h.quantity || 0) * Number(h.avgCost || 0));
                            return sum + (isNaN(val) ? 0 : val);
                        }, 0) ?? 0,
                        homeValue: Number(inputs?.housing?.currentValue ?? 0),
                        mortgageBalance: Number(inputs?.housing?.mortgage?.balance ?? 0),
                        bankLoanBalance: Number(inputs?.housing?.bankLoan?.balance ?? 0),
                        otherAssets: 0,
                        otherLiabilities: 0
                    },
                    baseline: {
                        monthlyDisposableIncomeBeforeHousing: Number(inputs?.baseline?.monthlyDisposableIncomeBeforeHousing ?? 35000),
                        monthlyNonHousingExpenses: Number(inputs?.baseline?.monthlyNonHousingExpenses ?? 20000),
                        annualIncomeIncreasePercent: 0
                    } as any,
                    modules
                };

                const result = runProjection(engineInput);
                setProjection(result);

            } catch (e) {
                console.error("Projection Failed", e);
            }
        }

        run();

    }, [inputs, snapshot]);

    const triggerSave = useCallback((next: SimulationInputs) => {
        setSaving(true);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await fetch('/api/inputs', {
                    method: 'POST',
                    body: JSON.stringify(next)
                });
                setSaving(false);
            } catch (e) {
                console.error("Auto-save failed", e);
                setSaving(false);
            }
        }, 1000);
    }, []);

    // Update & Auto-Save
    const updateInputs = useCallback((partial: Partial<SimulationInputs>) => {
        setInputs(prev => {
            const next = { ...prev, ...partial } as SimulationInputs;
            if (partial.housing !== undefined) {
                next.housing = normalizeHousingInput(next.housing);
            }
            triggerSave(next);
            return next;
        });
    }, [triggerSave]);

    const applyCareerPreset = useCallback((track: string, pivot: boolean = false) => {
        setInputs(prev => {
            if (!prev) return prev;

            const preset = CAREER_PRESETS[track];
            if (!preset && track !== 'manual') return prev;

            const newBaseline = { ...prev.baseline };

            if (preset) {
                newBaseline.monthlyGrossIncome = preset.monthlyGrossIncome;
                newBaseline.pensionContributionRate = preset.pensionContributionRate;
                newBaseline.annualBonus = preset.annualBonus;
            }

            let growthPath = preset ? [...preset.growthPath] : (prev.salary_growth_path?.yearlyPct || []);
            let bonusPath = preset ? [...preset.bonusPath] : (prev.bonus_growth_path?.yearlyPct || []);

            // Refined Pivot logic
            if (pivot && track.startsWith('danske_ib')) {
                const pePreset = CAREER_PRESETS.danish_pe;
                // Year 1, 2 = IB
                const ibGrowth1 = preset.growthPath[0];
                const ibGrowth2 = preset.growthPath[1];
                const ibBonus1 = preset.bonusPath[0];
                const ibBonus2 = preset.bonusPath[1];

                // Estimate jump to PE (~85k) from where they are after 3 years
                // If Moderate: 48.5k -> 50.7k -> 66.2k (Y3). Jump to 85k = ~28.4%
                // If Aggressive: 48.5k -> 66k -> 70k (Y3). Jump to 85k = ~21.4%
                const currentY3Base = 48500 * (1 + ibGrowth1) * (1 + ibGrowth2);
                const jumpToPE = (85000 / currentY3Base) - 1;

                growthPath = [
                    ibGrowth1,
                    ibGrowth2,
                    jumpToPE,
                    pePreset.growthPath[1], // Y5 is roughly same growth
                    pePreset.growthPath[2],
                    pePreset.growthPath[3],
                    pePreset.growthPath[4],
                    pePreset.growthPath[5],
                    pePreset.growthPath[6],
                ];

                bonusPath = [
                    ibBonus1,
                    ibBonus2,
                    pePreset.bonusPath[0], // Y3 (Pivot Year starts PE bonus)
                    pePreset.bonusPath[1],
                    pePreset.bonusPath[2],
                    pePreset.bonusPath[3],
                    pePreset.bonusPath[4],
                    pePreset.bonusPath[5],
                    pePreset.bonusPath[6],
                    pePreset.bonusPath[7],
                ];
            }

            const next = {
                ...prev,
                careerTrack: track as any,
                careerPivot: pivot,
                baseline: newBaseline as any,
                salary_growth_path: {
                    model: track === 'manual' ? 'standard' : 'career_preset',
                    yearlyPct: growthPath
                },
                bonus_growth_path: {
                    model: track === 'manual' ? 'standard' : 'career_preset',
                    yearlyPct: bonusPath
                }
            };

            triggerSave(next as any);
            return next;
        });
    }, [triggerSave]);

    const applyBudgetPreset = useCallback((presetId: keyof typeof BUDGET_PRESETS) => {
        setInputs(prev => {
            if (!prev) return prev;
            const preset = BUDGET_PRESETS[presetId];
            if (!preset) return prev;

            const totalMonthly = preset.categories.reduce((acc, c) => acc + c.amount, 0);

            const currentYear = new Date().getFullYear();
            const newEvents = preset.events.map(e => ({
                id: Math.random().toString(36).substr(2, 9),
                name: e.name,
                year: currentYear,
                amount: e.amount,
                type: e.type
            }));

            const next = {
                ...prev,
                budget_categories: preset.categories as any,
                baseline: {
                    ...prev.baseline,
                    monthlyNonHousingExpenses: totalMonthly
                },
                events: [
                    ...(prev.events || []),
                    ...newEvents
                ]
            } as any;

            triggerSave(next);
            return next;
        });
    }, [triggerSave]);

    return {
        inputs,
        snapshot,
        projection,
        loading,
        saving,
        updateInputs,
        applyCareerPreset,
        applyBudgetPreset,
    };
}
