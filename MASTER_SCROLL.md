# ⚔️ HITWIZARD MASTER SCROLL
> The living doctrine of the HitWizard empire. Updated every session. Never stale.
> Captain: Kikodinho Edward Alexandros (Kiko) — Poet of Nineva, Bard of Nineva
> Last updated: June 23, 2026

---

## 🏰 THE EMPIRE AT A GLANCE

**Live URL:** https://hitwizardai.com
**GitHub:** https://github.com/PoetOfNineva/hitwizard (auto-deploys from `main` branch)
**Netlify:** app.netlify.com/projects/hitwizard
**Supabase:** https://supabase.com/dashboard/project/vklwiqbglmhyjuenysal
**Platform Email:** hitwizard.ai@gmail.com (ALL platform emails — never personal emails)
**Admin Portal:** https://hitwizardai.com/admin (secret: NectarStream-KikoImmortal-BlackTide2026)

---

## 🔑 CREDENTIALS & SERVICES

| Service | Purpose | Status | Notes |
|---------|---------|--------|-------|
| Netlify | Hosting + Functions + Edge Functions | ✅ Live | Auto-deploy from main |
| Supabase | Database + Auth + Storage | ✅ Live | Free tier, keepalive every 3 days |
| Anthropic API | Claude Sonnet 4.6 AI calls | ✅ Live | Via secure /api/claude proxy — key NEVER in browser |
| Stripe | Payments | ✅ Configured | Webhook + checkout edge functions exist |
| Resend | Transactional email | ✅ Account exists (hitwizard.ai@gmail.com) | API key needed in Netlify as RESEND_API_KEY |
| Genius API | Lyrics search | ✅ Live | Returns URL only — no raw lyrics (copyright) |
| Spotify API | Track metadata | ✅ Live | oEmbed only — title/artist/artwork |
| YouTube API | Video metadata | ✅ Live | YouTube Data API v3 |
| Apple Music | Track metadata | ✅ Live | MusicKit JWT |
| GitHub Token | Direct repo commits | ✅ Active | ghp_[STORED_IN_CAPTAIN_MEMORY] (verify each session) |

---

## 🗄️ SUPABASE SCHEMA (10 tables, all exposed to Data API)

| Table | Purpose |
|-------|---------|
| profiles | User profiles, tier, usage counts |
| characters | Character Vault DNA entries (user-specific) |
| history | Generation history per user |
| song_vault | Saved songs |
| campaign_tracking | Campaign performance data |
| usage_logs | Anti-abuse usage tracking |
| smart_links | Smart link builder data |
| link_clicks | Link analytics |
| milestones | User milestone tracking |
| email_subscribers | Email list |

**Auth:** Email confirmation ON. Google/Facebook/Discord OAuth enabled.
**RLS:** Enabled on all tables. Data API exposed for all 10 tables.

---

## ⚙️ NETLIFY ENVIRONMENT VARIABLES (confirmed June 23, 2026)

| Key | Status | Purpose |
|-----|--------|---------|
| ADMIN_SECRET | ✅ Set | NectarStream-KikoImmortal-BlackTide2026 |
| ANTHROPIC_API_KEY | ✅ Set | Claude API (rotated June 23, 2026) |
| APPLE_KEY_ID | ✅ Set | Apple MusicKit |
| APPLE_PRIVATE_KEY | ✅ Set | Apple MusicKit |
| APPLE_TEAM_ID | ✅ Set | Apple MusicKit |
| GENIUS_ACCESS_TOKEN | ✅ Set | Genius lyrics search |
| GENIUS_CLIENT_ID | ✅ Set | Genius API |
| GENIUS_CLIENT_SECRET | ✅ Set | Genius API |
| KEEPALIVE_SECRET | ✅ Set | hw-keepalive-2026 |
| SPOTIFY_CLIENT_ID | ✅ Set | Spotify oEmbed |
| SPOTIFY_CLIENT_SECRET | ✅ Set | Spotify oEmbed |
| STRIPE_SECRET_KEY | ✅ Set | Stripe payments |
| STRIPE_WEBHOOK_SECRET | ✅ Set | Stripe webhook verification |
| SUPABASE_SERVICE_ROLE_KEY | ✅ Set | Supabase admin (sb_secret_RxXF3...) |
| SUPABASE_URL | ✅ Set | https://vklwiqbglmhyjuenysal.supabase.co |
| YOUTUBE_API_KEY | ✅ Set | YouTube Data API v3 |
| RESEND_API_KEY | ❌ MISSING | Add from resend.com — key named "HitWizard Production" (re_FQnaFkt6...) |

