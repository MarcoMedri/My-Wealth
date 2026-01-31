/**
 * CardSkeleton Component - Loading state for cards
 * 
 * Provides a consistent skeleton/shimmer loading state
 * while data is being fetched
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from './Card';

interface CardSkeletonProps {
    /** Number of skeleton lines to show */
    lines?: number;
    /** Show a header skeleton */
    showHeader?: boolean;
    /** Card padding size */
    padding?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes */
    className?: string;
}

export function CardSkeleton({
    lines = 3,
    showHeader = true,
    padding = 'md',
    className = ''
}: CardSkeletonProps) {
    return (
        <Card padding={padding} className={className}>
            <div className="animate-pulse space-y-4">
                {showHeader && (
                    <div className="flex items-center gap-2 mb-4">
                        {/* Icon skeleton */}
                        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
                        {/* Title skeleton */}
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    </div>
                )}

                {/* Content skeleton */}
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-4 bg-gray-200 dark:bg-gray-700 rounded",
                            // Make last line shorter
                            i === lines - 1 && "w-2/3"
                        )}
                    />
                ))}
            </div>
        </Card>
    );
}
