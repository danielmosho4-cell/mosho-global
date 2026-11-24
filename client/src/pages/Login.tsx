import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Mode = "in" | "up" | "reset";

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Check them, or reset your password.";
  if (m.includes("rate limit")) return "Too many emails were sent. Wait a few minutes and try again.";
  if (m.includes("already registered")) return "An account with this email already exists. Sign in instead.";
  if (m.includes("password should")) return "Choose a stronger password with at least 8 characters.";
  if (m.includes("failed to fetch") || m.includes("network")) return "We couldn't reach the server. Check your connection and try again.";
  return message;
}

/** Supabase puts problems with email links (expired, already used) in the URL hash. */
function linkProblem(): string {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (!hash.get("error")) return "";
  return hash.get("error_code") === "otp_expired"
    ? "That email link has expired or was already used. Request a new one below."
    : (hash.get("error_description") ?? "That email link didn't work. Request a new one below.").replace(/\+/g, " ");
}

export default function Login() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const rawNext = new URLSearchParams(search).get("next") ?? "/";
  // Only follow in-site paths so the login page can't be used to send people elsewhere.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkProblem);
  const [info, setInfo] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false);

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  if (user) return null;

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setInfo("");
    setNeedsConfirm(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    setNeedsConfirm(false);
    const cleanEmail = email.trim();

    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) {
          if (error.message.toLowerCase().includes("not confirmed")) {
            setNeedsConfirm(true);
            setError("Confirm your email first. We sent you a link when you signed up.");
          } else setError(friendly(error.message));
        } else navigate(next, { replace: true });
      } else if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin + next },
        });
        if (error) setError(friendly(error.message));
        else if (data.user && data.user.identities?.length === 0) setError("An account with this email already exists. Sign in instead.");
        else if (!data.session) {
          setNeedsConfirm(true);
          setInfo("Account created. Open the confirmation link we emailed you, then sign in.");
        } else navigate(next, { replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) setError(friendly(error.message));
        else setInfo("If an account exists for that email, a reset link is on its way.");
      }
    } catch (err) {
      setError(friendly((err as Error).message));
    }
    setBusy(false);
  }

  async function resend() {
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + next },
    });
    setBusy(false);
    if (error) setError(friendly(error.message));
    else {
      setError("");
      setInfo("We sent a new confirmation link. Check your inbox and spam folder.");
    }
  }

  const title = mode === "in" ? "Sign in" : mode === "up" ? "Create your account" : "Reset your password";

  return (
    <div className="narrow">
      <h1 style={{ fontSize: "2.4rem", marginBottom: 20 }}>{title}</h1>
      {mode !== "reset" && (
        <div className="tabs" role="group" aria-label="Sign in or create account">
          <button className="chip" aria-pressed={mode === "in"} onClick={() => switchMode("in")}>
            Sign in
          </button>
          <button className="chip" aria-pressed={mode === "up"} onClick={() => switchMode("up")}>
            Create account
          </button>
        </div>
      )}
      <form className="panel" onSubmit={submit}>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {info && (
          <div className="notice ok" role="status">
            {info}
          </div>
        )}
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
        {mode !== "reset" && (
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              minLength={mode === "up" ? 8 : undefined}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "up" && <p className="hint">At least 8 characters.</p>}
          </div>
        )}
        <button className="btn" disabled={busy} type="submit" style={{ width: "100%" }}>
          {busy ? "Working…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
        </button>
        {needsConfirm && email && (
          <button type="button" className="btn ghost" disabled={busy} onClick={resend} style={{ width: "100%", marginTop: 10 }}>
            Resend confirmation email
          </button>
        )}
        <p style={{ marginTop: 16, textAlign: "center" }}>
          {mode === "in" && (
            <button type="button" className="chip" onClick={() => switchMode("reset")}>
              Forgot your password?
            </button>
          )}
          {mode === "reset" && (
            <button type="button" className="chip" onClick={() => switchMode("in")}>
              Back to sign in
            </button>
          )}
        </p>
      </form>
    </div>
  );
}
