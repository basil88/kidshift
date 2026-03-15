import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-[500px] w-full rounded-lg" />
    </div>
  );
}
