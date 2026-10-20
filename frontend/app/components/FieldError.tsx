// Validation message shown directly under the input it belongs to. Pair the
// input with aria-invalid and aria-describedby={id} so screen readers read it.
export default function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-red-600 text-sm mt-1">
      {message}
    </p>
  );
}
