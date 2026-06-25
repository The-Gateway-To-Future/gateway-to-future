import React from "react";
import AnimatedSection from "../components/AnimatedSection";

export default function Blog() {
  const posts = [
    {
      title: "Germany's New Opportunity Card (Chancenkarte): How to Apply",
      date: "June 2026",
      readTime: "5 min read",
      summary: "Germany has rolled out its points-based job-seeker visa. Learn how to calculate your points, check eligibility requirements, and apply from India."
    },
    {
      title: "How to Prepare for Nursing Ausbildung Interviews from India",
      date: "May 2026",
      readTime: "7 min read",
      summary: "Getting an Ausbildung contract requires clearing video interviews in German. We share the most common questions, interview protocols, and language tips."
    },
    {
      title: "Cost of Living in Germany for International Students: 2026 Guide",
      date: "April 2026",
      readTime: "6 min read",
      summary: "From blocked account requirements (€934/month to €992/month updates) to finding accommodation in Berlin, Munich, or Frankfurt. A full financial breakdown."
    }
  ];

  return (
    <div className="container subpage" style={{ paddingBottom: "3rem" }}>
      <AnimatedSection>
        <section className="page-header" style={{ padding: "4rem 0 2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: "700" }}>GTF <span style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))" }}>Insights</span></h1>
          <p style={{ fontSize: "1.2rem", color: "var(--text)" }}>The latest guides, visa policies, and student success stories from Germany and beyond.</p>
        </section>
      </AnimatedSection>

      <section className="blog-posts grid-3" style={{ gap: "2rem", marginTop: "2rem" }}>
        {posts.map((p, idx) => (
          <AnimatedSection key={idx}>
            <article className="glass-card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "left", padding: "2rem" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", marginBottom: "0.5rem", fontWeight: "bold" }}>
                  <span>📅 {p.date}</span>
                  <span>⏱️ {p.readTime}</span>
                </div>
                <h2 style={{ fontSize: "1.35rem", margin: "0.5rem 0 1rem", color: "var(--text-h)", lineHeight: "1.3" }}>{p.title}</h2>
                <p style={{ fontSize: "0.95rem", color: "var(--text)" }}>{p.summary}</p>
              </div>
              <div style={{ marginTop: "1.5rem" }}>
                <a href="/contact" style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", textDecoration: "none", fontWeight: "bold" }}>Read Full Article →</a>
              </div>
            </article>
          </AnimatedSection>
        ))}
      </section>
    </div>
  );
}
