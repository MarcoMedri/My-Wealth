/**
 * TransactionTable Component
 * Virtualized table for 10k+ transactions using TanStack Table + Virtual
 */

import { useMemo, useRef } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type SortingState,
    type Column,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';
import type { Transaction } from '../../../shared/schemas';
import { formatMoney } from '../../../shared/schemas';
import { cn, formatDate } from '../lib/utils';
import { useState } from 'react';

const columnHelper = createColumnHelper<Transaction>();

export default function TransactionTable() {
    const transactions = useVaultStore(state => state.transactions);
    const categories = useVaultStore(state => state.categories);
    const [sorting, setSorting] = useState<SortingState>([
        { id: 'date', desc: true }
    ]);

    // Memoize category lookup
    const categoryMap = useMemo(() => {
        return new Map(categories.map(c => [c.id, c]));
    }, [categories]);

    // Define columns
    const columns = useMemo(() => [
        columnHelper.accessor('date', {
            header: ({ column }) => (
                <SortableHeader column={column} label="Date" />
            ),
            cell: (info) => (
                <span className="text-foreground-muted text-sm">
                    {formatDate(info.getValue())}
                </span>
            ),
            sortingFn: 'datetime',
        }),
        columnHelper.accessor('payee', {
            header: 'Payee',
            cell: (info) => (
                <span className="text-foreground text-sm font-medium truncate max-w-[200px] block">
                    {info.getValue() || '—'}
                </span>
            ),
        }),
        columnHelper.accessor('categoryId', {
            header: 'Category',
            cell: (info) => {
                const categoryId = info.getValue();
                const category = categoryId ? categoryMap.get(categoryId) : null;
                return (
                    <span className="text-foreground-muted text-sm">
                        {category?.name || '—'}
                    </span>
                );
            },
        }),
        columnHelper.accessor('amount', {
            header: ({ column }) => (
                <SortableHeader column={column} label="Amount" className="justify-end" />
            ),
            cell: (info) => {
                const tx = info.row.original;
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';

                return (
                    <span className={cn(
                        "text-sm font-semibold tabular-nums text-right block",
                        isIncome ? "text-success" : isTransfer ? "text-info" : "text-foreground-muted"
                    )}>
                        {isIncome ? '+' : isTransfer ? '' : '-'}
                        {formatMoney(info.getValue(), tx.currency)}
                    </span>
                );
            },
        }),
    ], [categoryMap]);

    // Sort transactions
    const sortedData = useMemo(() => {
        return [...transactions].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [transactions]);

    const table = useReactTable({
        data: sortedData,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    // Virtualization
    const parentRef = useRef<HTMLDivElement>(null);
    const { rows } = table.getRowModel();

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 48, // Row height
        overscan: 10,
    });

    const virtualRows = virtualizer.getVirtualItems();
    const totalSize = virtualizer.getTotalSize();

    return (
        <div className="flex flex-col h-full">
            {/* Table Header */}
            <div className="border-b border-border bg-background-muted">
                {table.getHeaderGroups().map(headerGroup => (
                    <div key={headerGroup.id} className="flex">
                        {headerGroup.headers.map(header => (
                            <div
                                key={header.id}
                                className={cn(
                                    "px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wide",
                                    header.id === 'date' && "w-32",
                                    header.id === 'payee' && "flex-1",
                                    header.id === 'categoryId' && "w-40",
                                    header.id === 'amount' && "w-32 text-right",
                                )}
                            >
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(header.column.columnDef.header, header.getContext())
                                }
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Virtualized Table Body */}
            <div
                ref={parentRef}
                className="flex-1 overflow-auto"
            >
                {rows.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-foreground-subtle">No transactions</p>
                    </div>
                ) : (
                    <div
                        style={{
                            height: `${totalSize}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {virtualRows.map(virtualRow => {
                            const row = rows[virtualRow.index];
                            return (
                                <div
                                    key={row.id}
                                    className="flex absolute w-full hover:bg-background-muted transition-colors border-b border-border/30"
                                    style={{
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <div
                                            key={cell.id}
                                            className={cn(
                                                "flex items-center px-4",
                                                cell.column.id === 'date' && "w-32",
                                                cell.column.id === 'payee' && "flex-1 min-w-0",
                                                cell.column.id === 'categoryId' && "w-40",
                                                cell.column.id === 'amount' && "w-32",
                                            )}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// SORTABLE HEADER COMPONENT
// ============================================================================

function SortableHeader({
    column,
    label,
    className
}: {
    column: Column<Transaction, unknown>;
    label: string;
    className?: string;
}) {
    const sorted = column.getIsSorted();

    return (
        <button
            className={cn("flex items-center gap-1 hover:text-foreground transition-colors", className)}
            onClick={column.getToggleSortingHandler()}
        >
            <span>{label}</span>
            {sorted === 'asc' ? (
                <ArrowUp className="w-3 h-3" />
            ) : sorted === 'desc' ? (
                <ArrowDown className="w-3 h-3" />
            ) : (
                <ArrowUpDown className="w-3 h-3 opacity-50" />
            )}
        </button>
    );
}
