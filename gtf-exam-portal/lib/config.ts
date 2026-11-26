/**
 * Brand + public runtime configuration (safe to import from client components).
 * Server-only secrets live in lib/server/env.ts.
 */
export const BRAND = {
  name: "Gateway To Future",
  shortName: "GTF",
  appName: "Gateway To Future",
  tagline: "Creating Career Without Borders",
  advisoryTeamName: "Gateway To Future",
  advisoryTeamTitle: "Berlin & India Advisory Team",
  mentorshipDeskTitle: "Gateway To Future Mentorship Desk",
  founderName: "Gateway To Future",
  founderTitle: "Berlin & India Advisory Team",
  founderImage: "/gtf-logo.jpg",
  supportEmail: "ashusharma@gatewaytofuture.com",
  website: "https://www.gatewaytofuture.com",
  appUrl: "https://app.gatewaytofuture.com",
  headquarters: "Schönefelder Straße 2, GStU, 12355 Berlin",
  colors: {
    primary: "#0F4C81",
    dark: "#0A3358",
    navy: "#0A1628",
    secondary: "#2A9D8F",
    accent: "#E76F51",
    gold: "#FFD166",
  },
} as const;

export const DIVISIONS = ["sprachakademie", "studienkolleg", "fachsprache_medizin"] as const;
export type DivisionKey = (typeof DIVISIONS)[number];

export const DIVISION_META: Record<
  DivisionKey,
  {
    id: DivisionKey;
    name: string;
    shortTitle: string;
    tagline: string;
    description: string;
    badge: string;
    accentColor: string;
    pricingNote: string;
  }
> = {
  sprachakademie: {
    id: "sprachakademie",
    name: "Division 1: German Language Academy (A1.1 – B2.2 + Musterlösungen)",
    shortTitle: "German Language Academy",
    tagline: "A1.1 – B2.2 Master-Curriculum, Timed Goethe/telc Exams & Musterlösungen",
    description:
      "Comprehensive German language education from A1.1 to B2.2 with official timed Goethe/telc exam simulations, listening audio, and structured digital workbooks.",
    badge: "Division 1: Language Academy",
    accentColor: "#0F4C81",
    pricingNote: "Jobcenter-Safe Enquiry Mode",
  },
  studienkolleg: {
    id: "studienkolleg",
    name: "Division 2: Studienkolleg Hub (Aufnahmeprüfung + 1-Year Syllabus + FSP for T-Kurs, M-Kurs, W-Kurs, G-Kurs)",
    shortTitle: "Studienkolleg Hub",
    tagline: "Aufnahmeprüfung C-Tests, 1-Year Syllabus & FSP Archives for T, M, W & G Kurs",
    description:
      "Targeted entrance exam preparation for public Studienkollegs: university C-Tests, 1-year syllabus dossiers, formula calculation engines, and authentic Feststellungsprüfung (FSP) archives.",
    badge: "Division 2: Studienkolleg Hub",
    accentColor: "#B45309",
    pricingNote: "Jobcenter-Safe Enquiry Mode",
  },
  fachsprache_medizin: {
    id: "fachsprache_medizin",
    name: "Division 3: Fachsprache Pflege & Dual Ausbildung",
    shortTitle: "Fachsprache Pflege & Ausbildung",
    tagline: "Clinical German, ISBAR Shift Protocols & Direct Dual Vocational Tracks",
    description:
      "Hospital-grade clinical German: Fachsprachenprüfung Pflege, patient anamnesis, ISBAR clinical handover protocols, and direct dual vocational training contracts with German employers.",
    badge: "Division 3: Pflege & Ausbildung",
    accentColor: "#065F46",
    pricingNote: "Jobcenter-Safe Enquiry Mode",
  },
};

export function isDivision(value: string): value is DivisionKey {
  return (DIVISIONS as readonly string[]).includes(value.toLowerCase());
}

