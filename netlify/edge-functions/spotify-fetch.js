// HitWizard — Spotify Fetch Edge Function
// Primary: Spotify Web API (Client Credentials) — full metadata for ALL tracks
// Fallback: oEmbed — title + artwork only

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

    const cleanId = trackId.replace(/[^a-zA-Z0-9]/g, "");

    let songTitle = "";
    let artist = "";
    let artworkUrl = "";
    let releaseDate = "";
    let fetchedReal = false;
    let fetchMethod = "none";

    // ── PRIMARY: Spotify Web API ──
    if (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET) {
      try {
        const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + btoa(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET)
          },
          body: "grant_type=client_credentials"
        });

        if (tokenResp.ok) {
          const tokenJson = await tokenResp.json();
          const accessToken = tokenJson.access_token || "";

          if (accessToken) {
            const trackResp = await fetch(
              "https://api.spotify.com/v1/tracks/" + cleanId + "?market=US",
              { headers: { "Authorization": "Bearer " + accessToken } }
            );

            if (trackResp.ok) {
              const track = await trackResp.json();
              songTitle = track.name || "";
              artist = (track.artists || []).map(function(a) { return a.name; }).join(", ");
              artworkUrl = (track.album && track.album.images && track.album.images[0])
                ? track.album.images[0].url : "";
              releaseDate = (track.album && track.album.release_date) ? track.album.release_date : "";
              fetchedReal = true;
              fetchMethod = "web_api";
              console.log("[spotify-fetch] Web API OK:", songTitle, "by", artist);
            } else {
              console.warn("[spotify-fetch] Track fetch failed:", trackResp.status);
            }
          }
        } else {
          console.warn("[spotify-fetch] Token failed:", tokenResp.status);
        }
      } catch (webApiErr) {
        console.warn("[spotify-fetch] Web API error:", webApiErr.message);
      }
    }

    // ── FALLBACK: oEmbed ──
    if (!fetchedReal) {
      try {
        const oembedUrl = "https://open.spotify.com/oembed?url=https://open.spotify.com/track/" + cleanId;
        const oResp = await fetch(oembedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json"
          }
        });

        if (oResp.ok) {
          const oData = await oResp.json();
          const title = oData.title || "";
          artworkUrl = oData.thumbnail_url || "";
          fetchedReal = true;
          fetchMethod = "oembed";
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
      } catch (oembedErr) {
        console.warn("[spotify-fetch] oEmbed error:", oembedErr.message);
      }
    }

    // ── GENIUS: lyrics URL only — NEVER sets artist ──
    let geniusUrl = "";
    let lyricsFound = false;
    if (GENIUS_TOKEN && songTitle && artist) {
      try {
        const query = encodeURIComponent(songTitle + " " + artist);
        const gResp = await fetch("https://api.genius.com/search?q=" + query, {
          headers: { "Authorization": "Bearer " + GENIUS_TOKEN, "User-Agent": "HitWizard/1.0" }
        });
        if (gResp.ok) {
          const hits = (await gResp.json()).response.hits || [];
          const sim = function(a, b) {
            a = (a || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
            b = (b || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
            if (a === b) return 1;
            if (!a || !b) return 0;
            var lg = a.length > b.length ? a : b;
            var sh = a.length > b.length ? b : a;
            var m = 0, si = 0;
            for (var i = 0; i < lg.length && si < sh.length; i++) {
              if (lg[i] === sh[si]) { m++; si++; }
            }
            return m / lg.length;
          };
          var ct = songTitle.replace(/\s*[\(\[].*?[\)\]]/g, "").trim();
          var best = null;
          var bs = 0;
          for (var h of hits) {
            var ht = h.result.title || "";
            var ha = h.result.primary_artist.name || "";
            var ts = Math.max(sim(ct, ht), sim(ct, ht.replace(/\s*[\(\[].*?[\)\]]/g, "")));
            var as2 = Math.max(sim(artist, ha), sim(artist.split(" ")[0] || "", ha.split(" ")[0] || ""));
            var sc = ts * 0.65 + as2 * 0.35;
            if (sc > bs) { bs = sc; best = h; }
          }
          if (best && bs >= 0.75) {
            var dr = await fetch("https://api.genius.com/songs/" + best.result.id + "?text_format=plain", {
              headers: { "Authorization": "Bearer " + GENIUS_TOKEN, "User-Agent": "HitWizard/1.0" }
            });
            if (dr.ok) {
              var ls = (await dr.json()).response.song.lyrics_state || "";
              if (ls === "complete") {
                geniusUrl = best.result.url;
                lyricsFound = true;
                if (!artworkUrl && best.result.song_art_image_url) {
                  artworkUrl = best.result.song_art_image_url;
                }
              }
            }
          }
        }
      } catch (geniusErr) {
        console.warn("[spotify-fetch] Genius error:", geniusErr.message);
      }
    }

    return new Response(JSON.stringify({
      songTitle: songTitle,
      artist: artist,
      artworkUrl: artworkUrl,
      releaseDate: releaseDate,
      geniusUrl: geniusUrl,
      lyricsFound: lyricsFound,
      fetchedReal: fetchedReal,
      fetchMethod: fetchMethod,
      platform: "spotify",
      confidence: fetchMethod === "web_api" ? "high" : "medium"
    }), { status: 200, headers });

  } catch (err) {
    console.error("[spotify-fetch] Fatal error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/spotify-fetch" };
