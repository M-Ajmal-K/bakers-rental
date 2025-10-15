// hooks/useCurrencies.ts
"use client";

import { useEffect, useMemo, useState } from "react";

export type CurrencyItem = {
  code: string;
  name: string;
  /** units of THIS currency you get for 1 FJD (i.e., 1 / rate_to_fjd) */
  rateFromFjd: number;
};

export function useCurrencies() {
  const [items, setItems] = useState<CurrencyItem[]>([
    { code: "FJD", name: "Fijian Dollar", rateFromFjd: 1 },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public/currencies", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();

        // Accept several shapes: { items: [...] } | [...] | { currencies: [...] }
        const arr: any[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json?.currencies)
          ? json.currencies
          : [];

        const next: CurrencyItem[] = [
          { code: "FJD", name: "Fijian Dollar", rateFromFjd: 1 },
        ];

        for (const row of arr) {
          const code = String(row?.code ?? row?.currency ?? "").toUpperCase().trim();
          if (!code || code === "FJD") continue;
          const name = String(row?.name ?? code);

          // We want rateFromFjd (units of this currency per 1 FJD).
          // Prefer explicit fields if present; otherwise derive from rate_to_fjd (FJD per 1 unit).
          let rateFromFjd = 0;

          if (row?.rate_from_fjd != null && Number(row.rate_from_fjd) > 0) {
            rateFromFjd = Number(row.rate_from_fjd);
          } else if (row?.rate != null && Number(row.rate) > 0) {
            rateFromFjd = Number(row.rate);
          } else if (row?.fjd_per_unit != null && Number(row.fjd_per_unit) > 0) {
            // fjd_per_unit = FJD per 1 unit → invert
            rateFromFjd = 1 / Number(row.fjd_per_unit);
          } else if (row?.rate_to_fjd != null && Number(row.rate_to_fjd) > 0) {
            // rate_to_fjd = FJD per 1 unit → invert
            rateFromFjd = 1 / Number(row.rate_to_fjd);
          }

          const active = (row?.is_active ?? row?.active ?? true) === true;
          if (active && Number.isFinite(rateFromFjd) && rateFromFjd > 0) {
            next.push({ code, name, rateFromFjd });
          }
        }

        if (next.length) setItems(next);
      } catch (e: any) {
        setError(e?.message || "Failed to load currencies");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const map = useMemo(() => {
    const m = new Map<string, CurrencyItem>();
    items.forEach((i) => m.set(i.code, i));
    return m;
  }, [items]);

  return { items, map, loading, error };
}

/** Format an amount that is STORED in FJD into the selected currency. */
export function formatMoneyFjd(
  amountFjd: number,
  code: string,
  map: Map<string, CurrencyItem>
) {
  const item =
    map.get(code) || { code: "FJD", name: "Fijian Dollar", rateFromFjd: 1 };
  const converted =
    (Number.isFinite(amountFjd) ? amountFjd : 0) * (item.rateFromFjd || 1);
  return `${converted.toFixed(2)} ${item.code}`;
}