---

## ⚔️ THE NINE WEAPONS (all live)

| Weapon | Route ID | Status | Notes |
|--------|----------|--------|-------|
| Campaign Launcher | campaigns | ✅ Live | Core weapon — lyrics → Meta/TikTok/YouTube ads |
| Playlist Strike | pitches | ✅ Live | Curator pitch emails |
| Content Arsenal | content | ✅ Live | Social captions/hooks/hashtags |
| EPK Generator | epk | ✅ Live | Press kit generator |
| Hook Lab | hooklab | ✅ Live | TikTok/Reel hooks from lyrics |
| Budget Planner | budget | ✅ Live | Ad spend planning |
| Video Engine | video | ✅ Live | Shot-by-shot prompts with Character DNA |
| Character Vault | vault | ✅ Live | DNA storage, auto-injects into Video Engine |
| Social Autopilot | social | ✅ UI only | OAuth posting not yet built |

---

## 🔒 SECURITY ARCHITECTURE

- **API calls:** All Claude calls go through `/api/claude` edge function (Deno, server-side key) — NEVER exposed to browser
- **Key endpoint:** `/api/key` DELETED permanently June 23, 2026
- **Auth:** Supabase Auth with email confirmation required
- **Admin:** `/admin` route — password-gated, requires ADMIN_SECRET header
- **localStorage:** Cleared on sign-out (all `hw_*` keys wiped)
- **Anti-cloning:** No hardcoded secrets in any frontend code

---

## 📦 NETLIFY FUNCTIONS (in /functions)

| Function | Purpose |
|----------|---------|
| supabase-keepalive.js | Scheduled ping every 3 days — prevents Supabase free tier pause |
| keepalive-test.js | Manual test endpoint for keepalive |
| admin-dashboard.js | Powers /admin — returns all user/usage stats |
| delete-account.js | Server-side Supabase Auth user deletion |
| send-welcome.js | Welcome email on signup + admin alert to hitwizard.ai@gmail.com |

## 🌐 EDGE FUNCTIONS (in /netlify/edge-functions)

| Function | Route | Purpose |
|----------|-------|---------|
| claude.js | /api/claude | Secure Claude proxy — streaming, server-side key |
| spotify-fetch.js | /api/spotify-fetch | Spotify oEmbed metadata |
| genius-fetch.js | /api/genius-fetch | Genius lyrics search |
| youtube-fetch.js | /api/youtube-fetch | YouTube metadata |
| apple-fetch.js | /api/apple-fetch | Apple Music metadata |
| stripe-checkout.js | /api/stripe-checkout | Stripe payment session |
| stripe-webhook.js | /api/stripe-webhook | Stripe event handler |

---

## 👥 CURRENT USERS (as of June 23, 2026)

| Email | Tier | Provider | Joined | Generations | Notes |
|-------|------|----------|--------|-------------|-------|
| kikopoet@gmail.com | Free | Email | May 31 | 1 | Captain's account |
| bardofthe21stcentury@gmail.com | Free | Email | May 31 | 1 | Captain's account |
| jason.schlager@gmail.com | Free | Google | Jun 17 | 0 | First organic user — needs conversion |

**Action needed:** Email jason.schlager@gmail.com from hitwizard.ai@gmail.com — personal founder outreach.

---

## 💰 PRICING TIERS (Stripe configured, paywall NOT yet enforced)

| Tier | Price | Key Features |
|------|-------|-------------|
| Free | $0 | Limited generations |
| Artist | $10/mo | 30 campaigns, full EPK, 50 pitches |
| Pro Artist | $29/mo | Unlimited + Smart Links |
| Manager | $79/mo | Multiple artists |
| Label | $149/mo | Full platform access |

⚠️ **PAYWALL NOT ENFORCED** — all users get full access regardless of tier. This is the #1 revenue gap.

---

## 💰 BUSINESS MODEL DECISION (locked June 23, 2026)

