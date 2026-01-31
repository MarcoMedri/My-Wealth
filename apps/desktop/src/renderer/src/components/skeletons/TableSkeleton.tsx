import { Skeleton } from "../ui/Skeleton";
import { cn } from "../../lib/utils";

interface TableSkeletonProps {
    rows?: number;
    className?: string;
}

export function TableSkeleton({ rows = 5, className }: TableSkeletonProps) {
    return (
        <div className={cn("w-full space-y-4", className)}>
            {/* Header-like skeleton */}
            <div className="flex items-center justify-between px-4 py-3 bg-background-subtle rounded-lg border border-border/50">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24 hidden md:block" />
                <Skeleton className="h-4 w-24 hidden lg:block" />
                <Skeleton className="h-4 w-12" />
            </div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-4 bg-background-card rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-24 hidden md:block" />
                    <Skeleton className="h-5 w-24 hidden lg:block" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            ))}
        </div>
    );
}
