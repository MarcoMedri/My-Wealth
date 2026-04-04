import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, PieChart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useVaultStore } from '../../store/useVaultStore';
import { HoldingsTable, type HoldingsColumn } from './HoldingsTable';
import { ViewSettings } from './ViewSettings';
import { DateRangeFilter, type DateRange } from '../DateRangeFilter';
import type { Holding, Asset } from '../../../@my-wealth/shared/schemas';
import { Card, CardHeader } from '../ui';
import { DESIGN_TOKENS } from '../../lib/design-tokens';

interface HoldingsCardProps {
    holdings: Holding[];
    assets: Asset[];
    onEdit?: (h: Holding, a: Asset) => void;
    onSell?: (h: Holding, a: Asset) => void;

    // Controlled State
    includeClosed: boolean;
    onIncludeClosedChange: (value: boolean) => void;

    dateRange: DateRange;
    onDateRangeChange: (range: DateRange) => void;

    // Optional Overrides
    title?: string;
    className?: string;
}

export function HoldingsCard({
    holdings,
    assets,
    onEdit,
    onSell,
    includeClosed,
    onIncludeClosedChange,
    dateRange,
    onDateRangeChange,
    title,
    className
}: HoldingsCardProps) {
    const { t } = useTranslation();
    const { workspace, setWorkspaceSettings, refreshAllPrices, isLoading } = useVaultStore();

    // Filter holdings based on closed status
    const filteredHoldings = useMemo(() => {
        return holdings.filter(h => {
            if (includeClosed) return true;

            // Exclude insurance? (dashboard logic had this). 
            // Broker view might have insurance? 
            // Let's keep logic consistent with Dashboard for now.

            // if (asset?.type === 'insurance') return false; // Dashboard had this. Should we keep it generic?
            // If "same functionality", yes. But maybe Insurance is special?
            // I'll leave insurance IN for generic card, or check with user?
            // Dashboard explicitly filtered insurance (line 129).
            // BrokerView explicitly filters for "securitiesAccounts" (type='investment'). 
            // If broker holds insurance, it probably shouldn't show in "Positions" (PieChart) ?
            // Let's filter quantity > 0 if !includeClosed.

            return h.quantity > 0;
        });
    }, [holdings, includeClosed]);

    return (
        <Card className={cn("flex flex-col", className)} padding="sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <CardHeader
                        icon={title ? undefined : PieChart}
                        iconColor={DESIGN_TOKENS.colors.icon.portfolio}
                        title={title || t('investments.positions', 'Posizioni')}
                        className="mb-0"
                    />
                    <ViewSettings
                        visibleColumns={workspace?.holdingsTable?.visibleColumns}
                        onChange={(cols) => setWorkspaceSettings({
                            holdingsTable: { visibleColumns: cols }
                        })}
                    />
                </div>

                {/* Filters & Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Include Closed Toggle */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-2 py-1 border border-gray-200 dark:border-gray-700">
                        <label className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer select-none" htmlFor="show-closed-toggle-card">
                            {t('investments.showClosedPositions')}
                        </label>
                        <button
                            id="show-closed-toggle-card"
                            aria-checked={includeClosed}
                            role="switch"
                            onClick={() => onIncludeClosedChange(!includeClosed)}
                            className={cn(
                                "w-10 h-6 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary border-2",
                                includeClosed
                                    ? "bg-primary border-primary"
                                    : "bg-gray-300 dark:bg-gray-600 border-gray-300 dark:border-gray-600"
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform",
                                    includeClosed ? "translate-x-4" : "translate-x-0"
                                )}
                            />
                        </button>
                    </div>

                    <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />

                    <button
                        onClick={() => refreshAllPrices()}
                        className="btn btn-ghost flex items-center gap-1"
                        disabled={isLoading}
                        title={t('investments.refreshPrices')}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline text-sm">{t('investments.refresh')}</span>
                    </button>
                </div>
            </div>

            <HoldingsTable
                holdings={filteredHoldings}
                assets={assets}
                onEdit={onEdit}
                onSell={onSell}
                showActions={true}
                visibleColumns={workspace?.holdingsTable?.visibleColumns as HoldingsColumn[]}
                isLoading={isLoading}
            />
        </Card>
    );
}
