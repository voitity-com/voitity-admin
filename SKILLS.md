# SKILLS.md

Task playbooks for AI agents working in this repository.

## 1. Add Or Update A Dashboard Page

Use this when the user asks for a new admin section, list, detail page or submenu.

Checklist:

1. Add or update path helpers in `src/src/paths.ts`.
2. Add or update routes in `src/src/routes/dashboard.tsx`.
3. Add sidebar nav in `src/src/components/dashboard/layout/config.ts` only for top-level sections.
4. Add page under `src/src/pages/dashboard/...`.
5. Add feature components under `src/src/components/dashboard/<feature>/...` when the page grows beyond simple glue code.
6. Add translations in both locale files.
7. Validate with typecheck and lint.

Preferred layout:

- Use `Box` with `maxWidth`, `m`, `p`, and `width` content vars for top-level pages.
- Use `Stack spacing={3|4}` for page sections.
- Use `Card`, `CardHeader`, `CardContent`, `CardActions` for contained admin surfaces.

## 2. Implement Main API Endpoints

Use this whenever the user asks to add, consume, wire, integrate or fix an endpoint.

Default assumption:

- Every product endpoint belongs to the same main API unless the user explicitly says it belongs to another API.
- The main API base URL is environment-specific and must come from `config.api?.baseUrl`.
- `config.api?.baseUrl` is configured by `VITE_API_BASE_URL`.
- The local example is `VITE_API_BASE_URL=http://localhost:8000`, but source code must never hardcode that host.
- Endpoint functions should receive only relative paths such as `/api/profile`, `/api/avatar/generate`, `/api/profile/chats` or `/api/profile/chats/messages`.

Current references:

- API base URL config: `src/src/config.ts`.
- Env example: `src/.env.example`.
- Auth client: `src/src/lib/auth/custom/api-client.ts`.
- Profile client: `src/src/lib/profiles/api-client.ts`.
- Avatar client: `src/src/lib/avatar/api-client.ts`.
- Stored token helper: `src/src/lib/auth/custom/api-token.ts`.

Checklist:

1. Read existing API clients before adding code.
2. Confirm whether the endpoint belongs to the main API. If the user did not specify another API, use the main API.
3. Add the function to the closest module API client:
   - profiles: `src/src/lib/profiles/api-client.ts`
   - avatar: `src/src/lib/avatar/api-client.ts`
   - auth/custom: `src/src/lib/auth/custom/api-client.ts`
   - new feature: `src/src/lib/<feature>/api-client.ts`
4. Add typed request/response interfaces near the endpoint function.
5. Name functions by intent, for example `listProfileChats`, `getProfile`, `updateProfileData`, `generateAvatar`.
6. Build query strings with `URLSearchParams`.
7. Use `encodeURIComponent(String(id))` for IDs embedded in path segments.
8. Use the existing `requestJson` pattern:
   - base URL from `config.api?.baseUrl`
   - path appended as `${baseUrl}${path}`
   - `Accept: application/json`
   - `Content-Type: application/json` only when sending JSON body
   - no manual `Content-Type` for `FormData`
   - `Authorization: Bearer <token>` for authenticated calls
9. For authenticated dashboard endpoints, get the token with `getStoredApiToken()`.
10. For auth endpoints, follow the existing auth client pattern where token can be passed explicitly or omitted for login.
11. Throw a typed API error on non-OK responses and preserve the HTTP status.
12. Parse backend error messages from `message` or the first validation error in `errors`.
13. Handle `204 No Content` when the endpoint can return it.
14. Normalize response envelopes defensively when the backend shape is uncertain.
15. Keep display formatting out of the API client. Format dates, labels and table content in UI components.

Response normalization should support common envelopes:

- raw object or raw array
- `{ data: ... }`
- `{ data: [...] }`
- `{ data: { items: [...] } }`
- `{ data: { records: [...] } }`
- `{ data: { results: [...] } }`
- `{ data: { <feature>: [...] } }`
- pagination in `meta`, `pagination`, or the collection container

Pagination rules:

- Backend page parameter is usually `page`.
- UI query param can be feature-specific, for example `chat_page` or `message_page`, but the API request should send whatever the backend expects.
- Return normalized `{ page, perPage, total, lastPage, items }`-style data when implementing paginated list endpoints.

When another API is explicitly requested:

- Ask or infer the separate base URL env var name from the user's requirement.
- Add a separate config key only for that external API.
- Keep external API clients isolated under `src/src/lib/<provider-or-feature>/`.
- Do not reuse the main API token unless the user explicitly confirms the external API uses the same auth.

## 3. Add Or Update A List Table

Use this when the user asks for a list with columns.

Checklist:

1. Use `DataTable` for tables.
2. Keep columns minimal and readable.
3. Use `hover` and row click for the primary action.
4. Avoid per-row action buttons unless requested.
5. Format dates with selected language.
6. Add an empty state with translated text.
7. Put pagination in a reusable component if another page uses the same pattern.

Column helpers should stay near the page unless reused by multiple files.

## 4. Add A Detail Page With Subsections

Use this when a record has multiple sections such as profile, data, avatar, chats, voice.

