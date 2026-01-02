import React, { useRef, useCallback, CSSProperties } from 'react';
import { FixedSizeList, VariableSizeList } from 'react-window';

// ============================================================================
// FIXED SIZE VIRTUAL LIST
// ============================================================================

export interface VirtualListProps<T> {
    /** Items to render */
    items: T[];
    /** Height of each item in pixels */
    itemHeight: number;
    /** Height of the container */
    height: number;
    /** Width of the container (default: 100%) */
    width?: number | string;
    /** Render function for each item */
    renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
    /** Key extractor for items */
    getKey?: (item: T, index: number) => string;
    /** Overscan count (items to render outside visible area) */
    overscanCount?: number;
    /** Class name for the outer container */
    className?: string;
}

interface RowProps {
    index: number;
    style: CSSProperties;
}

export function VirtualList<T>({
    items,
    itemHeight,
    height,
    width = '100%',
    renderItem,
    getKey,
    overscanCount = 5,
    className,
}: VirtualListProps<T>) {
    const listRef = useRef<FixedSizeList>(null);

    const Row = useCallback(
        ({ index, style }: RowProps) => {
            const item = items[index];
            return <>{renderItem(item, index, style)}</>;
        },
        [items, renderItem]
    );

    if (items.length === 0) {
        return null;
    }

    return (
        <FixedSizeList
            ref={listRef}
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={itemHeight}
            overscanCount={overscanCount}
            className={className}
            itemKey={getKey ? (index: number) => getKey(items[index], index) : undefined}
        >
            {Row}
        </FixedSizeList>
    );
}

// ============================================================================
// VARIABLE SIZE VIRTUAL LIST
// ============================================================================

export interface VariableVirtualListProps<T> {
    items: T[];
    /** Function to get height of each item */
    getItemHeight: (index: number) => number;
    /** Estimated average item height (for initial scroll position) */
    estimatedItemHeight: number;
    height: number;
    width?: number | string;
    renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
    getKey?: (item: T, index: number) => string;
    overscanCount?: number;
    className?: string;
}

export function VariableVirtualList<T>({
    items,
    getItemHeight,
    estimatedItemHeight,
    height,
    width = '100%',
    renderItem,
    getKey,
    overscanCount = 5,
    className,
}: VariableVirtualListProps<T>) {
    const listRef = useRef<VariableSizeList>(null);

    const Row = useCallback(
        ({ index, style }: RowProps) => {
            const item = items[index];
            return <>{renderItem(item, index, style)}</>;
        },
        [items, renderItem]
    );

    if (items.length === 0) {
        return null;
    }

    return (
        <VariableSizeList
            ref={listRef}
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={getItemHeight}
            estimatedItemSize={estimatedItemHeight}
            overscanCount={overscanCount}
            className={className}
            itemKey={getKey ? (index: number) => getKey(items[index], index) : undefined}
        >
            {Row}
        </VariableSizeList>
    );
}

// ============================================================================
// SCROLL TO INDEX HOOK
// ============================================================================

export function useVirtualListScroll(
    listRef: React.RefObject<FixedSizeList | VariableSizeList>
) {
    const scrollToIndex = useCallback(
        (index: number, align: 'auto' | 'start' | 'center' | 'end' = 'auto') => {
            listRef.current?.scrollToItem(index, align);
        },
        [listRef]
    );

    const scrollToTop = useCallback(() => {
        listRef.current?.scrollTo(0);
    }, [listRef]);

    return { scrollToIndex, scrollToTop };
}
