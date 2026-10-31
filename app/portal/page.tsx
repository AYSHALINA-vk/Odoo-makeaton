"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";
import {
  Layers,
  Pause,
  Play,
  RotateCw,
  XCircle,
  FileText,
  CreditCard,
  UserCheck,
  Clock,
} from "lucide-react";

export default function CustomerPortalPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const sRes = await fetch("/api/subscriptions");
      const sJson = await sRes.json();
      setSubscriptions(sJson.subscriptions || []);

      const iRes = await fetch("/api/invoices");
      const iJson = await iRes.json();
      setInvoices(iJson.invoices || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Action updated successfully");
        fetchData();
      } else {
        alert(data.error || "Action not permitted");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const outstandingBalance = invoices
    .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
    .reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.amount_paid)), 0);

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-1">
              Customer Self-Service Portal
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Welcome back, {user?.name || "Customer"}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage your active plans, review billing schedules, and download invoices directly without emailing support.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal/invoices"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-800 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-brand-400" />
              View Invoices ({invoices.length})
            </Link>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="text-xs text-zinc-400 mb-1">My Subscriptions</div>
            <div className="text-2xl font-extrabold text-white font-mono">
              {subscriptions.length} Contract(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {subscriptions.filter((s) => s.status === "active").length} currently active
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="text-xs text-zinc-400 mb-1">Outstanding Balance</div>
            <div
              className={`text-2xl font-extrabold font-mono ${
                outstandingBalance > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              ${outstandingBalance.toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {outstandingBalance === 0 ? "All invoices settled" : "Due for payment"}
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="text-xs text-zinc-400 mb-1">Registered Account</div>
            <div className="text-sm font-semibold text-white truncate">{user?.email}</div>
            <div className="text-[11px] text-brand-400 mt-1 font-mono">Single Tenant Isolation Enabled</div>
          </div>
        </div>

        {/* Subscriptions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-400" />
              My Subscriptions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-base font-bold text-white">{sub.number}</span>
                    <StatusBadge status={sub.status} />
                  </div>

                  <div className="text-sm font-bold text-brand-400">{sub.plan_name}</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Billing Cycle: <strong className="text-zinc-200 capitalize">{sub.billing_period}</strong> • Terms:{" "}
                    <span className="text-zinc-300">{sub.payment_terms_name}</span>
                  </div>

                  <div className="my-4 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Total Recurring Price:</span>
                      <span className="font-mono text-white font-bold text-sm">
                        ${Number(sub.sub_total || sub.plan_price || 0).toFixed(2)} / {sub.billing_period}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Next Scheduled Billing:</span>
                      <span className="font-mono text-brand-400 font-semibold">{sub.next_billing_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Current Term Expiry:</span>
                      <span className="font-mono text-zinc-300">{sub.expiry_date}</span>
                    </div>
                  </div>
                </div>

                {/* Self-Service Actions (governed by plan flags) */}
                <div className="pt-3 border-t border-zinc-800">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    Self-Service Actions:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sub.status === "active" && sub.pausable && (
                      <button
                        onClick={() => handleAction(sub.id, "pause")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 text-xs font-semibold border border-zinc-800 transition-colors"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        Pause Subscription
                      </button>
                    )}

                    {sub.status === "paused" && (
                      <button
                        onClick={() => handleAction(sub.id, "resume")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Resume Subscription
                      </button>
                    )}

                    {sub.renewable && (
                      <button
                        onClick={() => handleAction(sub.id, "renew")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-sky-400 text-xs font-semibold border border-zinc-800 transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Renew for Another Term
                      </button>
                    )}

                    {sub.closable && sub.status !== "closed" && (
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to close this subscription?")) {
                            handleAction(sub.id, "close");
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-rose-400 text-xs font-semibold border border-zinc-800 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Close Subscription
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
