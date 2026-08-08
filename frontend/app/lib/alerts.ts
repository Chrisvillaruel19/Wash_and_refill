import Swal from "sweetalert2";

// Single shared SweetAlert2 configuration so every dialog in the app looks
// and behaves the same way — colors match the app's existing Tailwind
// palette (blue-600 primary actions, red-600 destructive/error, matching
// AdminSidebar/buttons throughout).
const swal = Swal.mixin({
  confirmButtonColor: "#2563eb", // blue-600
  cancelButtonColor: "#6b7280", // gray-500
  buttonsStyling: true,
  customClass: {
    popup: "rounded-2xl",
  },
});

export function alertSuccess(title: string, text?: string) {
  return swal.fire({ icon: "success", title, text, confirmButtonText: "OK" });
}

export function alertError(title: string, text?: string) {
  return swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonText: "OK",
    confirmButtonColor: "#dc2626", // red-600
  });
}

export function alertWarning(title: string, text?: string) {
  return swal.fire({ icon: "warning", title, text, confirmButtonText: "OK" });
}

export function alertInfo(title: string, text?: string) {
  return swal.fire({ icon: "info", title, text, confirmButtonText: "OK" });
}

// Promise resolves true only when the user actively confirms — cancelling
// or dismissing (Escape, backdrop click) both resolve false.
export async function confirmDialog(
  title: string,
  text?: string,
  confirmButtonText = "Confirm"
): Promise<boolean> {
  const result = await swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "Cancel",
    confirmButtonColor: "#dc2626",
    reverseButtons: true,
  });
  return result.isConfirmed;
}
