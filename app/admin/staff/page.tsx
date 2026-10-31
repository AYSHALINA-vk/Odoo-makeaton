"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthContext";
import { Plus, ShieldCheck, UserCheck, X, AlertCircle } from "lucide-react";
import { PasswordChecklist } from "@/components/PasswordChecklist";

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      const json = await res.json();
      setStaff(json.staff || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, password, role }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setEmail("");
        setFullName("");
        setPassword("");
        fetchStaff();
      } else {
        setErrorMsg(data.error || "Failed to create staff member");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
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
                Access & Security
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Admin-Only (REQ-AUTH-5)
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">Staff & Internal Users</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Only administrators can provision new team members. Public sign-up always defaults to customer.
            </p>
          </div>

          {isAdminUser ? (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md orange-glow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Staff Member
            </button>
          ) : (
            <div className="text-xs text-zinc-500 font-medium">Creation locked to Administrator</div>
          )}
        </div>

        {/* Staff Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-6">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-6 text-right">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-900/40">
                  <td className="py-3.5 px-6 font-semibold text-white flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-brand-400">
                      {s.full_name?.charAt(0) || "U"}
                    </div>
                    {s.full_name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">{s.email}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        s.role === "admin"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                          : "bg-brand-500/10 text-brand-400 border border-brand-500/30"
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {s.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono text-zinc-500">{s.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal: Create Staff */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111218] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">Add Staff Member</h3>
                <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Meera Gupta"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Company Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="meera@brightloop.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Assigned Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="staff">Staff (Sales, Billing & Payments)</option>
                    <option value="admin">Administrator (Full System Control)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Must meet strong password policy..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                  <PasswordChecklist password={password} />
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
                    Create User
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
