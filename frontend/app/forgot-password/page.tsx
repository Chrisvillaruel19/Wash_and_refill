"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { forgotPassword } from "../lib/auth";
import { ApiError } from "../lib/apiClient";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Same re-entrancy guard pattern used on the login page.
  const isSubmittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const responseMessage = await forgotPassword(trimmedEmail);
      // The backend's message is the meaningful content here — it already
      // distinguishes "reset link sent" from "this account is managed by
      // an Administrator" (Staff) without this page needing to know which.
      setMessage(responseMessage || "If an account with that email exists, a password reset link has been sent.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to process your request right now. Please try again.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

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

          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-2 leading-snug">
            Forgot Password
          </h1>
          <p className="text-center text-sm text-gray-700 mb-2">
            Enter your account email and we&apos;ll send you a password reset link.
          </p>
          <p className="text-center text-xs text-gray-500 mb-6">
            Only Admin accounts can reset via email. Staff — please contact your
            Administrator to reset your password.
          </p>

          {error && (
            <p className="text-red-600 text-sm text-center mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
              {error}
            </p>
          )}

          {message && (
            <p className="text-blue-800 text-sm text-center mb-4 bg-blue-50 border border-blue-200 rounded-lg py-2 px-3">
              {message}
            </p>
          )}

          {!message && (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="email" className="block mb-1 font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your account email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <Link
            href="/"
            className="block text-center mt-5 text-gray-600 hover:text-blue-600 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </main>
    </div>
  );
}
