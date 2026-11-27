/**
 * Gateway To Future (GTF) — Authentic Studienkolleg Aufnahmeprüfung Drills
 *
 * 1. Half-Word C-Test Trainer (TU Berlin, LMU München, KIT Karlsruhe, FU Berlin):
 *    Follows the official German state Studienkolleg C-Test format where the first sentence
 *    remains intact and starting in sentence 2 every 2nd word has its second half deleted.
 * 2. Ohne-Taschenrechner Math Sprint:
 *    Timed mental-math & Aufnahmeprüfung algebra/calculus/trig problems solved strictly
 *    without a calculator, paired with an interactive Schmierzettel scratchpad.
 */

export interface CTestGapSegment {
  kind: "gap";
  id: string;
  prefix: string;
  missing: string;
  fullWord: string;
  trailing: string;
}

export interface CTestTextSegment {
  kind: "text";
  text: string;
}

export type CTestSegment = CTestTextSegment | CTestGapSegment;

export interface CTestPassage {
  id: string;
  university: string;
  trackLabel: string;
  title: string;
  recommendedMinutes: number;
  /**
   * Encoded using `prefix[missing]` markers for exact authentic half-word splits,
   * e.g. `Infra[struktur]` renders `Infra` + an input expecting `struktur`.
   */
  encodedText: string;
  hintHinglish: string;
}

export interface StkMathSprintQuestion {
  id: string;
  track: "t_kurs" | "m_kurs" | "w_kurs";
  topic: string;
  promptLatex: string;
  placeholder: string;
  /** Accepted canonical answers (whitespace/comma-decimal normalized). */
  acceptedAnswers: string[];
  displayAnswer: string;
  stepsLatex: string[];
  mentalShortcutHinglish: string;
}