export const CEFR_LEVELS = ["a1", "a2", "b1", "b2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const LEVELS = [
  "a1",
  "a2",
  "b1",
  "b2",
  "m_kurs",
  "t_kurs",
  "w_kurs",
  "g_kurs",
  "ausbildung_pflege",
  "ausbildung_it",
  "ausbildung_hotelfach",
  "ausbildung",
] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_META: Record<Level, { label: string; cefr: string; description: string; exams: string }> = {
  a1: { label: "A1", cefr: "Anfänger", description: "Start Deutsch 1 — basic everyday German", exams: "Goethe A1 · telc A1" },
  a2: { label: "A2", cefr: "Grundlagen", description: "Simple routine communication", exams: "Goethe A2 · telc A2" },
  b1: { label: "B1", cefr: "Mittelstufe", description: "Independent use — Ausbildung & visa level", exams: "Goethe B1 · telc B1 · DTZ" },
  b2: { label: "B2", cefr: "Gute Mittelstufe", description: "Professional & nursing recognition level", exams: "Goethe B2 · telc B2 Pflege/Beruf" },
  m_kurs: { label: "M-Kurs", cefr: "Studienkolleg", description: "Medical Track — Biologie, Chemie, Physik & C-Test", exams: "TU Berlin · LMU · Leipzig" },
  t_kurs: { label: "T-Kurs", cefr: "Studienkolleg", description: "Technical Track — Mathematik, Physik & Mechanik", exams: "KIT · RWTH Aachen · TUM" },
  w_kurs: { label: "W-Kurs", cefr: "Studienkolleg", description: "Economics Track — VWL, BWL & Wirtschaftsmathe", exams: "Uni Mannheim · Frankfurt · Köln" },
  g_kurs: { label: "G-Kurs", cefr: "Studienkolleg", description: "Humanities Track — Geschichte, Verfassung & Literatur", exams: "FU Berlin · HU Berlin · Heidelberg" },
  ausbildung_pflege: { label: "Pflege", cefr: "Ausbildung", description: "Generalistische Pflegefachkraft — ISBAR & Vitalzeichen", exams: "Charité · Vivantes Berlin" },
  ausbildung_it: { label: "IT", cefr: "Ausbildung", description: "Fachinformatiker — Systemarchitektur & DSGVO", exams: "IHK Berlin" },
  ausbildung_hotelfach: { label: "Hotelfach", cefr: "Ausbildung", description: "Hotelfachmann/-frau — Front Office & Guest Relations", exams: "IHK Berlin" },
  ausbildung: { label: "Ausbildung", cefr: "Ausbildung", description: "Duale Berufsausbildung in Deutschland", exams: "IHK · Charité · Vivantes" },
};

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value.toLowerCase());
}

export const SECTION_ORDER = ["lesen", "hoeren", "schreiben", "sprechen"] as const;
export type SectionKey = (typeof SECTION_ORDER)[number];

export const SECTION_META: Record<SectionKey, { label: string; english: string }> = {
  lesen: { label: "Lesen", english: "Reading + Sprachbausteine" },
  hoeren: { label: "Hören", english: "Listening" },
  schreiben: { label: "Schreiben", english: "Writing" },
  sprechen: { label: "Sprechen", english: "Speaking" },
};

/** Default demo test that works without any keys. */
export const DEMO_TEST_ID = "gtf-b1-modelltest-1";

/**
 * Finalized INR Student Pricing Tiers (INR ONLY — STRICT CURRENCY RULE).
 * European Stripe (€ EUR) checkout is strictly hidden/disabled.
 */
