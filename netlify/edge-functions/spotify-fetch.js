// HitWizard — Spotify Proxy Edge Function

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
    const body = await request.json();
    const { url, trackId } = body;

    if (!trackId) return new Response(JSON.stringify({ error: "No track ID" }), { status: 400, headers });

    // Strip session params from trackId — ?si= breaks oEmbed
    const cleanTrackId = trackId.split("?")[0].split("&")[0];

    let songTitle = "", artist = "", artworkUrl = "";
    let fetchedReal = false;

    // ── STEP 1: oEmbed — gets artwork + sometimes "Title · Artist" ──
    const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${cleanTrackId}`;
    const oResp = await fetch(oembedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (oResp.ok) {
      const oData = await oResp.json();
      const title = oData.title || "";
      artworkUrl = oData.thumbnail_url || "";
      fetchedReal = true;
      console.log("[spotify-fetch] oEmbed title:", title);
      // Parse "Song · Artist" or "Song - Artist"
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
        // artist stays empty — fallback below
      }
    } else {
      return new Response(JSON.stringify({
        error: "Spotify blocked this request",
        hint: "Try an Apple Music or YouTube link for better results"
      }), { status: 200, headers });
    }

    // ── STEP 2: If artist empty, scrape Spotify page JSON-LD for artist name ──
    if (!artist) {
      try {
        const pageResp = await fetch(`https://open.spotify.com/track/${cleanTrackId}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9"
          }
        });
        if (pageResp.ok) {
          const html = await pageResp.text();
          // JSON-LD structured data always has byArtist
          const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
          if (jsonLdMatch) {
            try {
              const ld = JSON.parse(jsonLdMatch[1]);
              if (ld.byArtist) {
                artist = Array.isArray(ld.byArtist)
                  ? ld.byArtist.map(a => a.name).join(", ")
                  : (ld.byArtist.name || "");
              }
              if (!songTitle && ld.name) songTitle = ld.name;
              if (!artworkUrl && ld.image) artworkUrl = Array.isArray(ld.image) ? ld.image[0] : ld.image;
              console.log("[spotify-fetch] JSON-LD artist:", artist);
            } catch(e) { console.warn("[spotify-fetch] JSON-LD parse fail:", e.message); }
          }
          // Meta tag fallback
          if (!artist) {
            const metaMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
            if (metaMatch) {
              // og:description format: "Song · Artist · Album"
              const parts = metaMatch[1].split(" · ");
              if (parts.length >= 2) artist = parts[1].trim();
            }
          }
        }
      } catch(e) { console.warn("[spotify-fetch] page scrape failed:", e.message); }
    }

    // ── STEP 3: Genius — lyrics URL + artist fallback when empty ──
    let geniusUrl = "", lyricsFound = false;
    if (GENIUS_TOKEN && songTitle) {
      try {
        const query = encodeURIComponent(`${songTitle} ${artist}`);
        const gResp = await fetch(`https://api.genius.com/search?q=${query}`, {
          headers: { "Authorization": `Bearer ${GENIUS_TOKEN}`, "User-Agent": "HitWizard/1.0" }
        });
        if (gResp.ok) {
          const hits = (await gResp.json())?.response?.hits || [];
          const sim = (a,b) => { a=(a||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim(); b=(b||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim(); if(a===b)return 1; if(!a||!b)return 0; const[lg,sh]=a.length>b.length?[a,b]:[b,a]; let m=0,si=0; for(let i=0;i<lg.length&&si<sh.length;i++)if(lg[i]===sh[si]){m++;si++;} return m/lg.length; };
          const ct = (songTitle||"").replace(/\s*[\(\[].*?[\)\]]/g,"").trim();
          let best=null, bs=0;
          for(const h of hits){ const ht=h.result?.title||"", ha=h.result?.primary_artist?.name||""; const ts=Math.max(sim(ct,ht),sim(ct,ht.replace(/\s*[\(\[].*?[\)\]]/g,""))); const as=Math.max(sim(artist,ha),sim((artist.split(" ")[0]||""),(ha.split(" ")[0]||""))); const sc=ts*0.65+as*0.35; if(sc>bs){bs=sc;best=h;} }
          // When artist known: require 0.75 combined score
          // When artist unknown: require 0.85 title-only score to avoid wrong matches
          const titleSim = (a,b) => { a=(a||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim(); b=(b||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim(); if(a===b)return 1; if(!a||!b)return 0; const[lg,sh]=a.length>b.length?[a,b]:[b,a]; let m=0,si=0; for(let i=0;i<lg.length&&si<sh.length;i++)if(lg[i]===sh[si]){m++;si++;} return m/lg.length; };
          const ct2 = (songTitle||"").replace(/\s*[\(\[].*?[\)\]]/g,"").trim();
          const bestTitleScore = best ? titleSim(ct2, (best.result?.title||"").replace(/\s*[\(\[].*?[\)\]]/g,"")) : 0;
          const threshold = artist ? 0.75 : 0.88;
          if (best && bs >= threshold) {
            const dr = await fetch(`https://api.genius.com/songs/${best.result.id}?text_format=plain`,{headers:{"Authorization":`Bearer ${GENIUS_TOKEN}`,"User-Agent":"HitWizard/1.0"}});
            if (dr.ok) {
              const ls = (await dr.json())?.response?.song?.lyrics_state || "";
              if (ls === "complete") {
                geniusUrl = best.result.url;
                lyricsFound = true;
                // Fill artist from Genius ONLY when: empty AND title is near-identical match
                if (!artist && bestTitleScore >= 0.88 && best.result.primary_artist?.name) {
                  artist = best.result.primary_artist.name;
                  console.log("[spotify-fetch] Genius filled artist:", artist, "title score:", bestTitleScore);
                }
                if (!artworkUrl && best.result.song_art_image_url) artworkUrl = best.result.song_art_image_url;
              }
            }
          }
        }
      } catch(e) { console.warn("Genius:", e.message); }
    }

    console.log("[spotify-fetch] final:", { songTitle, artist, hasArtwork: !!artworkUrl });

    return new Response(JSON.stringify({
      songTitle, artist, artworkUrl,
      geniusUrl, lyricsFound, fetchedReal,
      platform: "spotify", confidence: "medium"
    }), { status: 200, headers });

  } catch (err) {
    console.error("Spotify proxy error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/spotify-fetch" };
