export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-surface dark:bg-[oklch(0.18_0_0)] ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="border border-border p-5">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-28" />
    </div>
  );
}

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={`border border-border p-6 ${height}`}>
      <Skeleton className="h-full w-full" />
    </div>
  );
}
