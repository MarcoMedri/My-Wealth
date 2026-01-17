/**
 * Card Component - Base card component with consistent styling
 * 
 * Provides a standardized container for content with consistent:
 * - Background colors (light/dark mode)
 * - Border styles
 * - Padding options
 * - Optional header with icon, title, subtitle, and actions
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { DESIGN_TOKENS, getCardPadding } from '../../lib/design-tokens';

export interface CardProps {
    title?: string;
    subtitle?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hover?: boolean;
    padding?: 'sm' | 'md' | 'lg';
}

export function Card({ // Changed to function component
    title,
    subtitle,
    icon,
    actions,
    children,
    className = '', // Added default for className
    onClick,
    hover = false, // Changed from hoverable and added default
    padding = 'md',
}: CardProps) {
    const isClickable = !!onClick;
    const paddingClass = getCardPadding(padding);

    return (
        <div
            onClick={onClick}
            className={cn(
                // Base styles from design tokens
                DESIGN_TOKENS.colors.background.card,
                DESIGN_TOKENS.radius.card,
                DESIGN_TOKENS.shadow.card,
                DESIGN_TOKENS.colors.border.default,
                'border',
                paddingClass,

                // Enhanced hover effects
                (hover || isClickable) && [
                    'transition-all duration-300 ease-out',
                    'hover:scale-[1.02]',
                    'hover:shadow-2xl',
                    'hover:-translate-y-1',
                    'active:scale-[0.98]',
                    'active:translate-y-0',
                ],

                // Clickable styling
                isClickable && 'cursor-pointer',

                // Custom classes
                className
            )}
        >
            {(title || icon || actions) && (
                <div className={cn("flex items-center justify-between", DESIGN_TOKENS.spacing.header.marginBottom)}>
                    <div className={cn("flex items-center", DESIGN_TOKENS.spacing.header.gap)}>
                        {icon && (
                            <div className="text-blue-600">
                                {icon}
                            </div>
                        )}
                        <div>
                            {title && (
                                <h3 className={DESIGN_TOKENS.typography.cardTitle}>{title}</h3>
                            )}
                            {subtitle && (
                                <p className={DESIGN_TOKENS.typography.cardSubtitle}>{subtitle}</p>
                            )}
                        </div>
                    </div>
                    {actions && (
                        <div className={cn("flex items-center", DESIGN_TOKENS.spacing.header.gap)}>
                            {actions}
                        </div>
                    )}
                </div>
            )}
            {children}
        </div>
    );
}
