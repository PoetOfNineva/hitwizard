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
    return new Response(
      JSON.stringify({ error: "POST request required." }),
      { status: 405, headers }
    );
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured." }),
        { status: 500, headers }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body." }),
        { status: 400, headers }
      );
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
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
      JSON.stringify({ error: err.message || "Something went wrong." }),
      { status: 500, headers }
    );
  }
};

export const config = { path: "/api/claude" };
