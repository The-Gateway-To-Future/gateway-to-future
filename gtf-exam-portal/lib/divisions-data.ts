import type {
  ClinicalModule,
  FlashcardItem,
  FormulaItem,
  PastPaperItem,
} from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
 * DIVISION 2: STUDIENKOLLEG & AUFNAHMEPRÜFUNG HUB DATA
 * M-Kurs (Medizin/Biologie) & T-Kurs (Technik/Ingenieurwesen)
 * ───────────────────────────────────────────────────────────────────────────── */

export const STUDIENKOLLEG_FLASHCARDS: FlashcardItem[] = [
  // ── M-KURS (Medizin & Naturwissenschaften) ──────────────────────────────────
  {
    id: "fc-m-01",
    track: "m_kurs",
    subject: "Biologie",
    termDe: "das Aktionspotential",
    articleDe: "das",
    pronunciationDe: "[akˈtsi̯oːns-po-tɛn-tsi̯aːl]",
    definitionDe:
      "Eine kurzzeitige, explosive Änderung des Membranpotentials über der Axonmembran einer Nervenzelle, ausgelöst durch den schnellen Einstrom von Natriumionen (Depolarisation) gefolgt vom Ausstrom von Kaliumionen (Repolarisation).",
    contextHinglish:
      "Nerve signal firing process! Jab neuron stimulate hota hai, tab $\\text{Na}^+$ channels open hote hain and membrane potential flips from $-70\\,\\text{mV}$ to $+30\\,\\text{mV}$.",
    formulaOrExample: "$\\text{Ruhepotential: } -70\\,\\text{mV} \\rightarrow \\text{Schwellenwert: } -55\\,\\text{mV} \\rightarrow \\text{Spitze: } +30\\,\\text{mV}$",
    category: "Neurobiologie & Zytologie",
  },
  {
    id: "fc-m-02",
    track: "m_kurs",
    subject: "Chemie",
    termDe: "die Henderson-Hasselbalch-Gleichung",
    articleDe: "die",
    pronunciationDe: "[ˈhɛndɐsn̩ ˈhasl̩balç ˈɡlaɪ̯çʊŋ]",
    definitionDe:
      "Puffergleichung zur quantitativen Berechnung des $\\text{pH}$-Wertes von Pufferlösungen aus der Säuredissoziationskonstante ($\\text{p}K_s$) und dem Konzentrationsverhältnis von konjugierter Base zu korrespondierender Säure.",
    contextHinglish:
      "Buffer pH formula! Crucial for blood gas analysis and Aufnahmeprüfung chemistry. Blood pH normal range is $7{,}35\\text{–}7{,}45$.",
    formulaOrExample: "$\\text{pH} = \\text{p}K_s + \\lg\\left(\\frac{[\\text{A}^-]}{[\\text{HA}]}\\right)$",
    category: "Säure-Base-Gleichgewichte",
  },
  {
    id: "fc-m-03",
    track: "m_kurs",
    subject: "Biologie",
    termDe: "die Zellatmung (Glykolyse & Citratzyklus)",
    articleDe: "die",
    pronunciationDe: "[ˈtsɛl-ˌaːtmʊŋ]",
    definitionDe:
      "Der stufenweise katabole Abbau von Glukose unter Sauerstoffverbrauch zu Kohlendioxid und Wasser, bei dem pro Mol Glukose ca. 30–32 Mol ATP in den Mitochondrien synthetisiert werden.",
    contextHinglish:
      "Mitochondria power plant! Glukose breakdown to generate cellular energy ATP through Glykolyse, Citratzyklus, and oxidative Phosphorylierung.",
    formulaOrExample: "$\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\,\\text{O}_2 \\rightarrow 6\\,\\text{CO}_2 + 6\\,\\text{H}_2\\text{O} + 30\\text{–}32\\,\\text{ATP}$",
    category: "Stoffwechselphysiologie",
  },
  {
    id: "fc-m-04",
    track: "m_kurs",
    subject: "Physik",
    termDe: "das Lambert-Beer-Gesetz",
    articleDe: "das",
    pronunciationDe: "[ˈlam-bɛɐ̯t beːɐ̯ ɡəˈzɛts]",
    definitionDe:
      "Beschreibt die Abschwächung der Intensität von monochromatischem Licht beim Durchgang durch eine absorbierende Lösung in Abhängigkeit vom molaren Extinktionskoeffizienten, der Konzentration und der Schichtdicke.",
    contextHinglish:
      "Spectrophotometry core principle! Extinction directly proportional to concentration. Used in photometers for hemoglobin/protein tests.",
    formulaOrExample: "$E = \\varepsilon \\cdot c \\cdot d \\quad \\text{oder} \\quad E = -\\lg\\left(\\frac{I}{I_0}\\right)$",
    category: "Optik & Spektroskopie",
  },
  {
    id: "fc-m-05",
    track: "m_kurs",
    subject: "Chemie",
    termDe: "das Le-Chatelier-Prinzip",
    articleDe: "das",
    pronunciationDe: "[lə ʃa-təl-jeː pʁɪnˈtsiːp]",
    definitionDe:
      "Prinzip des kleinsten Zwanges: Wird auf ein im chemischen Gleichgewicht befindliches System ein äußerer Zwang durch Änderung von Druck, Temperatur oder Konzentration ausgeübt, weicht das System so aus, dass die Wirkung des Zwanges verringert wird.",
    contextHinglish:
      "Equilibrium shift rule! Exothermic reaction me temperature badhaoge toh equilibrium reactants ki taraf shift hoga.",
    formulaOrExample: "$\\Delta H < 0\\;(\\text{exotherm}):\\; T \\uparrow \\Rightarrow \\text{Verschiebung nach links}$",
    category: "Chemische Thermodynamik",
  },
  {
    id: "fc-m-06",
    track: "m_kurs",
    subject: "Mathematik",
    termDe: "die Exponentialfunktion & Halbwertszeit",
    articleDe: "die",
    pronunciationDe: "[ˌɛksponɛnˈtsi̯aːl-fʊŋkˌtsi̯oːn]",
    definitionDe:
      "Funktionen der Form $N(t) = N_0 \\cdot e^{-\\lambda t}$. Die Halbwertszeit $t_{1/2}$ ist die Zeitspanne, nach der die Konzentration eines Pharmakons oder die Aktivität eines Radionuklids auf die Hälfte des Anfangswerts abgesunken ist.",
    contextHinglish:
      "Pharmacokinetics and drug clearance formula! Radioactive decay and serum drug levels follow exponential curves.",
    formulaOrExample: "$t_{1/2} = \\frac{\\ln(2)}{\\lambda} \\approx \\frac{0{,}693}{\\lambda}$",
    category: "Analysis & Kinetik",
  },

  // ── T-KURS (Technik, Ingenieurwesen & Physik) ──────────────────────────────
  {
    id: "fc-t-01",
    track: "t_kurs",
    subject: "Mathematik",
    termDe: "das Vektorprodukt (Kreuzprodukt)",
    articleDe: "das",
    pronunciationDe: "[vɛkˈtoːɐ̯-pʁoˌdʊkt]",
    definitionDe:
      "Eine bilineare Verknüpfung zweier dreidimensionaler Vektoren $\\vec{a}$ und $\\vec{b}$, die einen Vektor $\\vec{c}$ liefert, der orthogonal auf beiden Ausgangsvektoren steht. Seine Länge entspricht dem Flächeninhalt des aufgespannten Parallelogramms.",
    contextHinglish:
      "Cross product! Engineering me torque (Drehmoment $\\vec{M} = \\vec{r} \\times \\vec{F}$) calculate karne ke liye fundamental concept hai.",
    formulaOrExample: "$|\\vec{a} \\times \\vec{b}| = |\\vec{a}|\\cdot|\\vec{b}|\\cdot\\sin(\\alpha)$",
    category: "Lineare Algebra & Geometrie",
  },
  {
    id: "fc-t-02",
    track: "t_kurs",
    subject: "Physik",
    termDe: "das Hookesche Gesetz & Spannungs-Dehnungs-Diagramm",
    articleDe: "das",
    pronunciationDe: "[ˈhʊk-ʃəs ɡəˈzɛts]",
    definitionDe:
      "Im linear-elastischen Bereich ist die mechanische Spannung $\\sigma$ direkt proportional zur Dehnung $\\varepsilon$ über den Elastizitätsmodul $E$ des Werkstoffes.",
    contextHinglish:
      "Stress-strain relationship! Material strength testing for mechanical engineering. Hooke's law holds until the Proportionalitätsgrenze.",
    formulaOrExample: "$\\sigma = E \\cdot \\varepsilon \\quad \\left(\\varepsilon = \\frac{\\Delta L}{L_0},\\; \\sigma = \\frac{F}{A}\\right)$",
    category: "Technische Mechanik & Festigkeitslehre",
  },
  {
    id: "fc-t-03",
    track: "t_kurs",
    subject: "Mathematik",
    termDe: "die Taylor-Reihe & Linearisierung",
    articleDe: "die",
    pronunciationDe: "[ˈteːlɐ-ˈʁaɪ̯ə]",
    definitionDe:
      "Die Reihendarstellung einer unendlich oft differenzierbaren reellen Funktion $f(x)$ in der Umgebung eines Entwicklungspunktes $x_0$ als Potenzreihe.",
    contextHinglish:
      "Polynomial approximation of complex functions! Crucial for solving non-linear differential equations in aerodynamics & electrical circuits.",
    formulaOrExample: "$f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(x_0)}{n!}(x - x_0)^n$",
    category: "Höhere Analysis",
  },
  {
    id: "fc-t-04",
    track: "t_kurs",
    subject: "Physik",
    termDe: "die Kirchhoffschen Regeln (Knoten- & Maschenregel)",
    articleDe: "die",
    pronunciationDe: "[ˈkɪʁç-hɔf-ʃən ˈʁeːɡl̩n]",
    definitionDe:
      "1. Knotenpunktsatz: Die Summe aller zufließenden Ströme ist gleich der Summe aller abfließenden Ströme (Ladungserhaltung). 2. Maschensatz: In jedem geschlossenen Stromkreis ist die Summe aller Quellenspannungen gleich der Summe aller Teilspannungen.",
    contextHinglish:
      "Circuit analysis golden rules! Electrical engineering entrance tests always test current divider and mesh equations.",
    formulaOrExample: "$\\sum I_k = 0\\;(\\text{Knoten}) \\quad \\big| \\quad \\sum U_k = 0\\;(\\text{Masche})$",
    category: "Elektrodynamik",
  },
  {
    id: "fc-t-05",
    track: "t_kurs",
    subject: "Technische Mechanik",
    termDe: "die Gleichgewichtsbedingungen (Statik)",
    articleDe: "die",
    pronunciationDe: "[ˈɡlaɪ̯ç-ɡəvɪçts-bəˌdɪŋʊŋən]",
    definitionDe:
      "Ein starrer Körper befindet sich in Ruhe (im statischen Gleichgewicht), wenn sowohl die Summe aller äußeren Kräfte in allen Raumrichtungen als auch die Summe aller Drehmomente bezüglich eines beliebigen Punktes gleich null sind.",
    contextHinglish:
      "Equilibrium of forces! Civil & mechanical foundation: $\\sum F_x = 0$, $\\sum F_y = 0$, and $\\sum M_A = 0$ to calculate bridge bearing forces (Auflagerkräfte).",
    formulaOrExample: "$\\sum F_x = 0, \\quad \\sum F_y = 0, \\quad \\sum M_A = 0$",
    category: "Starrkörpermechanik",
  },
  {
    id: "fc-t-06",
    track: "t_kurs",
    subject: "Physik",
    termDe: "die Harmonische Schwingung (Feder-Masse-System)",
    articleDe: "die",
    pronunciationDe: "[haʁˈmoːnɪʃə ˈʃvɪŋʊŋ]",
    definitionDe:
      "Eine periodische Bewegung, bei der die rücktreibende Kraft proportional zur Auslenkung ist. Die Eigenkreisfrequenz $\\omega_0$ hängt von der Federkonstanten $D$ und der Masse $m$ ab.",
    contextHinglish:
      "Harmonic oscillation! Simple harmonic motion with differential equation $\\ddot{x}(t) + \\omega_0^2 x(t) = 0$.",
    formulaOrExample: "$T = 2\\pi\\sqrt{\\frac{m}{D}}, \\quad \\omega_0 = \\sqrt{\\frac{D}{m}}$",
    category: "Schwingungslehre & Akustik",
  },
  // ── W-KURS (Wirtschaftswissenschaften, VWL & BWL) ───────────────────────────
  {
    id: "fc-w-01",
    track: "w_kurs",
    subject: "Volkswirtschaftslehre (VWL)",
    termDe: "die Preiselastizität der Nachfrage",
    articleDe: "die",
    pronunciationDe: "[ˈpʁaɪ̯s-ʔe-las-ti-tsi-ˈtɛːt]",
    definitionDe:
      "Misst die relative Änderung der nachgefragten Menge eines Gutes im Verhältnis zur relativen Preisänderung. Ist $|\\varepsilon| > 1$, reagiert die Nachfrage elastisch auf Preisschwankungen.",
    contextHinglish:
      "Price elasticity ratio! Percentage change in demand divided by percentage change in price. Essential for microeconomics and Aufnahmetest.",
    formulaOrExample: "$\\varepsilon = \\frac{\\Delta Q / Q}{\\Delta P / P}$",
    category: "Mikroökonomie & Markt",
  },
  {
    id: "fc-w-02",
    track: "w_kurs",
    subject: "Betriebswirtschaftslehre (BWL)",
    termDe: "der Deckungsbeitrag (Break-Even-Point)",
    articleDe: "der",
    pronunciationDe: "[ˈdɛkʊŋs-ˌbaɪ̯tʁaːk]",
    definitionDe:
      "Der Betrag, der nach Abzug der variablen Stückkosten vom Stückpreis zur Deckung der fixen Kosten verbleibt. Bei Überschreiten der Gewinnschwelle entsteht Gewinn.",
    contextHinglish:
      "Contribution margin! $db = p - k_{\\text{var}}$. Break-even quantity: Fixed costs divided by unit contribution margin.",
    formulaOrExample: "$db = p - k_{\\text{var}}, \\quad x_{\\text{BEP}} = \\frac{K_{\\text{fix}}}{db}$",
    category: "Kosten- und Leistungsrechnung",
  },
  {
    id: "fc-w-03",
    track: "w_kurs",
    subject: "Volkswirtschaftslehre (VWL)",
    termDe: "das Bruttoinlandsprodukt (BIP)",
    articleDe: "das",
    pronunciationDe: "[ˈbʁʊtoː-ˌʔɪnlants-pʁo-dʊkt]",
    definitionDe:
      "Der Marktwert aller für den Endverbrauch bestimmten Waren und Dienstleistungen, die in einem Land in einem bestimmten Zeitraum (meist ein Jahr) hergestellt wurden.",
    contextHinglish:
      "Macroeconomic GDP metric! Entstehungs-, Verwendungs- und Verteilungsrechnung are central to German economic exams.",
    formulaOrExample: "$\\text{BIP} = C + I + G + (X - M)$",
    category: "Makroökonomie",
  },
  {
    id: "fc-w-04",
    track: "w_kurs",
    subject: "Betriebswirtschaftslehre (BWL)",
    termDe: "die Doppelte Buchführung (Bilanzierung)",
    articleDe: "die",
    pronunciationDe: "[ˈdɔpəl-tə ˈbuːx-fyːʁʊŋ]",
    definitionDe:
      "System der lückenlosen buchhalterischen Erfassung aller Geschäftsvorfälle, bei dem jede Buchung auf mindestens zwei Konten (Soll an Haben) abgebildet wird. Bilanzsumme Aktiva = Passiva.",
    contextHinglish:
      "Double-entry bookkeeping! Aktiva shows capital use (Mittelverwendung), Passiva shows capital source (Mittelherkunft).",
    formulaOrExample: "Aktiva (Vermögen) = Passiva (Eigenkapital + Fremdkapital)",
    category: "Finanzbuchhaltung",
  },
  // ── G-KURS (Geisteswissenschaften, Geschichte & Sozialkunde) ────────────────
  {
    id: "fc-g-01",
    track: "g_kurs",
    subject: "Geschichte",
    termDe: "das Notverordnungsrecht (Art. 48 WRV)",
    articleDe: "das",
    pronunciationDe: "[ˈnoːt-fɛɐ̯-ʔɔʁdnʊŋs-ˌʁɛçt]",
    definitionDe:
      "Artikel 48 der Weimarer Reichsverfassung von 1919 ermächtigte den Reichspräsidenten, bei Gefährdung der öffentlichen Sicherheit mit Notverordnungen ohne parlamentarische Zustimmung zu regieren.",
    contextHinglish:
      "Constitutional loophole of Weimar Republic! Misuse by Hindenburg and Brüning prepared the path for authoritarian rule in 1930-1933.",
    formulaOrExample: "Art. 48 WRV → Außerkraftsetzung von Grundrechten",
    category: "Weimarer Republik",
  },
  {
    id: "fc-g-02",
    track: "g_kurs",
    subject: "Sozialkunde",
    termDe: "die Ewigkeitsklausel (Art. 79 Abs. 3 GG)",
    articleDe: "die",
    pronunciationDe: "[ˈeːvɪç-kaɪ̯ts-ˌklaʊ̯zl̩]",
    definitionDe:
      "Bestimmung des Grundgesetzes, die jegliche Verfassungsänderung untersagt, welche die Gliederung des Bundes in Länder, die Mitwirkung der Länder bei der Gesetzgebung oder die in Art. 1 und 20 niedergelegten Grundsätze berührt.",
    contextHinglish:
      "Eternity clause! Protects human dignity (Art. 1) and democratic/social federal constitutional order (Art. 20) permanently against alteration.",
    formulaOrExample: "Art. 79 Abs. 3 GG: Unantastbarkeit von Art. 1 & Art. 20 GG",
    category: "Verfassungsrecht",
  },
  {
    id: "fc-g-03",
    track: "g_kurs",
    subject: "Geschichte",
    termDe: "die Potsdamer Konferenz (1945)",
    articleDe: "die",
    pronunciationDe: "[ˈpɔts-da-mɐ kɔn-fə-ˈʁɛnts]",
    definitionDe:
      "Gipfeltreffen der Hauptalliierten (USA, Großbritannien, UdSSR) im Schloss Cecilienhof im Sommer 1945 zur Festlegung der 4 D-Prinzipien: Denazifizierung, Demilitarisierung, Demokratisierung und Dezentralisierung Deutschlands.",
    contextHinglish:
      "Potsdam Agreement 4 Ds! Established 4 occupation zones and set the geopolitical stage for the Cold War and German division.",
    formulaOrExample: "Die 4 D: Denazifizierung, Demilitarisierung, Demokratisierung, Dezentralisierung",
    category: "Nachkriegsdeutschland",
  },
  {
    id: "fc-g-04",
    track: "g_kurs",
    subject: "Literaturwissenschaft",
    termDe: "die Aufklärung & das Menschenbild (Kant)",
    articleDe: "die",
    pronunciationDe: "[ˈaʊ̯f-klɛː-ʁʊŋ]",
    definitionDe:
      "Geistige Epoche des 18. Jahrhunderts, definiert von Immanuel Kant als 'Ausgang des Menschen aus seiner selbstverschuldeten Unmündigkeit'. Betont Vernunft, Toleranz, Humanismus und Kritik an Dogmen.",
    contextHinglish:
      "Age of Enlightenment! Core motto: 'Sapere aude! Habe Mut, dich deines eigenen Verstandes zu bedienen!'. Central for FSP German text analysis.",
    formulaOrExample: "Sapere aude! (Kant 1784)",
    category: "Deutsche Literaturgeschichte",
  },
];

