/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background colors
        background: {
          DEFAULT: 'rgb(var(--background) / <alpha-value>)',
          subtle: 'rgb(var(--background-subtle) / <alpha-value>)',
          muted: 'rgb(var(--background-muted) / <alpha-value>)',
          card: 'rgb(var(--background-card) / <alpha-value>)',
          popover: 'rgb(var(--background-popover) / <alpha-value>)',
          sidebar: 'rgb(var(--background-sidebar) / <alpha-value>)',
        },
        // Foreground colors
        foreground: {
          DEFAULT: 'rgb(var(--foreground) / <alpha-value>)',
          muted: 'rgb(var(--foreground-muted) / <alpha-value>)',
          subtle: 'rgb(var(--foreground-subtle) / <alpha-value>)',
        },
        // Border colors
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          muted: 'rgb(var(--border-muted) / <alpha-value>)',
        },
        // Primary accent
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        // Status colors
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          foreground: 'rgb(var(--success-foreground) / <alpha-value>)',
          muted: 'rgb(var(--success-muted) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          foreground: 'rgb(var(--warning-foreground) / <alpha-value>)',
          muted: 'rgb(var(--warning-muted) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'rgb(var(--error) / <alpha-value>)',
          foreground: 'rgb(var(--error-foreground) / <alpha-value>)',
          muted: 'rgb(var(--error-muted) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          foreground: 'rgb(var(--info-foreground) / <alpha-value>)',
        },
        // Input colors
        input: {
          DEFAULT: 'rgb(var(--input) / <alpha-value>)',
          border: 'rgb(var(--input-border) / <alpha-value>)',
        },
        // Ring (focus)
        ring: 'rgb(var(--ring) / <alpha-value>)',
        // Card (alias for background-card for convenience)
        card: 'rgb(var(--background-card) / <alpha-value>)',
      },
      spacing: {
        'card-p': 'var(--card-padding)',
        'card-gap': 'var(--card-gap)',
        'table-y': 'var(--table-cell-y)',
      },
    },
  },
  plugins: [],
}
