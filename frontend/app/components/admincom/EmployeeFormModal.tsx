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
  getPasswordError,
  isValidEmail,
  EMAIL_ERROR_MESSAGE,
} from "../../lib/validation";

export interface EmployeeFormData {
  username: string;
  name: string;
  email: string;
  phone: string;
  hiredDate: string;
  password?: string; // required (Add) / omitted or set (Edit reset)
}

type FieldName = "username" | "name" | "email" | "phone" | "hiredDate" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

function FieldError({ field, message }: { field: FieldName; message?: string }) {
  if (!message) return null;
  return (
    <p id={`employee-${field}-error`} className="text-red-600 text-sm mt-1">
      {message}
    </p>
  );
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
  // One message per field, shown under that field; all are checked at once.
  const [errors, setErrors] = useState<FieldErrors>({});
  // The last server error, so typing in the field it points at can hide it.
  const [dismissedSubmitError, setDismissedSubmitError] = useState<string | undefined>();

  // Duplicate username/email come back from the server; show them on their
  // own field. Anything else stays in the banner above the form.
  const activeSubmitError = submitError && submitError !== dismissedSubmitError ? submitError : "";
  const serverFieldErrors: FieldErrors =
    activeSubmitError === "Username already registered"
      ? { username: activeSubmitError }
      : activeSubmitError === "Email already registered"
        ? { email: activeSubmitError }
        : {};
  const bannerError = activeSubmitError && Object.keys(serverFieldErrors).length === 0 ? activeSubmitError : "";
  const fieldError = (field: FieldName) => errors[field] || serverFieldErrors[field];

  function clearError(field: FieldName) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (serverFieldErrors[field]) setDismissedSubmitError(submitError);
  }

  function inputClass(field: FieldName) {
    return `w-full border rounded-lg p-2 text-gray-900 ${fieldError(field) ? "border-red-500" : "border-gray-300"}`;
  }

  function errorProps(field: FieldName) {
    return {
      "aria-invalid": !!fieldError(field),
      "aria-describedby": fieldError(field) ? `employee-${field}-error` : undefined,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    const next: FieldErrors = {};

    if (!username) next.username = "Username is required.";
    else if (!isValidUsername(trimmedUsername)) next.username = USERNAME_ERROR_MESSAGE;

    if (!name) next.name = "Full name is required.";
    else if (!isValidName(trimmedName)) next.name = NAME_ERROR_MESSAGE;

    if (!email) next.email = "Email is required.";
    else if (!isValidEmail(trimmedEmail)) next.email = EMAIL_ERROR_MESSAGE;

    if (trimmedPhone && !isValidPhone(trimmedPhone)) next.phone = PHONE_ERROR_MESSAGE;

    if (!hiredDate) next.hiredDate = "Hired date is required.";

    if (!isEdit && !password) next.password = "Password is required to create a new employee.";
    else if ((!isEdit || (resetPassword && password)) && !isValidPassword(password)) {
      next.password = getPasswordError(password);
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;
    // A new attempt: let the server's answer show again even if it repeats.
    setDismissedSubmitError(undefined);

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

        {bannerError && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {bannerError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="employee-username" className="block text-sm text-gray-500 mb-1">Username</label>
            <input
              id="employee-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""));
                clearError("username");
              }}
              name="employee-username"
              autoComplete="off"
              maxLength={30}
              {...errorProps("username")}
              className={inputClass("username")}
            />
            <FieldError field="username" message={fieldError("username")} />
          </div>

          <div>
            <label htmlFor="employee-name" className="block text-sm text-gray-500 mb-1">Full Name</label>
            <input
              id="employee-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(sanitizeNameInput(e.target.value));
                clearError("name");
              }}
              name="employee-name"
              autoComplete="off"
              maxLength={100}
              {...errorProps("name")}
              className={inputClass("name")}
            />
            <FieldError field="name" message={fieldError("name")} />
          </div>

          <div>
            <label htmlFor="employee-email" className="block text-sm text-gray-500 mb-1">Email</label>
            <input
              id="employee-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              name="employee-email"
              autoComplete="off"
              maxLength={254}
              {...errorProps("email")}
              className={inputClass("email")}
            />
            <FieldError field="email" message={fieldError("email")} />
          </div>

          <div>
            <label htmlFor="employee-phone" className="block text-sm text-gray-500 mb-1">Phone</label>
            <input
              id="employee-phone"
              type="text"
              inputMode="numeric"
              value={phone}
              onChange={(e) => {
                setPhone(sanitizePhoneInput(e.target.value));
                clearError("phone");
              }}
              name="employee-phone"
              autoComplete="off"
              placeholder="11-digit phone number (optional)"
              {...errorProps("phone")}
              className={inputClass("phone")}
            />
            <FieldError field="phone" message={fieldError("phone")} />
          </div>

          <div>
            <label htmlFor="employee-hired-date" className="block text-sm text-gray-500 mb-1">Hired Date</label>
            <input
              id="employee-hired-date"
              type="date"
              value={hiredDate}
              onChange={(e) => {
                setHiredDate(e.target.value);
                clearError("hiredDate");
              }}
              {...errorProps("hiredDate")}
              className={inputClass("hiredDate")}
            />
            <FieldError field="hiredDate" message={fieldError("hiredDate")} />
          </div>

          {!isEdit && (
            <div>
              <label htmlFor="employee-password" className="block text-sm text-gray-500 mb-1">Password (min. 8 characters, no spaces)</label>
              <input
                id="employee-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                name="employee-password"
                autoComplete="new-password"
                minLength={8}
                {...errorProps("password")}
                className={inputClass("password")}
              />
              <FieldError field="password" message={fieldError("password")} />
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
                    <label htmlFor="employee-new-password" className="block text-sm text-gray-500">New Password (min. 8 characters, no spaces)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetPassword(false);
                        setPassword("");
                        clearError("password");
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError("password");
                    }}
                    name="employee-new-password"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Leave blank to keep current password"
                    aria-invalid={!!fieldError("password")}
                    aria-describedby={fieldError("password") ? "employee-password-error" : undefined}
                    className={inputClass("password")}
                  />
                  <FieldError field="password" message={fieldError("password")} />
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
