// HitWizard — Spotify Metadata Edge Function
// Spotify Web API Client Credentials is restricted in Development Mode (Feb 2026)
// Using oEmbed for title/artist + Genius for lyrics + AI inference for audio features

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
    const GENIUS_TOKEN = Deno.env.get("GENIUS_ACCESS_TOKEN");
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: "No URL provided" }), { status: 400, headers });
    }

    // ── Extract Track ID ──
    const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
    if (!trackMatch) {
      return new Response(JSON.stringify({ error: "Not a valid Spotify track URL" }), { status: 400, headers });
    }
    const trackId = trackMatch[1];

    // ── STEP 1: Spotify oEmbed — still works freely ──
    let songTitle = "";
    let artist = "";
    let artworkUrl = "";

    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
      const oResp = await fetch(oembedUrl, {
        headers: { "User-Agent": "HitWizard/1.0" }
      });
      if (oResp.ok) {
        const oData = await oResp.json();
        // oEmbed title format: "Song Title" or "Song Title · Artist"
        const title = oData.title || "";
        if (title.includes(" · ")) {
          const parts = title.split(" · ");
          songTitle = parts[0].trim();
          artist = parts[1].trim();
        } else {
          songTitle = title;
        }
        artworkUrl = oData.thumbnail_url || "";
      }
    } catch(e) {
      console.warn("Spotify oEmbed failed:", e.message);
    }

    // ── STEP 2: Search Genius for lyrics ──
    let geniusUrl = "";
    let lyricsFound = false;
    if (GENIUS_TOKEN && songTitle) {
      try {
        const query = encodeURIComponent(`${songTitle} ${artist}`);
        const gResp = await fetch(`https://api.genius.com/search?q=${query}`, {
          headers: { "Authorization": `Bearer ${GENIUS_TOKEN}`, "User-Agent": "HitWizard/1.0" }
        });
        if (gResp.ok) {
          const gData = await gResp.json();
          const hit = gData?.response?.hits?.[0];
          if (hit) { geniusUrl = hit.result.url; lyricsFound = true; }
        }
      } catch(e) { console.warn("Genius search:", e.message); }
    }

    // ── STEP 3: AI infers genre/mood/BPM from song knowledge ──
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
              content: `You are a music expert. For the song "${songTitle}" by ${artist}, provide your best estimate of the musical characteristics. Return ONLY valid JSON with no explanation:\n{"genre":"","mood":"","bpm":0,"energy":"Low/Medium/High","key":""}\nIf you do not know the song, use empty strings and 0 for bpm.`
            }]
          })
        });
        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const text = aiData.content?.[0]?.text || "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            genre = parsed.genre || "";
            mood = parsed.mood || "";
            bpm = parsed.bpm || null;
            energy = parsed.energy || "";
            key = parsed.key || "";
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
      songTitle,
      artist,
      artworkUrl,
      genre,
      mood,
      bpm,
      energy,
      key,
      geniusUrl,
      lyricsFound,
      fetchedReal: true,
      platform: "spotify",
      confidence: genre ? "medium" : "low",
      note: "Spotify metadata via oEmbed. Genre/mood/BPM inferred by AI."
    }), { status: 200, headers });

  } catch (err) {
    console.error("Spotify fetch error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/spotify-fetch" };


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
    const CLIENT_ID     = Deno.env.get("SPOTIFY_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: "Spotify credentials not configured" }), { status: 500, headers });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: "No URL provided" }), { status: 400, headers });
    }

    // ── STEP 1: Extract Spotify Track ID from URL ──
    const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
    if (!trackMatch) {
      return new Response(JSON.stringify({ error: "Not a valid Spotify track URL" }), { status: 400, headers });
    }
    const trackId = trackMatch[1];

    // ── STEP 2: Get Access Token via Client Credentials ──
    const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(CLIENT_ID + ":" + CLIENT_SECRET)
      },
      body: "grant_type=client_credentials"
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      console.error("Spotify token error:", err);
      return new Response(JSON.stringify({ error: "Failed to authenticate with Spotify" }), { status: 502, headers });
    }

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;

    // ── STEP 3: Fetch Track Metadata ──
    const [trackResp, featuresResp] = await Promise.all([
      fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      }),
      fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      })
    ]);

    if (!trackResp.ok) {
      const errText = await trackResp.text();
      console.error("Spotify track error:", trackResp.status, errText.substring(0,200));
      return new Response(JSON.stringify({ 
        error: "Track not found on Spotify",
        status: trackResp.status,
        detail: errText.substring(0,200)
      }), { status: 404, headers });
    }

    const track    = await trackResp.json();
    const features = featuresResp.ok ? await featuresResp.json() : {};

    // ── STEP 4: Get Artist Genre ──
    let genre = "";
    if (track.artists?.[0]?.id) {
      const artistResp = await fetch(`https://api.spotify.com/v1/artists/${track.artists[0].id}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (artistResp.ok) {
        const artist = await artistResp.json();
        genre = artist.genres?.[0] || "";
        // Capitalise first letter
        if (genre) genre = genre.charAt(0).toUpperCase() + genre.slice(1);
      }
    }

    // ── STEP 5: Map Audio Features to Human-Readable Values ──
    const bpm        = features.tempo ? Math.round(features.tempo) : null;
    const energy     = features.energy != null ? (features.energy >= 0.7 ? "High" : features.energy >= 0.4 ? "Medium" : "Low") : "";
    const valence    = features.valence; // 0-1: higher = more positive/happy
    const mood       = valence != null
      ? valence >= 0.7 ? "Happy / Euphoric"
      : valence >= 0.5 ? "Upbeat / Positive"
      : valence >= 0.3 ? "Neutral / Bittersweet"
      : valence >= 0.15 ? "Melancholic / Sad"
      : "Dark / Intense"
      : "";

    // Musical key mapping
    const KEY_NAMES   = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    const MODE_NAMES  = ["Minor","Major"];
    const musicalKey  = features.key != null && features.key >= 0
      ? KEY_NAMES[features.key] + " " + (MODE_NAMES[features.mode] || "")
      : "";

    const danceability = features.danceability != null
      ? features.danceability >= 0.7 ? "High" : features.danceability >= 0.4 ? "Medium" : "Low"
      : "";

    // ── STEP 6: Build Response ──
    const result = {
      songTitle:    track.name || "",
      artist:       track.artists?.map(a => a.name).join(", ") || "",
      album:        track.album?.name || "",
      artworkUrl:   track.album?.images?.[0]?.url || "",
      artworkSmall: track.album?.images?.[2]?.url || "",
      genre:        genre,
      bpm:          bpm,
      key:          musicalKey,
      energy:       energy,
      mood:         mood,
      danceability: danceability,
      duration:     track.duration_ms ? Math.round(track.duration_ms / 1000) : null,
      explicit:     track.explicit || false,
      popularity:   track.popularity || 0,
      releaseDate:  track.album?.release_date || "",
      spotifyUrl:   track.external_urls?.spotify || url,
      previewUrl:   track.preview_url || null,
      trackId:      trackId,
      fetchedReal:  true,
      platform:     "spotify"
    };

    return new Response(JSON.stringify(result), { status: 200, headers });

  } catch (err) {
    console.error("Spotify fetch error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/spotify-fetch" };
