import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

export interface MoneyInputProps {
    label?: string;
    value: number; // In cents
    onChange: (value: number) => void;
    currency?: string;
    error?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
    label,
    value,
    onChange,
    currency = 'EUR',
    error,
    placeholder = '0,00',
    disabled,
    required,
    className,
}) => {
    // Display value in user-friendly format (euros, not cents)
    const [displayValue, setDisplayValue] = useState(() => {
        return value ? (value / 100).toFixed(2) : '';
    });

    // Sync display when value changes from parent
    useEffect(() => {
        const formatted = value ? (value / 100).toFixed(2) : '';
        if (formatted !== displayValue) {
            setDisplayValue(formatted);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setDisplayValue(raw);

        // Convert to cents
        const parsed = parseFloat(raw.replace(',', '.'));
        if (!isNaN(parsed)) {
            onChange(Math.round(parsed * 100));
        } else if (raw === '') {
            onChange(0);
        }
    };

    const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;

    return (
        <div className={cn('space-y-1', className)}>
            {label && (
                <label className="block text-sm font-medium text-foreground-muted">
                    {label} {required && '*'}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    inputMode="decimal"
                    placeholder={placeholder}
                    value={displayValue}
                    onChange={handleChange}
                    disabled={disabled}
                    className={cn(
                        'w-full px-3 py-2 pr-10 bg-background-subtle border border-border rounded-lg',
                        'text-foreground placeholder:text-foreground-muted/50',
                        'focus:ring-2 focus:ring-primary focus:border-transparent outline-none',
                        'transition-colors',
                        error && 'border-error focus:ring-error',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">
                    {currencySymbol}
                </span>
            </div>
            {error && (
                <p className="text-xs text-error">{error}</p>
            )}
        </div>
    );
};