export const STUDIENKOLLEG_FORMULAS: FormulaItem[] = [
  {
    id: "form-m-01",
    track: "m_kurs",
    subject: "Chemie & Medizin",
    title: "Henderson-Hasselbalch Pufferberechnung",
    latex: "\\text{pH} = \\text{p}K_s + \\lg\\left(\\frac{[\\text{A}^-]}{[\\text{HA}]}\\right)",
    explanationDe:
      "Berechnet den $\\text{pH}$-Wert eines Puffersystems (z. B. Kohlensäure/Bicarbonat-Puffer im menschlichen Blut).",
    variables: [
      { symbol: "$\\text{p}K_s$", unit: "dimensionslos", description: "Säurekonstante der schwachen Säure" },
      { symbol: "$[\\text{A}^-]$", unit: "$\\text{mol}/\\text{L}$", description: "Gleichgewichtskonzentration der konjugierten Base" },
      { symbol: "$[\\text{HA}]$", unit: "$\\text{mol}/\\text{L}$", description: "Gleichgewichtskonzentration der schwachen Säure" },
    ],
    exampleCalculation: {
      inputs: { pKs: 4.76, A_minus: 0.1, HA: 0.1 },
      result: "$\\text{pH} = 4{,}76$",
      steps: [
        "Verhältnis $\\frac{[\\text{A}^-]}{[\\text{HA}]} = \\frac{0{,}1}{0{,}1} = 1{,}0$",
        "$\\lg(1{,}0) = 0$",
        "$\\text{pH} = 4{,}76 + 0 = 4{,}76$ (äquimolarer Pufferpunkt)",
      ],
    },
  },
  {
    id: "form-m-02",
    track: "m_kurs",
    subject: "Biophysik",
    title: "Nernst-Gleichung (Gleichgewichtspotential)",
    latex: "E = \\frac{R \\cdot T}{z \\cdot F} \\cdot \\ln\\left(\\frac{[\\text{K}^+]_{\\text{außen}}}{[\\text{K}^+]_{\\text{innen}}}\\right)",
    explanationDe:
      "Berechnet das Gleichgewichtspotential für ein bestimmtes Ion über einer selektiv durchlässigen Biomembran bei $37\\,^\\circ\\text{C}$ Körpertemperatur.",
    variables: [
      { symbol: "$R$", unit: "$8{,}314\\,\\text{J}/(\\text{mol}\\cdot\\text{K})$", description: "Ideale Gaskonstante" },
      { symbol: "$T$", unit: "$310{,}15\\,\\text{K}$", description: "Absolute Temperatur ($37\\,^\\circ\\text{C}$)" },
      { symbol: "$z$", unit: "dimensionslos", description: "Wertigkeit des Ions ($+1$ für $\\text{K}^+$)" },
      { symbol: "$F$", unit: "$96485\\,\\text{C}/\\text{mol}$", description: "Faraday-Konstante" },
    ],
    exampleCalculation: {
      inputs: { K_aussen: 4.5, K_innen: 140 },
      result: "$E_{\\text{K}} = -91{,}8\\,\\text{mV}$",
      steps: [
        "Faktor $2{,}303 \\cdot \\frac{R \\cdot T}{F}$ bei $37\\,^\\circ\\text{C} \\approx 61{,}5\\,\\text{mV}$",
        "$\\lg\\left(\\frac{4{,}5}{140}\\right) = \\lg(0{,}03214) \\approx -1{,}493$",
        "$E_{\\text{K}} = 61{,}5\\,\\text{mV} \\cdot (-1{,}493) = -91{,}8\\,\\text{mV}$ (Ruhepotential-Nähe)",
      ],
    },
  },
  {
    id: "form-t-01",
    track: "t_kurs",
    subject: "Mathematik & Physik",
    title: "Kinetische & Potenzielle Energieerhaltung",
    latex: "E_{\\text{gesamt}} = \\frac{1}{2} m v^2 + m g h = \\text{konstant}",
    explanationDe:
      "Im abgeschlossenen konservativen System ist die Summe aus kinetischer ($E_{\\text{kin}} = \\frac{1}{2}mv^2$) und potenzieller Energie ($E_{\\text{pot}} = mgh$) zu jedem Zeitpunkt konstant.",
    variables: [
      { symbol: "$m$", unit: "$\\text{kg}$", description: "Masse des Körpers" },
      { symbol: "$v$", unit: "$\\text{m}/\\text{s}$", description: "Geschwindigkeit" },
      { symbol: "$g$", unit: "$9{,}81\\,\\text{m}/\\text{s}^2$", description: "Erdbeschleunigung" },
      { symbol: "$h$", unit: "$\\text{m}$", description: "Höhe über Bezugsniveau" },
    ],
    exampleCalculation: {
      inputs: { m: 2, h: 20, v0: 0 },
      result: "$v_{\\text{Aufprall}} \\approx 19{,}81\\,\\text{m}/\\text{s}$",
      steps: [
        "Potenzielle Energie: $E_{\\text{pot}} = 2\\,\\text{kg} \\cdot 9{,}81\\,\\text{m}/\\text{s}^2 \\cdot 20\\,\\text{m} = 392{,}4\\,\\text{J}$",
        "Am Boden gilt $E_{\\text{pot}} = 0$, daher $E_{\\text{kin}} = 392{,}4\\,\\text{J}$",
        "$v = \\sqrt{\\frac{2 \\cdot E_{\\text{kin}}}{m}} = \\sqrt{\\frac{2 \\cdot 392{,}4}{2}} = \\sqrt{392{,}4} \\approx 19{,}81\\,\\text{m}/\\text{s}$",
      ],
    },
  },
  {
    id: "form-t-02",
    track: "t_kurs",
    subject: "Technische Mechanik",
    title: "Drehmoment & Hebelgesetz",
    latex: "M = F \\cdot r \\cdot \\sin(\\alpha) \\quad \\big| \\quad \\sum M_A = 0",
    explanationDe:
      "Berechnet die Drehwirkung einer Kraft $F$ bezüglich eines Drehpunktes $A$ bei Hebelarm $r$ und Kraftangriffswinkel $\\alpha$.",
    variables: [
      { symbol: "$M$", unit: "$\\text{N}\\cdot\\text{m}$", description: "Drehmoment" },
      { symbol: "$F$", unit: "$\\text{N}$", description: "Kraft" },
      { symbol: "$r$", unit: "$\\text{m}$", description: "Länge des Hebelarms" },
      { symbol: "$\\alpha$", unit: "Grad", description: "Winkel zwischen Kraftvektor und Hebelarm" },
    ],
    exampleCalculation: {
      inputs: { F: 250, r: 1.6, alpha: 90 },
      result: "$M = 400\\,\\text{N}\\cdot\\text{m}$",
      steps: [
        "Winkel $\\alpha = 90^\\circ \\Rightarrow \\sin(90^\\circ) = 1{,}0$",
        "$M = 250\\,\\text{N} \\cdot 1{,}6\\,\\text{m} \\cdot 1{,}0 = 400\\,\\text{N}\\cdot\\text{m}$",
        "Gegendrehmoment muss exakt $400\\,\\text{N}\\cdot\\text{m}$ betragen für statisches Gleichgewicht.",
      ],
    },
  },
  {
    id: "form-w-01",
    track: "w_kurs",
    subject: "Volkswirtschaftslehre (VWL)",
    title: "Preiselastizität der Nachfrage",
    latex: "\\varepsilon_{\\text{dir}} = \\frac{\\Delta Q / Q}{\\Delta P / P} = \\frac{dQ}{dP} \\cdot \\frac{P}{Q}",
    explanationDe:
      "Gibt die relative Mengenänderung in Prozent an, wenn sich der Preis um ein Prozent ändert. Zeigt die Reaktionsintensität der Konsumenten.",
    variables: [
      { symbol: "$Q$", unit: "ME", description: "Ursprüngliche Nachfragemenge" },
      { symbol: "$\\Delta Q$", unit: "ME", description: "Mengenänderung" },
      { symbol: "$P$", unit: "EUR", description: "Ursprünglicher Preis" },
      { symbol: "$\\Delta P$", unit: "EUR", description: "Preisänderung" },
    ],
    exampleCalculation: {
      inputs: { P: 50, deltaP: 5, Q: 1000, deltaQ: -200 },
      result: "$\\varepsilon = -2{,}0$ (sehr preiselastische Nachfrage)",
      steps: [
        "Relative Preisänderung: $\\frac{\\Delta P}{P} = \\frac{5}{50} = +10\\%$",
        "Relative Mengenänderung: $\\frac{\\Delta Q}{Q} = \\frac{-200}{1000} = -20\\%$",
        "Elastizität: $\\varepsilon = \\frac{-20\\%}{+10\\%} = -2{,}0$ ($|\\varepsilon| > 1$)",
      ],
    },
  },
  {
    id: "form-w-02",
    track: "w_kurs",
    subject: "Betriebswirtschaftslehre (BWL)",
    title: "Break-Even-Point & Deckungsbeitragsrechnung",
    latex: "x_{\\text{BEP}} = \\frac{K_{\\text{fix}}}{p - k_{\\text{var}}} = \\frac{K_{\\text{fix}}}{db}",
    explanationDe:
      "Berechnet die kritische Absatzmenge (Gewinnschwelle), bei der die Gesamterlöse exakt den Gesamtkosten (Fixkosten + variable Kosten) entsprechen.",
    variables: [
      { symbol: "$K_{\\text{fix}}$", unit: "EUR", description: "Gesamte Fixkosten pro Periode" },
      { symbol: "$p$", unit: "EUR / Stück", description: "Verkaufspreis pro Einheit" },
      { symbol: "$k_{\\text{var}}$", unit: "EUR / Stück", description: "Variable Kosten pro Einheit" },
      { symbol: "$db$", unit: "EUR / Stück", description: "Stückdeckungsbeitrag ($p - k_{\\text{var}}$)" },
    ],
    exampleCalculation: {
      inputs: { K_fix: 50000, p: 120, k_var: 70 },
      result: "$x_{\\text{BEP}} = 1.000\\text{ Stück}$",
      steps: [
        "Stückdeckungsbeitrag: $db = 120\\,\\text{€} - 70\\,\\text{€} = 50\\,\\text{€}$",
        "Gewinnschwellenmenge: $x_{\\text{BEP}} = \\frac{50.000\\,\\text{€}}{50\\,\\text{€}} = 1.000\\text{ Stück}$",
        "Ab dem 1.001. Stück erwirtschaftet das Unternehmen operativen Gewinn.",
      ],
    },
  },
  {
    id: "form-g-01",
    track: "g_kurs",
    subject: "Geschichtswissenschaft",
    title: "Historisch-Kritische Quellenanalyse-Matrix",
    latex: "\\text{Quellenkritik} = \\{\\,\\text{Autor},\\; \\text{Adressat},\\; \\text{Kontext},\\; \\text{Intention},\\; \\text{Glaubwürdigkeit}\\,\\}",
    explanationDe:
      "Strukturierte 5-Stufen-Methode nach FSP-Standard zur quellenkritischen Analyse historischer Primärdokumente (Tradition vs. Überrest).",
    variables: [
      { symbol: "Formalia", unit: "Kriterien", description: "Autor, Datum, Ort, Textsorte" },
      { symbol: "Inhalt", unit: "Sinnabschnitte", description: "Thesen, Kernaussagen, Argumentationsgang" },
      { symbol: "Kontext", unit: "Epoche", description: "Historische Einbettung & zeitgenössische Bedingungen" },
      { symbol: "Urteil", unit: "Sachurteil", description: "Differenzierung zwischen Sachurteil und Werturteil" },
    ],
    exampleCalculation: {
      inputs: { Text: 1, Epoche: 1918, Autor: 1 },
      result: "FSP Standard: Vollständiges 3-Teile-Schema (Analyse, Kontextualisierung, Beurteilung)",
      steps: [
        "1. Äußere Quellenkritik: Primärquelle, Philipp Scheidemann, 9. Nov 1918 Berlin",
        "2. Innere Analyse: Ausrufung der Republik, Abgrenzung gegen Liebknechts Räterepublik",
        "3. Historische Wertung: Relevanz für den Übergang zur Weimarer Republik",
      ],
    },
  },
];

