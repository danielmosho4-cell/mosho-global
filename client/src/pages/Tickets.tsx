import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { dateParts } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { TicketRow } from "@/lib/types";

function TicketList() {
  const { user } = useAuth();
  const isNew = new URLSearchParams(useSearch()).get("new") === "1";
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("tickets")
      .select("id, code, status, checked_in_at, created_at, ticket_type_id, events(title, slug, starts_at, venue, city), ticket_types(name)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError("We couldn't load your tickets. Refresh the page to try again.");
        else setTickets((data ?? []) as unknown as TicketRow[]);
      });
  }, [user]);

  return (
    <>
      <div className="page-head">
        <h1 style={{ fontSize: "2.4rem" }}>My tickets</h1>
      </div>
      {isNew && <div className="notice ok">Your tickets are ready. Show the code at the entrance.</div>}
      {error && <div className="notice error">{error}</div>}
      {!tickets && !error && <p>Loading…</p>}
      {tickets && tickets.length === 0 && (
        <div className="empty">
          <h3>You don't have any tickets yet</h3>
          <p>When you buy tickets they appear here with an entry code.</p>
          <Link href="/" className="btn accent">
            Browse events
          </Link>
        </div>
      )}
      <div className="event-list">
        {tickets?.map((t) => {
          const when = t.events ? dateParts(t.events.starts_at) : null;
          return (
            <div className="ticket compact" key={t.id}>
              <div className="ticket-body">
                <h3>{t.events?.title}</h3>
                <p className="meta">
                  {t.ticket_types?.name} · {t.events?.venue}, {t.events?.city}
                </p>
                <p style={{ marginTop: 14 }} className="code" aria-label={`Entry code ${t.code}`}>
                  {t.code}
                </p>
                <p style={{ marginTop: 10 }}>
                  <span className={`badge ${t.status}`}>{t.status === "valid" ? "Valid" : t.status === "used" ? "Used" : "Cancelled"}</span>
                </p>
              </div>
              <div className="stub">
                {when && (
                  <>
                    <span className="mon">
                      {when.weekday}, {when.month}
                    </span>
                    <span className="day">{when.day}</span>
                    <span className="time">{when.time}</span>
                  </>
                )}
                {t.events && (
                  <Link href={`/events/${t.events.slug}`} style={{ marginTop: 10, fontSize: "0.9rem", fontWeight: 600 }}>
                    View event
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function Tickets() {
  return (
    <RequireAuth>
      <TicketList />
    </RequireAuth>
  );
}
