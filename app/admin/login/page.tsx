// app/admin/login/page.tsx
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Car, Lock, User, Shield } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLoginPage() {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/admin") ? nextParam : "/admin/dashboard";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // If already authenticated as admin via Supabase, set the opaque cookie then redirect.
  useEffect(() => {
    if (!isMounted) return;
    let cancelled = false;

    (async () => {
      try {
        const { data: userRes, error: getUserErr } = await supabase.auth.getUser();
        if (!getUserErr && userRes?.user && userRes.user.app_metadata?.role === "admin") {
          // Get access token
          const { data: sessRes } = await supabase.auth.getSession();
          const accessToken = sessRes.session?.access_token;
          if (!accessToken) return;

          // Set server cookie so middleware lets us through
          const res = await fetch("/api/admin/session/sync", {
            method: "POST",
            credentials: "include",
            headers: {
              "Cache-Control": "no-store",
              Authorization: `Bearer ${accessToken}`,
            },
          });
          if (res.ok && !cancelled) {
            router.replace(safeNext);
          }
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isMounted, router, safeNext]);

  // Simple entrance animation prep (unchanged)
  useEffect(() => {
    if (!isMounted) return;
    const handleVisibility = () => {
      document.querySelectorAll(".fade-in-up").forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
          el.classList.add("animate");
        }
      });
    };
    handleVisibility();
  }, [isMounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const email = credentials.username.trim();
      const password = credentials.password;

      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) {
        setError(signInErr.message || "Invalid email or password");
        return;
      }

      const role = data.user?.app_metadata?.role;
      if (role !== "admin") {
        setError("This account is not authorized for admin access.");
        await supabase.auth.signOut().catch(() => {});
        return;
      }

      // Get the access token (prefer from the sign-in result; fallback to getSession)
      const accessToken =
        data.session?.access_token ||
        (await supabase.auth.getSession()).data.session?.access_token;

      if (!accessToken) {
        setError("Could not finalize session (no access token).");
        return;
      }

      // Ask the server to set the opaque admin_session cookie (middleware depends on this).
      const syncRes = await fetch("/api/admin/session/sync", {
        method: "POST",
        credentials: "include",
        headers: {
          "Cache-Control": "no-store",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!syncRes.ok) {
        const j = await syncRes.json().catch(() => ({}));
        setError(String(j?.error || "Could not finalize session."));
        return;
      }

      // Auth OK → go to ?next= or dashboard
      router.replace(safeNext);
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent via-primary to-secondary" />
      <div className="absolute inset-0 bg-black/40" />

      {/* Animated particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Floating shapes */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/5 rounded-full blur-xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-10 w-16 h-16 bg-white/5 rounded-full blur-xl animate-pulse" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="fade-in-up text-center mb-12">
            <Link href="/" className="inline-flex items-center space-x-3 group">
              <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Car className="h-8 w-8 text-white" />
              </div>
              <div className="text-left">
                <span className="text-3xl font-bold text-white drop-shadow-lg">Bakers Rentals</span>
                <p className="text-white/80 text-sm font-medium">Admin Portal</p>
              </div>
            </Link>
          </div>

          <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
            <Card className="card-3d border-0 glass-effect-dark">
              <CardHeader className="text-center pb-8">
                <div className="w-20 h-20 gradient-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="flex items-center justify-center gap-3 text-2xl text-white">
                  <Lock className="h-6 w-6 text-white" />
                  Secure Admin Access
                </CardTitle>
                <p className="text-white/80 mt-2">Sign in to access the admin dashboard</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on">
                  {error && (
                    <Alert variant="destructive" className="bg-red-500/20 border-red-500/30 text-white">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="username" className="text-white font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-4 h-5 w-5 text-white/60" />
                      <Input
                        id="username"
                        name="username"
                        type="email"
                        placeholder="Enter email"
                        value={credentials.username}
                        onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                        className="pl-12 h-14 btn-3d glass-effect-dark text-white placeholder:text-white/50 border-white/20"
                        required
                        disabled={isLoading}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-white font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-white/60" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter password"
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        className="pl-12 h-14 btn-3d glass-effect-dark text-white placeholder:text-white/50 border-white/20"
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-3d pulse-glow bg-white text-primary hover:bg-white/90 h-14 text-lg font-bold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Access Dashboard"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8 fade-in-up" style={{ animationDelay: "0.4s" }}>
            <Link href="/" className="text-white/80 hover:text-white transition-colors font-medium">
              ← Back to main site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
