import { useEffect, useState } from "react";
import { Link } from "wouter";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { dateParts, naira } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { EventWithTypes } from "@/lib/types";

function MyEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithTypes[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("events")
      .select("*, ticket_types(*)")
      .eq("organizer_id", user.id)
      .order("starts_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError("We couldn't load your events. Refresh the page to try again.");
        else setEvents((data ?? []) as EventWithTypes[]);
      });
  }, [user]);

  return (
    <>
      <div className="page-head">
        <h1 style={{ fontSize: "2.4rem" }}>Your events</h1>
        <Link href="/dashboard/new" className="btn accent">
          Create an event
        </Link>
      </div>
      {error && <div className="notice error">{error}</div>}
      {!events && !error && <p>Loading…</p>}
      {events && events.length === 0 && (
        <div className="empty">
          <h3>You haven't created an event yet</h3>
          <p>Set a date, add ticket types and publish. Buyers can start purchasing straight away.</p>
          <Link href="/dashboard/new" className="btn accent">
            Create your first event
          </Link>
        </div>
      )}
      {events && events.length > 0 && (
        <div className="panel scroll-x" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Status</th>
                <th>Sold</th>
                <th>Ticket sales</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const sold = e.ticket_types.reduce((s, t) => s + t.quantity_sold, 0);
                const cap = e.ticket_types.reduce((s, t) => s + t.quantity_total, 0);
                const revenue = e.ticket_types.reduce((s, t) => s + t.quantity_sold * t.price_minor, 0);
                const d = dateParts(e.starts_at);
                return (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.title}</strong>
                      <div className="hint">{e.city}</div>
                    </td>
                    <td>
                      {d.day} {d.month}
                    </td>
                    <td>
                      <span className={`badge ${e.status}`}>{e.status === "published" ? "On sale" : e.status === "draft" ? "Draft" : "Cancelled"}</span>
                    </td>
                    <td>
                      {sold} / {cap}
                    </td>
                    <td>{naira(revenue) === "Free" ? "₦0" : naira(revenue)}</td>
                    <td>
                      <Link href={`/dashboard/events/${e.id}`} className="btn ghost small">
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  return (
    <RequireAuth>
      <MyEvents />
    </RequireAuth>
  );
}
