// lib/actions/confirmBooking.ts
export async function confirmBooking(args: { id?: string; code?: string }) {
  const payload = args.id ? { id: args.id } : { code: args.code };
  const res = await fetch("/api/bookings/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to confirm booking.");
  }
  return res.json(); // { ok: true, booking: {...} }
}
