"use client";

import { User, Phone } from "lucide-react";

interface CustomerInfoFormProps {
  customerName: string;
  phoneNumber: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}

export default function CustomerInfoForm({
  customerName,
  phoneNumber,
  onNameChange,
  onPhoneChange,
}: CustomerInfoFormProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-3">Customer Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Customer Name</label>
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
            <User size={18} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full outline-none min-w-0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
            <Phone size={18} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(e) => onPhoneChange(e.target.value)}
              className="w-full outline-none min-w-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}