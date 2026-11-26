"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  FileText,
  Printer,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";

export type BewerbungGermanLevel = "None" | "A1" | "A2" | "B1" | "B2";
export type BewerbungTargetField = "Nursing" | "Hospitality" | "IT" | "Handwerk";

export interface BewerbungsmappeBuilderProps {
  germanLevel: BewerbungGermanLevel;
  targetField: BewerbungTargetField;
  defaultFullName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  isLocked?: boolean;
}

interface BewerbungsmappeData {
  fullName: string;
  dateOfBirth: string;
  cityCountry: string;
  email: string;
  phone: string;
  tenthYear: string;
  tenthGrade: string;
  twelfthYear: string;
  twelfthGrade: string;
  degreeDiploma: string;
  experienceSummary: string;
}

const STORAGE_KEY = "gtf_ausbildung_os_bewerbungsmappe_v1";

const EMPTY_FORM: BewerbungsmappeData = {
  fullName: "",
  dateOfBirth: "",
  cityCountry: "",
  email: "",
  phone: "",
  tenthYear: "",
  tenthGrade: "",
  twelfthYear: "",
  twelfthGrade: "",
  degreeDiploma: "",
  experienceSummary: "",
};

const GERMAN_LEVEL_DESCRIPTIONS: Record<BewerbungGermanLevel, string> = {
  None: "Anfänger (aktuell in intensiver Sprachvorbereitung A1)",
  A1: "Grundstufe A1 (Goethe / telc Vorbereitung, aktiver Ausbau auf B1/B2)",
  A2: "Grundstufe A2 (Elementare Sprachverwendung, Vorbereitung auf B1)",
  B1: "Mittelstufe B1 (Selbstständige Sprachverwendung, Goethe / telc Niveau)",
  B2: "Gute Mittelstufe B2 (Fließend in Wort und Schrift, Beruf & Anerkennung)",
};

interface FieldTemplate {
  germanRole: string;
  subject: string;
  strengths: readonly string[];
  openingParagraph: string;
  motivationParagraph: string;
}

