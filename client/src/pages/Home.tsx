import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import EventTicket from "@/components/EventTicket";
import { supabase } from "@/lib/supabase";
import type { EventWithTypes } from "@/lib/types";

export default function Home() {
  const [events, setEvents] = useState<EventWithTypes[] | null>(null);
  const [error, setError] = useState("");
  const [city, setCity] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase
      .from("events")
      .select("*, ticket_types(*)")
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .then(({ data, error }) => {
        if (error) setError("We couldn't load events. Refresh the page to try again.");
        else setEvents((data ?? []) as EventWithTypes[]);
      });
  }, []);

  const cities = useMemo(() => ["All", ...Array.from(new Set((events ?? []).map((e) => e.city))).sort()], [events]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (events ?? []).filter(
      (e) =>
        (city === "All" || e.city === city) &&
        (!q || e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q)),
    );
  }, [events, city, query]);

  return (
    <>
      <section className="hero">
        <h1>Tickets for the nights worth leaving home for.</h1>
        <p>
          Concerts, parties, conferences and shows across Nigeria. Pick your tickets, pay, and your entry code is waiting in your
          account.
        </p>
      </section>

      <div className="filters">
        <div style={{ flex: "1 1 260px", maxWidth: 320 }}>
          <label htmlFor="search" className="sr-only" style={{ position: "absolute", left: -9999 }}>
            Search events
          </label>
          <input id="search" type="search" placeholder="Search by event or venue" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="chips" role="group" aria-label="Filter by city">
          {cities.map((c) => (
            <button key={c} className="chip" aria-pressed={city === c} onClick={() => setCity(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}
      {!events && !error && <p>Loading events…</p>}

      {events && shown.length === 0 && (
        <div className="empty">
          <h3>{events.length === 0 ? "No events on sale yet" : "Nothing matches that search"}</h3>
          <p>{events.length === 0 ? "Be the first to put an event on sale." : "Try another city or a shorter search."}</p>
          {events.length === 0 && (
            <Link href="/dashboard/new" className="btn accent">
              Create an event
            </Link>
          )}
        </div>
      )}

      <div className="event-list">
        {shown.map((e) => (
          <EventTicket key={e.id} event={e} />
        ))}
      </div>
    </>
  );
}