export const STUDIENKOLLEG_CTESTS: CTestPassage[] = [
  {
    id: "ctest-tu-berlin",
    university: "TU Berlin",
    trackLabel: "T-Kurs · W-Kurs",
    title: "Städtische Infrastruktur & Energiewende",
    recommendedMinutes: 10,
    encodedText:
      "Die modernen Großstädte stehen weltweit vor großen infrastrukturellen Herausforderungen. " +
      "Infolge d[es] stetigen Bevölkerungswachstums müs[sen] die Verkehrs- u[nd] Versorgungsnetze grundl[egend] erneuert wer[den]. " +
      "Viele Kommu[nen] setzen heu[te] auf intelli[gente] Sensorsysteme, u[m] den Energiever[brauch] effizient z[u] steuern. " +
      "Dad[urch] können Engp[ässe] frühzeitig erk[annt] und beh[oben] werden. " +
      "Exper[ten] betonen jed[och], dass nachha[ltige] Investitionen i[n] den öffent[lichen] Nahverkehr unumgä[nglich] bleiben.",
    hintHinglish:
      "C-Test Pro-Tip: Pehle case/gender check karo ('Infolge DES', 'in DEN Nahverkehr'), phir verb endings ('müssen', 'werden', 'erkannt') — har gap mein missing letters approx. visible prefix ke barabar ya +1 hote hain!",
  },
  {
    id: "ctest-lmu-muenchen",
    university: "LMU München",
    trackLabel: "M-Kurs (Medizin)",
    title: "Antibiotikaresistenz & Zellbiologie",
    recommendedMinutes: 10,
    encodedText:
      "Die Entdeckung des Penicillins revolutionierte im zwanzigsten Jahrhundert die moderne Medizin. " +
      "Seitd[em] können bakter[ielle] Infektionen erfolg[reich] behandelt wer[den], die frü[her] oft töd[lich] verliefen. " +
      "Allerd[ings] beobachten For[scher] weltweit ei[ne] besorgniserregende Zun[ahme] resistenter Kei[me]. " +
      "Wenn Patie[nten] Medikamente z[u] früh abse[tzen], überleben einzel[ne] Bakterien u[nd] geben ih[re] Resistenz wei[ter]. " +
      "Desh[alb] fordern Ärz[te] einen verantwortung[svollen] Umgang m[it] Antibiotika.",
    hintHinglish:
      "Medizin C-Test mein adjectival endings ('bakterielle', 'einzelne') aur separable/compound words ('absetzen', 'weiter', 'verantwortungsvollen') par dhyan do!",
  },
  {
    id: "ctest-kit-karlsruhe",
    university: "KIT Karlsruhe",
    trackLabel: "T-Kurs (Technik)",
    title: "Leichtbaurobotik in der Fertigung",
    recommendedMinutes: 10,
    encodedText:
      "Die industrielle Produktion hat durch autonome Robotersysteme eine tiefgreifende Wandlung erfahren. " +
      "Mod[erne] Leichtbauroboter arbe[iten] heute dir[ekt] neben mensch[lichen] Fachkräften i[n] der Mont[age]. " +
      "Ausgest[attet] mit takti[len] Sensoren pas[sen] sie ih[re] Bewegungen i[n] Echtzeit a[n]. " +
      "Dies stei[gert] nicht n[ur] die Präzi[sion], sondern verri[ngert] auch d[ie] körperliche Bela[stung] der Arbe[iter]. " +
      "Universi[täten] bilden Ingeni[eure] daher zuneh[mend] interdisziplinär aus.",
    hintHinglish:
      "KIT T-Kurs mein 'nicht nur ... sondern auch', separable verb prefixes ('passen ... an'), aur nominal suffixes ('-sion', '-ung') sabse high-yield traps hote hain!",
  },
  {
    id: "ctest-fu-berlin",
    university: "FU Berlin",
    trackLabel: "G-Kurs (Humanities)",
    title: "Grundgesetz & Demokratische Kultur",
    recommendedMinutes: 10,
    encodedText:
      "Am 23. Mai 1949 wurde das Grundgesetz der Bundesrepublik Deutschland feierlich verkündet. " +
      "Nach d[en] historischen Erfah[rungen] der Dikta[tur] schufen d[ie] Verfassungsväter ei[ne] wehrhafte Demok[ratie]. " +
      "Im erst[en] Artikel wi[rd] die Wür[de] des Mens[chen] als unant[astbar] garantiert. " +
      "Alle staat[liche] Gewalt ge[ht] vom Vol[ke] aus u[nd] wird du[rch] freie Wah[len] legitimiert. " +
      "Die Gewaltent[eilung] schützt Bür[ger] wirksam v[or] politischer Willkür.",
    hintHinglish:
      "G-Kurs C-Test mein Passiv ('wird ... garantiert', 'wird durch ... legitimiert') aur Genitiv/Dativ ('des Menschen', 'vom Volke', 'vor politischer Willkür') pakadna key hai!",
  },
];

/**
 * Parses an encoded C-Test string (`prefix[missing]`) into ordered text + interactive gap tokens.
 */
export function parseCTestSegments(encodedText: string): CTestSegment[] {
  const segments: CTestSegment[] = [];
  const regex = /([A-Za-zÄÖÜäöüß-]+)\[([A-Za-zÄÖÜäöüß]+)\]([.,;:!?]*)/g;
  let lastIdx = 0;
  let gapNum = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(encodedText)) !== null) {
    if (match.index > lastIdx) {
      segments.push({ kind: "text", text: encodedText.slice(lastIdx, match.index) });
    }
    gapNum += 1;
    const prefix = match[1];
    const missing = match[2];
    const trailing = match[3] || "";
    segments.push({
      kind: "gap",
      id: `g${gapNum}`,
      prefix,
      missing,
      fullWord: `${prefix}${missing}`,
      trailing,
    });
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < encodedText.length) {
    segments.push({ kind: "text", text: encodedText.slice(lastIdx) });
  }
  return segments;
}

