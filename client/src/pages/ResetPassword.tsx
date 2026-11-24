import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/** Opened from the link in the password-reset email. Supabase signs the person in briefly so they can set a new password. */
export default function ResetPassword() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (loading) return <p>Loading…</p>;

  if (!user) {
    return (
      <div className="narrow stack">
        <h1 style={{ fontSize: "2.2rem" }}>Reset your password</h1>
        <div className="notice error">This reset link has expired or was already used. Request a new one.</div>
        <Link href="/login" className="btn">
          Back to sign in
        </Link>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message.toLowerCase().includes("password") ? "Choose a stronger password with at least 8 characters." : error.message);
    else {
      setDone(true);
      setTimeout(() => navigate("/"), 1500);
    }
  }

  return (
    <div className="narrow">
      <h1 style={{ fontSize: "2.2rem", marginBottom: 20 }}>Choose a new password</h1>
      <form className="panel" onSubmit={submit}>
        {error && <div className="notice error">{error}</div>}
        {done && <div className="notice ok">Password updated. Taking you home…</div>}
        <div className="field">
          <label htmlFor="newpw">New password</label>
          <input id="newpw" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="hint">At least 8 characters.</p>
        </div>
        <button className="btn" type="submit" disabled={busy || done} style={{ width: "100%" }}>
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
