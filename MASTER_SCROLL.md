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
| Spotify API | Track metadata | ✅ Live | Web API (Client Credentials) — full metadata: title/artist/artwork/release date. Env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET. oEmbed fallback if API fails. |
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

## ⚔️ COMPLETE FEATURE INVENTORY (all sessions scanned June 23, 2026)

### ✅ PHASE 1 — LIVE & WORKING
- 9 AI weapons (Campaign, Pitches, Content, EPK, Hooks, Budget, Video, Vault, Social UI)
- Auth system (Google/Email/OAuth), cloud history, character vault
- Landing page with nebula starfield, inline auth modal
- Admin Command Bridge at /admin
- Genius strict matching (75% similarity + lyrics_state=complete)
- YouTube title suffix stripping (Official Lyric Video etc)
- bootAuth() redirect gate — logged-out → landing.html

### 🔴 PHASE 2 — PAYWALL ENFORCEMENT (building now)
**Tier limits:**
| Tier | Price | Campaigns | Pitches | EPKs | Hooks | Smart Links |
|------|-------|-----------|---------|------|-------|-------------|
| Free | $0 | 3 | 3 | 1 | 5 | 1 |
| Artist | $10/mo | 30 | 50 | 10 | 50 | 5 |
| Pro Artist | $29/mo | Unlimited | Unlimited | Unlimited | Unlimited | 20 |
| Manager | $79/mo | Unlimited | Unlimited | Unlimited | Unlimited | 50 |
| Label | $149/mo | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |

**Implementation:**
- usage_logs table in Supabase tracks every generation per user per weapon
- On generate: check count vs tier limit → block with upgrade modal if exceeded
- Stripe webhook → updates profiles.tier in Supabase on payment
- Upgrade modal: shows current usage, tier benefits, Stripe checkout link

### 🔴 PHASE 2 — AD CREATIVE BUILDER (HitWizard's Aura-killer)
**Lyric Impact Score:**
- AI scores every lyric section 1-100 for emotional/viral weight
- Artist selects highest-scoring line as the ad's emotional core
- Score factors: emotional intensity, uniqueness, relatability, hook potential

**Ad Creative Types (all generated from lyrics + mood + artwork):**
- Kinetic lyric card video — winning line appears word-by-word, kinetic typography
- Animated album cover — pulse/zoom/particle effects (beats Hypeddit)
- Quote card — lyric styled to song mood, ready for Stories/Reels
- Waveform visualizer — audio waveform animated over artwork
- Countdown timer ad — release date countdown with artwork

**Why we surpass Aura:**
- Aura: genre → template library → generic ad
- HitWizard: lyrics → impact score → artist picks emotional core → unique ad built FROM the song
- All output formatted for Meta, TikTok, Instagram Stories, YouTube (correct dimensions/specs)
- Ready to upload directly to Meta — no Canva, no external tools

### ✅ PHASE 2 — SMART LINKS EMPIRE (completed June 24, 2026)
- Smart Link Builder — one link, all platforms ✅
- Public cinematic page at hitwizardai.com/l/slug ✅
- Click tracking by platform and device ✅
- Analytics dashboard (total clicks, platform breakdown, top countries) ✅
- Paywall gated (Free=1, Artist=5, Pro=unlimited) ✅
- "Powered by HitWizard · Music Marketing from the Future" on every page ✅
- Pre-Save and Download Gate toggles (UI built, full automation Phase 3) ✅
- QR Code Generator — NEXT TO BUILD

### 🔴 PHASE 3 — ANALYTICS WAR ROOM
- Stream Tracker Dashboard — Spotify, Apple, YouTube, TikTok in one cockpit
- Campaign ROI Tracker — ad spend vs streams in real time
- Fan Growth Charts — followers over time by platform
- Content Performance — which caption/hook got most clicks
- Milestone Celebrations — 1K/10K/100K streams with shareable cards
- Release Timeline Planner — plan drops like a general

### 🔴 PHASE 3 — META CAMPAIGN LAUNCH
- Connect Meta account via OAuth (meta_connections Supabase table)
- Review generated campaign inside HitWizard
- One-click launch to Meta Ads Manager via API
- Campaign status dashboard — impressions, spend, CPR, saves

### 🔴 PHASE 3 — SLIDING TESTIMONIALS (UI feature)
- Auto-scrolling cards, left to right, continuous loop like GPM
- Stream proof screenshots
- Video testimonials when real users provide them

### 🔴 PHASE 4 — REFERRAL & COMMUNITY
- Referral program — invite artists, earn free months
- Referral leaderboard
- Affiliate program for music bloggers/educators
- Discord community — HitWizard inner circle

### 🔵 PHASE 5 — THE THRONE ROOM
- Spotify OAuth — pull real stream data directly
- Audio Fingerprint Analyzer — upload MP3, auto-detect BPM/key/mood
- AI Release Planner — optimal release dates by genre/platform
- Sync Licensing Pitches — TV/Film placement emails
- Press Release Generator (beyond EPK)
- Tour/Venue Finder — AI suggests venues by fanbase location
- TikTok API — real video performance data
- White-label platform for labels
- Merchandise store integration
- AI Mastering — upload track, get mastered version back

---

## 🗺️ BUILD QUEUE (priority order)

### ✅ DONE — SMART LINKS EMPIRE
### 🔴 NOW — AD CREATIVE BUILDER (Lyric Impact Score + Kinetic Lyric Cards)
### 🟡 NEXT — QR Code Generator for Smart Links
### 🟢 FOLLOWING — Analytics War Room
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

