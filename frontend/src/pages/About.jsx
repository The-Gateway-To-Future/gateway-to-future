import React from "react";
import AnimatedSection from "../components/AnimatedSection";

export default function About() {
  return (
    <div className="container subpage">
      <AnimatedSection>
        <section className="page-header" style={{ padding: "4rem 0 2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: "700" }}>About <span style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))" }}>Gateway to Future</span></h1>
          <p style={{ fontSize: "1.2rem", color: "var(--text)" }}>Creating Careers Without Borders 🌍</p>
        </section>
      </AnimatedSection>

      <section className="about-hero grid-2" style={{ margin: "2rem 0", gap: "2rem" }}>
        <AnimatedSection>
          <article className="glass-card about-panel about-panel-main" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left" }}>
            <div className="section-kicker" style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "2px", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", marginBottom: "0.5rem", fontWeight: "bold" }}>Who We Are</div>
            <h2 style={{ fontSize: "2rem", marginBottom: "1rem", lineHeight: "1.3" }}>Built for learners planning a serious future abroad.</h2>
            <p style={{ marginBottom: "1rem" }}>
              Gateway to Future (GTF) is an international career and education consultancy based in Haridwar, India. We are dedicated to helping students and professionals from Uttarakhand and North India build successful careers overseas.
            </p>
            <p>
              We provide CEFR-aligned German language ecosystem (A1-C1) classes, global study abroad counseling, overseas job placements, visa guidance, and career mentorship.
            </p>
          </article>
        </AnimatedSection>

        <AnimatedSection>
          <aside className="glass-card about-stat-card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "1px" }}>Our Base</span>
            <strong style={{ fontSize: "3.5rem", color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", display: "block", margin: "0.5rem 0" }}>Haridwar, IN</strong>
            <p style={{ padding: "0 1rem", fontSize: "0.95rem" }}>Worldwide pathway support, student mentoring, and visa logistics.</p>
          </aside>
        </AnimatedSection>
      </section>

      <section className="about-grid grid-2" style={{ margin: "3rem 0", gap: "2rem" }}>
        <AnimatedSection>
          <article className="glass-card" style={{ textAlign: "left" }}>
            <div className="section-kicker" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "2px", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", marginBottom: "0.5rem", fontWeight: "bold" }}>Our Mission</div>
            <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>Make international careers accessible and stress-free.</h2>
            <p>
              We believe that studying or working abroad should not be limited by complex processes or high costs. Our mission is to handle the heavy lifting—admission, visa guidance, language preparation, and local support—so you can focus on your professional growth.
            </p>
          </article>
        </AnimatedSection>

        <AnimatedSection>
          <article className="glass-card" style={{ textAlign: "left" }}>
            <div className="section-kicker" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "2px", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", marginBottom: "0.5rem", fontWeight: "bold" }}>Why Choose GTF?</div>
            <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>A dedicated support ecosystem.</h2>
            <ul className="about-list" style={{ listStyleType: "none" }}>
              <li style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center" }}>⚡ Personalized overseas counseling</li>
              <li style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center" }}>🎓 Complete visa & admission assistance</li>
              <li style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center" }}>🗣️ CEFR-aligned German language preparation</li>
              <li style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center" }}>💼 Direct job placements & recruitment partnerships</li>
              <li style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center" }}>🧭 Uttarakhand & North India's trusted brand</li>
            </ul>
          </article>
        </AnimatedSection>
      </section>
    </div>
  );
}
