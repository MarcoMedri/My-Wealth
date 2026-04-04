/**
 * Design Tokens - MyWealth Desktop
 * Centralized design constants for consistency across the application
 */

export const DESIGN_TOKENS = {
  /**
   * Icon Colors by Category
   * Consistent colors for different sections/features
   */
  colors: {
    icon: {
      performance: 'text-blue-600',
      allocation: 'text-purple-600',
      portfolio: 'text-emerald-600',
      dividend: 'text-green-600',
      properties: 'text-amber-600',
      collectibles: 'text-violet-600',
      insurance: 'text-rose-600',
      deposits: 'text-cyan-600',
      accounts: 'text-emerald-600',
      analytics: 'text-blue-600',
    },
    background: {
      card: 'bg-white dark:bg-gray-800',
      subtle: 'bg-gray-50 dark:bg-gray-900',
      hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    },
    border: {
      default: 'border-gray-200 dark:border-gray-700',
      subtle: 'border-gray-100 dark:border-gray-800',
    },
    text: {
      primary: 'text-gray-900 dark:text-white',
      secondary: 'text-gray-500 dark:text-gray-400',
      muted: 'text-gray-400 dark:text-gray-500',
    },
    chart: {
      primary: '#3b82f6', // blue-500
      grid: '#334155',    // slate-700
      text: '#94a3b8',    // slate-400
      tooltip: {
        background: 'var(--background-card)',
        border: 'var(--border)',
        text: 'var(--foreground)',
      }
    },
  },

  /**
   * Spacing System
   * Consistent spacing throughout the app
   */
  spacing: {
    card: {
      padding: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      gap: 'space-y-6',
    },
    header: {
      marginBottom: 'mb-4',
      gap: 'gap-2',
    },
    section: {
      marginBottom: 'mb-6',
      gap: 'space-y-4',
    },
  },

  /**
   * Typography
   * Standardized text styles
   */
  typography: {
    cardTitle: 'text-lg font-semibold text-gray-900 dark:text-white',
    cardSubtitle: 'text-sm font-medium text-gray-500 dark:text-gray-400',
    sectionTitle: 'text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500',
    body: 'text-sm text-gray-700 dark:text-gray-300',
    caption: 'text-xs text-gray-500 dark:text-gray-400',
  },

  /**
   * Border Radius
   */
  radius: {
    card: 'rounded-lg',
    button: 'rounded-lg',
    input: 'rounded-lg',
    badge: 'rounded-full',
  },

  /**
   * Shadows
   */
  shadow: {
    card: 'shadow-sm',
    cardHover: 'hover:shadow-md',
    button: 'shadow-md',
  },

  /**
   * Transitions
   */
  transition: {
    default: 'transition-all duration-200',
    fast: 'transition-all duration-150',
    slow: 'transition-all duration-300',
  },
} as const;

/**
 * Helper function to get icon color by category
 */
export function getIconColor(category: keyof typeof DESIGN_TOKENS.colors.icon): string {
  return DESIGN_TOKENS.colors.icon[category];
}

/**
 * Helper function to get card padding by size
 */
export function getCardPadding(size: 'sm' | 'md' | 'lg' = 'md'): string {
  return DESIGN_TOKENS.spacing.card.padding[size];
}
