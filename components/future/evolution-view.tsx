"use client";

import { useProjectionModel } from "@/hooks/use-projection-model";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export function EvolutionView() {
    const { projection, loading } = useProjectionModel();

    if (loading || !projection) {
        return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading projection...</div>;
    }

    const { series } = projection;

    return (
        <Card>
            <CardContent className="p-0 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Month</TableHead>
                            <TableHead className="text-right">Income</TableHead>
                            <TableHead className="text-right">Expenses</TableHead>
                            <TableHead className="text-right">Housing</TableHead>
                            <TableHead className="text-right">Net</TableHead>
                            <TableHead className="text-right border-l">Cash</TableHead>
                            <TableHead className="text-right">Investments</TableHead>
                            <TableHead className="text-right">Debt</TableHead>
                            <TableHead className="text-right font-bold">Net Worth</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {series.map((point) => (
                            <TableRow key={point.month}>
                                <TableCell className="font-medium whitespace-nowrap">{point.month}</TableCell>
                                <TableCell className="text-right text-brand-success/90">
                                    {Math.round(point.pnl.income).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-brand-text2">
                                    {Math.round(point.pnl.expensesNonHousing).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-brand-text2">
                                    {Math.round(point.pnl.housingRunningCosts + point.pnl.housingInterest).toLocaleString()}
                                </TableCell>
                                <TableCell className={point.pnl.net >= 0 ? "text-right text-brand-success" : "text-right text-brand-danger"}>
                                    {Math.round(point.pnl.net).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right border-l text-brand-text2">
                                    {Math.round(point.balanceSheet.cash).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-brand-text2">
                                    {Math.round(point.balanceSheet.portfolioValue).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-brand-text2">
                                    {Math.round(point.balanceSheet.mortgageBalance + point.balanceSheet.bankLoanBalance + point.balanceSheet.otherLiabilities).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-bold text-brand-primary">
                                    {Math.round(point.balanceSheet.netWorth).toLocaleString()}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
