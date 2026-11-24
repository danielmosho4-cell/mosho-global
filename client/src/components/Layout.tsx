import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const [location] = useLocation();
  const active = href === "/" ? location === "/" : location.startsWith(href);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Link href="/" className="brand">
            <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#17143a" />
              <path d="M6 10h20v4a2 2 0 0 0 0 4v4H6v-4a2 2 0 0 0 0-4z" fill="#ffb300" />
            </svg>
            Mosho Global
          </Link>
          <nav className="nav" aria-label="Main">
            <NavLink href="/">Events</NavLink>
            {user && <NavLink href="/tickets">My tickets</NavLink>}
            <NavLink href="/dashboard">Host an event</NavLink>
            {!loading && (user ? <button onClick={signOut}>Sign out</button> : <NavLink href="/login">Sign in</NavLink>)}
          </nav>
        </div>
      </header>
      <main className="wrap">{children}</main>
      <footer className="site-footer">
        <div className="wrap">Mosho Global. Prices in Nigerian naira. Event times shown in Lagos time.</div>
      </footer>
    </>
  );
}
