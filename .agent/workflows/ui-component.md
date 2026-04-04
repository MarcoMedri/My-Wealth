---
description: Workflow for creating or modifying UI components in MyWealth
---

# UI Component Workflow

## 1. Design System Check
Before creating any component, review:
- `src/renderer/src/index.css` — existing component classes (`.btn`, `.card`, `.form-input`, etc.)
- `src/renderer/src/lib/design-tokens.ts` — design tokens
- `src/renderer/src/components/ui/` — existing reusable components
- `tailwind.config.js` — custom theme values

## 2. Component Location Rules
- **Atomic/reusable components** → `src/renderer/src/components/ui/`
- **Feature-specific components** → `src/renderer/src/components/[feature]/`
- **Form components** → `src/renderer/src/components/forms/`
- **Page-level views** → `src/renderer/src/pages/`
- **Modals** → `src/renderer/src/components/modals/`

## 3. Component Standards
- Use TypeScript with explicit props interface
- Use `cn()` utility from `src/renderer/src/lib/utils.ts` for conditional classes
- Use design tokens via CSS variables (e.g., `bg-background-card`, `text-foreground-muted`)
- Support both light and dark mode — always test both
- Use `useTranslation()` for ALL user-facing text — never hardcode strings
- Support responsive layouts with Tailwind breakpoints

## 4. State Management
- Use local state (`useState`) for UI-only state
- Use Zustand store (`useVaultStore`) for persistent / shared data
- Never call `window.api.*` directly from components — always go through store actions
- Use `useMemo` for expensive computations, `useCallback` for handlers passed as props

## 5. Handle All States
Every data-driven component MUST handle:
- **Loading** → Use skeleton components from `src/renderer/src/components/skeletons/`
- **Empty** → Use `EmptyState` component from `src/renderer/src/components/ui/EmptyState.tsx`
- **Error** → Show inline error message with retry option
- **Success** → Normal render

## 6. Accessibility & Interactions
- All interactive elements must have `title` or `aria-label`
- Use `lucide-react` for icons (never inline SVGs)
- Buttons must have hover/focus/disabled states
- Modals must close on Escape key

## 7. Update Exports
- If adding a new public component, export it from `src/renderer/src/components/index.ts`

## 8. Translations
- Add all strings to `src/renderer/src/locales/en.json` AND `src/renderer/src/locales/it.json`
- Use nested keys matching the feature (e.g., `deposits.addNew`, `investments.refresh`)

## 9. Verify
// turbo
- Run `npm run typecheck` from project root
- Test in `npm run dev` with real data
- Test light mode and dark mode
- Test responsive (resize window)
