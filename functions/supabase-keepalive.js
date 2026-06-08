// HitWizard — Supabase Keep-Alive Scheduled Function
// Runs every 3 days via Netlify scheduled functions
// Prevents Supabase free tier from pausing due to inactivity
// Supabase pauses after 7 days — we ping every 3 days = always safe

const { schedule } = require("@netlify/functions");

const handler = async (event) => {
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://vklwiqbglmhyjuenysal.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_KEY) {
    console.error("Keep-alive: SUPABASE_SERVICE_ROLE_KEY not set");
    return { statusCode: 500, body: "Missing key" };
  }

  try {
    // Simple SELECT ping — just reads one row from profiles table
    // This counts as "activity" and resets the inactivity timer
    const pingResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (pingResp.ok) {
      const timestamp = new Date().toISOString();
      console.log(`✅ Supabase keep-alive ping successful at ${timestamp}`);
      console.log(`Status: ${pingResp.status}`);
      
      // Also ping the characters table
      const charPing = await fetch(`${SUPABASE_URL}/rest/v1/characters?select=id&limit=1`, {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      });
      console.log(`Characters table ping: ${charPing.status}`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          timestamp,
          message: "Supabase keep-alive successful — project stays active"
        })
      };
    } else {
      const errText = await pingResp.text();
      console.error(`Keep-alive ping failed: ${pingResp.status} — ${errText}`);
      return {
        statusCode: pingResp.status,
        body: JSON.stringify({ success: false, error: errText })
      };
    }
  } catch (err) {
    console.error("Keep-alive error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};

// Run every 3 days at 9am UTC
// Cron: "0 9 */3 * *" = minute 0, hour 9, every 3rd day, any month, any weekday
module.exports.handler = schedule("0 9 */3 * *", handler);
