"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import {
  DollarSign,
  TrendingUp,
  Layers,
  AlertTriangle,
  Calendar,
  Download,
  Clock,
  ArrowUpRight,
  RefreshCw,
  FileText,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  quotation: "#38bdf8",
  confirmed: "#a855f7",
  draft: "#71717a",
  paused: "#f59e0b",
  closed: "#52525b",
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadTimeMs, setLoadTimeMs] = useState(0);

  const fetchDashboard = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch("/api/reports/dashboard");
      const json = await res.json();
      const elapsed = Math.round(performance.now() - start);
      setLoadTimeMs(elapsed);
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Active Subscriptions", data.activeSubscriptions],
      ["Monthly Recurring Revenue (MRR)", `$${data.mrr}`],
      ["Annual Recurring Revenue (ARR)", `$${data.arr}`],
      ["Total Revenue Collected", `$${data.totalRevenue}`],
      ["Outstanding Receivables", `$${data.amountOwed}`],
      ["Overdue Invoices Count", data.overdueCount],
      ["Total Overdue Amount", `$${data.overdueAmount}`],
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial_summary_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-1">
              Finance & Leadership
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Executive Revenue Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Query Time: <strong className="text-emerald-400">{loadTimeMs}ms</strong> (&lt; 2s target)</span>
            </div>

            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>

            <button
              onClick={fetchDashboard}
              title="Refresh metrics"
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* KPI Cards Row 1: Key Financials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: MRR & ARR */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-3">
              <span>Recurring Revenue (MRR)</span>
              <TrendingUp className="w-4 h-4 text-brand-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">
              ${data?.mrr?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "0.00"}
            </div>
            <div className="text-xs text-zinc-400 mt-2 flex items-center justify-between">
              <span>ARR Normalized:</span>
              <span className="font-mono text-zinc-200 font-semibold">
                ${data?.arr?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "0.00"}
              </span>
            </div>
          </div>

          {/* Card 2: Active Subscriptions */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-3">
              <span>Active Subscriptions</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {data?.activeSubscriptions || 0}
            </div>
            <div className="text-xs text-zinc-400 mt-2 flex items-center justify-between">
              <span>Single system of record</span>
              <Link href="/staff/subscriptions" className="text-brand-400 hover:underline">
                View all &rarr;
              </Link>
            </div>
          </div>

          {/* Card 3: Total Revenue Collected */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-3">
              <span>Total Revenue Received</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">
              ${data?.totalRevenue?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "0.00"}
            </div>
            <div className="text-xs text-zinc-400 mt-2 flex items-center justify-between">
              <span>Instant reconciliation</span>
              <Link href="/staff/payments" className="text-brand-400 hover:underline">
                Audit &rarr;
              </Link>
            </div>
          </div>

          {/* Card 4: Overdue Invoices Alert */}
          <div
            className={`glass-panel p-5 rounded-2xl border transition-all ${
              data?.overdueCount > 0
                ? "border-rose-500/40 bg-rose-500/[0.04]"
                : "border-white/10"
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-3">
              <span className="flex items-center gap-1.5">
                {data?.overdueCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                Overdue Receivables
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-extrabold text-rose-400">
              ${data?.overdueAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "0.00"}
            </div>
            <div className="text-xs text-zinc-400 mt-2 flex items-center justify-between">
              <span>{data?.overdueCount || 0} overdue invoices</span>
              <Link href="/staff/invoices?status=overdue" className="text-rose-400 hover:underline font-semibold">
                Chase &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Revenue Trend Chart */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-white">Monthly Cash Collection Trend</h3>
                <p className="text-xs text-zinc-400">Total payments matched directly to invoices</p>
              </div>
              <span className="text-xs font-mono text-brand-400">2026 Fiscal Year</span>
            </div>

            <div className="h-64 w-full">
              {data?.monthlyRevenue?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyRevenue}>
                    <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#181922",
                        borderColor: "#3f3f46",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="#ff5722" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                  No payment data recorded yet
                </div>
              )}
            </div>
          </div>

          {/* Subscriptions Status Breakdown */}
          <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Subscriptions by Status</h3>
              <p className="text-xs text-zinc-400 mb-4">Lifecycle distribution across all contracts</p>

              <div className="h-44 w-full flex items-center justify-center">
                {data?.subsByStatus?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.subsByStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {data.subsByStatus.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.status.toLowerCase()] || "#71717a"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#181922",
                          borderColor: "#3f3f46",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-zinc-800 text-xs">
              {data?.subsByStatus?.map((item: any) => (
                <div key={item.status} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[item.status.toLowerCase()] || "#71717a" }}
                  />
                  <span className="text-zinc-400 capitalize">{item.status}:</span>
                  <span className="text-white font-semibold font-mono">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overdue Invoices Follow-up Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Overdue Invoices Requiring Follow-Up
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Past due date with unpaid balance. Instant reconciliation prevents lost renewals.
              </p>
            </div>
            <Link
              href="/staff/invoices?status=overdue"
              className="text-xs font-semibold text-brand-400 hover:underline"
            >
              Manage Invoices &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-6">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data?.overdueInvoices?.length > 0 ? (
                  data.overdueInvoices.map((inv: any) => {
                    const balance = Number(inv.total) - Number(inv.amount_paid);
                    return (
                      <tr key={inv.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-semibold text-white">
                          <Link href={`/staff/invoices/${inv.id}`} className="hover:text-brand-400">
                            {inv.number}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-zinc-200">
                          {inv.customer_name}
                          {inv.customer_company && (
                            <span className="block text-[11px] text-zinc-400">
                              {inv.customer_company}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-rose-400 font-semibold">
                          {inv.due_date}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-300">
                          ${Number(inv.total).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-400">
                          ${Number(inv.amount_paid).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                          ${balance.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <Link
                            href={`/staff/invoices/${inv.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/30 hover:bg-brand-500 hover:text-white transition-all text-xs font-semibold"
                          >
                            Collect Payment
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      No overdue invoices! All receivables are in good standing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
