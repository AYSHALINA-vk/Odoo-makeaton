"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { Plus, Percent, Tag, X, Check, AlertCircle, ShieldAlert } from "lucide-react";

export default function DiscountsPage() {
  const { user } = useAuth();
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [minQty, setMinQty] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [scope, setScope] = useState<"subscription" | "product">("subscription");
  const [productId, setProductId] = useState("");

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/discounts");
      const json = await res.json();
      setDiscounts(json.discounts || []);

      const pRes = await fetch("/api/products");
      const pJson = await pRes.json();
      setProducts(pJson.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;

    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          value: Number(value),
          min_purchase: minPurchase ? Number(minPurchase) : null,
          min_quantity: minQty ? Number(minQty) : null,
          start_date: startDate || null,
          end_date: endDate || null,
          usage_limit: usageLimit ? Number(usageLimit) : null,
          scope,
          product_id: scope === "product" ? productId : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setName("");
        setValue("");
        fetchDiscounts();
      } else {
        alert(data.error || "Failed to create discount");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isAdminUser = user?.role === "admin";

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-brand-400 uppercase tracking-wider">
                Financial Rules
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Admin-Only Module
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">Discounts & Rebate Rules</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Admin-controlled rules. Automatically applied on invoice generation and halted on expiry or limit.
            </p>
          </div>

          {isAdminUser ? (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md orange-glow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Discount
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Creation locked to Admin
            </div>
          )}
        </div>

        {/* Discounts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {discounts.map((d) => {
            const isExpired = d.end_date && new Date(d.end_date) < new Date();
            const isLimitReached = d.usage_limit && d.times_used >= d.usage_limit;
            const isStopped = isExpired || isLimitReached;

            return (
              <div
                key={d.id}
                className={`glass-panel p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                  isStopped
                    ? "border-zinc-800 opacity-70 bg-zinc-900/30"
                    : "border-white/10 hover:border-brand-500/40"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-zinc-800 text-zinc-300">
                      Scope: {d.scope}
                    </span>
                    {isStopped ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">
                        {isLimitReached ? "Limit Reached" : "Expired"}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Active & Applying
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{d.name}</h3>

                  <div className="text-3xl font-extrabold text-brand-400 mb-3">
                    {d.type === "percentage" ? `${d.value}% Off` : `$${Number(d.value).toFixed(2)} Off`}
                  </div>

                  {d.scope === "product" && d.product_name && (
                    <div className="text-xs text-zinc-300 mb-3 bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
                      Target Product: <strong className="text-white">{d.product_name}</strong>
                    </div>
                  )}

                  {/* Thresholds */}
                  <div className="space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800 pt-3">
                    {d.min_purchase && (
                      <div className="flex justify-between">
                        <span>Min Purchase:</span>
                        <span className="font-mono text-zinc-200">${d.min_purchase}</span>
                      </div>
                    )}
                    {d.min_quantity && (
                      <div className="flex justify-between">
                        <span>Min Quantity:</span>
                        <span className="font-mono text-zinc-200">{d.min_quantity} seat(s)</span>
                      </div>
                    )}
                    {d.start_date && (
                      <div className="flex justify-between">
                        <span>Valid:</span>
                        <span className="font-mono text-zinc-300">
                          {d.start_date} to {d.end_date || "Open"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Usage meter */}
                <div className="mt-5 pt-4 border-t border-zinc-800">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                    <span>Usage Limit:</span>
                    <span className="font-mono text-white font-semibold">
                      {d.times_used} / {d.usage_limit || "Unlimited"} used
                    </span>
                  </div>
                  {d.usage_limit && (
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          isLimitReached ? "bg-rose-500" : "bg-brand-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (d.times_used / d.usage_limit) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Create Discount */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111218] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">Create Discount Rule (Admin Only)</h3>
                <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDiscount} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Discount Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Enterprise Volume Partner 15%"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Discount Type *</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">
                      {type === "percentage" ? "Percentage Rate (%) *" : "Fixed Discount ($) *"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={type === "percentage" ? "15" : "200.00"}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Scope *</label>
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="subscription">Whole Subscription</option>
                      <option value="product">Specific Product</option>
                    </select>
                  </div>

                  {scope === "product" && (
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">Target Product</label>
                      <select
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                      >
                        <option value="">Select a product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Min Purchase Amount ($)</label>
                    <input
                      type="number"
                      value={minPurchase}
                      onChange={(e) => setMinPurchase(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Min Line Quantity</label>
                    <input
                      type="number"
                      value={minQty}
                      onChange={(e) => setMinQty(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Usage Limit</label>
                    <input
                      type="number"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
                    />
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
                    Create Rule
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
