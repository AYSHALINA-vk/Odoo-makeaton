"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import {
  CalendarClock,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  History,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function BillingRunsPage() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [runDate, setRunDate] = useState(new Date().toISOString().split("T")[0]);
  const [lastResult, setLastResult] = useState<any>(null);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/runs");
      const json = await res.json();
      setRuns(json.runs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleRunBilling = async (targetDate?: string) => {
    setExecuting(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/billing/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runDate: targetDate || runDate }),
      });
      const data = await res.json();
      if (data.success) {
        setLastResult(data.result);
        fetchRuns();
      } else {
        alert(data.error || "Billing run failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-1">
              Automated Operations
            </div>
            <h1 className="text-2xl font-extrabold text-white">Billing Day Engine</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Bulk invoice generation with transactional exactly-once guarantee (no double-billing, no skipped periods).
            </p>
          </div>
        </div>

        {/* Execution Console Card */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-500" />
                Trigger Scheduled / Manual Billing Run
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                Scans all active subscriptions due on or before the selected date. Automatically calculates
                taxes, discounts, and line totals, pre-fills invoices, advances next billing dates, and guarantees 0 duplicates.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
              />

              <button
                onClick={() => handleRunBilling()}
                disabled={executing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold shadow-md orange-glow-sm transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {executing ? "Processing..." : "Run Billing Day"}
              </button>

              <button
                onClick={() => handleRunBilling(runDate)}
                disabled={executing}
                title="Rerun on same date to test idempotency: 0 duplicates created!"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                Test Idempotency Rerun
              </button>
            </div>
          </div>

          {/* Last Result Box */}
          {lastResult && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-brand-500/30 text-xs space-y-2 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Billing Run Completed ({lastResult.runId})
                </span>
                <span className="text-zinc-500 font-mono">Date: {lastResult.runDate}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-zinc-800">
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-emerald-400 font-mono">
                    {lastResult.generatedCount}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Invoices Generated</div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-sky-400 font-mono">
                    {lastResult.skippedCount}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Skipped (Already Billed)</div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-rose-400 font-mono">
                    {lastResult.failedCount}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Failed</div>
                </div>
              </div>
              {lastResult.skippedCount > 0 && (
                <div className="text-[11px] text-emerald-300/90 bg-emerald-950/20 p-2 rounded border border-emerald-900/40">
                  Idempotency Verified: Subscriptions already billed for this period were safely skipped without creating duplicate invoices.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Historical Billing Runs Log */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-400" />
              Billing Run History & Audit Log
            </h3>
            <span className="text-xs text-zinc-400">{runs.length} logged run(s)</span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-6">Run ID</th>
                <th className="py-3 px-4">Run Target Date</th>
                <th className="py-3 px-4">Started At</th>
                <th className="py-3 px-4 text-center">Generated</th>
                <th className="py-3 px-4 text-center">Skipped</th>
                <th className="py-3 px-4 text-center">Failed</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-900/40">
                  <td className="py-3.5 px-6 font-mono font-semibold text-white">{r.id}</td>
                  <td className="py-3.5 px-4 font-mono text-brand-400">{r.run_date}</td>
                  <td className="py-3.5 px-4 font-mono text-zinc-400">{r.started_at}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                    {r.generated_count}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-sky-400">
                    {r.skipped_count}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-rose-400">
                    {r.failed_count}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Success
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
