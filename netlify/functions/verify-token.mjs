import { getStore } from "@netlify/blobs";

export default async (request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== "POST") {
    return json({ valid: false, reason: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ valid: false, reason: "Invalid JSON" }, 400);
  }

  const { token, orderId } = body;

  // Must provide either a token or an orderId
  if (!token && !orderId) {
    return json({ valid: false, reason: "Missing token or orderId" }, 400);
  }

  const store = getStore("negotiation-tokens");

  try {
    let tokenData;
    let resolvedToken = token;

    // If we only have an orderId (from the Lemon Squeezy redirect URL),
    // look up the token that was generated for that order
    if (!token && orderId) {
      const orderRecord = await store.get(`order:${orderId}`, { type: "json" });
      if (!orderRecord?.token) {
        return json({ valid: false, reason: "Order not found" });
      }
      resolvedToken = orderRecord.token;
    }

    // Look up the token record
    tokenData = await store.get(resolvedToken, { type: "json" });

    if (!tokenData) {
      return json({ valid: false, reason: "Token not found" });
    }

    // Check expiry
    if (Date.now() > tokenData.expiresAt) {
      return json({ valid: false, reason: "Token expired" });
    }

    // Valid — return the token so the frontend can store it for this session
    return json({
      valid: true,
      token: resolvedToken,
      // Don't return email or other PII to the frontend
    });

  } catch (err) {
    console.error("Token verification error:", err);
    return json({ valid: false, reason: "Verification failed" }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export const config = {
  path: "/.netlify/functions/verify-token",
};
