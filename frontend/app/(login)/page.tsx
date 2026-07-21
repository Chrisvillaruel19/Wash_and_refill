"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { login } from "../lib/auth";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = login(username, password);

    if (!user) {
      setError("Invalid username or password.");
      return;
    }

    if (user.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/staff");
    }
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

          <form onSubmit={handleSubmit}>
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
                placeholder="Enter your username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
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
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          </form>

          <p className="text-center mt-5 text-gray-600 hover:text-blue-600 cursor-pointer transition-colors">
            Forgot password?
          </p>
        </div>
      </main>
    </div>
  );
}