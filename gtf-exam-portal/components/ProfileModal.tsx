"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  User,
  X,
} from "lucide-react";
import { BRAND } from "@/lib/config";
import { getActiveUserEmail, setActiveUserEmail } from "@/lib/client-storage";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailChanged?: (newEmail: string) => void;
}

export function ProfileModal({ isOpen, onClose, onEmailChanged }: ProfileModalProps) {
  const [email, setEmail] = useState(() => getActiveUserEmail());
  const [editing, setEditing] = useState(false);
  const [draftEmail, setDraftEmail] = useState(email);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    const clean = draftEmail.trim().toLowerCase() || "demo@gatewaytofuture.com";
    setActiveUserEmail(clean);
    setEmail(clean);
    setEditing(false);
    setSavedSuccess(true);
    onEmailChanged?.(clean);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gtf-dark/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header with iOS Grabber bar on mobile */}
            <div className="flex sm:hidden justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-gtf-primary to-slate-900 text-gtf-gold shadow-md">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Student Profile</h3>
                  <p className="text-xs text-slate-500">GTF German Academy & Relocation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Active Student Account Card */}
              <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/60 via-amber-100/20 to-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                    Active Student License
                  </span>
                  {savedSuccess && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <Check className="h-3 w-3" /> Updated
                    </span>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-2 mt-2">
                    <input
                      type="email"
                      value={draftEmail}
                      onChange={(e) => setDraftEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 rounded-xl bg-gtf-primary py-2 text-xs font-bold text-white shadow-sm hover:bg-gtf-dark"
                      >
                        Save Email
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftEmail(email);
                          setEditing(false);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 mt-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Mail className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 truncate">{email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftEmail(email);
                        setEditing(true);
                      }}
                      className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-50 transition"
                    >
                      Switch
                    </button>
                  </div>
                )}
                <p className="mt-2 text-[11px] text-slate-500">
                  Enrolled courses and workbooks are tied to this verified email address.
                </p>
              </div>

              {/* Quick Navigation Links */}
              <div className="space-y-2">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Academy Hub</p>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <Link
                    href="/pathways"
                    onClick={onClose}
                    className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-gtf-primary">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">German Academic &amp; Career Roadmap</p>
                        <p className="text-[11px] text-slate-500">CEFR A1–B2, University &amp; Visa Stages</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </div>
              </div>

              {/* Founder & Mentorship Support */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src="/sarbjit-ceo.jpg"
                    alt="Sarbjit Kour — Founder & CEO, Gateway To Future"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallback) {
                        img.dataset.fallback = "1";
                        img.src = "/assets/images/sarbjit-ceo.jpg";
                      }
                    }}
                    className="h-12 w-12 rounded-xl border border-slate-200 object-cover object-top shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{BRAND.founderName}</p>
                    <p className="text-[11px] font-semibold text-amber-700">{BRAND.founderTitle}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gtf-primary shrink-0" />
                    <span>{BRAND.headquarters}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>WhatsApp / Direct Line: {BRAND.supportPhone}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <a
                    href={BRAND.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Chat on WhatsApp</span>
                  </a>
                  <a
                    href={BRAND.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span>Website</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
