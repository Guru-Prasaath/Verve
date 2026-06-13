# Verve — AI-Native Campaign Co-Pilot for Daybreak Coffee

> **AI proposes campaigns. Humans approve them. Nothing sends autonomously.**

Verve is a full-stack marketing campaign co-pilot that lets marketers plan campaigns in minutes instead of hours. You describe a goal in plain English, the AI generates a complete campaign plan (audience + messaging + channel recommendation + risk checks), you review and approve it, the campaign runs live, and results flow into a real-time dashboard. When it completes, AI analyzes what happened and recommends the next campaign.

This is a **production-ready** project that demonstrates:
- **AI-native workflow** — AI for thinking, humans for deciding
- **Pragmatic system design** — callback-driven architecture, monotonic state machine, exponential backoff
- **Full-stack execution** — React 19 frontend, Express backend, Supabase database, Groq AI integration

---

## Quick Start (5 minutes)

### Backend (CRM + Channel Service)

```bash
cd backend

# 1. Set up environment
cp .env.example .env
# Add: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY (optional)

# 2. Create database schema (Supabase SQL editor)
# Run: schema.sql (fresh DB) or migrations/001_add_failure_reason.sql (existing DB)

# 3. Install & seed
npm install
npm run seed                    # Loads ~2,000 customers + saved audiences
npm run dev:all                 # Runs CRM (:4000) + Channel Service (:4100)
```

### Frontend

```bash
# From repo root
npm install
echo "VITE_API_URL=http://localhost:4000" > .env
npm run dev                     # Opens http://localhost:5173
```

**Mock mode (no backend):** Leave `VITE_API_URL` unset. The UI runs entirely in-browser with seeded data.

---

## Architecture: Why It Matters

