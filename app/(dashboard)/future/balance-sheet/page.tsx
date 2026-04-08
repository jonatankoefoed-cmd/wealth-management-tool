import React from "react";
import { BalanceSheetView } from "@/components/future/balance-sheet-view";

export const metadata = {
    title: "Future: Balance Sheet | Wealth Management",
    description: "Yearly Balance Sheet Projection",
};

export default function FutureBalanceSheetPage() {
    return (
        <div className="space-y-6">
            <BalanceSheetView />
        </div>
    );
}
