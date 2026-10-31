"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Plus, Sliders, Check, X, Calendar } from "lucide-react";

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [minQty, setMinQty] = useState("1");
  const [availFrom, setAvailFrom] = useState("");
  const [availTo, setAvailTo] = useState("");
  const [autoClose, setAutoClose] = useState(false);
  const [closable, setClosable] = useState(true);
  const [pausable, setPausable] = useState(true);
  const [renewable, setRenewable] = useState(true);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plans");
      const json = await res.json();
      setPlans(json.plans || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price: Number(price),
          billing_period: billingPeriod,
          min_quantity: Number(minQty) || 1,
          available_from: availFrom || null,
          available_to: availTo || null,
          auto_close: autoClose,
          closable,
          pausable,
          renewable,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setName("");
        setPrice("");
        fetchPlans();
      } else {
        alert(data.error || "Failed to create plan");
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
              Catalog Management
            </div>
            <h1 className="text-2xl font-extrabold text-white">Plans & Billing Frequencies</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Define recurring intervals (daily/weekly/monthly/yearly) and behavioral policy flags.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md orange-glow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Plan
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/30">
                    {p.billing_period}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">Min: {p.min_quantity} seat(s)</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{p.name}</h3>
                <div className="text-3xl font-extrabold text-white mb-4">
                  ${Number(p.price).toFixed(2)}
                  <span className="text-xs text-zinc-400 font-normal"> / {p.billing_period}</span>
                </div>

                {/* Behavioral Flags Checklist */}
                <div className="space-y-2 pt-4 border-t border-zinc-800 text-xs">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                    Behavioral Policy Flags:
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Auto-close when ends:</span>
                    {p.auto_close ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-zinc-500 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> No
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Closable early:</span>
                    {p.closable ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-zinc-500 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> No
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Pausable / Resumable:</span>
                    {p.pausable ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-zinc-500 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> No
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Renewable:</span>
                    {p.renewable ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-zinc-500 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> No
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-zinc-900 text-[11px] text-zinc-500">
                {p.available_from ? (
                  <span>Available: {p.available_from} to {p.available_to || "No expiry"}</span>
                ) : (
                  <span>Always available</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Create Plan */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111218] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">Create Recurring Plan</h3>
                <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Enterprise Annual Tier"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Recurring Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="1200.00"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Billing Frequency *</label>
                    <select
                      value={billingPeriod}
                      onChange={(e) => setBillingPeriod(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Min Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={minQty}
                      onChange={(e) => setMinQty(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Available From</label>
                    <input
                      type="date"
                      value={availFrom}
                      onChange={(e) => setAvailFrom(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Available To</label>
                    <input
                      type="date"
                      value={availTo}
                      onChange={(e) => setAvailTo(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Behavioral policy checkboxes */}
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="font-semibold text-zinc-300 mb-2">Behavioral Options:</div>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoClose}
                      onChange={(e) => setAutoClose(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 text-brand-500 focus:ring-brand-500"
                    />
                    <span>Auto-close plan on its own when term ends</span>
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={closable}
                      onChange={(e) => setClosable(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 text-brand-500 focus:ring-brand-500"
                    />
                    <span>Plan can be closed early by staff or customer</span>
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pausable}
                      onChange={(e) => setPausable(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 text-brand-500 focus:ring-brand-500"
                    />
                    <span>Plan can be paused and resumed</span>
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={renewable}
                      onChange={(e) => setRenewable(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 text-brand-500 focus:ring-brand-500"
                    />
                    <span>Plan can be renewed</span>
                  </label>
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
                    Save Plan
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
