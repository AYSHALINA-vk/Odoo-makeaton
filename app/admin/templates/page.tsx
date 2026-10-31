"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { Plus, FileCheck2, ArrowRight, X, Calendar, Layers } from "lucide-react";

export default function TemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quote from template modal
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [creatingQuote, setCreatingQuote] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      const json = await res.json();
      setTemplates(json.templates || []);

      const cRes = await fetch("/api/customers");
      const cJson = await cRes.json();
      setCustomers(cJson.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleStartQuote = async () => {
    if (!selectedTemplate || !selectedCustomerId) return;
    setCreatingQuote(true);

    try {
      const res = await fetch(`/api/templates/${selectedTemplate.id}/create-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: selectedCustomerId }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTemplate(null);
        router.push(`/staff/subscriptions/${data.subscriptionId}`);
      } else {
        alert(data.error || "Failed to generate quotation from template");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingQuote(false);
    }
  };

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-1">
              Sales Acceleration
            </div>
            <h1 className="text-2xl font-extrabold text-white">Quotation Templates</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Reusable offers with pre-filled plan, product lines, and validity period. Start a quote in 1 click!
            </p>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/30">
                    Plan: {tpl.plan_name} ({tpl.billing_period})
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    Validity: <strong>{tpl.validity_days} days</strong>
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{tpl.name}</h3>

                <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Included Product Lines:
                  </div>
                  <div className="space-y-1.5">
                    {tpl.lines?.map((line: any) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between text-xs bg-zinc-900/80 px-3 py-2 rounded-lg border border-zinc-800"
                      >
                        <span className="text-zinc-200 font-medium">
                          {line.product_name}
                          {line.variant_name && (
                            <span className="text-brand-400 ml-1">({line.variant_name})</span>
                          )}
                        </span>
                        <span className="font-mono text-zinc-400 font-semibold">
                          Qty: {line.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-mono">ID: {tpl.id}</span>
                <button
                  onClick={() => {
                    setSelectedTemplate(tpl);
                    setSelectedCustomerId(customers[0]?.id || "");
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md orange-glow-sm transition-all"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  Generate Quote from Template
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Select Customer for Quote */}
        {selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111218] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">Start Quotation</h3>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-1">
                <div className="font-semibold text-white">{selectedTemplate.name}</div>
                <div className="text-zinc-400">
                  Plan: {selectedTemplate.plan_name} • Pre-filled lines: {selectedTemplate.lines?.length || 0}
                </div>
                <div className="text-brand-400">
                  Quotation expiry set to +{selectedTemplate.validity_days} days automatically.
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <label className="block text-zinc-300 font-medium">Select Customer *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""} - {c.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={creatingQuote}
                  onClick={handleStartQuote}
                  className="px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold orange-glow-sm transition-all"
                >
                  {creatingQuote ? "Generating..." : "Create Quotation"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
