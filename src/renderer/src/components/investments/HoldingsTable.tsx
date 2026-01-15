
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Holding, Asset } from '../../../../shared/schemas';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { TrendingUp, TrendingDown, Minus, Pencil } from 'lucide-react';

export type HoldingsColumn = 'quantity' | 'price' | 'avgPrice' | 'taxRate' | 'estTax' | 'dayChange' | 'value' | 'gainLoss';

interface HoldingsTableProps {
    holdings: Holding[];
    assets: Asset[];
    onSell?: (holding: Holding, asset: Asset) => void;
    onEdit?: (holding: Holding, asset: Asset) => void;
    showActions?: boolean;
    visibleColumns?: HoldingsColumn[];
}

export function HoldingsTable({ holdings, assets, onSell, onEdit, showActions = false, visibleColumns }: HoldingsTableProps) {
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();

    const isVisible = (col: HoldingsColumn) => {
        if (!visibleColumns) return true; // Default to all visible if not specified
        return visibleColumns.includes(col);
    };

    if (holdings.length === 0) {
        return (
            <div className="p-12 text-center text-foreground-subtle bg-background-card rounded-xl border border-border">
                {t('common.noData') || 'No holdings found'}
            </div>
        );
    }

    return (
        <div className="bg-background-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-background-subtle text-xs uppercase text-foreground-muted font-medium">
                        <tr>
                            <th className="px-6 py-3 sticky left-0 bg-background-subtle z-10">{t('investments.symbol')}</th>
                            {isVisible('quantity') && <th className="px-6 py-3 text-right">{t('investments.quantity')}</th>}
                            {isVisible('price') && <th className="px-6 py-3 text-right">{t('investments.price')}</th>}
                            {isVisible('avgPrice') && <th className="px-6 py-3 text-right">{t('investments.avgWithCost', 'Avg Price')}</th>}
                            {isVisible('taxRate') && <th className="px-6 py-3 text-right">{t('investments.taxRate')}</th>}
                            {isVisible('estTax') && <th className="px-6 py-3 text-right">{t('investments.estTax')}</th>}
                            {isVisible('dayChange') && <th className="px-6 py-3 text-right">{t('investments.dayChange')}</th>}
                            {isVisible('value') && <th className="px-6 py-3 text-right">{t('investments.value')}</th>}
                            {isVisible('gainLoss') && <th className="px-6 py-3 text-right">{t('investments.gainLoss')}</th>}
                            {showActions && (
                                <th className="px-6 py-3 text-right w-24">{t('common.actions')}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {holdings.map(holding => {
                            const asset = assets.find(a => a.id === holding.assetId);
                            if (!asset) return null;

                            const value = holding.quantity * asset.currentPrice;
                            const cost = holding.quantity * holding.averageBuyPrice;
                            const gain = value - cost;
                            const taxRate = holding.taxRate ?? 26;
                            const taxLiability = gain > 0 ? gain * (taxRate / 100) : 0;
                            const gainPercent = cost > 0 ? (gain / cost) * 100 : 0;

                            const dayChange = asset.previousClose ? asset.currentPrice - asset.previousClose : 0;
                            const dayChangePercent = asset.previousClose ? ((asset.currentPrice - asset.previousClose) / asset.previousClose) * 100 : 0;

                            return (
                                <tr
                                    key={holding.id}
                                    className="hover:bg-background-muted/50 group cursor-pointer transition-colors"
                                    onClick={() => onEdit && onEdit(holding, asset)}
                                >
                                    <td className="px-6 py-4 sticky left-0 bg-background-card group-hover:bg-background-muted/50 transition-colors z-10">
                                        <div className="font-semibold text-foreground">{asset.symbol}</div>
                                        <div className="text-xs text-foreground-subtle max-w-[150px] truncate mb-1" title={asset.name}>{asset.name}</div>
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getTypeColor(asset.type)}`}>
                                            {t(`investments.types.${asset.type}`, asset.type)}
                                        </span>
                                    </td>
                                    {isVisible('quantity') && (
                                        <td className="px-6 py-4 text-right text-foreground-muted font-mono">
                                            {holding.quantity}
                                        </td>
                                    )}
                                    {isVisible('price') && (
                                        <td className="px-6 py-4 text-right font-mono text-foreground-muted">
                                            {formatMoney(asset.currentPrice, asset.currency)}
                                        </td>
                                    )}
                                    {isVisible('avgPrice') && (
                                        <td className="px-6 py-4 text-right font-mono text-foreground-muted">
                                            {formatMoney(holding.averageBuyPrice, asset.currency)}
                                        </td>
                                    )}
                                    {isVisible('taxRate') && (
                                        <td className="px-6 py-4 text-right font-mono text-foreground-muted">
                                            {taxRate}%
                                        </td>
                                    )}
                                    {isVisible('estTax') && (
                                        <td className="px-6 py-4 text-right font-mono text-red-500 text-xs">
                                            {taxLiability > 0 ? `-${formatMoney(taxLiability, asset.currency)}` : '-'}
                                        </td>
                                    )}
                                    {isVisible('dayChange') && (
                                        <td className={`px-6 py-4 text-right font-mono text-sm ${dayChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            <div className="flex items-center justify-end gap-1">
                                                {dayChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                {dayChangePercent >= 0 ? '+' : ''}{dayChangePercent.toFixed(2)}%
                                            </div>
                                        </td>
                                    )}
                                    {isVisible('value') && (
                                        <td className="px-6 py-4 text-right font-mono font-medium text-foreground">
                                            {formatMoney(value, asset.currency)}
                                        </td>
                                    )}
                                    {isVisible('gainLoss') && (
                                        <td className={`px-6 py-4 text-right font-mono text-sm ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            <div className="flex flex-col items-end">
                                                <span>{gain >= 0 ? '+' : ''}{formatMoney(gain, asset.currency)}</span>
                                                <span className="text-xs opacity-80">{gainPercent.toFixed(2)}%</span>
                                            </div>
                                        </td>
                                    )}
                                    {showActions && (
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                {onEdit && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEdit(holding, asset);
                                                        }}
                                                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                                        title={t('common.edit')}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {onSell && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSell(holding, asset);
                                                        }}
                                                        className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                                                        title={t('investments.sell')}
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function getTypeColor(type: Asset['type']) {
    switch (type) {
        case 'stock': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'etf': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        case 'crypto': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'bond': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        case 'fund': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
        default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
}
