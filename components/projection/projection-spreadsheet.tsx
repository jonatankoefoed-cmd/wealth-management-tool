import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectionSeriesPoint } from "@/src/projection/types";
import { formatDKK } from "@/lib/format";
import { cn } from "@/lib/cn";

interface ProjectionSpreadsheetProps {
    data: ProjectionSeriesPoint[];
}

export function ProjectionSpreadsheet({ data }: ProjectionSpreadsheetProps) {
    // Group data by year for easier consumption? Or just flat list?
    // Flat list of months is better for horizontal scrolling.

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Detaljeret Finansielt Overblik</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="pnl" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="pnl">Resultatopgørelse</TabsTrigger>
                        <TabsTrigger value="balance">Balance</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pnl">
                        <SpreadsheetTable
                            data={data}
                            rows={[
                                { label: "INDTÆGTER", type: "header" },
                                { label: "Lønindkomst (Netto)", key: "pnl.income", format: "currency" },
                                { label: "Investeringsafkast", key: "pnl.investmentIncome", format: "currency" },
                                { label: "Indtægter i alt", key: (d) => d.pnl.income + d.pnl.investmentIncome, format: "currency", bold: true },

                                { label: "UDGIFTER", type: "header" },
                                { label: "Leveomkostninger", key: "pnl.expensesNonHousing", format: "currency" },
                                { label: "Boligudgifter (Renter)", key: "pnl.housingInterest", format: "currency" },
                                { label: "Boligudgifter (Drift)", key: "pnl.housingRunningCosts", format: "currency" },
                                { label: "Gældsrenter", key: "pnl.debtInterest", format: "currency" },
                                { label: "Skat (Afkast)", key: "pnl.tax", format: "currency" },
                                { label: "Udgifter i alt", key: "pnl.totalExpenses", format: "currency", bold: true },

                                { label: "RESULTAT", type: "header" },
                                { label: "Månedligt Resultat", key: "pnl.net", format: "currency", highlightPositive: true, bold: true },
                                { label: "Akkumuleret Resultat", key: "balanceSheet.netWorth", format: "currency", className: "text-muted-foreground italic" } // illustrative
                            ]}
                        />
                    </TabsContent>

                    <TabsContent value="balance">
                        <SpreadsheetTable
                            data={data}
                            rows={[
                                { label: "AKTIVER", type: "header" },
                                { label: "Kontanter", key: "balanceSheet.cash", format: "currency" },
                                { label: "Portefølje", key: "balanceSheet.portfolioValue", format: "currency" },
                                { label: "Boligværdi", key: "balanceSheet.homeValue", format: "currency" },
                                { label: "Andre Aktiver", key: "balanceSheet.otherAssets", format: "currency" },
                                { label: "Aktiver i alt", key: (d) => d.balanceSheet.cash + d.balanceSheet.portfolioValue + d.balanceSheet.homeValue + d.balanceSheet.otherAssets, format: "currency", bold: true },

                                { label: "PASSIVER", type: "header" },
                                { label: "Realkreditlån", key: "balanceSheet.mortgageBalance", format: "currency" },
                                { label: "Banklån", key: "balanceSheet.bankLoanBalance", format: "currency" },
                                { label: "Anden Gæld", key: "balanceSheet.otherLiabilities", format: "currency" },
                                { label: "Passiver i alt", key: (d) => d.balanceSheet.mortgageBalance + d.balanceSheet.bankLoanBalance + d.balanceSheet.otherLiabilities, format: "currency", bold: true },

                                { label: "NETTOFORMUE", type: "header" },
                                { label: "Nettoformue", key: "balanceSheet.netWorth", format: "currency", highlightPositive: true, bold: true, size: "lg" }
                            ]}
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

interface SpreadsheetTableProps {
    data: ProjectionSeriesPoint[];
    rows: Array<{
        label: string;
        key?: string | ((d: ProjectionSeriesPoint) => number);
        format?: "currency" | "number" | "text";
        type?: "data" | "header";
        bold?: boolean;
        highlightPositive?: boolean;
        className?: string;
        size?: "sm" | "md" | "lg";
    }>;
}

function SpreadsheetTable({ data, rows }: SpreadsheetTableProps) {
    return (
        <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                    <tr className="bg-brand-surface2">
                        <th className="sticky left-0 z-10 bg-brand-surface2 border-r border-brand-border border-y px-4 py-3 text-left font-semibold text-brand-text1 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Kategori</th>
                        {data.map((point) => (
                            <th key={point.month} className="px-4 py-3 text-right font-medium text-brand-text2 border-y border-brand-border min-w-[120px] whitespace-nowrap">
                                {point.month}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => {
                        if (row.type === "header") {
                            return (
                                <tr key={idx} className="bg-brand-surface">
                                    <td className="sticky left-0 z-10 bg-brand-surface border-r border-brand-border px-4 py-3 font-bold text-xs uppercase tracking-wider text-brand-text2" colSpan={data.length + 1}>
                                        {row.label}
                                    </td>
                                </tr>
                            );
                        }

                        return (
                            <tr key={idx} className="group transition-colors hover:bg-brand-surface2/50">
                                <td className={cn(
                                    "sticky left-0 z-10 bg-brand-bg border-r border-brand-border border-b border-brand-border/50 px-4 py-2 font-medium text-brand-text2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-brand-surface2/50 transition-colors",
                                    row.bold && "text-brand-text1 font-semibold",
                                    row.size === "lg" && "text-base py-3"
                                )}>
                                    {row.label}
                                </td>
                                {data.map((point) => {
                                    let value: number | string = 0;
                                    if (typeof row.key === "function") {
                                        value = row.key(point);
                                    } else if (typeof row.key === "string") {
                                        // simple nested access
                                        value = row.key.split('.').reduce((obj: any, k) => obj?.[k], point);
                                    }

                                    const isPositive = typeof value === 'number' && value > 0;
                                    const isNegative = typeof value === 'number' && value < 0;

                                    return (
                                        <td key={point.month} className={cn(
                                            "px-4 py-2 text-right tabular-nums whitespace-nowrap border-b border-brand-border/50 text-brand-text1",
                                            row.bold && "font-semibold",
                                            row.highlightPositive && isPositive && "text-emerald-600 dark:text-emerald-400",
                                            row.highlightPositive && isNegative && "text-rose-600 dark:text-rose-400",
                                            row.size === "lg" && "text-base py-3",
                                            row.className
                                        )}>
                                            {row.format === "currency" && typeof value === "number" ? formatDKK(value) : value}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
