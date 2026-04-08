import { Home, Landmark, Hammer, Key, Wallet, ShieldCheck, Scale, Receipt, Info, ArrowRight, Calculator, Building, Gauge, TrendingDown, BookOpen, X, Play, ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { simulateHomePurchase, HousingRules } from "@/src/housing";
import { formatDKK } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useProjectionModel } from "@/hooks/use-projection-model";
import { FormField } from "./shared";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { calcReportCostBreakdown, createDefaultHousingInput, DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS, deriveLoanSplit, normalizeHousingInput } from "@/src/housing/defaults";

type LiveRateProductType = "Obligationslån" | "FKort" | "TilpasningslånF5";

interface LiveRateOffer {
    productType: LiveRateProductType;
    label: string;
    title: string;
    source: string;
    fallback: boolean;
    fetchedAt: string;
    loanType: string | null;
    rateAdjustment: string | null;
    nominalRatePct: number | null;
    debtorRatePct: number | null;
    contributionRatePct: number | null;
    effectiveRatePct: number | null;
    bondPrice: number | null;
    monthlyPaymentBeforeTax: number | null;
    monthlyPaymentAfterTax: number | null;
    monthlyContribution: number | null;
}

interface LiveRateResponse {
    fetchedAt: string;
    source: string;
    warnings: string[];
    offers: LiveRateOffer[];
    bankLoanBenchmark: {
        source: string;
        methodology: string;
        referenceRatePct: number | null;
        assumedSpreadPct: number;
        indicativeRatePct: number | null;
    };
}

const PRODUCT_TO_LOAN_TYPE: Record<LiveRateProductType, "FAST" | "F_KORT" | "F5"> = {
    Obligationslån: "FAST",
    FKort: "F_KORT",
    TilpasningslånF5: "F5",
};

const LOAN_TYPE_TO_PRODUCT: Record<"FAST" | "F_KORT" | "F5", LiveRateProductType> = {
    FAST: "Obligationslån",
    F_KORT: "FKort",
    F5: "TilpasningslånF5",
};

function formatPercent(value: number | null | undefined, digits = 2): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return "-";
    }
    return `${value.toFixed(digits)}%`;
}

function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return "-";
    }
    return formatDKK(value);
}

