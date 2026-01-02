import React from 'react';
import { cn } from '../../lib/utils';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
    label?: string;
    error?: string;
    options: SelectOption[];
    placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, options, placeholder, className, id, ...props }, ref) => {
        const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className="space-y-1">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-foreground-muted"
                    >
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={selectId}
                    className={cn(
                        'w-full px-3 py-2 bg-background-subtle border border-border rounded-lg',
                        'text-foreground',
                        'focus:ring-2 focus:ring-primary focus:border-transparent outline-none',
                        'transition-colors appearance-none cursor-pointer',
                        error && 'border-error focus:ring-error',
                        props.disabled && 'opacity-50 cursor-not-allowed',
                        className
                    )}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <p className="text-xs text-error">{error}</p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
