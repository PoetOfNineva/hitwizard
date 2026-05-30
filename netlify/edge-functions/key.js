export default async function(request, context) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
  return new Response(apiKey, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "text/plain"
    }
  });
}