const FIELD_TEMPLATES: Record<BewerbungTargetField, FieldTemplate> = {
  Nursing: {
    germanRole: "Pflegefachfrau / Pflegefachmann (m/w/d)",
    subject:
      "Bewerbung um einen Ausbildungsplatz als Pflegefachfrau / Pflegefachmann (m/w/d)",
    strengths: [
      "Empathie & verantwortungsbewusster Umgang mit Patientinnen und Patienten",
      "Teamfähigkeit, Belastbarkeit & strukturiertes Arbeiten im Schichtbetrieb",
      "Interesse an klinischer Pflege, Hygiene und Pflegedokumentation",
    ],
    openingParagraph:
      "mit großem Interesse bewerbe ich mich in Ihrem Hause um einen Ausbildungsplatz zur Pflegefachfrau bzw. zum Pflegefachmann nach dem Pflegeberufegesetz. Der Wunsch, Menschen in medizinischen und pflegerischen Situationen fachkundig und einfühlsam zu begleiten, motiviert mich für eine fundierte generalistische Ausbildung in Deutschland.",
    motivationParagraph:
      "Besonders schätze ich an der deutschen Pflegeausbildung die enge Verbindung zwischen klinischer Praxis auf der Station und fundierter Theorie in der Pflegeschule. Zuverlässigkeit, hygienische Sorgfalt, ruhiges Handeln in fordernden Situationen sowie ein respektvoller Umgang im interdisziplinären Team zählen zu meinen Stärken.",
  },
  Hospitality: {
    germanRole: "Hotelfachfrau / Hotelfachmann (m/w/d)",
    subject:
      "Bewerbung um einen Ausbildungsplatz als Hotelfachfrau / Hotelfachmann (m/w/d)",
    strengths: [
      "Ausgeprägte Service- und Gästeorientierung",
      "Interkulturelle Kommunikationsstärke & freundliches Auftreten",
      "Organisationstalent, Flexibilität und Teamgeist im Hotelbetrieb",
    ],
    openingParagraph:
      "mit großer Begeisterung bewerbe ich mich in Ihrem Unternehmen um einen Ausbildungsplatz als Hotelfachfrau bzw. Hotelfachmann. Die internationale Gastfreundschaft, professionelle Abläufe am Empfang und im Service sowie der direkte Kontakt zu Gästen aus aller Welt faszinieren mich an der deutschen Hotellerie.",
    motivationParagraph:
      "Durch meine interkulturelle Erfahrung und meine ausgeprägte Kommunikationsfreude bringe ich beste Voraussetzungen für Rezeption, Gästebetreuung und den F&B-Bereich mit. Ich arbeite gerne im Team, bleibe auch bei hohem Gästeaufkommen strukturiert und freue mich darauf, den Qualitätsstandard Ihres Hauses nach IHK-Ausbildungsrahmenplan zu erlernen.",
  },
  IT: {
    germanRole: "Fachinformatiker / Fachinformatikerin (m/w/d)",
    subject:
      "Bewerbung um einen Ausbildungsplatz als Fachinformatiker / Fachinformatikerin (m/w/d)",
    strengths: [
      "Analytisches Denken & strukturierte Problemlösung",
      "Hohe Affinität zu Software, Netzwerken und modernen IT-Systemen",
      "Schnelle Auffassungsgabe, Lernbereitschaft und sorgfältige Dokumentation",
    ],
    openingParagraph:
      "mit großem Interesse bewerbe ich mich bei Ihnen um einen Ausbildungsplatz als Fachinformatikerin bzw. Fachinformatiker. Moderne IT-Infrastrukturen, Softwareentwicklung und die systematische Lösung technischer Fragestellungen begeistern mich seit meiner Schulzeit.",
    motivationParagraph:
      "Die duale IHK-Ausbildung in Deutschland bietet mir die ideale Kombination aus betrieblicher Praxis an realen IT-Projekten und theoretischer Vertiefung in der Berufsschule. Ich denke analytisch, arbeite präzise und möchte mich langfristig mit Engagement und Lernbereitschaft in Ihr IT-Team einbringen.",
  },
  Handwerk: {
    germanRole: "Auszubildende / Auszubildender im deutschen Handwerk (m/w/d)",
    subject:
      "Bewerbung um einen Ausbildungsplatz im deutschen Handwerk (m/w/d)",
    strengths: [
      "Handwerkliches Geschick & präzise, sorgfältige Arbeitsweise",
      "Technisches Verständnis, Zuverlässigkeit und körperliche Belastbarkeit",
      "Hohes Sicherheitsbewusstsein und Motivation für praktische Teamarbeit",
    ],
    openingParagraph:
      "mit großer Motivation bewerbe ich mich in Ihrem Betrieb um einen Ausbildungsplatz im deutschen Handwerk. Praktisches Arbeiten, technisches Verständnis und das Ziel, sichtbare Qualität mit eigenen Händen zu schaffen, haben meinen Berufswunsch geprägt.",
    motivationParagraph:
      "An einer dualen Ausbildung in Deutschland schätze ich besonders die direkte Anleitung durch erfahrene Meisterinnen und Meister sowie das präzise Arbeiten nach DIN- und Sicherheitsstandards. Pünktlichkeit, Ausdauer und Teamgeist sind für mich selbstverständlich.",
  },
};

const PRINT_STYLES = `
@page {
  size: A4 portrait;
  margin: 16mm;
}

@media print {
  html,
  body,
  #ausbildung-os-page {
    background: #ffffff !important;
    color: #0f172a !important;
    overflow: visible !important;
    height: auto !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  main#ausbildung-os-main {
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  #ausbildung-os-container {
    max-width: none !important;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  #ausbildung-os-page .ausbildung-print-hide,
  #print-piracy-warning {
    display: none !important;
  }

  #bewerbungsmappe-root {
    display: block !important;
    background: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  #bewerbungsmappe-print-sheet {
    display: block !important;
    visibility: visible !important;
    background: #ffffff !important;
    color: #0f172a !important;
    width: 100% !important;
  }

  #bewerbungsmappe-print-sheet .din-page-break {
    page-break-before: always !important;
    break-before: page !important;
  }
}
`;

