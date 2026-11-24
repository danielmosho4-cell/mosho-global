import type { TicketType } from "./types";

const TZ = "Africa/Lagos";

export function naira(minor: number): string {
  if (minor === 0) return "Free";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function dateParts(iso: string) {
  const d = new Date(iso);
  const get = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NG", { timeZone: TZ, ...opts }).format(d);
  return {
    day: get({ day: "numeric" }),
    month: get({ month: "short" }),
    weekday: get({ weekday: "short" }),
    time: get({ hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase(),
  };
}

export function dateLong(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export const remaining = (t: Pick<TicketType, "quantity_total" | "quantity_sold" | "quantity_held">) =>
  Math.max(t.quantity_total - t.quantity_sold - t.quantity_held, 0);

/** Short label for an event card: "From ₦5,000", "Free" or "Sold out". */
export function priceLabel(types: Pick<TicketType, "price_minor" | "quantity_total" | "quantity_sold" | "quantity_held">[]): string {
  const open = types.filter((t) => remaining(t) > 0);
  if (types.length === 0) return "Tickets soon";
  if (open.length === 0) return "Sold out";
  const min = Math.min(...open.map((t) => t.price_minor));
  return min === 0 ? "Free" : `From ${naira(min)}`;
}

export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "event"}-${Math.random().toString(36).slice(2, 7)}`;
}
