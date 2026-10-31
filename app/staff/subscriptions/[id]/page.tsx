"use client";

import React, { useEffect, useState, use } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Layers,
  CreditCard,
  User,
  CheckCircle,
  Clock,
  Play,
  Pause,
  RotateCw,
  XCircle,
  FileText,
  AlertCircle,
} from "lucide-react";

export default function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${id}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const resData = await res.json();
      if (resData.success) {
        fetchDetail();
      } else {
        alert(resData.error || "Action failed");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading || !data?.subscription) {
    return (
      <div className="flex-1 flex bg-[#090a0f]">
        <Sidebar />
        <main className="flex-1 p-8 text-zinc-400">Loading subscription...</main>
      </div>
    );
  }

  const sub = data.subscription;
  const lines = data.lines || [];
  const invoices = data.invoices || [];

  const stages = ["draft", "quotation", "confirmed", "active", "closed"];
  const currentStageIndex = stages.indexOf(sub.status.toLowerCase());

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        {/* Back Link */}
        <Link
          href="/staff/subscriptions"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Subscriptions Directory
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-mono font-extrabold text-white">{sub.number}</h1>
              <StatusBadge status={sub.status} />
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Started: <span className="font-mono text-zinc-300">{sub.start_date}</span> • Expiry:{" "}
              <span className="font-mono text-zinc-300">{sub.expiry_date}</span> • Next Billing:{" "}
              <span className="font-mono text-brand-400 font-bold">{sub.next_billing_date}</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {sub.status === "draft" && (
              <button
                onClick={() => handleAction("send_quotation")}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Send as Quotation
              </button>
            )}

            {sub.status === "quotation" && (
              <button
                onClick={() => handleAction("confirm")}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Confirm Subscription
              </button>
            )}

            {sub.status === "confirmed" && (
              <button
                onClick={() => handleAction("activate")}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Activate Subscription
              </button>
            )}

            {sub.status === "active" && sub.pausable && (
              <button
                onClick={() => handleAction("pause")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 text-xs font-semibold border border-zinc-800 transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </button>
            )}

            {sub.status === "paused" && (
              <button
                onClick={() => handleAction("resume")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                Resume
              </button>
            )}

            {sub.renewable && (
              <button
                onClick={() => handleAction("renew")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-sky-400 text-xs font-semibold border border-zinc-800 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Renew Term
              </button>
            )}

            {sub.closable && sub.status !== "closed" && (
              <button
                onClick={() => handleAction("close")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-rose-400 text-xs font-semibold border border-zinc-800 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Close Early
              </button>
            )}
          </div>
        </div>

        {/* State Machine Stepper */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            Lifecycle Progress:
          </div>
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-zinc-800 z-0" />
            {stages.map((stage, idx) => {
              const isPast = idx <= currentStageIndex;
              const isCurrent = idx === currentStageIndex;

              return (
                <div key={stage} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-brand-500 text-white ring-4 ring-brand-500/20 orange-glow-sm"
                        : isPast
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-semibold uppercase mt-2 ${
                      isCurrent
                        ? "text-brand-400"
                        : isPast
                        ? "text-zinc-300"
                        : "text-zinc-600"
                    }`}
                  >
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer & Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Info */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3 text-xs">
            <div className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Customer Details
            </div>
            <div className="text-base font-bold text-white">{sub.customer_name}</div>
            {sub.customer_company && (
              <div className="text-zinc-300 font-medium">{sub.customer_company}</div>
            )}
            <div className="text-zinc-400">Email: {sub.customer_email}</div>
            {sub.customer_phone && <div className="text-zinc-400">Phone: {sub.customer_phone}</div>}
            {sub.billing_address && (
              <div className="text-zinc-400 pt-2 border-t border-zinc-800">
                Address: {sub.billing_address}
              </div>
            )}
          </div>

          {/* Plan Info */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3 text-xs">
            <div className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Plan & Terms
            </div>
            <div className="text-base font-bold text-white">
              {sub.plan_name} (${Number(sub.plan_price).toFixed(2)} / {sub.billing_period})
            </div>
            <div className="text-zinc-400">
              Payment Terms: <strong className="text-zinc-200">{sub.payment_terms_name} ({sub.days_due} days due)</strong>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex flex-wrap gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  sub.auto_close ? "bg-amber-500/10 text-amber-400" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                Auto-Close: {sub.auto_close ? "Yes" : "No"}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  sub.pausable ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                Pausable: {sub.pausable ? "Yes" : "No"}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  sub.renewable ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                Renewable: {sub.renewable ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Lines Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Subscription Product Lines</h3>
            <span className="text-xs text-zinc-400">{lines.length} configured line item(s)</span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-6">Product</th>
                <th className="py-3 px-4">Variant & Extra</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4">Tax Rule</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-6 text-right">Line Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {lines.map((l: any) => (
                <tr key={l.id} className="hover:bg-zinc-900/40">
                  <td className="py-3.5 px-6 font-semibold text-white">
                    {l.product_name}
                    <span className="block text-[11px] text-zinc-400 capitalize">
                      {l.product_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    {l.variant_name ? (
                      <span className="font-semibold text-brand-400">
                        {l.variant_name} (+${Number(l.variant_extra).toFixed(2)})
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-white">
                    {l.quantity}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-zinc-200">
                    ${Number(l.unit_price).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    {l.tax_name ? `${l.tax_name} (${l.tax_rate}%)` : "Zero Tax (0%)"}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    {l.discount_name ? (
                      <span className="text-emerald-400 font-semibold">{l.discount_name}</span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono font-bold text-white">
                    ${Number(l.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoices Generated for this Subscription */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Invoices History</h3>
            <span className="text-xs text-zinc-400">{invoices.length} invoice(s)</span>
          </div>

          {invoices.length > 0 ? (
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-6">Invoice #</th>
                  <th className="py-3 px-4">Billing Period</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-zinc-900/40">
                    <td className="py-3 px-6 font-mono font-bold text-brand-400">
                      <Link href={`/staff/invoices/${inv.id}`} className="hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {inv.period_start} to {inv.period_end}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300">{inv.due_date}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ${Number(inv.total).toFixed(2)}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <Link
                        href={`/staff/invoices/${inv.id}`}
                        className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-700 transition-colors"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500">
              No invoices generated yet. Invoices generate on Billing Day when next_billing_date arrives.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
