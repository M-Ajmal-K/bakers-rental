"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { confirmBooking } from "@/lib/actions/confirmBooking";

type Props = {
  id?: string;   // booking id (uuid)
  code?: string; // or booking code like "BR-1008"
  onDone?: () => void; // optional callback (e.g., refetch)
};

export default function ConfirmBookingButton({ id, code, onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canRun = Boolean(id || code);

  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={loading || !canRun}
        onClick={async () => {
          setErr(null);
          setLoading(true);
          try {
            await confirmBooking({ id, code });
            // if parent passes a refetch/refresh callback, use it; otherwise just reload
            if (onDone) onDone();
            else window.location.reload();
          } catch (e: any) {
            setErr(e?.message || "Failed to confirm booking.");
          } finally {
            setLoading(false);
          }
        }}
        className="btn-3d"
      >
        <Check className="w-4 h-4 mr-2" />
        {loading ? "Confirming…" : "Confirm"}
      </Button>

      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