function formatGermanDob(rawDate: string): string {
  const trimmed = rawDate.trim();
  if (!trimmed) return "[Geburtsdatum]";
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  }
  return trimmed;
}

function extractCity(cityCountry: string): string {
  const trimmed = cityCountry.trim();
  if (!trimmed) return "Wohnort";
  const firstPart = trimmed.split(",")[0]?.trim();
  return firstPart || trimmed;
}

interface DocumentViewProps {
  data: BewerbungsmappeData;
  germanLevel: BewerbungGermanLevel;
  targetField: BewerbungTargetField;
  todayGermanDate: string;
}

function LebenslaufDocument({
  data,
  germanLevel,
  targetField,
  todayGermanDate,
}: DocumentViewProps) {
  const tpl = FIELD_TEMPLATES[targetField];
  const displayName = data.fullName.trim() || "[Vor- und Nachname]";
  const displayDob = formatGermanDob(data.dateOfBirth);
  const displayCity = data.cityCountry.trim() || "[Stadt, Land]";
  const displayEmail = data.email.trim() || "[E-Mail-Adresse]";
  const displayPhone = data.phone.trim() || "[Telefonnummer]";
  const cityOnly = extractCity(data.cityCountry);
  const dateLabel = todayGermanDate || "—";

  return (
    <div className="bg-white text-slate-900 font-sans text-[13px] leading-relaxed">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Lebenslauf
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
            {displayName}
          </h3>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            Bewerbung: {tpl.germanRole}
          </p>
        </div>
        <div className="text-xs text-slate-600 sm:text-right space-y-0.5">
          <p>{displayCity}</p>
          <p>{displayEmail}</p>
          <p>{displayPhone}</p>
        </div>
      </div>

      {/* Persönliche Daten */}
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
          Persönliche Daten
        </p>
        <table className="w-full border-collapse text-[12.5px]">
          <tbody>
            <tr>
              <td className="w-36 sm:w-44 py-1 pr-3 font-semibold text-slate-600 align-top">
                Name
              </td>
              <td className="py-1 text-slate-900 font-medium">{displayName}</td>
            </tr>
            <tr>
              <td className="w-36 sm:w-44 py-1 pr-3 font-semibold text-slate-600 align-top">
                Geburtsdatum
              </td>
              <td className="py-1 text-slate-900">{displayDob}</td>
            </tr>
            <tr>
              <td className="w-36 sm:w-44 py-1 pr-3 font-semibold text-slate-600 align-top">
                Wohnort
              </td>
              <td className="py-1 text-slate-900">{displayCity}</td>
            </tr>
            <tr>
              <td className="w-36 sm:w-44 py-1 pr-3 font-semibold text-slate-600 align-top">
                E-Mail
              </td>
              <td className="py-1 text-slate-900 break-all">{displayEmail}</td>
            </tr>
            <tr>
              <td className="w-36 sm:w-44 py-1 pr-3 font-semibold text-slate-600 align-top">
                Telefon
              </td>
              <td className="py-1 text-slate-900">{displayPhone}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Schulbildung */}
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
          Schulbildung &amp; Qualifikation
        </p>
        <table className="w-full border-collapse text-[12.5px]">
          <tbody>
            {data.degreeDiploma.trim() && (
              <tr>
                <td className="w-36 sm:w-44 py-1.5 pr-3 font-semibold text-slate-600 align-top">
                  Studium / Diplom
                </td>
                <td className="py-1.5 text-slate-900">
                  <span className="font-semibold">{data.degreeDiploma.trim()}</span>
                </td>
              </tr>
            )}
            <tr>
              <td className="w-36 sm:w-44 py-1.5 pr-3 font-semibold text-slate-600 align-top">
                {data.twelfthYear.trim() || "[Jahr 12. Klasse]"}
              </td>
              <td className="py-1.5 text-slate-900">
                <span className="font-semibold">
                  Höhere Sekundarschule (12. Klasse / Abitur-Äquivalent)
                </span>
                {data.twelfthGrade.trim()
                  ? ` — Abschlussnote / Ergebnis: ${data.twelfthGrade.trim()}`
                  : ""}
              </td>
            </tr>
            <tr>
              <td className="w-36 sm:w-44 py-1.5 pr-3 font-semibold text-slate-600 align-top">
                {data.tenthYear.trim() || "[Jahr 10. Klasse]"}
              </td>
              <td className="py-1.5 text-slate-900">
                <span className="font-semibold">
                  Sekundarschulabschluss (10. Klasse / Mittlerer Schulabschluss)
                </span>
                {data.tenthGrade.trim()
                  ? ` — Abschlussnote / Ergebnis: ${data.tenthGrade.trim()}`
                  : ""}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Praktische Erfahrung */}
      {data.experienceSummary.trim() && (
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
            Praktische Erfahrung &amp; Praktika
          </p>
          <p className="text-[12.5px] text-slate-800 whitespace-pre-line">
            {data.experienceSummary.trim()}
          </p>
        </div>
      )}

      {/* Sprachkenntnisse */}
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
          Sprachkenntnisse
        </p>
        <table className="w-full border-collapse text-[12.5px]">
          <tbody>
            <tr>
              <td className="w-36 sm:w-44 py-1 pr-3 font-semibold text-slate-600 align-top">
                Deutsch
              </td>
              <td className="py-1 text-slate-900 font-medium">
                {GERMAN_LEVEL_DESCRIPTIONS[germanLevel]}
              </td>
            </tr>
            <tr>
              <td className="w-36 sm:w-44 py-1 pr-3 font-semibold text-slate-600 align-top">
                Englisch
              </td>
              <td className="py-1 text-slate-900">Gute Kenntnisse in Wort und Schrift</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Kenntnisse & Stärken */}
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
          Kenntnisse &amp; Stärken
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[12.5px] text-slate-800">
          {tpl.strengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {/* DIN Signature Footer */}
      <div className="pt-4 border-t border-slate-200 flex items-end justify-between text-xs text-slate-700">
        <span>
          {cityOnly}, den {dateLabel}
        </span>
        <span className="font-semibold text-slate-900">{displayName}</span>
      </div>
    </div>
  );
}