export const INR_PRICING_TIERS = {
  single_module: {
    id: "single_module",
    title: "Single Module / Exam Practice Pack",
    shortTitle: "Single Module",
    amount: 499,
    formatted: "₹499",
    description: "Full access to 1 chosen exam module, practice pack, or workbook with complete Musterlösung.",
    badge: "Essential Practice",
  },
  level_bundle: {
    id: "level_bundle",
    title: "Complete Level Bundle (Full A1, A2, B1, or B2)",
    shortTitle: "Level Bundle",
    amount: 1999,
    formatted: "₹1,999",
    description: "Complete CEFR level pack: all Lesen, Hören, Schreiben, Sprechen modules + digital workbooks.",
    badge: "Most Popular",
  },
  studienkolleg_track: {
    id: "studienkolleg_track",
    title: "Studienkolleg Early-Access Track (M, T, W or G Kurs)",
    shortTitle: "Studienkolleg Track",
    amount: 2999,
    formatted: "₹2,999",
    description: "German B1/B2 preparation pack plus Early Access to Studienkolleg dossiers and C-Test archives when launched.",
    badge: "Early Access Included",
  },
  all_access_pass: {
    id: "all_access_pass",
    title: "Full Academy All-Access Pass (A1–B2 + Early Access)",
    shortTitle: "All-Access Pass",
    amount: 4999,
    formatted: "₹4,999",
    description: "Complete active CEFR A1–B2 German Language Academy (workbooks, Hören/Lesen labs, Goethe/telc Modelltests & AI grading) plus Studienkolleg & Pflege included when launched (Early Access).",
    badge: "Complete A1–B2 Pass",
  },
  consultation_session: {
    id: "consultation_session",
    title: "1:1 Berlin & India Advisory Consultation",
    shortTitle: "1:1 Consultation",
    amount: 1000,
    formatted: "₹1,000",
    description: "Dedicated 1:1 strategy consultation with the Gateway To Future Berlin & India Advisory Team (language roadmap, anabin/APS, Studienkolleg, university or Ausbildung pathway). Direct Berlin Desk phone & WhatsApp contact is revealed immediately after booking & payment confirmation.",
    badge: "Paid Appointment",
  },
} as const;

export type PricingTierKey = keyof typeof INR_PRICING_TIERS;

/**
 * Official GTF Corporate Banking & Instant UPI Details (Synced with Main Website).
 */
