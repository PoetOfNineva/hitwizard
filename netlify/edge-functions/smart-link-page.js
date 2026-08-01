// HitWizard — Public Smart Link Page
// Serves: hitwizardai.com/l/:slug
// Handles BOTH single songs and multi-song collections
// Tracks clicks per platform

export default async function handler(request, context) {
  const url = new URL(request.url);
  const slug = url.pathname.replace(/^\/l\//, "").split("/")[0].trim();
  if (!slug) return new Response("Not found", { status: 404 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://vklwiqbglmhyjuenysal.supabase.co";
  const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/smart_links?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return new Response("DB error", { status: 500 });
    const links = await res.json();
    if (!links?.length) return new Response(notFoundPage(), { status: 404, headers: { "Content-Type": "text/html" } });

    const link = links[0];
    const ua = request.headers.get("user-agent") || "";
    const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";

    // Fire-and-forget click tracking
    fetch(`${SUPABASE_URL}/rest/v1/smart_links?id=eq.${link.id}`, {
      method: "PATCH",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clicks: (link.clicks || 0) + 1 })
    }).catch(() => {});

    const isCollection = link.link_type === "collection";
    const html = isCollection ? collectionPage(link, slug) : singlePage(link, slug);

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }
    });

  } catch(err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}

// ── SINGLE SONG PAGE (existing behaviour) ──
function singlePage(link, slug) {
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
  ].filter(p => p.href?.trim());

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(link.title)} — ${esc(link.artist)}</title>
<meta name="description" content="Listen to ${esc(link.title)} by ${esc(link.artist)} on all platforms">
<meta property="og:title" content="${esc(link.title)} — ${esc(link.artist)}">
<meta property="og:image" content="${esc(link.artwork_url || '')}">
<meta property="og:type" content="music.song">
${baseStyles(bg, accent)}
</head>
<body>
<div class="card">
  ${artworkHtml(link.artwork_url, link.title)}
  <div class="title">${esc(link.title)}</div>
  <div class="artist">${esc(link.artist)}</div>
  ${link.release_date ? `<div class="release">Released ${fmtDate(link.release_date)}</div>` : ""}
  ${PLATFORM_CONFIG.map(p => `
  <a class="btn" href="${esc(p.href)}?ref=${p.key}&from=hitwizard"
     target="_blank" rel="noopener"
     onclick="track('${p.key}')"
     style="background:${p.color}18;border-color:${p.color}44;color:#fff">
    <span style="font-size:20px">${p.icon}</span>
    <span>${esc(p.label)}</span>
  </a>`).join("")}
  ${link.download_gate && link.download_url ? `
  <a class="btn" href="${esc(link.download_url)}" target="_blank" rel="noopener"
     style="background:rgba(255,184,0,.12);border-color:rgba(255,184,0,.4);color:#FFB800;margin-top:6px">
    <span>⬇</span><span>Free Download</span>
  </a>` : ""}
  <div class="powered">Powered by <a href="https://hitwizardai.com" target="_blank">HitWizard</a> · Music Marketing from the Future</div>
