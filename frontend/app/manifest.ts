import type { MetadataRoute } from "next";

// Web app manifest — makes the app installable ("Add to Home screen" /
// "Install app") on phones, tablets and desktop. Served at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wash & Refill Laundry",
    short_name: "Wash & Refill",
    description: "Orders, supplies, attendance and sales for Wash & Refill Laundry.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#0284c7",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