export const GTF_BANK_DETAILS = {
  beneficiary: "THE GATEWAY TO FUTURE",
  bankName: "State Bank of India (SBI)",
  accountNumber: "45246385485",
  ifsc: "SBIN0002405",
  merchantId: "SB580381",
  upiId: "SBIBHIM.INSTANT73369512364751798@sbipay",
  paypalUrl: "https://www.gatewaytofuture.com",
  qrImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAqwAAAKsCAIAAACmoHhnAAASwElEQVR4nO3dwY3rSpJA0VeNWtRqXGj/zRoXelU7tQcDAi8nfiTvOQZIJJWSLnIR+fX5fP4AAD3/+qcvAAD4Z4gAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFHfp17o53/+/afq9z//O/ZeT57z5PVsu+ZT7/XW17lxjW17hpOv88S2a962Nt7q99BzthMAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARB07O+CJbTPtt82mvnEO9o3PZ9vs923PcPLeJ22bsT/5m7ltnv/k9fjf+b/ZCQCAKBEAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRs8O2DYzeds87bfOP7/x+Zx6rxvPRDhl2xo75cZrfuLG341Tfl76v/OEnQAAiBIBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgat3ZAWXbZkpvO1th2/Mpz2M/9VlM3vu28ym8zt+/Dn/PTgAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQ5eyAIafmYE/O3N429/7U9ZRnkt94BkH583rrHP5t11NmJwAAokQAAESJAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIWnd2gJnSd50LcKPJMxEmz1aY/LxuPMPilMmzMN56ZsQ2vy/9rXvCTgAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQNXp2QHl+9bZ59W+9r/LrPGH9eJ3/79e58eyJMjsBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQNSxswMm543f6K1zubfNmS+f43Dj51Veh2+9nknbvl83shMAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARH19Pp8/tzk1K3tynv+pGdeTc+/L871vfM7bbDt/4cbv8o2/Y9ue8yk/L70vOwEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIEgEAECUCACBKBABA1PepF3rrrPXJa558hm+9r22zu29c8zd669q48d5Prflt93XjuQBP2AkAgCgRAABRIgAAokQAAESJAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAor4+n88r596f4npmbDtf4JS3fhblZ7jtO3jjd+et5yb8LFsbT9gJAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKK+yzPJn9g2c/utts3TvvGat81Rf6vJM1BOfabbfqMm1+pbn+EpdgIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAqNGzA7bNeZ68nlPz2LfNr972fLatsbLJ5zP5/XryXjeev/DWc1ImP4vfZevwCTsBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQNTo2QGT8/wnX+eUybnc2+592zVvO1fixrWx7byMyfUz+Qy3fZcnn+G2/4KfC89WsBMAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARH19Pp8/m0zOXt42l/vG+dXbZuw/sW3m/7bzKcrPuXzNT2y7nie2fb+23ZedAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIEgEAECUCACDqe/LNts2U3jYD/MZZ9NtMzmM/tZ5v/Ey3XfOp99p2bsITN/5ubFvPZXYCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIEgEAECUCACBKBABAlAgAgKivz+dz3cz2U6+zzY0zwN/6uW+bIb9tzd/4Wdzord/3bX6W/V9MPkM7AQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAEDU6NkBb51Jvm3u9I2z6CfdOGv9ra/zxI3f9xt/x065cW3cuH5OsRMAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARB07O+CJG2dlb7vmbbOybzxf4K2fxSk33te2efVv/e6Uv6e/Lz2bw04AAESJAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIEgEAEHXs7IDJWcenbJs3/sS2+ec3uvHet13ztu+Oz6t5JsKNz3DbfdkJAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKKOnR3w1vnMN86CvnGu++S88RudeoY3fu7le99m2+/YE289/+UUOwEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIEgEAECUCACBKBABA1LGzA26c53/j3Om33te2edpvva8nJufwP3Hj+QI33teNv+Hb/i8mnVqrdgIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAqO8/y2w7F2By3vi265m85m3zzyfd+Jny9ybX843fr23nJvwuO2/lFDsBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQNTX5/P5s8mpucpvnn/+1lnZ2+Zyb3uGT2y7nifeOov+rb+H257PjWtsGzsBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQNT35JvdOEN+0pN7v3Fu+VvnqJ+aRT9p2/VsY8b++9b8Kb/L/ptOXY+dAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIEgEAECUCACDq6/P5/LnNttnLN17ztvne2+7r1Iz0t86in5wzf+N9nXqvJ268nvLnvo2dAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIEgEAECUCACDqe/LNTs1nPjWb+q0zpSfnuj/x1vn5N57RsG02/o1z5k/Z9ju27Zrfup63sRMAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARH2/dYbzKdtmQd84j33bLPFtbjzHYdKN17xtzW+bn3/jev69cB0+YScAAKJEAABEiQAAiBIBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiDp2doA58zMm53K/9SyDSU/u69TntW09b1ur27z1+bx1PZ+y7dwEOwEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIEgEAECUCACBKBABA1Nfn87luzvPkzO3JuffbZkrfOLv7xnns29bGtnMcXE/z93nyd+z3pdf8hJ0AAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQJQIAIOrY2QGTbpz9/sS2+fCn3uut88+fKD/nt5678db3euLGez/ld9k1OzsAAPgrIgAAokQAAESJAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAER9n3qhG2cmn5pbvu29Ttk22/zGWfRvPRdg8r22zavfNof/lG337vs+w04AAESJAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIEgEAEPX91nnIp9w483/bTPLJ53zqs5ickb5t/vmN77XtO0jzd+yUyTVvJwAAokQAAESJAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIOnZ2wI2zxCfnjd84I31ydveN8+pPKa/DG+fDT67DbSbXxrbv6c/gGR+Ta8NOAABEiQAAiBIBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiBIBABB17OyAbXOeb5wTvm2G/OTz2XYuwLYZ4NvmjW87v2PbTPtT3rpWT73OtvMXfi78j7MTAABRIgAAokQAAESJAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAEQdOzvgxnnRN86mnrTt+UyeL3DjjH3z/P/+eiZtu563Kv9uPGEnAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIg6dnbA5HzvbecLnHLj/PO3unHe+OT5Aqeu58bPYtt3cPLclhvX4bZr/ll273YCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIEgEAECUCACBKBABAlAgAgKjRswNunJ8/OcN520xy9z5zzsUpb52NP3lfk+cmbDsDZdtv743nJmz7XX3CTgAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQNXp2wLZZ2ZOv8+S+ts2Unvy8Jm2bIf/Etpnt2z73ye/7tnMBnpi85m2v88TPsvd64tT12AkAgCgRAABRIgAAokQAAESJAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAokbPDjjlrfOib3yvJyZniU/aNkt88vlsmw+/7SyDG934DG/8rdvGTgAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQdeXZAZPzxrfNpn5icg7/thny25x6zpOf6eRz3rY2tp2/8MS2e9/2Pd02z/932TkpdgIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAqCvPDph0ag72tnnR2+Z7b5t/fuq9bnzON97XKW89o2Hb9+KUbb+rT2z7ftkJAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJee3bAtvnVk6/zxLZ52tucmu9dfs6nnuHkeQc3fl7bfuveek7Bz+DM/8n3shMAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARH19Pp/r5jxPztgvz5SefK9t62fbPPZJN87PP6W8NrZ9vyZ/xyZtez52AgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQJQIAICo0bMDTinPnb7Rts9i26z+J8rr8MZ5/m9dq+V1+Na1YScAAKJEAABEiQAAiBIBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiLry7IAbTZ53sO2ab5w3PnnewalnOLl+tq2NbZ/XKduu56339bNsHU6yEwAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEfZ96oRvnw58yObd88nom52BvmxN+arb5tlni22a2P7HtDILJZ3jjmQiT/wU3fhbb2AkAgCgRAABRIgAAokQAAESJAACIEgEAECUCACBKBABAlAgAgCgRAABRIgAAoo6dHfDW2cvbZpKfsu2cghuv+dTc8snPfdt3cNv1bJuxPzn3/sbfureun5/BtWEnAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgaPTvgibfOUZ+8r0nb5ueXZ4lbYzOv88S2z2Lb9bz1mm+8LzsBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQNS6swOYMTnPf3JW9uR8+Btn/m87W+Gta3Xbc952PTde88/gb8skOwEAECUCACBKBABAlAgAgCgRAABRIgAAokQAAESJAACIEgEAECUCACBKBABAlLMDLpt/Pvk6b/XW5/zWMxom3XhOQfl3bJufC88BsRMAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARK07O+DGeeOnbJunPXk9b32vbXPUb5zHfuN3563nU5yy7Xes/HzsBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQRo2cHvHVuefn53Djz/8a57ttm429z471vO8vglG1rddv5Hb8P3mvyvAM7AQAQJQIAIEoEAECUCACAKBEAAFEiAACiRAAARIkAAIgSAQAQJQIAIEoEAEDU1+fz+aevAQD4B9gJAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgAgSgQAQJQIAIAoEQAAUSIAAKJEAABEiQAAiBIBABAlAgDgT9N/AYggj34oGPHrAAAAAElFTkSuQmCC",
} as const;

export const PUBLIC_ENV = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  checkoutUrl: process.env.NEXT_PUBLIC_CHECKOUT_URL || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

export function checkoutLink(productSlug: string, productTitle: string, tierKey: PricingTierKey = "single_module"): string {
  return `/pricing?product=${encodeURIComponent(productSlug)}&title=${encodeURIComponent(productTitle)}&tier=${encodeURIComponent(tierKey)}#consultation-booking`;
}
