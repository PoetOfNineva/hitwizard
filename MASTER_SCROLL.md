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

## ⚙️ NETLIFY ENVIRONMENT VARIABLES

| Key | Purpose |
|-----|---------|
| ANTHROPIC_API_KEY | Claude API (rotated June 23, 2026) |
| SUPABASE_URL | https://vklwiqbglmhyjuenysal.supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | Supabase admin access (sb_secret_RxXF3...) |
| KEEPALIVE_SECRET | hw-keepalive-2026 |
| SPOTIFY_CLIENT_ID | Spotify API |
| SPOTIFY_CLIENT_SECRET | Spotify API |
| GENIUS_ACCESS_TOKEN | Genius API |
| GENIUS_CLIENT_ID | Genius API |
| GENIUS_CLIENT_SECRET | Genius API |
| YOUTUBE_API_KEY | YouTube Data API v3 |
| APPLE_KEY_ID | Apple MusicKit |
| APPLE_PRIVATE_KEY | Apple MusicKit |
| APPLE_TEAM_ID | Apple MusicKit |
| STRIPE_SECRET_KEY | Stripe payments |
| STRIPE_WEBHOOK_SECRET | Stripe webhook verification |
| ADMIN_SECRET | NectarStream-KikoImmortal-BlackTide2026 |
| RESEND_API_KEY | ⚠️ NEEDS ADDING — get from resend.com API keys |

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

## 🗺️ BUILD QUEUE (priority order)

### 🔴 IMMEDIATE
1. Add `RESEND_API_KEY` to Netlify (already have Resend account at hitwizard.ai@gmail.com)
2. Email Jason personally from hitwizard.ai@gmail.com
3. Verify onboarding overlay works on fresh session
4. Verify mood/genre dropdown fills correctly on Link Autopilot

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
| Jun 23, 2026 | Security overhaul (API key rotation, /api/claude proxy), Link Autopilot fixes, Admin Command Bridge, onboarding overlay, welcome email, Master Scroll created |