### Phase 1 — NOW: OAuth/Subscription Model
- Artists connect their OWN Meta ad account via OAuth
- HitWizard generates campaigns, creates ad sets, uploads creative via Meta API
- Artist reviews, approves, launches — their money goes directly to Meta
- HitWizard revenue = subscription fees only
- Zero financial liability, zero regulatory burden, buildable immediately
- Serves technically capable early adopters

### Phase 2 — 6-12 months: HitWizard Managed (premium tier)
- Like Aura's model — artist pastes link, sets budget, HitWizard runs everything
- HitWizard takes 20% of ad spend
- Requires: revenue to cover float, legal structure for client funds, proven campaign ROI data
- Only pursue after Phase 1 generates sustainable revenue

### Core Differentiator vs Aura (NEVER lose sight of this)
- Aura matches templates to genre/mood — they don't read lyrics
- HitWizard writes campaigns FROM INSIDE THE SONG — every ad uses actual lyric lines
- This is the headline. This is the hero. This is what no competitor can copy.

---

## 🌐 LANDING PAGE OVERHAUL (planned June 23, 2026)

### Vision: "If Aura is from the moon, HitWizard is from an unknown galaxy"

### Required Sections (in order):
1. **Cinematic hero** — full-screen starfield/nebula background, Cinzel serif headline, "Your Lyrics Are The Weapon" theme, Trustpilot-style social proof, Get Started Free + Sign In buttons
2. **The Problem** — "Spotify doesn't reward talent. It rewards velocity." Pain statement before the solution
3. **The HitWizard Difference** — "We read your actual lyrics. Every ad written from inside your song." — this is the differentiator section
4. **How It Works** — 3 steps: Paste your link → Autopilot fetches everything → Choose your weapon
5. **All 9 Weapons** — full showcase, not 6
6. **Results / Case Studies** — placeholder section, real data added as users generate results
7. **Comparison Table** — "Generic AI Tools vs HitWizard" (NOT "vs Aura")
8. **Testimonials** — placeholder, populated as real reviews come in
9. **FAQ** — General / Weapons / Pricing / Campaign sections
10. **Final CTA** — full-width epic banner, "The Future Of Music Marketing. From Inside Your Song."
11. **Demo video placeholder** — space reserved for founder video (to be recorded)

