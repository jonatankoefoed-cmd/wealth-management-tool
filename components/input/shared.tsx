import { cn } from "@/lib/cn";

export function FormField({
    label,
    children,
    className,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}): JSX.Element {
    return (
        <div className={cn("space-y-1.5", className)}>
            <label className="block text-xs font-medium uppercase tracking-wide text-brand-text2">
                {label}
            </label>
            {children}
        </div>
    );
}