function AnschreibenDocument({
  data,
  germanLevel,
  targetField,
  todayGermanDate,
}: DocumentViewProps) {
  const tpl = FIELD_TEMPLATES[targetField];
  const displayName = data.fullName.trim() || "[Vor- und Nachname]";
  const displayCity = data.cityCountry.trim() || "[Stadt, Land]";
  const displayEmail = data.email.trim() || "[E-Mail-Adresse]";
  const displayPhone = data.phone.trim() || "[Telefonnummer]";
  const cityOnly = extractCity(data.cityCountry);
  const dateLabel = todayGermanDate || "—";

  const educationSentence = (() => {
    const parts: string[] = [];
    if (data.twelfthYear.trim() || data.twelfthGrade.trim()) {
      parts.push(
        `meinen höheren Sekundarschulabschluss (12. Klasse${
          data.twelfthYear.trim() ? `, ${data.twelfthYear.trim()}` : ""
        }${data.twelfthGrade.trim() ? `, Ergebnis: ${data.twelfthGrade.trim()}` : ""})`,
      );
    } else {
      parts.push("meinen höheren Sekundarschulabschluss (12. Klasse)");
    }
    if (data.degreeDiploma.trim()) {
      parts.push(`sowie meine Weiterbildung (${data.degreeDiploma.trim()})`);
    }
    return `Ich habe ${parts.join(" ")} erfolgreich abgeschlossen.`;
  })();

  const languageSentence =
    germanLevel === "B1" || germanLevel === "B2"
      ? `Meine Deutschkenntnisse befinden sich aktuell auf dem Niveau ${germanLevel} gemäß GER, sodass ich mich sicher im beruflichen Alltag sowie in der Berufsschule verständigen kann.`
      : `Aktuell bereite ich meine Deutschkenntnisse intensiv auf das Niveau B1/B2 vor (derzeitiger Stand: ${germanLevel}), um ab Ausbildungsbeginn zuverlässig im Team und in der Berufsschule zu kommunizieren.`;

  return (
    <div className="bg-white text-slate-900 font-sans text-[13px] leading-[1.65]">
      {/* DIN 5008 Absender */}
      <div className="border-b border-slate-200 pb-3 mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs text-slate-700">
        <div>
          <p className="text-base font-bold text-slate-900">{displayName}</p>
          <p>{displayCity}</p>
        </div>
        <div className="sm:text-right">
          <p>{displayEmail}</p>
          <p>{displayPhone}</p>
        </div>
      </div>

      {/* Empfänger */}
      <div className="mb-5 text-xs text-slate-700 space-y-0.5">
        <p className="font-semibold text-slate-900">Personalabteilung / Ausbildungsleitung</p>
        <p>[Name des Ausbildungsbetriebs / Klinikums]</p>
        <p>[Straße und Hausnummer]</p>
        <p>[PLZ Ort, Deutschland]</p>
      </div>

      {/* Ort & Datum */}
      <p className="text-right text-xs text-slate-700 mb-5">
        {cityOnly}, den {dateLabel}
      </p>

      {/* DIN 5008 Betreff (bold, without "Betreff:") */}
      <p className="font-bold text-slate-900 text-sm mb-5">{tpl.subject}</p>

      {/* Anrede */}
      <p className="mb-3.5 text-slate-900">Sehr geehrte Damen und Herren,</p>

      {/* Brieftext */}
      <div className="space-y-3.5 text-slate-800 text-justify">
        <p>{tpl.openingParagraph}</p>
        <p>
          {educationSentence} {languageSentence}
        </p>
        <p>{tpl.motivationParagraph}</p>
        {data.experienceSummary.trim() && (
          <p>
            Erste praktische Einblicke konnte ich bereits sammeln:{" "}
            {data.experienceSummary.trim()}
          </p>
        )}
        <p>
          Über die Gelegenheit, mich Ihnen in einem persönlichen Gespräch oder Videogespräch
          näher vorzustellen und Sie von meiner Motivation zu überzeugen, freue ich mich sehr.
        </p>
      </div>

      {/* Grußformel */}
      <div className="mt-7 space-y-6">
        <p className="text-slate-900">Mit freundlichen Grüßen</p>
        <p className="font-bold text-slate-900">{displayName}</p>
      </div>

      {/* Anlagen */}
      <div className="mt-6 pt-3 border-t border-slate-200 text-xs text-slate-600">
        <span className="font-bold text-slate-800">Anlagen:</span> Lebenslauf, Schulzeugnisse
        (10. &amp; 12. Klasse), Sprachnachweis ({germanLevel})
      </div>
    </div>
  );
}

