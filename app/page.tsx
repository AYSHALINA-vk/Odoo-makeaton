"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import {
  ArrowRight,
  Calendar,
  Layers,
  ShieldCheck,
  Check,
  Zap,
  TrendingUp,
  CreditCard,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Clock,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { user, switchRole } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "What exactly is Brightloop Plat—form?",
      a: "Brightloop Plat—form is a unified subscription management and billing system. It eliminates spreadsheet tracking, automates bulk billing runs, enforces tax and discount rules, reconciles payments without bank statement scrolling, and gives finance real-time MRR/ARR visibility.",
    },
    {
      q: "How does the platform guarantee nothing is billed twice or skipped?",
      a: "Business logic enforces an idempotent transactional constraint: UNIQUE(subscription_id, period_start, period_end). Running the billing job twice on the same date safely detects existing invoices with 0 duplicates, while any failing item is isolated and retryable.",
    },
    {
      q: "Can customers manage their own subscriptions without emailing support?",
      a: "Yes. Customers log into a dedicated self-service portal where they view their subscriptions, download invoices, and perform allowed actions (pause, resume, renew, close) governed by admin-configured plan behavioral flags.",
    },
    {
      q: "How are product variants and custom pricing handled?",
      a: "Products support arbitrary attribute variants with extra pricing (for example, selecting the Odoo Connector variant adds +$560 to the base price). The platform dynamically computes effective unit prices and line totals automatically.",
    },
  ];

  const handleLaunchConsole = (role: "admin" | "staff" | "customer") => {
    switchRole(role);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white selection:bg-brand-500 selection:text-white">
      {/* 1. HERO SECTION (Matching Reference Screenshot 105052) */}
      <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Glow ambient background elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">
                You innovate, <span className="text-white font-bold">we automate.</span>
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]">
              — The smarter way to{" "}
              <span className="text-brand-500">build, run,</span> and{" "}
              <span className="text-brand-500">scale</span> your business.
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl font-normal leading-relaxed">
              One unified platform that runs the full life of a subscription business: from configuring
              products, variants, and plans to idempotent bulk billing runs, automated taxes, discounts,
              and instant payment reconciliation.
            </p>

            {/* CTA Buttons */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={() => handleLaunchConsole("admin")}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-lg orange-glow transition-all hover:scale-[1.02]"
              >
                <Calendar className="w-4 h-4" />
                Launch Admin Console
              </button>
              <button
                onClick={() => handleLaunchConsole("staff")}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold text-sm transition-all"
              >
                Staff Workspace
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
              <button
                onClick={() => handleLaunchConsole("customer")}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-brand-400 border border-brand-500/20 font-semibold text-sm transition-all"
              >
                Customer Portal
              </button>
            </div>

            {/* Metrics bar matching screenshot */}
            <div className="pt-8 border-t border-white/10 flex items-center gap-10">
              <div>
                <div className="text-3xl font-extrabold text-white">97.8%</div>
                <div className="text-xs text-zinc-400 mt-0.5">Uptime (30-day monitoring)</div>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div>
                <div className="text-3xl font-extrabold text-brand-400">+31.2%</div>
                <div className="text-xs text-zinc-400 mt-0.5">Performance (AI optimized engine)</div>
              </div>
            </div>
          </div>

          {/* Right side teaser card */}
          <div className="lg:col-span-4">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-brand-500/40 transition-all">
              <div className="text-xs text-brand-400 font-mono uppercase tracking-wider mb-2">
                Automated Engine // Active
              </div>
              <div className="text-xl font-bold text-white mb-2">
                Zero Missed Renewals & Bulk Billing
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Replace manual spreadsheets with transactional billing runs. Confirmed invoices,
                discount usage bounds, and audit logs executed in milliseconds.
              </p>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/90 text-xs border border-zinc-800">
                  <span className="text-zinc-400">Next Billing Run</span>
                  <span className="text-emerald-400 font-mono font-semibold">Today (Due Ready)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/90 text-xs border border-zinc-800">
                  <span className="text-zinc-400">Idempotency Guarantee</span>
                  <span className="text-brand-400 font-mono font-semibold">UNIQUE period key</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/90 text-xs border border-zinc-800">
                  <span className="text-zinc-400">Sub-2s Query Engine</span>
                  <span className="text-white font-mono font-semibold">&lt; 120ms response</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-brand-400 font-semibold group-hover:translate-x-1 transition-transform cursor-pointer">
                <Link href="/dashboard" className="flex items-center gap-1.5">
                  Explore Live Finance KPIs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SERVICES SECTION (Matching Screenshot 105119) */}
      <section className="py-20 border-t border-white/10 bg-[#0c0d12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
            <div>
              <div className="text-xs font-mono text-brand-400 tracking-wider uppercase mb-1">
                002 plat—form
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Flexible solutions for running recurring operations.
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
              Engineered to resolve every bottleneck in Brightloop's business: manual typing,
              forgotten renewals, and bank statement matching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between h-72">
              <div>
                <div className="text-3xl font-extrabold text-brand-500 font-mono mb-4">01</div>
                <h3 className="text-lg font-bold text-white mb-2">Automated Billing Engine</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Bulk invoice generation with automatic tax and discount calculations. Guaranteed
                  exactly-once processing without duplicates.
                </p>
              </div>
              <Link
                href="/staff/billing-runs"
                className="text-xs font-semibold text-brand-400 flex items-center gap-1 hover:underline"
              >
                Inspect Billing Day <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Card 2 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between h-72">
              <div>
                <div className="text-3xl font-extrabold text-brand-500 font-mono mb-4">02</div>
                <h3 className="text-lg font-bold text-white mb-2">Variant & Brand Pricing</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Full variant support for software add-ons and brand connectors. For example, Odoo
                  brand dynamically adds +$560.
                </p>
              </div>
              <Link
                href="/admin/products"
                className="text-xs font-semibold text-brand-400 flex items-center gap-1 hover:underline"
              >
                View Catalog <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Card 3 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between h-72">
              <div>
                <div className="text-3xl font-extrabold text-brand-500 font-mono mb-4">03</div>
                <h3 className="text-lg font-bold text-white mb-2">Instant Payment Matching</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Record payments by method, date, and reference. Supports partial payments and
                  instant transition to Paid when fully settled.
                </p>
              </div>
              <Link
                href="/staff/payments"
                className="text-xs font-semibold text-brand-400 flex items-center gap-1 hover:underline"
              >
                Reconcile Payments <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Card 4 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between h-72">
              <div>
                <div className="text-3xl font-extrabold text-brand-500 font-mono mb-4">04</div>
                <h3 className="text-lg font-bold text-white mb-2">Customer Self-Service</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Strictly scoped customer portal where subscribers view own invoices, download
                  PDFs, and pause, renew, or close subscriptions.
                </p>
              </div>
              <Link
                href="/portal"
                className="text-xs font-semibold text-brand-400 flex items-center gap-1 hover:underline"
              >
                Open Portal <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRICING & PLANS SECTION (Matching Screenshot 105143) */}
      <section className="py-24 border-t border-white/10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <div>
            <div className="text-xs font-mono text-brand-400 tracking-wider uppercase mb-1">
              005 plat—form
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Flexible, transparent plans. Built for clarity and growth.
            </h2>
          </div>

          {/* Monthly / Yearly toggle */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg transition-all ${
                billingCycle === "monthly" ? "bg-brand-500 text-white font-bold" : "text-zinc-400"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly" ? "bg-brand-500 text-white font-bold" : "text-zinc-400"
              }`}
            >
              Yearly <span className="text-[10px] text-emerald-300 font-normal">Save 15%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Plan 1 */}
          <div className="glass-panel p-8 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                Starter Tier
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Rapid Scale</h3>
              <div className="text-4xl font-extrabold text-white mb-1">
                ${billingCycle === "monthly" ? "290" : "2,900"}
                <span className="text-xs text-zinc-400 font-normal">
                  /{billingCycle === "monthly" ? "mo" : "yr"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                For nimble businesses needing fast deployments and weekly billing flexibility.
              </p>

              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Min quantity: 1 seat
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Weekly & Monthly billing
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Pausable & Renewable
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Standard support SLA
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleLaunchConsole("admin")}
              className="mt-8 w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs border border-zinc-800 transition-colors"
            >
              Configure Plan
            </button>
          </div>

          {/* Plan 2: Highlighted */}
          <div className="glass-panel p-8 rounded-2xl border-2 border-brand-500/60 shadow-xl orange-glow-sm flex flex-col justify-between relative">
            <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[10px] font-bold bg-brand-500 text-white uppercase tracking-wider">
              Most Popular
            </div>

            <div>
              <div className="text-xs font-mono text-brand-400 uppercase tracking-wider mb-2">
                Professional Tier
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">BrightCore Enterprise</h3>
              <div className="text-4xl font-extrabold text-white mb-1">
                ${billingCycle === "monthly" ? "1,200" : "12,500"}
                <span className="text-xs text-zinc-400 font-normal">
                  /{billingCycle === "monthly" ? "mo" : "yr"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Complete subscription suite with Odoo variant connector, taxes, and volume rebates.
              </p>

              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Min quantity: 2 seats
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Odoo Connector (+560 extra variant)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Volume Discount 15% auto-applied
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Self-Service Customer Portal access
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  24/7 Dedicated SLA Add-on
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleLaunchConsole("admin")}
              className="mt-8 w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-md orange-glow-sm transition-all"
            >
              Select Plan
            </button>
          </div>

          {/* Plan 3 */}
          <div className="glass-panel p-8 rounded-2xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                Custom Annual Contract
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Global Enterprise</h3>
              <div className="text-4xl font-extrabold text-white mb-1">
                ${billingCycle === "monthly" ? "2,500" : "25,000"}
                <span className="text-xs text-zinc-400 font-normal">
                  /{billingCycle === "monthly" ? "mo" : "yr"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Yearly contracts with automatic term closing, Net 30/60 terms, and white-label branding.
              </p>

              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Min quantity: 5 seats
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Auto-close on expiration flag
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Dedicated Account Architect
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  Custom quotation template conversion
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleLaunchConsole("admin")}
              className="mt-8 w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs border border-zinc-800 transition-colors"
            >
              Build Custom Quote
            </button>
          </div>
        </div>
      </section>

      {/* 4. FAQ SECTION (Matching Screenshot 105151) */}
      <section className="py-20 border-t border-white/10 bg-[#0c0d12]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <div className="text-xs font-mono text-brand-400 tracking-wider uppercase mb-1">
              006 plat—form
            </div>
            <h2 className="text-3xl font-extrabold text-white">
              Questions & Answers: Everything you need to know.
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full py-4 px-6 text-left flex items-center justify-between font-semibold text-sm text-zinc-200 hover:text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-brand-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. CONTACT / LET'S TALK SECTION (Matching Screenshot 105249) */}
      <section className="py-20 border-t border-white/10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-5xl font-black text-brand-500 tracking-tight">Let's Talk.</h2>
            <p className="text-sm text-zinc-400">
              Ready to automate recurring billing and streamline subscriptions?
            </p>

            <div className="space-y-4 pt-4 text-xs">
              <div>
                <div className="text-zinc-500 uppercase font-semibold">Headquarters</div>
                <div className="text-zinc-200 mt-1">500 Silicon Way, Suite 400</div>
                <div className="text-zinc-400">Austin, TX 78701 — United States</div>
              </div>
              <div>
                <div className="text-zinc-500 uppercase font-semibold">Direct Contact</div>
                <div className="text-brand-400 font-mono mt-1">+1 (800) 555-0199</div>
                <div className="text-zinc-400 font-mono">support@brightloop.com</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="glass-panel p-8 rounded-2xl border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Start an instant demo session</h3>
              <p className="text-xs text-zinc-400 mb-6">
                Pick a role to explore how Brightloop SMS manages products, runs billing day, and reports revenue:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => handleLaunchConsole("admin")}
                  className="p-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-all hover:border-brand-500/50"
                >
                  <div className="text-brand-400 font-bold text-sm mb-1">Admin</div>
                  <div className="text-[11px] text-zinc-400">
                    Configure catalog, variants, taxes, discounts, and staff.
                  </div>
                </button>
                <button
                  onClick={() => handleLaunchConsole("staff")}
                  className="p-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-all hover:border-brand-500/50"
                >
                  <div className="text-brand-400 font-bold text-sm mb-1">Staff</div>
                  <div className="text-[11px] text-zinc-400">
                    Run billing day, manage quotes, confirm invoices, log payments.
                  </div>
                </button>
                <button
                  onClick={() => handleLaunchConsole("customer")}
                  className="p-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-all hover:border-brand-500/50"
                >
                  <div className="text-brand-400 font-bold text-sm mb-1">Customer</div>
                  <div className="text-[11px] text-zinc-400">
                    Self-service portal to view own subscriptions & invoices.
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10 text-center text-xs text-zinc-500">
        © 2026 Brightloop Software Inc. • plat—form Subscription Management System • All rights reserved.
      </footer>
    </div>
  );
}
