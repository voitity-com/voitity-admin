# AGENTS.md

This file is the operating guide for AI coding agents working in this repository.

## Project Snapshot

- Product: `voitity-admin`, an admin dashboard based on React, Vite, TypeScript, MUI and Devias Kit Pro.
- Repository root: project wrapper and Docker files.
- App package root: `src/`.
- App source root: `src/src/`.
- Public assets and locales: `src/public/`.
- Main dashboard routes: `src/src/routes/dashboard.tsx`.
- Central path helpers: `src/src/paths.ts`.
- Dashboard navigation config: `src/src/components/dashboard/layout/config.ts`.
- Profile module is the most actively customized area:
  - Pages: `src/src/pages/dashboard/profile-details/`.
  - Components: `src/src/components/dashboard/profiles/`.
  - API client: `src/src/lib/profiles/api-client.ts`.

## Required Behavior

- Read the existing code before proposing or editing. Follow the nearest local pattern.
- Keep changes narrowly scoped to the user's request.
- Preserve user changes in the working tree. Never revert unrelated modifications.
- Prefer reusable code when a pattern repeats across pages, pagination, API parsing, forms or layouts.
- All visible UI text must be translatable. Add keys to both:
  - `src/public/locales/en/translation.json`
  - `src/public/locales/es/translation.json`
- Respect the selected language for dates and labels. Use `i18n.resolvedLanguage ?? i18n.language` with `Intl.DateTimeFormat`.
- Keep UI operational and dense. This is an admin tool, not a marketing page.
- Use existing UI libraries:
  - MUI components for layout and controls.
  - Phosphor icons from `@phosphor-icons/react/dist/ssr/...`.
  - `DataTable` from `src/src/components/core/data-table.tsx` for simple tables.
  - `RouterLink` from `src/src/components/core/link.tsx` for links.
  - `react-hook-form` + `zod` for validated forms.
- Do not add a dependency unless the existing stack cannot solve the problem cleanly.

## Commands

Run package commands from `src/` when executing directly:

```bash
npm run typecheck
npm run lint
npm run build
```

In the current local environment, Docker may need the full binary path from the repository root:

```bash
/opt/homebrew/bin/docker compose exec -T voitity-admin npm run typecheck
/opt/homebrew/bin/docker compose exec -T voitity-admin npm run lint
/opt/homebrew/bin/docker compose exec -T voitity-admin npm run build
```

Validate locale JSON after editing translations:

```bash
/opt/homebrew/bin/docker compose exec -T voitity-admin node -e "JSON.parse(require('fs').readFileSync('public/locales/en/translation.json','utf8')); JSON.parse(require('fs').readFileSync('public/locales/es/translation.json','utf8')); console.log('locale json ok')"
```

## API Patterns

- Use the main API by default. Its base URL comes from `config.api?.baseUrl`, which maps to `VITE_API_BASE_URL`.
- Do not hardcode `http://localhost:8000` or any environment-specific host in source files.
- Implement endpoint paths as relative API paths such as `/api/profile`, `/api/avatar/generate` or `/api/profile/chats`.
- Do not introduce a second API base URL, a second API client or provider-specific config unless the user explicitly says the endpoint belongs to another API.
- Use existing auth behavior. Authenticated dashboard calls should use `getStoredApiToken()` and send `Authorization: Bearer <token>`.
- Keep endpoint functions typed and colocated with the module until a shared API client is extracted.
- Normalize inconsistent backend envelopes defensively, but keep that logic isolated in helper functions.
- Use `URLSearchParams` for query strings.
- For paginated endpoints, preserve page query params in the URL so browser navigation works.
- Read `SKILLS.md`, section "Implement Main API Endpoints", before adding any endpoint.

## Frontend Patterns

- Lists should show only high-signal columns. Avoid row action buttons unless the user specifically asks for them.
- Row click should open details when that is the main action.
- Detail pages should use a layout/subnav pattern like profiles when there are multiple sections.
- For profile detail work, keep using `ProfileLayout` and `ProfileSideNav`.
- For dates in tables, format with `Intl.DateTimeFormat(language, ...)`.
- For loading states, use `CircularProgress` centered in a padded `Stack`.
- For errors, use MUI `Alert` and log the original error with `logger.error`.
- For successful mutations, use `toast.success`; for failed mutations, use `toast.error`.

## i18n Rules

- Never hardcode user-facing labels in components.
- Add both English and Spanish translations in the same change.
- Keep keys grouped by feature, for example:
  - `dashboard.profiles.list.*`
  - `dashboard.profiles.detail.*`
  - `dashboard.profiles.detail.chats.*`
- If a backend field is unknown and must be displayed, use a readable fallback, but prefer translated labels for known fields.

## Validation Checklist

Before final response after code edits:

1. Run typecheck.
2. Run lint.
3. Parse locale JSON if translation files changed.
4. Check `git status --short`.
5. Summarize only the important files and validations.

## Communication

- The user usually writes in Spanish. Respond in Spanish unless asked otherwise.
- Be direct and concise.
- If the user asks to implement, implement. Do not stop at a plan unless they explicitly ask for advice only.
- If the user asks for a review or advice, do not edit files unless explicitly requested.

## Related Playbooks

Read `SKILLS.md` for task-specific workflows before implementing common changes such as dashboard pages, API endpoints, profile tabs, forms, docs editors or localization.
