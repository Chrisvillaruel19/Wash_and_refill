"use client";

import { Plus } from "lucide-react";
import { Package } from "../../../staff/(dashboard)/neworder/types";

interface PackageGridProps {
  packages: Package[];
  onAdd: (pkg: Package) => void;
}

export default function PackageGrid({ packages, onAdd }: PackageGridProps) {
  return (
    <div>
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold">DROP OFF</h3>
        <p className="text-xs text-gray-500 uppercase">Same day release</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`${pkg.color} text-white rounded-xl p-5 relative`}
          >
            <button
              onClick={() => onAdd(pkg)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
            >
              <Plus size={18} />
            </button>
            <h4 className="text-lg font-bold mb-2">{pkg.name}</h4>
            <p className="text-2xl font-bold mb-2">₱ {pkg.price.toFixed(2)}</p>
            <p className="text-xs opacity-90">Liquid Detergent: {pkg.liquidDetergent}</p>
            <p className="text-xs opacity-90">Downy: {pkg.downy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}