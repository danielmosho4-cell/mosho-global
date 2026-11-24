import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import RequireAuth from "@/components/RequireAuth";
import { functionError, supabase } from "@/lib/supabase";

function Confirm() {
  const params = new URLSearchParams(useSearch());
  const reference = params.get("reference") ?? params.get("trxref");
  const [, navigate] = useLocation();
  const [state, setState] = useState<"checking" | "pending" | "failed" | "refund" | "error">("checking");
  const [message, setMessage] = useState("");

  const verify = useCallback(async () => {
    if (!reference) {
      setState("error");
      setMessage("This page needs a payment reference. Open it from the link your payment provider sent you back to.");
      return;
    }
    setState("checking");
    const { data, error } = await supabase.functions.invoke("verify-payment", { body: { reference } });
    if (error) {
      setState("error");
      setMessage(await functionError(error));
      return;
    }
    if (data?.status === "paid") navigate("/tickets?new=1", { replace: true });
    else if (data?.status === "refund_needed") setState("refund");
    else if (data?.status === "failed" || data?.status === "abandoned") setState("failed");
    else setState("pending");
  }, [reference, navigate]);

  useEffect(() => {
    verify();
  }, [verify]);

  return (
    <div className="narrow">
      <h1 style={{ fontSize: "2.2rem", marginBottom: 16 }}>Confirming your payment</h1>
      {state === "checking" && <p>Checking with the payment provider…</p>}
      {state === "pending" && (
        <div className="stack">
          <div className="notice">We haven't received confirmation yet. This can take a minute.</div>
          <button className="btn" onClick={verify}>
            Check again
          </button>
        </div>
      )}
      {state === "failed" && (
        <div className="stack">
          <div className="notice error">The payment didn't go through, so you haven't been charged for these tickets.</div>
          <Link href="/" className="btn">
            Back to events
          </Link>
        </div>
      )}
      {state === "refund" && (
        <div className="notice error">
          Your payment arrived after the tickets sold out. We'll refund it. Contact the organizer with reference <strong>{reference}</strong>{" "}
          if you don't see the money back.
        </div>
      )}
      {state === "error" && <div className="notice error">{message}</div>}
    </div>
  );
}

export default function CheckoutComplete() {
  return (
    <RequireAuth>
      <Confirm />
    </RequireAuth>
  );
}
