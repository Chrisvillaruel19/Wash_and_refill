"use client";

import { useState } from "react";
import { requestMyEmailVerification } from "../lib/auth";
import { ApiError } from "../lib/apiClient";

// Shown to a signed-in Admin or Staff member whose email isn't verified yet.
// Login never depends on verification; this only matters for password
// recovery (Forgot Password sends reset links to verified addresses only).
export default function EmailVerificationNotice({ emailVerified }: { emailVerified?: boolean }) {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  if (emailVerified !== false) return null;

  async function handleSend() {
    if (sending) return;
    setSending(true);
    setStatus("");
    try {
      setStatus(await requestMyEmailVerification());
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Unable to send the verification email. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="status"
      className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
    >
      <span>{status || "Your email address isn't verified yet. Verify it so you can reset your password if you ever forget it."}</span>
      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        className="font-medium underline whitespace-nowrap disabled:opacity-60"
      >
        {sending ? "Sending..." : "Send verification link"}
      </button>
    </div>
  );
}