export const STUDIENKOLLEG_PAST_PAPERS: PastPaperItem[] = [
  {
    id: "paper-tub-m-2025",
    university: "TU Berlin Studienkolleg",
    city: "Berlin",
    year: "2025/2026",
    semester: "Wintersemester",
    track: "m_kurs",
    subject: "Mathematik & Naturwissenschaften (M-Kurs)",
    durationMinutes: 90,
    totalPoints: 100,
    downloadSlug: "past-paper-tub-m-2025",
    overview:
      "Originalgetreue Aufnahmeprüfung des Staatlichen Studienkollegs an der TU Berlin für den M-Kurs. Prüft Analysis, Vektorgeometrie, chemische Stöchiometrie und Zellbiologie.",
    keyTopics: [
      "Kurvendiskussion ganzrationaler Funktionen & Wendetangenten",
      "Stöchiometrische Massen- und Stoffmengenberechnungen (Molare Masse)",
      "Mendelsche Erbregeln & Erbgangsanalyse (Autosomal-dominant vs. rezessiv)",
      "Wurzelgleichungen & Logarithmengleichungen ohne Taschenrechner",
    ],
  },
  {
    id: "paper-lmu-m-2024",
    university: "LMU & TU München Studienkolleg",
    city: "München",
    year: "2024/2025",
    semester: "Sommersemester",
    track: "m_kurs",
    subject: "Biologie, Chemie & Mathematik Aufnahmetest",
    durationMinutes: 90,
    totalPoints: 100,
    downloadSlug: "past-paper-lmu-m-2024",
    overview:
      "Münchner Standard-Aufnahmetest für internationale Medizinstudenten. Starker Fokus auf chemische Reaktionsgleichungen und biologische Fachbegriffe.",
    keyTopics: [
      "Zellorganellen (Mitochondrien, Endoplasmatisches Retikulum, Ribosomen)",
      "pH-Wert Berechnungen starker und schwacher Säuren",
      "Gleichungssysteme mit 3 Unbekannten (Gauß-Algorithmus)",
      "Trigonometrische Funktionen und Bogenmaß",
    ],
  },
  {
    id: "paper-tub-t-2025",
    university: "TU Berlin Studienkolleg",
    city: "Berlin",
    year: "2025/2026",
    semester: "Wintersemester",
    track: "t_kurs",
    subject: "Mathematik & Physik Aufnahmeprüfung (T-Kurs)",
    durationMinutes: 90,
    totalPoints: 100,
    downloadSlug: "past-paper-tub-t-2025",
    overview:
      "Mathematik- und Physiktest für angehende Ingenieure, Maschinenbauer und Informatiker. Streng zeitlimitiert (90 Minuten, kein grafikfähiger Rechner).",
    keyTopics: [
      "Vektorrechnung: Skalarprodukt, Kreuzprodukt, Ebenengleichungen",
      "Integralrechnung: Flächen zwischen Graphen und Rotationskörper",
      "Kinematik: Schräger Wurf und Bewegung mit konstanter Beschleunigung",
      "Stromkreise: Ersatzwiderstand gemischter Schaltungen und Leistung",
    ],
  },
  {
    id: "paper-kit-t-2025",
    university: "Karlsruher Institut für Technologie (KIT)",
    city: "Karlsruhe",
    year: "2025",
    semester: "Sommersemester",
    track: "t_kurs",
    subject: "Höhere Mathematik & Technische Grundlagen",
    durationMinutes: 90,
    totalPoints: 100,
    downloadSlug: "past-paper-kit-t-2025",
    overview:
      "KIT Aufnahmeprüfung T-Kurs mit anspruchsvollen Geometrie- und Beweisaufgaben sowie Physik-Grundlagen.",
    keyTopics: [
      "Grenzwerte und Stetigkeit von Funktionen (Regel von L'Hospital)",
      "Statik: Auflagerkräfte an Fachwerken und Balken",
      "Optik: Brechungsgesetz von Snellius und Totalreflexion",
      "Deutsch C-Test: 4 authentische Lückentexte aus dem Ingenieurbereich",
    ],
  },
  {
    id: "paper-fra-w-2025",
    university: "Studienkolleg Frankfurt am Main (Goethe-Uni)",
    city: "Frankfurt am Main",
    year: "2025",
    semester: "Wintersemester",
    track: "w_kurs",
    subject: "Wirtschaftsmathematik & Volkswirtschaftslehre (W-Kurs)",
    durationMinutes: 90,
    totalPoints: 100,
    downloadSlug: "past-paper-fra-w-2025",
    overview:
      "Goethe-Universität Frankfurt Aufnahmeprüfung für Wirtschaftswissenschaften. Behandelt mathematische Modellierung von Angebot/Nachfrage und lineare Optimierung.",
    keyTopics: [
      "Marktgleichgewicht: Schnittpunkte von Angebots- und Nachfragekurven",
      "Gleichungssysteme & Matrizenrechnung für Input-Output-Modelle",
      "Prozent-, Zins- und Tilgungsrechnung",
      "Wirtschaftsdeutsch C-Test mit aktuellen Konjunktur- und Binnenmarkttexten",
    ],
  },
  {
    id: "paper-muc-w-2024",
    university: "Studienkolleg München (LMU/TUM)",
    city: "München",
    year: "2024/2025",
    semester: "Sommersemester",
    track: "w_kurs",
    subject: "VWL, BWL & Deutsch FSP-Examen (W-Kurs)",
    durationMinutes: 120,
    totalPoints: 100,
    downloadSlug: "past-paper-muc-w-2024",
    overview:
      "Offizielle FSP-Abschlussprüfung W-Kurs in Bayern. Qualifiziert für alle betriebswirtschaftlichen und volkswirtschaftlichen Studiengänge in Deutschland.",
    keyTopics: [
      "Geldpolitik der EZB & Inflationssteuerung im Euroraum",
      "Deckungsbeitragsrechnung und mehrstufige Divisionskalkulation",
      "BIP-Entstehungsrechnung und außenwirtschaftliches Gleichgewicht",
      "Fachaufsatz zur Sozialen Marktwirtschaft im globalen Wettbewerb",
    ],
  },
  {
    id: "paper-fu-g-2025",
    university: "Freie Universität Berlin (FU Berlin Studienkolleg)",
    city: "Berlin",
    year: "2025",
    semester: "Wintersemester",
    track: "g_kurs",
    subject: "Deutsche Geschichte & Textproduktion (G-Kurs)",
    durationMinutes: 90,
    totalPoints: 100,
    downloadSlug: "past-paper-fu-g-2025",
    overview:
      "FU Berlin Aufnahmeprüfung für geistes- und kulturwissenschaftliche Studiengänge. Prüft geschichtliches Vorwissen und wissenschaftliche Schreibkompetenz.",
    keyTopics: [
      "Epochenumbruch 1918/1919: Von der Monarchie zur Weimarer Demokratie",
      "Quellenanalyse historischer Flugblätter und Verfassungstexte",
      "Argumentative Erörterung zur Bedeutung der Meinungs- und Pressefreiheit",
      "C-Test Geisteswissenschaften mit hohem syntaktischem Anspruch",
    ],
  },
  {
    id: "paper-hdb-g-2024",
    university: "Universität Heidelberg (Studienkolleg)",
    city: "Heidelberg",
    year: "2024/2025",
    semester: "Sommersemester",
    track: "g_kurs",
    subject: "Geschichte, Literatur & FSP Abschlussprüfung (G-Kurs)",
    durationMinutes: 120,
    totalPoints: 100,
    downloadSlug: "past-paper-hdb-g-2024",
    overview:
      "Heidelberger FSP Abschlussprüfung G-Kurs. Standard-Zertifikat zur Immatrikulation in Rechtswissenschaften, Geschichte, Germanistik und Politikwissenschaft.",
    keyTopics: [
      "Die Teilung Deutschlands: Kalter Krieg, Berliner Mauer & Entspannungspolitik",
      "Strukturierte Dramen- und Gedichtanalyse (Weimarer Klassik vs. Nachkriegsliteratur)",
      "Verfassungsorgane der BRD: Gewaltenteilung und Föderalismus",
      "Dialektischer Essay zur Erinnerungskultur im 21. Jahrhundert",
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
 * DIVISION 3: FACHSPRACHE PFLEGE & MEDIZIN DATA
 * Clinical Modules, FSP Simulation, ISBAR Handover Protocols
 * ───────────────────────────────────────────────────────────────────────────── */

export const CLINICAL_MODULES: ClinicalModule[] = [
  {
    id: "fsp-case-01-khk",
    title: "FSP Simulation: Akuter Thoraxschmerz & V.a. Myokardinfarkt",
    category: "fsp_anamnese",
    patientName: "Walter Becker",
    patientAge: 62,
    chiefComplaint: "Retrosternaler Vernichtungsschmerz mit Ausstrahlung in den linken Arm und Unterkiefer seit 45 Minuten",
    diagnosis: "Akutes Koronarsyndrom (STEMI Vorderwandinfarkt)",
    situation: "Patient wurde mit Notarztwagen in die Notaufnahme des Vivantes Klinikum Berlin eingeliefert. Kaltschweißig, Dyspnoe.",
    vitalSigns: {
      bloodPressure: "165/95 mmHg",
      heartRate: "98 bpm (Sinustachykardie)",
      spo2: "92% unter Raumluft",
      temperature: "36.8 °C",
    },
    dialogueScript: [
      {
        speaker: "Dr. Sharma",
        role: "Arzt",
        german: "Guten Tag, Herr Becker. Ich bin der zuständige Assistenzarzt. Was führt Sie zu uns? Können Sie mir beschreiben, wo genau der Schmerz sitzt?",
        hinglishNote: "Empathetic opening + exact localization of chest pain.",
      },
      {
        speaker: "Herr Becker",
        role: "Patient",
        german: "Guten Tag, Herr Doktor... Es drückt mir die Brust ab! Mitten hinter dem Brustbein, als ob ein Elefant auf mir sitzt. Der Schmerz strahlt bis in den linken Arm und in den Unterkiefer aus.",
      },
      {
        speaker: "Dr. Sharma",
        role: "Arzt",
        german: "Atmen Sie ruhig, Herr Becker, wir helfen Ihnen sofort. Seit wann genau bestehen diese Beschwerden? Hatten Sie solche Schmerzen schon einmal?",
        hinglishNote: "Time onset + previous cardiac history.",
      },
      {
        speaker: "Herr Becker",
        role: "Patient",
        german: "Seit ungefähr einer Dreiviertelstunde. Ich habe im Garten Holz gehackt, plötzlich fing es an. Vorher hatte ich das noch nie so schlimm, nur manchmal beim Treppensteigen ein Engegefühl.",
      },
      {
        speaker: "Dr. Sharma",
        role: "Arzt",
        german: "Verstehe. Nehmen Sie regelmäßig Medikamente ein? Sind Vorerkrankungen wie Bluthochdruck, Diabetes oder Fettstoffwechselstörungen bei Ihnen bekannt?",
        hinglishNote: "Vegetative & cardiovascular risk factor inquiry.",
      },
      {
        speaker: "Herr Becker",
        role: "Patient",
        german: "Ja, ich nehme Ramipril 5 mg gegen den Bluthochdruck und rauche seit 35 Jahren etwa eine Schachtel am Tag.",
      },
    ],
    redemittel: [
      "Beschreiben Sie bitte die Schmerzqualität: Ist der Schmerz stechend, brennend, dumpf oder drückend?",
      "Strahlt der Schmerz in andere Körperregionen aus (z.B. linker Arm, Hals, Rücken, Oberbauch)?",
      "Auf einer Skala von 1 bis 10: Wie stark schätzen Sie den Schmerz aktuell ein?",
      "Sind Ihnen vegetative Begleitsymptome wie Übelkeit, Erbrechen, Kaltschweißigkeit oder Schwindel aufgefallen?",
      "Leiden Sie unter bekannten Allergien gegen Medikamente (z.B. Kontrastmittel, Acetylsalicylsäure)?",
    ],
    sampleHandover: {
      identification: "Herr Walter Becker, 62 Jahre alt, Notfallaufnahme Vivantes Klinikum Berlin, Bett 3.",
      situation:
        "Akute Einweisung mit retrosternalem Druckschmerz (VAS 8/10), Ausstrahlung linker Arm und Mandibula, Einsetzzeitpunkt vor 45 Minuten unter körperlicher Belastung.",
      background:
        "Bekannte arterielle Hypertonie unter Ramipril 5mg 1-0-0. Nikotinabusus mit 35 Pack Years. Keine bekannten Allergien.",
      assessment:
        "EKG zeigt signifikante ST-Streckenhebungen in V1–V4. Troponin T Schnelltest positiv. V.a. akuten STEMI der Vorderwand. RR 165/95 mmHg, HF 98/min, SpO2 92%.",
      recommendation:
        "Sofortige Verlegung ins Herzkatheterlabor zur primären PCI. Vorab Gabe von ASS 250mg i.v., Heparin 5000 IE i.v., Sauerstoff 2L/min über Nasenbrille und 5mg Morphin i.v. zur Analgesie.",
    },
  },
  {
    id: "fsp-case-02-stroke",
    title: "Klinische Übergabe (ISBAR): Apoplex / Akuter Schlaganfall",
    category: "isbar_handover",
    patientName: "Hannelore Meier",
    patientAge: 74,
    chiefComplaint: "Plötzlich aufgetretene Hemiparese rechts und Broca-Aphasie (Sprachproduktionsstörung)",
    diagnosis: "Akuter ischämischer Hirninfarkt Mediastromgebiet links (Time is Brain)",
    situation: "Symptombeginn (Wake-Up-Stroke ausgeschlossen) vor 50 Minuten um 14:15 Uhr. Stroke Unit Alarm ausgelöst.",
    vitalSigns: {
      bloodPressure: "185/100 mmHg",
      heartRate: "76 bpm (arrhythmisch, Vorhofflimmern)",
      spo2: "96%",
      temperature: "37.1 °C",
    },
    dialogueScript: [
      {
        speaker: "Pflegefachkraft",
        role: "Pflegekraft",
        german: "Übergabe nach ISBAR für die Stroke Unit: Hier ist Frau Hannelore Meier, 74 Jahre. Symptombeginn war exakt um 14:15 Uhr von der Tochter bemerkt.",
      },
      {
        speaker: "Dr. Sharma",
        role: "Arzt",
        german: "Danke für die präzise Zeitangabe. Wir sind voll im Lysezeitfenster (< 4,5 Stunden). Welche neurologischen Ausfälle liegen vor?",
      },
      {
        speaker: "Pflegefachkraft",
        role: "Pflegekraft",
        german: "Mundastschwäche rechts (Fazialisparese), schlaffe Lähmung des rechten Arms (Kraftgrad 1/5) und motorische Aphasie. Sie versteht Anweisungen, kann aber keine Sätze artikulieren.",
      },
      {
        speaker: "Dr. Sharma",
        role: "Arzt",
        german: "Gut. NIHSS Score beträgt nach Ersteinschätzung 14 Punkte. Bitte sofort cCT mit CT-Angiographie ohne Zeitverlust anfordern!",
      },
    ],
    redemittel: [
      "Die Patientin zeigt eine akute Hemiparese der rechten Körperhälfte sowie eine Dysarthrie.",
      "Das genaue Zeitfenster (Last Seen Normal) war heute um 14:15 Uhr.",
      "Ausschlusskriterien für eine systemische Thrombolyse (r-tPA) müssen unverzüglich geprüft werden.",
      "Ein kontinuierliches Neuromonitoring und Blutzuckerkontrolle sind zwingend erforderlich.",
    ],
    sampleHandover: {
      identification: "Frau Hannelore Meier, 74 Jahre alt, Stroke Unit Überwachungsplatz 2.",
      situation:
        "Akuter Schlaganfall mit rechtseitiger Hemiparese und Aphasie seit 14:15 Uhr (Beginn vor 55 Min).",
      background:
        "Vorbekanntes persistierendes Vorhofflimmern, jedoch unregelmäßige Einnahme von Apixaban. Diabetes mellitus Typ 2.",
      assessment:
        "NIHSS 14 Punkte. RR 185/100 mmHg. Pupillen isokor, reagieren prompt auf Licht. cCT zeigt keine intrakranielle Blutung, CTA zeigt Verschluss des M1-Segments der A. cerebri media links.",
      recommendation:
        "Sofortiger Beginn der i.v. Thrombolyse mit Alteplase (0,9 mg/kg KG) und parallele Vorbereitung der mechanischen Thrombektomie im Angiographie-Saal.",
    },
  },
  {
    id: "fsp-case-03-ausbildung",
    title: "Pflegedokumentation & Schichtübergabe (Früh- zu Spätschicht)",
    category: "pflegedokumentation",
    patientName: "Eberhard Richter",
    patientAge: 79,
    chiefComplaint: "Postoperative Überwachung nach elektiver totaler Hüftendoprothese (TEP) rechts",
    diagnosis: "Z.n. Hüft-TEP rechts am 2. postoperativen Tag (Z.n. Koxarthrose)",
    situation: "Patient ist kreislaufstabil, Erst-Mobilisation mit Unterarmgehstützen unter physiotherapeutischer Anleitung erfolgreich.",
    vitalSigns: {
      bloodPressure: "130/80 mmHg",
      heartRate: "72 bpm",
      spo2: "98%",
      temperature: "36.6 °C",
    },
    dialogueScript: [
      {
        speaker: "Pflegefachkraft Frühschicht",
        role: "Pflegekraft",
        german: "Übergabe Zimmer 204, Herr Richter: Die Redon-Drainage förderte in den letzten 24 Stunden nur noch 30 ml serosanguinöse Flüssigkeit. Wundverband ist trocken und reizlos.",
      },
      {
        speaker: "Pflegefachkraft Spätschicht",
        role: "Pflegekraft",
        german: "Sehr schön. Wie ist die Schmerzsituation nach der Mobilisation? Nimmt er die Bedarfsmedikation?",
      },
      {
        speaker: "Pflegefachkraft Frühschicht",
        role: "Pflegekraft",
        german: "Schmerzen in Ruhe VAS 2/10, unter Bewegung 4/10. Hat heute Mittag 1000 mg Paracetamol erhalten. Thromboseprophylaxe mit Clexane 40mg s.c. ist um 20:00 Uhr fällig.",
      },
    ],
    redemittel: [
      "Der Wundverband zeigt keine Nachblutung oder Infektionszeichen (Rubor, Calor, Tumor, Dolor).",
      "Die periphere Durchblutung, Motorik und Sensibilität (DMS-Kontrolle) am rechten Fuß ist uneingeschränkt intakt.",
      "Die Thromboseprophylaxe wurde planmäßig verabreicht und in der elektronischen Kurve abgezeichnet.",
      "Flüssigkeitsbilanzierung und Miktion sind unauffällig.",
    ],
    sampleHandover: {
      identification: "Herr Eberhard Richter, 79 Jahre, Station Chirurgie 3, Zimmer 204.",
      situation: "2. postoperativer Tag nach Hüft-TEP rechts. Schmerzarm unter Basismedikation, mobilisiert.",
      background: "Arthrose Grad IV, sonst rüstiger Zustand. Keine Arzneimittelallergien.",
      assessment:
        "DMS intakt. Vitalwerte normwertig (RR 130/80, Puls 72). Redon-Fördermenge rückläufig (<50ml/d). Verband trocken.",
      recommendation:
        "Visite durch Stationsarzt zur geplanten Redon-Zug-Entscheidung. Thrombosespritze (Enoxaparin 40mg s.c.) zur Nacht. Sturzprophylaxe beachten.",
    },
  },
];