</div>
${trackScript(slug)}
</body></html>`;
}

// ── MULTI-SONG COLLECTION PAGE (new) ──
function collectionPage(link, slug) {
  const bg = link.bg_color || "#0a0a0f";
  const accent = link.accent_color || "#FFB800";
  const songs = Array.isArray(link.songs) ? link.songs : [];

  const PLATFORM_ICONS = {
    spotify: { icon: "🎵", label: "Spotify", color: "#1DB954" },
    apple_music: { icon: "🍎", label: "Apple Music", color: "#FC3C44" },
    youtube: { icon: "▶", label: "YouTube", color: "#FF0000" },
    soundcloud: { icon: "☁", label: "SoundCloud", color: "#FF5500" },
    tidal: { icon: "〰", label: "Tidal", color: "#00FFFF" },
    deezer: { icon: "♦", label: "Deezer", color: "#A238FF" },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(link.collection_title || link.title || "Music Collection")}</title>
<meta name="description" content="${esc(link.collection_description || `Listen to ${songs.length} songs`)}">
<meta property="og:title" content="${esc(link.collection_title || 'Music Collection')}">
${songs[0]?.artwork_url ? `<meta property="og:image" content="${esc(songs[0].artwork_url)}">` : ""}
${baseStyles(bg, accent)}
<style>
.collection-header{text-align:center;margin-bottom:32px}
.collection-title{font-size:26px;font-weight:900;color:#fff;margin-bottom:6px;font-family:-apple-system,sans-serif}
.collection-desc{font-size:14px;color:rgba(255,255,255,.4);margin-bottom:4px}
.song-count{font-size:11px;color:${accent};letter-spacing:2px;font-family:monospace}
.song-card{
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);
  border-radius:16px;
  padding:16px;
  margin-bottom:14px;
  display:flex;flex-direction:column;gap:12px;
}
.song-card:last-child{margin-bottom:0}
.song-header{display:flex;align-items:center;gap:14px}
.song-artwork{
  width:64px;height:64px;border-radius:10px;
  object-fit:cover;flex-shrink:0;
  box-shadow:0 4px 16px rgba(0,0,0,.4);
}
.song-artwork-placeholder{
  width:64px;height:64px;border-radius:10px;
  background:rgba(255,255,255,.06);
  display:flex;align-items:center;justify-content:center;
  font-size:28px;flex-shrink:0;
}
.song-meta{flex:1;min-width:0}
.song-title{font-size:15px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.song-artist{font-size:12px;color:rgba(255,255,255,.4);margin-top:2px}
.song-num{font-size:11px;color:${accent};font-family:monospace;letter-spacing:1px;margin-bottom:2px}
.platform-row{display:flex;gap:8px;flex-wrap:wrap}
.plat-btn{
  display:flex;align-items:center;gap:6px;
  padding:8px 12px;border-radius:8px;
  text-decoration:none;font-size:12px;font-weight:700;
  border:1px solid transparent;
  transition:all .15s;color:#fff;white-space:nowrap;
}
.plat-btn:hover{transform:translateY(-1px);filter:brightness(1.15)}
</style>
</head>
<body>
<div class="card" style="max-width:480px">
  <div class="collection-header">
    <div class="collection-title">${esc(link.collection_title || link.title || "Music Collection")}</div>
    ${link.collection_description ? `<div class="collection-desc">${esc(link.collection_description)}</div>` : ""}
    <div class="song-count">${songs.length} SONG${songs.length !== 1 ? "S" : ""}</div>
  </div>

  ${songs.map((song, i) => {
    const platforms = song.platforms || {};
    const platLinks = Object.entries(platforms)
      .filter(([, href]) => href?.trim())
      .map(([key, href]) => {
        const p = PLATFORM_ICONS[key] || { icon: "🎵", label: key, color: "#FFB800" };
        return `<a class="plat-btn" href="${esc(href)}?ref=${key}&from=hitwizard"
          target="_blank" rel="noopener"
          onclick="track('${key}-song${i+1}')"
          style="background:${p.color}20;border-color:${p.color}50">
          <span>${p.icon}</span><span>${p.label}</span>
        </a>`;
      }).join("");

    return `<div class="song-card">
      <div class="song-header">
        ${song.artwork_url
          ? `<img class="song-artwork" src="${esc(song.artwork_url)}" alt="${esc(song.title)}" loading="lazy" onerror="this.style.display='none'">`
          : `<div class="song-artwork-placeholder">🎵</div>`}
        <div class="song-meta">
          <div class="song-num">TRACK ${String(i+1).padStart(2,"0")}</div>
          <div class="song-title">${esc(song.title)}</div>
          <div class="song-artist">${esc(song.artist || link.artist)}</div>
        </div>
      </div>
      ${platLinks ? `<div class="platform-row">${platLinks}</div>` : ""}
    </div>`;
  }).join("")}

  <div class="powered" style="margin-top:24px">
    Powered by <a href="https://hitwizardai.com" target="_blank">HitWizard</a> · Music Marketing from the Future
  </div>
</div>
${trackScript(slug)}
</body></html>`;
}

// ── SHARED HELPERS ──
function baseStyles(bg, accent) {
  return `<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:${esc(bg)};min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;padding:24px}
.card{width:100%;max-width:420px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:32px 24px;text-align:center;box-shadow:0 40px 80px rgba(0,0,0,.4)}
.artwork{width:160px;height:160px;border-radius:16px;object-fit:cover;margin:0 auto 20px;display:block;box-shadow:0 8px 32px rgba(0,0,0,.4)}
.artwork-placeholder{width:160px;height:160px;border-radius:16px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:64px;margin:0 auto 20px}
.title{font-size:22px;font-weight:800;color:#fff;margin-bottom:4px;line-height:1.2}
.artist{font-size:15px;color:rgba(255,255,255,.5);margin-bottom:24px}
.release{font-size:11px;color:rgba(255,255,255,.3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:20px;font-family:monospace}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:700;margin-bottom:10px;transition:all .2s;border:2px solid transparent}
.btn:hover{transform:translateY(-2px);filter:brightness(1.1)}
.powered{margin-top:24px;font-size:11px;color:rgba(255,255,255,.2);letter-spacing:1px}
.powered a{color:${esc(accent)};text-decoration:none;font-weight:700}
</style>`;
}

function artworkHtml(url, title) {
  if (url) return `<img class="artwork" src="${esc(url)}" alt="${esc(title)}" loading="eager" onerror="this.style.display='none'">`;
  return `<div class="artwork-placeholder">🎵</div>`;
}

function trackScript(slug) {
  return `<script>
function track(platform){
  fetch('/api/track-click',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({slug:'${escJs(slug)}',platform,device:window.innerWidth<768?'mobile':'desktop'})
  }).catch(()=>{});
}
</script>`;
}

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString("en-US", {year:"numeric", month:"long", day:"numeric"}); }
  catch { return d; }
}

function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escJs(str) {
  if (!str) return "";
  return String(str).replace(/'/g,"\\'").replace(/\n/g,"\\n");
}
function notFoundPage() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Link Not Found</title><style>body{background:#0a0a0f;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;text-align:center}</style></head><body><div><h1 style="color:#FFB800;font-size:48px">⚡</h1><h2>Link Not Found</h2><p style="color:rgba(255,255,255,.5);margin-top:8px">This Smart Link does not exist or has been deactivated.</p><br><a href="https://hitwizardai.com" style="color:#FFB800">Create yours free at HitWizard →</a></div></body></html>`;
}

export const config = { path: "/l/:slug" };
