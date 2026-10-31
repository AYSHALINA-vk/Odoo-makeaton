"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import { InvoicePrintModal } from "@/components/InvoicePrintModal";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Send,
  Printer,
  DollarSign,
  AlertTriangle,
  CreditCard,
} from "lucide-react";

function InvoicesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState("");

  // Print modal state
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [modalLines, setModalLines] = useState<any[]>([]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?status=${statusFilter}`);
      const json = await res.json();
      setInvoices(json.invoices || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === "send") {
          alert(data.message);
        }
        fetchInvoices();
      } else {
        alert(data.error || "Action failed");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenPrint = async (inv: any) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      const json = await res.json();
      setSelectedInvoice(json.invoice);
      setModalLines(json.lines || []);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = invoices.filter(
    (inv) =>
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-1">
              Billing & Receivables
            </div>
            <h1 className="text-2xl font-extrabold text-white">Invoice Management</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Confirm, cancel, send, print, and track paid vs outstanding balances in real time.
            </p>
          </div>

          <Link
            href="/staff/billing-runs"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md orange-glow-sm transition-all"
          >
            Go to Billing Day Engine &rarr;
          </Link>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs">
            {["all", "draft", "confirmed", "paid", "cancelled", "overdue", "outstanding"].map(
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
              placeholder="Search invoice # or customer..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-6">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map((inv) => {
                const balance = Number(inv.total) - Number(inv.amount_paid);
                return (
                  <tr key={inv.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-brand-400">
                      <Link href={`/staff/invoices/${inv.id}`} className="hover:underline">
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
                    <td
                      className={`py-3.5 px-4 font-mono ${
                        inv.is_overdue ? "text-rose-400 font-bold" : "text-zinc-300"
                      }`}
                    >
                      {inv.due_date}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={inv.status} isOverdue={Boolean(inv.is_overdue)} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                      ${Number(inv.total).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                      ${Number(inv.amount_paid).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={balance > 0 ? "text-rose-400" : "text-emerald-400"}>
                        ${balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status === "draft" && (
                          <button
                            onClick={() => handleAction(inv.id, "confirm")}
                            className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-all font-semibold"
                          >
                            Confirm
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenPrint(inv)}
                          title="Print or Download PDF"
                          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleAction(inv.id, "send")}
                          title="Send to customer email"
                          className="p-1 rounded bg-zinc-800 hover:bg-brand-500 hover:text-white text-brand-400 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        {inv.status !== "paid" && inv.amount_paid === 0 && (
                          <button
                            onClick={() => handleAction(inv.id, "cancel")}
                            title="Cancel invoice"
                            className="p-1 rounded bg-zinc-800 hover:bg-rose-950 text-rose-400 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <Link
                          href={`/staff/invoices/${inv.id}`}
                          className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:text-white ml-1 font-medium"
                        >
                          Detail &rarr;
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Print Modal */}
        {selectedInvoice && (
          <InvoicePrintModal
            invoice={selectedInvoice}
            lines={modalLines}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </main>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-400">Loading invoices...</div>}>
      <InvoicesContent />
    </Suspense>
  );
}
