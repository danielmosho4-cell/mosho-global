# mosho global — implementation & design plan

## Product approach
Build a single responsive landing page that works as a practical local service hub: visitors can understand the offer in seconds, see live station availability, reserve a charging bay or power bank, get directions, and reach support. The first version uses a polished client-side availability model with clear starter location/pricing copy, keeping the reservation UI ready to connect to the managed database as live operations are added.

## Design direction

### Considered styles
- **Neon transit utility** (0.06): high-contrast wayfinding UI with luminous status signals and a public-infrastructure feel.
- **Soft-tech hospitality** (0.04): calm warm neutrals, translucent cards, and a lounge-oriented service tone.
- **Solar editorial** (0.08): bright white space, black typography, and oversized highlighter accents.

### Chosen: Neon transit utility
A modern service interface for people in motion: crisp, legible, lightly industrial, with neon signals that communicate availability and speed.

- **Design Movement:** Contemporary wayfinding / Swiss utility systems fused with night-transit signage.
- **Core Principles:** (1) status is visible at a glance, (2) every CTA is action-oriented, (3) dense information stays calm through spacing and typographic hierarchy, (4) accents signal utility rather than decoration.
- **Color Philosophy:** Ink navy is the dependable base; volt lime owns the brand; cyan indicates connectivity and movement; warm white keeps the experience welcoming in daylight.
- **Layout Paradigm:** A vertical scroll journey that behaves like a station map: top-level wayfinding, a hero “platform,” live capacity board, then service bays (how it works, amenities, pricing, location, support).
- **Signature Elements:** station-line connector rules, a live pulse dot, and a battery-ring motif reused in the hero and availability board.
- **Interaction Philosophy:** fast, forgiving, and transparent; interactions show what changed (e.g. reservation confirmation, availability update) without sending customers to another page.
- **Animation:** short 180–260ms transitions, subtle signal pulses on live indicators, and a slow ambient gradient shift in the hero visual; avoid continuous motion in content-heavy sections.
- **Typography System:** use a geometric sans for utility copy and a display sans for oversized headlines; strong numeric styles for price and availability.
- **Brand Essence:** The neighborhood’s dependable battery pit-stop for people who can’t slow down. Personality: energetic, reassuring, resourceful.
- **Brand Voice:** Direct, optimistic, local. Example lines: “Get back to full power.” / “Plug in. Take five. Keep moving.”
- **Wordmark & Logo:** lowercase wordmark with a custom “o” battery ring; the mark is a small rounded square with a split lightning bar that doubles as a status indicator.
- **Signature Brand Color:** Volt lime `#d7ff3f`.

## Implementation

- `client/src/pages/Home.tsx`: page composition, local reservation/support interactions, availability cards, navigation anchors, and responsive behavior.
- `client/src/index.css`: design tokens, layout primitives, responsive rules, station-line details, and component styling.
- `public/manus-routes.json`: route declaration for the single-page experience.
- `app.config.ts`: platform project-logo metadata.
- `server/` and `drizzle/`: retained starter infrastructure for future persistent reservations; this first pass keeps the visible flow usable without requiring customer login.

## Frontend behavior

- “Find Our Location” scrolls to the location module; “Reserve a Bay” opens an in-page reservation dialog.
- The availability board shows bay and power-bank counts, plus a refreshed timestamp control.
- Reservation supports bay vs. power bank, date, arrival time, duration, and contact; submission produces a confirmation state and decreases the displayed available count for the selected resource during the session.
- Inquiry form confirms submission in place.
- Call, WhatsApp, and directions links are tap-ready and use replaceable starter business details.
