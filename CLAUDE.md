# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
npm install
npm run dev        # → http://localhost:3000
npm run build      # production build
npm run lint
```

Required env var: `ANTHROPIC_API_KEY`. Copy `.env.example` to `.env` and fill in values. Twilio vars are optional (only needed for SMS reminders).

## Tech Stack

- **Next.js 15 App Router** — all pages under `app/`, all API routes under `app/api/`
- **Tailwind CSS v4** — uses `@tailwindcss/postcss` plugin (not the v3 plugin)
- **Anthropic SDK** — Claude Haiku by default (`ANTHROPIC_MODEL` env var to override); Sonnet for extraction
- **Twilio SDK** — SMS medication reminders (optional)
- **Zod** — runtime validation of all LLM output via schemas in `lib/types/care-plan.ts`

The Python files (`main.py`, `requirements.txt`, `Procfile`) are legacy artifacts. The app runs entirely on Next.js.

## Architecture

### Data Flow

1. User pastes discharge text or captures an image on `/upload`
2. Images go to `POST /api/extract-image` (Claude vision → raw text), then text goes to `POST /api/extract` (Claude Sonnet → structured `CarePlan` JSON)
3. `CarePlan` is saved to `localStorage` (key: `pdc-care-plan-v1`) via `lib/care-plan-storage.ts`
4. `/plan` reads from localStorage to render the daily checklist, alerts, and details
5. `/check-in` streams chat responses from `POST /api/chat` with the care plan injected as system context

The `CarePlan` Zod schema in `lib/types/care-plan.ts` is the contract between all API routes and pages — every route validates LLM output against it before responding.

### Key Files

| File | Purpose |
|---|---|
| `lib/types/care-plan.ts` | All Zod schemas — change here first when modifying data shape |
| `lib/llm.ts` | `getAnthropic()`, `getModel()`, `completeJsonText()`, `parseJsonFromModelText()` |
| `lib/prompts/extract.ts` | System prompt + user message builder for discharge extraction |
| `lib/prompts/checkin.ts` | System prompt + user message builder for symptom triage |
| `lib/care-plan-storage.ts` | localStorage read/write; saving clears old reminder state |
| `lib/reminders.ts` | Browser Notification API scheduling; `getActiveReminder()` drives the med banner |
| `lib/demo-checkin.ts` | Rule-based triage fallback (no LLM) used when API is unavailable |
| `fixtures/sample-care-plan.json` | Demo care plan loaded by `GET /api/sample-care-plan` |

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/extract` | POST | Raw discharge text → `CarePlan` (Claude Sonnet) |
| `/api/extract-image` | POST | Image (FormData) → raw text (Claude Haiku vision) |
| `/api/chat` | POST | Streaming chat with care plan context injected |
| `/api/check-in` | POST | Symptoms + red flags → triage tier (`home`/`provider`/`urgent`) |
| `/api/schedule-reminders` | POST | Schedule Twilio SMS for med times today |
| `/api/cancel-reminders` | POST | Cancel scheduled Twilio message SIDs |
| `/api/visit-prep` | POST | `CarePlan` → appointment prep guide (what to bring/mention) |
| `/api/sample-care-plan` | GET | Returns `fixtures/sample-care-plan.json` |
| `/api/health` | GET | `{ ok: true }` |

All routes return `503` when `ANTHROPIC_API_KEY` is missing. `/api/check-in` falls back to `demoCheckIn()` on 503.

### Error Handling Pattern

API routes return:
- `400` — missing/invalid input
- `422` — LLM returned output that failed Zod validation (logs raw model output)
- `502` — Claude API error
- `503` — `ANTHROPIC_API_KEY` not set

### LLM Output Parsing

`parseJsonFromModelText()` in `lib/llm.ts` strips markdown code fences before `JSON.parse`. Every extraction route wraps the parsed object in the relevant Zod schema's `.parse()` — validation errors surface as 422.

## Deployment

Deployed to Railway. `nixpacks.toml` sets the install command to `npm install` (not `npm ci`) to ensure Linux-native binaries for `@tailwindcss/oxide` are resolved correctly. `package-lock.json` and `tsconfig.tsbuildinfo` are excluded from the Docker build context via `.dockerignore`.
