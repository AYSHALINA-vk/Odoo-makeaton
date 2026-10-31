"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Mail, AlertCircle, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [debugToken, setDebugToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        if (data.debugToken) {
          setDebugToken(data.debugToken);
        }
      } else {
        setError(data.error || "Failed to send reset email");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#090a0f]">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </Link>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-white">Reset Password</h1>
          <p className="text-xs text-zinc-400">
            Enter your registered email address to receive password recovery instructions.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="space-y-4 text-xs text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="font-semibold text-white text-sm">Reset Instructions Sent</div>
              <p className="text-zinc-400 leading-relaxed">
                If an account exists for <span className="text-white font-mono">{email}</span>, a secure single-use reset link has been dispatched.
              </p>

              {/* Direct Demo Link */}
              {debugToken && (
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-brand-500/40 text-left mt-4 space-y-2">
                  <div className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider">
                    Testing Shortcut (Simulated Email Link):
                  </div>
                  <Link
                    href={`/auth/reset-password?token=${debugToken}`}
                    className="inline-flex items-center gap-1 text-xs text-brand-300 hover:text-white underline font-mono break-all"
                  >
                    Click to proceed to Reset Page &rarr;
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Registered Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="priya@shopmart.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-md orange-glow-sm transition-all"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
