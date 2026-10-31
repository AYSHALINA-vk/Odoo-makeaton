"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";
import {
  LayoutDashboard,
  Layers,
  FileText,
  CalendarClock,
  CreditCard,
  Package,
  Sliders,
  Percent,
  Receipt,
  Users,
  ShieldCheck,
  History,
  FileCheck2,
  FolderKanban,
  Sparkles,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const role = user.role;

  // Navigation config based on role
  const adminLinks = [
    { label: "Executive Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Subscriptions", href: "/staff/subscriptions", icon: Layers },
    { label: "Invoices", href: "/staff/invoices", icon: FileText },
    { label: "Billing Day Engine", href: "/staff/billing-runs", icon: CalendarClock },
    { label: "Payments & Matching", href: "/staff/payments", icon: CreditCard },
    { label: "Quotation Templates", href: "/admin/templates", icon: FileCheck2 },
    { label: "Customers", href: "/staff/customers", icon: Users },
    { type: "divider", label: "Catalog & Configuration" },
    { label: "Products & Variants", href: "/admin/products", icon: Package },
    { label: "Plans & Periods", href: "/admin/plans", icon: Sliders },
    { label: "Discounts (Admin)", href: "/admin/discounts", icon: Percent },
    { label: "Tax Rules", href: "/admin/taxes", icon: Receipt },
    { label: "Staff Access", href: "/admin/staff", icon: ShieldCheck },
    { label: "Audit Log", href: "/audit-log", icon: History },
  ];

  const staffLinks = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Subscriptions", href: "/staff/subscriptions", icon: Layers },
    { label: "Invoices", href: "/staff/invoices", icon: FileText },
    { label: "Billing Runs", href: "/staff/billing-runs", icon: CalendarClock },
    { label: "Payments", href: "/staff/payments", icon: CreditCard },
    { label: "Quotation Templates", href: "/admin/templates", icon: FileCheck2 },
    { label: "Customers", href: "/staff/customers", icon: Users },
    { label: "Audit Log", href: "/audit-log", icon: History },
  ];

  const customerLinks = [
    { label: "My Subscriptions", href: "/portal", icon: Layers },
    { label: "My Invoices", href: "/portal/invoices", icon: FileText },
  ];

  const links = role === "admin" ? adminLinks : role === "staff" ? staffLinks : customerLinks;

  return (
    <aside className="w-64 shrink-0 hidden md:block border-r border-white/10 bg-[#090a0f] min-h-[calc(100vh-4rem)] p-4">
      {/* Role Indicator Banner */}
      <div className="mb-6 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">
          Current Workspace
        </div>
        <div className="text-sm font-bold text-white capitalize flex items-center gap-2 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          {role === "customer" ? "Customer Portal" : `${role} Workspace`}
        </div>
        <div className="text-xs text-zinc-400 mt-1 truncate">{user.email}</div>
      </div>

      <nav className="space-y-1">
        {links.map((item: any, idx) => {
          if (item.type === "divider") {
            return (
              <div key={idx} className="pt-4 pb-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3">
                  {item.label}
                </span>
              </div>
            );
          }

          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-brand-500/15 text-brand-400 border border-brand-500/30 font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/80 hover:border-zinc-800 border border-transparent"
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? "text-brand-500" : "text-zinc-400"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
