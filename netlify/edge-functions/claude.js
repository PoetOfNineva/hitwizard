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

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    // Debug: check if key exists and its format
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "NO API KEY FOUND in environment" }),
        { status: 500, headers }
      );
    }

    if (!apiKey.startsWith("sk-ant-")) {
      return new Response(
        JSON.stringify({ error: `API key format wrong. Starts with: ${apiKey.substring(0, 10)}` }),
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
        max_tokens: 1000,
        system: body.system || "You are a helpful assistant.",
        messages: body.messages || [{ role: "user", content: "Say hello" }]
      })
    });

    const responseText = await anthropicResponse.text();

    // Return full response including status for debugging
    return new Response(
      JSON.stringify({
        anthropicStatus: anthropicResponse.status,
        anthropicResponse: responseText
      }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "CAUGHT ERROR: " + err.message }),
      { status: 500, headers }
    );
  }
};

export const config = { path: "/api/claude" };
