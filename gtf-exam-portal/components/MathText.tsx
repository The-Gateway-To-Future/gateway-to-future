import React from "react";
import katex from "katex";

export interface MathTextProps {
  text?: string | null;
  /** Render the entire `text` string as display-mode LaTeX inside a horizontally scrollable container. */
  display?: boolean;
  /** Render the entire `text` string as inline LaTeX. */
  inlineMath?: boolean;
  className?: string;
  as?: "span" | "div" | "p";
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "ⁿ": "n",
  "⁺": "+",
  "⁻": "-",
};

const SUBSCRIPT_MAP: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
};

function decodeUnicodeScripts(str: string): string {
  return str
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+/g, (m) => {
      const inner = Array.from(m)
        .map((c) => SUPERSCRIPT_MAP[c] ?? c)
        .join("");
      return `^{${inner}}`;
    })
    .replace(/[₀₁₂₃₄₅₆₇₈₉]+(?:,[₀₁₂₃₄₅₆₇₈₉]+)*/g, (m) => {
      const inner = Array.from(m)
        .map((c) => SUBSCRIPT_MAP[c] ?? c)
        .join("");
      return `_{${inner}}`;
    });
}

function cleanLatexFragment(raw: string): string {
  let s = raw.trim();
  // Strip outer $$...$$ or $...$ if caller passed them with display/inlineMath=true
  if (s.startsWith("$$") && s.endsWith("$$") && s.length > 4) {
    s = s.slice(2, -2).trim();
  } else if (s.startsWith("$") && s.endsWith("$") && s.length > 2) {
    s = s.slice(1, -1).trim();
  }
  s = decodeUnicodeScripts(s);
  s = s
    .replace(/−/g, "-")
    .replace(/·|⋅/g, " \\cdot ")
    .replace(/×/g, " \\times ")
    .replace(/±/g, " \\pm ")
    .replace(/≤/g, " \\le ")
    .replace(/≥/g, " \\ge ")
    .replace(/≠|!=/g, " \\neq ")
    .replace(/≈/g, " \\approx ")
    .replace(/→|->/g, " \\rightarrow ")
    .replace(/∑/g, " \\sum ")
    .replace(/α/g, "\\alpha ")
    .replace(/β/g, "\\beta ")
    .replace(/γ/g, "\\gamma ")
    .replace(/Δ/g, "\\Delta ")
    .replace(/ε/g, "\\varepsilon ")
    .replace(/λ/g, "\\lambda ")
    .replace(/π/g, "\\pi ")
    .replace(/σ/g, "\\sigma ")
    .replace(/ω/g, "\\omega ")
    .replace(/\*/g, " \\cdot ");

  // Convert nested sqrt(...) or √(...) inside a LaTeX fragment
  s = s.replace(/(?:sqrt|√)\(([^()]+)\)/gi, (_m, inner) => `\\sqrt{${cleanInnerMath(inner)}}`);
  s = s.replace(/√([0-9]+(?:[.,][0-9]+)?)/g, (_m, num) => `\\sqrt{${num.replace(",", "{,}")}}`);

  // Convert simple a / b fractions inside pure math fragments
  s = s.replace(
    /\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g,
    (_m, num, den) => `\\frac{${num.trim()}}{${den.trim()}}`,
  );

  return s.replace(/\s{2,}/g, " ").trim();
}

function cleanInnerMath(expr: string): string {
  let s = decodeUnicodeScripts(expr.trim());
  s = s
    .replace(/−/g, "-")
    .replace(/·|⋅|\*/g, " \\cdot ")
    .replace(/±/g, " \\pm ")
    .replace(/E_kin\b/g, "E_{\\text{kin}}")
    .replace(/E_pot\b/g, "E_{\\text{pot}}")
    .replace(/K_fix\b/g, "K_{\\text{fix}}")
    .replace(/k_var\b/g, "k_{\\text{var}}")
    .replace(/x_BEP\b/g, "x_{\\text{BEP}}")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\b/g, (_m, a, b) => `\\frac{${a}}{${b}}`)
    .replace(/\b([a-zA-Z]+)\s*\/\s*([a-zA-Z]+)\b/g, (_m, a, b) => `\\frac{${a}}{${b}}`);
  return s;
}

/**
 * Normalizes messy raw ASCII math in prose into `$...$` LaTeX tokens while
 * preserving German prose, dates (e.g. 2025/2026), CEFR labels (A1/B2), and currency.
 */
