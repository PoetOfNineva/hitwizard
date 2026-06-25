// HitWizard — Public Smart Link Page
// Serves: hitwizardai.com/l/:slug
// Tracks clicks, shows all streaming platforms, handles pre-save + download gate

export default async function handler(request, context) {
  const url = new URL(request.url);
  const slug = url.pathname.replace(/^\/l\//, "").split("/")[0].trim();

  if (!slug) return new Response("Not found", { status: 404 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    // Fetch the smart link from Supabase
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/smart_links?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Supabase error:", res.status, errText);
      return new Response(`DB error: ${res.status}`, { status: 500 });
    }

    const links = await res.json();
    if (!links || links.length === 0) {
      return new Response(notFoundPage(), { status: 404, headers: { "Content-Type": "text/html" } });
    }

    const link = links[0];

    // Track click (fire and forget — don't block page render)
    const ua = request.headers.get("user-agent") || "";
    const ip = context.ip || request.headers.get("x-forwarded-for") || "";
    const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
    const refPlatform = url.searchParams.get("ref") || "direct";

    // Update click count + record click event
    Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/smart_links?id=eq.${link.id}`, {
        method: "PATCH",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ clicks: (link.clicks || 0) + 1 })
      }),
      fetch(`${SUPABASE_URL}/rest/v1/link_clicks`, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({
          smart_link_id: link.id,
          user_id: link.user_id,
          platform: refPlatform,
          device,
          ip_hash: ip.split(".").slice(0,3).join(".") + ".0", // anonymised
          created_at: new Date().toISOString()
        })
      })
    ]).catch(() => {});

    const platforms = link.platforms || {};
    const bg = link.bg_color || "#0a0a0f";
    const accent = link.accent_color || "#FFB800";

    const PLATFORM_CONFIG = [
      { key: "spotify",    label: "Listen on Spotify",    icon: "🎵", color: "#1DB954", href: platforms.spotify },
      { key: "appleMusic", label: "Listen on Apple Music", icon: "🍎", color: "#FC3C44", href: platforms.apple_music },
      { key: "youtube",    label: "Watch on YouTube",      icon: "▶",  color: "#FF0000", href: platforms.youtube },
      { key: "soundcloud", label: "Listen on SoundCloud",  icon: "☁",  color: "#FF5500", href: platforms.soundcloud },
      { key: "tidal",      label: "Listen on Tidal",       icon: "〰", color: "#00FFFF", href: platforms.tidal },
      { key: "deezer",     label: "Listen on Deezer",      icon: "♦",  color: "#A238FF", href: platforms.deezer },
    ].filter(p => p.href && p.href.trim());

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${escHtml(link.title)} — ${escHtml(link.artist)}</title>
<meta name="description" content="Listen to ${escHtml(link.title)} by ${escHtml(link.artist)} on all platforms">
<meta property="og:title" content="${escHtml(link.title)} — ${escHtml(link.artist)}">
<meta property="og:description" content="Listen everywhere. One link.">
${link.artwork_url ? `<meta property="og:image" content="${escHtml(link.artwork_url)}">` : ""}
<meta property="og:type" content="music.song">
<link rel="icon" href="/favicon.ico">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{
  background:${escHtml(bg)};
  min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;
  padding:24px;
}
.card{
  width:100%;max-width:420px;
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);
  border-radius:24px;
  padding:36px 28px;
  text-align:center;
  box-shadow:0 40px 80px rgba(0,0,0,.4);
}
.artwork{
  width:160px;height:160px;border-radius:16px;
  object-fit:cover;margin:0 auto 20px;display:block;
  box-shadow:0 8px 32px rgba(0,0,0,.4);
}
.artwork-placeholder{
  width:160px;height:160px;border-radius:16px;
  background:rgba(255,255,255,.06);
  display:flex;align-items:center;justify-content:center;
  font-size:64px;margin:0 auto 20px;
}
.title{font-size:22px;font-weight:800;color:#fff;margin-bottom:4px;line-height:1.2}
.artist{font-size:15px;color:rgba(255,255,255,.5);margin-bottom:28px}
.btn{
  display:flex;align-items:center;justify-content:center;gap:10px;
  width:100%;padding:15px;border-radius:12px;
  text-decoration:none;font-size:15px;font-weight:700;
  margin-bottom:10px;transition:all .2s;
  border:2px solid transparent;
}
.btn:hover{transform:translateY(-2px);filter:brightness(1.1)}
.btn:last-child{margin-bottom:0}
.powered{
  margin-top:28px;font-size:11px;
  color:rgba(255,255,255,.2);letter-spacing:1px;
}
.powered a{color:${escHtml(accent)};text-decoration:none;font-weight:700}
.release{
  font-size:11px;color:rgba(255,255,255,.3);
  letter-spacing:1.5px;text-transform:uppercase;
  margin-bottom:20px;font-family:'JetBrains Mono',monospace;
}
</style>
</head>
<body>
<div class="card">
  ${link.artwork_url
    ? `<img class="artwork" src="${escHtml(link.artwork_url)}" alt="${escHtml(link.title)}" loading="eager" onerror="this.style.display='none';document.getElementById('aw-placeholder').style.display='flex'">`
    : `<div class="artwork-placeholder">🎵</div>`}
  <div class="title">${escHtml(link.title)}</div>
  <div class="artist">${escHtml(link.artist)}</div>
  ${link.release_date ? `<div class="release">Released ${new Date(link.release_date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>` : ""}
  ${PLATFORM_CONFIG.map(p => `
  <a class="btn" href="${escHtml(p.href)}?ref=${p.key}&from=hitwizard"
     target="_blank" rel="noopener"
     onclick="trackClick('${p.key}')"
     style="background:${p.color}18;border-color:${p.color}44;color:#fff">
    <span style="font-size:20px">${p.icon}</span>
    <span>${escHtml(p.label)}</span>
  </a>`).join("")}
  ${link.download_gate && link.download_url ? `
  <a class="btn" href="${escHtml(link.download_url)}" target="_blank" rel="noopener"
     style="background:rgba(255,184,0,.12);border-color:rgba(255,184,0,.4);color:#FFB800;margin-top:6px">
    <span style="font-size:20px">⬇</span>
    <span>Free Download</span>
  </a>` : ""}
  <div class="powered">Powered by <a href="https://hitwizardai.com" target="_blank">HitWizard</a> · Music Marketing from the Future</div>
</div>
<script>
function trackClick(platform){
  fetch('/api/track-click',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({slug:'${escJs(slug)}',platform,device:window.innerWidth<768?'mobile':'desktop'})
  }).catch(()=>{});
}
</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }
    });

  } catch(err) {
    console.error("Smart link page error:", err.message, err.stack);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}

function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escJs(str) {
  if (!str) return "";
  return String(str).replace(/'/g,"\\'").replace(/\n/g,"\\n");
}
function notFoundPage() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Link Not Found</title><style>body{background:#0a0a0f;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;text-align:center}h1{color:#FFB800;font-size:48px;margin-bottom:12px}p{color:rgba(255,255,255,.5)}a{color:#FFB800}</style></head><body><div><h1>⚡</h1><h2>Link Not Found</h2><p>This Smart Link doesn't exist or has been deactivated.</p><br><a href="https://hitwizardai.com">Create yours free at HitWizard →</a></div></body></html>`;
}

