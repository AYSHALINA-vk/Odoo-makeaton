"use client";

import React, { useRef } from "react";
import { X, Printer, Download, CheckCircle, Clock } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoicePrintModalProps {
  invoice: any;
  lines: any[];
  onClose: () => void;
}

export function InvoicePrintModal({ invoice, lines, onClose }: InvoicePrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();

    // Brand header
    doc.setFillColor(15, 16, 22);
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 87, 34);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("BRIGHTLOOP SOFTWARE", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text("Subscription Management Platform", 14, 28);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(`INVOICE: ${invoice.number}`, 140, 22);

    doc.setFontSize(9);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 140, 30);

    // Bill To & Meta
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Billed To:", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${invoice.customer_name}`, 14, 58);
    if (invoice.customer_company) doc.text(`${invoice.customer_company}`, 14, 64);
    if (invoice.customer_email) doc.text(`${invoice.customer_email}`, 14, 70);
    if (invoice.customer_address) doc.text(`${invoice.customer_address}`, 14, 76);

    doc.setFont("helvetica", "bold");
    doc.text("Invoice Details:", 130, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice Date: ${invoice.invoice_date}`, 130, 58);
    doc.text(`Due Date: ${invoice.due_date}`, 130, 64);
    doc.text(`Period: ${invoice.period_start} to ${invoice.period_end}`, 130, 70);
    doc.text(`Subscription: ${invoice.subscription_number || invoice.subscription_id}`, 130, 76);

    // Lines table
    const tableRows = lines.map((l) => [
      l.description,
      l.quantity,
      `$${Number(l.unit_price).toFixed(2)}`,
      l.discount > 0 ? `-$${Number(l.discount).toFixed(2)}` : "$0.00",
      `${l.tax_rate}% ($${Number(l.tax_amount).toFixed(2)})`,
      `$${Number(l.amount).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 85,
      head: [["Item Description", "Qty", "Unit Price", "Discount", "Tax", "Total"]],
      body: tableRows,
      theme: "striped",
      headStyles: { fillColor: [255, 87, 34], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals block
    doc.setFont("helvetica", "bold");
    doc.text(`Subtotal:`, 140, finalY);
    doc.text(`$${Number(invoice.subtotal).toFixed(2)}`, 185, finalY, { align: "right" });

    doc.text(`Discount Total:`, 140, finalY + 6);
    doc.text(`-$${Number(invoice.discount_total).toFixed(2)}`, 185, finalY + 6, { align: "right" });

    doc.text(`Tax Total:`, 140, finalY + 12);
    doc.text(`+$${Number(invoice.tax_total).toFixed(2)}`, 185, finalY + 12, { align: "right" });

    doc.setFontSize(12);
    doc.setTextColor(255, 87, 34);
    doc.text(`Grand Total:`, 140, finalY + 20);
    doc.text(`$${Number(invoice.total).toFixed(2)}`, 185, finalY + 20, { align: "right" });

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Amount Paid:`, 140, finalY + 27);
    doc.text(`$${Number(invoice.amount_paid).toFixed(2)}`, 185, finalY + 27, { align: "right" });

    doc.setFont("helvetica", "bold");
    const balanceDue = Number(invoice.total) - Number(invoice.amount_paid);
    doc.setTextColor(balanceDue > 0 ? 220 : 0, balanceDue > 0 ? 38 : 128, 38);
    doc.text(`Balance Due:`, 140, finalY + 34);
    doc.text(`$${balanceDue.toFixed(2)}`, 185, finalY + 34, { align: "right" });

    doc.save(`${invoice.number}.pdf`);
  };

  const balanceDue = Number(invoice.total) - Number(invoice.amount_paid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#111218] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Action Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/50 no-print">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Invoice Preview</span>
            <span className="text-xs text-brand-400 font-mono">({invoice.number})</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-500 hover:bg-brand-600 text-white shadow-sm orange-glow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div ref={printRef} className="p-8 bg-zinc-950 text-zinc-100 print:bg-white print:text-black">
          {/* Brand header */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-zinc-800 gap-4">
            <div>
              <div className="text-2xl font-black tracking-tight text-white print:text-black flex items-center gap-1">
                plat<span className="text-brand-500 font-black">—</span>form
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">Brightloop Software Inc.</div>
              <div className="text-xs text-zinc-500 mt-1">
                500 Silicon Way, Suite 400 • Austin, TX 78701
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs uppercase tracking-wider text-zinc-400 font-medium">Invoice</div>
              <div className="text-xl font-mono font-bold text-brand-400">{invoice.number}</div>
              <div className="text-xs text-zinc-400 mt-1">Status: <span className="uppercase font-semibold text-white print:text-black">{invoice.status}</span></div>
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 text-xs">
            <div>
              <div className="text-zinc-500 font-medium mb-1 uppercase tracking-wider">Billed To</div>
              <div className="font-semibold text-white print:text-black text-sm">{invoice.customer_name}</div>
              {invoice.customer_company && (
                <div className="text-zinc-300 font-medium">{invoice.customer_company}</div>
              )}
              {invoice.customer_email && <div className="text-zinc-400">{invoice.customer_email}</div>}
              {invoice.customer_phone && <div className="text-zinc-400">{invoice.customer_phone}</div>}
              {invoice.customer_address && (
                <div className="text-zinc-400 mt-1">{invoice.customer_address}</div>
              )}
              {invoice.customer_tax_id && (
                <div className="text-zinc-500 mt-1">Tax ID: {invoice.customer_tax_id}</div>
              )}
            </div>
            <div className="sm:text-right space-y-1">
              <div>
                <span className="text-zinc-500">Invoice Date: </span>
                <span className="text-zinc-200 font-mono">{invoice.invoice_date}</span>
              </div>
              <div>
                <span className="text-zinc-500">Payment Due: </span>
                <span className="text-zinc-200 font-mono font-bold">{invoice.due_date}</span>
              </div>
              <div>
                <span className="text-zinc-500">Billing Period: </span>
                <span className="text-zinc-300">
                  {invoice.period_start} to {invoice.period_end}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Subscription Ref: </span>
                <span className="text-brand-400 font-mono">
                  {invoice.subscription_number || invoice.subscription_id}
                </span>
              </div>
            </div>
          </div>

          {/* Line items table */}
          <div className="overflow-x-auto my-6 border border-zinc-800 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-3 text-right">Unit Price</th>
                  <th className="py-3 px-3 text-right">Discount</th>
                  <th className="py-3 px-3 text-right">Tax</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/40">
                    <td className="py-3 px-4 font-medium text-white print:text-black">
                      {line.description}
                    </td>
                    <td className="py-3 px-3 text-center text-zinc-300">{line.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-300">
                      ${Number(line.unit_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-400">
                      {Number(line.discount) > 0 ? `-$${Number(line.discount).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-400">
                      {Number(line.tax_amount) > 0
                        ? `$${Number(line.tax_amount).toFixed(2)} (${line.tax_rate}%)`
                        : "0%"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-white print:text-black">
                      ${Number(line.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end mt-4">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal:</span>
                <span className="font-mono text-zinc-200">
                  ${Number(invoice.subtotal).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Total Discounts:</span>
                <span className="font-mono text-emerald-400">
                  -${Number(invoice.discount_total).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Taxes:</span>
                <span className="font-mono text-zinc-200">
                  +${Number(invoice.tax_total).toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm font-bold text-white print:text-black">
                <span>Grand Total:</span>
                <span className="font-mono text-brand-400">${Number(invoice.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400 pt-1">
                <span>Amount Paid:</span>
                <span className="font-mono text-zinc-300">
                  ${Number(invoice.amount_paid).toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between text-xs font-bold">
                <span className="text-zinc-300">Balance Due:</span>
                <span
                  className={`font-mono text-sm ${
                    balanceDue > 0 ? "text-rose-400 font-extrabold" : "text-emerald-400"
                  }`}
                >
                  ${balanceDue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-zinc-900 text-[11px] text-zinc-500 space-y-1">
            <div>
              Payment Terms: Wire transfer, Credit Card, or Direct ACH within {invoice.due_date}.
            </div>
            <div>Thank you for partnering with Brightloop Software. Questions? billing@brightloop.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}
