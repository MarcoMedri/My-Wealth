import { cn } from "../../lib/utils"

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-muted/50", className)}
            {...props}
        />
    )
}

export { Skeleton }

export function SkeletonText({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <Skeleton className={cn("h-4 w-full", className)} {...props} />
}

export function SkeletonCircle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <Skeleton className={cn("rounded-full", className)} {...props} />
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <Skeleton className={cn("rounded-lg", className)} {...props} />
}

// Placeholders for other exported types to prevent errors, 
// though specific implementations like TableSkeleton are preferred for complex structures.
export function SkeletonTableRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex items-center space-x-4 py-4", className)} {...props}>
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
    )
}

export const SkeletonTransactionList = Skeleton;
export const SkeletonDashboardStats = Skeleton;
export const SkeletonChart = Skeleton;
