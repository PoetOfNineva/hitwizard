// HitWizard — Click Tracking Edge Function
// POST /api/track-click
// Body: { slug, platform, device }

export default async function handler(request) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    const { slug, platform, device } = await request.json();
    if (!slug) return new Response("Missing slug", { status: 400 });

    // Get smart link id
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/smart_links?slug=eq.${slug}&select=id,user_id,clicks`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const links = await res.json();
    if (!links || links.length === 0) return new Response("Not found", { status: 404 });

    const link = links[0];

    await Promise.all([
      // Increment click count
      fetch(`${SUPABASE_URL}/rest/v1/smart_links?id=eq.${link.id}`, {
        method: "PATCH",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ clicks: (link.clicks || 0) + 1 })
      }),
      // Record click event
      fetch(`${SUPABASE_URL}/rest/v1/link_clicks`, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({
          smart_link_id: link.id,
          user_id: link.user_id,
          platform: platform || "direct",
          device: device || "unknown",
          created_at: new Date().toISOString()
        })
      })
    ]);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export const config = { path: "/api/track-click" };