export function normalizeAsciiMathToLatex(prose: string): string {
  if (!prose) return "";
  let s = prose;

  // Placeholder vault so already-converted $...$ spans are never re-processed
  const slots: string[] = [];
  const hold = (latex: string): string => {
    const idx = slots.length;
    slots.push(`$${latex}$`);
    return `\uE000${idx}\uE001`;
  };

  // 1. Integral expressions: Integral(f(x) dx) = F(b) - F(a) or Integral f(x) dx = ...
  s = s.replace(
    /Integral\s*\(\s*f\(x\)\s*dx\s*\)\s*=\s*([A-Za-z0-9'()+\-\s]+)/g,
    (_m, rhs) => hold(`\\int_a^b f(x)\\,dx = ${rhs.trim()}`),
  );
  s = s.replace(
    /Integral\s+f\(x\)\s*dx\s*=\s*([A-Za-z0-9'()+\-\s]+)/g,
    (_m, rhs) => hold(`\\int f(x)\\,dx = ${rhs.trim()}`),
  );

  // 2. Derivative expressions: d/dx [x^n] = n * x^(n-1) or d/dx (3x³)
  s = s.replace(
    /d\/dx\s*[\[(]([^\]\)]+)[\])](?:\s*=\s*([A-Za-z0-9^()+\-*/·\s]+?))?(?=[.,;:|]|$|\s+(?:und|oder|für|ist|wird))/g,
    (_m, arg, rhs) => {
      const a = cleanLatexFragment(arg);
      if (rhs && rhs.trim()) {
        const r = cleanLatexFragment(rhs.replace(/\^\(([^)]+)\)/g, "^{$1}"));
        return hold(`\\frac{d}{dx}\\left(${a}\\right) = ${r}`);
      }
      return hold(`\\frac{d}{dx}\\left(${a}\\right)`);
    },
  );

  // 3. Function mapping f: R -> R
  s = s.replace(/\bf:\s*R\s*(?:->|→)\s*R\b/g, () => hold("f\\colon \\mathbb{R} \\to \\mathbb{R}"));

  // 4. Roots: sqrt(...) or √(...) or √25 / √20,25 / √392.4
  s = s.replace(/(?:sqrt|√)\(([^()]+(?:\([^()]*\)[^()]*)*)\)/gi, (_m, inner) => {
    const cleaned = cleanInnerMath(
      inner.replace(/\(([^()]+)\)\s*\/\s*(\d+)/g, "\\frac{$1}{$2}"),
    );
    return hold(`\\sqrt{${cleaned}}`);
  });
  s = s.replace(/√([0-9]+(?:[.,][0-9]+)?)/g, (_m, num) =>
    hold(`\\sqrt{${num.replace(",", "{,}")}}`),
  );

  // 5. Logarithms with base: log₂(32), log_b(x), log₁₀(100)
  s = s.replace(
    /\blog(?:_([a-zA-Z0-9]+)|([₀₁₂₃₄₅₆₇₈₉]+))\(([^)]+)\)/g,
    (_m, asciiBase, uniBase, arg) => {
      const base = asciiBase || Array.from(uniBase as string).map((c) => SUBSCRIPT_MAP[c] ?? c).join("");
      const cleanedArg = cleanLatexFragment(arg);
      return hold(`\\log_{${base}}(${cleanedArg})`);
    },
  );

  // 6. Named physics/chemistry/economics subscript identifiers
  const namedSubs: [RegExp, string][] = [
    [/\bE_kin\b/g, "E_{\\text{kin}}"],
    [/\bE_pot\b/g, "E_{\\text{pot}}"],
    [/\bE_gesamt\b/g, "E_{\\text{gesamt}}"],
    [/\bE_K\b/g, "E_K"],
    [/\bx_BEP\b/g, "x_{\\text{BEP}}"],
    [/\bK_fix\b/g, "K_{\\text{fix}}"],
    [/\bk_var\b/g, "k_{\\text{var}}"],
    [/\bv_Aufprall\b/g, "v_{\\text{Aufprall}}"],
    [/\bS_y\b/g, "S_y"],
    [/\bS_x\b/g, "S_x"],
    [/\bt(?:₁\/₂|_1\/2)\b/g, "t_{1/2}"],
    [/\bpK_s\b/g, "\\text{p}K_s"],
    [/\bF_x\b/g, "F_x"],
    [/\bF_y\b/g, "F_y"],
    [/\bM_A\b/g, "M_A"],
    [/\bM_p\b/g, "M_p"],
    [/\bI_k\b/g, "I_k"],
    [/\bU_k\b/g, "U_k"],
    [/\bN_0\b/g, "N_0"],
  ];
  for (const [re, tex] of namedSubs) {
    s = s.replace(re, () => hold(tex));
  }

  // 7. Chemical formulas & ions
  const chemPatterns: [RegExp, string][] = [
    [/\[HCO3-\]/g, "[\\text{HCO}_3^-]"],
    [/\bHCO3-/g, "\\text{HCO}_3^-"],
    [/\[CO2\]/g, "[\\text{CO}_2]"],
    [/\bC(?:₆H₁₂O₆|6H12O6)\b/g, "\\text{C}_6\\text{H}_{12}\\text{O}_6"],
    [/\bFADH2\b/g, "\\text{FADH}_2"],
    [/\bH(?:_2|2|₂)O\b/g, "\\text{H}_2\\text{O}"],
    [/\bCO(?:_2|2|₂)\b/g, "\\text{CO}_2"],
    [/\bO(?:_2|2|₂)\b/g, "\\text{O}_2"],
    [/\bNa(?:⁺|\+)/g, "\\text{Na}^+"],
    [/\bCl(?:⁻|-)(?=\s|$|[.,;)])/g, "\\text{Cl}^-"],
    [/\bK(?:⁺|\+)/g, "\\text{K}^+"],
    [/\bH(?:⁺|\+)(?=\s|$|[.,;)])/g, "\\text{H}^+"],
    [/\[A(?:⁻|-)\]/g, "[\\text{A}^-]"],
  ];
  for (const [re, tex] of chemPatterns) {
    s = s.replace(re, () => hold(tex));
  }

  // 8. Leading half/fraction coefficient with power: 1/2 mv^2 or (1/2)mv^2
  s = s.replace(
    /\b(\d{1,2})\s*\/\s*(\d{1,2})\s*([a-zA-Z]{1,3})\^(\(?[a-zA-Z0-9+\-]+\)?)/g,
    (_m, num, den, base, exp) => hold(`\\frac{${num}}{${den}}${base}^{${exp.replace(/[()]/g, "")}}`),
  );

  // 9. Parenthesized algebraic fractions like (y₂ − y₁) / (x₂ − x₁) or (9 − 3) / (4 − 1)
  s = s.replace(
    /\(([^()]{1,24})\)\s*\/\s*\(([^()]{1,24})\)/g,
    (match, num, den) => {
      if (/[a-zA-Z]{4,}/.test(num) || /[a-zA-Z]{4,}/.test(den)) return match;
      return hold(`\\frac{${cleanLatexFragment(num)}}{${cleanLatexFragment(den)}}`);
    },
  );

  // 10. Derivative notation f'(x0), f''(x0), f'''(x0) != 0
  s = s.replace(
    /\bf('{1,3})\(([^()]{1,8})\)\s*(!=|≠|>=|<=|>|<|=)\s*([0-9]+|[a-zA-Z])/g,
    (_m, primes, arg, op, val) => {
      const a = arg.replace(/^([a-zA-Z])0$/, "$1_0");
      const o = op === "!=" ? "\\neq" : op;
      return hold(`f${primes}(${a}) ${o} ${val}`);
    },
  );
  s = s.replace(/\bf('{1,3})\(([^()]{1,6})\)/g, (_m, primes, arg) => {
    const a = arg.replace(/^([a-zA-Z])0$/, "$1_0");
    return hold(`f${primes}(${a})`);
  });

  // 11. Caret exponents: mv^2, x^2, x^(n-1), 2^(t / T), e^(-λt)
  s = s.replace(
    /\b([a-zA-Z0-9]+)\^\(([^()]{1,18})\)/g,
    (_m, base, exp) => hold(`${base}^{${cleanInnerMath(exp)}}`),
  );
  s = s.replace(
    /\b([a-zA-Z0-9]+)\^([a-zA-Z0-9+\-]+)/g,
    (_m, base, exp) => hold(`${base}^{${exp}}`),
  );

  // 12. Unicode superscript terms (e.g. 3x³, 5x², x², I², 2⁵, 10², cm², s²)
  s = s.replace(
    /\b([0-9]*[a-zA-Z]+|[0-9]+)([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+)/g,
    (_m, base, sup) => {
      const exp = Array.from(sup as string)
        .map((c) => SUPERSCRIPT_MAP[c] ?? c)
        .join("");
      if (/^(?:cm|mm|km|dm|m|s)$/i.test(base)) {
        return hold(`\\text{${base}}^{${exp}}`);
      }
      return hold(`${base}^{${exp}}`);
    },
  );

  // 13. Unicode subscript terms (e.g. x₁,₂, x₁, y₂, V₁, V₂, N₀, ω₀, a₁, b₂)
  s = s.replace(
    /([a-zA-ZωΩαβγλσ])([₀₁₂₃₄₅₆₇₈₉]+(?:,[₀₁₂₃₄₅₆₇₈₉]+)*)/g,
    (_m, base, sub) => {
      const b = cleanLatexFragment(base);
      const inner = Array.from(sub as string)
        .map((c) => SUBSCRIPT_MAP[c] ?? c)
        .join("");
      return hold(`${b}_{${inner}}`);
    },
  );

  // 14. Standalone numeric fractions like 4/5, 1/2, 3/4 (skipping dates like 2025/2026, 2026/27, 1918/1919)
  s = s.replace(/(?<![A-Za-z0-9./])(-?\d{1,3})\s*\/\s*(\d{1,3})(?![A-Za-z0-9./])/g, (m, a, b) => {
    const na = Math.abs(Number(a));
    const nb = Number(b);
    if (nb === 0) return m;
    // Skip calendar years or day/month formats like 09/11 or 2025/26
    if (na >= 1900 || nb >= 1900) return m;
    return hold(`\\frac{${a}}{${b}}`);
  });

  // 15. Greek deltas & standalone symbols (ΔEN, ΔH, ΔQ, ΔP, ΔL, ε, λ, π, σ, ω, α)
  s = s.replace(/Δ([A-Za-z]{1,3})\b/g, (_m, sym) =>
    hold(sym.length > 1 ? `\\Delta \\text{${sym}}` : `\\Delta ${sym}`),
  );
  s = s.replace(/(?<![A-Za-z])([ελπσωα])(?![A-Za-z])/g, (_m, g) => hold(cleanLatexFragment(g)));

  // 16. Restore placeholders
  return s.replace(/\uE000(\d+)\uE001/g, (_m, i) => slots[Number(i)] || "");
}

function renderKatexHtml(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(cleanLatexFragment(latex), {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch {
    return latex;
  }
}

function renderInlineBold(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-b-${idx}`} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${idx}`}>{part}</React.Fragment>;
  });
}

