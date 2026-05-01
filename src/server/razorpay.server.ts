// Razorpay REST API wrapper (server-only)
const BASE = "https://api.razorpay.com/v1";

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay credentials missing");
  const b64 = Buffer.from(`${id}:${secret}`).toString("base64");
  return { Authorization: `Basic ${b64}`, "Content-Type": "application/json" };
}

export async function createOrder(opts: {
  amountInPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({
      amount: opts.amountInPaise,
      currency: "INR",
      receipt: opts.receipt,
      notes: opts.notes ?? {},
    }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function refundPayment(paymentId: string, amountInPaise?: number) {
  const res = await fetch(`${BASE}/payments/${paymentId}/refund`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify(amountInPaise ? { amount: amountInPaise } : {}),
  });
  if (!res.ok) throw new Error(`Razorpay refund failed: ${res.status} ${await res.text()}`);
  return res.json();
}

import { createHmac, timingSafeEqual } from "crypto";

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
