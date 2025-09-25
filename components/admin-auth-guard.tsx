// components/admin-auth-guard.tsx
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Car } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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

    (async () => {
      try {
        // 1) Check Supabase session (source of truth)
        const { data: userRes, error } = await supabase.auth.getUser();
        const user = userRes?.user;

        if (!error && user && user.app_metadata?.role === "admin") {
          // 2) Get access token for backend sync
          const { data: sessRes } = await supabase.auth.getSession();
          const accessToken = sessRes.session?.access_token;

          if (accessToken) {
            // 3) Ensure the opaque cookie exists so middleware allows /admin/*
            const sync = await fetch("/api/admin/session/sync", {
              method: "POST",
              credentials: "include",
              headers: {
                "Cache-Control": "no-store",
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (!cancelled && sync.ok) {
              setAuthed(true);
              setReady(true);
              return;
            }
          }
        }

        // Not signed in OR not admin OR sync failed → send to login
        if (!cancelled) {
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
    };
  }, [router, pathname]);

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