```
┌──────────────────────────────────────────────────────────────┐
│  Co-pilot (React)                                            │
│  Goal: "Win back lapsed customers"                           │
└────────────────────┬─────────────────────────────────────────┘
                     │ POST /campaigns (launch)
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  CRM Backend (Express)                                       │
│  • Generates AI plan (audience + messages + channel)         │
│  • Persists campaign & recipient list (state = Sent)         │
│  • Ingests delivery receipts                                 │
│  • Recomputes funnel in real-time                           │
└────────────────────┬─────────────────────────────────────────┘
                     │ POST /send (async, returns 202)
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  Channel Service (Separate Process)                          │
│  • Simulates delivery: Sent → Delivered → Read → Opened      │
│              → Clicked → Ordered (or Failed)                │
│  • Callbacks: POST /api/campaigns/:id/receipt                │
│              (out-of-order safe, idempotent)                │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**1. Two Services Over HTTP (Not RPC)**
- CRM and Channel Service are independent microservices
- Communicate only via HTTP callbacks
- CRM never blocks: sends launch request, gets 202 Accepted, continues
- Channel Service streams receipt updates back asynchronously
- **Benefit:** Scales to thousands of concurrent campaigns; one service can restart without breaking the other

**2. Monotonic State Machine (Correctness)**
Recipients flow through states in strict order: `Sent(0) → Delivered(1) → Read(2) → Opened(3) → Clicked(4) → Ordered(5)`
- Receipts can arrive **out of order** (network delays)
- Receipts can be **duplicated** (retries)
- Solution: Only apply events that advance the rank
  - Late `Delivered` after `Opened`? Ignored (it's older)
  - Duplicate event? Ignored (already applied)
- **Benefit:** Correct metrics even under worst-case delivery conditions

**3. Sampling + Extrapolation (Speed Without Scale)**
- Track ~100 real recipients per campaign (database-efficient)
- Extrapolate counts to full audience via math
- If 50 of 100 ordered → estimate 5,000 of 10,000 ordered
- **Trade-off:** Demo simplification. Production would log every event
- **Benefit:** Real-time performance without 10K row inserts per campaign

**4. Exponential Backoff Retries (Resilience)**
- Every HTTP call retries 3 times: 500ms, 1s, 2s
- If all fail, logged but campaign continues
- **Benefit:** Network hiccups don't cascade; graceful degradation

---

## Core Features

### 1. AI-Native Campaign Planning
**`POST /agent/plan`** uses Groq LLM (`llama-3.3-70b-versatile` via OpenAI API) to turn natural language into structured plans:

```
Input:  "Win back customers who haven't ordered in 30 days"
Output: {
  audience: { filter: [{field: "days_since_last_order", op: ">", value: 30}], count: 1,247 },
  messages: {
    whatsapp: "Hi {{name}}, we miss you! Get 10% off your next order...",
    email: "{{name}}, come back and try our new Cold Brew...",
    sms: "We have a special offer just for you..."
  },
  recommendedChannel: "WhatsApp",
  channelReasoning: "Highest engagement for this segment",
  guardrails: [
    {label: "Audience size", status: "pass", note: "1,247 recipients — good for testing"},
    {label: "Tone match", status: "pass", note: "Casual & friendly for lapsed customers"}
  ]
}
```

- Output **validated with Zod** before trusting it
- Real-time audience count from actual customer data
- **Fallback:** If GROQ_API_KEY missing, uses deterministic keyword compiler (app always works)
- **Transparency:** Response includes `source: "ai" | "keyword"`

### 2. Live Campaign Dashboard
- **Funnel chart** updates in real-time (Recharts visualization)
- **Funnel stages:** Sent → Delivered → Read → Opened → Clicked → Order
- **Per-recipient lifecycle:** See each customer's journey by name
- **Failure breakdown:** Track why messages fail (invalid number, spam blocked, etc.)
- **Attributed revenue:** Orders tied directly to campaigns

### 3. AI Postmortem & Learning Loop
After campaign completes:
- **Metrics analysis:** Open rate, click rate, conversion rate
- **Cohort analysis:** "83% of converters are high-value customers. 50% visit on weekends."
- **Recommended next campaign:** Pre-filled with the next strategic goal
- **One-click hand-off:** "Create this campaign" → pre-fills Co-pilot with recommendation

### 4. Customer & Audience Management
- **Customer search:** ~2,000 real customers across 6 Indian metros
- **Saved audiences:** Pre-built segments with live counts
- **Filter builder:** AI-interpreted conditions like "lapsed for 30+ days, high-value, morning habit"

---

## Tech Stack

### Frontend
- **React 19** + Vite (fast refresh, modern bundler)
- **TypeScript** for type safety across API boundary
- **Tailwind v4** + shadcn/ui (production-ready components)
- **TanStack Query** (data fetching, caching, polling while campaigns are live)
- **React Router v7** (page navigation)
- **Recharts** (funnel & metrics visualization)
- **Zod** (API response validation)

### Backend
- **Express.js** (lightweight routing)
- **Supabase / Postgres** (customer data, campaigns, recipients, orders)
- **Groq API** (OpenAI-compatible LLM for plan generation)
- **Node.js** (runtime for both CRM and Channel Service)

### Architecture Pattern
**Single API seam, dual mode:**
```
Component → TanStack Query → API Client → [MOCK mode OR real HTTP]
```
- Set `VITE_API_URL=http://localhost:4000` → Real backend
- Leave unset → Deterministic mock data (no backend needed)
- Same codebase, one flag

---

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/agent/plan` | POST | Generate campaign plan from goal |
| `/audiences` | GET | List saved audience segments |
| `/audiences/preview` | POST | Live count for a filter |
| `/campaigns` | POST | Launch campaign |
| `/campaigns` | GET | List all campaigns |
| `/campaigns/:id` | GET | Campaign detail (funnel + recipients) |
| `/campaigns/:id/postmortem` | GET | AI analysis + next-campaign recommendation |
| `/campaigns/:id` | DELETE | Cleanup (for testing) |
| `/campaigns/:id/receipt` | POST | Delivery receipt webhook |
| `/customers` | GET | Search customers |
| `/customers/ingest` | POST | Bulk load customers (seed only) |
| `/orders/ingest` | POST | Bulk load orders (seed only) |

---

## Project Structure

```
/                                 # Frontend (React)
├── src/
│   ├── pages/                    # Routes (Copilot, Campaigns, CampaignDetail, Customers, Audiences)
│   ├── components/
│   │   ├── campaign/             # Funnel chart, postmortem, detail panel
│   │   ├── plan/                 # Campaign plan card, message previews
│   │   └── common/               # Reusable (EmptyState, StatusPill, MetricCard)
│   ├── hooks/                    # TanStack Query wrappers (useCampaigns, useLaunchCampaign, etc.)
│   ├── lib/
│   │   ├── api/                  # API client + mock layer
│   │   └── types.ts              # Zod schemas + TypeScript types
│   └── index.css                 # Tailwind + custom animations
├── package.json
└── tsconfig.json

