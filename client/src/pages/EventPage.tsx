import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { dateLong, naira, remaining } from "@/lib/format";
import { functionError, supabase } from "@/lib/supabase";
import type { EventWithTypes, TicketType } from "@/lib/types";
import NotFound from "./NotFound";

export default function EventPage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [event, setEvent] = useState<EventWithTypes | null | undefined>(undefined);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("events")
      .select("*, ticket_types(*)")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        const ev = data as EventWithTypes | null;
        if (ev) ev.ticket_types.sort((a: TicketType, b: TicketType) => a.price_minor - b.price_minor);
        setEvent(ev);
        if (ev) document.title = `${ev.title} · Mosho Global`;
      });
    return () => {
      document.title = "Mosho Global: events and tickets";
    };
  }, [slug]);

  const total = useMemo(
    () => (event?.ticket_types ?? []).reduce((sum, t) => sum + (qty[t.id] ?? 0) * t.price_minor, 0),
    [event, qty],
  );
  const count = (Object.values(qty) as number[]).reduce((a, b) => a + b, 0);

  if (event === undefined) return <p>Loading…</p>;
  if (event === null) return <NotFound />;

  const ended = new Date(event.ends_at ?? event.starts_at).getTime() < Date.now();
  const isOwner = user?.id === event.organizer_id;
  const canBuy = event.status === "published" && !ended;

  function change(id: string, delta: number, max: number) {
    setQty((q) => ({ ...q, [id]: Math.min(Math.max((q[id] ?? 0) + delta, 0), max) }));
  }

  async function checkout() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/events/${slug}`)}`);
      return;
    }
    setBusy(true);
    setError("");
    const items = (Object.entries(qty) as [string, number][])
      .filter(([, n]) => n > 0)
      .map(([ticket_type_id, quantity]) => ({ ticket_type_id, quantity }));
    const { data, error: fnError } = await supabase.functions.invoke("create-checkout", {
      body: { event_id: event!.id, items },
    });
    if (fnError) {
      setError(await functionError(fnError));
      setBusy(false);
      return;
    }
    if (data?.authorization_url) {
      window.location.href = data.authorization_url;
      return;
    }
    navigate("/tickets?new=1");
  }

  return (
    <div className="event-grid">
      <article>
        <div className="event-banner">{event.image_url && <img src={event.image_url} alt="" />}</div>
        {event.status !== "published" && (
          <p style={{ marginBottom: 12 }}>
            <span className={`badge ${event.status}`}>{event.status === "draft" ? "Draft: only you can see this" : "Cancelled"}</span>
          </p>
        )}
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>{event.title}</h1>
        <div className="event-facts">
          <span>{dateLong(event.starts_at)}</span>
          <span>
            {event.venue}, {event.city}
          </span>
        </div>
        {event.description && <p className="prose">{event.description}</p>}
      </article>

      <aside className="buy" aria-label="Buy tickets">
        <h2>Tickets</h2>
        {event.ticket_types.length === 0 && <p className="hint">Tickets haven't been added yet.</p>}
        {event.ticket_types.map((t) => {
          const left = remaining(t);
          const max = Math.min(t.max_per_order, left);
          return (
            <div className="tier" key={t.id}>
              <div>
                <div className="name">{t.name}</div>
                <div className="sub">{naira(t.price_minor)}</div>
                {left === 0 ? (
                  <div className="sub">Sold out</div>
                ) : left <= 10 ? (
                  <div className="low">Only {left} left</div>
                ) : null}
              </div>
              <div className="stepper">
                <button aria-label={`Remove one ${t.name} ticket`} disabled={!canBuy || (qty[t.id] ?? 0) === 0} onClick={() => change(t.id, -1, max)}>
                  −
                </button>
                <output aria-live="polite">{qty[t.id] ?? 0}</output>
                <button aria-label={`Add one ${t.name} ticket`} disabled={!canBuy || max === 0 || (qty[t.id] ?? 0) >= max} onClick={() => change(t.id, 1, max)}>
                  +
                </button>
              </div>
            </div>
          );
        })}

        <div className="total">
          <span>Total</span>
          <span>{count === 0 ? "₦0" : naira(total)}</span>
        </div>
        {error && <div className="notice error">{error}</div>}
        {isOwner ? (
          <p className="hint">This is your event. Open it from Host an event to manage it.</p>
        ) : !canBuy ? (
          <p className="hint">{ended ? "This event has ended." : "Tickets aren't on sale for this event."}</p>
        ) : (
          <button className="btn accent" disabled={busy || count === 0} onClick={checkout}>
            {busy ? "Working…" : !user ? "Sign in to buy" : total === 0 && count > 0 ? "Get free tickets" : "Buy tickets"}
          </button>
        )}
        <p className="hint" style={{ marginTop: 10 }}>
          Tickets are held for you for 15 minutes while you pay.
        </p>
      </aside>
    </div>
  );
}
