// HitWizard — Spotify Metadata Edge Function
// oEmbed for title/artwork + Genius for lyrics + AI inference for genre/mood/BPM/key

export default async function handler(request, context) {
  const headers = {
    "Access-Control-Allow-Origin": "https://hitwizardai.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    const GENIUS_TOKEN  = Deno.env.get("GENIUS_ACCESS_TOKEN");
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: "No URL provided" }), { status: 400, headers });
    }

    const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
    if (!trackMatch) {
      return new Response(JSON.stringify({ error: "Not a valid Spotify track URL" }), { status: 400, headers });
    }
    const trackId = trackMatch[1];

    // ── STEP 1: Spotify oEmbed — title, artist (when available), artwork ──
    let songTitle = "";
    let artist = "";
    let artworkUrl = "";

    try {
      const oembedUrl = "https://open.spotify.com/oembed?url=https://open.spotify.com/track/" + trackId;
      const oResp = await fetch(oembedUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
      });
      if (oResp.ok) {
        const oData = await oResp.json();
        const title = oData.title || "";
        artworkUrl = oData.thumbnail_url || "";
        if (title.includes(" · ")) {
          songTitle = title.split(" · ")[0].trim();
          artist = title.split(" · ").slice(1).join(" · ").trim();
        } else if (title.includes(" - ")) {
          songTitle = title.split(" - ")[0].trim();
          artist = title.split(" - ").slice(1).join(" - ").trim();
        } else {
          songTitle = title;
        }
      }
    } catch(e) {
      console.warn("Spotify oEmbed failed:", e.message);
    }

    // ── STEP 2: Genius — find artist when oEmbed didn't return one ──
    let geniusUrl = "";
    let lyricsFound = false;
    if (GENIUS_TOKEN && songTitle) {
      try {
        const query = encodeURIComponent(songTitle + (artist ? " " + artist : ""));
        const gResp = await fetch("https://api.genius.com/search?q=" + query, {
          headers: { "Authorization": "Bearer " + GENIUS_TOKEN, "User-Agent": "HitWizard/1.0" }
        });
        if (gResp.ok) {
          const gData = await gResp.json();
          const hits = gData.response ? gData.response.hits || [] : [];
          let best = null;
          let bestScore = 0;
          const tc = songTitle.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
          for (let h = 0; h < hits.length; h++) {
            const ht = (hits[h].result.title || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
            const ha = (hits[h].result.primary_artist.name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
            const ts = ht === tc ? 1 : ht.indexOf(tc) >= 0 || tc.indexOf(ht) >= 0 ? 0.8 : 0;
            const ac = artist.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
            const as2 = ac && ha ? (ha === ac ? 1 : ha.indexOf(ac.split(" ")[0]) >= 0 ? 0.7 : 0) : 0;
            const sc = ts * 0.65 + as2 * 0.35;
            if (sc > bestScore) { bestScore = sc; best = hits[h]; }
          }
          // Require higher confidence when artist unknown to avoid wrong Genius matches
          if (best && bestScore >= (artist ? 0.75 : 0.9)) {
            geniusUrl = best.result.url;
            lyricsFound = true;
            // Never fill artist from Genius — causes wrong names for indie artists not in DB
          }
        }
      } catch(e) { console.warn("Genius:", e.message); }
    }

    // ── STEP 3: AI infers genre/mood/BPM/key from song knowledge ──
    let genre = "";
    let mood = "";
    let bpm = null;
    let energy = "";
    let key = "";

    if (ANTHROPIC_KEY && songTitle && artist) {
      try {
        const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 200,
            messages: [{
              role: "user",
              content: "You are a music expert. For the song \"" + songTitle + "\" by " + artist + ", provide your best estimate of the musical characteristics. Return ONLY valid JSON with no explanation:\n{\"genre\":\"\",\"mood\":\"\",\"bpm\":0,\"energy\":\"Low/Medium/High\",\"key\":\"\"}\nIf you do not know the song, use empty strings and 0 for bpm."
            }]
          })
        });
        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const text = aiData.content && aiData.content[0] ? aiData.content[0].text || "" : "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              genre  = parsed.genre  || "";
              mood   = parsed.mood   || "";
              bpm    = parsed.bpm    || null;
              energy = parsed.energy || "";
              key    = parsed.key    || "";
            } catch(pe) { console.warn("AI JSON parse:", pe.message); }
          }
        }
      } catch(e) { console.warn("AI inference:", e.message); }
    }

    if (!songTitle) {
      return new Response(JSON.stringify({
        error: "Could not fetch song from Spotify",
        hint: "Try an Apple Music or YouTube link for better results"
      }), { status: 404, headers });
    }

    return new Response(JSON.stringify({
      songTitle:   songTitle,
      artist:      artist,
      artworkUrl:  artworkUrl,
      genre:       genre,
      mood:        mood,
      bpm:         bpm,
      energy:      energy,
      key:         key,
      geniusUrl:   geniusUrl,
      lyricsFound: lyricsFound,
      fetchedReal: true,
      platform:    "spotify",
      confidence:  genre ? "medium" : "low"
    }), { status: 200, headers });

  } catch (err) {
    console.error("Spotify fetch error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/spotify-fetch" };
