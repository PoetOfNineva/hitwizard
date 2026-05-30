export default async function(request, context) {
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
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured." }), { status: 500, headers });
    }

    const requestBody = await request.json();

    const payload = {
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: requestBody.system || "",
      messages: requestBody.messages || []
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.text();
    return new Response(data, { status: response.status, headers });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Something went wrong." }),
      { status: 500, headers }
    );
  }
}
