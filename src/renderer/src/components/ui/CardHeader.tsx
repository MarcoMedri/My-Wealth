/**
 * CardHeader Component - Standardized header for cards
 * 
 * Provides consistent header styling with:
 * - Optional icon (with customizable color)
 * - Title text
 * - Optional action buttons/elements on the right
 * 
 * Used to maintain visual consistency across all card headers in the app
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { DESIGN_TOKENS } from '../../lib/design-tokens';
import { LucideIcon } from 'lucide-react';

interface CardHeaderProps {
    /** Icon component (from lucide-react) */
    icon?: LucideIcon;
    /** Icon color class (e.g., 'text-blue-600'), defaults to blue */
    iconColor?: string;
    /** Header title text */
    title: string;
    /** Optional subtitle/description */
    subtitle?: string;
    /** Optional action buttons or elements displayed on the right */
    action?: React.ReactNode;
    /** Additional CSS classes */
    className?: string;
}

export function CardHeader({
    icon: Icon,
    iconColor = 'text-blue-600',
    title,
    subtitle,
    action,
    className = ''
}: CardHeaderProps) {
    return (
        <div className={cn(
            "flex items-center justify-between",
            DESIGN_TOKENS.spacing.header.marginBottom,
            className
        )}>
            <div className={cn("flex items-center", DESIGN_TOKENS.spacing.header.gap)}>
                {Icon && (
                    <Icon className={cn("w-5 h-5", iconColor)} />
                )}
                <div>
                    <h2 className={DESIGN_TOKENS.typography.cardTitle}>
                        {title}
                    </h2>
                    {subtitle && (
                        <p className={DESIGN_TOKENS.typography.cardSubtitle}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {action && (
                <div className="flex items-center gap-2">
                    {action}
                </div>
            )}
        </div>
    );
}
