import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, className, id, ...props }, ref) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className="space-y-1">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-foreground-muted"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={cn(
                        'w-full px-3 py-2 bg-background-subtle border border-border rounded-lg',
                        'text-foreground placeholder:text-foreground-muted/50',
                        'focus:ring-2 focus:ring-primary focus:border-transparent outline-none',
                        'transition-colors',
                        error && 'border-error focus:ring-error',
                        props.disabled && 'opacity-50 cursor-not-allowed',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-xs text-error">{error}</p>
                )}
                {hint && !error && (
                    <p className="text-xs text-foreground-muted">{hint}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
