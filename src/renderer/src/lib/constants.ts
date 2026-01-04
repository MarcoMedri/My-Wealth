/**
 * MyWealth Desktop - Shared Constants
 * UI constants, colors, and configuration
 */

// ============================================================================
// COLORS
// ============================================================================

/** General chart colors for bars, lines */
export const CHART_COLORS = [
    '#6366f1', // Indigo
    '#22c55e', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#84cc16', // Lime
];

/** Light pastel colors for pie charts (good on dark backgrounds) */
export const PIE_CHART_COLORS = [
    '#86efac', // Green 300
    '#93c5fd', // Blue 300
    '#fde047', // Yellow 300
    '#d8b4fe', // Purple 300
    '#fca5a5', // Red 300
    '#fdba74', // Orange 300
    '#a5f3fc', // Cyan 300
    '#c4b5fd', // Violet 300
];

/** Colors for area/net worth charts */
export const AREA_CHART_COLORS = {
    accounts: '#10b981',    // Emerald 500
    investments: '#3b82f6', // Blue 500
    properties: '#f59e0b',  // Amber 500
    collectibles: '#8b5cf6', // Violet 500
    deposits: '#06b6d4',    // Cyan 500
    insurance: '#ec4899',   // Pink 500
};

/** Account color palette */
export const ACCOUNT_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6', // Teal
];

export const DEFAULT_CATEGORY_COLOR = '#94a3b8'; // Slate 400
export const DEFAULT_BROKER_COLOR = '#6366f1';   // Indigo

/** Chart axis/grid colors */
export const CHART_GRID_COLOR = '#334155';      // Slate 700
export const CHART_TICK_COLOR = '#94a3b8';      // Slate 400
export const CHART_LINE_COLOR = '#3b82f6';      // Blue 500

// ============================================================================
// UI CONFIG
// ============================================================================

export const ANIMATION_DURATION = 300;
export const DEBOUNCE_DELAY = 300;
export const TOAST_DURATION = 3000;
