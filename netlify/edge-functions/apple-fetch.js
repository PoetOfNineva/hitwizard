// HitWizard — Apple Music Metadata Edge Function
// Uses MusicKit JWT (Team ID + Key ID + Private Key) — no user auth needed
// Fetches: title, artist, artwork, genre from Apple Music links

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
    const TEAM_ID    = Deno.env.get("APPLE_TEAM_ID");
    const KEY_ID     = Deno.env.get("APPLE_KEY_ID");
    const PRIVATE_KEY = Deno.env.get("APPLE_PRIVATE_KEY");
    const GENIUS_TOKEN = Deno.env.get("GENIUS_ACCESS_TOKEN");

    if (!TEAM_ID || !KEY_ID || !PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: "Apple credentials not configured" }), { status: 500, headers });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: "No URL provided" }), { status: 400, headers });
    }

    // ── Extract Apple Music IDs from URL ──
    // ?i= is the track ID; the last numeric segment is album ID
    // ?i= = explicit track ID; /song/ path means last numeric ID IS the track; /album/ = album ID
    const trackIdParam = url.match(/[?&]i=(\d+)/)?.[1];
    const isSongPath = /\/song\//.test(url);
    const pathNumericId = url.match(/\/(\d{5,})(?:[?#]|$)/)?.[1];
    const albumPathId = url.match(/\/album\/[^\/]+\/(\d+)/)?.[1];

    const trackId = trackIdParam || (isSongPath ? pathNumericId : null);
    const albumId = !trackId ? albumPathId : null;

    if (!trackId && !albumId) {
      return new Response(JSON.stringify({ error: "Could not extract ID from Apple Music URL" }), { status: 400, headers });
    }

    // ── Generate MusicKit JWT ──
    const token = await generateMusicKitJWT(TEAM_ID, KEY_ID, PRIVATE_KEY);

    // ── Detect storefront from URL ──
    const storefrontMatch = url.match(/music\.apple\.com\/([a-z]{2})\//);
    const storefront = storefrontMatch?.[1] || "us";

    // ── Fetch: track ID -> songs endpoint; album ID -> albums+tracks ──
    let apiUrl;
    if (trackId) {
      apiUrl = `https://api.music.apple.com/v1/catalog/${storefront}/songs/${trackId}`;
    } else {
      apiUrl = `https://api.music.apple.com/v1/catalog/${storefront}/albums/${albumId}?include=tracks`;
    }
    const apiResp = await fetch(apiUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Music-User-Token": "" // Not needed for catalog requests
      }
    });

    if (!apiResp.ok) {
      const errText = await apiResp.text();
      console.error("Apple Music API error:", apiResp.status, errText);
      return new Response(JSON.stringify({
        error: "Apple Music API request failed",
        status: apiResp.status
      }), { status: 502, headers });
    }

    const apiData = await apiResp.json();
    let song = apiData?.data?.[0];

    // If album response, get first track
    if (!trackId && song?.relationships?.tracks?.data?.[0]) {
      song = song.relationships.tracks.data[0];
    }

    if (!song) {
      return new Response(JSON.stringify({ error: "Song not found on Apple Music" }), { status: 404, headers });
    }

    const attrs = song.attributes || {};

    // ── Format artwork URL ──
    const artworkUrl = attrs.artwork
      ? attrs.artwork.url
          .replace("{w}", "1000")
          .replace("{h}", "1000")
      : "";

    // ── Search Genius for lyrics ──
    
    // ── Strict Genius search: 75% similarity + lyrics_state=complete required ──
    const strictGeniusSearch = async (title, artist, token) => {
      try {
        const q = encodeURIComponent(`${title} ${artist||""}`);
        const gr = await fetch(`https://api.genius.com/search?q=${q}`,{headers:{"Authorization":`Bearer ${token}`,"User-Agent":"HitWizard/1.0"}});
        if(!gr.ok)return{geniusUrl:"",lyricsFound:false};
        const hits=(await gr.json())?.response?.hits||[];
        const sim=(a,b)=>{a=(a||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();b=(b||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();if(a===b)return 1;if(!a||!b)return 0;const[lg,sh]=a.length>b.length?[a,b]:[b,a];let m=0,si=0;for(let i=0;i<lg.length&&si<sh.length;i++)if(lg[i]===sh[si]){m++;si++;}return m/lg.length;};
        const ct=(title||"").replace(/\s*[\(\[].*?[\)\]]/g,"").trim();
        let best=null,bs=0;
        for(const h of hits){const ht=h.result?.title||"",ha=h.result?.primary_artist?.name||"";const ts=Math.max(sim(ct,ht),sim(ct,ht.replace(/\s*[\(\[].*?[\)\]]/g,"")));const as=artist?Math.max(sim(artist,ha),sim((artist.split(" ")[0]||""),(ha.split(" ")[0]||""))):0.5;const sc=ts*0.65+as*0.35;if(sc>bs){bs=sc;best=h;}}
        if(!best||bs<0.75)return{geniusUrl:"",lyricsFound:false};
        const dr=await fetch(`https://api.genius.com/songs/${best.result.id}?text_format=plain`,{headers:{"Authorization":`Bearer ${token}`,"User-Agent":"HitWizard/1.0"}});
        if(!dr.ok)return{geniusUrl:"",lyricsFound:false};
        const ls=(await dr.json())?.response?.song?.lyrics_state||"";
        if(ls!=="complete")return{geniusUrl:"",lyricsFound:false};
        return{geniusUrl:best.result.url,lyricsFound:true};
      }catch(e){return{geniusUrl:"",lyricsFound:false};}
    };
    const songTitle = attrs.name || "";
    const artist    = attrs.artistName || "";
    let geniusUrl="",lyricsFound=false;
    if(GENIUS_TOKEN&&songTitle){const gr=await strictGeniusSearch(songTitle,artist,GENIUS_TOKEN);geniusUrl=gr.geniusUrl;lyricsFound=gr.lyricsFound;}


    return new Response(JSON.stringify({
      songTitle:   songTitle,
      artist:      artist,
      album:       attrs.albumName || "",
      genre:       attrs.genreNames?.[0] || "",
      artworkUrl,
      bpm:         attrs.tempo || null,
      key:         attrs.keySignature || "",
      mood:        "",
      energy:      "",
      duration:    attrs.durationInMillis ? Math.round(attrs.durationInMillis / 1000) : null,
      releaseDate: attrs.releaseDate || "",
      isrc:        attrs.isrc || "",
      explicit:    attrs.contentRating === "explicit",
      appleUrl:    url,
      geniusUrl,
      lyricsFound,
      fetchedReal: true,
      platform:    "apple",
      confidence:  "high"
    }), { status: 200, headers });

  } catch (err) {
    console.error("Apple Music fetch error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

// ── Generate MusicKit Developer JWT ──
async function generateMusicKitJWT(teamId, keyId, privateKeyPem) {
  const now     = Math.floor(Date.now() / 1000);
  const payload = { iss: teamId, iat: now, exp: now + 3600 };

  const header  = { alg: "ES256", kid: keyId };

  const enc     = new TextEncoder();
  const b64url  = (obj) => btoa(JSON.stringify(obj))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const sigInput = `${b64url(header)}.${b64url(payload)}`;

  // Import the private key
  const pemBody   = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const keyData   = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    enc.encode(sigInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  return `${sigInput}.${sigB64}`;
}

export const config = { path: "/api/apple-fetch" };
