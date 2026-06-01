// HitWizard Stripe Webhook — Edge Function
// Listens for Stripe subscription events → updates Supabase user tier
// Military grade: verifies Stripe signature on every request

const TIER_MAP = {
  "price_1TdNyoKBLS51rnuVjovYubKC":  "artist",
  "price_1TdOOiKBLS51rnuVnDyBmUDR":  "pro_artist",
  "price_1TdO1wKBLS51rnuVADxaqaqN":  "manager",
  "price_1TdO3GKBLS51rnuVqtdWjfnB":  "label"
};

const SUPABASE_URL    = "https://vklwiqbglmhyjuenysal.supabase.co";
const SUPABASE_TABLE  = "profiles";

// Verify Stripe webhook signature using Web Crypto API (Deno/Edge compatible)
async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    const parts = sigHeader.split(",");
    const tsPart = parts.find(p => p.startsWith("t="));
    const v1Part = parts.find(p => p.startsWith("v1="));
    if (!tsPart || !v1Part) return false;

    const timestamp  = tsPart.slice(2);
    const signature  = v1Part.slice(3);
    const signedPayload = `${timestamp}.${payload}`;

    const enc     = new TextEncoder();
    const keyData = enc.encode(secret);
    const msgData = enc.encode(signedPayload);

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData,
      { name: "HMAC", hash: "SHA-256" },
      false, ["sign"]
    );

    const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const computed = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison to prevent timing attacks
    if (computed.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// Update user tier in Supabase
async function updateUserTier(userId, tier, stripeCustomerId, stripeSubId, supabaseSecret) {
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${userId}`;

  const body = {
    tier:                 tier,
    stripe_customer_id:   stripeCustomerId,
    stripe_subscription_id: stripeSubId,
    tier_updated_at:      new Date().toISOString()
  };

  const res = await fetch(url, {
    method:  "PATCH",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        supabaseSecret,
      "Authorization": `Bearer ${supabaseSecret}`,
      "Prefer":        "return=minimal"
    },
    body: JSON.stringify(body)
  });

  return res.ok;
}

// Find user by Stripe customer ID (when userId not in metadata)
async function getUserByCustomerId(customerId, supabaseSecret) {
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?stripe_customer_id=eq.${customerId}&select=id`;
  const res = await fetch(url, {
    headers: {
      "apikey":        supabaseSecret,
      "Authorization": `Bearer ${supabaseSecret}`
    }
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0]?.id || null;
}

export default async function handler(request, context) {
  const headers = {
    "Access-Control-Allow-Origin":  "https://hitwizardai.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type":                 "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    const WEBHOOK_SECRET  = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const SUPABASE_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!WEBHOOK_SECRET || !SUPABASE_SECRET) {
      console.error("Missing env: STRIPE_WEBHOOK_SECRET or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers });
    }

    const rawBody   = await request.text();
    const sigHeader = request.headers.get("stripe-signature");

    if (!sigHeader) {
      return new Response(JSON.stringify({ error: "No signature" }), { status: 400, headers });
    }

    // 🛡️ Verify signature — reject anything not from Stripe
    const valid = await verifyStripeSignature(rawBody, sigHeader, WEBHOOK_SECRET);
    if (!valid) {
      console.error("Invalid Stripe signature — possible spoofing attempt");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers });
    }

    const event = JSON.parse(rawBody);
    console.log(`Stripe event: ${event.type}`);

    // Handle subscription lifecycle events
    switch (event.type) {

      // ✅ Payment succeeded — upgrade tier
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "invoice.payment_succeeded": {
        const obj        = event.data.object;
        const subId      = obj.subscription || obj.id;
        const customerId = obj.customer;

        // Get subscription details
        let priceId = null;
        let userId  = null;

        if (obj.object === "subscription") {
          priceId = obj.items?.data?.[0]?.price?.id;
          userId  = obj.metadata?.userId;
        } else if (obj.object === "invoice") {
          priceId = obj.lines?.data?.[0]?.price?.id;
          userId  = obj.metadata?.userId;
        }

        const tier = TIER_MAP[priceId];
        if (!tier) {
          console.log(`Unknown price ID: ${priceId} — skipping`);
          break;
        }

        // Resolve userId
        if (!userId) {
          userId = await getUserByCustomerId(customerId, SUPABASE_SECRET);
        }

        if (!userId) {
          console.error(`Cannot find user for customer: ${customerId}`);
          break;
        }

        const updated = await updateUserTier(userId, tier, customerId, subId, SUPABASE_SECRET);
        console.log(`Tier updated: user=${userId} tier=${tier} success=${updated}`);
        break;
      }

      // ❌ Subscription cancelled / payment failed — downgrade to free
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const obj        = event.data.object;
        const customerId = obj.customer;
        const subId      = obj.subscription || obj.id;

        let userId = obj.metadata?.userId;
        if (!userId) {
          userId = await getUserByCustomerId(customerId, SUPABASE_SECRET);
        }

        if (!userId) {
          console.error(`Cannot find user for customer: ${customerId}`);
          break;
        }

        const updated = await updateUserTier(userId, "free", customerId, subId, SUPABASE_SECRET);
        console.log(`Tier downgraded to free: user=${userId} success=${updated}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Always return 200 to Stripe (prevents retries)
    return new Response(JSON.stringify({ received: true }), { status: 200, headers });

  } catch (err) {
    console.error("Webhook error:", err.message);
    // Still return 200 — don't let Stripe retry on our internal errors
    return new Response(JSON.stringify({ received: true, warning: err.message }), { status: 200, headers });
  }
}

export const config = { path: "/api/stripe-webhook" };
