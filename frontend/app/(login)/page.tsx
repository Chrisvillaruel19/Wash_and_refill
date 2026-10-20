"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, restoreSession } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import FieldError from "../components/FieldError";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Shown under each field. `error` above is only for the server's answer
  // (wrong credentials, account inactive), which isn't about one field.
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Same re-entrancy guard pattern used in New Order: state updates aren't
  // guaranteed to re-render before a second click event fires, so the real
  // guard is this ref, set synchronously.
  const isSubmittingRef = useRef(false);
  // Still signed in from before (reopened browser, refreshed tab)? Then go
  // straight to the right dashboard instead of showing the login form. The
  // form stays hidden until the server has answered, so it never flashes.
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .then((user) => {
        if (cancelled) return;
        if (user) router.replace(user.role === "admin" ? "/admin" : "/staff");
        else setCheckingSession(false);
      })
      .catch(() => {
        // Couldn't reach the server — let the user try signing in normally.
        if (!cancelled) setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    // Empty box: required. Only spaces, or a space inside: invalid (no
    // username has spaces). Anything else is left to the server, which
    // knows the real accounts — older ones may not match today's rules.
    const trimmedUsername = username.trim();
    const nextUsernameError = !username
      ? "Username is required."
      : !trimmedUsername || /\s/.test(trimmedUsername)
        ? "Invalid username."
        : "";
    // Passwords can't contain spaces (see isValidPassword), so one with a
    // space can never be right.
    const nextPasswordError = !password
      ? "Password is required."
      : /\s/.test(password)
        ? "Invalid password."
        : "";
    setUsernameError(nextUsernameError);
    setPasswordError(nextPasswordError);
    if (nextUsernameError || nextPasswordError) {
      setError("");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const user = await login(username.trim(), password);

      if (!user) {
        setError("Invalid username or password.");
        return;
      }

      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/staff");
      }
    } catch (err) {
      // 409: another Staff member is still on duty (the message names them);
      // 403: inactive/archived account. Both shown as the backend wrote them.
      if (err instanceof ApiError && (err.status === 409 || err.status === 403)) {
        setError(err.message);
      } else {
        setError("Unable to sign in right now. Please try again.");
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (checkingSession) {
    return <p className="p-6 text-gray-400">Checking session...</p>;
  }

  return (
    <div className="relative min-h-screen w-full">
      <Image
        src="/background.png"
        alt="Background"
        fill
        priority
        className="object-cover -z-10"
      />

      <main className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md backdrop-blur-md bg-white/30 border border-gray-200 p-6 sm:p-8 rounded-2xl shadow-2xl">
          <Image
            src="/LOGO.png"
            alt="Logo"
            width={110}
            height={110}
            className="mx-auto mb-4 w-24 h-24 sm:w-28 sm:h-28"
          />

          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-6 sm:mb-8 leading-snug">
            Wash & Refill Laundry
            <br />
            Management System
          </h1>

          {error && (
            <p className="text-red-600 text-sm text-center mb-4 bg-red-50 border border-red-200 rounded-lg py-2">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label
                htmlFor="username"
                className="block mb-1 font-medium text-gray-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (usernameError) setUsernameError("");
                }}
                aria-invalid={!!usernameError}
                aria-describedby={usernameError ? "username-error" : undefined}
                className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                  usernameError ? "border-red-500" : "border-gray-300"
                }`}
              />
              <FieldError id="username-error" message={usernameError} />
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="block mb-1 font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "password-error" : undefined}
                className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                  passwordError ? "border-red-500" : "border-gray-300"
                }`}
              />
              <FieldError id="password-error" message={passwordError} />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <Link
            href="/forgot-password"
            className="block text-center mt-5 text-gray-600 hover:text-blue-600 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      </main>
    </div>
  );
}