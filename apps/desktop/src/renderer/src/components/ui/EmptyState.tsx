import React from 'react';
import { LucideIcon, Plus, FileQuestion, Search, Inbox } from 'lucide-react';
import { Button } from './Button';

// ============================================================================
// TYPES
// ============================================================================

export interface EmptyStateProps {
    /** Title text */
    title: string;
    /** Description text */
    description?: string;
    /** Icon to display */
    icon?: LucideIcon;
    /** Primary action button */
    action?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
    };
    /** Secondary action button */
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Custom illustration component */
    illustration?: React.ReactNode;
}

// ============================================================================
// SIZE CONFIGS
// ============================================================================

const sizeConfigs = {
    sm: {
        padding: 'py-8',
        iconSize: 'w-10 h-10',
        iconBg: 'w-16 h-16',
        titleSize: 'text-base',
        descSize: 'text-sm',
    },
    md: {
        padding: 'py-12',
        iconSize: 'w-12 h-12',
        iconBg: 'w-20 h-20',
        titleSize: 'text-lg',
        descSize: 'text-sm',
    },
    lg: {
        padding: 'py-16',
        iconSize: 'w-16 h-16',
        iconBg: 'w-24 h-24',
        titleSize: 'text-xl',
        descSize: 'text-base',
    },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function EmptyState({
    title,
    description,
    icon: Icon = Inbox,
    action,
    secondaryAction,
    size = 'md',
    illustration,
}: EmptyStateProps) {
    const config = sizeConfigs[size];
    const ActionIcon = action?.icon || Plus;

    return (
        <div className={`flex flex-col items-center justify-center text-center ${config.padding}`}>
            {/* Icon/Illustration */}
            {illustration || (
                <div className={`${config.iconBg} rounded-full bg-background-muted flex items-center justify-center mb-4`}>
                    <Icon className={`${config.iconSize} text-foreground-muted`} />
                </div>
            )}

            {/* Title */}
            <h3 className={`${config.titleSize} font-semibold text-foreground mb-2`}>
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className={`${config.descSize} text-foreground-muted max-w-md mb-6`}>
                    {description}
                </p>
            )}

            {/* Actions */}
            {(action || secondaryAction) && (
                <div className="flex items-center gap-3">
                    {action && (
                        <Button onClick={action.onClick} leftIcon={<ActionIcon className="w-4 h-4" />}>
                            {action.label}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button variant="secondary" onClick={secondaryAction.onClick}>
                            {secondaryAction.label}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// PRESET EMPTY STATES
// ============================================================================

interface PresetEmptyStateProps {
    onCreate?: () => void;
    actionLabel?: string;
}

export function NoTransactionsEmpty({ onCreate, actionLabel = 'Add Transaction' }: PresetEmptyStateProps) {
    return (
        <EmptyState
            icon={Inbox}
            title="No transactions yet"
            description="Start tracking your finances by adding your first transaction."
            action={onCreate ? { label: actionLabel, onClick: onCreate } : undefined}
        />
    );
}

export function NoResultsEmpty({ query }: { query: string }) {
    return (
        <EmptyState
            icon={Search}
            title="No results found"
            description={`We couldn't find anything matching "${query}". Try adjusting your search.`}
            size="sm"
        />
    );
}

export function NoDataEmpty({ description }: { description?: string }) {
    return (
        <EmptyState
            icon={FileQuestion}
            title="No data available"
            description={description || "There's nothing here yet."}
            size="sm"
        />
    );
}

export function NoAccountsEmpty({ onCreate }: PresetEmptyStateProps) {
    return (
        <EmptyState
            icon={Inbox}
            title="No accounts yet"
            description="Add your first bank account or wallet to start tracking your balance."
            action={onCreate ? { label: 'Add Account', onClick: onCreate } : undefined}
        />
    );
}

export function NoInvestmentsEmpty({ onCreate }: PresetEmptyStateProps) {
    return (
        <EmptyState
            icon={Inbox}
            title="No investments yet"
            description="Start building your portfolio by adding your first investment."
            action={onCreate ? { label: 'Add Investment', onClick: onCreate } : undefined}
        />
    );
}

export function NoPropertiesEmpty({ onCreate }: PresetEmptyStateProps) {
    return (
        <EmptyState
            icon={Inbox}
            title="No properties yet"
            description="Track your real estate by adding your first property."
            action={onCreate ? { label: 'Add Property', onClick: onCreate } : undefined}
        />
    );
}

export function NoInsuranceEmpty({ onCreate }: PresetEmptyStateProps) {
    return (
        <EmptyState
            icon={Inbox}
            title="No insurance policies yet"
            description="Keep track of your policies by adding your first one."
            action={onCreate ? { label: 'Add Policy', onClick: onCreate } : undefined}
        />
    );
}

export function NoDepositsEmpty({ onCreate }: PresetEmptyStateProps) {
    return (
        <EmptyState
            icon={Inbox}
            title="No deposit accounts yet"
            description="Track your savings by adding a deposit account."
            action={onCreate ? { label: 'Add Deposit', onClick: onCreate } : undefined}
        />
    );
}
