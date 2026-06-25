// HitWizard — Spotify Web API Proxy
// Uses Client Credentials flow — no user login needed, full metadata guaranteed

export default async function handler(request, context) {
  const headers = {
    "Access-Control-Allow-Origin": "https://hitwizardai.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  try {
    const GENIUS_TOKEN = Deno.env.get("GENIUS_ACCESS_TOKEN");
    const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
    const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");

    const body = await request.json();
    const { url, trackId } = body;
    if (!trackId) return new Response(JSON.stringify({ error: "No track ID" }), { status: 400, headers });

    const cleanId = trackId.split("?")[0].replace(/[^a-zA-Z0-9]/g, "");
    let songTitle = "", artist = "", artworkUrl = "", releaseDate = "";
    let fetchedReal = false;

    // DIAGNOSTIC — remove after confirmed working
    console.log("[spotify-fetch] v2-webapi starting. hasClientId:", !!SPOTIFY_CLIENT_ID, "hasSecret:", !!SPOTIFY_CLIENT_SECRET, "trackId:", cleanId);

    // ── SPOTIFY WEB API (Client Credentials) ──
    if (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET) {
      try {
        // Step 1: Get access token
        const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)
          },
          body: "grant_type=client_credentials"
        });

        if (tokenResp.ok) {
          const { access_token } = await tokenResp.json();

          // Step 2: Get track metadata
          const trackResp = await fetch(`https://api.spotify.com/v1/tracks/${cleanId}`, {
            headers: { "Authorization": `Bearer ${access_token}` }
          });

          if (trackResp.ok) {
            const track = await trackResp.json();
            songTitle = track.name || "";
            artist = track.artists?.map(a => a.name).join(", ") || "";
            artworkUrl = track.album?.images?.[0]?.url || "";
            releaseDate = track.album?.release_date || "";
            fetchedReal = true;
            console.log("[spotify-fetch] Web API success:", { songTitle, artist });
          } else {
            console.warn("[spotify-fetch] Track fetch failed:", trackResp.status);
          }
        } else {
          console.warn("[spotify-fetch] Token fetch failed:", tokenResp.status);
        }
      } catch(e) {
        webApiError = e.message;
        console.warn("[spotify-fetch] Web API error:", e.message);
      }
    }

    // ── FALLBACK: oEmbed (if no API credentials or API failed) ──
    if (!fetchedReal) {
      try {
        const oResp = await fetch(
          `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${cleanId}`,
          { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
        );
        if (oResp.ok) {
          const oData = await oResp.json();
          const title = oData.title || "";
          artworkUrl = oData.thumbnail_url || "";
          fetchedReal = true;
          if (title.includes(" · ")) {
            const p = title.split(" · ");
            songTitle = p[0].trim();
            artist = p.slice(1).join(" · ").trim();
          } else if (title.includes(" - ")) {
            const p = title.split(" - ");
            songTitle = p[0].trim();
            artist = p.slice(1).join(" - ").trim();
          } else {
            songTitle = title;
          }
        }
      } catch(e) { console.warn("[spotify-fetch] oEmbed fallback failed:", e.message); }
    }

    // ── GENIUS: lyrics URL only — never sets artist ──
    let geniusUrl = "", lyricsFound = false;
    if (GENIUS_TOKEN && songTitle && artist) {
      try {
        const query = encodeURIComponent(`${songTitle} ${artist}`);
        const gResp = await fetch(`https://api.genius.com/search?q=${query}`, {
          headers: { "Authorization": `Bearer ${GENIUS_TOKEN}`, "User-Agent": "HitWizard/1.0" }
        });
        if (gResp.ok) {
          const hits = (await gResp.json())?.response?.hits || [];
          const sim = (a,b) => { a=(a||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim(); b=(b||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim(); if(a===b)return 1; if(!a||!b)return 0; const[lg,sh]=a.length>b.length?[a,b]:[b,a]; let m=0,si=0; for(let i=0;i<lg.length&&si<sh.length;i++)if(lg[i]===sh[si]){m++;si++;} return m/lg.length; };
          const ct = songTitle.replace(/\s*[\(\[].*?[\)\]]/g,"").trim();
          let best=null, bs=0;
          for(const h of hits){ const ht=h.result?.title||"", ha=h.result?.primary_artist?.name||""; const ts=Math.max(sim(ct,ht),sim(ct,ht.replace(/\s*[\(\[].*?[\)\]]/g,""))); const as=Math.max(sim(artist,ha),sim((artist.split(" ")[0]||""),(ha.split(" ")[0]||""))); const sc=ts*0.65+as*0.35; if(sc>bs){bs=sc;best=h;} }
          if (best && bs >= 0.75) {
            const dr = await fetch(`https://api.genius.com/songs/${best.result.id}?text_format=plain`,{headers:{"Authorization":`Bearer ${GENIUS_TOKEN}`,"User-Agent":"HitWizard/1.0"}});
            if (dr.ok) {
              const ls = (await dr.json())?.response?.song?.lyrics_state || "";
              if (ls === "complete") {
                geniusUrl = best.result.url;
                lyricsFound = true;
                if (!artworkUrl && best.result.song_art_image_url) artworkUrl = best.result.song_art_image_url;
              }
            }
          }
        }
      } catch(e) { console.warn("Genius:", e.message); }
    }

    return new Response(JSON.stringify({
      songTitle, artist, artworkUrl, releaseDate,
      geniusUrl, lyricsFound, fetchedReal,
      platform: "spotify", confidence: fetchedReal ? "high" : "low",
      _debug: { hasClientId: !!SPOTIFY_CLIENT_ID, hasSecret: !!SPOTIFY_CLIENT_SECRET, cleanId, webApiError, fetchedReal }
    }), { status: 200, headers });

  } catch (err) {
    console.error("Spotify proxy error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/spotify-fetch" };