/backend                          # Backend (Express)
├── src/
│   ├── server.ts                 # CRM backend (~1,100 lines)
│   │   ├── POST /agent/plan      # AI plan generation
│   │   ├── POST /campaigns       # Launch (calls channel service)
│   │   ├── GET /campaigns/:id    # Detail + funnel computation
│   │   └── POST /campaigns/:id/receipt  # Receipt webhook (state machine)
│   ├── channelService.ts         # Separate process simulating delivery
│   ├── agentPlanner.ts           # Groq integration + keyword fallback
│   ├── seed.ts                   # Load 2K customers + sample audiences
│   ├── db/
│   │   └── queries.ts            # Database helpers
│   ├── helpers/
│   │   ├── audience.ts           # Cohort analysis, overlap detection
│   │   └── channel.ts            # Retry logic
│   ├── schema.sql                # Postgres schema
│   └── migrations/               # Schema updates
├── package.json
└── tsconfig.json
```

---

## Key Implementation Details

### Funnel Computation (Real-Time)
When a receipt arrives (e.g., "Opened"), the CRM:
1. Advances recipient state (if rank improves)
2. Recomputes aggregates: `{sent, delivered, read, opened, clicked, ordered}`
3. Scales to full audience: `count × (audienceSize / sampleSize)`
4. Updates campaign metrics in DB
5. Frontend polls & refreshes chart

### Idempotency Example
Campaign has 100 recipients. Channel service sends 50 "Opened" receipts twice (network retry).
- **Without monotonic state:** Count would jump to 100 opens (wrong)
- **With monotonic state:** Only first 50 applied; duplicate ignored (correct)

### Deterministic Seeding
- All mock data is seeded with same PRNG (reproducible across runs)
- Allows meaningful demo videos without API keys
- Switch to real backend by changing one env var

---

## Design Philosophy

**Why this architecture?**

1. **Human judgment stays human.** The marketer approves every campaign. AI can't change the plan unilaterally.
2. **Simplicity over features.** No A/B testing, no scheduling, no auth. Just: think, approve, run, learn.
3. **Correctness by default.** State machine prevents metric bugs even under worst-case delivery.
4. **Pragmatic scaling.** Sampling + callbacks let us handle thousands of campaigns without infra complexity.

---

## Deployment Ready

### Current Status
✅ All services compile and run locally  
✅ Real-time funnel updates  
✅ AI plan generation with fallback  
✅ Proper error handling & retries  
✅ Full TypeScript type coverage  
✅ Clean code structure  

### Next: Production Deployment
```bash
# Frontend → Vercel
vercel deploy

# Backend CRM + Channel → Render/Railway
# Set env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY
```

---

## Development

### Commands

```bash
# Backend
cd backend
npm run dev:all          # Both services (concurrent)
npm run dev:crm          # CRM only (:4000)
npm run dev:channel      # Channel service only (:4100)
npm run seed             # Reset data

# Frontend
npm run dev              # Dev server (:5173)
npm run build            # Production build
npm run type-check       # TypeScript check
```

### Testing the Flow
1. **Mock mode:** `npm run dev` (frontend only, no backend)
2. **Real backend:**
   - `cd backend && npm run dev:all`
   - `npm run dev` (in root)
   - Open http://localhost:5173
   - Create a campaign → watch funnel update live

---

## Notes

- **No auth:** Anyone can access the CRM (demo assumption)
- **No real messaging:** Channel Service simulates SMS/WhatsApp delivery
- **Sampling by design:** We track 100 customers per campaign and extrapolate (not production-scale)
- **Groq is optional:** If GROQ_API_KEY unset, plan generation falls back to keyword rules

---

## Questions?

See the architecture diagram in this README for data flow. Check [`backend/src/server.ts`](backend/src/server.ts) for the state machine logic and funnel computation. The frontend hooks in [`src/hooks`](src/hooks) show how data flows from API to React components.

Built with pragmatism, clarity, and human judgment at the center.
