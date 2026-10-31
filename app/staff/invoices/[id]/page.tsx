"use client";

import React, { useEffect, useState, use } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import { InvoicePrintModal } from "@/components/InvoicePrintModal";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Send,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  User,
  Plus,
  X,
} from "lucide-react";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);

  // Record payment drawer
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const json = await res.json();
      setData(json);
      if (json.invoice) {
        const bal = Number(json.invoice.total) - Number(json.invoice.amount_paid);
        setPayAmount(bal > 0 ? bal.toFixed(2) : "0.00");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const resData = await res.json();
      if (resData.success) {
        if (action === "send") alert(resData.message);
        fetchInvoice();
      } else {
        alert(resData.error || "Action failed");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: id,
          method: payMethod,
          amount: Number(payAmount),
          note: payNote,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setPayModalOpen(false);
        setPayNote("");
        fetchInvoice();
      } else {
        alert(resData.error || "Failed to record payment");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading || !data?.invoice) {
    return (
      <div className="flex-1 flex bg-[#090a0f]">
        <Sidebar />
        <main className="flex-1 p-8 text-zinc-400">Loading invoice...</main>
      </div>
    );
  }

  const inv = data.invoice;
  const lines = data.lines || [];
  const payments = data.payments || [];
  const balanceDue = Number(inv.total) - Number(inv.amount_paid);

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <Link
          href="/staff/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Invoices Directory
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-mono font-extrabold text-white">{inv.number}</h1>
              <StatusBadge status={inv.status} isOverdue={Boolean(inv.is_overdue)} />
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Issued: <span className="font-mono text-zinc-300">{inv.invoice_date}</span> • Due:{" "}
              <span className={`font-mono font-bold ${inv.is_overdue ? "text-rose-400" : "text-zinc-200"}`}>
                {inv.due_date}
              </span>{" "}
              • Period: <span className="font-mono text-zinc-300">{inv.period_start} to {inv.period_end}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {inv.status === "draft" && (
              <button
                onClick={() => handleAction("confirm")}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Confirm Invoice
              </button>
            )}

            <button
              onClick={() => setPrintOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>

            <button
              onClick={() => handleAction("send")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-brand-500 hover:text-white text-brand-400 text-xs font-semibold border border-zinc-800 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Send Email
            </button>

            {balanceDue > 0 && inv.status !== "draft" && inv.status !== "cancelled" && (
              <button
                onClick={() => setPayModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md transition-all"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Record Payment
              </button>
            )}
          </div>
        </div>

        {/* Overdue Alert banner */}
        {inv.is_overdue && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Overdue Warning:</strong> This invoice was due on {inv.due_date} and has an outstanding balance of ${balanceDue.toFixed(2)}.
              </span>
            </div>
            <button
              onClick={() => setPayModalOpen(true)}
              className="px-3 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white font-semibold shrink-0"
            >
              Collect Now
            </button>
          </div>
        )}

        {/* Customer & Meta Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Customer Details
            </div>
            <div className="text-base font-bold text-white">{inv.customer_name}</div>
            {inv.customer_company && (
              <div className="text-zinc-300 font-medium">{inv.customer_company}</div>
            )}
            <div className="text-zinc-400">Email: {inv.customer_email}</div>
            {inv.customer_address && (
              <div className="text-zinc-400 pt-2 border-t border-zinc-800">
                Billing Address: {inv.customer_address}
              </div>
            )}
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3 text-xs">
            <div className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider">
              Financial Summary
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal:</span>
              <span className="font-mono text-zinc-200">${Number(inv.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Discounts Applied:</span>
              <span className="font-mono text-emerald-400">-${Number(inv.discount_total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Tax Total:</span>
              <span className="font-mono text-zinc-200">+${Number(inv.tax_total).toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm font-bold text-white">
              <span>Grand Total:</span>
              <span className="font-mono text-brand-400">${Number(inv.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Amount Paid:</span>
              <span className="font-mono">${Number(inv.amount_paid).toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm font-bold">
              <span className="text-zinc-200">Balance Due:</span>
              <span className={`font-mono ${balanceDue > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                ${balanceDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h3 className="text-sm font-bold text-white">Invoice Lines</h3>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-6">Description</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Discount</th>
                <th className="py-3 px-4 text-right">Tax Rate / Amount</th>
                <th className="py-3 px-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {lines.map((l: any) => (
                <tr key={l.id} className="hover:bg-zinc-900/40">
                  <td className="py-3.5 px-6 font-semibold text-white">{l.description}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-white">
                    {l.quantity}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                    ${Number(l.unit_price).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                    {Number(l.discount) > 0 ? `-$${Number(l.discount).toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                    {l.tax_rate}% (${Number(l.tax_amount).toFixed(2)})
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono font-bold text-white">
                    ${Number(l.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payments History on this invoice */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Payment Reconciliation History</h3>
            <span className="text-xs text-zinc-400">{payments.length} payment(s) linked</span>
          </div>

          {payments.length > 0 ? (
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-6">Payment ID</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Reference Note</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-zinc-900/40">
                    <td className="py-3.5 px-6 font-mono font-semibold text-brand-400">{p.id}</td>
                    <td className="py-3.5 px-4 text-zinc-200">{p.method}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">{p.payment_date}</td>
                    <td className="py-3.5 px-4 text-zinc-400">{p.note || "—"}</td>
                    <td className="py-3.5 px-4 text-zinc-400">{p.recorded_by}</td>
                    <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-400">
                      +${Number(p.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500">
              No payments recorded yet against this invoice.
            </div>
          )}
        </div>

        {/* Modal: Record Payment */}
        {payModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111218] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">Record Payment</h3>
                <button onClick={() => setPayModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Payment Method *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Bank Transfer">Bank Transfer (ACH / Wire)</option>
                    <option value="Credit Card">Credit Card (Stripe)</option>
                    <option value="UPI">UPI / Instant Transfer</option>
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
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 1000.00"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <span className="block text-[11px] text-zinc-500 mt-1">
                    Remaining balance: ${balanceDue.toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Reference / Note</label>
                  <input
                    type="text"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="e.g. Wire transfer ref TX-99210"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPayModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all shadow-md"
                  >
                    Confirm & Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Print Modal */}
        {printOpen && (
          <InvoicePrintModal
            invoice={inv}
            lines={lines}
            onClose={() => setPrintOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
