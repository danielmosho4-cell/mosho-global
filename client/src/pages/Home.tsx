import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Crosshair,
  Headphones,
  LockKeyhole,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Phone,
  PlugZap,
  Power,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  Wifi,
  X,
  Zap,
} from "lucide-react";

type ResourceType = "bay" | "powerbank";

type Availability = {
  bays: number;
  powerbanks: number;
};

const navItems = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Live availability", href: "#availability" },
  { label: "Pricing", href: "#pricing" },
  { label: "Location", href: "#location" },
  { label: "Support", href: "#support" },
];

const amenities = [
  {
    icon: PlugZap,
    eyebrow: "01 / charge your way",
    title: "Every cable. Zero guesswork.",
    body: "USB-C, Lightning, and wireless charging are ready at every visit — just pick your fit and plug in.",
    tags: ["USB-C", "Lightning", "Qi wireless"],
    accent: "lime",
  },
  {
    icon: LockKeyhole,
    eyebrow: "02 / leave it safe",
    title: "Lock it. Walk away.",
    body: "Our passcode lockers keep your phone powered and protected while you grab a bite, browse, or catch up.",
    tags: ["Private locker", "Passcode access", "Insured spot"],
    accent: "cyan",
  },
  {
    icon: BatteryCharging,
    eyebrow: "03 / keep moving",
    title: "Power for the in-between.",
    body: "Need to roam? Rent a compact power bank and return it when you are back in the area.",
    tags: ["Pocket-size", "Quick return", "No membership needed"],
    accent: "yellow",
  },
];

const pricing = [
  {
    name: "Drop in",
    kicker: "Pay as you go",
    price: "$2.50",
    unit: "/ hour",
    copy: "The quick top-up for errands, lunch, or a low-battery moment.",
    features: ["Any cable or wireless pad", "Secure locker included", "Stop anytime"],
    accent: "lime",
    cta: "Reserve a bay",
  },
  {
    name: "Day pass",
    kicker: "Best for long hangs",
    price: "$8",
    unit: "/ day",
    copy: "Stay powered all day with one simple cap — no surprise meter watching.",
    features: ["Up to 8 hours of charging", "Locker access all day", "Power bank pickup option"],
    accent: "cyan",
    cta: "Choose day pass",
    featured: true,
  },
  {
    name: "mosho club",
    kicker: "For regular movers",
    price: "$19",
    unit: "/ month",
    copy: "A little less friction for the people who never leave home at 100%.",
    features: ["4 charging sessions included", "Priority bay reservations", "Member-only drop-in rate"],
    accent: "yellow",
    cta: "Join the club",
  },
];

const steps = [
  {
    number: "01",
    title: "Plug in or pick a charger",
    body: "Choose a live bay, select your cable, and let mosho handle the rest.",
    icon: PlugZap,
  },
  {
    number: "02",
    title: "Relax or grab a bite",
    body: "Your phone stays secure while you take a breather, shop, or meet a friend.",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Go with 100% battery",
    body: "Scan out, pocket your phone, and keep your day moving without the battery anxiety.",
    icon: Zap,
  },
];

