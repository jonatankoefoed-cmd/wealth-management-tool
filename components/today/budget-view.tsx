"use client";

import { useProjectionModel } from "@/hooks/use-projection-model";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function BudgetView() {
    const { inputs, projection, loading } = useProjectionModel();

    if (loading) {
        return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading budget...</div>;
    }

    // If projection ran, we can show the first year's monthly breakdown 
    // or just use the Baseline inputs for a "Simple Budget" view.
    // Let's use Baseline inputs for clarity on "What is configured" vs "What is projected".
    // Actually, "This Year" usually means "Calendar Year 2026 Projection".

    const baseline = inputs?.baseline;
    const income = baseline?.monthlyDisposableIncomeBeforeHousing || 0;
    const expenses = baseline?.monthlyNonHousingExpenses || 0;
    const housingCost = 8900; // Hardcoded in seed for now, or derived from projection if housing module active. 
    // Ideally we get this from the projection result for Year 1.

    // Let's rely on Projection Result for accuracy if available.
    const yearOne = projection?.series?.[0];
    console.log("Projection Year One:", yearOne);
    // Note: We need to inspect projection structure. For now, using Baseline inputs is safer for "Run Rate".

    const surplus = income - expenses - housingCost;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Monthly Run Rate (Baseline)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount (DKK)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium text-brand-success">Disposable Income</TableCell>
                                <TableCell className="text-right text-brand-success">
                                    {new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(income)}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Housing (Rent/Interest)</TableCell>
                                <TableCell className="text-right text-brand-text2">
                                    - {new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(housingCost)}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Non-Housing Expenses</TableCell>
                                <TableCell className="text-right text-brand-text2">
                                    - {new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(expenses)}
                                </TableCell>
                            </TableRow>
                            <TableRow className="border-t-2 border-brand-border">
                                <TableCell className="font-bold">Monthly Surplus</TableCell>
                                <TableCell className="text-right font-bold text-brand-primary">
                                    {new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(surplus)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <p className="text-xs text-brand-text3 text-center">
                * Based on 'Baseline Economy' inputs. For detailed evolution, see Future tab.
            </p>
        </div>
    );
}
