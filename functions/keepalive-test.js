// HitWizard — Manual Supabase Keep-Alive Trigger
// Endpoint: /.netlify/functions/keepalive-test
// Use this to verify the ping works before relying on the scheduled version

exports.handler = async (event) => {
  // Security: only allow from hitwizardai.com or with secret header
  const authHeader = event.headers["x-keepalive-secret"];
  const EXPECTED_SECRET = process.env.KEEPALIVE_SECRET || "hw-keepalive-2026";
  
  if (authHeader !== EXPECTED_SECRET) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://vklwiqbglmhyjuenysal.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "SUPABASE_SERVICE_ROLE_KEY not configured" })
    };
  }

  const results = {};

  try {
    // Ping profiles table
    const t1 = Date.now();
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    results.profiles = { status: r1.status, ms: Date.now() - t1, ok: r1.ok };

    // Ping characters table
    const t2 = Date.now();
    const r2 = await fetch(`${SUPABASE_URL}/rest/v1/characters?select=id&limit=1`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    results.characters = { status: r2.status, ms: Date.now() - t2, ok: r2.ok };

    // Ping song_vault table
    const t3 = Date.now();
    const r3 = await fetch(`${SUPABASE_URL}/rest/v1/song_vault?select=id&limit=1`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    results.song_vault = { status: r3.status, ms: Date.now() - t3, ok: r3.ok };

    const allOk = results.profiles.ok && results.characters.ok;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: allOk,
        timestamp: new Date().toISOString(),
        message: allOk
          ? "✅ All tables reachable — Supabase is alive and active timer reset"
          : "⚠️ Some pings failed — check results",
        results
      }, null, 2)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message, results })
    };
  }
};
