
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Holding, Asset } from '../../../../shared/schemas';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';

interface HoldingsTableProps {
    holdings: Holding[];
    assets: Asset[];
    onSell?: (holding: Holding, asset: Asset) => void;
    onEdit?: (holding: Holding, asset: Asset) => void;
}

export function HoldingsTable({ holdings, assets, onSell, onEdit, onDelete }: HoldingsTableProps) {
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();

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
                            <th className="px-6 py-3 text-right">{t('investments.quantity')}</th>
                            <th className="px-6 py-3 text-right">{t('investments.price')}</th>
                            <th className="px-6 py-3 text-right">{t('investments.avgWithCost', 'Avg Price')}</th>
                            <th className="px-6 py-3 text-right">{t('investments.taxRate')}</th>
                            <th className="px-6 py-3 text-right">{t('investments.estTax')}</th>
                            <th className="px-6 py-3 text-right">{t('investments.dayChange')}</th>
                            <th className="px-6 py-3 text-right">{t('investments.value')}</th>
                            <th className="px-6 py-3 text-right">{t('investments.gainLoss')}</th>
                            <th className="px-6 py-3 text-right w-12">{t('common.actions')}</th>
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
                                        <div className="text-xs text-foreground-subtle max-w-[150px] truncate" title={asset.name}>{asset.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-foreground-muted font-mono">
                                        {holding.quantity}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-foreground-muted">
                                        {formatMoney(asset.currentPrice, asset.currency)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-foreground-muted">
                                        {formatMoney(holding.averageBuyPrice, asset.currency)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-foreground-muted">
                                        {taxRate}%
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-red-500 text-xs">
                                        {taxLiability > 0 ? `-${formatMoney(taxLiability, asset.currency)}` : '-'}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-mono text-sm ${dayChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        <div className="flex items-center justify-end gap-1">
                                            {dayChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {dayChangePercent >= 0 ? '+' : ''}{dayChangePercent.toFixed(2)}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-medium text-foreground">
                                        {formatMoney(value, asset.currency)}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-mono text-sm ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        <div className="flex flex-col items-end">
                                            <span>{gain >= 0 ? '+' : ''}{formatMoney(gain, asset.currency)}</span>
                                            <span className="text-xs opacity-80">{gainPercent.toFixed(2)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        {onSell && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSell(holding, asset);
                                                }}
                                                className="btn btn-ghost btn-sm text-foreground-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                title={t('investments.sell')}
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
