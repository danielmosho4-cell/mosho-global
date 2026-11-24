// Creates an order (holding the tickets for 15 minutes) and returns a Paystack payment link.
// Free orders are completed immediately.
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
    if (!user?.email) return json({ error: "Sign in to buy tickets." }, 401);

    const body = await req.json().catch(() => null);
    const eventId = body?.event_id;
    const items = body?.items;
    if (typeof eventId !== "string" || !Array.isArray(items) || items.length === 0 || items.length > 10) {
      return json({ error: "Choose at least one ticket." }, 400);
    }
    for (const it of items) {
      if (typeof it?.ticket_type_id !== "string" || !Number.isInteger(it?.quantity) || it.quantity < 1 || it.quantity > 20) {
        return json({ error: "Invalid ticket selection." }, 400);
      }
    }

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    // Don't hold tickets for a paid order if payments aren't set up yet.
    if (!paystackKey) {
      const { data: types } = await admin
        .from("ticket_types")
        .select("price_minor")
        .in("id", items.map((i: { ticket_type_id: string }) => i.ticket_type_id));
      if ((types ?? []).some((t) => t.price_minor > 0)) {
        return json({ error: "Online payments aren't switched on yet. Please try again later." }, 503);
      }
    }

    const { data: orderId, error: orderErr } = await admin.rpc("create_order", {
      p_user_id: user.id,
      p_email: user.email,
      p_event_id: eventId,
      p_items: items,
    });
    if (orderErr) return json({ error: orderErr.message }, 400);

    const { data: order, error: readErr } = await admin
      .from("orders")
      .select("id, total_minor, payment_reference")
      .eq("id", orderId)
      .single();
    if (readErr || !order) return json({ error: "Couldn't start your order. Try again." }, 500);

    if (Number(order.total_minor) === 0) {
      const { error: fulfillErr } = await admin.rpc("fulfill_order", { p_order_id: order.id });
      if (fulfillErr) return json({ error: fulfillErr.message }, 500);
      return json({ status: "paid" });
    }

    const siteUrl = (Deno.env.get("SITE_URL") ?? req.headers.get("origin") ?? "").replace(/\/$/, "");
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${paystackKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        amount: Number(order.total_minor), // kobo
        currency: "NGN",
        reference: order.payment_reference,
        callback_url: `${siteUrl}/checkout/complete`,
        metadata: { order_id: order.id },
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.data?.authorization_url) {
      return json({ error: "We couldn't reach the payment provider. Try again in a moment." }, 502);
    }
    return json({ status: "pending", authorization_url: payload.data.authorization_url });
  } catch (_e) {
    return json({ error: "Something went wrong. Try again." }, 500);
  }
});
