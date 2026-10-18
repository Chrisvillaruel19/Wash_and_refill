"use client";

import { User, Phone } from "lucide-react";
import { sanitizeNameInput, sanitizePhoneInput } from "../../../lib/validation";
import FieldError from "../../FieldError";

interface CustomerInfoFormProps {
  customerName: string;
  phoneNumber: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  nameError?: string;
  phoneError?: string;
}

export default function CustomerInfoForm({
  customerName,
  phoneNumber,
  onNameChange,
  onPhoneChange,
  nameError,
  phoneError,
}: CustomerInfoFormProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-3">Customer Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="customer-name" className="block text-sm text-gray-600 mb-1">Customer Name</label>
          <div
            className={`flex items-center border rounded-lg px-3 py-2 ${nameError ? "border-red-500" : "border-gray-300"}`}
          >
            <User size={18} className="text-gray-400 mr-2 shrink-0" />
            <input
              id="customer-name"
              type="text"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => onNameChange(sanitizeNameInput(e.target.value))}
              maxLength={100}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "customer-name-error" : undefined}
              className="w-full outline-none min-w-0 text-gray-900"
            />
          </div>
          <FieldError id="customer-name-error" message={nameError} />
        </div>

        <div>
          <label htmlFor="customer-phone" className="block text-sm text-gray-600 mb-1">Phone Number (optional)</label>
          <div
            className={`flex items-center border rounded-lg px-3 py-2 ${phoneError ? "border-red-500" : "border-gray-300"}`}
          >
            <Phone size={18} className="text-gray-400 mr-2 shrink-0" />
            <input
              id="customer-phone"
              type="text"
              inputMode="numeric"
              placeholder="11-digit phone number (optional)"
              value={phoneNumber}
              onChange={(e) => onPhoneChange(sanitizePhoneInput(e.target.value))}
              aria-invalid={!!phoneError}
              aria-describedby={phoneError ? "customer-phone-error" : undefined}
              className="w-full outline-none min-w-0 text-gray-900"
            />
          </div>
          <FieldError id="customer-phone-error" message={phoneError} />
        </div>
      </div>
    </div>
  );
}