function scrollToSection(id: string) {
  document.querySelector(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [reservationComplete, setReservationComplete] = useState(false);
  const [resourceType, setResourceType] = useState<ResourceType>("bay");
  const [availability, setAvailability] = useState<Availability>({ bays: 7, powerbanks: 12 });
  const [lastUpdated, setLastUpdated] = useState("just now");
  const [inquirySent, setInquirySent] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Day pass");
  const [reservationDetails, setReservationDetails] = useState({ date: "", time: "", duration: "" });

  const availableCount = resourceType === "bay" ? availability.bays : availability.powerbanks;
  const resourceLabel = resourceType === "bay" ? "charging bay" : "power bank";
  const availabilityPercent = useMemo(() => Math.round((availableCount / (resourceType === "bay" ? 12 : 20)) * 100), [availableCount, resourceType]);

  const openReservation = (type: ResourceType = "bay") => {
    setResourceType(type);
    setReservationComplete(false);
    setReservationOpen(true);
  };

  const refreshAvailability = () => {
    setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  const submitReservation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setReservationDetails({
      date: String(formData.get("date") ?? ""),
      time: String(formData.get("time") ?? ""),
      duration: String(formData.get("duration") ?? ""),
    });
    setAvailability((current) => ({
      ...current,
      [resourceType === "bay" ? "bays" : "powerbanks"]: Math.max(0, availableCount - 1),
    }));
    setReservationComplete(true);
  };

  const submitInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInquirySent(true);
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand-lockup" href="#top" aria-label="mosho global home">
            <span className="brand-mark"><span /></span>
            <span className="brand-name">mosho <strong>global</strong></span>
          </a>
          <nav className={`main-nav ${mobileNavOpen ? "is-open" : ""}`} aria-label="Primary navigation">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)}>{item.label}</a>
            ))}
          </nav>
          <div className="header-actions">
            <span className="open-pill"><span className="live-dot" /> Open today · 07:00–23:00</span>
            <button className="header-cta" onClick={() => openReservation("bay")}>Reserve <ArrowUpRight size={16} /></button>
            <button className="menu-toggle" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Toggle navigation">
              {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-gridlines" aria-hidden="true" />
          <div className="container hero-content">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> neighborhood charging station <span className="eyebrow-status"><span className="live-dot" /> live</span></div>
              <h1>Get back to <span>full power.</span></h1>
              <p className="hero-lede">Fast, secure, on-the-go phone charging for the moments your battery taps out before your day does.</p>
              <div className="hero-actions">
                <button className="button button-primary" onClick={() => scrollToSection("#location")}>Find our location <Navigation size={17} /></button>
                <button className="button button-ghost" onClick={() => openReservation("bay")}>Reserve a bay <ArrowRight size={17} /></button>
              </div>
              <div className="hero-proof">
                <div className="avatar-stack" aria-hidden="true"><span>J</span><span>M</span><span>A</span><span>+</span></div>
                <div><strong>4.9/5 from local movers</strong><small>“I stopped thinking about my battery.”</small></div>
              </div>
            </div>

            <div className="hero-station" aria-label="Illustration of a mosho charging station">
              <div className="station-glow" />
              <div className="station-topline"><span>MSH / 001</span><span><span className="live-dot" /> live system</span></div>
              <div className="station-device">
                <div className="device-cap"><span className="device-logo"><span /></span><span>mosho <b>global</b></span><span className="device-signal"><Wifi size={13} /> 5G</span></div>
                <div className="device-screen">
                  <div className="screen-label">STATION CAPACITY</div>
                  <div className="screen-number">19<span>/32</span></div>
                  <div className="screen-bar"><i /></div>
                  <div className="screen-foot"><span><span className="signal-block lime" /> bays</span><span><span className="signal-block cyan" /> power banks</span></div>
                </div>
                <div className="station-bays">
                  {[1, 2, 3, 4, 5, 6].map((bay) => <span key={bay} className={bay === 4 ? "occupied" : "available"}><i>{bay}</i><span /></span>)}
                </div>
              </div>
              <div className="station-badge"><BatteryCharging size={18} /><span><strong>92%</strong><small>average charge<br />in 45 min</small></span></div>
              <div className="station-base"><span /><span /><span /></div>
            </div>
          </div>
          <div className="hero-ticker" aria-hidden="true"><span>PLUG IN</span><span>TAKE FIVE</span><span>KEEP MOVING</span><span>PLUG IN</span><span>TAKE FIVE</span><span>KEEP MOVING</span></div>
        </section>

        <section className="availability-section section-pad" id="availability">
          <div className="container">
            <div className="section-heading availability-heading">
              <div><div className="eyebrow"><span className="eyebrow-line" /> know before you go</div><h2>Live at the station.</h2></div>
              <button className="refresh-button" onClick={refreshAvailability}><RefreshCw size={15} /> Updated {lastUpdated}</button>
            </div>
            <div className="availability-layout">
              <div className="availability-board">
                <div className="board-header"><span><span className="live-dot" /> Live availability</span><span>Riverside Galleria / Unit 12</span></div>
                <div className="availability-cards">
                  <button className={`availability-card ${resourceType === "bay" ? "selected" : ""}`} onClick={() => setResourceType("bay")}>
                    <div className="card-icon lime"><Power size={20} /></div><div><span className="card-label">Charging bays</span><strong>{availability.bays}<small> available</small></strong><div className="micro-bar"><i style={{ width: `${(availability.bays / 12) * 100}%` }} /></div></div><ChevronDown size={18} className="card-arrow" />
                  </button>
                  <button className={`availability-card ${resourceType === "powerbank" ? "selected" : ""}`} onClick={() => setResourceType("powerbank")}>
                    <div className="card-icon cyan"><BatteryCharging size={20} /></div><div><span className="card-label">Power banks</span><strong>{availability.powerbanks}<small> ready to rent</small></strong><div className="micro-bar cyan-bar"><i style={{ width: `${(availability.powerbanks / 20) * 100}%` }} /></div></div><ChevronDown size={18} className="card-arrow" />
                  </button>
                </div>
              </div>
              <div className="availability-cta">
                <div className="availability-ring" style={{ "--ring-progress": `${availabilityPercent * 3.6}deg` } as CSSProperties}><div><strong>{availableCount}</strong><span>{resourceType === "bay" ? "bays free" : "banks ready"}</span></div></div>
                <div><span className="mini-kicker">You’re looking at</span><h3>{availableCount} {resourceLabel}s available.</h3><p>Reserve now and we’ll hold it for 15 minutes after your arrival time.</p><button className="button button-dark" onClick={() => openReservation(resourceType)}>Reserve this {resourceType === "bay" ? "bay" : "power bank"} <ArrowRight size={16} /></button></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-pad how-section" id="how-it-works">
          <div className="container">
            <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> no battery panic</div><h2>Three steps. <em>Zero stress.</em></h2></div><p className="heading-note">Your low-battery moment just became a five-minute reset.</p></div>
            <div className="steps-grid">
              {steps.map((step) => { const Icon = step.icon; return <div className="step-card" key={step.number}><span className="step-number">{step.number}</span><div className="step-icon"><Icon size={23} /></div><h3>{step.title}</h3><p>{step.body}</p><span className="step-rule" /></div>; })}
            </div>
          </div>
        </section>

        <section className="section-pad amenities-section">
          <div className="container">
            <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> choose your charge</div><h2>Built for the <em>in-between.</em></h2></div><p className="heading-note">Everything you need to stay connected, without carrying your own kit.</p></div>
            <div className="amenities-grid">
              {amenities.map((amenity) => { const Icon = amenity.icon; return <article className={`amenity-card ${amenity.accent}`} key={amenity.title}><div className="amenity-top"><span className="amenity-icon"><Icon size={22} /></span><span className="amenity-eyebrow">{amenity.eyebrow}</span></div><h3>{amenity.title}</h3><p>{amenity.body}</p><div className="tag-row">{amenity.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></article>; })}
            </div>
          </div>
        </section>

        <section className="pricing-section section-pad" id="pricing">
          <div className="container">
            <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> simple pricing</div><h2>Power that <em>fits your day.</em></h2></div><p className="heading-note">No hidden fees. No awkward checkout. Just more battery when you need it.</p></div>
            <div className="pricing-grid">
              {pricing.map((plan) => <article className={`price-card ${plan.accent} ${plan.featured ? "featured" : ""} ${selectedPlan === plan.name ? "active" : ""}`} key={plan.name} onClick={() => setSelectedPlan(plan.name)}><div className="price-card-top"><span className="plan-kicker">{plan.kicker}</span>{plan.featured && <span className="popular-pill">most popular</span>}</div><h3>{plan.name}</h3><div className="price"><strong>{plan.price}</strong><span>{plan.unit}</span></div><p>{plan.copy}</p><ul>{plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul><button className="price-button" onClick={() => plan.name === "Drop in" ? openReservation("bay") : setSelectedPlan(plan.name)}>{selectedPlan === plan.name ? "Selected" : plan.cta} <ArrowUpRight size={15} /></button></article>)}
            </div>
          </div>
        </section>

        <section className="location-section section-pad" id="location">
          <div className="container location-layout">
            <div className="location-copy"><div className="eyebrow"><span className="eyebrow-line" /> find your way here</div><h2>Right where your day <em>already is.</em></h2><p>We’re inside Riverside Galleria, next to the east entrance and across from Greenline Coffee. Look for the lime light.</p><div className="location-details"><div className="detail-row"><span className="detail-icon"><MapPin size={18} /></span><span><strong>Riverside Galleria · Unit 12</strong><small>14 Market Street, Riverside</small></span></div><div className="detail-row"><span className="detail-icon"><Clock3 size={18} /></span><span><strong>Open daily · 07:00–23:00</strong><small>Last new session starts at 22:30</small></span></div></div><div className="location-actions"><a className="button button-primary" href="https://maps.google.com/?q=Riverside+Galleria+14+Market+Street" target="_blank" rel="noreferrer">Get directions <Navigation size={17} /></a><a className="text-link" href="tel:+15550142060"><Phone size={16} /> Call the station</a></div><div className="landmark-row"><span>Nearby</span><span>Greenline Coffee</span><span>East entrance</span><span>Bus 04 / 11</span></div></div>
            <div className="map-card" aria-label="Map showing the mosho global station location"><div className="map-noise" /><div className="map-road road-a" /><div className="map-road road-b" /><div className="map-road road-c" /><div className="map-block block-a" /><div className="map-block block-b" /><div className="map-block block-c" /><div className="map-block block-d" /><div className="map-label label-a">RIVERSIDE<br /><strong>GALLERIA</strong></div><div className="map-label label-b">MARKET STREET</div><div className="map-pin"><span className="pin-pulse" /><span className="pin-core"><BatteryCharging size={17} /></span><span className="pin-label">mosho global<br /><small>you’re close</small></span></div><div className="map-controls"><button aria-label="Locate me"><Crosshair size={17} /></button><button aria-label="Open map"><ArrowUpRight size={17} /></button></div><div className="map-scale">100 m</div></div>
          </div>
        </section>

        <section className="support-section section-pad" id="support">
          <div className="container support-layout">
            <div className="support-lead"><div className="eyebrow"><span className="eyebrow-line" /> need a hand?</div><h2>Still connected<br /><em>to humans.</em></h2><p>Forgot a passcode, need a hand with a bay, or just want to ask a quick question? We’ve got you.</p><div className="support-links"><a href="https://wa.me/15550142060" target="_blank" rel="noreferrer"><MessageCircle size={19} /><span><strong>WhatsApp us</strong><small>Usually replies in 5 min</small></span><ArrowUpRight size={16} /></a><a href="tel:+15550142060"><Phone size={19} /><span><strong>Call +1 555 014 2060</strong><small>Urgent help, 07:00–23:00</small></span><ArrowUpRight size={16} /></a></div></div>
            <div className="inquiry-card"><div className="inquiry-card-head"><div><span className="mini-kicker">Quick inquiry</span><h3>Drop us a note.</h3></div><Headphones size={27} /></div>{inquirySent ? <div className="form-success"><span><Check size={18} /></span><h4>Message received.</h4><p>We’ll get back to you shortly. If it’s urgent, tap WhatsApp for the fastest response.</p><button className="text-link" onClick={() => setInquirySent(false)}>Send another <ArrowRight size={15} /></button></div> : <form onSubmit={submitInquiry}><label>Name<input required name="name" placeholder="Your name" /></label><label>How can we help?<textarea required name="message" placeholder="Forgot a passcode? Ask away..." rows={3} /></label><button className="button button-dark" type="submit">Send inquiry <ArrowRight size={16} /></button></form>}</div>
          </div>
        </section>

        <section className="bottom-cta-section"><div className="container bottom-cta"><div><div className="eyebrow"><span className="eyebrow-line" /> your next 100%</div><h2>Don’t let 4% decide your day.</h2></div><button className="button button-lime" onClick={() => openReservation("bay")}>Reserve a bay <ArrowRight size={17} /></button></div></section>
      </main>

      <footer className="site-footer"><div className="container footer-inner"><a className="brand-lockup" href="#top"><span className="brand-mark"><span /></span><span className="brand-name">mosho <strong>global</strong></span></a><div className="footer-meta"><span>Fast power for people in motion.</span><span>© 2026 mosho global</span></div><div className="footer-links"><a href="#support">Support</a><a href="#pricing">Pricing</a><a href="mailto:hello@mosho.global">Email us</a></div></div></footer>

      {reservationOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReservationOpen(false); }}><div className="reservation-modal" role="dialog" aria-modal="true" aria-labelledby="reserve-title"><button className="modal-close" onClick={() => setReservationOpen(false)} aria-label="Close reservation dialog"><X size={20} /></button>{reservationComplete ? <div className="reservation-success"><div className="success-orbit"><Check size={28} /></div><span className="mini-kicker">Reservation confirmed</span><h2>Your {resourceLabel} is on hold.</h2><p>We’ll hold it for 15 minutes after your arrival time. Show this confirmation at the mosho station when you get here.</p><div className="reservation-details"><span><CalendarDays size={14} /> {reservationDetails.date}</span><span><Clock3 size={14} /> {reservationDetails.time}</span><span><Timer size={14} /> {reservationDetails.duration}</span></div><div className="reservation-code"><span>RESERVATION CODE</span><strong>MSH-{resourceType === "bay" ? "BAY" : "PWR"}-204</strong></div><button className="button button-dark" onClick={() => setReservationOpen(false)}>Done <Check size={16} /></button></div> : <><div className="modal-kicker"><span className="live-dot" /> live booking</div><h2 id="reserve-title">Reserve your power stop.</h2><p className="modal-intro">Pick a resource and we’ll keep it ready when you arrive.</p><div className="resource-toggle"><button className={resourceType === "bay" ? "active" : ""} onClick={() => setResourceType("bay")}><Power size={17} /> Charging bay <span>{availability.bays} free</span></button><button className={resourceType === "powerbank" ? "active" : ""} onClick={() => setResourceType("powerbank")}><BatteryCharging size={17} /> Power bank <span>{availability.powerbanks} ready</span></button></div><form className="reservation-form" onSubmit={submitReservation}><div className="form-two-col"><label>Date<input required type="date" name="date" min={new Date().toISOString().split("T")[0]} defaultValue={new Date().toISOString().split("T")[0]} /></label><label>Arrival time<select name="time" defaultValue="12:30"><option>09:00</option><option>10:30</option><option>12:30</option><option>14:00</option><option>17:30</option><option>20:00</option></select></label></div><label>How long do you need it?<select name="duration" defaultValue="1 hour"><option>1 hour · $2.50</option><option>2 hours · $5</option><option>3 hours · $7.50</option><option>Day pass · $8</option></select></label><label>Mobile number<input required type="tel" name="phone" placeholder="+1 555 000 0000" /></label><button className="button button-primary full-width" type="submit">Hold my {resourceType === "bay" ? "bay" : "power bank"} <ArrowRight size={16} /></button><small className="modal-footnote"><ShieldCheck size={14} /> No payment needed to reserve. Pay at the station.</small></form></>}</div></div>}
    </div>
  );
}
