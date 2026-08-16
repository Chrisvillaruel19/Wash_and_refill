"use client";

import { useState } from "react";
import { X, Lock } from "lucide-react";
import { requestRestockAuthorization } from "../../../lib/services/inventoryApi.service";
import { ApiError } from "../../../lib/apiClient";
import { useEscapeKey } from "../../../lib/useEscapeKey";

interface AuthModalProps {
  inventoryId: string;
  onAuthorized: (authorizationToken: string) => void;
  onCancel: () => void;
}

// The Admin's password is typed here and sent once, to the backend, to be
// verified — it is never stored (not in localStorage/sessionStorage, not
// in component state after this call returns), never sent again, and
// never part of the actual restock request. What this modal hands back to
// its caller is a short-lived, single-use authorization token, not the
// password itself.
export default function AuthModal({ inventoryId, onAuthorized, onCancel }: AuthModalProps) {
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
      const authorizationToken = await requestRestockAuthorization(inventoryId, username.trim(), password);
      onAuthorized(authorizationToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to verify credentials. Please try again.");
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

        <label htmlFor="admin-auth-username" className="sr-only">Admin username</label>
        <input
          id="admin-auth-username"
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

        <label htmlFor="admin-auth-password" className="sr-only">Password</label>
        <input
          id="admin-auth-password"
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
