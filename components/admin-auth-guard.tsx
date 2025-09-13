"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Car } from "lucide-react";

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "GET",
          credentials: "include",
          headers: { "Cache-Control": "no-store" },
          signal: ac.signal,
        });

        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (res.ok && data?.authed) {
          setAuthed(true);
          setReady(true);
        } else {
          const next = encodeURIComponent(pathname || "/admin/dashboard");
          router.replace(`/admin/login?next=${next}`);
        }
      } catch {
        if (!cancelled) {
          const next = encodeURIComponent(pathname || "/admin/dashboard");
          router.replace(`/admin/login?next=${next}`);
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [router, pathname]);

  // Loading / auth check screen (prevents content flash)
  if (!ready || !authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent via-primary to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Car className="h-8 w-8 text-white" />
          </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white/80 font-medium">Authenticating…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
