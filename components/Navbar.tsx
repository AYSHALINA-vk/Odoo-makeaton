"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthContext";
import {
  ShieldAlert,
  UserCheck,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
  Zap,
  RotateCcw,
} from "lucide-react";

export function Navbar() {
  const { user, switchRole, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetData = async () => {
    if (confirm("Reset and re-seed demo data with fresh sample products, plans, and invoices?")) {
      setResetting(true);
      await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#090a0f]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-bold tracking-tight text-white group-hover:text-brand-400 transition-colors">
              plat<span className="text-brand-500 font-extrabold">—</span>form
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-medium bg-brand-500/10 text-brand-400 border border-brand-500/30 rounded">
              Brightloop
            </span>
          </Link>
        </div>

        {/* Quick Role Switcher (Crucial for live judging & workflow demonstration) */}
        <div className="hidden md:flex items-center bg-zinc-900/90 p-1 rounded-full border border-zinc-800 text-xs">
          <span className="px-3 text-zinc-500 font-medium">Demo Mode:</span>
          <button
            onClick={() => switchRole("admin")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all ${
              user?.role === "admin"
                ? "bg-brand-500 text-white shadow-md orange-glow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Admin
          </button>
          <button
            onClick={() => switchRole("staff")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all ${
              user?.role === "staff"
                ? "bg-brand-500 text-white shadow-md orange-glow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Staff
          </button>
          <button
            onClick={() => switchRole("customer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all ${
              user?.role === "customer"
                ? "bg-brand-500 text-white shadow-md orange-glow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Customer Portal
          </button>
        </div>

        {/* Right side user & actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetData}
            disabled={resetting}
            title="Reset and reseed demo database"
            className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-zinc-800/80 transition-colors border border-transparent hover:border-zinc-700"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
            Reset Data
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-white">{user.name}</span>
                <span className="text-[10px] text-brand-400 uppercase tracking-wider font-mono">
                  {user.role}
                </span>
              </div>
              <button
                onClick={() => logout()}
                title="Log out"
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors border border-zinc-800"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition-all shadow-sm"
            >
              Log In
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-[#0c0d12] px-4 py-4 space-y-3">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Switch Demo Role:
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                switchRole("admin");
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-2 text-center rounded-lg text-xs font-medium ${
                user?.role === "admin" ? "bg-brand-500 text-white" : "bg-zinc-900 text-zinc-400"
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => {
                switchRole("staff");
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-2 text-center rounded-lg text-xs font-medium ${
                user?.role === "staff" ? "bg-brand-500 text-white" : "bg-zinc-900 text-zinc-400"
              }`}
            >
              Staff
            </button>
            <button
              onClick={() => {
                switchRole("customer");
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-2 text-center rounded-lg text-xs font-medium ${
                user?.role === "customer" ? "bg-brand-500 text-white" : "bg-zinc-900 text-zinc-400"
              }`}
            >
              Customer
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
