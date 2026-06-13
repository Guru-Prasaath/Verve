# Verve — AI-native Mini CRM for Daybreak Coffee

Verve is an **agentic campaign co-pilot** for the Daybreak Coffee marketing team.
A marketer states a goal in plain English; the AI proposes a complete campaign plan
(audience + per-channel message + recommended channel + guardrails); the human approves;
the campaign runs; results stream into a dashboard; the AI writes a postmortem and
recommends the next campaign — closing the loop. **The AI proposes, a human approves —
nothing sends autonomously.**

This is a **full-stack** project:

- **Frontend** (`/`) — React 19 + Vite + TypeScript + Tailwind v4, TanStack Query, React Router, Recharts, Zod.
- **CRM backend** (`/backend`, `server.ts`) — Express + Supabase/Postgres. Ingests data, segments shoppers, exposes the send API, ingests delivery receipts, surfaces performance.
- **Channel service** (`/backend`, `channelService.ts`) — a **separate** Express process that stubs a messaging provider: it simulates the delivery lifecycle and calls back into the CRM. No real provider is integrated.

## Architecture — the two-service, callback-driven loop

```
 Co-pilot (React)
     │  POST /campaigns                     ┌──────────────────────────┐
     ▼                                      │   CRM backend (Express)  │
 ┌────────────────┐   POST /send           │   + Supabase / Postgres  │
 │  CRM backend   │ ─────────────────────▶ │                          │
 │  (server.ts)   │                        │  persists campaign +     │
 └────────────────┘                        │  recipients (state=Sent) │
     ▲                                      └────────────┬─────────────┘
     │  POST /api/campaigns/:id/receipt                  │ ACK 202
     │  (Sent→Delivered→Opened→Clicked→Ordered | Failed) ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │  Channel service (channelService.ts) — SEPARATE process/deploy    │
 │  simulates per-recipient delivery with realistic delays + failures│
 └──────────────────────────────────────────────────────────────────┘
```

The two services talk **only over HTTP**. The CRM never blocks on delivery: the channel
service ACKs immediately (`202`) and then streams per-recipient receipts back to the CRM's
webhook. The CRM ingests each receipt, advances the recipient's lifecycle, and recomputes
the campaign funnel — which the React UI polls (TanStack Query `refetchInterval` while a
campaign is `Live`/`Sending`), so the funnel, status pills, revenue, and failures update in
near real time.

### Correctness: ordering, idempotency, failures

Delivery receipts can arrive **out of order** or be **duplicated**. The receipt handler
([`backend/src/server.ts`](backend/src/server.ts)) treats each recipient as a monotonic
state machine (`Sent`=0 → `Delivered`=1 → `Opened`=2 → `Clicked`=3 → `Ordered`=4; `Failed`
is terminal pre-delivery). An event is applied **only if it advances the rank** — a late
`Delivered` after `Opened`, or a duplicate event, is a no-op (`{applied:false}`), so older
events can never overwrite newer engagement. The campaign is finalized to `Done` after an
attribution window so trickling opens/clicks are captured before polling stops.

### Scalability tradeoffs (what we'd change at scale)

- **Message queue, not synchronous HTTP.** Dispatching to 100k+ shoppers via direct HTTP
  to the channel service would bottleneck the request. At scale the send API enqueues to a
  broker (**SQS / RabbitMQ**) and workers fan out; receipts come back via the same webhook.
- **Incremental aggregates.** The receipt handler currently recomputes funnel counts from
  the recipient rows per callback (fine at demo scale). At volume this becomes per-event
  atomic counter increments (or a DB trigger / materialized view) to avoid table scans.
- **Sampling.** We persist a 100-recipient sample per campaign and extrapolate counts to
  the full audience — a deliberate demo simplification; production would log every send.

## AI-native planning

`POST /agent/plan` uses an **LLM (Groq — `llama-3.3-70b-versatile` by default, via its
OpenAI-compatible API)** to turn the marketer's natural-language goal into a *structured*
plan — a compiled audience filter, the recommended channel + reasoning, per-channel copy,
and guardrails ([`backend/src/agentPlanner.ts`](backend/src/agentPlanner.ts)). The model is
forced into JSON mode and its output is **validated with Zod** before the app trusts it. The
CRM then applies that filter to the **real customer table**, so the audience count is
genuinely derived, not invented. If `GROQ_API_KEY` is unset (or the model output fails
validation), it **transparently falls back** to a deterministic keyword compiler — the demo
always works. The response carries `source: "ai" | "keyword"` for transparency. The model is
overridable via `GROQ_MODEL` with no code changes.

## Running locally

### 1. Backend (CRM + channel service)

```bash
cd backend
cp .env.example .env          # fill SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (and optionally ANTHROPIC_API_KEY)
# In the Supabase SQL editor, run schema.sql once (fresh DB),
# or migrations/001_add_failure_reason.sql if upgrading an existing DB.
npm install
npm run seed                  # loads ~2,000 deterministic customers + saved audiences
npm run dev:all               # runs CRM (:4000) AND channel service (:4100) together
```

### 2. Frontend

```bash
# from repo root
npm install
echo "VITE_API_URL=http://localhost:4000" > .env   # point the UI at the CRM
npm run dev                   # http://localhost:5173
```

Leave `VITE_API_URL` unset to run the frontend in **mock mode** (no backend needed) — the
api client falls back to seeded in-browser data. This is the same one-flag seam that lets
the deployed UI point at the deployed CRM.

## Data layer & the api seam

```
Component → TanStack Query hook (src/hooks) → api client (src/lib/api) → fetch(real) OR mock
```

Components never call `fetch` directly — only through hooks. Every api function hits a real
REST path and validates the response with a Zod schema in
[src/lib/types.ts](src/lib/types.ts), so the frontend and Express backend are guaranteed to
agree on shape. A single `MOCK` flag (`!import.meta.env.VITE_API_URL`) gates mock vs. real.

| Hook | REST path | Backend handler |
|---|---|---|
| `useGeneratePlan` | `POST /agent/plan` | Claude planner + keyword fallback |
| `useAudiences` | `GET /audiences` | saved segments (counts derived) |
| — | `POST /audiences/preview` | live filter count |
| `useLaunchCampaign` | `POST /campaigns` | persist + call channel `/send` |
| `useCampaigns` | `GET /campaigns` | list with metrics |
| `useCampaign` | `GET /campaigns/:id` | funnel + failures + recipients |
| `usePostmortem` | `GET /campaigns/:id/postmortem` | plain-English retro + next goal |
| `useCustomers` | `GET /customers?q=` | searchable shoppers |
| (channel → CRM) | `POST /api/campaigns/:id/receipt` | delivery-receipt webhook |

## Screens

- **Co-pilot** (`/`) — goal input + example chips, thinking shimmer, the Campaign Plan card
  (count-up audience, expandable derived filter, per-channel chat-bubble previews, recommended
  channel, guardrails, Launch / Refine), and follow-up refinement.
- **Campaigns** (`/campaigns`) — table with status pills + headline metrics.
- **Campaign detail** (`/campaigns/:id`) — Recharts funnel, failure breakdown, attributed
  revenue, per-recipient lifecycle table, and the AI postmortem with a "Create this campaign"
  hand-off that pre-fills the Co-pilot. Polls live while the campaign is sending.
- **Customers** (`/customers`) — searchable table.
- **Audiences** (`/audiences`) — saved segments with persona + live count.

## Out of scope

Auth, a real messaging provider, scheduling, A/B testing, billing, settings.