export function BewerbungsmappeBuilder({
  germanLevel,
  targetField,
  defaultFullName = "",
  defaultEmail = "",
  defaultPhone = "",
  isLocked = false,
}: BewerbungsmappeBuilderProps) {
  const [form, setForm] = useState<BewerbungsmappeData>(EMPTY_FORM);
  const [hydrated, setHydrated] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"lebenslauf" | "anschreiben">(
    "lebenslauf",
  );
  const [todayGermanDate, setTodayGermanDate] = useState("");

  useEffect(() => {
    let initial: BewerbungsmappeData = { ...EMPTY_FORM };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BewerbungsmappeData>;
        initial = {
          fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
          dateOfBirth: typeof parsed.dateOfBirth === "string" ? parsed.dateOfBirth : "",
          cityCountry: typeof parsed.cityCountry === "string" ? parsed.cityCountry : "",
          email: typeof parsed.email === "string" ? parsed.email : "",
          phone: typeof parsed.phone === "string" ? parsed.phone : "",
          tenthYear: typeof parsed.tenthYear === "string" ? parsed.tenthYear : "",
          tenthGrade: typeof parsed.tenthGrade === "string" ? parsed.tenthGrade : "",
          twelfthYear: typeof parsed.twelfthYear === "string" ? parsed.twelfthYear : "",
          twelfthGrade: typeof parsed.twelfthGrade === "string" ? parsed.twelfthGrade : "",
          degreeDiploma:
            typeof parsed.degreeDiploma === "string" ? parsed.degreeDiploma : "",
          experienceSummary:
            typeof parsed.experienceSummary === "string" ? parsed.experienceSummary : "",
        };
      }
    } catch {
      // ignore localStorage read errors
    }

    setForm({
      ...initial,
      fullName: initial.fullName || defaultFullName,
      email: initial.email || defaultEmail,
      phone: initial.phone || defaultPhone,
    });
    setTodayGermanDate(
      new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date()),
    );
    setHydrated(true);
  }, [defaultFullName, defaultEmail, defaultPhone]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore localStorage quota errors
    }
  }, [form, hydrated]);

  const updateField = (key: keyof BewerbungsmappeData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    const resetData: BewerbungsmappeData = {
      ...EMPTY_FORM,
      fullName: defaultFullName,
      email: defaultEmail,
      phone: defaultPhone,
    };
    setForm(resetData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resetData));
    } catch {
      // ignore
    }
  };

  const handlePrintPdf = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const rolePreviewTitle = useMemo(
    () => FIELD_TEMPLATES[targetField].germanRole,
    [targetField],
  );

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-[#0A1628]/90 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-[#FFD166]";
  const labelClass =
    "block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300 mb-1.5";

  return (
    <div id="bewerbungsmappe-root">
      {!isLocked && <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />}

      {/* Interactive Dark-Gold Builder UI (Hidden in Print) */}
      <div className="no-print ausbildung-print-hide rounded-3xl border border-white/10 bg-[#0D1017]/90 p-5 sm:p-7 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] space-y-6">
        {/* Builder Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FFD166]/35 bg-[#FFD166]/10 text-[#FFD166]">
              <FileText className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFD166]">
                  DIN 5008 · ATS-Ready
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>Auto-saved</span>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                German Bewerbungsmappe Builder (Lebenslauf + Anschreiben)
              </h2>
              <p className="text-[11px] text-slate-400">
                Auto-synced from Reality Check:{" "}
                <span className="text-[#FFD166] font-semibold">{targetField}</span> · Deutsch{" "}
                <span className="text-[#FFD166] font-semibold">{germanLevel}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0A1628]/80 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:border-[#FFD166]/40 hover:text-white transition cursor-pointer"
              title="Reset Bewerbungsmappe form"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FFD166] px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0A1628] shadow-lg transition hover:bg-amber-300 cursor-pointer"
            >
              <Printer className="h-4 w-4 text-[#0A1628]" />
              <span>Download / Print Clean PDF</span>
            </button>
          </div>
        </div>

        {/* Auto-Synced Reality Check Banner */}
        <div className="rounded-2xl border border-[#FFD166]/30 bg-[#0A1628]/70 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-200">
            <Sparkles className="h-4 w-4 text-[#FFD166] shrink-0" />
            <span>
              Targeting <strong className="text-white">{rolePreviewTitle}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#FFD166]/40 bg-[#FFD166]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFD166]">
              Field: {targetField}
            </span>
            <span className="rounded-full border border-[#FFD166]/40 bg-[#FFD166]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFD166]">
              Deutsch: {germanLevel}
            </span>
          </div>
        </div>

        {/* Compact Mobile-First Form */}
        <div className="space-y-5">
          {/* Personal Data */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#FFD166]">
              <User className="h-3.5 w-3.5" />
              <span>Persönliche Daten</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label htmlFor="bw-fullname" className={labelClass}>
                  Full Name
                </label>
                <input
                  id="bw-fullname"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bw-dob" className={labelClass}>
                  Date of Birth
                </label>
                <input
                  id="bw-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bw-city" className={labelClass}>
                  Current City / Country
                </label>
                <input
                  id="bw-city"
                  type="text"
                  value={form.cityCountry}
                  onChange={(e) => updateField("cityCountry", e.target.value)}
                  placeholder="e.g. Dehradun, Indien"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bw-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="bw-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bw-phone" className={labelClass}>
                  Phone (with Country Code)
                </label>
                <input
                  id="bw-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#FFD166]">
              <Award className="h-3.5 w-3.5" />
              <span>Schulbildung &amp; Education</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="bw-10-year" className={labelClass}>
                  10th Passing Year
                </label>
                <input
                  id="bw-10-year"
                  type="text"
                  value={form.tenthYear}
                  onChange={(e) => updateField("tenthYear", e.target.value)}
                  placeholder="e.g. 2021"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bw-10-grade" className={labelClass}>
                  10th Grade / Percentage
                </label>
                <input
                  id="bw-10-grade"
                  type="text"
                  value={form.tenthGrade}
                  onChange={(e) => updateField("tenthGrade", e.target.value)}
                  placeholder="e.g. 88% (CBSE)"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bw-12-year" className={labelClass}>
                  12th Passing Year
                </label>
                <input
                  id="bw-12-year"
                  type="text"
                  value={form.twelfthYear}
                  onChange={(e) => updateField("twelfthYear", e.target.value)}
                  placeholder="e.g. 2023"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bw-12-grade" className={labelClass}>
                  12th Grade / Stream
                </label>
                <input
                  id="bw-12-grade"
                  type="text"
                  value={form.twelfthGrade}
                  onChange={(e) => updateField("twelfthGrade", e.target.value)}
                  placeholder="e.g. 84% (Science / Biology)"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bw-degree" className={labelClass}>
                  Degree / Diploma (Optional)
                </label>
                <input
                  id="bw-degree"
                  type="text"
                  value={form.degreeDiploma}
                  onChange={(e) => updateField("degreeDiploma", e.target.value)}
                  placeholder="e.g. B.Sc. Nursing / Diploma in Hospitality (optional)"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Experience */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label htmlFor="bw-exp" className={labelClass}>
              Experience / Internship Summary (Optional)
            </label>
            <textarea
              id="bw-exp"
              rows={3}
              value={form.experienceSummary}
              onChange={(e) => updateField("experienceSummary", e.target.value)}
              placeholder="e.g. 6-monatiges Pflegepraktikum im Max Hospital: Patientenbetreuung, Vitalzeichenkontrolle und Stationsorganisation."
              className={inputClass}
            />
          </div>
        </div>

        {/* Live DIN-Standard Preview Tabs */}
        <div className="pt-2 border-t border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="DIN document preview tabs"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#07090E]/80 p-1 w-full sm:w-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activePreviewTab === "lebenslauf"}
                onClick={() => setActivePreviewTab("lebenslauf")}
                className={`flex-1 sm:flex-none rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  activePreviewTab === "lebenslauf"
                    ? "bg-[#FFD166] text-[#0A1628] shadow-xs"
                    : "text-slate-300 hover:text-[#FFD166]"
                }`}
              >
                Lebenslauf
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activePreviewTab === "anschreiben"}
                onClick={() => setActivePreviewTab("anschreiben")}
                className={`flex-1 sm:flex-none rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  activePreviewTab === "anschreiben"
                    ? "bg-[#FFD166] text-[#0A1628] shadow-xs"
                    : "text-slate-300 hover:text-[#FFD166]"
                }`}
              >
                Anschreiben
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#FFD166]/50 bg-[#FFD166]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#FFD166] hover:bg-[#FFD166] hover:text-[#0A1628] transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Download / Print Clean PDF</span>
            </button>
          </div>

          {/* Crisp White-Paper DIN Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-10 shadow-2xl overflow-x-auto">
            {activePreviewTab === "lebenslauf" ? (
              <LebenslaufDocument
                data={form}
                germanLevel={germanLevel}
                targetField={targetField}
                todayGermanDate={todayGermanDate}
              />
            ) : (
              <AnschreibenDocument
                data={form}
                germanLevel={germanLevel}
                targetField={targetField}
                todayGermanDate={todayGermanDate}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dedicated Clean Print Container (Visible ONLY in @media print when unlocked) */}
      {!isLocked && (
        <div id="bewerbungsmappe-print-sheet" className="hidden">
          <div>
            <LebenslaufDocument
              data={form}
              germanLevel={germanLevel}
              targetField={targetField}
              todayGermanDate={todayGermanDate}
            />
          </div>
          <div className="din-page-break">
            <AnschreibenDocument
              data={form}
              germanLevel={germanLevel}
              targetField={targetField}
              todayGermanDate={todayGermanDate}
            />
          </div>
        </div>
      )}
    </div>
  );
}
