import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type Tier = { name: string; price: string; qty: string };

function Form() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("Lagos");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([{ name: "General admission", price: "", qty: "" }]);
  const [publish, setPublish] = useState(true);
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

    const types = tiers.map((t) => ({
      name: t.name.trim(),
      price_minor: Math.round(parseFloat(t.price || "0") * 100),
      quantity_total: parseInt(t.qty, 10),
    }));
    if (types.some((t) => !t.name || !Number.isFinite(t.quantity_total) || t.quantity_total < 1 || !Number.isFinite(t.price_minor) || t.price_minor < 0)) {
      return setError("Each ticket type needs a name, a price (0 for free) and at least 1 ticket.");
    }

    setBusy(true);
    let image_url: string | null = null;
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

    const { data: ev, error: evErr } = await supabase
      .from("events")
      .insert({
        organizer_id: user.id,
        title: title.trim(),
        slug: slugify(title),
        description: description.trim() || null,
        venue: venue.trim(),
        city: city.trim(),
        starts_at: start.toISOString(),
        ends_at: end ? end.toISOString() : null,
        image_url,
        status: publish ? "published" : "draft",
      })
      .select("id")
      .single();
    if (evErr || !ev) {
      setBusy(false);
      return setError("We couldn't save the event. Check the details and try again.");
    }

    const { error: ttErr } = await supabase.from("ticket_types").insert(types.map((t) => ({ ...t, event_id: ev.id })));
    setBusy(false);
    if (ttErr) {
      setError("The event was saved but its tickets weren't. Open it from your dashboard and try again.");
      return navigate(`/dashboard/events/${ev.id}`);
    }
    navigate(`/dashboard/events/${ev.id}`);
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: "2.4rem", marginBottom: 24 }}>Create an event</h1>
      {error && <div className="notice error">{error}</div>}

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
          <label htmlFor="img">Cover image (optional)</label>
          <input id="img" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          <p className="hint">JPG, PNG or WebP, up to 5 MB. A wide image works best.</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: 16 }}>Ticket types</h2>
        {tiers.map((t, i) => (
          <div className="tier-form" key={i}>
            <div>
              <label htmlFor={`tn${i}`}>Name</label>
              <input id={`tn${i}`} required value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`tp${i}`}>Price (₦)</label>
              <input id={`tp${i}`} type="number" min={0} step="0.01" placeholder="0 for free" required value={t.price} onChange={(e) => setTier(i, { price: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`tq${i}`}>How many</label>
              <input id={`tq${i}`} type="number" min={1} required value={t.qty} onChange={(e) => setTier(i, { qty: e.target.value })} />
            </div>
            {tiers.length > 1 && (
              <button type="button" className="btn ghost small" onClick={() => setTiers((ts) => ts.filter((_, j) => j !== i))}>
                Remove
              </button>
            )}
          </div>
        ))}
        {tiers.length < 6 && (
          <button type="button" className="btn ghost small" onClick={() => setTiers((ts) => [...ts, { name: "", price: "", qty: "" }])}>
            Add another ticket type
          </button>
        )}
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: 0 }}>
          <input type="checkbox" style={{ width: "auto" }} checked={publish} onChange={(e) => setPublish(e.target.checked)} />
          Put tickets on sale now
        </label>
        <button className="btn accent" disabled={busy} type="submit">
          {busy ? "Saving…" : "Create event"}
        </button>
      </div>
    </form>
  );
}

export default function NewEvent() {
  return (
    <RequireAuth>
      <Form />
    </RequireAuth>
  );
}
