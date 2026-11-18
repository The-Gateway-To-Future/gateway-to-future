"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Compass,
  GraduationCap,
  Home,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface BottomNavigationBarProps {
  onEmailChange?: (newEmail: string) => void;
}

export function BottomNavigationBar({}: BottomNavigationBarProps = {}) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const { user, isAuthenticated } = useAuth();

  // If inside an active exam session (lesen, hoeren, schreiben, sprechen), hide the bottom nav completely (Focus Mode)
  if (pathname.includes("/exam/") && !pathname.endsWith("/result")) {
    return null;
  }

  const isHome = pathname === "/dashboard" || pathname === "/";
  const isAcademy =
    pathname.startsWith("/academy") ||
    pathname.startsWith("/studienkolleg") ||
    pathname.startsWith("/pflege") ||
    pathname.startsWith("/workbooks");
  const isPlan = pathname === "/pathways";

  const navItems = [
    {
      id: "home",
      label: "Hub",
      icon: Home,
      href: "/dashboard",
      isActive: isHome,
    },
    {
      id: "academy",
      label: "Academy",
      icon: GraduationCap,
      href: "/academy",
      isActive: isAcademy,
    },
    {
      id: "plan",
      label: "My Plan",
      icon: Compass,
      href: "/pathways",
      isActive: isPlan,
    },
    {
      id: "profile",
      label: isAuthenticated ? (user?.fullName?.split(" ")[0] || user?.userEmail?.split("@")[0] || "Profile") : "Log In",
      icon: User,
      href: isAuthenticated ? "/profile" : "/login",
      isActive: pathname === "/profile" || pathname === "/login" || pathname === "/register",
    },
  ];

  return (
    <div
      id="bottom-nav-bar"
      className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden border-t border-slate-200 bg-white/95 select-none text-slate-900 shadow-sm"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        WebkitBackdropFilter: "blur(10px)",
        backdropFilter: "blur(10px)",
      }}
    >
      <nav className="flex w-full items-center justify-around px-2 pt-1.5 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <motion.div
              key={item.id}
              whileTap={{ scale: 0.9 }}
              className="relative flex-1 min-w-0"
            >
              <Link
                href={item.href}
                className="flex w-full flex-col items-center justify-center py-1 transition-colors"
              >
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    active
                      ? "text-slate-900 scale-105"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                />
                <span
                  className={`mt-1 text-[10px] font-semibold tracking-wider uppercase transition-colors truncate max-w-full px-1 ${
                    active ? "text-slate-900 font-bold" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -top-1.5 h-0.5 w-6 rounded-full !bg-slate-900"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </div>
  );
}
