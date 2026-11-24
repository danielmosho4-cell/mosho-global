// Called when the buyer returns from Paystack. Confirms the payment with Paystack, then issues the tickets.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sign in to continue." }, 401);

    const body = await req.json().catch(() => null);
    const reference = body?.reference;
    if (typeof reference !== "string" || reference.length > 100) return json({ error: "Missing payment reference." }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, status, total_minor")
      .eq("payment_reference", reference)
      .maybeSingle();
    if (!order || order.user_id !== user.id) return json({ error: "We can't find that order." }, 404);
    if (order.status === "paid") return json({ status: "paid" });

    const key = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!key) return json({ error: "Online payments aren't switched on yet." }, 503);

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const payload = await res.json().catch(() => ({}));
    const tx = payload?.data;
    if (!res.ok || !tx) return json({ status: "pending" });

    if (tx.status === "success") {
      if (tx.amount !== Number(order.total_minor) || tx.currency !== "NGN") {
        return json({ error: "The amount paid doesn't match this order. Contact the organizer." }, 409);
      }
      const { data: result, error } = await admin.rpc("fulfill_order", { p_order_id: order.id });
      if (error) return json({ error: error.message }, 500);
      return json({ status: result });
    }
    return json({ status: tx.status ?? "pending" });
  } catch (_e) {
    return json({ error: "Something went wrong. Try again." }, 500);
  }
});
