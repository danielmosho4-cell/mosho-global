// Paystack calls this when a payment succeeds, so tickets are issued even if the buyer closes the tab.
import { createClient } from "npm:@supabase/supabase-js@2";

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) return new Response("Not configured", { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  if (!safeEqual(await hmacSha512Hex(secret, raw), signature)) return new Response("Invalid signature", { status: 401 });

  let event: { event?: string; data?: { reference?: string; amount?: number; currency?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order } = await admin
      .from("orders")
      .select("id, total_minor")
      .eq("payment_reference", event.data.reference)
      .maybeSingle();
    if (order && event.data.amount === Number(order.total_minor) && event.data.currency === "NGN") {
      const { error } = await admin.rpc("fulfill_order", { p_order_id: order.id });
      if (error) return new Response("Fulfilment failed", { status: 500 }); // Paystack will retry
    }
  }
  return new Response("ok", { status: 200 });
});
