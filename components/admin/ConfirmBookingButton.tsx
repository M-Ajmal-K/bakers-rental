"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type Props = {
  id?: string;   // booking id (uuid)
  code?: string; // optional booking code like "BR-1008"
  onDone?: () => void; // optional callback (e.g., refetch/refresh UI)
};

export default function ConfirmBookingButton({ id, code, onDone }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const canRun = Boolean(id || code);
  const disabled = state === "loading" || state === "success" || !canRun;

  const confirm = async () => {
    if (disabled) return;
    setErr(null);
    setState("loading");
    try {
      const res = await fetch("/api/bookings/confirm", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({ id, code }),
      });

      if (!res.ok) {
        let msg = "";
        try {
          const j = await res.json();
          msg = j?.error || j?.message || "";
        } catch {}
        throw new Error(msg || `Failed to confirm (HTTP ${res.status})`);
      }

      // Optimistic success
      setState("success");
      onDone?.(); // let the parent update the row/UI without a full reload
    } catch (e: any) {
      setErr(e?.message || "Failed to confirm booking.");
      setState("error");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        disabled={disabled}
        aria-disabled={disabled}
        onClick={confirm}
        className="btn-3d"
      >
        <Check className="w-4 h-4 mr-2" />
        {state === "loading" ? "Confirming…" : state === "success" ? "Confirmed" : "Confirm"}
      </Button>

      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}