Checklist:

1. Add path helper for each section.
2. Add child routes under the detail route.
3. Use a detail layout with sticky side nav.
4. Keep each section as a separate page file.
5. Side nav items need icons, translated titles and active state.

Pattern reference:

- `src/src/components/dashboard/profiles/profile-layout.tsx`
- `src/src/components/dashboard/profiles/profile-side-nav.tsx`
- `src/src/pages/dashboard/profile-details/`

## 5. Add Or Update Forms

Use this for create/edit dialogs and detail edit pages.

Checklist:

1. Use `react-hook-form`.
2. Use `zod` for validation.
3. Put schema creation in a `createSchema(t)` helper when messages are translated.
4. Use `Controller` for MUI inputs.
5. Reset form values when the edited record or dialog open state changes.
6. Convert form values to payload in a dedicated `toPayload` helper.
7. Show inline validation and mutation errors.

Pattern reference:

- `src/src/components/dashboard/profiles/profile-form-dialog.tsx`
- `src/src/pages/dashboard/profile-details/profile.tsx`

## 6. Work With Profile Data JSON

Use this when editing `profile.data`.

Rules:

- Preserve the complete JSON object when saving.
- Show top-level keys as tabs only when they exist.
- Known tabs: `me`, `work`, `projects`, `networks`.
- Unknown tabs should be displayed using the JSON key with first letter uppercase.
- Known labels must be translated.
- Unknown labels can be shown as-is.
- Avoid value-based React keys while typing in arrays. Stable index keys are acceptable if items are edited in place and not reordered.

Pattern reference:

- `src/src/pages/dashboard/profile-details/data.tsx`

## 7. Work With Chats And Messages

Use this for profile chat list/detail work.

Rules:

- Chat list endpoint uses `profile_id` and `page`.
- Message list endpoint uses `profile_id`, `chat_id` and `page`.
- Use `chat_page` and `message_page` query params in the UI.
- Chat rows open the chat detail.
- Message rows should be chronological.
- Include a back link with an arrow from message detail to chat list.
- Translate column labels and empty states.

Pattern reference:

- `src/src/pages/dashboard/profile-details/chats.tsx`
- `src/src/pages/dashboard/profile-details/chat-messages.tsx`
- `src/src/components/dashboard/profiles/profile-chat-pagination.tsx`

## 8. Build Agents, Skills Or Docs Admin Features

Use this when the product needs UI for agents, skills or documentation.

Recommended structure:

```text
src/src/lib/agents/api-client.ts
src/src/lib/skills/api-client.ts
src/src/lib/docs/api-client.ts
src/src/components/dashboard/agents/
src/src/components/dashboard/skills/
src/src/components/dashboard/docs/
src/src/pages/dashboard/agents/
src/src/pages/dashboard/skills/
src/src/pages/dashboard/docs/
```

Agents UX:

- List: avatar/name/alias/status/model/skills/docs/updated.
- Detail sections: overview, instructions, skills, docs, test, versions/activity.
- Create flow should be a wizard: identity, instructions, skills, docs, test.
- Support draft vs published state if backend allows it.

Skills UX:

- Treat skills as reusable resources.
- Fields: name, description, status, trigger/intent, input schema, type, examples.
- Include a test panel before connecting to agents.

Docs UX:

- Treat docs as knowledge resources.
- Sources: upload, URL, raw text/markdown.
- Show indexing status, chunks count, linked agents and errors.
- Include preview and reindex action.

Implementation notes:

- Do not store complex agents/skills/docs only inside profile JSON if they need independent lifecycle, testing or reuse.
- Use `react-hook-form` + `zod` for creation/editing.
- Use the existing TipTap editor only after translating its toolbar labels.
- Use `react-markdown` + `CodeHighlighter` for previewing Markdown docs.

## 9. Localization Workflow

Use this whenever a UI change adds or changes text.

Checklist:

1. Search for hardcoded strings in the changed file.
2. Add keys to English and Spanish locale files.
3. Keep key names grouped by feature.
4. Parse both JSON files.
5. Verify labels, empty states, errors, buttons, tab names and table headers.

Do not leave English-only labels in Spanish UI.

## 10. Review Workflow

Use this when asked to "revisar" or review code.

Checklist:

1. Read the relevant files first.
2. Report findings ordered by severity.
3. Include file and line references.
4. Focus on bugs, regressions, missing validation, missing translations, broken UX and test gaps.
5. Do not edit code unless the user asks to fix issues.

## 11. Final Verification Workflow

Use after implementation.

Commands:

```bash
/opt/homebrew/bin/docker compose exec -T voitity-admin npm run typecheck
/opt/homebrew/bin/docker compose exec -T voitity-admin npm run lint
```

If translations changed:

```bash
/opt/homebrew/bin/docker compose exec -T voitity-admin node -e "JSON.parse(require('fs').readFileSync('public/locales/en/translation.json','utf8')); JSON.parse(require('fs').readFileSync('public/locales/es/translation.json','utf8')); console.log('locale json ok')"
```

Final answer should mention:

- What changed.
- Main files touched.
- Validation run.
- Anything not validated.