function formatDateTimeDa(value: string | null | undefined): string {
    if (!value) return "ukendt tidspunkt";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "ukendt tidspunkt";

    return new Intl.DateTimeFormat("da-DK", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export function HousingPlanTab() {
    const { inputs, updateInputs, loading: modelLoading } = useProjectionModel();
    const [rules, setRules] = useState<HousingRules | null>(null);
    const [viewMode, setViewMode] = useState<'PLAN' | 'REPAYMENT' | 'LIVE_RATES'>('PLAN');
    const [showLineage, setShowLineage] = useState(false);
    const [liveRates, setLiveRates] = useState<LiveRateResponse | null>(null);
    const [liveRatesLoading, setLiveRatesLoading] = useState(false);
    const [liveRatesError, setLiveRatesError] = useState<string | null>(null);

    const loading = modelLoading || !inputs;

    useEffect(() => {
        fetch('/api/housing/rules?year=2026')
            .then(res => res.json())
            .then(data => setRules(data))
            .catch(err => console.error("Failed to load housing rules:", err));
    }, []);

    const defaultHousing = useMemo(() => createDefaultHousingInput(2026), []);
    const housing = useMemo(
        () => normalizeHousingInput(inputs?.housing || defaultHousing),
        [inputs?.housing, defaultHousing]
    );

    const baseline = useMemo(() => ({
        propertyTaxRate: housing.budgetIntegration?.propertyTaxRate ?? 0.0051,
        landTaxRate: housing.budgetIntegration?.landTaxRate ?? 0.008,
        utilities: housing.budgetIntegration?.utilities ?? 2500,
        insurance: housing.budgetIntegration?.insurance ?? 500,
        associationFees: housing.budgetIntegration?.associationFees ?? 0,
        monthlyDisposableIncomeBeforeHousing: housing.budgetIntegration?.monthlyDisposableIncomeBeforeHousing || 40000
    }), [housing]);

    const reportCosts = useMemo(() => calcReportCostBreakdown(housing), [housing]);
    const fundingSplit = useMemo(() => deriveLoanSplit({
        price: housing.purchase?.price || 0,
        downPaymentCash: housing.purchase?.downPaymentCash || 0,
        mortgageLtvMax: housing.financing?.mortgage?.ltvMax ?? 0.8,
        mortgageEnabled: housing.financing?.mortgage?.enabled !== false,
        bankLoanEnabled: housing.financing?.bankLoan?.enabled !== false
    }), [housing]);

    const calculation = useMemo(() => {
        if (!rules) return null;
        return simulateHomePurchase(housing, rules);
    }, [housing, rules]);
    const bankLoanEndYear = Math.max(1, housing.financing?.bankLoan?.termYears || 20);

    // Helpers
    const commitHousing = (nextHousing: any) => {
        updateInputs({ housing: normalizeHousingInput(nextHousing) });
    };

    const updatePurchase = (p: Partial<typeof housing.purchase>) => {
        commitHousing({
            ...housing,
            purchase: { ...housing.purchase, ...p }
        });
    };

    const updateMortgage = (m: Partial<typeof housing.financing.mortgage>) => {
        commitHousing({
            ...housing,
            financing: {
                ...housing.financing,
                mortgage: { ...housing.financing.mortgage, ...m }
            }
        });
    };

    const updateBankLoan = (b: Partial<typeof housing.financing.bankLoan>) => {
        commitHousing({
            ...housing,
            financing: {
                ...housing.financing,
                bankLoan: { ...housing.financing.bankLoan, ...b }
            }
        });
    };

    const updateReportCostAssumption = (
        key: keyof typeof DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS,
        value: number
    ) => {
        const safeValue = Number.isFinite(value) ? value : 0;
        commitHousing({
            ...housing,
            transactionCosts: {
                ...housing.transactionCosts,
                reportAssumptions: {
                    ...DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS,
                    ...(housing.transactionCosts?.reportAssumptions || {}),
                    [key]: safeValue
                }
            }
        });
    };

    const setBaseline = (key: string, value: number) => {
        const safeValue = Number.isFinite(value) ? value : 0;
        commitHousing({
            ...housing,
            budgetIntegration: {
                ...housing.budgetIntegration,
                [key]: safeValue
            }
        });
    };

    const setPresetSplit80155 = () => {
        const price = housing.purchase?.price || 0;
        commitHousing({
            ...housing,
            purchase: {
                ...housing.purchase,
                downPaymentCash: Math.round(price * 0.05)
            },
            financing: {
                ...housing.financing,
                mortgage: {
                    ...housing.financing.mortgage,
                    enabled: true,
                    ltvMax: 0.8
                },
                bankLoan: {
                    ...housing.financing.bankLoan,
                    enabled: true
                }
            }
        });
    };

    const liveRateQuery = useMemo(() => {
        const params = new URLSearchParams({
            price: String(Math.max(0, Math.round(housing.purchase?.price || 0))),
            downPayment: String(Math.max(0, Math.round(housing.purchase?.downPaymentCash || 0))),
            mortgageTermYears: String(Math.max(1, Math.round(housing.financing?.mortgage?.termYears || 30))),
            mortgageIoYears: String(Math.max(0, Math.round(housing.financing?.mortgage?.ioYears || 0))),
            bankTermYears: String(Math.max(1, Math.round(housing.financing?.bankLoan?.termYears || 20))),
        });
        return params.toString();
    }, [
        housing.purchase?.price,
        housing.purchase?.downPaymentCash,
        housing.financing?.mortgage?.termYears,
        housing.financing?.mortgage?.ioYears,
        housing.financing?.bankLoan?.termYears,
    ]);

    const fetchLiveRates = useCallback(async (background = false) => {
        if (!background) {
            setLiveRatesLoading(true);
        }
        setLiveRatesError(null);

        try {
            const response = await fetch(`/api/housing/live-rates?${liveRateQuery}`, { cache: "no-store" });
            if (!response.ok) {
                const payload = await response.json().catch(() => null) as { error?: string } | null;
                throw new Error(payload?.error ?? "Kunne ikke hente live renter.");
            }

            const payload = await response.json() as LiveRateResponse;
            setLiveRates(payload);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Kunne ikke hente live renter.";
            setLiveRatesError(message);
        } finally {
            if (!background) {
                setLiveRatesLoading(false);
            }
        }
    }, [liveRateQuery]);

    useEffect(() => {
        if (viewMode !== 'LIVE_RATES') return;

        void fetchLiveRates();
        const pollId = window.setInterval(() => {
            void fetchLiveRates(true);
        }, 5 * 60 * 1000);

        return () => window.clearInterval(pollId);
    }, [fetchLiveRates, viewMode]);

    const selectedLiveProduct = useMemo(() => {
        const currentLoanType = housing.financing?.mortgage?.loanType;
        if (!currentLoanType || !(currentLoanType in LOAN_TYPE_TO_PRODUCT)) return null;

        const liveProductType = LOAN_TYPE_TO_PRODUCT[currentLoanType as "FAST" | "F_KORT" | "F5"];
        return liveRates?.offers.find((offer) => offer.productType === liveProductType) ?? null;
    }, [housing.financing?.mortgage?.loanType, liveRates]);

    const applyLiveMortgageOffer = (offer: LiveRateOffer) => {
        const nextLoanType = PRODUCT_TO_LOAN_TYPE[offer.productType];
        const nextMortgage: Partial<typeof housing.financing.mortgage> = {
            loanType: nextLoanType,
        };

        if (offer.nominalRatePct !== null) {
            nextMortgage.bondRateNominalAnnual = offer.nominalRatePct / 100;
        }
        if (offer.contributionRatePct !== null) {
            nextMortgage.contributionRateAnnual = offer.contributionRatePct / 100;
        }

        updateMortgage(nextMortgage);
    };

    const applyBankBenchmarkRate = () => {
        const indicativeRatePct = liveRates?.bankLoanBenchmark?.indicativeRatePct;
        if (indicativeRatePct === null || indicativeRatePct === undefined) return;
        updateBankLoan({ rateNominalAnnual: indicativeRatePct / 100 });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1400px] animate-fade-in-up relative">

            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">

                {/* View Toggles */}
                <div className="flex gap-4 border-b border-brand-border/50 pb-4">
                    <button
                        onClick={() => setViewMode('PLAN')}
                        className={cn(
                            "group text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-xl transition-all relative overflow-hidden",
                            viewMode === 'PLAN' ? "text-brand-text1" : "text-brand-text3 hover:text-brand-text1"
                        )}
                    >
                        {viewMode === 'PLAN' && (
                            <motion.div layoutId="activeTab" className="absolute inset-0 bg-brand-surface2 rounded-xl -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                        )}
                        <Calculator className={cn("w-4 h-4 transition-transform group-hover:scale-110", viewMode === 'PLAN' ? "text-brand-primary" : "text-brand-text3")} />
                        Købsplan
                    </button>
                    <button
                        onClick={() => setViewMode('REPAYMENT')}
                        className={cn(
                            "group text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-xl transition-all relative overflow-hidden",
                            viewMode === 'REPAYMENT' ? "text-brand-text1" : "text-brand-text3 hover:text-brand-text1"
                        )}
                    >
                        {viewMode === 'REPAYMENT' && (
                            <motion.div layoutId="activeTab" className="absolute inset-0 bg-brand-surface2 rounded-xl -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                        )}
                        <TrendingDown className={cn("w-4 h-4 transition-transform group-hover:scale-110", viewMode === 'REPAYMENT' ? "text-brand-accent" : "text-brand-text3")} />
                        Afdragsplan
                    </button>
                    <button
                        onClick={() => setViewMode('LIVE_RATES')}
                        className={cn(
                            "group text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-xl transition-all relative overflow-hidden",
                            viewMode === 'LIVE_RATES' ? "text-brand-text1" : "text-brand-text3 hover:text-brand-text1"
                        )}
                    >
                        {viewMode === 'LIVE_RATES' && (
                            <motion.div layoutId="activeTab" className="absolute inset-0 bg-brand-surface2 rounded-xl -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                        )}
                        <Play className={cn("w-4 h-4 transition-transform group-hover:scale-110", viewMode === 'LIVE_RATES' ? "text-brand-primary" : "text-brand-text3")} />
                        Live renter
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={() => setShowLineage(true)}
                        className="text-xs font-bold text-brand-accent flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-accent/20 hover:bg-brand-accent/5 transition-all shadow-sm hover:shadow-brand-accent/10"
                    >
                        <BookOpen className="w-3 h-3" />
                        Kilder og antagelser
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={viewMode}
                        initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                        transition={{ duration: 0.3, ease: "circOut" }}
                    >


                        {viewMode === 'PLAN' ? (
                            <div className="space-y-10">
                                {/* Købsplan */}
                                <motion.div
                                    whileHover={{ y: -2 }}
                                    className="bg-brand-surface/80 backdrop-blur-xl border border-brand-border/40 rounded-3xl p-8 shadow-premium overflow-hidden relative group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex items-center gap-3 mb-8 relative">
                                        <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary shadow-sm">
                                            <Home className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-brand-text1 tracking-tight">Købsstrategi</h3>
                                            <p className="text-xs text-brand-text3">Definer bolig, udbetaling og finansieringsmix</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative text-brand-text3">
                                        <FormField label="Boligpris">
                                            <div className="relative group/input">
                                                <input
                                                    type="number"
                                                    value={housing.purchase?.price || 0}
                                                    onChange={e => updatePurchase({ price: Number(e.target.value) })}
                                                    className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 backdrop-blur-sm pl-4 pr-12 py-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary/50 transition-all font-semibold text-brand-text2"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-40 group-focus-within/input:opacity-100 group-focus-within/input:text-brand-primary transition-all">
                                                    DKK
                                                </div>
                                            </div>
                                        </FormField>
                                        <FormField label="Kontant udbetaling">
                                            <div className="relative group/input">
                                                <input
                                                    type="number"
                                                    value={housing.purchase?.downPaymentCash || 0}
                                                    onChange={e => updatePurchase({ downPaymentCash: Number(e.target.value) })}
                                                    className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 backdrop-blur-sm pl-4 pr-12 py-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary/50 transition-all font-semibold text-brand-text2"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-40 group-focus-within/input:opacity-100 group-focus-within/input:text-brand-primary transition-all">
                                                    DKK
                                                </div>
                                            </div>
                                        </FormField>
                                        <FormField label="Finansieringsfordeling">
                                            <div className="rounded-xl border border-brand-border bg-brand-surface2/50 p-4 space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-brand-text3">Realkredit</span>
                                                    <span className="font-bold text-brand-text1">
                                                        {((fundingSplit.mortgagePrincipal / Math.max(1, housing.purchase?.price || 1)) * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-brand-text3">Banklån</span>
                                                    <span className="font-bold text-brand-text1">
                                                        {((fundingSplit.bankPrincipal / Math.max(1, housing.purchase?.price || 1)) * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-brand-text3">Egenbetaling</span>
                                                    <span className="font-bold text-brand-text1">
                                                        {(((housing.purchase?.downPaymentCash || 0) / Math.max(1, housing.purchase?.price || 1)) * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={setPresetSplit80155}
                                                    className="w-full mt-2 rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-brand-accent hover:bg-brand-accent/15"
                                                >
                                                    Brug 80 / 15 / 5
                                                </button>
                                            </div>
                                        </FormField>
                                    </div>
                                </motion.div>

                                {/* Finansieringskort */}
                                <motion.div
                                    whileHover={{ y: -2 }}
                                    className="bg-brand-surface/80 backdrop-blur-xl border border-brand-border/40 rounded-3xl p-8 shadow-premium overflow-hidden relative group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex items-center gap-3 mb-8 relative">
                                        <div className="p-2.5 bg-brand-accent/10 rounded-xl text-brand-accent shadow-sm">
                                            <Landmark className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-brand-text1 tracking-tight">Finansiering og realkredit</h3>
                                            <p className="text-xs text-brand-text3">Valg af lånetype, renter og løbetider</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                                        <div className="space-y-8">
                                            <FormField label="Realkreditprodukt">
                                                <div className="flex gap-2 p-1 bg-brand-surface2/50 border border-brand-border rounded-xl mt-1">
                                                    {([
                                                        { id: 'FAST', label: 'Fast rente' },
                                                        { id: 'F5', label: 'F5' },
                                                        { id: 'F_KORT', label: 'F-kort' }
                                                    ] as const).map(v => (
                                                        <button
                                                            key={v.id}
                                                            onClick={() => updateMortgage({ loanType: v.id })}
                                                            className={cn(
                                                                "flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all",
                                                                housing.financing?.mortgage?.loanType === v.id
                                                                    ? "bg-brand-accent text-brand-textInvert shadow-soft"
                                                                    : "text-brand-text3 hover:text-brand-text1 hover:bg-brand-surface"
                                                            )}
                                                        >
                                                            {v.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </FormField>

                                            <FormField label="Realkreditrente (%)">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex-1 px-2">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="10"
                                                            step="0.1"
                                                            value={(housing.financing?.mortgage?.bondRateNominalAnnual || 0) * 100}
                                                            onChange={e => updateMortgage({ bondRateNominalAnnual: Number(e.target.value) / 100 })}
                                                            className="w-full h-1 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-accent"
                                                        />
                                                    </div>
                                                    <span className="text-sm font-black tabular-nums min-w-[3rem] text-right text-brand-accent bg-brand-accent/5 px-2 py-1 rounded-lg">
                                                        {((housing.financing?.mortgage?.bondRateNominalAnnual || 0) * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </FormField>

                                            <FormField label="Bidragssats (årlig %)">
                                                <div className="space-y-3">
                                                    <div className="flex gap-2 p-1 bg-brand-surface2/50 border border-brand-border rounded-xl">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateMortgage({ contributionRateAnnual: undefined })}
                                                            className={cn(
                                                                "flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                                                                housing.financing?.mortgage?.contributionRateAnnual === undefined
                                                                    ? "bg-brand-accent text-brand-textInvert shadow-soft"
                                                                    : "text-brand-text3 hover:text-brand-text1 hover:bg-brand-surface"
                                                            )}
                                                        >
                                                            Automatisk
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateMortgage({ contributionRateAnnual: housing.financing?.mortgage?.contributionRateAnnual ?? 0.0075 })}
                                                            className={cn(
                                                                "flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                                                                housing.financing?.mortgage?.contributionRateAnnual !== undefined
                                                                    ? "bg-brand-accent text-brand-textInvert shadow-soft"
                                                                    : "text-brand-text3 hover:text-brand-text1 hover:bg-brand-surface"
                                                            )}
                                                        >
                                                            Manuel
                                                        </button>
                                                    </div>
                                                    <div className="relative group/input">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.001"
                                                            value={housing.financing?.mortgage?.contributionRateAnnual !== undefined ? ((housing.financing?.mortgage?.contributionRateAnnual || 0) * 100).toFixed(3) : ""}
                                                            onChange={(e) => {
                                                                const raw = e.target.value;
                                                                if (raw === "") {
                                                                    updateMortgage({ contributionRateAnnual: undefined });
                                                                    return;
                                                                }
                                                                const nextRate = Math.max(0, Number(raw)) / 100;
                                                                updateMortgage({ contributionRateAnnual: nextRate });
                                                            }}
                                                            className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 backdrop-blur-sm pl-3 pr-8 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all text-brand-text2"
                                                            placeholder="Automatisk via trappemodel"
                                                        />
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] opacity-30 font-bold group-focus-within/input:opacity-100 transition-opacity">%</div>
                                                    </div>
                                                    <p className="text-[10px] text-brand-text3/80">
                                                        {housing.financing?.mortgage?.contributionRateAnnual === undefined
                                                            ? "Automatisk trappemodel anvendes baseret på aktuel LTV."
                                                            : "Manuel bidragssats er aktiv."}
                                                    </p>
                                                </div>
                                            </FormField>
                                        </div>

                                        <div className="space-y-8">
                                            <FormField label="Afdragsfri periode">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex-1 px-2">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="10"
                                                            step="1"
                                                            value={housing.financing?.mortgage?.ioYears || 0}
                                                            onChange={e => updateMortgage({ ioYears: Number(e.target.value), amortizationProfile: Number(e.target.value) > 0 ? 'IO' : 'FULL' })}
                                                            className="w-full h-1 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-accent"
                                                        />
                                                    </div>
                                                    <span className="text-sm font-black tabular-nums min-w-[3rem] text-right text-brand-text1 bg-brand-surface2 px-2 py-1 rounded-lg border border-brand-border/40">
                                                        {housing.financing?.mortgage?.ioYears || 0} år
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-brand-text3/70 italic mt-2 leading-tight">
                                                    Ydelseschok i år {(housing.financing?.mortgage?.ioYears || 0) + 1}.
                                                </p>
                                            </FormField>

                                            <FormField label="Løbetid realkredit">
                                                <div className="relative group">
                                                    <select
                                                        value={housing.financing?.mortgage?.termYears}
                                                        onChange={e => updateMortgage({ termYears: Number(e.target.value) })}
                                                        className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 backdrop-blur-sm px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all appearance-none cursor-pointer text-brand-text2"
                                                    >
                                                        <option value={30}>30 år (standard)</option>
                                                        <option value={20}>20 år</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </FormField>
                                        </div>
                                    </div>

                                    <div className="mt-10 border-t border-brand-border/40 pt-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-[11px] font-black uppercase tracking-wider text-brand-text2">Banklån (15%)</h4>
                                            <button
                                                type="button"
                                                onClick={() => updateBankLoan({ enabled: !housing.financing.bankLoan.enabled })}
                                                className={cn(
                                                    "rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wide border",
                                                    housing.financing.bankLoan.enabled
                                                        ? "border-brand-accent/40 bg-brand-accent/10 text-brand-accent"
                                                        : "border-brand-border text-brand-text3"
                                                )}
                                            >
                                                {housing.financing.bankLoan.enabled ? "Aktiv" : "Inaktiv"}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <FormField label="Banklånsrente (%)">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex-1 px-2">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="12"
                                                            step="0.1"
                                                            value={(housing.financing.bankLoan.rateNominalAnnual || 0) * 100}
                                                            onChange={e => updateBankLoan({ rateNominalAnnual: Number(e.target.value) / 100 })}
                                                            className="w-full h-1 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-accent"
                                                            disabled={!housing.financing.bankLoan.enabled}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-black tabular-nums min-w-[3.5rem] text-right text-brand-accent bg-brand-accent/5 px-2 py-1 rounded-lg">
                                                        {((housing.financing.bankLoan.rateNominalAnnual || 0) * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </FormField>
                                            <FormField label="Løbetid banklån">
                                                <div className="relative group">
                                                    <select
                                                        value={housing.financing.bankLoan.termYears}
                                                        onChange={e => updateBankLoan({ termYears: Number(e.target.value) })}
                                                        className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 backdrop-blur-sm px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all appearance-none cursor-pointer text-brand-text2 disabled:opacity-50"
                                                        disabled={!housing.financing.bankLoan.enabled}
                                                    >
                                                        <option value={30}>30 år</option>
                                                        <option value={20}>20 år (standard)</option>
                                                        <option value={15}>15 år</option>
                                                        <option value={10}>10 år</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </FormField>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Løbende ejeromkostninger */}
                                <motion.div
                                    whileHover={{ y: -2 }}
                                    className="bg-brand-surface/80 backdrop-blur-xl border border-brand-border/40 rounded-3xl p-8 shadow-premium overflow-hidden relative group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-secondary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex items-center gap-3 mb-8 relative">
                                        <div className="p-2.5 bg-brand-secondary/10 rounded-xl text-brand-secondary shadow-sm">
                                            <Scale className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-brand-text1 tracking-tight">Løbende ejeromkostninger</h3>
                                            <p className="text-xs text-brand-text3">Drift, forsikring og lokale boligskatter</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase text-brand-text3 tracking-wider mb-2 opacity-50">Skatter og offentlige afgifter</h4>
                                            <FormField label="Ejendomsværdiskat">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex-1 px-2">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="2"
                                                            step="0.01"
                                                            value={(baseline.propertyTaxRate || rules?.defaults?.propertyTaxRate || 0) * 100}
                                                            onChange={e => setBaseline('propertyTaxRate', Number(e.target.value) / 100)}
                                                            className="w-full h-1 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-secondary"
                                                        />
                                                    </div>
                                                    <span className="text-xs font-black tabular-nums min-w-[3.5rem] text-right text-brand-secondary bg-brand-secondary/5 px-2 py-1 rounded-lg">
                                                        {((baseline.propertyTaxRate || rules?.defaults?.propertyTaxRate || 0) * 100).toFixed(2)}%
                                                    </span>
                                                </div>
                                            </FormField>
                                            <FormField label="Grundskyld">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex-1 px-2">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="30"
                                                            step="0.1"
                                                            value={(baseline.landTaxRate || rules?.defaults?.landTaxRate || 0) * 1000}
                                                            onChange={e => setBaseline('landTaxRate', Number(e.target.value) / 1000)}
                                                            className="w-full h-1 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-secondary"
                                                        />
                                                    </div>
                                                    <span className="text-xs font-black tabular-nums min-w-[3.5rem] text-right text-brand-secondary bg-brand-secondary/5 px-2 py-1 rounded-lg">
                                                        {((baseline.landTaxRate || rules?.defaults?.landTaxRate || 0) * 1000).toFixed(1)}‰
                                                    </span>
                                                </div>
                                            </FormField>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase text-brand-text3 tracking-wider mb-2 opacity-50">Detaljeret drift (pr. måned)</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField label="Forsyning">
                                                    <div className="relative group/input">
                                                        <input
                                                            type="number"
                                                            value={baseline.utilities || 0}
                                                            onChange={e => setBaseline('utilities', Number(e.target.value))}
                                                            className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 backdrop-blur-sm pl-3 pr-8 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-secondary/30 transition-all text-brand-text2"
                                                            placeholder="2500"
                                                        />
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] opacity-30 font-bold group-focus-within/input:opacity-100 transition-opacity">kr.</div>
                                                    </div>
                                                </FormField>
                                                <FormField label="Forsikring">
                                                    <div className="relative group/input">
                                                        <input
                                                            type="number"
                                                            value={baseline.insurance || 0}
                                                            onChange={e => setBaseline('insurance', Number(e.target.value))}
                                                            className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 backdrop-blur-sm pl-3 pr-8 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-secondary/30 transition-all text-brand-text2"
                                                            placeholder="500"
                                                        />
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] opacity-30 font-bold group-focus-within/input:opacity-100 transition-opacity">kr.</div>
                                                    </div>
                                                </FormField>
                                                <FormField label="Ejerforening">
                                                    <div className="relative group/input">
                                                        <input
                                                            type="number"
                                                            value={baseline.associationFees || 0}
                                                            onChange={e => setBaseline('associationFees', Number(e.target.value))}
                                                            className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 backdrop-blur-sm pl-3 pr-8 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-secondary/30 transition-all text-brand-text2"
                                                            placeholder="0"
                                                        />
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] opacity-30 font-bold group-focus-within/input:opacity-100 transition-opacity">kr.</div>
                                                    </div>
                                                </FormField>
                                                <FormField label="Nettoindkomst for bolig">
                                                    <div className="relative group/input">
                                                        <input
                                                            type="number"
                                                            value={baseline.monthlyDisposableIncomeBeforeHousing || 0}
                                                            onChange={e => setBaseline('monthlyDisposableIncomeBeforeHousing', Number(e.target.value))}
                                                            className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 backdrop-blur-sm pl-3 pr-8 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-secondary/30 transition-all text-brand-text2"
                                                            placeholder="40000"
                                                        />
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] opacity-30 font-bold group-focus-within/input:opacity-100 transition-opacity">kr.</div>
                                                    </div>
                                                </FormField>
                                                <div className="p-3 bg-brand-surface2/50 backdrop-blur-sm border border-brand-border rounded-xl">
                                                    <span className="text-[10px] text-brand-text3 block mb-0.5 opacity-50">Fast drift i alt</span>
                                                    <span className="text-sm font-black text-brand-text1">{formatDKK((baseline.utilities || 0) + (baseline.insurance || 0) + (baseline.associationFees || 0))}</span>
                                                </div>
                                            </div>

                                            {/* Vedligehold */}
                                            <div className="flex items-center justify-between p-3 bg-brand-secondary/5 rounded-xl border border-brand-secondary/10 group/item">
                                                <span className="text-xs font-medium text-brand-text2 group-hover:text-brand-text1 transition-colors">Vedligeholdelsesreserve (1%)</span>
                                                <span className="text-xs font-black text-brand-secondary">{formatDKK((housing.purchase?.price || 0) * 0.01 / 12)}/md</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    whileHover={{ y: -2 }}
                                    className="bg-brand-surface/80 backdrop-blur-xl border border-brand-border/40 rounded-3xl p-8 shadow-premium overflow-hidden relative group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex items-center gap-3 mb-8 relative">
                                        <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary shadow-sm">
                                            <Receipt className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-brand-text1 tracking-tight">Engangsomkostninger (fra research)</h3>
                                            <p className="text-xs text-brand-text3">Kortlagt fra deep-research-report bolig omkostninger.md</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl border border-brand-border bg-brand-surface2/50 mb-6">
                                        <span className="text-xs font-semibold text-brand-text2">Inkluder standard juridiske/oprettelsesomkostninger fra regelsæt</span>
                                        <button
                                            type="button"
                                            onClick={() => commitHousing({
                                                ...housing,
                                                transactionCosts: {
                                                    ...housing.transactionCosts,
                                                    includeDefaultCosts: !housing.transactionCosts.includeDefaultCosts
                                                }
                                            })}
                                            className={cn(
                                                "rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wide border",
                                                housing.transactionCosts.includeDefaultCosts
                                                    ? "border-brand-accent/40 bg-brand-accent/10 text-brand-accent"
                                                    : "border-brand-border text-brand-text3"
                                            )}
                                        >
                                            {housing.transactionCosts.includeDefaultCosts ? "Inkluderet" : "Udeladt"}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField label="Realkredit lånesagsgebyr (DKK)">
                                            <input
                                                type="number"
                                                value={housing.transactionCosts?.reportAssumptions?.mortgageProcessingFee ?? DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS.mortgageProcessingFee}
                                                onChange={e => updateReportCostAssumption('mortgageProcessingFee', Number(e.target.value))}
                                                className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-primary/30 text-brand-text2"
                                            />
                                        </FormField>

                                        <FormField label="Afregningsprovision (%)">
                                            <div className="space-y-2">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={((housing.transactionCosts?.reportAssumptions?.settlementCommissionRate ?? DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS.settlementCommissionRate) * 100).toFixed(2)}
                                                    onChange={e => updateReportCostAssumption('settlementCommissionRate', Number(e.target.value) / 100)}
                                                    className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-primary/30 text-brand-text2"
                                                />
                                                <p className="text-[10px] text-brand-text3">Beregnet beløb: {formatDKK(reportCosts.settlementCommission)}</p>
                                            </div>
                                        </FormField>

                                        <FormField label="Kursfradrag (%)">
                                            <div className="space-y-2">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={((housing.transactionCosts?.reportAssumptions?.payoutDeductionRate ?? DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS.payoutDeductionRate) * 100).toFixed(2)}
                                                    onChange={e => updateReportCostAssumption('payoutDeductionRate', Number(e.target.value) / 100)}
                                                    className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-primary/30 text-brand-text2"
                                                />
                                                <p className="text-[10px] text-brand-text3">Beregnet beløb: {formatDKK(reportCosts.payoutDeduction)}</p>
                                            </div>
                                        </FormField>

                                        <FormField label="Bank dokumentgebyr (DKK)">
                                            <input
                                                type="number"
                                                value={housing.transactionCosts?.reportAssumptions?.bankDocumentFee ?? DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS.bankDocumentFee}
                                                onChange={e => updateReportCostAssumption('bankDocumentFee', Number(e.target.value))}
                                                className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-primary/30 text-brand-text2"
                                            />
                                        </FormField>

                                        <FormField label="Bank Vurderingsgebyr (DKK)">
                                            <input
                                                type="number"
                                                value={housing.transactionCosts?.reportAssumptions?.bankValuationFee ?? DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS.bankValuationFee}
                                                onChange={e => updateReportCostAssumption('bankValuationFee', Number(e.target.value))}
                                                className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-primary/30 text-brand-text2"
                                            />
                                        </FormField>

                                        <div className="rounded-xl border border-brand-border bg-brand-surface2/50 p-4 flex flex-col justify-center">
                                            <p className="text-[10px] uppercase tracking-wide text-brand-text3 mb-1">Samlet engangsomkostning (research)</p>
                                            <p className="text-lg font-black text-brand-text1 tabular-nums">
                                                {formatDKK(
                                                    reportCosts.mortgageProcessingFee +
                                                    reportCosts.settlementCommission +
                                                    reportCosts.payoutDeduction +
                                                    reportCosts.bankDocumentFee +
                                                    reportCosts.bankValuationFee
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        ) : viewMode === 'REPAYMENT' ? (
                            <div className="space-y-10 animate-fade-in-up">
                                {/* 30-års chart */}
                                <div className="bg-brand-surface border border-brand-border/40 rounded-3xl p-8 shadow-premium h-[500px] flex flex-col">
                                    <div className="mb-6 flex justify-between items-end">
                                        <div>
                                            <h3 className="text-base font-bold text-brand-text1">30-års afdragsprofil</h3>
                                            <p className="text-xs text-brand-text3">Årlig omkostningsfordeling på renter, afdrag og bidrag</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-brand-text3">Samlede renteomkostninger</p>
                                            <p className="text-sm font-black text-brand-text1">
                                                {calculation?.amortizationSchedule ? formatDKK(calculation.amortizationSchedule.reduce((a, b) => a + b.mortgageInterest + b.bankInterest + b.mortgageContribution, 0)) : '0 kr.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full">
                                        {calculation?.amortizationSchedule ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart
                                                    data={calculation.amortizationSchedule}
                                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                                >
                                                    <defs>
                                                        <linearGradient id="colorMortPrincipal" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="colorBankPrincipal" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                                    <XAxis dataKey="year" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                                    <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                                    <Tooltip
                                                        content={({ active, payload, label }) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="bg-brand-surface/95 backdrop-blur-xl border border-brand-border/60 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 min-w-[200px]">
                                                                        <div className="flex justify-between items-center border-b border-brand-border/40 pb-2 mb-1">
                                                                            <span className="text-[10px] font-black uppercase text-brand-text3 tracking-widest">År {label}</span>
                                                                            <span className="text-[10px] text-brand-text3 opacity-60">Afdragsplan</span>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            {payload.map((entry: any, index: number) => (
                                                                                <div key={index} className="flex justify-between items-center gap-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: entry.color }} />
                                                                                        <span className="text-[11px] font-bold text-brand-text2">{entry.name}</span>
                                                                                    </div>
                                                                                    <span className="text-[11px] font-black text-brand-text1 tabular-nums">
                                                                                        {formatDKK(entry.value)}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div className="pt-2 border-t border-brand-border/40 flex justify-between items-center">
                                                                            <span className="text-[10px] font-black text-brand-text3 uppercase">Samlet omkostning</span>
                                                                            <span className="text-[11px] font-black text-brand-accent tabular-nums">
                                                                                {formatDKK(payload.reduce((acc: number, entry: any) => acc + (entry.value || 0), 0))}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                    <Area type="monotone" dataKey="mortgageInterest" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} name="Realkreditrente" />
                                                    <Area type="monotone" dataKey="mortgageContribution" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} name="Bidragssats" />
                                                    <Area type="monotone" dataKey="bankInterest" stackId="1" stroke="#a8a29e" fill="#a8a29e" fillOpacity={0.4} name="Banklånsrente" />
                                                    <Area type="monotone" dataKey="mortgagePrincipal" stackId="1" stroke="#10b981" fill="url(#colorMortPrincipal)" fillOpacity={0.8} name="Realkreditafdrag" />
                                                    <Area type="monotone" dataKey="bankPrincipal" stackId="1" stroke="#059669" fill="url(#colorBankPrincipal)" fillOpacity={0.8} name="Bankafdrag" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm text-brand-text3">Ingen beregnede data endnu</div>
                                        )}
                                    </div>
                                </div>

                                {/* Analyse */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Ydelseschok */}
                                    <div className="bg-brand-surface border border-brand-border/40 rounded-3xl p-6">
                                        <h4 className="text-sm font-bold text-brand-text1 mb-4 flex items-center gap-2">
                                            <TrendingDown className="w-4 h-4 text-brand-accent" />
                                            Ydelseschok
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center py-2 border-b border-brand-border/30">
                                                <span className="text-xs text-brand-text3">År 1 (start)</span>
                                                <span className="text-xs font-bold tabular-nums">{calculation?.amortizationSchedule?.[0] ? formatDKK(calculation.amortizationSchedule[0].totalCost / 12) + '/md' : '-'}</span>
                                            </div>
                                            {housing.financing.mortgage.ioYears && housing.financing.mortgage.ioYears > 0 && (
                                                <div className="flex justify-between items-center py-2 border-b border-brand-border/30 bg-red-500/10 -mx-2 px-2 rounded-lg">
                                                    <span className="text-xs text-red-400 font-bold">År {housing.financing.mortgage.ioYears + 1} (afdragsfrihed slutter)</span>
                                                    <span className="text-xs font-black text-red-400 tabular-nums">
                                                        {calculation?.amortizationSchedule?.[housing.financing.mortgage.ioYears]
                                                            ? formatDKK(calculation.amortizationSchedule[housing.financing.mortgage.ioYears].totalCost / 12) + '/md' // Index is year-1, so index 10 is year 11
                                                            : '-'}
                                                        {calculation?.amortizationSchedule && (
                                                            <span className="ml-2 text-[10px] opacity-70">
                                                                (+{((calculation.amortizationSchedule[housing.financing.mortgage.ioYears].totalCost - calculation.amortizationSchedule[0].totalCost) / calculation.amortizationSchedule[0].totalCost * 100).toFixed(0)}%)
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center py-2 border-b border-brand-border/30">
                                                <span className="text-xs text-green-400 font-bold">År {bankLoanEndYear} (banklån afsluttet)</span>
                                                <span className="text-xs font-black text-green-400 tabular-nums">
                                                    {calculation?.amortizationSchedule?.[bankLoanEndYear - 1]
                                                        ? formatDKK(calculation.amortizationSchedule[bankLoanEndYear - 1].totalCost / 12) + '/md'
                                                        : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Omkostningssammensætning */}
                                    <div className="bg-brand-surface border border-brand-border/40 rounded-3xl p-6">
                                        <h4 className="text-sm font-bold text-brand-text1 mb-4">Samlet omkostningssammensætning</h4>
                                        <div className="space-y-2">
                                            {calculation?.amortizationSchedule && (() => {
                                                const total = calculation.amortizationSchedule.reduce((a, b) => a + b.totalCost, 0);
                                                const principal = calculation.amortizationSchedule.reduce((a, b) => a + b.mortgagePrincipal + b.bankPrincipal, 0);
                                                const interest = calculation.amortizationSchedule.reduce((a, b) => a + b.mortgageInterest + b.bankInterest, 0);
                                                const fee = calculation.amortizationSchedule.reduce((a, b) => a + b.mortgageContribution, 0);
                                                return (
                                                    <>
                                                        <div className="h-4 w-full bg-brand-surface2 rounded-full overflow-hidden flex">
                                                            <div style={{ width: `${principal / total * 100}%` }} className="h-full bg-emerald-500" />
                                                            <div style={{ width: `${interest / total * 100}%` }} className="h-full bg-amber-500" />
                                                            <div style={{ width: `${fee / total * 100}%` }} className="h-full bg-red-500" />
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-brand-text3 mt-2">
                                                            <span className="text-emerald-500 font-bold">Afdrag: {(principal / total * 100).toFixed(0)}%</span>
                                                            <span className="text-amber-500 font-bold">Renter: {(interest / total * 100).toFixed(0)}%</span>
                                                            <span className="text-red-500 font-bold">Bidrag/gebyrer: {(fee / total * 100).toFixed(0)}%</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="bg-brand-surface/80 backdrop-blur-xl border border-brand-border/40 rounded-3xl p-8 shadow-premium">
                                    <div className="flex items-start justify-between gap-4 mb-6">
                                        <div>
                                            <h3 className="text-base font-bold text-brand-text1 tracking-tight">Live renter</h3>
                                            <p className="text-xs text-brand-text3">
                                                Hentet fra Totalkredit live beregner med dine aktuelle input.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void fetchLiveRates()}
                                            className="rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wide border border-brand-accent/30 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/15"
                                            disabled={liveRatesLoading}
                                        >
                                            {liveRatesLoading ? "Opdaterer..." : "Opdater nu"}
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-brand-surface2 border border-brand-border text-brand-text3">
                                            Boligpris: {formatDKK(housing.purchase?.price || 0)}
                                        </span>
                                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-brand-surface2 border border-brand-border text-brand-text3">
                                            Udbetaling: {formatDKK(housing.purchase?.downPaymentCash || 0)}
                                        </span>
                                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-brand-surface2 border border-brand-border text-brand-text3">
                                            Realkreditløbetid: {housing.financing?.mortgage?.termYears || 30} år
                                        </span>
                                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-brand-surface2 border border-brand-border text-brand-text3">
                                            Afdragsfrihed: {housing.financing?.mortgage?.ioYears || 0} år
                                        </span>
                                    </div>

                                    <p className="text-[10px] text-brand-text3 mb-5">
                                        Seneste opdatering: {liveRates ? formatDateTimeDa(liveRates.fetchedAt) : "ikke hentet endnu"}
                                    </p>

                                    {liveRatesError && (
                                        <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                                            {liveRatesError}
                                        </div>
                                    )}

                                    {liveRatesLoading && !liveRates ? (
                                        <div className="h-32 flex items-center justify-center text-xs text-brand-text3">
                                            Henter live renter...
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {(liveRates?.offers || []).map((offer) => (
                                                <div key={offer.productType} className="rounded-2xl border border-brand-border bg-brand-surface2/50 p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-black text-brand-text1">{offer.label}</p>
                                                            <p className="text-[10px] text-brand-text3">
                                                                {offer.title}
                                                                {offer.fallback ? " (fallback)" : ""}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => applyLiveMortgageOffer(offer)}
                                                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wide border border-brand-accent/30 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/15"
                                                        >
                                                            Brug i input
                                                            <ArrowRight className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
                                                        <div className="rounded-lg bg-brand-surface px-2.5 py-2 border border-brand-border/40">
                                                            <p className="text-[10px] text-brand-text3">Rente</p>
                                                            <p className="font-black text-brand-text1">{formatPercent(offer.nominalRatePct)}</p>
                                                        </div>
                                                        <div className="rounded-lg bg-brand-surface px-2.5 py-2 border border-brand-border/40">
                                                            <p className="text-[10px] text-brand-text3">Bidragssats</p>
                                                            <p className="font-black text-brand-text1">{formatPercent(offer.contributionRatePct)}</p>
                                                        </div>
                                                        <div className="rounded-lg bg-brand-surface px-2.5 py-2 border border-brand-border/40">
                                                            <p className="text-[10px] text-brand-text3">ÅOP</p>
                                                            <p className="font-black text-brand-text1">{formatPercent(offer.effectiveRatePct)}</p>
                                                        </div>
                                                        <div className="rounded-lg bg-brand-surface px-2.5 py-2 border border-brand-border/40">
                                                            <p className="text-[10px] text-brand-text3">Kurs</p>
                                                            <p className="font-black text-brand-text1">
                                                                {offer.bondPrice === null ? "-" : offer.bondPrice.toFixed(2)}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-lg bg-brand-surface px-2.5 py-2 border border-brand-border/40">
                                                            <p className="text-[10px] text-brand-text3">Ydelse før skat</p>
                                                            <p className="font-black text-brand-text1">{formatCurrency(offer.monthlyPaymentBeforeTax)}</p>
                                                        </div>
                                                    </div>
                                                    {offer.rateAdjustment && (
                                                        <p className="mt-2 text-[10px] text-brand-text3">
                                                            Rentetilpasning: {offer.rateAdjustment}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-brand-surface/80 backdrop-blur-xl border border-brand-border/40 rounded-3xl p-6 shadow-premium">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-brand-text1">Indikativ banklånsrente</p>
                                            <p className="text-[10px] text-brand-text3 mt-1">
                                                {liveRates?.bankLoanBenchmark.methodology || "Ingen metode tilgængelig."}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-brand-accent tabular-nums">
                                                {formatPercent(liveRates?.bankLoanBenchmark.indicativeRatePct)}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={applyBankBenchmarkRate}
                                                className="mt-1 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wide border border-brand-accent/30 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/15"
                                            >
                                                Brug i banklån
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-brand-text3 mt-3">
                                        Reference: {formatPercent(liveRates?.bankLoanBenchmark.referenceRatePct)} + spread {formatPercent(liveRates?.bankLoanBenchmark.assumedSpreadPct)}.
                                    </p>
                                    <p className="text-[10px] text-brand-text3 mt-1">
                                        Kilde: {liveRates?.bankLoanBenchmark.source || "Teknisk analyse af boligdata API'er"}.
                                    </p>
                                </div>

                                {liveRates?.warnings && liveRates.warnings.length > 0 && (
                                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 space-y-1">
                                        {liveRates.warnings.map((warning) => (
                                            <p key={warning}>{warning}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Right Column: Financial Impact Summary */}
            <div className="lg:col-span-4 lg:sticky lg:top-8 self-start">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-brand-surface/90 backdrop-blur-2xl border border-brand-border/60 rounded-[2.5rem] p-8 shadow-premium relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/10 blur-[80px] -mr-32 -mt-32 rounded-full group-hover:bg-brand-accent/20 transition-colors duration-700" />

                    <div className="relative">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-brand-accent/20 rounded-xl text-brand-accent shadow-inner">
                                <Gauge className="w-4 h-4" />
                            </div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text1 opacity-60">Porteføljeintegration</h4>
                        </div>

                        {calculation ? (
                            <div className="space-y-10">
                                {/* Stor total */}
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase font-bold text-brand-text3 tracking-[0.1em] opacity-80">Samlet månedlig boligudgift</p>
                                    <div className="flex items-baseline gap-2">
                                        <motion.span
                                            key={calculation.monthly.totalHousingCostPerMonth}
                                            initial={{ opacity: 0.5, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-5xl font-black tabular-nums text-brand-text1 tracking-tighter"
                                        >
                                            {formatDKK(calculation.monthly.totalHousingCostPerMonth).replace('kr.', '')}
                                        </motion.span>
                                        <span className="text-sm font-extrabold text-brand-accent italic opacity-70">DKK</span>
                                    </div>
                                </div>

                                {/* LTV-maler */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs font-bold text-brand-text2 tracking-tight">Initial belåningsgrad (LTV)</p>
                                        <span className={cn(
                                            "text-sm font-black tabular-nums",
                                            (calculation.derived.mortgagePrincipal / Math.max(1, housing.purchase.price)) > 0.8 ? "text-red-500" : "text-brand-primary"
                                        )}>
                                            {((calculation.derived.mortgagePrincipal / Math.max(1, housing.purchase.price)) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-brand-surface2/50 rounded-full overflow-hidden border border-brand-border/40 p-[2px]">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(calculation.derived.mortgagePrincipal / Math.max(1, housing.purchase.price)) * 100}%` }}
                                            transition={{ type: "spring", bounce: 0, duration: 1.5 }}
                                            className="h-full bg-gradient-to-r from-brand-primary via-brand-accent to-brand-accent rounded-full shadow-soft"
                                        />
                                    </div>
                                    <p className="text-[10px] text-brand-text3 text-center font-medium opacity-60">
                                        Realkredit: <span className="text-brand-text2 font-bold">{formatDKK(calculation.derived.mortgagePrincipal)}</span>
                                    </p>
                                </div>

                                {/* Fordeling */}
                                <div className="space-y-5 pt-6 border-t border-brand-border/40">
                                    <div className="flex justify-between items-center group/line">
                                        <span className="text-xs text-brand-text3 flex items-center gap-2 group-hover/line:text-brand-text2 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary/40" />
                                            Kontantbehov ved køb
                                        </span>
                                        <span className="text-xs font-bold text-brand-text1 tabular-nums group-hover/line:text-brand-accent transition-colors">
                                            {formatDKK(calculation.derived.totalUpfrontCosts + calculation.balanceImpact.equityInitial)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center group/line">
                                        <span className="text-xs text-brand-text3 flex items-center gap-2 group-hover/line:text-brand-text2 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary/40" />
                                            Realkreditydelse
                                        </span>
                                        <span className="text-xs font-bold text-brand-text1 tabular-nums">
                                            {formatDKK(calculation.monthly.mortgagePayment)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center group/line">
                                        <span className="text-xs text-brand-text3 flex items-center gap-2 group-hover/line:text-brand-text2 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-accent/40" />
                                            Bidrag
                                        </span>
                                        <span className="text-xs font-bold text-brand-text1 tabular-nums">
                                            {formatDKK(calculation.monthly.mortgageContribution)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center group/line">
                                        <span className="text-xs text-brand-text3 flex items-center gap-2 group-hover/line:text-brand-text2 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-secondary/40" />
                                            Banklånsydelse
                                        </span>
                                        <span className="text-xs font-bold text-brand-text1 tabular-nums">
                                            {formatDKK(calculation.monthly.bankPayment)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center group/line">
                                        <span className="text-xs text-brand-text3 flex items-center gap-2 group-hover/line:text-brand-text2 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-secondary/40" />
                                            Boligskatter
                                        </span>
                                        <span className="text-xs font-bold text-brand-text1 tabular-nums">
                                            {formatDKK(calculation.monthly.propertyTax)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center group/line">
                                        <span className="text-xs text-brand-text3 flex items-center gap-2 group-hover/line:text-brand-text2 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400/40" />
                                            Vedligehold
                                        </span>
                                        <span className="text-xs font-bold text-brand-text1 tabular-nums">
                                            {formatDKK(calculation.monthly.maintenanceProvision)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center group/line">
                                        <span className="text-xs text-brand-text3 flex items-center gap-2 group-hover/line:text-brand-text2 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400/40" />
                                            Drift
                                        </span>
                                        <span className="text-xs font-bold text-brand-text1 tabular-nums">
                                            {formatDKK(calculation.monthly.housingRunningCosts)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center group pt-6 border-t border-brand-border/40">
                                        <span className="text-xs font-black text-brand-text1 tracking-tight">Rådighedsbeløb efter bolig</span>
                                        <span className={cn(
                                            "text-sm font-black tabular-nums",
                                            calculation.monthly.disposableAfterHousing < 10000 ? "text-yellow-600" : "text-brand-primary"
                                        )}>
                                            {formatDKK(calculation.monthly.disposableAfterHousing)}
                                        </span>
                                    </div>
                                </div>

                                {/* Status Chip */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-4 bg-brand-primary/5 rounded-[1.5rem] border border-brand-primary/10 flex gap-4 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent animate-pulse" />
                                    <div className="mt-0.5 relative">
                                        <Info className="w-4 h-4 text-brand-primary" />
                                    </div>
                                    <p className="text-[10px] text-brand-primary/80 font-bold leading-relaxed relative">
                                        Beregning er baseret på {rules?.year}-regler. Bidragssatsen falder dynamisk, når LTV passerer under 60% og 40%.
                                    </p>
                                </motion.div>
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-center opacity-40">
                                <Calculator className="w-8 h-8 mb-4 animate-spin duration-[3s] text-brand-accent" />
                                <p className="text-xs font-bold tracking-tight">Henter 2026<br />markedsdata...</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                <div className="w-full mt-6 bg-brand-surface/50 border border-brand-border/30 rounded-[1.5rem] p-5">
                    <h4 className="text-[10px] font-black text-brand-text3 uppercase tracking-[0.2em] mb-3 opacity-50">Markedsnoter</h4>
                    <ul className="text-[10px] text-brand-text3 space-y-2.5 opacity-80">
                        <li className="flex gap-2.5 items-start">
                            <div className="w-1 h-1 rounded-full bg-brand-accent mt-1 flex-shrink-0" />
                            <span>
                                {selectedLiveProduct
                                    ? `Live rentesnapshot (${selectedLiveProduct.label}): ${formatPercent(selectedLiveProduct.nominalRatePct)} med bidrag ${formatPercent(selectedLiveProduct.contributionRatePct)}. Opdateret ${formatDateTimeDa(selectedLiveProduct.fetchedAt)}.`
                                    : "Live renter kan hentes i fanen Live renter."}
                            </span>
                        </li>
                        <li className="flex gap-2.5 items-start">
                            <div className="w-1 h-1 rounded-full bg-brand-accent mt-1 flex-shrink-0" />
                            <span>Vedligeholdelsesreserve er sat til 1% af boligværdi årligt.</span>
                        </li>
                        <li className="flex gap-2.5 items-start">
                            <div className="w-1 h-1 rounded-full bg-brand-accent mt-1 flex-shrink-0" />
                            <span>80% realkredit + 15% banklån + research-baserede engangsomkostninger er integreret i inputs.</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Kildepanel */}
            <AnimatePresence>
                {showLineage && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowLineage(false)}
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-sm bg-brand-surface h-full border-l border-brand-border shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-lg font-black text-brand-text1 flex items-center gap-2.5 tracking-tight">
                                        <BookOpen className="w-5 h-5 text-brand-accent" />
                                        Kilder og antagelser
                                    </h3>
                                    <p className="text-[10px] text-brand-text3 font-bold uppercase tracking-widest mt-1 opacity-50">Datagrundlag og sporbarhed</p>
                                </div>
                                <button
                                    onClick={() => setShowLineage(false)}
                                    className="p-2.5 hover:bg-brand-surface2 rounded-xl transition-colors group"
                                >
                                    <X className="w-5 h-5 text-brand-text3 group-hover:text-brand-text1" />
                                </button>
                            </div>

                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-brand-accent uppercase tracking-widest border-b border-brand-border/40 pb-2 flex items-center gap-2">
                                        Finansiering
                                    </h4>
                                    <div className="text-xs text-brand-text3 space-y-5">
                                        <div className="p-4 bg-brand-surface2/40 rounded-2xl border border-brand-border/20">
                                            <p className="font-black text-brand-text1 text-sm tracking-tight mb-1">
                                                Markedsrente: {selectedLiveProduct ? formatPercent(selectedLiveProduct.nominalRatePct) : formatPercent((housing.financing?.mortgage?.bondRateNominalAnnual || 0) * 100)}
                                            </p>
                                            <p className="opacity-70 leading-relaxed">
                                                {selectedLiveProduct
                                                    ? `Live kilde: ${selectedLiveProduct.source}. Produkt: ${selectedLiveProduct.title}. Opdateret ${formatDateTimeDa(selectedLiveProduct.fetchedAt)}.`
                                                    : "Ingen live-snapshot aktiv. Brug fanen Live renter for at hente aktuelle markedsrenter."}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-brand-surface2/40 rounded-2xl border border-brand-border/20">
                                            <p className="font-black text-brand-text1 text-sm tracking-tight mb-1">
                                                Bidragssats: {selectedLiveProduct ? formatPercent(selectedLiveProduct.contributionRatePct) : "Trappemodel"}
                                            </p>
                                            <p className="opacity-70 leading-relaxed mb-3">
                                                {selectedLiveProduct
                                                    ? "Live bidragssats er hentet direkte fra samme produktkald som markedsrenten."
                                                    : "Kilde: offentlige prisblade (Totalkredit/Nordea, 2026)."}
                                            </p>
                                            <div className="space-y-1 font-mono text-[10px]">
                                                <div className="flex justify-between px-3 py-1.5 bg-brand-surface rounded-lg opacity-80">
                                                    <span className="text-brand-text3">0-40% LTV</span>
                                                    <span className="text-brand-primary font-bold">0.275%</span>
                                                </div>
                                                <div className="flex justify-between px-3 py-1.5 bg-brand-surface rounded-lg opacity-80">
                                                    <span className="text-brand-text3">40-60% LTV</span>
                                                    <span className="text-brand-primary font-bold">0.725%</span>
                                                </div>
                                                <div className="flex justify-between px-3 py-1.5 bg-brand-surface rounded-lg opacity-80">
                                                    <span className="text-brand-text3">60-80% LTV</span>
                                                    <span className="text-brand-primary font-bold">1.025%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-brand-secondary uppercase tracking-widest border-b border-brand-border/40 pb-2">Skat og omkostninger</h4>
                                    <div className="text-xs text-brand-text3 space-y-4">
                                        <div className="p-4 bg-brand-surface2/40 rounded-2xl border border-brand-border/20">
                                            <p className="font-black text-brand-text1 mb-1">Skatteregler fra 2024</p>
                                            <p className="opacity-70 leading-relaxed">Ejendomsværdiskat: 0,51% (standard) op til progressionsgrænsen.</p>
                                        </div>
                                        <div className="p-4 bg-brand-surface2/40 rounded-2xl border border-brand-border/20">
                                            <p className="font-black text-brand-text1 mb-1">Standardiserede tinglysningssatser</p>
                                            <p className="opacity-70 leading-relaxed">Skøde: 0,6% + 1.850 kr. Pant: 1,25% + 1.825 kr.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
