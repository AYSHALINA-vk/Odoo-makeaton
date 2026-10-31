"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { History, ShieldCheck, Search, Activity, Clock } from "lucide-react";

export default function AuditLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-log");
      const json = await res.json();
      setLogs(json.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase()) ||
      l.actor_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex bg-[#090a0f]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-1">
              System Observability
            </div>
            <h1 className="text-2xl font-extrabold text-white">Security & Audit Log</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Complete audit trail tracking user actions, state transitions, payments, and billing jobs.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, or entity..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Logs Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity & ID</th>
                <th className="py-3 px-6">State / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-900/40">
                  <td className="py-3 px-6 text-zinc-400 text-[11px] whitespace-nowrap">
                    {log.created_at}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/30">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-300 font-sans text-xs">
                    {log.actor_email || "System"}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 font-sans text-xs">
                    <span className="font-semibold text-white capitalize">{log.entity}</span>
                    <span className="block text-[11px] font-mono text-zinc-500">{log.entity_id}</span>
                  </td>
                  <td className="py-3 px-6 text-[11px] text-zinc-400 truncate max-w-xs">
                    {log.after_state || log.before_state || "—"}
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
