const https = require("https");

exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "API key not configured on server." }) };
    }

    const requestBody = JSON.parse(event.body);

    const payload = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: requestBody.system || "",
      messages: requestBody.messages || []
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
      });

      req.on("error", (err) => reject(err));
      req.setTimeout(50000, () => { req.destroy(); reject(new Error("Request timed out")); });
      req.write(payload);
      req.end();
    });

    return { statusCode: result.statusCode, headers, body: result.body };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Something went wrong. Please try again." })
    };
  }
};
