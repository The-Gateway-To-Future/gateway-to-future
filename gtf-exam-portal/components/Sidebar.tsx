"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  GraduationCap,
  Hospital,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Terminal,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BRAND, DIVISIONS, DIVISION_META } from "@/lib/config";
import { setActiveDivision } from "@/lib/client-storage";
import type { DivisionId } from "@/lib/types";

interface SidebarProps {
  activeDivision: DivisionId;
  onSelectDivision: (div: DivisionId) => void;
}

export function Sidebar({ activeDivision, onSelectDivision }: SidebarProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // If in active exam, hide sidebar entirely for Focus Mode
  if (pathname.includes("/exam/") && !pathname.endsWith("/result")) {
    return null;
  }

  const divisionIcons: Record<DivisionId, typeof GraduationCap> = {
    sprachakademie: GraduationCap,
    studienkolleg: Terminal,
    fachsprache_medizin: Hospital,
  };

  const currentNavItems = [
    {
      href: "/dashboard",
      label: "Division Dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard" && !pathname.includes("/pathways"),
    },
    {
      href: "/pathways",
      label: "My Path & Visa Roadmap",
      icon: Compass,
      isActive: pathname === "/pathways",
    },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-slate-200/90 bg-white/95 backdrop-blur-xl transition-all duration-300 z-30 select-none ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Brand & Toggle Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-gtf-primary via-slate-900 to-gtf-dark text-gtf-gold shadow-md shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="truncate">
              <span className="text-sm font-black tracking-tight text-gtf-primary">
                {BRAND.name}
              </span>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                {BRAND.tagline}
              </p>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link href="/dashboard" className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-gtf-primary text-gtf-gold shadow-md">
            <GraduationCap className="h-5 w-5" />
          </Link>
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* 3-Division Switcher Menu */}
      <div className="p-3 border-b border-slate-100 space-y-1">
        {!collapsed && (
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
            Enterprise Divisions
          </p>
        )}

        {DIVISIONS.map((divId) => {
          const meta = DIVISION_META[divId];
          const Icon = divisionIcons[divId];
          const isSelected = activeDivision === divId;

          return (
            <button
              key={divId}
              type="button"
              onClick={() => {
                onSelectDivision(divId);
                setActiveDivision(divId);
                if (pathname !== "/dashboard") {
                  router.push(`/dashboard?division=${divId}`);
                }
              }}
              className={`relative w-full flex items-center gap-3 rounded-2xl p-2.5 transition-colors text-left select-none ${
                isSelected
                  ? "text-white font-bold"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-semibold"
              }`}
              title={meta.name}
            >
              {isSelected && (
                <motion.div
                  layoutId="active-sidebar-division-pill"
                  className="absolute inset-0 rounded-2xl bg-gtf-primary shadow-md"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-xl shrink-0 transition-colors ${
                  isSelected ? "bg-white/15 text-gtf-gold" : "bg-slate-100 text-slate-600"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>

              {!collapsed && (
                <div className="relative z-10 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black truncate">{meta.shortTitle}</span>
                  </div>
                  <p className={`text-[10px] truncate ${isSelected ? "text-amber-200" : "text-slate-400"}`}>
                    {meta.badge}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Primary Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {!collapsed && (
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
            Platform Navigation
          </p>
        )}

        {currentNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl p-2.5 text-xs font-bold transition ${
                item.isActive
                  ? "bg-amber-50 text-amber-900 border border-amber-200/80 shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title={item.label}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  item.isActive ? "text-amber-600" : "text-slate-400"
                }`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Founder Direct Assistance & Session Security Badge */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        {!collapsed && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-[11px]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Single-Device Lock Active</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {user ? `Active: ${user.userEmail}` : "Strict bank-grade mode"}
            </p>
          </div>
        )}

        {/* Auth / Account Profile */}
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gtf-primary text-xs font-bold text-white shrink-0">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.userEmail}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                type="button"
                onClick={logout}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                title="Log Out & Invalidate Session"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gtf-primary py-2.5 text-xs font-bold text-white shadow-sm hover:bg-gtf-dark transition"
          >
            <User className="h-4 w-4 text-gtf-gold" />
            {!collapsed && <span>Student Log In</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}
