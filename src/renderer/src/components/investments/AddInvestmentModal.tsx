import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, AlertTriangle } from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';
import { formatMoney } from '../../../../shared/schemas';
import type { InvestmentSearchResult } from '../../../../shared/types';
import { useTranslation } from 'react-i18next';

// Extended type for selected asset (search result + quote data)
interface SelectedAsset extends InvestmentSearchResult {
    price: number;
}

interface AddInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddInvestmentModal({ isOpen, onClose }: AddInvestmentModalProps) {
    const { accounts, refreshInvestments } = useVaultStore();
    const { t } = useTranslation();
    const [step, setStep] = useState<'search' | 'configure'>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<InvestmentSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);

    // Configure Form
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState(''); // Display price
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [fees, setFees] = useState('0');
    const [accountId, setAccountId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length > 2 && step === 'search') {
                setIsSearching(true);
                try {
                    const results = await window.api.searchInvestments(searchQuery);
                    setSearchResults(results);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else if (searchQuery.length === 0) {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, step]);

    const handleSelectAsset = async (assetResult: InvestmentSearchResult) => {
        setIsSearching(true);
        setQuoteError(null);
        try {
            const quote = await window.api.getInvestmentQuote(assetResult.symbol);
            setSelectedAsset({ ...assetResult, ...quote });
            setPrice((quote.price / 100).toString()); // Quote price is in cents
            setStep('configure');
        } catch (e) {
            console.error("Failed to get quote", e);
            setQuoteError(e instanceof Error ? e.message : 'Failed to get quote');
        } finally {
            setIsSearching(false);
        }
    };

    const handleBuy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId || !selectedAsset) return;

        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            await window.api.buyInvestment({
                symbol: selectedAsset.symbol,
                accountId,
                quantity: parseFloat(quantity),
                price: parseFloat(price) * 100, // to cents
                date,
                fees: parseFloat(fees) * 100 // to cents
            });
            await refreshInvestments();
            onClose();
        } catch (e) {
            console.error("Buy failed", e);
            setErrorMessage(e instanceof Error ? e.message : 'Failed to buy investment');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background-card rounded-2xl w-full max-w-lg shadow-xl border border-border flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-foreground">
                        {step === 'search' ? t('modals.investmentModal.addTitle') : `Buy ${selectedAsset?.symbol}`}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-background-muted dark:hover:bg-background-subtle rounded-full transition-colors">
                        <X className="w-5 h-5 text-foreground-subtle" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {step === 'search' ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                                <input
                                    type="text"
                                    placeholder={t('modals.investmentModal.searchHint')}
                                    className="w-full pl-10 pr-4 py-3 bg-background-muted border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {isSearching && (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                </div>
                            )}

                            <div className="space-y-2">
                                {searchResults.map((result) => (
                                    <button
                                        key={result.symbol}
                                        onClick={() => handleSelectAsset(result)}
                                        className="w-full flex justify-between items-center p-3 hover:bg-background-muted-subtle rounded-lg group text-left transition-colors"
                                    >
                                        <div>
                                            <div className="font-semibold text-foreground">{result.symbol}</div>
                                            <div className="text-sm text-foreground-subtle">{result.name}</div>
                                        </div>
                                        <div className="text-xs text-foreground-muted bg-background-muted px-2 py-1 rounded">
                                            {result.exchange}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Quote Error */}
                            {quoteError && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-300 text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>{quoteError}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleBuy} className="space-y-4">
                            <div className="bg-background-muted p-4 rounded-xl flex justify-between items-center mb-6">
                                <div>
                                    <div className="text-sm text-foreground-subtle">Current Price</div>
                                    <div className="text-xl font-bold text-foreground">
                                        {formatMoney(selectedAsset?.price ?? 0, selectedAsset?.currency ?? 'USD')}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-foreground-subtle">Currency</div>
                                    <div className="font-medium">{selectedAsset?.currency ?? 'USD'}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-foreground">{t('modals.investmentModal.quantity')}</label>
                                    <input
                                        type="number" step="any" required
                                        placeholder="0.00"
                                        className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-foreground">{t('modals.investmentModal.buyPrice')}</label>
                                    <input
                                        type="number" step="any" required
                                        className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-foreground">{t('modals.investmentModal.buyDate')}</label>
                                <input
                                    type="date" required
                                    className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-foreground">Total Fees</label>
                                <input
                                    type="number" step="any"
                                    className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={fees}
                                    onChange={e => setFees(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-foreground">Account (to pay from)</label>
                                <select
                                    required
                                    className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={accountId}
                                    onChange={e => setAccountId(e.target.value)}
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(0, acc.currency)})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Summary */}
                            {quantity && price && (
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex justify-between items-center text-sm">
                                    <span className="text-indigo-900 dark:text-indigo-200 font-medium">Estimated Cost</span>
                                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                                        {formatMoney(
                                            Math.round(parseFloat(quantity) * parseFloat(price) * 100) + Math.round(parseFloat(fees || '0') * 100),
                                            selectedAsset?.currency ?? 'USD'
                                        )}
                                    </span>
                                </div>
                            )}

                            {/* Error message */}
                            {errorMessage && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-300 text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    className="flex-1 btn btn-ghost"
                                    onClick={() => setStep('search')}
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 btn btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Buy'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
