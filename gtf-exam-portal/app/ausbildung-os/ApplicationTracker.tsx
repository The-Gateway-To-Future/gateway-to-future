"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  MapPin,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { BewerbungTargetField } from "./BewerbungsmappeBuilder";

export type ApplicationStatus =
  | "Applied"
  | "Follow-Up Sent"
  | "Interview Scheduled"
  | "Contract Received"
  | "Rejected";

export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "Applied",
  "Follow-Up Sent",
  "Interview Scheduled",
  "Contract Received",
  "Rejected",
] as const;

const TARGET_FIELDS: readonly BewerbungTargetField[] = [
  "Nursing",
  "Hospitality",
  "IT",
  "Handwerk",
] as const;

const STORAGE_KEY = "gtf_ausbildung_os_applications_v1";

interface AusbildungApplication {
  id: string;
  companyName: string;
  city: string;
  targetField: BewerbungTargetField;
  appliedDate: string;
  status: ApplicationStatus;
  notes: string;
  updatedAt: string;
}

interface InterviewQuestionItem {
  id: string;
  questionDe: string;
  hinglishHint: string;
  answerStarterDe: string;
}

const INTERVIEW_QUESTIONS_12: readonly InterviewQuestionItem[] = [
  {
    id: "q1",
    questionDe: "1. Bitte stellen Sie sich kurz vor.",
    hinglishHint:
      "Family history mat sunao — sirf 60 seconds mein crisp Name, City, 12th/Degree, German Level aur target Ausbildung batao.",
    answerStarterDe:
      "Vielen Dank für die Einladung. Mein Name ist [Name], ich komme aus [Stadt] in Indien. Ich habe meinen Schulabschluss mit Schwerpunkt [Fach] absolviert und lerne aktuell intensiv Deutsch auf Niveau [B1/B2], um eine Ausbildung als [Beruf] in Deutschland zu beginnen.",
  },
  {
    id: "q2",
    questionDe: "2. Warum möchten Sie diese Ausbildung genau in Deutschland machen?",
    hinglishHint:
      "Sirf 'high salary' mat bolo — Germany ke dual system (theory + paid practice), quality standards aur long-term career stability ko highlight karo.",
    answerStarterDe:
      "Das duale Ausbildungssystem in Deutschland verbindet praktische Arbeit direkt mit strukturierter Berufsschule. Diese hohe Ausbildungsqualität, klare Standards und langfristige berufliche Perspektive motivieren mich besonders.",
  },
  {
    id: "q3",
    questionDe: "3. Warum haben Sie sich für diesen Ausbildungsberuf entschieden?",
    hinglishHint:
      "Apni field (Nursing/Hospitality/IT/Handwerk) se judi real interest ya koi personal experience 2 lines mein connect karo.",
    answerStarterDe:
      "Ich habe mich bewusst für diesen Beruf entschieden, weil mir praktische Zusammenarbeit mit Menschen sowie strukturiertes Arbeiten große Freude bereiten. Bereits in meiner Schulzeit und ersten Projekten hat mich genau dieser Bereich begeistert.",
  },
  {
    id: "q4",
    questionDe: "4. Was wissen Sie über unser Klinikum bzw. unser Unternehmen?",
    hinglishHint:
      "Interview se 15 min pehle company ki website se 2 facts note karo: kitne beds/locations hain, aur kaunsi specialty famous hai.",
    answerStarterDe:
      "Ich habe mich auf Ihrer Website informiert und gesehen, dass Ihr Haus in [Stadt] besonderen Wert auf Qualität, moderne Ausstattung und eine strukturierte Begleitung der Auszubildenden legt.",
  },
  {
    id: "q5",
    questionDe: "5. Wie schätzen Sie Ihre aktuellen Deutschkenntnisse im Arbeitsalltag ein?",
    hinglishHint:
      "Honest aur confident raho — batao ki aap daily speaking practice kar rahe ho aur B1/B2 ke saath fachliche Wörter bhi seekh rahe ho.",
    answerStarterDe:
      "Aktuell spreche ich Deutsch auf Niveau [B1/B2]. Ich verstehe Arbeitsanweisungen gut, übe täglich das aktive Sprechen und lerne gezielt den Fachwortschatz für meinen Ausbildungsbereich.",
  },
  {
    id: "q6",
    questionDe: "6. Haben Sie bereits praktische Erfahrungen oder ein Praktikum gesammelt?",
    hinglishHint:
      "Agar formal job nahi hai toh college lab, hospital volunteering, family business ya project experience bhi clearly count hota hai.",
    answerStarterDe:
      "Ja, während meines [Praktikums / Projekts] konnte ich erste praktische Einblicke sammeln. Dabei habe ich gelernt, zuverlässig im Team zu arbeiten, Aufgaben sorgfältig zu dokumentieren und Verantwortung zu übernehmen.",
  },
  {
    id: "q7",
    questionDe: "7. Wie gehen Sie mit Stress, Schichtdienst oder Wochenendarbeit um?",
    hinglishHint:
      "Nursing aur Hospitality HR ke liye yeh key filter hai — clearly bolo ki shift work se aapko koi problem nahi aur aap calm rehte ho.",
    answerStarterDe:
      "Schicht- und Wochenenddienst sind für mich selbstverständlich. In stressigen Situationen bleibe ich ruhig, arbeite Schritt für Schritt nach Prioritäten und stimme mich frühzeitig mit meinem Team ab.",
  },
  {
    id: "q8",
    questionDe: "8. Was sind Ihre größten Stärken und woran möchten Sie noch arbeiten?",
    hinglishHint:
      "2 strengths (Pünktlichkeit, Teamgeist) aur 1 safe growth area bolo (jaise regional German dialects samajhna, jiske liye aap practice kar rahe ho).",
    answerStarterDe:
      "Zu meinen Stärken zählen Zuverlässigkeit, Pünktlichkeit und schnelle Lernbereitschaft. Gleichzeitig arbeite ich täglich daran, meinen deutschen Fachwortschatz und das Verständnis regionaler Umgangssprache weiter zu verbessern.",
  },
  {
    id: "q9",
    questionDe: "9. Wie bereiten Sie sich auf das Leben und den Alltag allein in Deutschland vor?",
    hinglishHint:
      "HR ko assurance chahiye ki aap homesick hokar chhodoge nahi — mention karo ki aap cooking, budgeting aur German culture se familiar ho.",
    answerStarterDe:
      "Ich lebe bereits sehr selbstständig, organisiere meinen Alltag selbst und informiere mich intensiv über die Kultur, das Wohnen und die Abläufe in Deutschland. Außerdem werde ich von meinem Netzwerk in Berlin unterstützt.",
  },
  {
    id: "q10",
    questionDe: "10. Wie reagieren Sie, wenn Sie eine Arbeitsanweisung sprachlich nicht sofort verstehen?",
    hinglishHint:
      "Kabhi chupchaap guess mat karo! German HR 'nachfragen' (politely double-check karna) ko safety aur professionalism maanta hai.",
    answerStarterDe:
      "In so einem Fall frage ich sofort höflich nach und wiederhole die Aufgabe in meinen eigenen Worten, um Missverständnisse auszuschließen. Sicherheit und Genauigkeit stehen für mich an erster Stelle.",
  },
  {
    id: "q11",
    questionDe: "11. Wie ist der aktuelle Stand Ihrer Unterlagen und Ihres Visumsverfahrens?",
    hinglishHint:
      "Exact status batao: Passport ready, 10th/12th & Anerkennung status clear hai, aur sign hote hi § 16a CSP visa file karoge.",
    answerStarterDe:
      "Mein Reisepass, meine übersetzten Schulzeugnisse und mein Sprachnachweis liegen vollständig vor. Sobald der Ausbildungsvertrag unterzeichnet ist, reiche ich das Visum nach § 16a AufenthG direkt über das Consular Services Portal ein.",
  },
  {
    id: "q12",
    questionDe: "12. Haben Sie noch Fragen an uns?",
    hinglishHint:
      "Kabhi 'Nein' mat bolo! 2 smart questions poochho: onboarding/Einarbeitung aur team support ke baare mein.",
    answerStarterDe:
      "Ja, sehr gerne: Wie läuft die Einarbeitung in den ersten Wochen für internationale Auszubildende ab, und gibt es eine feste Praxisanleitung bzw. Ansprechperson im Team?",
  },
] as const;

function getLocalTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDaysSinceApplied(appliedDate: string, currentMs: number | null): number | null {
  if (!currentMs || !appliedDate) return null;
  const parsed = new Date(`${appliedDate}T00:00:00`).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.floor((currentMs - parsed) / (1000 * 60 * 60 * 24));
}

function getStatusBadgeClasses(status: ApplicationStatus): string {
  switch (status) {
    case "Contract Received":
      return "border-emerald-400/50 bg-emerald-500/15 text-emerald-300";
    case "Interview Scheduled":
      return "border-sky-400/50 bg-sky-500/15 text-sky-300";
    case "Follow-Up Sent":
      return "border-amber-400/45 bg-amber-500/15 text-amber-200";
    case "Rejected":
      return "border-rose-400/40 bg-rose-500/15 text-rose-300";
    case "Applied":
    default:
      return "border-white/15 bg-white/10 text-slate-200";
  }
}

export interface ApplicationTrackerProps {
  defaultTargetField: BewerbungTargetField;
}

export function ApplicationTracker({ defaultTargetField }: ApplicationTrackerProps) {
  const [applications, setApplications] = useState<AusbildungApplication[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [defaultDate, setDefaultDate] = useState("");

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("");
  const [targetField, setTargetField] = useState<BewerbungTargetField>(defaultTargetField);
  const [appliedDate, setAppliedDate] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("Applied");
  const [notes, setNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ApplicationStatus>("All");

  // Interview questions accordion state
  const [isDeckExpanded, setIsDeckExpanded] = useState(true);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>("q1");

  useEffect(() => {
    const today = getLocalTodayIso();
    setDefaultDate(today);
    setAppliedDate(today);
    setNowMs(Date.now());

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (item): item is AusbildungApplication =>
              Boolean(item) &&
              typeof item === "object" &&
              typeof (item as AusbildungApplication).id === "string" &&
              typeof (item as AusbildungApplication).companyName === "string" &&
              typeof (item as AusbildungApplication).city === "string" &&
              (TARGET_FIELDS as readonly string[]).includes(
                (item as AusbildungApplication).targetField,
              ) &&
              typeof (item as AusbildungApplication).appliedDate === "string" &&
              (APPLICATION_STATUSES as readonly string[]).includes(
                (item as AusbildungApplication).status,
              ),
          );
          setApplications(valid);
        }
      }
    } catch {
      // ignore localStorage read errors
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!editingId) {
      setTargetField(defaultTargetField);
    }
  }, [defaultTargetField, editingId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch {
      // ignore localStorage write errors
    }
  }, [applications, hydrated]);

  const resetForm = () => {
    setEditingId(null);
    setCompanyName("");
    setCity("");
    setTargetField(defaultTargetField);
    setAppliedDate(defaultDate);
    setStatus("Applied");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCompany = companyName.trim();
    const cleanCity = city.trim();
    if (!cleanCompany || !cleanCity || !appliedDate) return;

    const timestamp = new Date().toISOString();

    if (editingId) {
      setApplications((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                companyName: cleanCompany,
                city: cleanCity,
                targetField,
                appliedDate,
                status,
                notes: notes.trim(),
                updatedAt: timestamp,
              }
            : item,
        ),
      );
      resetForm();
      return;
    }

    const newItem: AusbildungApplication = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      companyName: cleanCompany,
      city: cleanCity,
      targetField,
      appliedDate,
      status,
      notes: notes.trim(),
      updatedAt: timestamp,
    };
    setApplications((prev) => [newItem, ...prev]);
    resetForm();
  };

  const handleEdit = (item: AusbildungApplication) => {
    setEditingId(item.id);
    setCompanyName(item.companyName);
    setCity(item.city);
    setTargetField(item.targetField);
    setAppliedDate(item.appliedDate);
    setStatus(item.status);
    setNotes(item.notes);
  };

  const handleDelete = (id: string) => {
    setApplications((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  const handleQuickStatusChange = (id: string, nextStatus: ApplicationStatus) => {
    const timestamp = new Date().toISOString();
    setApplications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: nextStatus, updatedAt: timestamp } : item,
      ),
    );
  };

  const kpis = useMemo(() => {
    let followUpsDue = 0;
    let interviews = 0;
    let contracts = 0;

    for (const item of applications) {
      const days = getDaysSinceApplied(item.appliedDate, nowMs);
      if (item.status === "Applied" && days !== null && days > 14) {
        followUpsDue += 1;
      }
      if (item.status === "Interview Scheduled") interviews += 1;
      if (item.status === "Contract Received") contracts += 1;
    }

    return {
      total: applications.length,
      followUpsDue,
      interviews,
      contracts,
    };
  }, [applications, nowMs]);

  const filteredApplications = useMemo(() => {
    if (statusFilter === "All") return applications;
    return applications.filter((item) => item.status === statusFilter);
  }, [applications, statusFilter]);

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-[#0A1628]/90 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-[#FFD166]";
  const labelClass =
    "block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300 mb-1.5";

  return (
    <div className="no-print ausbildung-print-hide space-y-6">
      {/* Application & Interview Tracker Card */}
      <section className="rounded-3xl border border-white/10 bg-[#0D1017]/90 p-5 sm:p-7 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FFD166]/35 bg-[#FFD166]/10 text-[#FFD166]">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFD166]">
                Pipeline CRM · Auto-Saved
              </p>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Application &amp; Interview Tracker
              </h2>
              <p className="text-[11px] text-slate-400">
                Track every German employer application. Flags &ldquo;Follow-Up Due&rdquo; automatically after 14 days.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>Saved Locally</span>
          </span>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-2xl border border-white/10 bg-[#0A1628]/75 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Total Applied
            </p>
            <p className="mt-1 text-xl font-bold font-mono text-white">{kpis.total}</p>
          </div>
          <div className="rounded-2xl border border-[#FFD166]/30 bg-[#FFD166]/10 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#FFD166]">
              Follow-Ups Due
            </p>
            <p className="mt-1 text-xl font-bold font-mono text-[#FFD166]">
              {kpis.followUpsDue}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0A1628]/75 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-300">
              Interviews
            </p>
            <p className="mt-1 text-xl font-bold font-mono text-sky-300">{kpis.interviews}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
              Contracts
            </p>
            <p className="mt-1 text-xl font-bold font-mono text-emerald-300">
              {kpis.contracts}
            </p>
          </div>
        </div>

        {/* Add / Edit Application Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-[#0A1628]/60 p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FFD166]">
              {editingId ? "Edit Application Entry" : "Log New German Application"}
            </p>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Cancel Edit</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="tr-company" className={labelClass}>
                Company / Hospital Name
              </label>
              <input
                id="tr-company"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Charité Berlin / Maritim Hotel"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="tr-city" className={labelClass}>
                City
              </label>
              <input
                id="tr-city"
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Berlin"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="tr-field" className={labelClass}>
                Target Field
              </label>
              <select
                id="tr-field"
                value={targetField}
                onChange={(e) => setTargetField(e.target.value as BewerbungTargetField)}
                className={inputClass}
              >
                {TARGET_FIELDS.map((field) => (
                  <option key={field} value={field} className="bg-[#0A1628] text-white">
                    {field}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tr-date" className={labelClass}>
                Applied Date
              </label>
              <input
                id="tr-date"
                type="date"
                required
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="tr-status" className={labelClass}>
                Status
              </label>
              <select
                id="tr-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className={inputClass}
              >
                {APPLICATION_STATUSES.map((st) => (
                  <option key={st} value={st} className="bg-[#0A1628] text-white">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tr-notes" className={labelClass}>
                Short Notes
              </label>
              <input
                id="tr-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Sent DIN Bewerbungsmappe via ATS portal"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFD166] px-5 py-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1628] shadow-lg transition hover:bg-amber-300 cursor-pointer"
            >
              <span>{editingId ? "Update Application" : "Add Application"}</span>
            </button>
          </div>
        </form>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3.5">
          {(["All", ...APPLICATION_STATUSES] as const).map((filterItem) => {
            const active = statusFilter === filterItem;
            return (
              <button
                key={filterItem}
                type="button"
                onClick={() => setStatusFilter(filterItem)}
                className={`rounded-xl border px-3 py-1.5 text-[11px] transition-all cursor-pointer ${
                  active
                    ? "border-[#FFD166] bg-[#FFD166] text-[#0A1628] font-extrabold"
                    : "border-white/10 bg-[#0A1628]/75 text-slate-300 font-semibold hover:border-[#FFD166]/40 hover:text-[#FFD166]"
                }`}
              >
                {filterItem}
              </button>
            );
          })}
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-[#0A1628]/40 p-6 text-center space-y-1.5">
            <p className="text-sm font-semibold text-white">
              {applications.length === 0
                ? "No applications logged yet"
                : `No applications in "${statusFilter}"`}
            </p>
            <p className="text-xs text-slate-400">
              {applications.length === 0
                ? "Log your first German hospital or employer application above to track replies and 14-day follow-ups."
                : "Select another status filter or log a new application above."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredApplications.map((item) => {
              const daysSince = getDaysSinceApplied(item.appliedDate, nowMs);
              const isFollowUpDue =
                item.status === "Applied" && daysSince !== null && daysSince > 14;

              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-4 sm:p-5 transition-colors space-y-3 ${
                    isFollowUpDue
                      ? "border-[#FFD166]/45 bg-gradient-to-r from-[#FFD166]/10 via-[#0A1628]/85 to-[#0D1017]"
                      : "border-white/10 bg-[#0A1628]/75 hover:border-[#FFD166]/35"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-white">
                          <Building2 className="h-4 w-4 text-[#FFD166] shrink-0" />
                          <span className="truncate">{item.companyName}</span>
                        </span>
                        <span className="rounded-full border border-[#FFD166]/30 bg-[#FFD166]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFD166]">
                          {item.targetField}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                          <span>{item.city}</span>
                        </span>
                        <span>Applied: {item.appliedDate}</span>
                        {daysSince !== null && daysSince >= 0 && (
                          <span className="text-slate-500">({daysSince}d ago)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClasses(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </span>

                      {isFollowUpDue && (
                        <span
                          title={`${daysSince} days since applied — send a polite German follow-up email`}
                          className="inline-flex items-center gap-1 rounded-full border border-[#FFD166]/55 bg-[#FFD166]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFD166]"
                        >
                          <Clock className="h-3 w-3 text-[#FFD166]" />
                          <span>Follow-Up Due</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-slate-300 leading-relaxed rounded-xl border border-white/5 bg-[#07090E]/50 px-3 py-2">
                      {item.notes}
                    </p>
                  )}

                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                    <select
                      aria-label={`Update status for ${item.companyName}`}
                      value={item.status}
                      onChange={(e) =>
                        handleQuickStatusChange(item.id, e.target.value as ApplicationStatus)
                      }
                      className="rounded-lg border border-white/15 bg-[#051329] px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:border-[#FFD166]"
                    >
                      {APPLICATION_STATUSES.map((st) => (
                        <option key={st} value={st} className="bg-[#0A1628] text-white">
                          {st}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-[#FFD166]/40 hover:text-[#FFD166] transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Delete ${item.companyName}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Collapsible Top 12 German Ausbildung HR Interview Questions */}
      <section className="rounded-3xl border border-white/10 bg-[#0D1017]/90 p-5 sm:p-7 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] space-y-4">
        <button
          type="button"
          aria-expanded={isDeckExpanded}
          onClick={() => setIsDeckExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FFD166]/35 bg-[#FFD166]/10 text-[#FFD166]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFD166]">
                Interview Prep · Indian Applicant Playbook
              </p>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Top 12 German Ausbildung HR Interview Questions
              </h2>
              <p className="text-[11px] text-slate-400">
                Exact HR questions, Hinglish strategy hints, and ready-to-speak German answer starters
              </p>
            </div>
          </div>

          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#FFD166]/30 bg-[#0A1628] text-[#FFD166]">
            {isDeckExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </button>

        {isDeckExpanded && (
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            {INTERVIEW_QUESTIONS_12.map((item) => {
              const isOpen = expandedQuestionId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-colors ${
                    isOpen
                      ? "border-[#FFD166]/55 bg-[#0A1628]/90"
                      : "border-white/10 bg-[#0A1628]/55 hover:border-[#FFD166]/35"
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setExpandedQuestionId((prev) => (prev === item.id ? null : item.id))
                    }
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer"
                  >
                    <span
                      className={`text-xs sm:text-sm font-bold leading-snug ${
                        isOpen ? "text-[#FFD166]" : "text-white"
                      }`}
                    >
                      {item.questionDe}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-[#FFD166]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2.5 border-t border-white/10 pt-3">
                      <div className="rounded-xl border border-[#FFD166]/25 bg-[#FFD166]/10 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#FFD166] mb-1">
                          Hinglish Strategy Hint
                        </p>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {item.hinglishHint}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300 mb-1">
                          German Answer Starter
                        </p>
                        <p className="text-xs text-slate-100 leading-relaxed italic">
                          &ldquo;{item.answerStarterDe}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
