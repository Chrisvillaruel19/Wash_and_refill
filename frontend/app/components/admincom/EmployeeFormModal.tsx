"use client";

import { useState } from "react";
import { Employee } from "../../lib/services/employeeApi.service";
import { useEscapeKey } from "../../lib/useEscapeKey";
import {
  isValidName,
  NAME_ERROR_MESSAGE,
  sanitizeNameInput,
  isValidUsername,
  USERNAME_ERROR_MESSAGE,
  isValidPhone,
  PHONE_ERROR_MESSAGE,
  sanitizePhoneInput,
  isValidPassword,
  PASSWORD_ERROR_MESSAGE,
} from "../../lib/validation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmployeeFormData {
  username: string;
  name: string;
  email: string;
  phone: string;
  hiredDate: string;
  password?: string; // required (Add) / omitted or set (Edit reset)
}

interface EmployeeFormModalProps {
  initialEmployee?: Employee; // undefined = Add mode
  onSave: (data: EmployeeFormData) => void;
  onCancel: () => void;
  submitting?: boolean;
  submitError?: string;
}

export default function EmployeeFormModal({
  initialEmployee,
  onSave,
  onCancel,
  submitting,
  submitError,
}: EmployeeFormModalProps) {
  useEscapeKey(onCancel);
  const isEdit = !!initialEmployee;

  const [username, setUsername] = useState(initialEmployee?.username ?? "");
  const [name, setName] = useState(initialEmployee?.name ?? "");
  const [email, setEmail] = useState(initialEmployee?.email ?? "");
  const [phone, setPhone] = useState(initialEmployee?.phone ?? "");
  const [hiredDate, setHiredDate] = useState(initialEmployee?.hiredDate ?? "");

  const [password, setPassword] = useState("");
  const [resetPassword, setResetPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedUsername || !trimmedName || !hiredDate) {
      setError("Username, name, and hired date are required.");
      return;
    }

    if (!isValidUsername(trimmedUsername)) {
      setError(USERNAME_ERROR_MESSAGE);
      return;
    }

    if (!isValidName(trimmedName)) {
      setError(NAME_ERROR_MESSAGE);
      return;
    }

    if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      setError(PHONE_ERROR_MESSAGE);
      return;
    }

    if (!isEdit && !password) {
      setError("Password is required to create a new employee.");
      return;
    }

    if ((!isEdit || (resetPassword && password)) && !isValidPassword(password)) {
      setError(PASSWORD_ERROR_MESSAGE);
      return;
    }

    const data: EmployeeFormData = {
      username: trimmedUsername,
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      hiredDate,
    };
    if (!isEdit) {
      data.password = password;
    } else if (resetPassword && password) {
      data.password = password;
    }

    onSave(data);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 text-gray-900">
          {isEdit ? "Edit Employee" : "Add Employee"}
        </h2>

        {(error || submitError) && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {error || submitError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="employee-username" className="block text-sm text-gray-500 mb-1">Username</label>
            <input
              id="employee-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              name="employee-username"
              autoComplete="off"
              maxLength={30}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="employee-name" className="block text-sm text-gray-500 mb-1">Full Name</label>
            <input
              id="employee-name"
              type="text"
              value={name}
              onChange={(e) => setName(sanitizeNameInput(e.target.value))}
              name="employee-name"
              autoComplete="off"
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="employee-email" className="block text-sm text-gray-500 mb-1">Email</label>
            <input
              id="employee-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              name="employee-email"
              autoComplete="off"
              maxLength={254}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="employee-phone" className="block text-sm text-gray-500 mb-1">Phone</label>
            <input
              id="employee-phone"
              type="text"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
              name="employee-phone"
              autoComplete="off"
              placeholder="11-digit phone number (optional)"
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="employee-hired-date" className="block text-sm text-gray-500 mb-1">Hired Date</label>
            <input
              id="employee-hired-date"
              type="date"
              value={hiredDate}
              onChange={(e) => setHiredDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>

          {!isEdit && (
            <div>
              <label htmlFor="employee-password" className="block text-sm text-gray-500 mb-1">Password (min. 8 characters)</label>
              <input
                id="employee-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                name="employee-password"
                autoComplete="new-password"
                minLength={8}
                className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
              />
            </div>
          )}

          {isEdit && (
            <div>
              {!resetPassword ? (
                <button
                  type="button"
                  onClick={() => setResetPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Reset password
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="employee-new-password" className="block text-sm text-gray-500">New Password (min. 8 characters)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetPassword(false);
                        setPassword("");
                      }}
                      className="text-sm text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    id="employee-new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    name="employee-new-password"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Leave blank to keep current password"
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
