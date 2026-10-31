"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle,
  Clock,
  DollarSign,
  X,
  FileText,
} from "lucide-react";

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [method, setMethod] = useState("Bank Transfer");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const pRes = await fetch("/api/payments");
      const pJson = await pRes.json();
      setPayments(pJson.payments || []);

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
    fetchPayments();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !amount || Number(amount) <= 0) return;

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          method,
          amount: Number(amount),
          paymentDate,
          note,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setAmount("");
        setNote("");
        fetchPayments();
      } else {
        alert(data.error || "Failed to record payment");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = payments.filter(
    (p) =>
      p.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.method?.toLowerCase().includes(search.toLowerCase()) ||
      p.note?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedInv = invoices.find((i) => i.id === selectedInvoiceId);
  const remainingBal = selectedInv ? Math.max(0, Number(selectedInv.total) - Number(selectedInv.amount_paid)) : 0;

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-1">
              Payment Reconciliation
            </div>
            <h1 className="text-2xl font-extrabold text-white">Payments & Cash Collection</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Matched in-system to invoices. No scrolling bank statements or guessing customer accounts.
            </p>
          </div>

          <button
            onClick={() => {
              const unpaid = invoices.find((i) => i.status !== "paid");
              if (unpaid) {
                setSelectedInvoiceId(unpaid.id);
                const bal = Number(unpaid.total) - Number(unpaid.amount_paid);
                setAmount(bal > 0 ? bal.toFixed(2) : "");
              }
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice #, customer, method, note..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Payments Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-6">Payment ID</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Reference Note</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-900/40">
                  <td className="py-3.5 px-6 font-mono font-semibold text-zinc-300">{p.id}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-brand-400">
                    <Link href={`/staff/invoices/${p.invoice_id}`} className="hover:underline">
                      {p.invoice_number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-white">
                    {p.customer_name}
                    {p.customer_company && (
                      <span className="block text-[11px] text-zinc-400">
                        {p.customer_company}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">{p.method}</td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">{p.payment_date}</td>
                  <td className="py-3.5 px-4 text-zinc-400">{p.note || "—"}</td>
                  <td className="py-3.5 px-4 text-zinc-400">{p.recorded_by}</td>
                  <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-400 text-sm">
                    +${Number(p.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal: Record Payment */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111218] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">Record & Match Payment</h3>
                <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Target Invoice *</label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => {
                      setSelectedInvoiceId(e.target.value);
                      const inv = invoices.find((i) => i.id === e.target.value);
                      if (inv) {
                        const bal = Number(inv.total) - Number(inv.amount_paid);
                        setAmount(bal > 0 ? bal.toFixed(2) : "");
                      }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500 font-mono"
                  >
                    <option value="">Select Invoice...</option>
                    {invoices.map((inv) => {
                      const bal = Number(inv.total) - Number(inv.amount_paid);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.number} - {inv.customer_name} (Bal: ${bal.toFixed(2)}) [{inv.status}]
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedInv && (
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                    <div className="text-zinc-400 flex justify-between">
                      <span>Invoice Total:</span>
                      <span className="font-mono text-white">${Number(selectedInv.total).toFixed(2)}</span>
                    </div>
                    <div className="text-zinc-400 flex justify-between">
                      <span>Already Paid:</span>
                      <span className="font-mono text-zinc-300">
                        ${Number(selectedInv.amount_paid).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs font-bold flex justify-between pt-1 border-t border-zinc-800 text-brand-400">
                      <span>Remaining Balance:</span>
                      <span className="font-mono">${remainingBal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Payment Method *</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="Bank Transfer">Bank Transfer (Wire)</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Payment Amount ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 500.00"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Reference Note</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Bank statement entry wire #TX-88301"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all shadow-md"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
