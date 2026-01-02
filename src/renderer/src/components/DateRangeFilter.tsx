import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type DateRange = 'current-month' | 'last-3-months' | 'last-6-months' | 'last-year' | 'all';

interface DateRangeFilterProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    className?: string;
}

export function getDateRangeLabel(range: DateRange, t: (key: string) => string): string {
    switch (range) {
        case 'current-month':
            return t('filters.currentMonth') || 'Current Month';
        case 'last-3-months':
            return t('filters.last3Months') || 'Last 3 Months';
        case 'last-6-months':
            return t('filters.last6Months') || 'Last 6 Months';
        case 'last-year':
            return t('filters.lastYear') || 'Last Year';
        case 'all':
            return t('filters.allTime') || 'All Time';
        default:
            return range;
    }
}

export function getDateRangeBounds(range: DateRange): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    switch (range) {
        case 'current-month':
            startDate.setDate(1);
            break;
        case 'last-3-months':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
        case 'last-6-months':
            startDate.setMonth(startDate.getMonth() - 6);
            break;
        case 'last-year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        case 'all':
            startDate.setFullYear(2000); // Far past date
            break;
    }

    return { startDate, endDate };
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const options: DateRange[] = ['current-month', 'last-3-months', 'last-6-months', 'last-year', 'all'];

    const handleSelect = (range: DateRange) => {
        onChange(range);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className || ''}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-background-muted rounded-xl text-foreground-muted hover:bg-background-subtle transition-colors border border-border"
            >
                <span className="text-sm font-medium">{getDateRangeLabel(value, t)}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-48 bg-background-card rounded-xl shadow-lg border border-border z-20 overflow-hidden">
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => handleSelect(option)}
                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-background-muted transition-colors ${value === option
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                                    : 'text-foreground'
                                    }`}
                            >
                                {getDateRangeLabel(option, t)}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Hook for easy filtering
export function useDateRangeFilter<T>(
    items: T[],
    dateRange: DateRange,
    getDate: (item: T) => string | Date
): T[] {
    return useMemo(() => {
        const { startDate, endDate } = getDateRangeBounds(dateRange);

        return items.filter(item => {
            const itemDate = new Date(getDate(item));
            return itemDate >= startDate && itemDate <= endDate;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, dateRange]);
}
