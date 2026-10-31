"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { Package, Plus, Search, Tag, X, Check, DollarSign } from "lucide-react";

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("software");
  const [salesPrice, setSalesPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [variants, setVariants] = useState<Array<{ attribute: string; value: string; extra_price: string }>>([
    { attribute: "Brand", value: "Odoo Connector", extra_price: "560" }, // Pre-filled default to match brief requirement!
  ]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const json = await res.json();
      setProducts(json.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddVariantRow = () => {
    setVariants([...variants, { attribute: "Edition", value: "", extra_price: "0" }]);
  };

  const handleRemoveVariantRow = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !salesPrice) return;

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          sales_price: Number(salesPrice),
          cost_price: Number(costPrice) || 0,
          notes,
          variants: variants.filter((v) => v.attribute && v.value),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setName("");
        setSalesPrice("");
        setCostPrice("");
        setNotes("");
        fetchProducts();
      } else {
        alert(data.error || "Failed to save product");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-1">
              Catalog Management
            </div>
            <h1 className="text-2xl font-extrabold text-white">Products & Variants</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Configure products and attribute variants (e.g. Odoo Brand adds $560 extra price).
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md orange-glow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Product & Variants
          </button>
        </div>

        {/* Filter bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or type..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((prod) => {
            const margin =
              prod.sales_price > 0
                ? Math.round(
                    ((prod.sales_price - prod.cost_price) / prod.sales_price) * 100
                  )
                : 0;

            return (
              <div
                key={prod.id}
                className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {prod.type}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-semibold">
                      {margin}% margin
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{prod.name}</h3>
                  <div className="text-xs text-zinc-400 line-clamp-2 mb-4">
                    {prod.notes || "No description provided."}
                  </div>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-extrabold text-white">
                      ${Number(prod.sales_price).toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      (Cost: ${Number(prod.cost_price).toFixed(2)})
                    </span>
                  </div>

                  {/* Variants display */}
                  {prod.variants?.length > 0 && (
                    <div className="space-y-1.5 pt-3 border-t border-zinc-800/80">
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Available Variants:
                      </div>
                      <div className="space-y-1">
                        {prod.variants.map((v: any) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between text-xs bg-zinc-900/80 px-2.5 py-1.5 rounded border border-zinc-800"
                          >
                            <span className="text-zinc-300 font-medium">
                              {v.attribute}: <strong className="text-white">{v.value}</strong>
                            </span>
                            <span className="font-mono text-brand-400 font-semibold">
                              {Number(v.extra_price) > 0 ? `+$${v.extra_price}` : "+$0"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-900 text-[11px] text-zinc-500 flex justify-between items-center">
                  <span>ID: {prod.id}</span>
                  <span className="text-emerald-400 font-medium">Active in Catalog</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Add Product */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111218] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">Add New Product & Variants</h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. BrightCore Cloud Suite"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Type *</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="software">Software</option>
                      <option value="service">Service</option>
                      <option value="add-on">Add-on</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Sales Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={salesPrice}
                      onChange={(e) => setSalesPrice(e.target.value)}
                      placeholder="1200.00"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Cost Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="350.00"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal or customer notes..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Variants Section */}
                <div className="pt-2 border-t border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-zinc-300">
                      Product Variants (Extra Pricing)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddVariantRow}
                      className="text-brand-400 hover:text-brand-300 text-[11px] font-semibold"
                    >
                      + Add Variant
                    </button>
                  </div>

                  <div className="space-y-2">
                    {variants.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Attribute (e.g. Brand)"
                          value={v.attribute}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].attribute = e.target.value;
                            setVariants(updated);
                          }}
                          className="w-1/3 bg-zinc-900 border border-zinc-800 rounded p-2 text-white"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. Odoo)"
                          value={v.value}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].value = e.target.value;
                            setVariants(updated);
                          }}
                          className="w-1/3 bg-zinc-900 border border-zinc-800 rounded p-2 text-white"
                        />
                        <input
                          type="number"
                          placeholder="Extra ($) (e.g. 560)"
                          value={v.extra_price}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].extra_price = e.target.value;
                            setVariants(updated);
                          }}
                          className="w-1/4 bg-zinc-900 border border-zinc-800 rounded p-2 text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(idx)}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold orange-glow-sm"
                  >
                    Save Product
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
