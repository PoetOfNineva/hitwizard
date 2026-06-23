// HitWizard — Delete Account Netlify Function
// Deletes the Supabase Auth user record using service role key (server-side only)
// Called after all user table data has already been deleted client-side

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server config missing" }) };
  }

  try {
    const { userId } = JSON.parse(event.body);
    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: "userId required" }) };
    }

    // Use Supabase Admin API to delete the auth user
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Delete user error:", err);
      return { statusCode: resp.status, body: JSON.stringify({ error: err }) };
    }

    console.log(`Account deleted: ${userId}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Account permanently deleted" })
    };
  } catch (e) {
    console.error("Delete account error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
