import { Link } from "wouter";
import { dateParts, priceLabel } from "@/lib/format";
import type { EventWithTypes } from "@/lib/types";

/** An event drawn as a ticket: details on the left, a tear-off stub with the date on the right. */
export default function EventTicket({ event }: { event: EventWithTypes }) {
  const when = dateParts(event.starts_at);
  const price = priceLabel(event.ticket_types);
  return (
    <Link href={`/events/${event.slug}`} className="ticket">
      <div className="ticket-main">
        <div className={`ticket-art${event.image_url ? "" : " blank"}`}>
          {event.image_url && <img src={event.image_url} alt="" loading="lazy" />}
        </div>
        <div className="ticket-body">
          <h3>{event.title}</h3>
          <p className="meta">
            {event.venue}, {event.city}
          </p>
        </div>
      </div>
      <div className="stub">
        <span className="mon">
          {when.weekday}, {when.month}
        </span>
        <span className="day">{when.day}</span>
        <span className="time">{when.time}</span>
        <span className={`price${price === "Sold out" ? " out" : ""}`}>{price}</span>
      </div>
    </Link>
  );
}
