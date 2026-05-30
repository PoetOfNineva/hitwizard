export default async (request, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    // Deno runtime - use Deno.env.get for environment variables
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured on server." }),
        { status: 500, headers }
      );
    }

    const body = await request.json();

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: body.system || "",
        messages: body.messages || []
      })
    });

    const responseText = await anthropicResponse.text();

    return new Response(responseText, {
      status: anthropicResponse.status,
      headers
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Something went wrong. Please try again." }),
      { status: 500, headers }
    );
  }
};

export const config = { path: "/api/claude" };
