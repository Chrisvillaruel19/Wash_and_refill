"use client";

import { useState } from "react";
import { X, Lock } from "lucide-react";
import { verifyAdminCredentials } from "../../../lib/auth";
import { useEscapeKey } from "../../../lib/useEscapeKey";

interface AuthModalProps {
  onAuthorized: () => void;
  onCancel: () => void;
}

export default function AuthModal({ onAuthorized, onCancel }: AuthModalProps) {
  useEscapeKey(onCancel);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function handleConfirm() {
    if (!username.trim() || !password) {
      setError("Admin username and password are required.");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const authorized = await verifyAdminCredentials(username.trim(), password);
      if (authorized) {
        onAuthorized();
      } else {
        setError("Incorrect Admin username or password.");
      }
    } catch {
      setError("Unable to verify credentials. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl p-5 sm:p-6 w-full relative"
        style={{ maxWidth: "380px" }}
      >
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Lock size={18} className="text-gray-700 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Authorization Required</h2>
        </div>
        <p className="text-gray-500 text-xs sm:text-sm mb-4">
          Enter an Admin username and password to continue.
        </p>

        <input
          type="text"
          placeholder="Admin username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError("");
          }}
          autoComplete="off"
          className="w-full border border-gray-300 rounded-lg p-2 text-sm mb-2 text-gray-900"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className="w-full border border-gray-300 rounded-lg p-2 text-sm mb-2 text-gray-900"
        />

        {error && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error}
          </p>
        )}

        <div className="flex gap-3 mt-3">
          <button
            onClick={onCancel}
            disabled={verifying}
            className="flex-1 border border-red-300 text-red-500 rounded-lg py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={verifying}
            className="flex-1 border border-green-500 text-green-600 rounded-lg py-2 text-sm font-medium hover:bg-green-50 disabled:opacity-50"
          >
            {verifying ? "Verifying..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
