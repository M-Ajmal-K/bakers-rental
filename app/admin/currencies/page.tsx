// app/admin/currencies/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Coins, ArrowLeft, Save, Trash2, RefreshCcw, Pencil } from "lucide-react";

type Row = {
  code: string;
  name: string;
  rate: number;     // target currency per 1 FJD
  enabled: boolean;
  updated_at?: string | null;
};

const allowedCodes = [
  { code: "FJD", label: "Fijian Dollar" },
  { code: "USD", label: "US Dollar" },
  { code: "AUD", label: "Australian Dollar" },
];

function CurrenciesContent() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state
  const [form, setForm] = useState<Row>({
    code: "USD",
    name: "US Dollar",
    rate: 0.44,
    enabled: true,
  });
  const isFJD = useMemo(() => form.code === "FJD", [form.code]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/currencies", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const items: Row[] = json?.items || [];
      // force FJD to rate=1 in UI
      setRows(
        items.map((r) =>
          r.code === "FJD"
            ? { ...r, rate: 1, enabled: true, name: r.name || "Fijian Dollar" }
            : r
        )
      );
    } catch (e: any) {
      alert(e?.message || "Failed to load currencies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pick = (r: Row) => {
    setForm({
      code: r.code,
      name: r.name || r.code,
      rate: r.code === "FJD" ? 1 : Number(r.rate || 0),
      enabled: r.code === "FJD" ? true : !!r.enabled,
    });
  };

  const resetTo = (code: string) => {
    const meta = allowedCodes.find((c) => c.code === code)!;
    setForm({
      code,
      name: meta.label,
      rate: code === "FJD" ? 1 : 1, // placeholder; admin will type actual rate
      enabled: code === "FJD" ? true : true,
    });
  };

  const onChangeField = (patch: Partial<Row>) => setForm((p) => ({ ...p, ...patch }));

  const onSave = async () => {
    setSaving(true);
    try {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name?.trim() || form.code.toUpperCase(),
        rate: form.code === "FJD" ? 1 : Number(form.rate),
        enabled: form.code === "FJD" ? true : !!form.enabled,
      };

      const res = await fetch("/api/admin/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Save failed");

      await load();
      alert("Saved");
    } catch (e: any) {
      alert(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (code: string) => {
    if (code === "FJD") {
      alert("FJD cannot be deleted.");
      return;
    }
    if (!confirm(`Delete currency ${code}?`)) return;
    try {
      const res = await fetch(`/api/admin/currencies?code=${encodeURIComponent(code)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error || "Delete failed");
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to delete");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />

      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-slate-950/70 via-slate-900/40 to-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin/dashboard" className="text-white/80 hover:text-white flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="text-white/80">Currencies & Rates</div>
          <div />
        </div>
      </nav>

      <section className="py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Currencies & Rates</h1>
            <p className="text-white/70">
              Define how prices display on the customer booking page.{" "}
              <b>Rate = units of currency per 1 FJD</b>. (FJD is fixed at 1.00 and always enabled.)
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* List */}
            <Card className="border-0 bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Coins className="h-5 w-5" /> Existing Currencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-white/70 text-sm">
                    {loading ? "Loading…" : `${rows.length} item${rows.length === 1 ? "" : "s"}`}
                  </div>
                  <Button
                    variant="outline"
                    onClick={load}
                    className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {/* Mobile: stacked cards (no horizontal scroll) */}
                <div className="md:hidden space-y-3">
                  {rows.length === 0 && !loading ? (
                    <div className="text-white/70 text-sm py-4 text-center">No currencies found.</div>
                  ) : (
                    rows.map((r) => (
                      <div
                        key={r.code}
                        className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold">{r.code}</span>
                              {r.code === "FJD" ? (
                                <Badge className="bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30">
                                  Always on
                                </Badge>
                              ) : r.enabled ? (
                                <Badge className="bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30">
                                  Enabled
                                </Badge>
                              ) : (
                                <Badge className="bg-white/10 text-white/80 ring-1 ring-white/20">Disabled</Badge>
                              )}
                            </div>
                            <div className="text-white/80 text-sm">{r.name}</div>
                            <div className="text-white/90 text-sm mt-1">
                              Rate (per 1 FJD):{" "}
                              <span className="font-mono">
                                {fmt(r.code === "FJD" ? 1 : Number(r.rate || 0))}
                              </span>
                            </div>
                            <div className="text-white/60 text-xs mt-1">
                              {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pick(r)}
                              className="bg-white/5 hover:bg-white/10 border-white/10 text-white h-8"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {r.code !== "FJD" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDelete(r.code)}
                                className="bg-red-500/10 hover:bg-red-500/20 border-red-400/30 text-red-200 h-8"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop: table view */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/80">Code</TableHead>
                        <TableHead className="text-white/80">Name</TableHead>
                        <TableHead className="text-white/80">Rate (per 1 FJD)</TableHead>
                        <TableHead className="text-white/80">Enabled</TableHead>
                        <TableHead className="text-white/80">Updated</TableHead>
                        <TableHead className="text-white/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.code} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-semibold text-white">{r.code}</TableCell>
                          <TableCell className="text-white">{r.name}</TableCell>
                          <TableCell className="text-white">
                            {fmt(r.code === "FJD" ? 1 : Number(r.rate || 0))}
                          </TableCell>
                          <TableCell>
                            {r.code === "FJD" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30">
                                Always on
                              </Badge>
                            ) : r.enabled ? (
                              <Badge className="bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30">
                                Enabled
                              </Badge>
                            ) : (
                              <Badge className="bg-white/10 text-white/80 ring-1 ring-white/20">Disabled</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-white/70 text-xs">
                            {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell className="space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pick(r)}
                              className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
                            >
                              Edit
                            </Button>
                            {r.code !== "FJD" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDelete(r.code)}
                                className="bg-red-500/10 hover:bg-red-500/20 border-red-400/30 text-red-200"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {rows.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-white/70 py-8">
                            No currencies found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Form */}
            <Card className="border-0 bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/10">
              <CardHeader>
                <CardTitle className="text-white">Add / Edit Currency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="code" className="text-white/80">
                        Code
                      </Label>
                      <select
                        id="code"
                        value={form.code}
                        onChange={(e) => resetTo(e.target.value)}
                        className="mt-2 w-full h-10 rounded bg-white/5 border border-white/10 text-white px-2 currency-select"
                      >
                        {allowedCodes.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="name" className="text-white/80">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => onChangeField({ name: e.target.value })}
                        className="mt-2 h-10 bg-white/5 border-white/10 text-white"
                        placeholder="Display name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <Label htmlFor="rate" className="text-white/80">
                        Rate (per 1 FJD)
                      </Label>
                      <Input
                        id="rate"
                        type="number"
                        inputMode="decimal"
                        step="0.0001"
                        min={0}
                        value={isFJD ? 1 : form.rate}
                        onChange={(e) => onChangeField({ rate: Number(e.target.value) })}
                        className="mt-2 h-10 bg-white/5 border-white/10 text-white disabled:opacity-60"
                        disabled={isFJD}
                      />
                      <p className="text-xs text-white/50 mt-1">
                        Example: If 1 FJD = 0.44 USD, set USD rate to <b>0.44</b>.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isFJD ? true : form.enabled}
                        onCheckedChange={(v) => onChangeField({ enabled: v })}
                        disabled={isFJD}
                      />
                      <span className="text-white/80">{isFJD ? "Always enabled" : "Enabled"}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={onSave}
                      disabled={saving}
                      className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-white/60 text-sm">
            Heads up: The customer booking page will read from{" "}
            <code className="text-white/80">/api/public/currencies</code>. We’ll wire the currency switcher there next so
            totals and payment instructions display in the chosen currency.
          </div>
        </div>
      </section>

      {/* Force dark dropdown options to match theme */}
      <style jsx global>{`
        select.currency-select option,
        select.currency-select optgroup {
          background-color: #0f172a; /* slate-900 */
          color: #f8fafc;           /* slate-50 */
        }
      `}</style>
    </div>
  );
}

export default function AdminCurrenciesPage() {
  return (
    <AdminAuthGuard>
      <CurrenciesContent />
    </AdminAuthGuard>
  );
}