export function gradeCTestGap(given: string, expectedMissing: string): boolean {
  const cleanGiven = (given || "").trim();
  const cleanExp = expectedMissing.trim();
  if (!cleanGiven) return false;
  // Exact German orthographic match (case-insensitive on suffix since prefix holds capitalization)
  return cleanGiven.toLowerCase() === cleanExp.toLowerCase();
}

export const STUDIENKOLLEG_MATH_SPRINT: StkMathSprintQuestion[] = [
  {
    id: "stk-m-01",
    track: "t_kurs",
    topic: "Logarithmen",
    promptLatex: "Berechnen Sie ohne Taschenrechner: $\\log_2(32) + \\log_{10}(0{,}01)$",
    placeholder: "z. B. 3",
    acceptedAnswers: ["3", "+3", "3.0", "3,0"],
    displayAnswer: "$3$",
    stepsLatex: [
      "$2^5 = 32 \\Rightarrow \\log_2(32) = 5$",
      "$10^{-2} = 0{,}01 \\Rightarrow \\log_{10}(0{,}01) = -2$",
      "$5 + (-2) = 3$",
    ],
    mentalShortcutHinglish: "Powers of 2 yaad rakho (2^5=32 → 5) aur decimal places count karo (0,01 = 10^-2 → -2). Seedha 5 - 2 = 3!",
  },
  {
    id: "stk-m-02",
    track: "t_kurs",
    topic: "Potenzen & Wurzeln",
    promptLatex: "Vereinfachen Sie ohne Taschenrechner: $27^{\\frac{2}{3}} - 16^{\\frac{3}{4}}$",
    placeholder: "z. B. 1",
    acceptedAnswers: ["1", "+1", "1.0", "1,0"],
    displayAnswer: "$1$",
    stepsLatex: [
      "$27^{2/3} = (\\sqrt[3]{27})^2 = 3^2 = 9$",
      "$16^{3/4} = (\\sqrt[4]{16})^3 = 2^3 = 8$",
      "$9 - 8 = 1$",
    ],
    mentalShortcutHinglish: "Fractional power mein PEHLE root lo (number chhota hoga!), PHIR power lagao: ∛27=3 → 3²=9; ⁴√16=2 → 2³=8; 9-8=1.",
  },
  {
    id: "stk-m-03",
    track: "t_kurs",
    topic: "Analysis · Ableitung",
    promptLatex: "Gegeben ist $f(x) = x^3 - 4x + 5$. Berechnen Sie $f'(2)$.",
    placeholder: "z. B. 8",
    acceptedAnswers: ["8", "+8"],
    displayAnswer: "$8$",
    stepsLatex: [
      "$f'(x) = 3x^2 - 4$",
      "$f'(2) = 3 \\cdot 2^2 - 4 = 3 \\cdot 4 - 4 = 12 - 4 = 8$",
    ],
    mentalShortcutHinglish: "Power rule lagao: x³ → 3x², -4x → -4, constant 5 → 0. Ab x=2 put karo: 3(4) - 4 = 8.",
  },
  {
    id: "stk-m-04",
    track: "t_kurs",
    topic: "Trigonometrie (Exakte Werte)",
    promptLatex: "Berechnen Sie exakt: $4 \\cdot \\sin\\left(\\frac{\\pi}{6}\\right) + 2 \\cdot \\cos\\left(\\frac{\\pi}{3}\\right)$",
    placeholder: "z. B. 3",
    acceptedAnswers: ["3", "+3"],
    displayAnswer: "$3$",
    stepsLatex: [
      "$\\sin(\\pi/6) = \\sin(30^\\circ) = \\frac{1}{2}$",
      "$\\cos(\\pi/3) = \\cos(60^\\circ) = \\frac{1}{2}$",
      "$4 \\cdot \\frac{1}{2} + 2 \\cdot \\frac{1}{2} = 2 + 1 = 3$",
    ],
    mentalShortcutHinglish: "Ohne Taschenrechner exam mein sin(30°)=cos(60°)=1/2 100% rata hona chahiye: 4(1/2) + 2(1/2) = 2 + 1 = 3!",
  },
  {
    id: "stk-m-05",
    track: "m_kurs",
    topic: "Quadratische Gleichung (Vieta)",
    promptLatex: "Bestimmen Sie die größere Lösung von $x^2 - 7x + 12 = 0$.",
    placeholder: "z. B. 4",
    acceptedAnswers: ["4", "+4"],
    displayAnswer: "$x_2 = 4$",
    stepsLatex: [
      "Satz von Vieta: $x_1 + x_2 = 7$ und $x_1 \\cdot x_2 = 12$",
      "$(x - 3)(x - 4) = 0 \\Rightarrow x_1 = 3,\\; x_2 = 4$",
      "Größere Lösung: $4$",
    ],
    mentalShortcutHinglish: "p-q formula se tez hai Vieta: aise 2 numbers socho jinka sum 7 aur product 12 ho → 3 aur 4! Bada root = 4.",
  },
  {
    id: "stk-m-06",
    track: "m_kurs",
    topic: "Grenzwerte (Limes)",
    promptLatex: "Berechnen Sie den Grenzwert: $\\lim_{x \\to 3} \\frac{x^2 - 9}{x - 3}$",
    placeholder: "z. B. 6",
    acceptedAnswers: ["6", "+6"],
    displayAnswer: "$6$",
    stepsLatex: [
      "3. Binomische Formel: $x^2 - 9 = (x - 3)(x + 3)$",
      "Kürzen von $(x - 3)$: $\\lim_{x \\to 3} (x + 3) = 3 + 3 = 6$",
    ],
    mentalShortcutHinglish: "0/0 dekhte hi a² - b² = (a-b)(a+b) factorize karo! (x-3) cancel hua, bacha (x+3) → 3+3 = 6.",
  },
  {
    id: "stk-m-07",
    track: "t_kurs",
    topic: "Integralrechnung",
    promptLatex: "Berechnen Sie das bestimmte Integral: $\\int_{0}^{2} 3x^2 \\, dx$",
    placeholder: "z. B. 8",
    acceptedAnswers: ["8", "+8"],
    displayAnswer: "$8$",
    stepsLatex: [
      "Stammfunktion: $F(x) = x^3$",
      "$F(2) - F(0) = 2^3 - 0^3 = 8$",
    ],
    mentalShortcutHinglish: "3x² ka antiderivative seedha x³ hota hai! Upper limit minus lower limit: 2³ - 0³ = 8.",
  },
  {
    id: "stk-m-08",
    track: "t_kurs",
    topic: "Vektorrechnung (Skalarprodukt)",
    promptLatex: "Berechnen Sie das Skalarprodukt $\\vec{a} \\cdot \\vec{b}$ für $\\vec{a} = \\begin{pmatrix} 2 \\\\ -3 \\\\ 4 \\end{pmatrix}$ und $\\vec{b} = \\begin{pmatrix} 5 \\\\ 2 \\\\ 1 \\end{pmatrix}$.",
    placeholder: "z. B. 8",
    acceptedAnswers: ["8", "+8"],
    displayAnswer: "$8$",
    stepsLatex: [
      "$\\vec{a} \\cdot \\vec{b} = 2 \\cdot 5 + (-3) \\cdot 2 + 4 \\cdot 1$",
      "$= 10 - 6 + 4 = 8$",
    ],
    mentalShortcutHinglish: "Component-wise multiply & add: (2×5) + (-3×2) + (4×1) = 10 - 6 + 4 = 8.",
  },
  {
    id: "stk-m-09",
    track: "w_kurs",
    topic: "Wirtschaftsmathematik · Prozentrechnung",
    promptLatex: "Ein Produkt kostet nach $20\\%$ Rabatt noch $120\\,\\text{€}$. Wie hoch war der ursprüngliche Preis (in €)?",
    placeholder: "z. B. 150",
    acceptedAnswers: ["150", "150€", "150 €", "150,00", "150.00"],
    displayAnswer: "$150\\,\\text{€}$",
    stepsLatex: [
      "$80\\% \\text{ des Originalpreises} = 120\\,\\text{€}$",
      "$\\frac{4}{5} \\cdot P = 120 \\Rightarrow P = 120 \\cdot \\frac{5}{4} = 30 \\cdot 5 = 150\\,\\text{€}$",
    ],
    mentalShortcutHinglish: "Classic W-Kurs trap: 120 mein 20% add mat karna (144 galat hai!). 120 = 80% = 4/5 hai, so 100% = 120 × 5/4 = 150€!",
  },
  {
    id: "stk-m-10",
    track: "m_kurs",
    topic: "Lineares Gleichungssystem (LGS)",
    promptLatex: "Lösen Sie nach $x$ auf: $2x + y = 11$ und $x - y = 4$. Geben Sie $x$ an.",
    placeholder: "z. B. 5",
    acceptedAnswers: ["5", "x=5", "x = 5"],
    displayAnswer: "$x = 5$",
    stepsLatex: [
      "Additionsverfahren: $(2x + y) + (x - y) = 11 + 4$",
      "$3x = 15 \\Rightarrow x = 5$",
    ],
    mentalShortcutHinglish: "+y aur -y dekhte hi dono equations add kar do! 3x = 15 → x = 5 in 3 seconds.",
  },
  {
    id: "stk-m-11",
    track: "w_kurs",
    topic: "Zinsrechnung (Linear)",
    promptLatex: "Ein Kapital von $2000\\,\\text{€}$ wird für $3$ Jahre zu $5\\%$ einfachem Jahreszins angelegt. Wie hoch sind die gesamten Zinsen (in €)?",
    placeholder: "z. B. 300",
    acceptedAnswers: ["300", "300€", "300 €"],
    displayAnswer: "$300\\,\\text{€}$",
    stepsLatex: [
      "$Z = K \\cdot p \\cdot t = 2000 \\cdot 0{,}05 \\cdot 3$",
      "$2000 \\cdot 0{,}05 = 100\\,\\text{€/Jahr} \\Rightarrow 100 \\cdot 3 = 300\\,\\text{€}$",
    ],
    mentalShortcutHinglish: "10% of 2000 = 200, toh 5% = 100 per year. 3 saal mein 100 × 3 = 300€!",
  },
  {
    id: "stk-m-12",
    track: "m_kurs",
    topic: "Chemie / Biologie · pH-Wert",
    promptLatex: "Eine starke Säure hat die Konzentration $c(\\text{H}_3\\text{O}^+) = 10^{-3}\\,\\text{mol/L}$. Wie groß ist der pH-Wert?",
    placeholder: "z. B. 3",
    acceptedAnswers: ["3", "ph 3", "ph=3"],
    displayAnswer: "$\\text{pH} = 3$",
    stepsLatex: [
      "$\\text{pH} = -\\log_{10}(c(\\text{H}_3\\text{O}^+)) = -\\log_{10}(10^{-3}) = 3$",
    ],
    mentalShortcutHinglish: "M-Kurs Chemie shortcut: strong acid ke liye 10^(-n) ka pH seedha n hota hai → 10^(-3) ⇒ pH = 3!",
  },
];

export function normalizeStkMathAnswer(raw: string): string {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/€|eur/g, "");
}

export function isStkMathAnswerCorrect(given: string, q: StkMathSprintQuestion): boolean {
  const norm = normalizeStkMathAnswer(given);
  if (!norm) return false;
  return q.acceptedAnswers.some((acc) => normalizeStkMathAnswer(acc) === norm);
}
