/**
 * Skeleton Components
 * 
 * Reusable skeleton loading placeholders for better UX during data loading.
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Base skeleton with shimmer animation
 */
export function Skeleton({ className, style }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-foreground/10",
                className
            )}
            style={style}
        />
    );
}

/**
 * Skeleton for text lines
 */
export function SkeletonText({ className, lines = 1 }: SkeletonProps & { lines?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        "h-4",
                        i === lines - 1 && lines > 1 ? "w-3/4" : "w-full",
                        className
                    )}
                />
            ))}
        </div>
    );
}

/**
 * Skeleton for avatar/icons
 */
export function SkeletonCircle({ className, size = 40 }: SkeletonProps & { size?: number }) {
    return (
        <Skeleton
            className={cn("rounded-full", className)}
            style={{ width: size, height: size }}
        />
    );
}

/**
 * Skeleton for cards
 */
export function SkeletonCard({ className }: SkeletonProps) {
    return (
        <div className={cn("p-4 rounded-xl border border-border bg-background-card", className)}>
            <div className="flex items-center gap-3 mb-4">
                <SkeletonCircle size={40} />
                <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-full" />
        </div>
    );
}

/**
 * Skeleton for table rows
 */
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
    return (
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        "h-4",
                        i === 0 ? "w-24" : i === columns - 1 ? "w-16" : "flex-1"
                    )}
                />
            ))}
        </div>
    );
}

/**
 * Skeleton for transaction list
 */
export function SkeletonTransactionList({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-0">
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonTableRow key={i} columns={4} />
            ))}
        </div>
    );
}

/**
 * Skeleton for dashboard stats grid
 */
export function SkeletonDashboardStats({ cards = 3 }: { cards?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: cards }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

/**
 * Skeleton for chart
 */
export function SkeletonChart({ className }: SkeletonProps) {
    return (
        <div className={cn("p-4 rounded-xl border border-border bg-background-card", className)}>
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-48 w-full rounded-lg" />
        </div>
    );
}
