"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import { InvoicePrintModal } from "@/components/InvoicePrintModal";
import Link from "next/link";
import { FileText, Printer, Download, ArrowLeft, Clock } from "lucide-react";

export default function CustomerInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Print modal state
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [modalLines, setModalLines] = useState<any[]>([]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
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
  }, []);

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

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Portal Home
        </Link>

        <div>
          <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-1">
            Billing Records
          </div>
          <h1 className="text-2xl font-extrabold text-white">My Invoices & Receipts</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Download PDF copies and view payment receipts for all your billing cycles.
          </p>
        </div>

        {/* Invoices List */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-6">Invoice #</th>
                <th className="py-3 px-4">Billing Period</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {invoices.map((inv) => {
                const balance = Number(inv.total) - Number(inv.amount_paid);
                return (
                  <tr key={inv.id} className="hover:bg-zinc-900/40">
                    <td className="py-3.5 px-6 font-mono font-bold text-brand-400">
                      {inv.number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">
                      {inv.period_start} to {inv.period_end}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">{inv.due_date}</td>
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
                      <button
                        onClick={() => handleOpenPrint(inv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-brand-500 hover:text-white text-zinc-200 transition-all font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print / PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Print / PDF Modal */}
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
