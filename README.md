# School office MVP

A learning project: a small private-school management app for an Ethiopian school
(students, attendance, fees) with an AI assistant that uses tools to answer questions.

## Run it

**With Docker (Postgres + API + web):**

```bash
cp .env.example .env          # optionally add ANTHROPIC_API_KEY
docker compose up --build
```

Open http://localhost:8080. The API runs migrations and seeds a demo school on first start.

**Without Docker (in-memory database, fastest way to start):**

```bash
npm install
npm run dev:memory    # API on :4000, no Postgres needed
npm run dev:web       # web on :5173
```

Without `ANTHROPIC_API_KEY` the assistant uses an offline scripted model, so it works for free.
With a key it uses Claude (model set by `ANTHROPIC_MODEL`).

**Demo mode (static, no backend):** `npm run build:demo -w @school/frontend` builds the web app with `VITE_DEMO=true`. The build answers every API call from in-memory sample data (classes, students, attendance, fees, a scripted assistant), so it runs on any static host such as GitHub Pages with no server. Writes last until the page is reloaded. Normal `dev` and `build` still call the real API.

## Tests

```bash
npm test                         # Vitest: API (incl. real SQL via PGlite) + web
npx playwright install chromium  # once
npm run e2e                      # Playwright, desktop + phone, API mocked in the browser
```

## Layout

```
backend/              the API: Express, Drizzle, the command bus and the agent
frontend/             the React app the school office uses
drizzle/              generated SQL migrations
Dockerfile            builds the API; the frontend has its own
package.json          the API package, with frontend/ as a workspace
```

`backend/` is the server, `frontend/` is the browser, and the root holds only
what both share: the workspace manifest, the lockfile and the compose file. If a
second frontend
turns up later (a parent view, an admin), it becomes another workspace beside
this one, and the dependencies they share are declared once in the root
`package.json` so every frontend gets the same version.

Filenames are kebab-case throughout, components included, so there is one rule
and no case-only renames to trip over on a case-insensitive filesystem.

## Where to find each concept

| Concept | Files |
| --- | --- |
| ORM, schema, migrations | `backend/db/schema.ts`, `drizzle/` (`npm run db:generate` after schema changes) |
| Singleton | `backend/db/client.ts` |
| Repository + factory | `backend/repositories/` (Postgres or in-memory) |
| Command pattern (backend) | `backend/commands/` (bus with validation and logging middleware) |
| Pure domain logic | `backend/domain/` |
| Agent loop and tools | `backend/agent/` (`agent.ts`, `tools.ts`, `scripted.ts`) |
| Decorators (functions) | `frontend/src/lib/decorators.ts`, used in `api/http.ts` |
| Decorator (component HOC) | `frontend/src/components/with-suspense.tsx` |
| Factories (frontend) | `api/http.ts`, `components/field-factory.tsx`, `store/index.ts` (`makeStore`) |
| Command pattern + undo/redo | `frontend/src/store/attendance-commands.ts` (the *record* of a change; a feature's `*.command.ts` carries the *intent*) |
| Service locator + start-up wiring | `frontend/src/core/platform.ts`, `core/setup.ts` (the only file that knows which handler serves which command) |
| Command bus (frontend) | `frontend/src/core/command-bus.ts`; each feature owns its `*.command.ts` and `*.handler.ts`. Pages fire commands, handlers decide what they mean |
| View factory registry | `frontend/src/core/view-factory-registry.ts`, `core/views/`; one `factory.ts` per feature turns a record into a row `<ListRow>` can render |
| Actions, reducers, selectors | `frontend/src/store/*-slice.ts` |
| Effects | `frontend/src/store/effects/` — listener middleware, one `*.effects.ts` per feature that has any |
| Performance | `components/virtual-list.tsx`, memoized selectors, `React.memo` rows, lazy routes in `app.tsx` |

## Next iterations

1. Login and roles (admin, teacher, parent).
2. Grades and report cards.
3. Parent view or Telegram bot for announcements and balances.
4. Agent memory and more tools (e.g. "compare this term with last term").
