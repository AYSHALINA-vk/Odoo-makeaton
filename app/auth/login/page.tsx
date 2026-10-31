"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { ShieldAlert, UserCheck, User, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login, switchRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || "Login failed");
    }
    setLoading(false);
  };

  const handleQuickLogin = (role: "admin" | "staff" | "customer") => {
    switchRole(role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#090a0f]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block text-3xl font-black text-white tracking-tight">
            plat<span className="text-brand-500 font-extrabold">—</span>form
          </Link>
          <div className="text-xs uppercase tracking-wider text-brand-400 font-mono font-semibold">
            Brightloop Software
          </div>
          <p className="text-xs text-zinc-400">Sign in to your subscription management console</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-zinc-300 font-medium">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-brand-400 hover:underline text-[11px]"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-md orange-glow-sm transition-all"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Quick Demo Logins Bar */}
          <div className="pt-4 border-t border-zinc-800 space-y-2 text-center">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
              Instant Demo Access
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin")}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-center transition-colors"
              >
                <div className="font-semibold text-brand-400">Admin</div>
                <div className="text-[10px] text-zinc-500 truncate">Asha Sharma</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("staff")}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-center transition-colors"
              >
                <div className="font-semibold text-brand-400">Staff</div>
                <div className="text-[10px] text-zinc-500 truncate">Ravi Kumar</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("customer")}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-center transition-colors"
              >
                <div className="font-semibold text-brand-400">Customer</div>
                <div className="text-[10px] text-zinc-500 truncate">Priya Patel</div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-brand-400 font-semibold hover:underline">
            Register as Customer
          </Link>
        </div>
      </div>
    </div>
  );
}
