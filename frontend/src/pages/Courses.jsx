import React from "react";
import AnimatedSection from "../components/AnimatedSection";

export default function Courses() {
  const programs = [
    {
      title: "Nursing Ausbildung Germany 🇩🇪",
      category: "Work & Study Program",
      desc: "Earn while you learn! Tuition-free nursing vocational training in Germany with an monthly stipend of €1,000–€1,400. Direct placements available for Indian students with B1/B2 German language certification.",
      duration: "3 Years",
      stipend: "€1,000 - €1,400 / month"
    },
    {
      title: "German Language Pathway (A1–B2) 🗣️",
      category: "Language Ecosystem",
      desc: "CEFR-aligned German language ecosystem designed for fast-track results. Experienced native-level coaches focusing on Goethe & Telc examinations. Hindi & English-assisted teaching methodologies.",
      duration: "6-8 Months",
      stipend: "N/A"
    },
    {
      title: "Study Abroad (Global Admissions) 🎓",
      category: "Degree Programs",
      desc: "Complete university application support for top destinations: Germany, UK, Canada, Australia, and USA. From profile evaluation, letter of motivation (LOM) reviews, to visa application filing.",
      duration: "1-2 Years (Master/Bachelor)",
      stipend: "Part-time job allowances"
    }
  ];

  return (
    <div className="container subpage" style={{ paddingBottom: "3rem" }}>
      <AnimatedSection>
        <section className="page-header" style={{ padding: "4rem 0 2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: "700" }}>Our <span style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))" }}>Programs</span></h1>
          <p style={{ fontSize: "1.2rem", color: "var(--text)" }}>High-fidelity career pathways aligned with global demands.</p>
        </section>
      </AnimatedSection>

      <section className="courses-list grid-3" style={{ gap: "2rem", marginTop: "2rem" }}>
        {programs.map((p, idx) => (
          <AnimatedSection key={idx}>
            <article className="glass-card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "left", padding: "2rem" }}>
              <div>
                <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", fontWeight: "bold" }}>{p.category}</span>
                <h2 style={{ fontSize: "1.5rem", margin: "0.5rem 0 1rem", color: "var(--text-h)" }}>{p.title}</h2>
                <p style={{ fontSize: "0.95rem", marginBottom: "1.5rem", color: "var(--text)" }}>{p.desc}</p>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  <span>⏳ <strong>Duration:</strong> {p.duration}</span>
                  {p.stipend !== "N/A" && <span>💰 <strong>Stipend:</strong> {p.stipend}</span>}
                </div>
                <a href="/contact" className="btn" style={{ width: "100%", textAlign: "center" }}>Enroll / Inquire Now</a>
              </div>
            </article>
          </AnimatedSection>
        ))}
      </section>
    </div>
  );
}
