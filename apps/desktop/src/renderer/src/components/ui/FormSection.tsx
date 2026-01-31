import React from 'react';
import { cn } from '../../lib/utils';

export interface FormSectionProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    showDivider?: boolean;
}

export const FormSection: React.FC<FormSectionProps> = ({
    title,
    icon,
    children,
    className,
    showDivider = true,
}) => {
    return (
        <>
            {showDivider && (
                <div className="h-px bg-border/50" />
            )}
            <div className={cn('space-y-4', className)}>
                <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                    {icon}
                    {title}
                </h3>
                {children}
            </div>
        </>
    );
};
