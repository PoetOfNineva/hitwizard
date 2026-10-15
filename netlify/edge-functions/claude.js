// HitWizard — Claude Proxy Edge Function (SECURE + STREAMING)
// Keeps ANTHROPIC_API_KEY server-side only. Streams response back to client
// so long Sonnet generations don't hit Edge Function execution limits.

// Allowed origins: production + Netlify preview deploys (never wildcard)
const ALLOWED_ORIGINS = [
  "https://hitwizardai.com",
];
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Netlify preview deploys: https://deploy-preview-N--hitwizardai.netlify.app
  if (/^https:\/\/deploy-preview-\d+--hitwizardai\.netlify\.app$/.test(origin)) return true;
  // Netlify branch deploys: https://<branch>--hitwizardai.netlify.app
  if (/^https:\/\/[a-z0-9-]+--hitwizardai\.netlify\.app$/.test(origin)) return true;
  return false;
}

export default async function handler(request, context) {
  const requestOrigin = request.headers.get("origin") || "";
  const corsOrigin = isAllowedOrigin(requestOrigin) ? requestOrigin : "https://hitwizardai.com";

  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (request.method === "OPTIONS") {
    return new Response("", { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured." }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const requestBody = await request.json();

    const payload = {
      model: "claude-sonnet-4-6",
      max_tokens: requestBody.max_tokens || 8000,
      system: requestBody.system || "",
      messages: requestBody.messages || [],
      stream: true
    };

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(errText, {
        status: upstream.status,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    // Stream the SSE response straight through to the client.
    // Each chunk resets the edge function's activity timer, so long
    // generations don't hit the execution timeout.
    return new Response(upstream.body, {
      status: 200,
      headers: { ...headers, "Content-Type": "text/event-stream" }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Something went wrong." }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
}
