import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { dateLong, naira, remaining } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { EventWithTypes, TicketRow } from "@/lib/types";
import NotFound from "./NotFound";

function Manage({ id }: { id: string }) {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventWithTypes | null | undefined>(undefined);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [ev, tk] = await Promise.all([
      supabase.from("events").select("*, ticket_types(*)").eq("id", id).maybeSingle(),
      supabase
        .from("tickets")
        .select("id, code, status, checked_in_at, created_at, ticket_type_id, ticket_types(name)")
        .eq("event_id", id)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    setEvent((ev.data as EventWithTypes | null) ?? null);
    setTickets((tk.data ?? []) as unknown as TicketRow[]);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (event === undefined) return <p>Loading…</p>;
  if (event === null || event.organizer_id !== user?.id) return <NotFound />;

  const sold = event.ticket_types.reduce((s, t) => s + t.quantity_sold, 0);
  const cap = event.ticket_types.reduce((s, t) => s + t.quantity_total, 0);
  const revenue = event.ticket_types.reduce((s, t) => s + t.quantity_sold * t.price_minor, 0);
  const checkedIn = tickets.filter((t) => t.status === "used").length;

  async function setStatus(status: "draft" | "published" | "cancelled") {
    setError("");
    const { error } = await supabase.from("events").update({ status }).eq("id", id);
    if (error) setError("We couldn't update the event. Try again.");
    else load();
  }

  async function checkIn(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    const entered = code.trim().toUpperCase();
    if (!entered) return;
    const { data, error } = await supabase
      .from("tickets")
      .update({ status: "used", checked_in_at: new Date().toISOString() })
      .eq("event_id", id)
      .eq("code", entered)
      .eq("status", "valid")
      .select("code, ticket_types(name)");
    if (error) setResult({ ok: false, text: "Check-in failed. Try again." });
    else if (!data || data.length === 0) setResult({ ok: false, text: `No valid ticket with code ${entered}. It may be wrong, already used or cancelled.` });
    else {
      const tt = (data[0] as unknown as { ticket_types?: { name: string } }).ticket_types;
      setResult({ ok: true, text: `Checked in: ${tt?.name ?? "ticket"} (${entered})` });
      setCode("");
      load();
    }
  }

  return (
    <>
      <p style={{ marginBottom: 12 }}>
        <Link href="/dashboard">← Your events</Link>
      </p>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: "2.2rem" }}>{event.title}</h1>
          <p className="hint" style={{ fontSize: "1rem" }}>
            {dateLong(event.starts_at)} · {event.venue}, {event.city}
          </p>
        </div>
        <div className="chips">
          <Link href={`/events/${event.slug}`} className="btn ghost small">
            View public page
          </Link>
          <Link href={`/dashboard/events/${event.id}/edit`} className="btn ghost small">
            Edit details
          </Link>
          {event.status !== "published" ? (
            <button className="btn accent small" onClick={() => setStatus("published")}>
              Put on sale
            </button>
          ) : (
            <button className="btn ghost small" onClick={() => setStatus("draft")}>
              Pause sales
            </button>
          )}
          {event.status !== "cancelled" && (
            <button
              className="btn ghost small"
              onClick={() => confirm("Cancel this event? Buyers will no longer be able to purchase tickets.") && setStatus("cancelled")}
            >
              Cancel event
            </button>
          )}
        </div>
      </div>
      {error && <div className="notice error">{error}</div>}

      <div className="stats">
        <div className="stat">
          <div className="n">{sold}</div>
          <div className="l">of {cap} tickets sold</div>
        </div>
        <div className="stat">
          <div className="n">{naira(revenue) === "Free" ? "₦0" : naira(revenue)}</div>
          <div className="l">ticket sales</div>
        </div>
        <div className="stat">
          <div className="n">{checkedIn}</div>
          <div className="l">checked in</div>
        </div>
        <div className="stat">
          <div className="n">
            <span className={`badge ${event.status}`}>{event.status === "published" ? "On sale" : event.status === "draft" ? "Draft" : "Cancelled"}</span>
          </div>
          <div className="l">status</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.3rem", marginBottom: 12 }}>Check in a guest</h2>
        <form className="inline-form" onSubmit={checkIn}>
          <label htmlFor="code" style={{ position: "absolute", left: -9999 }}>
            Entry code
          </label>
          <input id="code" placeholder="Enter the code on the ticket" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
          <button className="btn" type="submit">
            Check in
          </button>
        </form>
        {result && (
          <div className={`notice ${result.ok ? "ok" : "error"}`} style={{ marginTop: 14, marginBottom: 0 }} role="status">
            {result.text}
          </div>
        )}
      </div>

      <div className="panel scroll-x" style={{ padding: 0, marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Ticket type</th>
              <th>Price</th>
              <th>Sold</th>
              <th>Left</th>
            </tr>
          </thead>
          <tbody>
            {event.ticket_types.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{naira(t.price_minor)}</td>
                <td>{t.quantity_sold}</td>
                <td>{remaining(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: "1.3rem", marginBottom: 12 }}>Issued tickets</h2>
      {tickets.length === 0 ? (
        <p className="hint">No tickets have been sold yet.</p>
      ) : (
        <div className="panel scroll-x" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="code">{t.code}</td>
                  <td>{t.ticket_types?.name}</td>
                  <td>
                    <span className={`badge ${t.status}`}>{t.status === "valid" ? "Valid" : t.status === "used" ? "Checked in" : "Cancelled"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ManageEvent({ id }: { id: string }) {
  return (
    <RequireAuth>
      <Manage id={id} />
    </RequireAuth>
  );
}
