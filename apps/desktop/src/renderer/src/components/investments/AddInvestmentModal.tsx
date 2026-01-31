import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, AlertTriangle } from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatMoney } from '../../../@my-wealth/shared/schemas';
import type { InvestmentSearchResult, SupportedCurrency } from '../../../@my-wealth/shared/types';
import { useTranslation } from 'react-i18next';



interface AddInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedBrokerId?: string;
}

export function AddInvestmentModal({ isOpen, onClose, preselectedBrokerId }: AddInvestmentModalProps) {
    const { accounts, refreshInvestments, workspace } = useVaultStore();
    const baseCurrency = useSettingsStore(state => state.currency);
    const { t } = useTranslation();

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<InvestmentSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [showResults, setShowResults] = useState(false);

    // Form State
    const [symbol, setSymbol] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState<'stock' | 'etf' | 'crypto' | 'bond' | 'fund' | 'insurance' | 'other'>('stock');
    const [currency, setCurrency] = useState<SupportedCurrency>(baseCurrency);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState(''); // Display price
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [fees, setFees] = useState('0');
    const [taxRate, setTaxRate] = useState('26');
    const [accountId, setAccountId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Metadata State
    const [sector, setSector] = useState('');
    const [country, setCountry] = useState('');
    const [region, setRegion] = useState('');

    // Filter accounts
    const availableAccounts = accounts.filter(a =>
        !a.isArchived &&
        a.type === 'investment' &&
        (!preselectedBrokerId || a.brokerId === preselectedBrokerId)
    );

    // Auto-select account if only one available
    useEffect(() => {
        if (isOpen) {
            // Reset form on open
            setSearchQuery('');
            setSearchResults([]);
            setSymbol('');
            setName('');
            setType('stock');
            setCurrency(baseCurrency);
            setQuantity('');
            setPrice('');
            setDate(new Date().toISOString().split('T')[0]);
            setFees('0');
            // Default tax will be set by the effect below
            setErrorMessage(null);
            // Reset metadata
            setSector('');
            setCountry('');
            setRegion('');

            if (availableAccounts.length > 0) {
                setAccountId(availableAccounts[0].id);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, availableAccounts.length]);

    // Auto-set tax rate based on type
    useEffect(() => {
        if (isOpen) {
            const def = workspace.taxDefaults?.[type] ?? 26;
            setTaxRate(def.toString());
        }
    }, [type, isOpen, workspace.taxDefaults]);

    // Search Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length > 2) {
                setIsSearching(true);
                // setSearchError(null);
                try {
                    const results = await window.api.searchInvestments(searchQuery);
                    setSearchResults(results);
                    setShowResults(true);
                    if (results.length === 0) {
                        // Optional: setSearchError? Or just show empty
                    }
                } catch (e) {
                    console.error(e);
                    // setSearchError(t('modals.investmentModal.searchError', 'Errore nella ricerca.'));
                    setSearchResults([]); // Clear stale results
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, t]);

    const handleSelectAsset = async (assetResult: InvestmentSearchResult) => {
        setIsSearching(true);
        setShowResults(false); // Hide dropdown
        setErrorMessage(null);

        // Auto-fill basics immediately
        setSymbol(assetResult.symbol);
        setName(assetResult.name);
        setType((assetResult.type as 'stock' | 'etf' | 'crypto' | 'bond' | 'fund' | 'insurance' | 'other') || 'stock');
        setCurrency(assetResult.currency as SupportedCurrency);

        try {
            // Try to get live quote
            const quote = await window.api.getInvestmentQuote(assetResult.symbol);
            setPrice((quote.price / 100).toString());
            // Update details if quote has better ones
            setCurrency(quote.currency as SupportedCurrency);
            if (quote.name) setName(quote.name);
        } catch (e) {
            console.error("Failed to get quote", e);
            // Non-blocking, user can enter price manually
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!accountId || !symbol.trim() || !name.trim() || !quantity || !price) {
            setErrorMessage(t('errors.missingRequiredFields') || "Please fill required fields");
            return;
        }

        const selectedAccount = availableAccounts.find(a => a.id === accountId);
        const brokerId = selectedAccount?.brokerId;

        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            // We use buyInvestmentManual which accepts all metadata to ensure asset is created/updated correctly
            await window.api.buyInvestmentManual({
                symbol: symbol.toUpperCase(),
                name,
                type,
                currency,
                accountId,
                quantity: parseFloat(quantity),
                price: parseFloat(price) * 100, // to cents
                date,
                fees: parseFloat(fees) * 100, // to cents
                brokerId,
                taxRate: parseFloat(taxRate),
                // Add metadata if provided
                metadata: (sector || country || region) ? {
                    sector: sector || undefined,
                    country: country || undefined,
                    region: region || undefined,
                } : undefined
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

    // Close Dropdown on click outside (simple version: just close if clicking form)
    const closeDropdown = () => setShowResults(false);

    if (!isOpen) return null;

    // Empty State Check
    if (availableAccounts.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-background-card rounded-2xl w-full max-w-lg shadow-xl border border-border p-6 text-center space-y-4">
                    <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">
                            {accounts.some(a => a.type === 'investment' && !a.isArchived) ?
                                t('modals.investmentModal.noAccountMatchTitle', 'Nessun Conto Corrispondente') :
                                t('modals.investmentModal.noAccountTitle', 'Nessun Conto Titoli')
                            }
                        </h3>
                        <p className="text-foreground-muted mt-2">
                            {t('modals.investmentModal.noAccountDesc', 'Per aggiungere un investimento devi prima creare un "Conto Titoli" (Securities Account) all\'interno di un Broker.')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-background-subtle hover:bg-background-muted text-foreground rounded-lg transition-colors"
                    >
                        {t('common.close', 'Chiudi')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeDropdown}>
            <div className="bg-background-card rounded-2xl w-full max-w-lg shadow-xl border border-border flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-background-main rounded-t-2xl">
                    <h2 className="text-lg font-semibold text-foreground">
                        {t('modals.investmentModal.addTitle')}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-background-muted dark:hover:bg-background-subtle rounded-full transition-colors">
                        <X className="w-5 h-5 text-foreground-subtle" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">

                    {/* 1. Search Bar */}
                    <div className="relative z-20">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-1.5 ml-1">
                            {t('modals.investmentModal.searchHint', 'Cerca o Inserisci Simbolo')}
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                            <input
                                type="text"
                                placeholder="AAPL, VWCE, Bitcoin..."
                                className="w-full pl-9 pr-4 py-2.5 bg-background-subtle border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    // Also update symbol logic if user types manually? 
                                    // Better to let them select or type in symbol field below specifically if manual
                                }}
                                onFocus={() => {
                                    if (searchResults.length > 0) setShowResults(true);
                                }}
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                </div>
                            )}
                        </div>

                        {/* Dropdown Results */}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-background-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-border/50">
                                {searchResults.map((result) => (
                                    <button
                                        key={result.symbol}
                                        onClick={() => handleSelectAsset(result)}
                                        className="w-full flex justify-between items-center p-3 hover:bg-background-subtle transition-colors text-left group"
                                    >
                                        <div>
                                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{result.symbol}</div>
                                            <div className="text-xs text-foreground-muted truncate max-w-[200px]">{result.name}</div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-background-muted text-foreground-muted uppercase">
                                                {result.type}
                                            </span>
                                            <span className="text-xs text-foreground-subtle">{result.exchange}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* No Results State */}
                        {showResults && !isSearching && searchQuery.length > 2 && searchResults.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-background-card border border-border rounded-xl shadow-xl p-4 text-center text-foreground-muted z-50">
                                <p>{t('modals.investmentModal.noResults', 'Nessun risultato trovato.')}</p>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-border/50" />

                    {/* 2. Asset Details Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-foreground-subtle">{t('modals.investmentModal.symbol')}</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={symbol}
                                    onChange={e => setSymbol(e.target.value.toUpperCase())}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-foreground-subtle">{t('modals.investmentModal.type')}</label>
                                <select
                                    className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={type}
                                    onChange={e => setType(e.target.value as 'stock' | 'etf' | 'crypto' | 'bond' | 'fund' | 'insurance' | 'other')}
                                >
                                    <option value="stock">{t('modals.investmentModal.types.stock')}</option>
                                    <option value="etf">{t('modals.investmentModal.types.etf')}</option>
                                    <option value="crypto">{t('modals.investmentModal.types.crypto')}</option>
                                    <option value="bond">{t('modals.investmentModal.types.bond')}</option>
                                    <option value="fund">{t('modals.investmentModal.types.fund')}</option>
                                    <option value="insurance">{t('modals.investmentModal.types.insurance')}</option>
                                    <option value="other">{t('modals.investmentModal.types.other')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-foreground-subtle">{t('modals.investmentModal.name')}</label>
                            <input
                                type="text"
                                required
                                className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        {/* Metadata Fields */}
                        <div className="space-y-4 p-4 bg-background-subtle/50 rounded-lg border border-border/50">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                                    {t('investments.metadata', 'Metadati')} ({t('common.optional', 'Opzionale')})
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-foreground-subtle">
                                        {t('investments.sector', 'Settore')}
                                    </label>
                                    <select
                                        className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                        value={sector}
                                        onChange={e => setSector(e.target.value)}
                                    >
                                        <option value="">{t('investments.selectSector', 'Seleziona Settore')}</option>
                                        <option value="Technology">Technology</option>
                                        <option value="Healthcare">Healthcare</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Consumer">Consumer</option>
                                        <option value="Energy">Energy</option>
                                        <option value="Utilities">Utilities</option>
                                        <option value="Real Estate">Real Estate</option>
                                        <option value="Materials">Materials</option>
                                        <option value="Industrials">Industrials</option>
                                        <option value="Telecommunications">Telecommunications</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-foreground-subtle">
                                        {t('investments.region', 'Regione')}
                                    </label>
                                    <select
                                        className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                        value={region}
                                        onChange={e => setRegion(e.target.value)}
                                    >
                                        <option value="">{t('investments.selectRegion', 'Seleziona Regione')}</option>
                                        <option value="North America">North America</option>
                                        <option value="Europe">Europe</option>
                                        <option value="Asia">Asia</option>
                                        <option value="Latin America">Latin America</option>
                                        <option value="Middle East">Middle East</option>
                                        <option value="Africa">Africa</option>
                                        <option value="Oceania">Oceania</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-foreground-subtle">
                                    {t('investments.country', 'Paese')}
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={country}
                                    onChange={e => setCountry(e.target.value)}
                                    placeholder={t('investments.countryPlaceholder', 'es. USA, Italy, Germany')}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1 col-span-1">
                                <label className="text-sm font-medium text-foreground-subtle">{t('modals.investmentModal.currency')}</label>
                                <select
                                    className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={currency}
                                    onChange={e => setCurrency(e.target.value as SupportedCurrency)}
                                >
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                    <option value="CHF">CHF</option>
                                </select>
                            </div>
                            <div className="space-y-1 col-span-2">
                                <label className="text-sm font-medium text-foreground-subtle">{t('modals.investmentModal.buyDate')}</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-foreground-subtle">{t('modals.investmentModal.quantity')}</label>
                                <input
                                    type="number" step="any" required
                                    className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none text-lg font-semibold"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-foreground-subtle">{t('modals.investmentModal.buyPrice')}</label>
                                <input
                                    type="number" step="any" required
                                    className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none text-lg font-semibold"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-foreground-subtle">{t('modals.investmentModal.fees') || 'Fees'}</label>
                                <input
                                    type="number" step="any"
                                    className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={fees}
                                    onChange={e => setFees(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-foreground-subtle">{t('modals.investmentModal.taxRate')}</label>
                                <div className="relative">
                                    <input
                                        type="number" step="any"
                                        className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                        value={taxRate}
                                        onChange={e => setTaxRate(e.target.value)}
                                    />
                                    <div className="absolute right-3 top-2 text-foreground-muted text-sm">%</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-foreground-subtle">Account</label>
                                <select
                                    required
                                    className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={accountId}
                                    onChange={e => setAccountId(e.target.value)}
                                >
                                    <option value="" disabled>Select Account</option>
                                    {availableAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(0, acc.currency)})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Summary / Total */}
                        {quantity && price && (
                            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl flex justify-between items-center animate-in fade-in zoom-in-95 duration-200">
                                <span className="text-foreground-muted font-medium">Estimated Total</span>
                                <span className="font-bold text-xl text-primary">
                                    {formatMoney(
                                        Math.round(parseFloat(quantity) * parseFloat(price) * 100) + Math.round(parseFloat(fees || '0') * 100),
                                        currency
                                    )}
                                </span>
                            </div>
                        )}

                        {/* Error message */}
                        {errorMessage && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-background-subtle transition-colors font-medium"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('common.save')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
