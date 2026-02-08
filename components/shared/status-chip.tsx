import { AlertCircle, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

interface StatusChipProps {
  status: string | null | undefined;
}

export function StatusChip({ status }: StatusChipProps): JSX.Element {
  const normalized = (status ?? "FAILED").toUpperCase();

  if (normalized === "SUCCESS") {
    return (
      <Badge variant="success" className="gap-1.5">
        <Icon icon={CheckCircle2} size={16} color="success" />
        SUCCESS
      </Badge>
    );
  }

  if (normalized === "PARTIAL") {
    return (
      <Badge variant="partial" className="gap-1.5">
        <Icon icon={CircleDashed} size={16} color="warning" />
        PARTIAL
      </Badge>
    );
  }

  if (normalized === "SKIPPED") {
    return (
      <Badge variant="neutral" className="gap-1.5">
        <Icon icon={CircleDashed} size={16} color="secondary" />
        SKIPPED
      </Badge>
    );
  }

  return (
    <Badge variant="danger" className="gap-1.5">
      <Icon icon={AlertCircle} size={16} color="danger" />
      FAILED
    </Badge>
  );
}
