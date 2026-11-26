"use client";

import { useEffect, useState } from "react";
import { PackageCheck, Truck, X, XCircle } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  refund_amount_cents: number;
  shipping_method: string;
  tracking_number: string;
  payment_provider: string;
  payment_reference: string;
  payment_is_simulated: number;
  created_at: string;
  customer_name: string;
  customer_email: string;
  shipping_address: { fullName?: string; line1?: string; city?: string; state?: string; postalCode?: string };
  items: Array<{ id: string; product_title: string; sku: string; quantity: number; unit_price_cents: number; total_cents: number }>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [tracking, setTracking] = useState("");
  const [fulfillment, setFulfillment] = useState("processing");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/orders");
    const data = (await res.json()) as { orders: OrderRow[] };
    setOrders(data.orders || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateOrder(id: string, payload: Record<string, unknown>) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSelected(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Orders &amp; Fulfillment</h1>
        <p className="text-sm text-slate-600">
          Track storefront orders, simulated sandbox payments, shipping fulfillment, cancellations, and refunds.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading orders...</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Fulfillment</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-bold text-navy-900">{o.order_number}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(o.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-900">{o.customer_name}</p>
                      <p className="text-xs text-slate-500">{o.customer_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          o.payment_status === "refunded"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {o.payment_status === "simulated_paid" ? "Sandbox Paid" : o.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-700">
                        {o.fulfillment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-navy-900">
                      {formatCurrency(o.total_cents)}
                      {o.refund_amount_cents > 0 && (
                        <div className="text-[11px] font-normal text-rose-600">
                          Refunded {formatCurrency(o.refund_amount_cents)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(o);
                          setTracking(o.tracking_number || "");
                          setFulfillment(o.fulfillment_status);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-slate-50"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-navy-900">Order {selected.order_number}</h2>
                <p className="text-xs text-slate-500">
                  {selected.customer_name} ({selected.customer_email}) • {formatDateTime(selected.created_at)}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-800">
              Payment Reference: <strong className="font-mono">{selected.payment_reference || "SIMULATED"}</strong> —
              Processed in Sandbox Simulated Checkout mode (no real card charged).
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-slate-500">Line Items</p>
              {selected.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                  <div>
                    <p className="font-semibold text-navy-900">{it.product_title}</p>
                    <p className="text-slate-500">
                      SKU: {it.sku} • Qty {it.quantity} × {formatCurrency(it.unit_price_cents)}
                    </p>
                  </div>
                  <span className="font-bold text-navy-900">{formatCurrency(it.total_cents)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-xs text-slate-600">
                <span>Shipping ({selected.shipping_method})</span>
                <span>{formatCurrency(selected.shipping_cents)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-navy-900">
                <span>Order Total</span>
                <span>{formatCurrency(selected.total_cents)}</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
              <p className="font-bold text-navy-900 mb-1">Shipping Destination</p>
              <p>{selected.shipping_address?.fullName || selected.customer_name}</p>
              <p>{selected.shipping_address?.line1}</p>
              <p>
                {selected.shipping_address?.city}, {selected.shipping_address?.state} {selected.shipping_address?.postalCode}
              </p>
            </div>

            {selected.status !== "cancelled" && (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Fulfillment Status</label>
                    <select
                      value={fulfillment}
                      onChange={(e) => setFulfillment(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="unfulfilled">Unfulfilled</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Tracking Number</label>
                    <input
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      placeholder="1Z999AA..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => updateOrder(selected.id, { cancelOrder: true })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Cancel &amp; Track Refund
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateOrder(selected.id, {
                        fulfillmentStatus: fulfillment,
                        status: fulfillment === "delivered" ? "delivered" : fulfillment === "shipped" ? "shipped" : "confirmed",
                        trackingNumber: tracking,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    {fulfillment === "shipped" ? <Truck className="h-3.5 w-3.5" /> : <PackageCheck className="h-3.5 w-3.5" />}
                    Save Fulfillment Update
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
