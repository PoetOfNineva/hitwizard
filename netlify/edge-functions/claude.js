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

    // Test with absolute minimum payload
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }]
      })
    });

    const responseText = await anthropicResponse.text();

    // Return EVERYTHING so we can see what Anthropic says
    return new Response(
      JSON.stringify({
        status: anthropicResponse.status,
        statusText: anthropicResponse.statusText,
        body: responseText,
        keyPrefix: apiKey ? apiKey.substring(0, 20) + "..." : "NO KEY"
      }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ caught: err.message }),
      { status: 200, headers }
    );
  }
};

export const config = { path: "/api/claude" };
