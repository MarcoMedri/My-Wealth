import React from 'react';
import { cn } from '../../lib/utils';

export interface DateInputProps {
    label?: string;
    value: string; // YYYY-MM-DD or ISO string
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    min?: string;
    max?: string;
    className?: string;
}

/**
 * Converts any date input to YYYY-MM-DD format for the input element
 */
const toInputFormat = (dateString: string): string => {
    if (!dateString) return '';
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
    }
    // If ISO string, extract date part
    if (dateString.includes('T')) {
        return dateString.split('T')[0];
    }
    return dateString;
};

/**
 * Converts YYYY-MM-DD to full ISO string (noon UTC to avoid timezone issues)
 */
const toISOString = (dateString: string): string => {
    if (!dateString) return '';
    if (dateString.includes('T')) return dateString;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
};

export const DateInput: React.FC<DateInputProps> = ({
    label,
    value,
    onChange,
    error,
    disabled,
    required,
    min,
    max,
    className,
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        // Always emit full ISO string
        onChange(toISOString(newValue));
    };

    return (
        <div className={cn('space-y-1', className)}>
            {label && (
                <label className="block text-sm font-medium text-foreground-muted">
                    {label} {required && '*'}
                </label>
            )}
            <input
                type="date"
                value={toInputFormat(value)}
                onChange={handleChange}
                disabled={disabled}
                required={required}
                min={min}
                max={max}
                className={cn(
                    'w-full px-3 py-2 bg-background-subtle border border-border rounded-lg',
                    'text-foreground',
                    'focus:ring-2 focus:ring-primary focus:border-transparent outline-none',
                    'transition-colors',
                    error && 'border-error focus:ring-error',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            />
            {error && (
                <p className="text-xs text-error">{error}</p>
            )}
        </div>
    );
};
