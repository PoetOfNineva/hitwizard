// HitWizard — Genius Lyrics Edge Function
// Searches Genius for a song and returns lyrics + metadata
// No scraping needed — Genius API returns song URL + metadata

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
    const ACCESS_TOKEN = Deno.env.get("GENIUS_ACCESS_TOKEN");

    if (!ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "Genius token not configured" }), { status: 500, headers });
    }

    const body = await request.json();
    const { songTitle, artist } = body;

    if (!songTitle) {
      return new Response(JSON.stringify({ error: "Song title required" }), { status: 400, headers });
    }

    // ── Search Genius for the song ──
    const query = encodeURIComponent(`${songTitle} ${artist || ""}`);
    const searchResp = await fetch(`https://api.genius.com/search?q=${query}`, {
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "User-Agent": "HitWizard/1.0"
      }
    });

    if (!searchResp.ok) {
      return new Response(JSON.stringify({ error: "Genius search failed" }), { status: 502, headers });
    }

    const searchData = await searchResp.json();
    const hits = searchData?.response?.hits || [];

    if (!hits.length) {
      return new Response(JSON.stringify({ 
        found: false, 
        message: "Song not found on Genius — paste lyrics manually" 
      }), { status: 200, headers });
    }

    // Find best match — prefer exact title match
    let best = null;
    const searchTitle = songTitle.toLowerCase().trim();
    const searchArtist = (artist || "").toLowerCase().trim();

    for (const hit of hits) {
      const hitTitle = (hit.result?.title || "").toLowerCase().trim();
      const hitArtist = (hit.result?.primary_artist?.name || "").toLowerCase().trim();

      // Require STRONG title match — not just substring
      const titleMatch = hitTitle === searchTitle ||
        hitTitle.includes(searchTitle) && searchTitle.length > 4 ||
        searchTitle.includes(hitTitle) && hitTitle.length > 4;

      const artistMatch = !searchArtist ||
        hitArtist.includes(searchArtist.split(" ")[0]) ||
        searchArtist.includes(hitArtist.split(" ")[0]);

      if (titleMatch && artistMatch) {
        best = hit;
        break;
      }
    }

    // No confident match found — don't return a wrong link
    if (!best) {
      return new Response(JSON.stringify({
        found: false,
        message: "Lyrics not found on Genius — please paste your lyrics manually below"
      }), { status: 200, headers });
    }

    const song = best.result;

    // ── Get full song details including description ──
    const songResp = await fetch(`https://api.genius.com/songs/${song.id}?text_format=plain`, {
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "User-Agent": "HitWizard/1.0"
      }
    });

    let description = "";
    let lyricsState = "";
    if (songResp.ok) {
      const songData = await songResp.json();
      const fullSong = songData?.response?.song;
      description = fullSong?.description?.plain || "";
      lyricsState = fullSong?.lyrics_state || "";
    }

    // Only report lyrics found if state is complete
    const lyricsComplete = lyricsState === "complete";

    return new Response(JSON.stringify({
      found: lyricsComplete,
      songTitle:    song.title || "",
      artist:       song.primary_artist?.name || "",
      artworkUrl:   song.song_art_image_url || song.header_image_url || "",
      geniusUrl:    lyricsComplete ? (song.url || "") : "",
      songId:       song.id,
      description:  description,
      lyricsState:  lyricsState,
      message: lyricsComplete
        ? `Lyrics found on Genius — click to copy them, then paste below`
        : "This song's lyrics aren't on Genius yet — please paste your lyrics manually below"
    }), { status: 200, headers });

  } catch (err) {
    console.error("Genius fetch error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/genius-fetch" };
