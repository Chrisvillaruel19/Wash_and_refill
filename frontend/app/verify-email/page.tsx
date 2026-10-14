"use client";

import { Suspense, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "../lib/auth";
import { ApiError } from "../lib/apiClient";

// Opened from the emailed link. Verification happens only when the person
// clicks the button (a POST), not on page load, so an email security
// scanner that merely opens the link can't verify the address on its own.
function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  async function handleVerify() {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      setMessage(await verifyEmail(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to verify your email right now. Please try again.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <p className="text-red-600 text-sm text-center mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
        This verification link is invalid or incomplete. Please request a new one.
      </p>
    );
  }

  if (message) {
    return (
      <>
        <p className="text-green-700 text-sm text-center mb-4 bg-green-50 border border-green-200 rounded-lg py-2 px-3">
          {message}
        </p>
        <Link href="/" className="block text-center text-blue-700 font-medium hover:underline">
          Go to Sign In
        </Link>
      </>
    );
  }

  return (
    <>
      {error && (
        <p className="text-red-600 text-sm text-center mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
          {error}
        </p>
      )}
      <p className="text-center text-gray-700 mb-6">Confirm that this email address belongs to you.</p>
      <button
        type="button"
        onClick={handleVerify}
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Verifying..." : "Verify my email"}
      </button>
      <Link href="/" className="block text-center mt-5 text-gray-600 hover:text-blue-600 transition-colors">
        Back to Sign In
      </Link>
    </>
  );
}

export default function VerifyEmail() {
  return (
    <div className="relative min-h-screen w-full">
      <Image src="/background.png" alt="Background" fill priority className="object-cover -z-10" />

      <main className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md backdrop-blur-md bg-white/30 border border-gray-200 p-6 sm:p-8 rounded-2xl shadow-2xl">
          <Image
            src="/LOGO.png"
            alt="Logo"
            width={110}
            height={110}
            className="mx-auto mb-4 w-24 h-24 sm:w-28 sm:h-28"
          />

          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-6 leading-snug">
            Verify Email
          </h1>

          <Suspense fallback={<p className="text-center text-gray-600">Loading...</p>}>
            <VerifyEmailForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
