// HitWizard Stripe Checkout — Edge Function
// Creates Stripe checkout sessions for subscriptions
// Secret key stored in Netlify environment variables — NEVER in code

const PRICE_IDS = {
  artist:     "price_1TdNyoKBLS51rnuVjovYubKC",
  pro_artist: "price_1TdOOiKBLS51rnuVnDyBmUDR",
  manager:    "price_1TdO1wKBLS51rnuVADxaqaqN",
  label:      "price_1TdO3GKBLS51rnuVqtdWjfnB"
};

export default async function handler(request, context) {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "https://hitwizardai.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET) {
      return new Response(JSON.stringify({ error: "Payment system unavailable" }), { status: 500, headers });
    }
    const body = await request.json();
    const { tier, email, userId } = body;

    if (!tier || !PRICE_IDS[tier]) {
      return new Response(JSON.stringify({ error: "Invalid tier" }), { status: 400, headers });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), { status: 400, headers });
    }

    // Create Stripe checkout session
    const params = new URLSearchParams({
      "payment_method_types[]": "card",
      "line_items[0][price]": PRICE_IDS[tier],
      "line_items[0][quantity]": "1",
      "mode": "subscription",
      "success_url": `https://hitwizardai.com?checkout=success&tier=${tier}`,
      "cancel_url": `https://hitwizardai.com?checkout=cancelled`,
      "customer_email": email,
      "metadata[userId]": userId || "",
      "metadata[tier]": tier,
      "allow_promotion_codes": "true",
      "billing_address_collection": "auto"
    });

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const session = await response.json();

    if (session.error) {
      return new Response(JSON.stringify({ error: session.error.message }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error: " + err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/stripe-checkout" };
