import { Metadata } from "next";
import { RollupsView } from "@/components/future/rollups-view";

export const metadata: Metadata = {
    title: "Future P&L | Wealth",
    description: "Yearly Profit & Loss rollups",
};

export default function FutureRollupsPage() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-brand-text1">Future P&L</h1>
                <p className="text-brand-text2">
                    Projected yearly income, expenses, and savings based on your monthly settings.
                </p>
            </div>

            <div className="w-full max-w-[1400px]">
                <RollupsView />
            </div>
        </div>
    );
}
