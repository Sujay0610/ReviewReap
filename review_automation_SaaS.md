# Review Automation — FastAPI + Next.js MVP

This canvas page contains the full MVP plan for the **Review Automation** product (demo-ready) and includes a *detailed, developer-ready Sidebar spec* placed in **Section 9** so your coding agent knows exactly what to build.

---

## 1. Goal (Demo scope)

- Build an end-to-end demo showing: **CSV upload → Confirmations (WhatsApp + Email) → Post-stay review nudges → Guest replies captured → AI personalization → Dashboard analytics**.
- Optional: add a simple WhatsApp conversational entry point for guests to leave feedback.

---

## 2. High level architecture

```
Frontend (Next.js)  <-->  FastAPI Backend  <-->  Database (Postgres)
         |                     |                     |
     Static site         Background worker       Supabase
   (Booking demo)          (RQ/Celery)           Analytics store, Metrics
         |                     |
    WhatsApp API <------ Message dispatcher (provider SDK)
    Email API <-------- Mail provider (SendGrid/Mailgun)
    AI API <----------- OpenAI - GPT 5 mini
```

**Components**: Next.js frontend, FastAPI REST + webhooks, background worker (RQ/Celery), Postgres/Supabase, provider integrations (WhatsApp BSP / email), simple analytics.

---

## 3. Key user flows (detailed)

### A. Onboard guest list (CSV)

1. Upload CSV in Next.js UI.
2. Frontend `POST /api/upload-csv` → backend stores file, starts parsing job.
3. Worker parses rows into `guests` table; validate and dedupe.
4. Show parsed preview and column mapping in UI.
5. Save campaign draft.

**CSV sample**:

```
name,phone,email,checkin_date,checkout_date,booking_id,room_type
Suman,+919876543210,suman@example.com,2025-07-28,2025-07-30,AB123,Deluxe
```

### B. Campaign creation & scheduling

- UI: campaign name, channel (WhatsApp/email), delay after checkout, AI personalization on/off, retries, opt-out text.
- Backend stores schedule and attaches guest list.

### C. Message generation

- Template mode: variable interpolation (`{{name}}`).
- AI mode: one AI call per guest to generate friendly 1–2 line ask (cache & store output).

### D. Dispatch & Delivery

- Worker enqueues messages respecting provider rate-limits.
- Provider webhooks update `events` table.

### E. Guest reply & chatbot flow

- `POST /api/webhook/whatsapp` receives replies → classify (positive/negative/neutral) via light AI classifier.
- Positive → auto-thanks + review link; Negative → escalate (ticket/email to staff).

### F. Reporting & Dashboard

- Metrics: sent/delivered/read, click rate, reviews count, sentiment distribution, top comments.
- Dashboard pages: Campaign overview, Guest activity feed, Export reports.

---

## 4. Database schema (core tables)

- **users** (id, org\_id, email, hashed\_password, role)
- **orgs** (id, name, timezone, default\_country)
- **campaigns** (id, org\_id, name, channel, schedule\_cfg, ai\_enabled, status)
- **guests** (id, campaign\_id, name, phone, email, checkin\_date, checkout\_date, booking\_id, meta JSON)
- **messages** (id, guest\_id, campaign\_id, content, channel, status, provider\_msg\_id, ai\_generated boolean)
- **events** (id, message\_id, event\_type, timestamp, payload JSON)
- **reviews** (id, guest\_id, source, rating, text, timestamp)

---

## 5. API Endpoints (example)

- `POST /api/auth/login` → JWT
- `POST /api/upload-csv` → returns job\_id
- `GET /api/upload-job/{id}` → job status + preview
- `POST /api/campaigns` → create campaign
- `GET /api/campaigns/{id}` → campaign details
- `POST /api/campaigns/{id}/start` → begin scheduling
- `POST /api/webhook/whatsapp` → incoming messages
- `GET /api/reports/campaign/{id}` → analytics

---

## 6. WhatsApp Business API integration options

- **Direct Meta Business API**: more control, slower setup (business verification required).
- **BSPs (360dialog, Gupshup, Infobip, WATI, MessageBird)**: faster sandbox access for demos — recommended for MVP.

---

## 7. AI Personalization design

**Prompt template example**:

```
You are an assistant that writes short, friendly WhatsApp messages asking a hotel guest to leave a review. Use the guest's name and stay length. Keep under 2 lines.
Context: name={name}, room_type={room_type}, checkin={checkin_date}, checkout={checkout_date}
```

**Notes**: cache results (1 call/guest), sanitize PII, run a profanity check.

---

## 8. Worker & Scheduling

- Use **Redis + RQ** or **Celery**.
- Worker tasks: CSV parse, AI generate, enqueue send, handle webhooks, retries with backoff.

---

## 9. Sidebar — Developer-Ready Spec (exact; put this into the frontend builder)

**Goal**: Build a reusable, responsive Sidebar component in Next.js + Tailwind that matches the screenshots and is usable by your coding agent.

The sidebar will serve as the primary navigation and quick-access area for the application. It should be visually clean, modern, and easy to understand without overwhelming the user. The layout will be vertical, positioned on the left-hand side of the screen.

**Design and Style:**

- Background: White to maintain a clean and bright feel.
- Accent Color: Purple accents will be used for highlights, active states, icons, and key interactive elements.
- Typography: Clear and legible font, consistent with the overall app style.
- Spacing: Ample padding around items to ensure comfort and clarity.

**Content and Structure:**

- Top Area: App logo or branding.
- Main Navigation: A list of main sections or pages, each with an icon and label.
- Secondary Links: Smaller section for settings, help, or profile options.
- Bottom Area: Logout button or any less-used actions.

**Interaction and Behavior:**

- Active items should be visually distinct with the purple accent.
- Hover states should provide subtle visual feedback.
- The sidebar should remain fixed while scrolling through content.

---

## 10. Frontend pages (Next.js)

- Login / Org setup
- Dashboard (campaign list + quick metrics)
- Upload CSV (file + mapping + preview)
- Create Campaign (name, channel, schedule, AI on/off)
- Campaign Detail (activity feed, message previews, start/stop)
- Live Demo Chat (simulate guest replies) — for sales
- Settings (WhatsApp provider config, review links, branding)

**UI notes**: minimal, mobile-first. Use Tailwind + Headless UI components for popovers & modals.

---

## 11. CSV onboarding UX details

- Client uploads file → show parsing preview with column mapping UI.
- Highlight invalid rows and allow inline edit before import.
- Dedup rules: phone+email.

---

## 12. Analytics & dashboard details

- Track events in `events` table.
- Provide graphs for Review Growth (bar chart), Clicks, Review Requests, Contacts Added, Conversion.

---

## 13. MVP Timeline & Checklist (2–4 week demo)

**Week 0 — Setup**: project scaffold (Next.js, FastAPI, Postgres, Redis), provider trial accounts. **Week 1 — CSV upload, parsing, guest preview, simple campaign model.** **Week 2 — Message generation (template + AI mode), worker + scheduling, send via sandbox BSP.** **Week 3 — Webhooks (delivery + replies), sentiment routing, dashboard charts.** \*\*Week 4 — Polish UI, mobile responsiveness, analytics page, demo script + sample CSVs.

---

## 14. Deliverables for coding agent

- `Sidebar` component + items.json (see section 9.9)
- CSV upload page and parsing worker
- Campaign CRUD and scheduler
- Message generator (template + AI) — simple prompt stored
- Integrations page with empty-state CTA
- Small demo script to simulate sends & replies

---

