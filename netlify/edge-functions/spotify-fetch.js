// HitWizard — Spotify Proxy Edge Function
// Proxies Spotify oEmbed through our server to bypass CORS
// Spotify blocks browser requests but allows server-to-server with proper headers

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

    // Try oEmbed with browser-like headers to bypass Spotify's server block
    const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
    
    let songTitle = "", artist = "", artworkUrl = "";
    let fetchedReal = false;

    const oResp = await fetch(oembedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://open.spotify.com/",
        "Origin": "https://open.spotify.com",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (oResp.ok) {
      const oData = await oResp.json();
      const title = oData.title || "";
      artworkUrl = oData.thumbnail_url || "";
      fetchedReal = true;
      // Parse title — oEmbed title format: "Song · Artist" or "Song - Artist"
      // NOTE: author_name is unreliable (returns channel name not artist) — never use it
      console.log("[spotify-fetch] oEmbed title:", title);
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
        // artist stays empty — Genius lookup below may fill it
      }
    } else {
      const errText = await oResp.text();
      console.error("Spotify oEmbed error:", oResp.status, errText.substring(0, 100));
      return new Response(JSON.stringify({
        error: "Spotify blocked this request",
        status: oResp.status,
        hint: "Try an Apple Music or YouTube link for better results"
      }), { status: 502, headers });
    }

    // Search Genius for lyrics — strict matching (75% similarity + lyrics_state=complete)
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
          for(const h of hits){ const ht=h.result?.title||"", ha=h.result?.primary_artist?.name||""; const ts=Math.max(sim(ct,ht),sim(ct,ht.replace(/\s*[\(\[].*?[\)\]]/g,""))); const as=artist?Math.max(sim(artist,ha),sim((artist.split(" ")[0]||""),(ha.split(" ")[0]||""))):0.5; const sc=ts*0.65+as*0.35; if(sc>bs){bs=sc;best=h;} }
          // Lower threshold when artist unknown — we need Genius to fill it
          const threshold = artist ? 0.75 : 0.5;
          if (best && bs >= threshold) {
            const dr = await fetch(`https://api.genius.com/songs/${best.result.id}?text_format=plain`,{headers:{"Authorization":`Bearer ${GENIUS_TOKEN}`,"User-Agent":"HitWizard/1.0"}});
            if (dr.ok) {
              const ls = (await dr.json())?.response?.song?.lyrics_state || "";
              if (ls === "complete") {
                geniusUrl = best.result.url;
                lyricsFound = true;
                // NEVER set artist from Genius — Genius matches wrong songs too often
                // Artist comes from oEmbed author_name or title split only
                // Use Genius artwork if Spotify didn't provide one
                if (!artworkUrl && best.result.song_art_image_url) artworkUrl = best.result.song_art_image_url;
              }
            }
          }
        }
      } catch(e) { console.warn("Genius:", e.message); }
    }

    return new Response(JSON.stringify({
      songTitle, artist, artworkUrl,
      geniusUrl, lyricsFound,
      fetchedReal,
      platform: "spotify",
      confidence: "medium",
      note: "Title and artwork from Spotify oEmbed. Add genre/mood manually."
    }), { status: 200, headers });

  } catch (err) {
    console.error("Spotify proxy error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/spotify-fetch" };
