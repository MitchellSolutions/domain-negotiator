import { createHmac, timingSafeEqual } from "crypto";
import { getStore } from "@netlify/blobs";

// Token expires after 24 hours
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const expectedProductId = process.env.LEMONSQUEEZY_PRODUCT_ID;

  if (!webhookSecret) {
    console.error("LEMONSQUEEZY_WEBHOOK_SECRET not configured");
    return new Response("Server misconfiguration", { status: 500 });
  }

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Verify Lemon Squeezy signature
  const signature = request.headers.get("x-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  const hmac = createHmac("sha256", webhookSecret);
  hmac.update(rawBody);
  const digest = hmac.digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  const sigBuffer    = Buffer.from(signature, "hex");
  const digestBuffer = Buffer.from(digest,    "hex");

  if (
    sigBuffer.length !== digestBuffer.length ||
    !timingSafeEqual(sigBuffer, digestBuffer)
  ) {
    console.warn("Invalid webhook signature");
    return new Response("Invalid signature", { status: 401 });
  }

  // Parse the verified payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Only process successful order events
  const eventName = payload.meta?.event_name;
  if (eventName !== "order_created") {
    // Acknowledge other events without doing anything
    return new Response("OK", { status: 200 });
  }

  const orderData = payload.data?.attributes;
  if (!orderData) {
    return new Response("Missing order data", { status: 400 });
  }

  // Check payment status
  if (orderData.status !== "paid") {
    return new Response("Order not paid", { status: 200 });
  }

  // Verify this is for the correct product (if configured)
  if (expectedProductId) {
    const firstItem = payload.data?.relationships?.order_items?.data?.[0];
    const productId = String(payload.meta?.custom_data?.product_id || "");
    const variantId = String(orderData.first_order_item?.product_id || "");

    if (productId !== expectedProductId && variantId !== expectedProductId) {
      console.warn("Webhook for unexpected product, ignoring");
      return new Response("OK", { status: 200 });
    }
  }

  // Generate a secure random token
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();
  const orderId = String(payload.data?.id || Date.now());
  const email = orderData.user_email || "unknown";

  // Store token in Netlify Blobs with expiry metadata
  const store = getStore("negotiation-tokens");
  await store.setJSON(token, {
    orderId,
    email,
    createdAt: Date.now(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
    used: false,
  });

  console.log(`Token created for order ${orderId} (${email})`);

  // The success_url in your Lemon Squeezy product should be:
  // https://yoursite.netlify.app/?token={token}
  // Lemon Squeezy will substitute {token} — but we generate it here via webhook.
  // The redirect URL is set in Lemon Squeezy dashboard as:
  // https://yoursite.netlify.app/success?order={order_id}
  // Then the verify-token function looks up the token by order ID.
  //
  // For simplicity we also store by orderId so the frontend can retrieve
  // the token using just the order ID from the redirect URL.
  await store.setJSON(`order:${orderId}`, { token });

  return new Response("OK", { status: 200 });
};

export const config = {
  path: "/.netlify/functions/webhook",
};
