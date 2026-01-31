import { Skeleton } from "../ui/Skeleton";

export function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-6 overflow-hidden h-full">
            {/* Header Skeleton */}
            <header className="px-8 py-6 pb-2 flex justify-between items-end">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </header>

            <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
                {/* Net Worth Hero Skeleton */}
                <div className="bg-background-card rounded-2xl p-8 border border-border/50 shadow-sm relative overflow-hidden h-48">
                    <div className="space-y-4 relative z-10">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-12 w-64" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                </div>

                {/* Summary Cards Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-background-card rounded-xl p-6 border border-border/50 h-32 flex flex-col justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-9 w-9 rounded-lg" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                            <Skeleton className="h-8 w-32" />
                        </div>
                    ))}
                </div>

                {/* Performance Metrics Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>

                {/* Chart Skeleton */}
                <div className="bg-background-card rounded-xl p-6 border border-border/50 h-[400px]">
                    <Skeleton className="h-6 w-48 mb-6" />
                    <div className="flex items-end gap-2 h-64">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <Skeleton key={i} className="w-full" style={{ height: `${Math.random() * 80 + 20}%` }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