type Segment =
  | { kind: "display"; content: string }
  | { kind: "inline"; content: string }
  | { kind: "text"; content: string };

function tokenizeMathAndText(input: string): Segment[] {
  const segments: Segment[] = [];
  // Matches $$...$$, \[...\], \(...\), or $...$ (non-greedy, not starting with space+digit currency)
  const delimiterRe = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?!\s)[^$\n]+?(?<!\s)\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = delimiterRe.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", content: input.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith("$$") && token.endsWith("$$")) {
      segments.push({ kind: "display", content: token.slice(2, -2) });
    } else if (token.startsWith("\\[") && token.endsWith("\\]")) {
      segments.push({ kind: "display", content: token.slice(2, -2) });
    } else if (token.startsWith("\\(") && token.endsWith("\\)")) {
      segments.push({ kind: "inline", content: token.slice(2, -2) });
    } else {
      segments.push({ kind: "inline", content: token.slice(1, -1) });
    }
    lastIndex = delimiterRe.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({ kind: "text", content: input.slice(lastIndex) });
  }

  // Run ASCII normalization on plain text segments only, then re-split any synthesized $...$ tokens
  const expanded: Segment[] = [];
  for (const seg of segments) {
    if (seg.kind !== "text") {
      expanded.push(seg);
      continue;
    }
    const normalized = normalizeAsciiMathToLatex(seg.content);
    if (!normalized.includes("$")) {
      expanded.push({ kind: "text", content: normalized });
      continue;
    }
    const subParts = normalized.split(/(\$(?!\s)[^$\n]+?(?<!\s)\$)/g);
    for (const part of subParts) {
      if (!part) continue;
      if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
        expanded.push({ kind: "inline", content: part.slice(1, -1) });
      } else {
        expanded.push({ kind: "text", content: part });
      }
    }
  }

  return expanded;
}

export function MathText({
  text,
  display = false,
  inlineMath = false,
  className = "",
  as = "span",
}: MathTextProps) {
  const safeText = typeof text === "string" ? text : "";
  if (!safeText) return null;

  if (display) {
    const html = renderKatexHtml(safeText, true);
    return (
      <div
        className={`overflow-x-auto max-w-full py-1 ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (inlineMath) {
    const html = renderKatexHtml(safeText, false);
    return (
      <span
        className={`inline-block align-baseline max-w-full ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const segments = tokenizeMathAndText(safeText);
  const Tag = as;

  return (
    <Tag className={className || undefined}>
      {segments.map((seg, idx) => {
        if (seg.kind === "display") {
          const html = renderKatexHtml(seg.content, true);
          return (
            <span
              key={`dm-${idx}`}
              className="block overflow-x-auto max-w-full py-1 my-1.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        if (seg.kind === "inline") {
          const html = renderKatexHtml(seg.content, false);
          return (
            <span
              key={`im-${idx}`}
              className="katex-inline-wrap"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        return (
          <React.Fragment key={`tx-${idx}`}>
            {renderInlineBold(seg.content, `tx-${idx}`)}
          </React.Fragment>
        );
      })}
    </Tag>
  );
}
