# Contributing to MyWealth

Thank you for your interest in contributing! This guide will help you get started.

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
```bash
git clone https://github.com/MarcoMedri/My-Wealth.git
cd My-Wealth
npm install
npm run dev
```

---

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed structure.

Key directories:
- `src/main/` - Electron main process
- `src/renderer/` - React frontend
- `src/shared/` - Shared types and utilities

---

## Code Style

### TypeScript
- Use strict TypeScript
- Define explicit return types
- Prefer `interface` over `type` for objects

### React
- Use functional components with hooks
- Use `useCallback` and `useMemo` for performance
- Import from barrel files when available

### CSS
- Use Tailwind CSS utility classes
- Use semantic color tokens (`text-foreground`, `bg-primary`)
- Avoid inline styles

---

## Component Guidelines

### Atomic Components
Use the shared UI components in `src/renderer/src/components/ui/`:

```tsx
import { Input, Button, Modal } from '../components';

<Input label="Name" value={name} onChange={setName} error={errors.name} />
<Button variant="primary" isLoading={loading}>Save</Button>
```

### Form Handling
Use `useFormValidation` hook:

```tsx
const form = useFormValidation({
    name: { initialValue: '', required: true },
    amount: { initialValue: 0, rules: [{ validate: v => v > 0, message: 'Must be positive' }] }
});
```

---

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/__tests__/services/InsuranceService.test.ts
```

---

## Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `docs:` Documentation
- `style:` Formatting
- `test:` Tests
- `chore:` Maintenance

Example: `feat: Add batch import for transactions`

---

## Pull Request Process

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Run linting: `npm run lint`
4. Run type check: `npm run typecheck`
5. Commit with conventional message
6. Push and create PR

---

## i18n (Translations)

Add translations to both:
- `src/renderer/src/locales/en.json`
- `src/renderer/src/locales/it.json`

Validate with: `npx ts-node scripts/validate-i18n.ts`

---

## Questions?

Open an issue on GitHub with the `question` label.
