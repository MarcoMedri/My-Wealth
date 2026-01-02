import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps {
    title?: string;
    subtitle?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
    title,
    subtitle,
    icon,
    actions,
    children,
    className,
    onClick,
    hoverable = false,
}) => {
    return (
        <div
            className={cn(
                'bg-background-card rounded-xl border border-border p-4',
                hoverable && 'hover:shadow-md hover:border-primary/30 transition-all cursor-pointer',
                onClick && 'cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            {(title || icon || actions) && (
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {icon && (
                            <div className="text-foreground-muted">
                                {icon}
                            </div>
                        )}
                        <div>
                            {title && (
                                <h3 className="font-semibold text-foreground">{title}</h3>
                            )}
                            {subtitle && (
                                <p className="text-xs text-foreground-muted">{subtitle}</p>
                            )}
                        </div>
                    </div>
                    {actions && (
                        <div className="flex items-center gap-2">
                            {actions}
                        </div>
                    )}
                </div>
            )}
            {children}
        </div>
    );
};
