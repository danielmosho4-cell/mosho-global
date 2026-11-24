export type TicketType = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_minor: number;
  currency: string;
  quantity_total: number;
  quantity_sold: number;
  quantity_held: number;
  max_per_order: number;
};

export type EventRow = {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description: string | null;
  venue: string;
  city: string;
  starts_at: string;
  ends_at: string | null;
  image_url: string | null;
  status: "draft" | "published" | "cancelled";
};

export type EventWithTypes = EventRow & { ticket_types: TicketType[] };

export type TicketRow = {
  id: string;
  code: string;
  status: "valid" | "used" | "cancelled";
  checked_in_at: string | null;
  created_at: string;
  ticket_type_id: string;
  events?: Pick<EventRow, "title" | "slug" | "starts_at" | "venue" | "city"> | null;
  ticket_types?: Pick<TicketType, "name"> | null;
};
