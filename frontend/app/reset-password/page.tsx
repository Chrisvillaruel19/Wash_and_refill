"use client";

import { Suspense, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { isValidPassword, PASSWORD_ERROR_MESSAGE } from "../lib/validation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    if (!isValidPassword(newPassword)) {
      setError(PASSWORD_ERROR_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      await resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to reset your password right now. Please try again."
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <>
        <p className="text-red-600 text-sm text-center mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
          This reset link is invalid or missing a token. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="block text-center text-blue-600 hover:text-blue-800 font-medium"
        >
          Request a new reset link
        </Link>
      </>
    );
  }

  if (success) {
    return (
      <>
        <p className="text-green-800 text-sm text-center mb-4 bg-green-50 border border-green-200 rounded-lg py-2 px-3">
          Your password has been reset successfully. You can now sign in with your new password.
        </p>
        <Link
          href="/"
          className="block text-center w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Login
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

      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <label htmlFor="new-password" className="block mb-1 font-medium text-gray-700">
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="confirm-password" className="block mb-1 font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPassword() {
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
            Reset Password
          </h1>

          <Suspense fallback={<p className="text-center text-gray-600">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
