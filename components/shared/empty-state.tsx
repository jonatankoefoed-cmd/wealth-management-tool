import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  illustration?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = HelpCircle,
  illustration = "/images/empty-states/empty-default.jpg",
  actionLabel,
  onAction,
}: EmptyStateProps): JSX.Element {
  return (
    <section className="rounded-lg border border-brand-border bg-brand-surface2 p-8 text-center shadow-soft">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-surface">
        <Icon icon={icon} size={20} color="secondary" />
      </div>
      <Image
        src={illustration}
        alt="Empty state illustration"
        width={240}
        height={140}
        className="mx-auto mb-4 rounded-md"
      />
      <h3 className="text-base font-semibold text-brand-text1">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-brand-text2">{description}</p>
      {actionLabel ? (
        <div className="mt-4">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
