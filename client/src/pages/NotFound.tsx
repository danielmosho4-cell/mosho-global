import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="empty">
      <h3>We can't find that page</h3>
      <p>The link may be old, or the event may have been removed.</p>
      <Link href="/" className="btn">
        Browse events
      </Link>
    </div>
  );
}
