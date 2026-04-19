# Post-Discharge Companion (hackathon)

Mobile-first **Next.js** app that turns discharge text into a **Today** plan and **symptom check-in** with escalation guidance.

## Quick start

```bash
npm install
cp .env.example .env.local
# Add ANTHROPIC_API_KEY to .env.local for live LLM extraction and triage
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Without an API key

- Use **Load sample discharge** on **Upload** to populate the **Today** and **Check-in** flows from `fixtures/sample-care-plan.json`.
- **Extract** from pasted text requires `ANTHROPIC_API_KEY`.
- **Check-in** falls back to **demo triage** logic if the API is unavailable (503).

## Project layout

| Path | Purpose |
|------|---------|
| `app/upload` | Paste discharge text, extract via `/api/extract`, or load sample |
| `app/plan` | Today checklist, meds, red flags, plain-language summary |
| `app/check-in` | Symptoms -> `/api/check-in` or demo fallback |
| `app/api/extract` | LLM -> structured `CarePlan` (Zod-validated) |
| `app/api/check-in` | LLM triage + escalation copy |
| `app/api/sample-care-plan` | Serves fixture JSON |
| `fixtures/` | Sample AVS text + JSON |
| `lib/types/care-plan.ts` | Shared Zod schemas |
| `design/mockups/` | UI reference images |

## Scripts

- `npm run dev` - dev server (Turbopack)
- `npm run build` - production build
- `npm run lint` - ESLint

## Disclaimer

Demo software only - not medical advice. For emergencies, use your local emergency number.