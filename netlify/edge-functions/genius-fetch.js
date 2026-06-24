// HitWizard — Genius Lyrics Edge Function
// Returns lyrics URL only when there's a high-confidence title+artist match

export default async function handler(request, context) {
  const headers = {
    "Access-Control-Allow-Origin": "https://hitwizardai.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  const noLyrics = (msg) => new Response(JSON.stringify({
    found: false,
    message: msg || "Lyrics not on Genius — paste your lyrics manually below"
  }), { status: 200, headers });

  try {
    const ACCESS_TOKEN = Deno.env.get("GENIUS_ACCESS_TOKEN");
    if (!ACCESS_TOKEN) return new Response(JSON.stringify({ error: "Genius token not configured" }), { status: 500, headers });

    const body = await request.json();
    const { songTitle, artist } = body;
    if (!songTitle) return new Response(JSON.stringify({ error: "Song title required" }), { status: 400, headers });

    // ── Similarity scorer (0–1) ──
    function similarity(a, b) {
      a = a.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      b = b.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      if (a === b) return 1;
      if (!a || !b) return 0;
      const longer = a.length > b.length ? a : b;
      const shorter = a.length > b.length ? b : a;
      if (longer.length === 0) return 1;
      // Count matching characters in sequence
      let matches = 0;
      let si = 0;
      for (let i = 0; i < longer.length && si < shorter.length; i++) {
        if (longer[i] === shorter[si]) { matches++; si++; }
      }
      return matches / longer.length;
    }

    const query = encodeURIComponent(`${songTitle} ${artist || ""}`);
    const searchResp = await fetch(`https://api.genius.com/search?q=${query}`, {
      headers: { "Authorization": `Bearer ${ACCESS_TOKEN}`, "User-Agent": "HitWizard/1.0" }
    });

    if (!searchResp.ok) return noLyrics("Genius search unavailable — paste your lyrics manually");

    const searchData = await searchResp.json();
    const hits = searchData?.response?.hits || [];
    if (!hits.length) return noLyrics("Song not on Genius — paste your lyrics manually below");

    const cleanTitle = songTitle.replace(/\s*[\(\[].*?[\)\]]/g, "").trim();
    const cleanArtist = (artist || "").trim();

    // Score each hit
    let best = null;
    let bestScore = 0;

    for (const hit of hits) {
      const hitTitle = hit.result?.title || "";
      const hitArtist = hit.result?.primary_artist?.name || "";

      const titleScore = Math.max(
        similarity(cleanTitle, hitTitle),
        similarity(cleanTitle, hitTitle.replace(/\s*[\(\[].*?[\)\]]/g, ""))
      );

      const artistScore = cleanArtist
        ? Math.max(
            similarity(cleanArtist, hitArtist),
            similarity(cleanArtist.split(" ")[0], hitArtist.split(" ")[0])
          )
        : 0.5; // no artist to compare, neutral

      const combined = (titleScore * 0.65) + (artistScore * 0.35);

      if (combined > bestScore) {
        bestScore = combined;
        best = hit;
      }
    }

    // STRICT threshold — must be 75%+ confident
    if (!best || bestScore < 0.75) {
      return noLyrics("Lyrics not found on Genius — paste your lyrics manually below");
    }

    const song = best.result;

    // Get full song details to check lyrics_state
    const songResp = await fetch(`https://api.genius.com/songs/${song.id}?text_format=plain`, {
      headers: { "Authorization": `Bearer ${ACCESS_TOKEN}`, "User-Agent": "HitWizard/1.0" }
    });

    let lyricsState = "";
    if (songResp.ok) {
      const songData = await songResp.json();
      lyricsState = songData?.response?.song?.lyrics_state || "";
    }

    // Only return a link if lyrics are actually complete on Genius
    if (lyricsState !== "complete") {
      return noLyrics("This song's lyrics aren't on Genius yet — paste your lyrics manually below");
    }

    return new Response(JSON.stringify({
      found: true,
      songTitle:  song.title || "",
      artist:     song.primary_artist?.name || "",
      artworkUrl: song.song_art_image_url || song.header_image_url || "",
      geniusUrl:  song.url || "",
      songId:     song.id,
      lyricsState,
      confidence: Math.round(bestScore * 100),
      message:    "Lyrics found on Genius — click to open, copy them, then paste below"
    }), { status: 200, headers });

  } catch (err) {
    console.error("Genius fetch error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/genius-fetch" };
