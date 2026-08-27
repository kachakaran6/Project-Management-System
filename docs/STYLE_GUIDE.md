# Code Style & Engineering Standards

## Frontend (React + TypeScript)
- Use functional components with typed props interfaces.
- Prefer custom hooks for complex business logic over inline `useEffect`.
- Keep render functions concise; break subcomponents when JSX exceeds ~150 lines.
- Rely on Tailwind CSS utility composition and avoid ad-hoc inline styles.

## Backend (Node.js + Express)
- Async handlers must be wrapped in error-handling middleware or async wrappers.
- Never expose raw database IDs directly without access control validation.
- All mutating endpoints must log structured audit trails through Winston.
- Sensitive environment configurations must be validated at process boot via Zod.
