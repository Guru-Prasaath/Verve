# Verve — AI-native Mini CRM for Daybreak Coffee

Verve is an **agentic campaign co-pilot** for the Daybreak Coffee marketing team.
A marketer states a goal in plain English; the AI proposes a complete campaign plan
(audience + per-channel message + recommended channel + guardrails); the human approves;
the campaign runs; results stream into a dashboard; the AI writes a postmortem and
recommends the next campaign — closing the loop. **The AI proposes, a human approves —
nothing sends autonomously.**

This repo is the **frontend only**, built against a typed API client backed by mock data
that hits real REST paths, so it flips to a real Express backend by changing one env var.

## Stack

React 19 · Vite · TypeScript · Tailwind v4 · TanStack Query · React Router v7 · Recharts ·
lucide-react · Zod. UI primitives are hand-rolled in shadcn style (no runtime UI dep).

## Run

```bash
npm install
npm run dev      # http://localhost:5173  (MOCK mode — seeded data)
npm run build    # type-check + production build
```

## The backend swap (key architecture)

```
Component → TanStack Query hook (src/hooks) → api client (src/lib/api) → fetch OR mock
```

- Components never call `fetch` or the api client directly — only through hooks.
- Every api function hits a real REST path (`GET /campaigns`, `POST /agent/plan`, …) and
  validates the response with a Zod schema from [src/lib/types.ts](src/lib/types.ts).
- A single `MOCK` flag (`!import.meta.env.VITE_API_URL`) gates mock vs. real. Set
  `VITE_API_URL` (see [.env.example](.env.example)) to point at Express — **zero component
  changes**. Real call sites are marked `// TODO: replace with POST /agent/plan` etc.

### Endpoints

| Hook | Client fn | REST path |
|---|---|---|
| `useGeneratePlan` | `generateCampaignPlan` | `POST /agent/plan` |
| `useAudiences` | `listAudiences` | `GET /audiences` |
| — | `getAudiencePreview` | `POST /audiences/preview` |
| `useLaunchCampaign` | `launchCampaign` | `POST /campaigns` |
| `useCampaigns` | `listCampaigns` | `GET /campaigns` |
| `useCampaign` | `getCampaign` | `GET /campaigns/:id` |
| `usePostmortem` | `getPostmortem` | `GET /campaigns/:id/postmortem` |
| `useCustomers` | `listCustomers` | `GET /customers` |

## Mock data

[src/lib/api/mockData.ts](src/lib/api/mockData.ts) seeds ~2,000 Daybreak customers (Indian
names, 6 metros, 8 outlets, drinks/frequency/LTV/recency) with a deterministic PRNG.
`generateCampaignPlan` keys off goal keywords (lapsed / top spenders / morning / weekend),
**compiles the goal into a real filter**, applies it to the customer set for a derived count,
and returns personalized messages, a recommended channel + reasoning, and guardrail checks.
Refinements (`"make it shorter"`, `"only Bengaluru"`, `"use email"`) mutate the plan. No LLM
is involved — replace the marked call site to add one.

## Screens

- **Co-pilot** (`/`) — goal input + example chips, thinking shimmer, the Campaign Plan card
  (count-up audience, expandable derived filter, per-channel chat-bubble previews, recommended
  channel, guardrails, Launch / Refine), and follow-up refinement.
- **Campaigns** (`/campaigns`) — table with status pills + headline metrics.
- **Campaign detail** (`/campaigns/:id`) — Recharts funnel, failure breakdown, attributed
  revenue, per-recipient lifecycle table, and the AI postmortem with a "Create this campaign"
  hand-off that pre-fills the Co-pilot.
- **Customers** (`/customers`) — searchable table.
- **Audiences** (`/audiences`) — saved segments with persona + live count.

## System Design & Backend Architecture (Simulated Loop)

While this repository contains the high-fidelity frontend, the data layer in `src/lib/api/mockData.ts` is explicitly architected to simulate Xeno's mandatory two-service, callback-driven communication loop end-to-end.

### The Callback Lifecycle Workflow
1. **Trigger:** When `useLaunchCampaign` is triggered via the Co-pilot, the frontend calls our API client (`POST /campaigns`).
2. **Dispatch:** In a production environment, the Express CRM backend routes this to an isolated, stubbed **Channel Service** via a `POST /send` API payload containing recipient metadata, channel choice, and the personalized message.
3. **Asynchronous Simulation:** The mock store (`mockData.ts`) mimics this asynchronous behavior. Instead of instantly completing, it registers a delayed state engine that simulates real-world delivery latency.
4. **The Webhook Callback:** After a simulated delay, it executes a callback simulating an HTTP POST request back to the CRM's receipt API (`POST /campaigns/:id/receipt`), streaming progressive status updates: `Sent` ➔ `Delivered` ➔ `Opened`/`Read` ➔ `Clicked` (or `Failed`).
5. **UI Update:** The React application UI updates automatically via TanStack Query refetching, updating the status pills, funnel charts, and failure tracking in real time.

### Scalability Tradeoffs for Production
- **Message Queues:** At production scale (e.g., dispatching to 100,000+ shoppers), making direct, synchronous HTTP requests to a channel service would bottleneck the server. We would replace the direct API call with an asynchronous message broker like **RabbitMQ** or **AWS SQS** to handle high-throughput queueing.
- **Idempotency & Race Conditions:** Out-of-order delivery notifications (e.g., a network delay causing an `Opened` callback to arrive before a `Delivered` callback) are handled by validating incoming event timestamps against a strict database state machine, ensuring older states never overwrite newer engagement metrics.

## Out of scope

Auth, real messaging/LLM, scheduling, A/B testing,
billing, settings.
