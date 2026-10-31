"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { Plus, Receipt, X } from "lucide-react";

export default function TaxesPage() {
  const { user } = useAuth();
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [appliesTo, setAppliesTo] = useState("all");

  const fetchTaxes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/taxes");
      const json = await res.json();
      setTaxes(json.taxes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || rate == null) return;

    try {
      const res = await fetch("/api/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          rate: Number(rate),
          applies_to: appliesTo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setName("");
        setRate("");
        fetchTaxes();
      } else {
        alert(data.error || "Failed to create tax rule");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-1">
              Catalog & Configuration
            </div>
            <h1 className="text-2xl font-extrabold text-white">Tax Rules</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Admin-defined rules automatically applied on subscription lines and invoices.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md orange-glow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Tax Rule
          </button>
        </div>

        {/* Taxes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {taxes.map((t) => (
            <div
              key={t.id}
              className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-zinc-800 text-zinc-300">
                    Category: {t.applies_to}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">Active</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{t.name}</h3>
                <div className="text-4xl font-extrabold text-white font-mono">
                  {t.rate}%
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-zinc-800 text-[11px] text-zinc-500">
                Rule ID: {t.id}
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Create Tax */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111218] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">Create Tax Rule</h3>
                <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTax} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Rule Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Standard VAT (20%)"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Rate (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="20.00"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Applies To *</label>
                    <select
                      value={appliesTo}
                      onChange={(e) => setAppliesTo(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="all">All Products</option>
                      <option value="software">Software Only</option>
                      <option value="service">Services Only</option>
                      <option value="add-on">Add-ons Only</option>
                    </select>
                  </div>
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
                    className="px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold orange-glow-sm"
                  >
                    Save Rule
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
