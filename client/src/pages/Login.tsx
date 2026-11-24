import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const rawNext = new URLSearchParams(search).get("next") ?? "/";
  // Only follow in-site paths so the login page can't be used to bounce people elsewhere.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  if (user) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message === "Invalid login credentials" ? "That email and password don't match. Check them and try again." : error.message);
      else navigate(next, { replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: window.location.origin + next },
      });
      if (error) setError(error.message);
      else if (!data.session) setInfo("Check your email for a confirmation link, then sign in.");
      else navigate(next, { replace: true });
    }
    setBusy(false);
  }

  return (
    <div className="narrow">
      <h1 style={{ fontSize: "2.4rem", marginBottom: 20 }}>{mode === "in" ? "Sign in" : "Create your account"}</h1>
      <div className="tabs" role="group" aria-label="Sign in or create account">
        <button className="chip" aria-pressed={mode === "in"} onClick={() => setMode("in")}>
          Sign in
        </button>
        <button className="chip" aria-pressed={mode === "up"} onClick={() => setMode("up")}>
          Create account
        </button>
      </div>
      <form className="panel" onSubmit={submit}>
        {error && <div className="notice error">{error}</div>}
        {info && <div className="notice ok">{info}</div>}
        {mode === "up" && (
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "up" && <p className="hint">At least 8 characters.</p>}
        </div>
        <button className="btn" disabled={busy} type="submit" style={{ width: "100%" }}>
          {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
