// HitWizard — YouTube Metadata Edge Function
// Fetches real video title, channel, description, thumbnail from YouTube Data API v3
// Then searches Genius for lyrics automatically

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
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    const GENIUS_TOKEN    = Deno.env.get("GENIUS_ACCESS_TOKEN");

    if (!YOUTUBE_API_KEY) {
      return new Response(JSON.stringify({ error: "YouTube API key not configured" }), { status: 500, headers });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: "No URL provided" }), { status: 400, headers });
    }

    // ── Extract Video ID ──
    const videoId = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Not a valid YouTube URL" }), { status: 400, headers });
    }

    // ── Fetch Video Details ──
    const ytUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${YOUTUBE_API_KEY}`;
    const ytResp = await fetch(ytUrl, {
      headers: {
        "Referer": "https://hitwizardai.com",
        "Origin": "https://hitwizardai.com"
      }
    });

    if (!ytResp.ok) {
      const errText = await ytResp.text();
      console.error("YouTube API error:", ytResp.status, errText.substring(0, 200));
      return new Response(JSON.stringify({
        error: "YouTube API request failed",
        status: ytResp.status,
        detail: errText.substring(0, 200)
      }), { status: 502, headers });
    }

    const ytData = await ytResp.json();
    const video  = ytData.items?.[0];

    if (!video) {
      return new Response(JSON.stringify({ error: "Video not found" }), { status: 404, headers });
    }

    const snippet     = video.snippet || {};
    const statistics  = video.statistics || {};

    // ── Parse Title — extract song name and artist ──
    // Common YouTube title formats:
    // "Artist - Song Title (Official Video)"
    // "Song Title - Artist [Official Audio]"
    // "Artist: Song Title"
    const rawTitle    = snippet.title || "";
    const channelName = snippet.channelTitle || "";

    let songTitle = rawTitle;
    let artist    = channelName;

    // Try to parse "Artist - Song" or "Song - Artist" format
    const dashMatch = rawTitle.match(/^(.+?)\s*[-–—]\s*(.+?)(?:\s*[\(\[].+)?$/);
    if (dashMatch) {
      // Heuristic: if channel name matches first part, first part is artist
      const part1 = dashMatch[1].trim();
      const part2 = dashMatch[2].trim();
      if (channelName.toLowerCase().includes(part1.toLowerCase()) ||
          part1.toLowerCase().includes(channelName.toLowerCase().split(" ")[0])) {
        artist    = part1;
        songTitle = part2;
      } else {
        songTitle = part1;
        artist    = part2;
      }
    }

    // Clean up common YouTube suffixes
    songTitle = songTitle
      .replace(/\s*[\(\[](official\s*(music\s*)?video|official\s*lyric\s*video|official\s*audio|official\s*visualizer|lyric\s*video|lyrics\s*video|lyrics|audio|hd|4k|mv|visualizer|animated|live|acoustic|cover|remix|karaoke|instrumental)[^\)\]]*[\)\]]/gi, "")
      .replace(/\s*[\(\[](feat\.?|ft\.?)[^\)\]]+[\)\]]/gi, "")
      .replace(/\s*(official\s*lyric\s*video|official\s*music\s*video|official\s*video|official\s*audio|lyric\s*video|lyrics\s*video)$/gi, "")
      .trim();

    // ── Get thumbnail ──
    const thumbnail = snippet.thumbnails?.maxres?.url ||
                      snippet.thumbnails?.high?.url ||
                      snippet.thumbnails?.medium?.url ||
                      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // ── Duration parsing ──
    let durationSecs = null;
    const dur = video.contentDetails?.duration;
    if (dur) {
      const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (m) durationSecs = (parseInt(m[1]||0)*3600) + (parseInt(m[2]||0)*60) + parseInt(m[3]||0);
    }

    // ── Search Genius for lyrics — strict matching only ──
    let geniusUrl   = "";
    let lyricsFound = false;
    if (GENIUS_TOKEN && songTitle) {
      try {
        const query = encodeURIComponent(`${songTitle} ${artist}`);
        const gResp = await fetch(`https://api.genius.com/search?q=${query}`, {
          headers: { "Authorization": `Bearer ${GENIUS_TOKEN}`, "User-Agent": "HitWizard/1.0" }
        });
        if (gResp.ok) {
          const gData = await gResp.json();
          const hits  = gData?.response?.hits || [];

          // Similarity scorer
          const sim = (a, b) => {
            a = (a||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();
            b = (b||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();
            if (a === b) return 1;
            if (!a || !b) return 0;
            const long = a.length > b.length ? a : b;
            const short = a.length > b.length ? b : a;
            let m = 0, si = 0;
            for (let i = 0; i < long.length && si < short.length; i++) {
              if (long[i] === short[si]) { m++; si++; }
            }
            return m / long.length;
          };

          const cleanTitle = songTitle.replace(/\s*[\(\[].*?[\)\]]/g,"").trim();
          let best = null, bestScore = 0;
          for (const hit of hits) {
            const ht = hit.result?.title || "";
            const ha = hit.result?.primary_artist?.name || "";
            const titleScore = Math.max(sim(cleanTitle, ht), sim(cleanTitle, ht.replace(/\s*[\(\[].*?[\)\]]/g,"")));
            const artistScore = artist ? Math.max(sim(artist, ha), sim(artist.split(" ")[0], ha.split(" ")[0])) : 0.5;
            const score = titleScore * 0.65 + artistScore * 0.35;
            if (score > bestScore) { bestScore = score; best = hit; }
          }

          // Only use if 75%+ confidence AND lyrics are complete on Genius
          if (best && bestScore >= 0.75) {
            const songId = best.result?.id;
            if (songId) {
              const detailResp = await fetch(`https://api.genius.com/songs/${songId}?text_format=plain`, {
                headers: { "Authorization": `Bearer ${GENIUS_TOKEN}`, "User-Agent": "HitWizard/1.0" }
              });
              if (detailResp.ok) {
                const detail = await detailResp.json();
                const lyricsState = detail?.response?.song?.lyrics_state || "";
                if (lyricsState === "complete") {
                  geniusUrl = best.result.url;
                  lyricsFound = true;
                }
              }
            }
          }
        }
      } catch(e) { console.warn("Genius search:", e.message); }
    }

    return new Response(JSON.stringify({
      songTitle,
      artist,
      artworkUrl:   thumbnail,
      description:  snippet.description?.substring(0, 500) || "",
      viewCount:    statistics.viewCount || 0,
      likeCount:    statistics.likeCount || 0,
      publishedAt:  snippet.publishedAt || "",
      duration:     durationSecs,
      videoId,
      youtubeUrl:   `https://www.youtube.com/watch?v=${videoId}`,
      geniusUrl,
      lyricsFound,
      fetchedReal:  true,
      platform:     "youtube",
      // Note: YouTube doesn't provide BPM/key/mood — use Spotify for audio features
      genre:        "",
      mood:         "",
      bpm:          null,
      key:          "",
      energy:       "",
      confidence:   "medium"
    }), { status: 200, headers });

  } catch (err) {
    console.error("YouTube fetch error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/youtube-fetch" };
