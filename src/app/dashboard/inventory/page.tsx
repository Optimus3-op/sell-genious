"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownUp, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface InvItem {
  id: string;
  product_id: string;
  quantity: number;
  low_stock_threshold: number;
  updated_at: string;
  title: string;
  sku: string;
  category: string;
  status: string;
}

interface InvMovement {
  id: string;
  product_title: string;
  sku: string;
  delta: number;
  reason: string;
  previous_qty: number;
  new_qty: number;
  created_at: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InvItem[]>([]);
  const [movements, setMovements] = useState<InvMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<InvItem | null>(null);
  const [newQty, setNewQty] = useState("0");
  const [reason, setReason] = useState("Restock shipment received");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/inventory");
    const data = (await res.json()) as { items: InvItem[]; movements: InvMovement[] };
    setItems(data.items || []);
    setMovements(data.movements || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!adjusting) return;
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: adjusting.product_id,
        newQuantity: Number(newQty),
        reason,
      }),
    });
    setAdjusting(null);
    load();
  }

  const lowStockCount = items.filter((i) => i.quantity <= i.low_stock_threshold).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Inventory &amp; Stock Ledger</h1>
          <p className="text-sm text-slate-600">
            Real-time stock tracking, low-stock alerts, manual adjustments, and movement history.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold">
          {lowStockCount > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-800">{lowStockCount} SKU(s) need restock</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700">All SKUs healthy</span>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading inventory...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3.5 font-bold text-sm text-navy-900">
              Current Stock Levels
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Availability</th>
                    <th className="px-4 py-3">Threshold</th>
                    <th className="px-4 py-3 text-right">Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const isLow = item.quantity <= item.low_stock_threshold;
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-navy-900">{item.title}</p>
                          <p className="text-xs font-mono text-slate-500">{item.sku}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              item.quantity === 0
                                ? "bg-rose-100 text-rose-700"
                                : isLow
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {item.quantity} in stock
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.low_stock_threshold} units</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjusting(item);
                              setNewQty(String(item.quantity));
                              setReason("Manual restock adjustment");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-slate-50"
                          >
                            <ArrowDownUp className="h-3.5 w-3.5" /> Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-navy-900">Stock Movement History</h2>
            <p className="mt-0.5 text-xs text-slate-500">Every order deduction, cancellation restock &amp; manual edit.</p>
            <div className="mt-4 max-h-[480px] space-y-3 overflow-y-auto pr-1">
              {movements.map((m) => (
                <div key={m.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between font-semibold text-navy-900">
                    <span className="truncate pr-2">{m.product_title}</span>
                    <span className={m.delta >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {m.delta >= 0 ? `+${m.delta}` : m.delta}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">{m.reason}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {m.previous_qty} → {m.new_qty} units • {formatDateTime(m.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {adjusting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={submitAdjustment} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-navy-900">Adjust Stock: {adjusting.title}</h2>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">New Stock Quantity</label>
              <input
                type="number"
                min="0"
                required
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Reason</label>
              <input
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjusting(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white">
                Save Stock Update
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
