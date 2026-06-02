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
    let best = hits[0];
    for (const hit of hits) {
      const hitTitle = hit.result?.title?.toLowerCase() || "";
      const hitArtist = hit.result?.primary_artist?.name?.toLowerCase() || "";
      const searchTitle = songTitle.toLowerCase();
      const searchArtist = (artist || "").toLowerCase();
      if (hitTitle.includes(searchTitle) || searchTitle.includes(hitTitle)) {
        if (!searchArtist || hitArtist.includes(searchArtist) || searchArtist.includes(hitArtist)) {
          best = hit;
          break;
        }
      }
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

    return new Response(JSON.stringify({
      found: true,
      songTitle:    song.title || "",
      artist:       song.primary_artist?.name || "",
      artworkUrl:   song.song_art_image_url || song.header_image_url || "",
      geniusUrl:    song.url || "",
      songId:       song.id,
      description:  description,
      lyricsState:  lyricsState,
      // Note: Genius API doesn't return raw lyrics text — only the URL
      // Users must visit the URL or we use the description as lyric hint
      message: lyricsState === "complete" 
        ? `Lyrics found on Genius. Visit: ${song.url}`
        : "Partial lyrics available on Genius"
    }), { status: 200, headers });

  } catch (err) {
    console.error("Genius fetch error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/genius-fetch" };
