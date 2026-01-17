import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon | React.ElementType;
    iconClassName?: string;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    icon: Icon,
    iconClassName,
    actions,
    className
}: PageHeaderProps) {
    return (
        <header className={cn("px-card-p py-4 border-b border-border flex items-center justify-between bg-background", className)}>
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    {Icon && <Icon className={cn("w-6 h-6", iconClassName)} />}
                    {title}
                </h1>
                {description && (
                    <p className={cn("text-sm text-foreground-muted mt-1", Icon && "pl-8")}>
                        {description}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </header>
    );
}