### Design DNA:
- Background: deep space black (#0a0a0f) with nebula/star particle effects
- Typography: Cinzel for headlines (already loaded), system-ui for body
- Color: gold (#FFB800) as primary accent, dark cards with gold borders
- Vibe: epic, cinematic, otherworldly — NOT corporate SaaS
- Mobile-first responsive

---

## 🗺️ BUILD QUEUE (priority order)

### 🔴 CRITICAL LESSONS (never repeat)
- **React hooks must NEVER appear after conditional returns** — React error #310. All hooks go at top of component unconditionally.
- **auth.js must be in `<head>`** — if loaded at bottom of body, DOMContentLoaded fires before it loads and init() never runs.
- **Landing page auth must use window.HW_AUTH** — never a separate Supabase client. Two clients = two storage keys = session not found on redirect.
- **Auth gate lives in bootAuth()** — not in React component hooks. bootAuth polls until HW_AUTH.ready then redirects if not logged in.
- **RESEND_API_KEY** still missing from Netlify — add from resend.com (account: hitwizard.ai@gmail.com, key: "HitWizard Production" re_FQnaFkt6...)

### 🟡 LANDING PAGE STATUS
- Live at hitwizardai.com/landing.html
- Light/dark hybrid design — dark hero with concert photo + nebula starfield, alternating light sections
- Auth modal inline on landing page — uses window.HW_AUTH (shared session)
- Logged-out users redirected from / to /landing.html via bootAuth()
- Logged-in users go straight to app


1. **Landing page overhaul** — galaxy-tier, better than Aura (in progress)
2. Add `RESEND_API_KEY` to Netlify (Resend account exists at hitwizard.ai@gmail.com, key: "HitWizard Production" re_FQnaFkt6...)
3. Email Jason personally from hitwizard.ai@gmail.com
4. Verify onboarding overlay works on fresh session
5. Verify mood/genre dropdown fills correctly on Link Autopilot

### 🟡 NEXT SPRINT
5. **Paywall enforcement** — usage counters, tier gates, upgrade modal
6. **Lyric Chapter Segmentation + Impact Score** (from OpusClip inspiration) — segment lyrics into sections, score each 1-100, let user pick which section drives the ad
7. **Virality/Impact Score** on Hook Lab outputs and ad copy variants
8. Fix "Who should hear this song" — AI should suggest audience from genre/mood
9. Fix "What is this song about" — auto-fill from lyrics on blur (deployed, unverified)

### 🟢 PHASE 2 (Meta Campaign Pipeline)
10. Meta OAuth connect flow — "Connect Meta Account" button, `meta_connections` Supabase table
11. `/api/meta-campaign` edge function — 4-call sequence (Campaign → Ad Set → Creative → Ad), all PAUSED
12. "Launch Campaign" button in Campaign Launcher — wires generated output to Meta API
13. Campaign status dashboard — pull `/insights` for impressions/clicks/spend

### 🔵 PHASE 3 (Platform Maturity)
14. Signup notification emails to hitwizard.ai@gmail.com (needs RESEND_API_KEY)
15. Smart Links Empire — pre-save pages, download gates, QR codes, analytics
16. Spotify OAuth real stream data
17. TikTok OAuth + Content Posting API (app in Draft status)
18. Admin dashboard enhancements — revenue tracker, user drill-down, churn alerts, geographic breakdown

---

## 🎬 CHARACTER VAULT — LOCKED DNA (NEVER CHANGE WITHOUT EXPLICIT INSTRUCTION)

Five hardcoded characters embedded in source code:

| ID | Name | Role |
|----|------|------|
| CELINE | Celine Enya Houston | Lead artist — NEVER call her "Celinenya" |
| KIKO | Kiko Poet | Male lead |
| THE BLONDE | Supporting female | Blonde character |
| GRANDMA | Supporting | Elderly female |
| THE GERMAN | Supporting male | German character |

Full DNA strings locked in `index.html` source. Proportion tags non-negotiable.

---

## 📜 CORE DOCTRINES

### Link Autopilot Doctrine
- Fetch → Enrich (AI picks exact dropdown option from allowed list) → Populate
- `confirmAndFire` is async — enriches genre/mood/BPM/key/similar via AI before calling onFetched
- All 4 onFetched handlers overwrite unconditionally — no stale data ever
- `story` field clears on new song load so auto-analysis can run fresh
- Lyrics → "What is this song about" auto-fills on textarea blur

### Video Engine Doctrine (Grok)
- Full character DNA always embedded — never just names
- Explicit clothing in every clip
- TRACKING CAMERA always — never static for reveals
- Anti-morph tags in every prompt
- Zoom-in or zoom-out only — no quick cuts within one generation
- Use Extend button to continue clips (saves tokens, maintains consistency)

### Deployment Doctrine
- Captain NEVER pastes code manually
- All changes committed directly to GitHub via API token
- Batch fixes — never single-file deploys unless hotfix emergency
- Always validate syntax locally before pushing
- Deploy credits tracked carefully

### Security Doctrine
- Military-grade: no secrets in browser code, ever
- Anti-cloning: no source-exposable API keys
- Email confirmation required for all new accounts
- localStorage fully cleared on sign-out
- Admin portal hidden at /admin, secret-gated

### Email Doctrine
- ALL platform emails → hitwizard.ai@gmail.com
- Never use personal emails for platform communications
- Resend for transactional (welcome, alerts)
- From address: HitWizard <onboarding@hitwizardai.com>
- Reply-to: hitwizard.ai@gmail.com

---

## 🏴‍☠️ SESSION LOG

| Date | Key Work |
|------|---------|
| May 31, 2026 | Initial platform build — 9 weapons, Supabase, Stripe, OAuth |
| Jun 5, 2026 | Major fixes batch — Link Autopilot, Character Vault, History cloud sync |
| Jun 8, 2026 | Supabase keepalive, Video Engine master scroll doctrine, STARFIRE deploy |
| Jun 23, 2026 | Landing page full rebuild (light/dark hybrid, Playfair Display, nebula starfield, lyric demo with Heaven In Your Eyes chorus, testimonials, comparison table, FAQ, auth modal inline). Fixed React error #310 (hooks after conditional return). Auth gate moved to bootAuth(). auth.js moved to <head>. App fully restored and working. Landing page gates logged-out users. |

