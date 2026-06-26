// HitWizard — Spotify Metadata Edge Function
// Server-side: Client Credentials flow — no Premium needed
// Fetches: title, artist, genre, BPM, key, energy, mood, artwork

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
      return new Response(JSON.stringify({ error: "Track not found on Spotify" }), { status: 404, headers });
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
      platform:     "spotify",
      geniusUrl:    "",
      lyricsFound:  false
    };


    // ── Genius: lyrics URL only — never sets artist ──
    const GENIUS_TOKEN = Deno.env.get("GENIUS_ACCESS_TOKEN");
    if (GENIUS_TOKEN && result.songTitle && result.artist) {
      try {
        const gQuery = encodeURIComponent(result.songTitle + " " + result.artist);
        const gResp = await fetch("https://api.genius.com/search?q=" + gQuery, {
          headers: { "Authorization": "Bearer " + GENIUS_TOKEN, "User-Agent": "HitWizard/1.0" }
        });
        if (gResp.ok) {
          const gData = await gResp.json();
          const hits = gData.response ? gData.response.hits || [] : [];
          let best = null, bestScore = 0;
          const tc = result.songTitle.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
          const ac = result.artist.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
          for (let h = 0; h < hits.length; h++) {
            const ht = (hits[h].result.title || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
            const ha = (hits[h].result.primary_artist.name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
            const ts = ht === tc ? 1 : (ht.indexOf(tc) >= 0 || tc.indexOf(ht) >= 0) ? 0.8 : 0;
            const as = ha === ac ? 1 : ac.length > 0 && ha.indexOf(ac.split(" ")[0]) >= 0 ? 0.7 : 0;
            const sc = ts * 0.65 + as * 0.35;
            if (sc > bestScore) { bestScore = sc; best = hits[h]; }
          }
          if (best && bestScore >= 0.75) {
            const dr = await fetch("https://api.genius.com/songs/" + best.result.id + "?text_format=plain", {
              headers: { "Authorization": "Bearer " + GENIUS_TOKEN, "User-Agent": "HitWizard/1.0" }
            });
            if (dr.ok) {
              const drData = await dr.json();
              const ls = drData.response && drData.response.song ? drData.response.song.lyrics_state : "";
              if (ls === "complete") {
                result.geniusUrl = best.result.url;
                result.lyricsFound = true;
              }
            }
          }
        }
      } catch (gErr) {
        console.warn("Genius error:", gErr.message);
      }
    }

    return new Response(JSON.stringify(result), { status: 200, headers });

  } catch (err) {
    console.error("Spotify fetch error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/spotify-fetch" };
