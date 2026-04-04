/**
 * VirtualList Component - Simple wrapper for now
 * 
 * TODO: Properly implement react-window integration
 * For now, just rendering items directly
 */

import React from 'react';

export interface VirtualListProps<T> {
    /** Items to render */
    items: T[];
    /** Height of each item in pixels */
    itemHeight: number;
    /** Total height of the list container */
    height: number;
    /** Optional width (default: 100%) */
    width?: number | string;
    /** Render function for each item */
    renderItem: (item: T, index: number) => React.ReactNode;
    /** Optional key extractor */
    getKey?: (item: T, index: number) => string | number;
    /** Optional className */
    className?: string;
    /** Number of items to render outside visible area */
    overscanCount?: number;
}

/**
 * Simple list renderer (virtualization temporarily disabled)
 */
export function VirtualList<T>({
    items,
    itemHeight,
    height,
    width = '100%',
    renderItem,
    getKey,
    className = '',
}: VirtualListProps<T>) {
    return (
        <div
            className={className}
            style={{
                height,
                width,
                overflow: 'auto'
            }}
        >
            {items.map((item, index) => (
                <div
                    key={getKey ? getKey(item, index) : index}
                    style={{ minHeight: itemHeight }}
                >
                    {renderItem(item, index)}
                </div>
            ))}
        </div>
    );
}

export interface VariableVirtualListProps<T> {
    /** Items to render */
    items: T[];
    /** Function to get height for each item */
    getItemHeight?: (item: T, index: number) => number;
    /** Total height of the list container */
    height?: number;
    /** Optional width (default: 100%) */
    width?: number | string;
    /** Render function for each item */
    renderItem: (item: T, index: number) => React.ReactNode;
    /** Optional key extractor */
    getKey?: (item: T, index: number) => string | number;
    /** Optional className */
    className?: string;
    /** Number of items to render outside visible area */
    overscanCount?: number;
    /** Default row height */
    defaultRowHeight?: number;
}

/**
 * Simple list renderer (virtualization temporarily disabled)
 */
export function VariableVirtualList<T>({
    items,
    height = 600,
    width,
    renderItem,
    getKey,
    className = '',
}: VariableVirtualListProps<T>) {
    return (
        <div
            className={className}
            style={{
                height,
                width: width || '100%',
                overflow: 'auto'
            }}
        >
            {items.map((item, index) => (
                <div key={getKey ? getKey(item, index) : index}>
                    {renderItem(item, index)}
                </div>
            ))}
        </div>
    );
}
