import React, { Suspense, lazy, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// ============================================================================
// LAZY COMPONENT WRAPPER
// ============================================================================

interface LazyWrapperProps {
    /** Fallback content while loading */
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Wrapper for lazy-loaded components with default loading spinner
 */
export function LazyWrapper({ fallback, children }: LazyWrapperProps) {
    const defaultFallback = (
        <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    return (
        <Suspense fallback={fallback || defaultFallback}>
            {children}
        </Suspense>
    );
}

// ============================================================================
// LAZY CHART COMPONENT
// ============================================================================

interface LazyChartProps {
    /** Chart component to load */
    chart: React.ReactNode;
    /** Height of the chart container */
    height?: number | string;
    /** Loading skeleton style */
    skeletonType?: 'line' | 'bar' | 'pie' | 'area';
}

/**
 * Lazy-load chart components with appropriate skeleton
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function LazyChart({ chart, height = 300, skeletonType: _skeletonType = 'line' }: LazyChartProps) {
    const skeleton = (
        <div
            className="bg-background-muted rounded-lg animate-pulse flex items-center justify-center"
            style={{ height }}
        >
            <div className="text-foreground-muted text-sm">Loading chart...</div>
        </div>
    );

    return (
        <Suspense fallback={skeleton}>
            {chart}
        </Suspense>
    );
}

// ============================================================================
// CREATE LAZY COMPONENT HELPER
// ============================================================================

interface LazyComponentOptions {
    /** Minimum delay before showing component (prevents flash) */
    minDelay?: number;
    /** Preload the component immediately */
    preload?: boolean;
}

/**
 * Create a lazy-loaded component with optional preloading
 */
export function createLazyComponent<T extends ComponentType<unknown>>(
    factory: () => Promise<{ default: T }>,
    options: LazyComponentOptions = {}
): React.LazyExoticComponent<T> {
    const { minDelay = 0, preload = false } = options;

    let factoryWithDelay = factory;

    if (minDelay > 0) {
        factoryWithDelay = async () => {
            const [module] = await Promise.all([
                factory(),
                new Promise(resolve => setTimeout(resolve, minDelay))
            ]);
            return module;
        };
    }

    const LazyComponent = lazy(factoryWithDelay);

    // Preload if requested
    if (preload) {
        factory();
    }

    return LazyComponent as React.LazyExoticComponent<T>;
}

// ============================================================================
// PRELOAD HELPER
// ============================================================================

/**
 * Preload a component before it's needed (e.g., on hover)
 */
export function preloadComponent(factory: () => Promise<unknown>): void {
    factory();
}
