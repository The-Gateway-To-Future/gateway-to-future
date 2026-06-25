import React from "react";
import AnimatedSection from "../components/AnimatedSection";

export default function Resources() {
  const resources = [
    {
      title: "Ausbildung Preparation Guide 🇩🇪",
      type: "PDF E-Book",
      size: "4.2 MB",
      desc: "A step-by-step handbook covering resume format (Lebenslauf), motivation letter (Anschreiben) samples, and list of nursing schools in Germany."
    },
    {
      title: "German A1 Vocabulary Flashcards 🗣️",
      type: "Anki Deck / PDF",
      size: "1.8 MB",
      desc: "Over 500 essential German words with audio guides and visual aids to help you clear your Goethe A1 exam in your first attempt."
    },
    {
      title: "Visa Document Checklist (2026 update) 🛂",
      type: "Interactive Checklist",
      size: "1.1 MB",
      desc: "Official list of documents required for German student visa (national visa) including blocked account details, health insurance, and APS certificates."
    }
  ];

  return (
    <div className="container subpage" style={{ paddingBottom: "3rem" }}>
      <AnimatedSection>
        <section className="page-header" style={{ padding: "4rem 0 2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: "700" }}>Free <span style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))" }}>Resources</span></h1>
          <p style={{ fontSize: "1.2rem", color: "var(--text)" }}>High-fidelity study materials and checklists to kickstart your international career.</p>
        </section>
      </AnimatedSection>

      <section className="resources-list grid-3" style={{ gap: "2rem", marginTop: "2rem" }}>
        {resources.map((r, idx) => (
          <AnimatedSection key={idx}>
            <article className="glass-card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "left", padding: "2rem" }}>
              <div>
                <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", fontWeight: "bold" }}>📦 {r.type} ({r.size})</span>
                <h2 style={{ fontSize: "1.4rem", margin: "0.5rem 0 1rem", color: "var(--text-h)" }}>{r.title}</h2>
                <p style={{ fontSize: "0.95rem", color: "var(--text)" }}>{r.desc}</p>
              </div>
              <div style={{ marginTop: "2rem" }}>
                <a href="/contact" className="btn" style={{ width: "100%", textAlign: "center", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>Download Now (Free)</a>
              </div>
            </article>
          </AnimatedSection>
        ))}
      </section>
    </div>
  );
}
