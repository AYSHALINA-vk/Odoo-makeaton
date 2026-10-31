"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";
import {
  Layers,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Clock,
  ArrowRight,
  Play,
  Pause,
  RotateCw,
  XCircle,
  FileCheck2,
} from "lucide-react";

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions?status=${statusFilter}`);
      const json = await res.json();
      setSubscriptions(json.subscriptions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSubscriptions();
      } else {
        alert(data.error || "Action failed");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = subscriptions.filter(
    (s) =>
      s.number.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_company?.toLowerCase().includes(search.toLowerCase()) ||
      s.plan_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Check for upcoming renewals (<= 14 days)
  const today = new Date();
  const upcomingRenewals = subscriptions.filter((s) => {
    if (s.status !== "active") return false;
    const expiry = new Date(s.expiry_date);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14;
  });

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-1">
              Recurring Business Operations
            </div>
            <h1 className="text-2xl font-extrabold text-white">Subscriptions Lifecycle</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Single source of truth: Draft &rarr; Quotation &rarr; Confirmed &rarr; Active &rarr; Closed.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/templates"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-brand-400" />
              Use Quotation Template
            </Link>
          </div>
        </div>

        {/* Renewal Alerts Banner (Directly addressing "renewals remembered by whoever notices first") */}
        {upcomingRenewals.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-amber-300">Upcoming Renewals Alert: </span>
                <span className="text-zinc-300">
                  {upcomingRenewals.length} subscription(s) expiring within the next 14 days!
                </span>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {upcomingRenewals.map((r) => `${r.number} (${r.customer_name})`).join(", ")}
                </div>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter("active")}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-200 hover:text-black font-semibold text-xs transition-colors shrink-0"
            >
              Review Renewals
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs">
            {["all", "active", "quotation", "confirmed", "draft", "paused", "closed"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                    statusFilter === tab
                      ? "bg-brand-500 text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by #, customer, plan..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-6">Subscription #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Plan & Cycle</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Next Billing Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map((sub) => (
                <tr key={sub.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3.5 px-6 font-mono font-bold text-white">
                    <Link
                      href={`/staff/subscriptions/${sub.id}`}
                      className="hover:text-brand-400 flex items-center gap-1.5"
                    >
                      {sub.number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-zinc-200">
                    {sub.customer_name}
                    {sub.customer_company && (
                      <span className="block text-[11px] text-zinc-400">
                        {sub.customer_company}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    <span className="font-semibold text-white">{sub.plan_name}</span>
                    <span className="block text-[11px] text-zinc-400 capitalize">
                      ({sub.billing_period})
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-white">
                    ${Number(sub.sub_total || sub.plan_price || 0).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-brand-400">
                    {sub.next_billing_date}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {sub.status === "draft" && (
                        <button
                          onClick={() => handleAction(sub.id, "send_quotation")}
                          className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500 hover:text-white transition-all font-semibold"
                        >
                          Send Quote
                        </button>
                      )}

                      {sub.status === "quotation" && (
                        <button
                          onClick={() => handleAction(sub.id, "confirm")}
                          className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-all font-semibold"
                        >
                          Confirm
                        </button>
                      )}

                      {sub.status === "confirmed" && (
                        <button
                          onClick={() => handleAction(sub.id, "activate")}
                          className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all font-semibold"
                        >
                          Activate
                        </button>
                      )}

                      {sub.status === "active" && sub.pausable && (
                        <button
                          onClick={() => handleAction(sub.id, "pause")}
                          title="Pause subscription"
                          className="p-1 rounded bg-zinc-800 text-amber-400 hover:bg-amber-500 hover:text-black transition-colors"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {sub.status === "paused" && (
                        <button
                          onClick={() => handleAction(sub.id, "resume")}
                          title="Resume subscription"
                          className="p-1 rounded bg-zinc-800 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {sub.renewable && (
                        <button
                          onClick={() => handleAction(sub.id, "renew")}
                          title="Renew by 1 term"
                          className="p-1 rounded bg-zinc-800 text-sky-400 hover:bg-sky-500 hover:text-white transition-colors"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <Link
                        href={`/staff/subscriptions/${sub.id}`}
                        className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:text-white font-medium ml-1"
                      >
                        Detail &rarr;
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
