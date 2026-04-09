import { AlertCircle, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

interface StatusChipProps {
  status: string | null | undefined;
}

export function StatusChip({ status }: StatusChipProps) {
  const normalized = (status ?? "FAILED").toUpperCase();

  if (normalized === "SUCCESS") {
    return (
      <Badge variant="success" className="gap-1.5">
        <Icon icon={CheckCircle2} size={16} color="success" />
        SUCCESS
      </Badge>
    );
  }

  if (normalized === "WARNING" || normalized === "PARTIAL") {
    return (
      <Badge variant="warning" className="gap-1.5 bg-amber-50 text-amber-700 border-amber-200">
        <Icon icon={CircleDashed} size={16} color="warning" />
        {normalized}
      </Badge>
    );
  }

  if (normalized === "DANGER" || normalized === "FAILED") {
    return (
      <Badge variant="danger" className="gap-1.5">
        <Icon icon={AlertCircle} size={16} color="danger" />
        {normalized === "DANGER" ? "DANGER" : "FAILED"}
      </Badge>
    );
  }

  return (
    <Badge variant="neutral" className="gap-1.5">
      <Icon icon={CircleDashed} size={16} color="secondary" />
      {normalized}
    </Badge>
  );
}
