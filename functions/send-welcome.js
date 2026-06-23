// HitWizard — Welcome Email Netlify Function
// Triggered on new user signup via Supabase Auth webhook
// Sends branded welcome email from hitwizard.ai@gmail.com via Resend

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return { statusCode: 500, body: JSON.stringify({ error: "Email service not configured" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { email, name, type } = body;

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email required" }) };
    }

    const displayName = name || email.split("@")[0] || "Captain";

    // Welcome email HTML
    const welcomeHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to HitWizard</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:13px;font-weight:700;letter-spacing:3px;color:#FFB800;text-transform:uppercase;margin-bottom:8px;">⚡ HITWIZARD</div>
    <div style="font-size:11px;color:#666680;letter-spacing:2px;text-transform:uppercase;">AI Music Marketing</div>
  </div>

  <!-- Hero -->
  <div style="background:#13131a;border:1px solid rgba(255,184,0,.2);border-radius:16px;padding:40px;margin-bottom:24px;text-align:center;">
    <div style="font-size:28px;font-weight:900;color:#ffffff;margin-bottom:12px;line-height:1.2;">
      Your forge is ready,<br>
      <span style="color:#FFB800;">${displayName}.</span>
    </div>
    <div style="font-size:15px;color:#9999bb;line-height:1.6;margin-bottom:28px;">
      You just joined the platform built for artists who refuse to be ordinary.
      Every weapon is loaded. Your lyrics are the ammunition.
    </div>
    <a href="https://hitwizardai.com" style="display:inline-block;background:#FFB800;color:#000000;font-weight:800;font-size:15px;padding:16px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;">
      ⚡ Launch Your First Campaign →
    </a>
  </div>

  <!-- Weapons -->
  <div style="background:#13131a;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:32px;margin-bottom:24px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#666680;text-transform:uppercase;margin-bottom:20px;">YOUR ARSENAL</div>

    ${[
      ["⚡", "Campaign Launcher", "Generate Meta, TikTok & YouTube ad campaigns from your actual lyrics. Not generic copy — your words, your story."],
      ["🎯", "Playlist Strike", "Pitch Spotify curators with emails written specifically for your song's genre and mood."],
      ["🎬", "Video Engine", "Shot-by-shot video prompts for your entire song — with your characters automatically included."],
      ["🧬", "Character Vault", "Save your visual characters once. Their DNA auto-injects into every video prompt forever."],
      ["🪝", "Hook Lab", "Multiple TikTok/Reel hooks written from your actual lyrics. The one that stops the scroll is in there."],
      ["📋", "EPK Generator", "Professional Electronic Press Kit ready to send to labels, blogs and press in seconds."]
    ].map(([icon, title, desc]) => `
      <div style="display:flex;gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,.05);">
        <div style="font-size:24px;flex-shrink:0;width:32px;">${icon}</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:4px;">${title}</div>
          <div style="font-size:13px;color:#666680;line-height:1.5;">${desc}</div>
        </div>
      </div>
    `).join("")}

    <div style="text-align:center;margin-top:8px;">
      <a href="https://hitwizardai.com" style="display:inline-block;background:rgba(255,184,0,.1);border:1px solid rgba(255,184,0,.3);color:#FFB800;font-weight:700;font-size:14px;padding:13px 32px;border-radius:10px;text-decoration:none;">
        Start With Autopilot — Paste Your Song Link →
      </a>
    </div>
  </div>

  <!-- How to start -->
  <div style="background:#13131a;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:32px;margin-bottom:24px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#666680;text-transform:uppercase;margin-bottom:20px;">HOW TO START IN 60 SECONDS</div>
    ${[
      ["1", "#FFB800", "Paste your Spotify, Apple Music, YouTube or SoundCloud link into Autopilot Mode"],
      ["2", "#00E599", "Hit Fetch Song — we pull your title, genre, mood, BPM and find your lyrics automatically"],
      ["3", "#9B4FDE", "Click Load & Fill All Fields — AI researches and fills in everything"],
      ["4", "#FF4466", "Hit Build My Campaign — your full ad campaign generates in seconds"]
    ].map(([num, color, text]) => `
      <div style="display:flex;gap:16px;margin-bottom:16px;align-items:flex-start;">
        <div style="width:28px;height:28px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#000;flex-shrink:0;">${num}</div>
        <div style="font-size:14px;color:#9999bb;line-height:1.5;padding-top:4px;">${text}</div>
      </div>
    `).join("")}
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:20px 0;">
    <div style="font-size:12px;color:#444466;line-height:1.8;">
      You're on the <strong style="color:#FFB800;">Free tier</strong> — no credit card needed to start.<br>
      Questions? Reply to this email — we read every one.<br><br>
      <span style="color:#333355;">HitWizard · AI Music Marketing · hitwizardai.com</span>
    </div>
  </div>

</div>
</body>
</html>`;

    // Send via Resend
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "HitWizard <onboarding@hitwizardai.com>",
        to: [email],
        subject: `⚡ Your forge is ready, ${displayName} — here's how to launch your first campaign`,
        html: welcomeHtml,
        reply_to: "hitwizard.ai@gmail.com"
      })
    });

    const result = await resp.json();

    if (!resp.ok) {
      console.error("Resend error:", result);
      return { statusCode: resp.status, body: JSON.stringify({ error: result }) };
    }

    // Also notify admin at hitwizard.ai@gmail.com about new signup
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "HitWizard Alerts <onboarding@hitwizardai.com>",
        to: ["hitwizard.ai@gmail.com"],
        subject: `🏴‍☠️ New sailor aboard — ${email} just joined HitWizard`,
        html: `<div style="font-family:monospace;padding:20px;background:#0a0a0f;color:#FFB800;">
          <h2 style="color:#FFB800;">⚡ New Signup</h2>
          <p style="color:#fff;">Email: <strong>${email}</strong></p>
          <p style="color:#fff;">Name: ${name || "Not provided"}</p>
          <p style="color:#fff;">Time: ${new Date().toISOString()}</p>
          <p style="color:#fff;">Provider: ${type || "email"}</p>
          <br>
          <a href="https://hitwizardai.com/admin" style="color:#FFB800;">View Command Bridge →</a>
        </div>`
      })
    });

    console.log("Welcome email sent to:", email);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: result.id })
    };

  } catch (e) {
    console.error("Welcome email error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
