import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

/** Sends signed-out visitors to the login page and brings them back afterwards. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate(`/login?next=${encodeURIComponent(location)}`, { replace: true });
  }, [loading, user, location, navigate]);

  if (loading || !user) return <p>Loading…</p>;
  return <>{children}</>;
}
