// HitWizard — Admin Dashboard Netlify Function
// Military-grade: requires admin secret header — never accessible publicly
// Returns full platform stats: users, usage, revenue, signups

exports.handler = async (event) => {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  const provided = event.headers["x-admin-secret"];

  if (!ADMIN_SECRET || provided !== ADMIN_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server config missing" }) };
  }

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
  };

  try {
    // Fetch all data in parallel
    const [usersResp, historyResp, profilesResp, usageResp, campaignsResp] = await Promise.all([
      // Auth users via Admin API
      fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=500`, { headers }),
      // History entries
      fetch(`${SUPABASE_URL}/rest/v1/history?select=user_id,type,created_at&order=created_at.desc&limit=100`, { headers }),
      // Profiles with tier info
      fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,email,tier,created_at`, { headers }),
      // Usage logs
      fetch(`${SUPABASE_URL}/rest/v1/usage_logs?select=user_id,action,created_at&order=created_at.desc&limit=500`, { headers }),
      // Campaign tracking
      fetch(`${SUPABASE_URL}/rest/v1/campaign_tracking?select=user_id,song_title,platform,budget_spent,created_at&order=created_at.desc`, { headers })
    ]);

    const [authData, history, profiles, usage, campaigns] = await Promise.all([
      usersResp.json(),
      historyResp.json(),
      profilesResp.json(),
      usageResp.json(),
      campaignsResp.json()
    ]);

    const users = authData.users || [];

    // Build enriched user list
    const profileMap = {};
    if (Array.isArray(profiles)) {
      profiles.forEach(p => { profileMap[p.id] = p; });
    }

    const enrichedUsers = users.map(u => {
      const profile = profileMap[u.id] || {};
      const userHistory = Array.isArray(history) ? history.filter(h => h.user_id === u.id) : [];
      const userUsage = Array.isArray(usage) ? usage.filter(g => g.user_id === u.id) : [];
      return {
        id: u.id,
        email: u.email,
        name: profile.full_name || u.user_metadata?.full_name || "-",
        provider: u.app_metadata?.provider || "email",
        tier: profile.tier || "free",
        confirmed: u.email_confirmed_at ? true : false,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
        generations: userHistory.length,
        usageActions: userUsage.length
      };
    });

    // Platform stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last7 = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const newToday = users.filter(u => new Date(u.created_at) >= today).length;
    const newThisWeek = users.filter(u => new Date(u.created_at) >= last7).length;
    const newThisMonth = users.filter(u => new Date(u.created_at) >= thisMonth).length;

    const historyArr = Array.isArray(history) ? history : [];
    const generationsToday = historyArr.filter(h => new Date(h.created_at) >= today).length;
    const generationsWeek = historyArr.filter(h => new Date(h.created_at) >= last7).length;

    // Weapon usage breakdown
    const weaponCounts = {};
    historyArr.forEach(h => {
      weaponCounts[h.type] = (weaponCounts[h.type] || 0) + 1;
    });

    const paidUsers = enrichedUsers.filter(u => u.tier !== "free").length;
    const freeUsers = enrichedUsers.filter(u => u.tier === "free").length;
    const confirmedUsers = enrichedUsers.filter(u => u.confirmed).length;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stats: {
          totalUsers: users.length,
          confirmedUsers,
          paidUsers,
          freeUsers,
          newToday,
          newThisWeek,
          newThisMonth,
          generationsToday,
          generationsWeek,
          totalGenerations: historyArr.length
        },
        weaponBreakdown: weaponCounts,
        users: enrichedUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        recentSignups: enrichedUsers
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10),
        campaigns: Array.isArray(campaigns) ? campaigns : []
      })
    };
  } catch (e) {
    console.error("Admin dashboard error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
