
import { useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Copy, Trash2, Search, Filter, X } from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';
import type { Transaction } from '../@my-wealth/shared/schemas';

import { cn, formatDate } from '../lib/utils';
import AddTransactionModal from './AddTransactionModal';
import { useFormatMoney } from '../hooks/useFormatMoney';
import { type DateRange, getDateRangeBounds } from './DateRangeFilter';
import { useCategoryName } from '../hooks/useCategoryName';

const columnHelper = createColumnHelper<Transaction>();

interface TransactionTableProps {
    dateRange?: DateRange;
    selectedAccountIds?: string[];
    showFilters?: boolean;
}

export default function TransactionTable({ dateRange = 'all', selectedAccountIds = [], showFilters = true }: TransactionTableProps) {
    const { t } = useTranslation();
    const allTransactions = useVaultStore(state => state.transactions);
    const categories = useVaultStore(state => state.categories);
    const accounts = useVaultStore(state => state.accounts);
    const formatMoney = useFormatMoney();
    const { getCategoryName } = useCategoryName();
    const [sorting, setSorting] = useState<SortingState>([
        { id: 'date', desc: true }
    ]);

    // Advanced filter state
    const [searchText, setSearchText] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

    // Filter transactions by date range
    const transactions = useMemo(() => {
        if (dateRange === 'all') return allTransactions;
        const { startDate, endDate } = getDateRangeBounds(dateRange);
        return allTransactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= startDate && txDate <= endDate;
        });
    }, [allTransactions, dateRange]);

    // Further filter by selected accounts, search, category, and type
    const filteredTransactions = useMemo(() => {
        let result = transactions;

        // Account filter
        if (selectedAccountIds.length > 0) {
            result = result.filter(tx => selectedAccountIds.includes(tx.accountId));
        }

        // Search filter (payee and notes)
        if (searchText.trim()) {
            const search = searchText.toLowerCase().trim();
            result = result.filter(tx =>
                tx.payee.toLowerCase().includes(search) ||
                (tx.notes?.toLowerCase().includes(search))
            );
        }

        // Category filter
        if (selectedCategoryId) {
            result = result.filter(tx => tx.categoryId === selectedCategoryId);
        }

        // Type filter
        if (selectedType !== 'all') {
            result = result.filter(tx => tx.type === selectedType);
        }

        return result;
    }, [transactions, selectedAccountIds, searchText, selectedCategoryId, selectedType]);

    // Modal State
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isDuplicateMode, setIsDuplicateMode] = useState(false);

    // Handlers
    // Handlers
    const handleEdit = useCallback((tx: Transaction) => {
        setSelectedTransaction(tx);
        setIsDuplicateMode(false);
        setIsTransactionModalOpen(true);
    }, []);

    const handleDuplicate = useCallback((tx: Transaction) => {
        setSelectedTransaction(tx);
        setIsDuplicateMode(true);
        setIsTransactionModalOpen(true);
    }, []);

    const handleDelete = useCallback(async (tx: Transaction) => {
        if (confirm(`${t('transactions.confirmDelete')}: ${tx.payee}?`)) {
            try {
                await window.api.deleteTransaction(tx.id);
                await useVaultStore.getState().refreshData();
            } catch (e) {
                console.error("Failed to delete", e);
                alert(t('common.error'));
            }
        }
    }, [t]);

    // Memoize category and account lookup
    const categoryMap = useMemo(() => {
        return new Map(categories.map(c => [c.id, c]));
    }, [categories]);

    const accountMap = useMemo(() => {
        return new Map(accounts.map(a => [a.id, a]));
    }, [accounts]);

    // Define columns
    const columns = useMemo(() => [
        columnHelper.accessor('date', {
            header: ({ column }) => (
                <SortableHeader column={column} label={t('transactions.date')} />
            ),
            cell: (info) => (
                <span className="text-foreground-muted text-sm">
                    {formatDate(info.getValue())}
                </span>
            ),
            sortingFn: 'datetime',
        }),
        columnHelper.accessor('payee', {
            header: t('transactions.payee'),
            cell: (info) => (
                <span className="text-foreground text-sm font-medium truncate max-w-[200px] block">
                    {info.getValue() || '—'}
                </span>
            ),
        }),
        columnHelper.accessor('categoryId', {
            header: t('transactions.category'),
            cell: (info) => {
                const tx = info.row.original;
                if (tx.type === 'transfer' && tx.toAccountId) {
                    const toAccount = accountMap.get(tx.toAccountId);
                    return (
                        <span className="text-foreground-muted text-sm flex items-center gap-1">
                            <span className="opacity-70">→</span>
                            {toAccount ? toAccount.name : t('common.unknownAccount')}
                        </span>
                    );
                }
                const categoryId = info.getValue();
                const category = categoryId ? categoryMap.get(categoryId) : null;
                return (
                    <span className="text-foreground-muted text-sm">
                        {category ? getCategoryName(category.name) : '—'}
                    </span>
                );
            },
        }),
        columnHelper.accessor('amount', {
            header: ({ column }) => (
                <SortableHeader column={column} label={t('transactions.amount')} className="justify-end" />
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
        columnHelper.display({
            id: 'actions',
            header: () => null,
            cell: (info) => (
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                    <button
                        onClick={() => handleDuplicate(info.row.original)}
                        className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-background-subtle rounded-md transition-colors"
                        title="Duplicate"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => handleEdit(info.row.original)}
                        className="p-1.5 text-foreground-muted hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                        title="Edit"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => handleDelete(info.row.original)}
                        className="p-1.5 text-foreground-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ),

        })
    ], [categoryMap, accountMap, t, formatMoney, handleDelete, handleEdit, handleDuplicate, getCategoryName]);

    // Sort transactions (sorted by date desc by default in table state)
    const table = useReactTable({
        data: filteredTransactions,
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
            {/* Filter Bar */}
            {showFilters && (
                <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                        <input
                            type="text"
                            placeholder={t('transactions.search', 'Search transactions...')}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        {searchText && (
                            <button
                                onClick={() => setSearchText('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-foreground-muted" />
                        <select
                            value={selectedCategoryId || ''}
                            onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                            className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                        >
                            <option value="">{t('transactions.allCategories', 'All Categories')}</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-1 bg-background-muted rounded-lg p-1">
                        {(['all', 'income', 'expense', 'transfer'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={cn(
                                    "px-3 py-1 text-sm rounded-md transition-colors",
                                    selectedType === type
                                        ? "bg-indigo-500 text-white"
                                        : "text-foreground-muted hover:text-foreground"
                                )}
                            >
                                {t(`transactions.type.${type}`, type.charAt(0).toUpperCase() + type.slice(1))}
                            </button>
                        ))}
                    </div>

                    {/* Result Count */}
                    <span className="text-sm text-foreground-muted ml-auto">
                        {filteredTransactions.length} {t('transactions.results', 'transactions')}
                    </span>
                </div>
            )}

            {/* Table Header */}
            <div className="border-b border-border bg-background-muted pr-4"> {/* Added pr-4 for scrollbar offset */}
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
                                    header.id === 'actions' && "w-28", // Width for actions
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
                        <p className="text-foreground-subtle">{t('transactions.noTransactions')}</p>
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
                                    className="flex absolute w-full hover:bg-background-muted transition-colors border-b border-border/30 group"
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
                                                cell.column.id === 'actions' && "w-28",
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

            <AddTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                transaction={selectedTransaction}
                isDuplicate={isDuplicateMode}
            />
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
