import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { toLocalInput } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { EventWithTypes } from "@/lib/types";
import NotFound from "./NotFound";

type Tier = { id?: string; name: string; price: string; qty: string; max: string; committed: number };

function EditForm({ event }: { event: EventWithTypes }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [title, setTitle] = useState(event.title);
  const [venue, setVenue] = useState(event.venue);
  const [city, setCity] = useState(event.city);
  const [startsAt, setStartsAt] = useState(toLocalInput(event.starts_at));
  const [endsAt, setEndsAt] = useState(toLocalInput(event.ends_at));
  const [description, setDescription] = useState(event.description ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [tiers, setTiers] = useState<Tier[]>(
    event.ticket_types
      .slice()
      .sort((a, b) => a.price_minor - b.price_minor)
      .map((t) => ({
        id: t.id,
        name: t.name,
        price: String(t.price_minor / 100),
        qty: String(t.quantity_total),
        max: String(t.max_per_order),
        committed: t.quantity_sold + t.quantity_held,
      })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const setTier = (i: number, patch: Partial<Tier>) => setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!user) return;

    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : null;
    if (end && end <= start) return setError("The end time must be after the start time.");
    if (image && image.size > 5 * 1024 * 1024) return setError("The image is larger than 5 MB. Choose a smaller one.");

    const parsed = tiers.map((t) => ({
      ...t,
      price_minor: Math.round(parseFloat(t.price || "0") * 100),
      quantity_total: parseInt(t.qty, 10),
      max_per_order: parseInt(t.max || "10", 10),
    }));
    for (const t of parsed) {
      if (!t.name.trim() || !Number.isFinite(t.quantity_total) || t.quantity_total < 1 || !Number.isFinite(t.price_minor) || t.price_minor < 0) {
        return setError("Each ticket type needs a name, a price (0 for free) and at least 1 ticket.");
      }
      if (!Number.isFinite(t.max_per_order) || t.max_per_order < 1 || t.max_per_order > 20) {
        return setError("The limit per order must be between 1 and 20.");
      }
      if (t.id && t.quantity_total < t.committed) {
        return setError(`"${t.name}" already has ${t.committed} tickets sold or being paid for, so it can't go below ${t.committed}.`);
      }
    }

    setBusy(true);
    let image_url = event.image_url;
    if (image) {
      const ext = (image.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("event-images").upload(path, image, { contentType: image.type });
      if (upErr) {
        setBusy(false);
        return setError("The image didn't upload. Use a JPG, PNG or WebP under 5 MB.");
      }
      image_url = supabase.storage.from("event-images").getPublicUrl(path).data.publicUrl;
    }

    const { error: evErr } = await supabase
      .from("events")
      .update({
        title: title.trim(),
        venue: venue.trim(),
        city: city.trim(),
        description: description.trim() || null,
        starts_at: start.toISOString(),
        ends_at: end ? end.toISOString() : null,
        image_url,
      })
      .eq("id", event.id);
    if (evErr) {
      setBusy(false);
      return setError("We couldn't save the event details. Check them and try again.");
    }

    for (const t of parsed) {
      const fields = { name: t.name.trim(), price_minor: t.price_minor, quantity_total: t.quantity_total, max_per_order: t.max_per_order };
      const { error: ttErr } = t.id
        ? await supabase.from("ticket_types").update(fields).eq("id", t.id)
        : await supabase.from("ticket_types").insert({ ...fields, event_id: event.id });
      if (ttErr) {
        setBusy(false);
        return setError(`We couldn't save "${t.name}". Check the numbers and try again.`);
      }
    }
    setBusy(false);
    navigate(`/dashboard/events/${event.id}`);
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 760 }}>
      <p style={{ marginBottom: 12 }}>
        <Link href={`/dashboard/events/${event.id}`}>← Back to event</Link>
      </p>
      <h1 style={{ fontSize: "2.4rem", marginBottom: 24 }}>Edit event</h1>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      <div className="panel stack">
        <div className="field">
          <label htmlFor="title">Event name</label>
          <input id="title" required minLength={3} maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="venue">Venue</label>
            <input id="venue" required value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" required value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="starts">Starts</label>
            <input id="starts" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ends">Ends (optional)</label>
            <input id="ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
        <p className="hint">Times use your device's time zone.</p>
        <div className="field">
          <label htmlFor="desc">Description</label>
          <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="img">{event.image_url ? "Replace cover image" : "Cover image (optional)"}</label>
          <input id="img" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          <p className="hint">JPG, PNG or WebP, up to 5 MB.</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: 6 }}>Ticket types</h2>
        <p className="hint" style={{ marginBottom: 16 }}>
          A new price only applies to future orders. Tickets already bought keep the price they were bought at.
        </p>
        {tiers.map((t, i) => (
          <div className="tier-form" key={t.id ?? `new-${i}`}>
            <div>
              <label htmlFor={`tn${i}`}>Name</label>
              <input id={`tn${i}`} required value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`tp${i}`}>Price (₦)</label>
              <input id={`tp${i}`} type="number" min={0} step="0.01" required value={t.price} onChange={(e) => setTier(i, { price: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`tq${i}`}>How many{t.committed > 0 ? ` (${t.committed} sold)` : ""}</label>
              <input id={`tq${i}`} type="number" min={Math.max(t.committed, 1)} required value={t.qty} onChange={(e) => setTier(i, { qty: e.target.value })} />
            </div>
            {!t.id && (
              <button type="button" className="btn ghost small" onClick={() => setTiers((ts) => ts.filter((_, j) => j !== i))}>
                Remove
              </button>
            )}
          </div>
        ))}
        {tiers.length < 8 && (
          <button
            type="button"
            className="btn ghost small"
            onClick={() => setTiers((ts) => [...ts, { name: "", price: "", qty: "", max: "10", committed: 0 }])}
          >
            Add another ticket type
          </button>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <button className="btn accent" disabled={busy} type="submit">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Loader({ id }: { id: string }) {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventWithTypes | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("events")
      .select("*, ticket_types(*)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setEvent((data as EventWithTypes | null) ?? null));
  }, [id]);

  if (event === undefined) return <p>Loading…</p>;
  if (event === null || event.organizer_id !== user?.id) return <NotFound />;
  return <EditForm event={event} />;
}

export default function EditEvent({ id }: { id: string }) {
  return (
    <RequireAuth>
      <Loader id={id} />
    </RequireAuth>
  );
}
