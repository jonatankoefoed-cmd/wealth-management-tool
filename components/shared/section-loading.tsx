import { Skeleton } from "@/components/ui/skeleton";

export function SectionLoading(): JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
