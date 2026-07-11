import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AnimatedSection from "../components/AnimatedSection";
import { ausbildungData } from "../data/ausbildungData";

export default function AusbildungDetail() {
  const { id } = useParams();
  const [openFaq, setOpenFaq] = useState(null);

  // Find the vocation in our database
  const program = ausbildungData.find((p) => p.id === id);

  if (!program) {
    return (
      <div className="container subpage" style={{ padding: "8rem 0", textAlign: "center" }}>
        <AnimatedSection>
          <span style={{ fontSize: "4rem" }}>🔍</span>
          <h2 style={{ fontSize: "2rem", margin: "1rem 0" }}>Vocation Profile Not Found</h2>
          <p style={{ color: "var(--text)", marginBottom: "2rem" }}>
            We could not find a detail card for the vocation code: "{id}".
          </p>
          <Link to="/ausbildung" className="btn">Return to Ausbildung Hub</Link>
        </AnimatedSection>
      </div>
    );
  }

  return (
    <div className="container subpage" style={{ paddingBottom: "5rem" }}>
      
      {/* BREADCRUMB */}
      <AnimatedSection>
        <div style={{ padding: "2rem 0 1rem", fontSize: "0.9rem", textAlign: "left", color: "rgba(255,255,255,0.6)" }}>
          <Link to="/ausbildung" style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", textDecoration: "none" }}>Ausbildung Hub</Link>
          <span style={{ margin: "0 0.5rem" }}>&gt;</span>
          <span>{program.category}</span>
          <span style={{ margin: "0 0.5rem" }}>&gt;</span>
          <span style={{ color: "#fff" }}>{program.titleEn}</span>
        </div>
      </AnimatedSection>

      {/* HEADER CARD */}
      <AnimatedSection>
        <section className="glass-card" style={{ 
          padding: "3rem", 
          margin: "1rem 0 3rem", 
          textAlign: "left",
          background: "linear-gradient(135deg, rgba(25, 27, 38, 0.9), rgba(170, 59, 255, 0.05))",
          border: "1px solid rgba(170, 59, 255, 0.25)"
        }}>
          <div style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ 
              fontSize: "4.5rem", 
              background: "rgba(255,255,255,0.06)", 
              width: "100px", 
              height: "100px", 
              borderRadius: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
            }}>
              {program.icon}
            </div>
            
            <div style={{ flex: "1" }}>
              <span style={{ 
                textTransform: "uppercase", 
                fontSize: "0.8rem", 
                letterSpacing: "1.5px", 
                color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))",
                fontWeight: "bold",
                display: "block",
                marginBottom: "0.25rem"
              }}>
                {program.category}
              </span>
              <h1 style={{ fontSize: "2.5rem", fontWeight: "800", color: "#fff", margin: "0 0 0.5rem 0", lineHeight: "1.2" }}>
                {program.titleEn}
              </h1>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "600", color: "rgba(255,255,255,0.6)", margin: "0" }}>
                German Vocation Title: <span style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", fontStyle: "italic" }}>{program.titleDe}</span>
              </h2>
            </div>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link to="/contact" className="btn" style={{ padding: "0.9rem 2rem" }}>Inquire About Placement</Link>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "1.5rem", 
            marginTop: "2.5rem", 
            borderTop: "1px solid rgba(255,255,255,0.1)", 
            paddingTop: "2rem" 
          }}>
            <div>
              <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>⏳ Duration</span>
              <strong style={{ display: "block", fontSize: "1.2rem", color: "#fff", marginTop: "0.25rem" }}>{program.duration}</strong>
            </div>
            <div>
              <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>💶 Training Stipend</span>
              <strong style={{ display: "block", fontSize: "1.2rem", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", marginTop: "0.25rem" }}>{program.stipendRange}</strong>
            </div>
            <div>
              <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>💰 Starting Salary</span>
              <strong style={{ display: "block", fontSize: "1.2rem", color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", marginTop: "0.25rem" }}>{program.startingSalary}</strong>
            </div>
            <div>
              <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>🗣️ Required German</span>
              <strong style={{ display: "block", fontSize: "1.2rem", color: "#fff", marginTop: "0.25rem" }}>{program.germanLevel} Level</strong>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* TWO COLUMNS DETAIL */}
      <div className="grid-3" style={{ gap: "2.5rem", alignItems: "start" }}>
        
        {/* Left Column - 2/3 width */}
        <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "2.5rem", textAlign: "left" }}>
          
          {/* Overview */}
          <AnimatedSection>
            <article className="glass-card" style={{ padding: "2rem" }}>
              <h3 style={{ fontSize: "1.4rem", marginBottom: "1rem", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.5rem" }}>
                Role Overview
              </h3>
              <p style={{ fontSize: "1.05rem", lineHeight: "1.6", color: "rgba(255,255,255,0.9)" }}>
                {program.desc}
              </p>
            </article>
          </AnimatedSection>

          {/* Daily Duties */}
          <AnimatedSection>
            <article className="glass-card" style={{ padding: "2rem" }}>
              <h3 style={{ fontSize: "1.4rem", marginBottom: "1rem", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.5rem" }}>
                Daily Duties & Training Tasks (Aufgaben)
              </h3>
              <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", marginBottom: "1.25rem" }}>
                During your training, you will be assigned to a senior mentor at your company. You will learn to perform the following core technical tasks:
              </p>
              <ul style={{ listStyleType: "none", padding: "0" }}>
                {program.duties.map((duty, idx) => (
                  <li key={idx} style={{ 
                    marginBottom: "1rem", 
                    display: "flex", 
                    gap: "0.75rem", 
                    fontSize: "0.98rem", 
                    lineHeight: "1.5" 
                  }}>
                    <span style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", fontWeight: "bold" }}>✔</span>
                    <span>{duty}</span>
                  </li>
                ))}
              </ul>
            </article>
          </AnimatedSection>

          {/* Why it is great for Indian candidates */}
          <AnimatedSection>
            <article className="glass-card" style={{ 
              padding: "2rem",
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(15, 17, 26, 0.95))",
              borderColor: "rgba(34, 197, 94, 0.25)"
            }}>
              <h3 style={{ fontSize: "1.4rem", marginBottom: "1rem", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.5rem" }}>
                Why This Vocation is Ideal for Indian Candidates
              </h3>
              <ul style={{ listStyleType: "none", padding: "0" }}>
                {program.whyIndianStudents.map((point, idx) => (
                  <li key={idx} style={{ 
                    marginBottom: "1rem", 
                    display: "flex", 
                    gap: "0.75rem", 
                    fontSize: "0.98rem", 
                    lineHeight: "1.5" 
                  }}>
                    <span style={{ color: "#22c55e", fontWeight: "bold" }}>⭐</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          </AnimatedSection>

          {/* Career Growth & Meister */}
          <AnimatedSection>
            <article className="glass-card" style={{ padding: "2rem" }}>
              <h3 style={{ fontSize: "1.4rem", marginBottom: "1rem", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.5rem" }}>
                Career Growth & Post-Ausbildung Specialization
              </h3>
              <p style={{ fontSize: "1rem", lineHeight: "1.6", marginBottom: "1.2rem" }}>
                {program.careerGrowth}
              </p>
              <div style={{ 
                background: "rgba(255,255,255,0.04)", 
                padding: "1.25rem", 
                borderRadius: "1rem",
                fontSize: "0.9rem",
                borderLeft: "4px solid hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))"
              }}>
                <strong>💡 Did you know?</strong> Once you obtain your Meister certificate or complete your Ausbildung with a few years of specialist work, Germany's new immigration laws allow you to apply directly for permanent residency status (Niederlassungserlaubnis).
              </div>
            </article>
          </AnimatedSection>

          {/* FAQS */}
          {program.faq && program.faq.length > 0 && (
            <AnimatedSection>
              <article className="glass-card" style={{ padding: "2rem" }}>
                <h3 style={{ fontSize: "1.4rem", marginBottom: "1.5rem", color: "#fff" }}>
                  Trade-Specific FAQs
                </h3>
                {program.faq.map((faq, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      marginBottom: "1.2rem", 
                      borderBottom: "1px solid rgba(255,255,255,0.06)", 
                      paddingBottom: "1rem" 
                    }}
                  >
                    <h4 style={{ fontSize: "1.05rem", color: "#fff", marginBottom: "0.5rem", display: "flex", gap: "0.5rem" }}>
                      <span style={{ color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))" }}>Q:</span>
                      <span>{faq.q}</span>
                    </h4>
                    <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.75)", paddingLeft: "1.3rem", margin: "0", lineHeight: "1.5" }}>
                      {faq.a}
                    </p>
                  </div>
                ))}
              </article>
            </AnimatedSection>
          )}

        </div>

        {/* Right Column - 1/3 Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem", textAlign: "left" }}>
          
          {/* Prerequisites */}
          <AnimatedSection>
            <article className="glass-card" style={{ padding: "1.5rem 1.8rem" }}>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "1.25rem", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.5rem" }}>
                Requirements
              </h3>
              
              <div style={{ marginBottom: "1.2rem" }}>
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Academic Background</span>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.95rem", color: "#fff", fontWeight: "600" }}>{program.academicPrereq}</p>
              </div>

              <div style={{ marginBottom: "1.2rem" }}>
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>German Level</span>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.95rem", color: "#fff", fontWeight: "600" }}>
                  Certified {program.germanLevel} (Goethe or Telc)
                </p>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: "0.25rem" }}>
                  Language proficiency is tested in both employer interviews and the German embassy visa interview.
                </p>
              </div>

              <div>
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Minimum Age</span>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.95rem", color: "#fff", fontWeight: "600" }}>17 Years Old</p>
              </div>
            </article>
          </AnimatedSection>

          {/* GTF Support Stats */}
          <AnimatedSection>
            <article className="glass-card" style={{ padding: "1.5rem 1.8rem", background: "rgba(170, 59, 255, 0.05)" }}>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#fff" }}>
                GTF Placement Success
              </h3>
              <div style={{ margin: "1rem 0" }}>
                <strong style={{ fontSize: "2rem", color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", display: "block" }}>100%</strong>
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>Contract Securing Rate (for B1/B2 graduates)</span>
              </div>
              <div style={{ margin: "1rem 0" }}>
                <strong style={{ fontSize: "2rem", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", display: "block" }}>45-60 Days</strong>
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>Average placement speed post B1 certificate</span>
              </div>
              <div style={{ margin: "1rem 0" }}>
                <strong style={{ fontSize: "2rem", color: "#fff", display: "block" }}>Berlin & Munich</strong>
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>Core placement partner employer locations</span>
              </div>
            </article>
          </AnimatedSection>

          {/* Direct CTA */}
          <AnimatedSection>
            <article className="glass-card" style={{ 
              padding: "1.8rem", 
              textAlign: "center",
              background: "linear-gradient(135deg, hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l)), hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l)))" 
            }}>
              <h4 style={{ fontSize: "1.2rem", color: "#fff", marginBottom: "0.5rem" }}>Apply for {program.titleEn} Placements</h4>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.9)", marginBottom: "1.5rem" }}>
                Let our mentors review your credentials and pair you with a German construction or service partner.
              </p>
              <Link to="/contact" className="btn" style={{ background: "#fff", color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", boxShadow: "none", width: "100%" }}>
                Request Consultation
              </Link>
            </article>
          </AnimatedSection>

        </div>

      </div>

    </div>
  );
}
