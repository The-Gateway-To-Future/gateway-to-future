import React, { useState } from "react";
import { Link } from "react-router-dom";
import AnimatedSection from "../components/AnimatedSection";
import { ausbildungData } from "../data/ausbildungData";

export default function AusbildungHub() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const categories = [
    {
      title: "House-Building & Skilled Trades 🧱",
      desc: "High stipend, fastest visa approval, and hands-on craftsmanship. Includes bricklayers, carpenters, tilers, and electricians.",
      color: "rgba(170, 59, 255, 0.15)",
      borderColor: "rgba(170, 59, 255, 0.3)"
    },
    {
      title: "Healthcare & Life Sciences 🩺",
      desc: "High stipends and immediate hospital employment. Unified nursing training recognized across the entire European Union.",
      color: "rgba(34, 197, 94, 0.12)",
      borderColor: "rgba(34, 197, 94, 0.3)"
    },
    {
      title: "IT & Technology 💻",
      desc: "Premium tech-office training in application development and system integration. High starting salaries, requires B2 German.",
      color: "rgba(59, 130, 246, 0.12)",
      borderColor: "rgba(59, 130, 246, 0.3)"
    },
    {
      title: "Engineering & Industry ⚙️",
      desc: "Industrial mechanics, mechatronics, and metalworkers powering Germany's world-famous automotive and manufacturing sectors.",
      color: "rgba(249, 115, 22, 0.12)",
      borderColor: "rgba(249, 115, 22, 0.3)"
    },
    {
      title: "Hospitality & Gastronomy 🏨",
      desc: "Hotel management and culinary arts (Chef) training in Germany's leading tourism hubs. Fast placements, high customer interaction.",
      color: "rgba(236, 72, 153, 0.12)",
      borderColor: "rgba(236, 72, 153, 0.3)"
    },
    {
      title: "Logistics & Commerce 📦",
      desc: "Warehouse logistics specialists and port operators managing global supply chains for giants like DHL, DB Schenker, and Amazon.",
      color: "rgba(20, 184, 166, 0.12)",
      borderColor: "rgba(20, 184, 166, 0.3)"
    }
  ];

  const steps = [
    {
      num: "01",
      title: "Profile Assessment & Goal Mapping",
      desc: "We analyze your academic background, determine your vocational affinity, and match you with high-probability trades."
    },
    {
      num: "02",
      title: "CEFR German Language Mastery",
      desc: "Train from A0 to B1/B2 in our specialized language coaching program, focusing heavily on professional and technical vocabulary."
    },
    {
      num: "03",
      title: "German CV & Cover Letter Customization",
      desc: "We rewrite your resume into a premium German format (Bewerbung) and draft persuasive motivational letters."
    },
    {
      num: "04",
      title: "Employer Matchmaking & Interview Prep",
      desc: "We coordinate with German employers, secure job interviews, and run intensive mock training sessions in German."
    },
    {
      num: "05",
      title: "Contract Review & Visa Filing",
      desc: "Receive your training contract (Ausbildungsvertrag), handle state approval, and apply via the fast-track Section 81a visa."
    },
    {
      num: "06",
      title: "Relocation & Berlin Landing Support",
      desc: "We coordinate airport pick-up, secure initial apartment sublets, set up health insurance, and register you locally (Anmeldung)."
    },
    {
      num: "07",
      title: "On-Site Mentorship & Meister Pathways",
      desc: "Continuous counseling during your 3-year training. When you graduate, we help you apply for permanent residency or Meister schools."
    }
  ];

  const faqs = [
    {
      q: "Do I need a Blocked Account (Sperrkonto) for a German Ausbildung?",
      a: "No! Unlike German university paths that require you to deposit over €11,900 per year in a blocked account, an Ausbildung is completely self-funded. The host company pays you a monthly training stipend (between €900 and €1,475) from Month 1, which legally covers your German visa livelihood requirements."
    },
    {
      q: "What is the age limit for starting an Ausbildung?",
      a: "While there is no legal age limit set by the German government, employers prefer candidates between 17 and 30. If you are older but have relevant work experience or degrees, we can still secure placements for you."
    },
    {
      q: "Can I apply if I only speak English?",
      a: "No. The vocational training schools (Berufsschule) in Germany teach exclusively in German. You must possess a certified B1 level to get a visa for most skilled trades, and B2 is highly recommended or required for Nursing and IT roles. GTF will help you learn the language from absolute scratch."
    },
    {
      q: "Is an Ausbildung a real degree?",
      a: "Yes, it is a state-recognized, federally regulated vocational degree (Berufsabschluss). In Germany, vocational degrees are highly respected and equivalent to levels 4 and 5 of the European Qualifications Framework, often leading to better starting salaries than generic humanities bachelor's degrees."
    },
    {
      q: "What is the 'House-Building' category and why is it recommended?",
      a: "House-building refers to skilled physical trades such as Bricklayers (Maurer), Carpenters (Zimmerer), and Tilers (Fliesenleger). Because Germany is facing a massive construction and housing deficit (400,000+ new units needed annually), these trades offer the highest stipends, have immediate fast-track visa issuance, and offer short paths to starting your own business as a Master Craftsman (Meister)."
    },
    {
      q: "What happens if I fail my final vocational exams?",
      a: "If you fail, you are legally protected. Your employer will extend your training contract, and you can retake the exams up to two times. German trade chambers (IHK/HWK) structure exams to support student success, and GTF provides tutoring resources."
    },
    {
      q: "Are there any tuition fees for Ausbildung?",
      a: "None. Ausbildung is 100% tuition-free. The system is funded by the German federal government and corporate employers. You do not pay for your education; instead, you get paid to learn."
    }
  ];

  return (
    <div className="container subpage" style={{ paddingBottom: "5rem" }}>
      
      {/* 1. HERO SECTION */}
      <AnimatedSection>
        <section className="ausbildung-hero" style={{ padding: "5rem 0 3rem", textAlign: "center" }}>
          <span style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "2.5px", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", fontWeight: "bold" }}>Vocational Pathway to Germany</span>
          <h1 style={{ fontSize: "3.2rem", fontWeight: "800", lineHeight: "1.2", margin: "1rem 0 1.5rem" }}>
            Earn <span style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))" }}>€1,000 to €1,475</span> Monthly<br />
            While Training in a Premium German Trade
          </h1>
          <p style={{ fontSize: "1.25rem", color: "var(--text)", maxWidth: "800px", margin: "0 auto 2.5rem", lineHeight: "1.6" }}>
            Zero tuition fees. Completely self-funded. 100% guaranteed job contract upon graduation. Gateway To Future is your professional Berlin-based mentor guiding you from language studies to your permanent German residency.
          </p>
          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "4rem" }}>
            <Link to="/contact" className="btn" style={{ padding: "1rem 2.2rem", fontSize: "1.1rem" }}>Book Free Strategy Call</Link>
            <a href="#categories" className="btn" style={{ padding: "1rem 2.2rem", fontSize: "1.1rem", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "none" }}>Explore 350+ Trades</a>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid-3" style={{ gap: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
            <div className="glass-card" style={{ padding: "1.5rem", textAlign: "center" }}>
              <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" }}>💶</span>
              <h3 style={{ fontSize: "1.2rem", margin: "0.25rem 0", color: "var(--text-h)" }}>No Blocked Account Needed</h3>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>Your training stipend satisfies German visa requirements completely.</p>
            </div>
            <div className="glass-card" style={{ padding: "1.5rem", textAlign: "center" }}>
              <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" }}>🏫</span>
              <h3 style={{ fontSize: "1.2rem", margin: "0.25rem 0", color: "var(--text-h)" }}>100% Tuition-Free</h3>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>Fully sponsored by German state budgets and employer companies.</p>
            </div>
            <div className="glass-card" style={{ padding: "1.5rem", textAlign: "center" }}>
              <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" }}>🛡️</span>
              <h3 style={{ fontSize: "1.2rem", margin: "0.25rem 0", color: "var(--text-h)" }}>Guaranteed Placement</h3>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>95%+ of graduates sign permanent high-salary contracts with their employers.</p>
            </div>
          </div>
        </section>
      </AnimatedSection>

      <hr style={{ border: "none", height: "1px", background: "rgba(255,255,255,0.08)", margin: "4rem 0" }} />

      {/* 2. WHAT IS AUSBILDUNG EXPLAINER */}
      <AnimatedSection>
        <section style={{ margin: "2rem 0" }}>
          <div className="grid-2" style={{ gap: "3rem", alignItems: "center" }}>
            <div style={{ textAlign: "left" }}>
              <span style={{ textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "2px", color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", fontWeight: "bold" }}>Understanding the Dual System</span>
              <h2 style={{ fontSize: "2.2rem", margin: "0.5rem 0 1.5rem", color: "var(--text-h)" }}>What is a German Ausbildung?</h2>
              <p style={{ marginBottom: "1.2rem", fontSize: "1.05rem" }}>
                An Ausbildung (dual vocational training system) is a highly respected German pathway combining work and study. Instead of sitting through years of dry university lectures, you divide your week between a real company (70% practical work) and a state vocational college (30% theoretical school).
              </p>
              <p style={{ marginBottom: "1.2rem", fontSize: "1.05rem" }}>
                You get hands-on experience, learn state-of-the-art European standards, and receive a monthly salary (stipend) that fully covers your lodging, food, and living expenses in Germany.
              </p>
              <p style={{ fontSize: "1.05rem", fontWeight: "600", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))" }}>
                For international students, it represents the most financially secure, direct path to building a professional life in Germany.
              </p>
            </div>

            {/* Comparison Matrix Table */}
            <div className="glass-card" style={{ padding: "2rem", overflowX: "auto" }}>
              <h3 style={{ fontSize: "1.3rem", marginBottom: "1.5rem", textAlign: "center", color: "var(--text-h)" }}>How Ausbildung Compares to University</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
                    <th style={{ padding: "0.8rem 0.5rem", color: "rgba(255,255,255,0.6)" }}>Feature</th>
                    <th style={{ padding: "0.8rem 0.5rem", color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))" }}>Ausbildung (Vocational)</th>
                    <th style={{ padding: "0.8rem 0.5rem", color: "rgba(255,255,255,0.8)" }}>German University</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: "0.9rem 0.5rem", fontWeight: "bold" }}>Blocked Account</td>
                    <td style={{ padding: "0.9rem 0.5rem", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))" }}>❌ None Required</td>
                    <td style={{ padding: "0.9rem 0.5rem" }}>✅ Required (€11,900/year)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: "0.9rem 0.5rem", fontWeight: "bold" }}>Monthly Stipend</td>
                    <td style={{ padding: "0.9rem 0.5rem" }}>✅ Paid (€900–€1,475)</td>
                    <td style={{ padding: "0.9rem 0.5rem" }}>❌ None (Unpaid lectures)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: "0.9rem 0.5rem", fontWeight: "bold" }}>Tuition Fees</td>
                    <td style={{ padding: "0.9rem 0.5rem" }}>✅ 100% Free</td>
                    <td style={{ padding: "0.9rem 0.5rem" }}>✅ Free (Public Universities)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: "0.9rem 0.5rem", fontWeight: "bold" }}>Post-Grad Job</td>
                    <td style={{ padding: "0.9rem 0.5rem" }}>🛡️ 95%+ Direct Placement</td>
                    <td style={{ padding: "0.9rem 0.5rem" }}>⚠️ Must hunt post-grad</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "0.9rem 0.5rem", fontWeight: "bold" }}>Language Level</td>
                    <td style={{ padding: "0.9rem 0.5rem" }}>🗣️ B1 - B2 German</td>
                    <td style={{ padding: "0.9rem 0.5rem" }}>🗣️ C1 German (or IELTS 6.5)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </AnimatedSection>

      <hr style={{ border: "none", height: "1px", background: "rgba(255,255,255,0.08)", margin: "4rem 0" }} />

      {/* 3. GTF SERVICES SECTION */}
      <AnimatedSection>
        <section style={{ margin: "2rem 0", textAlign: "center" }}>
          <span style={{ textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "2px", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", fontWeight: "bold" }}>End-to-End Assistance</span>
          <h2 style={{ fontSize: "2.4rem", margin: "0.5rem 0 1rem", color: "var(--text-h)" }}>How Gateway To Future Guarantees Success</h2>
          <p style={{ maxWidth: "700px", margin: "0 auto 3rem", color: "var(--text)" }}>
            Applying to German companies from India is highly complex. The administrative filters, language hurdles, and visa logistics block 90% of candidates. GTF acts as your on-ground mentoring sister and corporate connector.
          </p>

          <div className="grid-3" style={{ gap: "2rem", textAlign: "left" }}>
            {steps.slice(0, 6).map((s, idx) => (
              <article key={idx} className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "1.75rem", fontWeight: "800", color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))" }}>{s.num}</span>
                  <h3 style={{ fontSize: "1.25rem", margin: "0.75rem 0 0.5rem", color: "var(--text-h)" }}>{s.title}</h3>
                  <p style={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.7)" }}>{s.desc}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="glass-card" style={{ marginTop: "2rem", padding: "1.5rem 2rem", display: "flex", alignItems: "center", gap: "1.5rem", textAlign: "left", flexWrap: "wrap", justifyContent: "space-between" }}>
            <div>
              <strong style={{ color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", fontSize: "1.1rem" }}>✨ Step 7: On-Site Support</strong>
              <p style={{ fontSize: "0.95rem", margin: "0.25rem 0 0", color: "var(--text)" }}>We don't leave you after the visa. We guide you throughout your 3-year Ausbildung in Berlin and support your Meister application!</p>
            </div>
            <Link to="/contact" className="btn" style={{ padding: "0.75rem 1.5rem" }}>Learn More About Services</Link>
          </div>
        </section>
      </AnimatedSection>

      <hr style={{ border: "none", height: "1px", background: "rgba(255,255,255,0.08)", margin: "4rem 0" }} />

      {/* 4. CATEGORY OVERVIEW & 5. HOUSE-BUILDING SPOTLIGHT */}
      <AnimatedSection>
        <section id="categories" style={{ margin: "2rem 0", textAlign: "left" }}>
          <span style={{ textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "2px", color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", fontWeight: "bold" }}>Explore Vocation Fields</span>
          <h2 style={{ fontSize: "2.4rem", margin: "0.5rem 0 1rem", color: "var(--text-h)" }}>Popular Ausbildung Categories</h2>
          <p style={{ maxWidth: "800px", marginBottom: "3rem", color: "var(--text)" }}>
            Germany offers over 350 vocational programs. Here are the core sectors where GTF has verified placements, high employer demand, and specialized language support.
          </p>

          <div className="grid-3" style={{ gap: "2rem", marginBottom: "4rem" }}>
            {categories.map((cat, idx) => (
              <div 
                key={idx} 
                className="glass-card" 
                style={{ 
                  background: cat.color, 
                  borderColor: cat.borderColor,
                  display: "flex", 
                  flexDirection: "column", 
                  justifyContent: "space-between",
                  padding: "2rem"
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1.3rem", marginBottom: "0.75rem", color: "#fff" }}>{cat.title}</h3>
                  <p style={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.8)", marginBottom: "1.5rem" }}>{cat.desc}</p>
                </div>
                {cat.title.includes("House-Building") ? (
                  <a href="#construction-spotlight" className="btn" style={{ alignSelf: "flex-start", padding: "0.5rem 1.2rem", fontSize: "0.85rem" }}>View Spotlight</a>
                ) : (
                  <Link to="/courses" className="btn" style={{ alignSelf: "flex-start", padding: "0.5rem 1.2rem", fontSize: "0.85rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "none" }}>Browse Programs</Link>
                )}
              </div>
            ))}
          </div>

          {/* 5. HOUSE-BUILDING / SKILLED TRADES SPOTLIGHT BLOCK */}
          <div id="construction-spotlight" className="glass-card" style={{ 
            padding: "3rem", 
            border: "1px solid rgba(170, 59, 255, 0.4)", 
            background: "linear-gradient(135deg, rgba(15, 17, 26, 0.95), rgba(170, 59, 255, 0.08))",
            borderRadius: "2rem",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{ position: "absolute", top: "-10%", right: "-10%", fontSize: "12rem", opacity: "0.04", pointerEvents: "none" }}>🏗️</div>
            
            <div style={{ maxWidth: "900px" }}>
              <span style={{ 
                background: "linear-gradient(135deg, hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l)), hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l)))",
                padding: "0.4rem 1rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}>
                ⭐ Highly Recommended Category
              </span>
              <h2 style={{ fontSize: "2.3rem", margin: "1.5rem 0 1rem", color: "#fff" }}>House-Building & Skilled Trades (Handwerk)</h2>
              <p style={{ fontSize: "1.1rem", marginBottom: "1.5rem", color: "rgba(255,255,255,0.9)", lineHeight: "1.6" }}>
                Germany is experiencing a historical housing construction backlog. Over 400,000 apartments must be built yearly to support immigration, and there is a massive deficit of skilled craftsmen. In response, German construction guilds offer some of the <strong>highest starting stipends</strong> and <strong>easiest visa channels</strong>.
              </p>

              <div className="grid-2" style={{ gap: "2rem", marginTop: "2rem", marginBottom: "2.5rem" }}>
                <div>
                  <h4 style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", fontSize: "1.1rem", marginBottom: "0.5rem" }}>Why Choose Construction Trades?</h4>
                  <ul style={{ paddingLeft: "1.2rem", fontSize: "0.95rem", color: "rgba(255,255,255,0.8)" }}>
                    <li style={{ marginBottom: "0.5rem" }}><strong>High stipends:</strong> Earn up to €1,475/month while training.</li>
                    <li style={{ marginBottom: "0.5rem" }}><strong>Language barrier:</strong> B1 German is readily accepted for visa approval.</li>
                    <li style={{ marginBottom: "0.5rem" }}><strong>Premium Meister path:</strong> Graduate and open your own building company in Germany.</li>
                    <li style={{ marginBottom: "0.5rem" }}><strong>Active Lifestyle:</strong> Skip boring desks and build physical projects.</li>
                  </ul>
                </div>

                <div>
                  <h4 style={{ color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", fontSize: "1.1rem", marginBottom: "0.5rem" }}>Flagship Handwerk Programs</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.75rem" }}>
                    {ausbildungData.filter(p => p.category.includes("House-Building")).map((prog, idx) => (
                      <Link 
                        key={idx} 
                        to={`/ausbildung/${prog.id}`} 
                        style={{ 
                          background: "rgba(255,255,255,0.06)", 
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "0.75rem",
                          padding: "0.6rem 1rem",
                          color: "#fff",
                          textDecoration: "none",
                          fontSize: "0.9rem",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          transition: "background 0.2s, border-color 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(170, 59, 255, 0.15)";
                          e.currentTarget.style.borderColor = "rgba(170, 59, 255, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                        }}
                      >
                        <span>{prog.icon}</span>
                        <span>{prog.titleEn} ({prog.titleDe})</span>
                        <span>➡️</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <span>💡 <strong>Other Flagship Sectors:</strong></span>
                <Link to="/ausbildung/pflegefachmann" style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", textDecoration: "none", fontWeight: "600" }}>🩺 General Nursing</Link>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
                <Link to="/ausbildung/fachinformatiker" style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", textDecoration: "none", fontWeight: "600" }}>💻 IT Software Developer</Link>
              </div>

            </div>
          </div>
        </section>
      </AnimatedSection>

      <hr style={{ border: "none", height: "1px", background: "rgba(255,255,255,0.08)", margin: "4rem 0" }} />

      {/* 6. STEP-BY-STEP PROCESS */}
      <AnimatedSection>
        <section style={{ margin: "2rem 0", textAlign: "center" }}>
          <span style={{ textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "2px", color: "hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l))", fontWeight: "bold" }}>Your Roadmap to Germany</span>
          <h2 style={{ fontSize: "2.4rem", margin: "0.5rem 0 1rem", color: "var(--text-h)" }}>The 7-Step Ausbildung Journey</h2>
          <p style={{ maxWidth: "700px", margin: "0 auto 3.5rem", color: "var(--text)" }}>
            From your living room in India to your modern flat in Berlin, we coordinate every single transition point.
          </p>

          <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto", textAlign: "left" }}>
            {/* Timeline line */}
            <div style={{ position: "absolute", left: "20px", top: "0", bottom: "0", width: "2px", background: "rgba(170, 59, 255, 0.2)" }}></div>

            {steps.map((st, index) => (
              <div key={index} style={{ display: "flex", gap: "2rem", marginBottom: "2.5rem", position: "relative" }}>
                <div style={{ 
                  width: "42px", 
                  height: "42px", 
                  borderRadius: "50%", 
                  background: "linear-gradient(135deg, hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l)), hsl(var(--color-secondary-h), var(--color-secondary-s), var(--color-secondary-l)))", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  color: "#fff", 
                  fontWeight: "bold",
                  zIndex: "2",
                  boxShadow: "0 0 15px rgba(170, 59, 255, 0.5)"
                }}>
                  {index + 1}
                </div>
                <div className="glass-card" style={{ flex: "1", padding: "1.5rem" }}>
                  <h3 style={{ fontSize: "1.2rem", margin: "0 0 0.5rem 0", color: "#fff" }}>{st.title}</h3>
                  <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.75)", margin: "0" }}>{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      <hr style={{ border: "none", height: "1px", background: "rgba(255,255,255,0.08)", margin: "4rem 0" }} />

      {/* 7. HIGH-IMPACT FAQ SECTION */}
      <AnimatedSection>
        <section style={{ margin: "2rem 0", textAlign: "left" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span style={{ textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "2px", color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", fontWeight: "bold" }}>Frequently Asked Questions</span>
            <h2 style={{ fontSize: "2.4rem", margin: "0.5rem 0 0.5rem", color: "var(--text-h)" }}>Myth-Busting & Practical Logistics</h2>
            <p style={{ color: "var(--text)" }}>Get straightforward answers regarding visa rules, financials, and German requirements.</p>
          </div>

          <div style={{ maxWidth: "850px", margin: "0 auto" }}>
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="glass-card" 
                style={{ 
                  marginBottom: "1rem", 
                  padding: "1.2rem 1.8rem", 
                  cursor: "pointer",
                  borderColor: openFaq === index ? "rgba(170, 59, 255, 0.35)" : "rgba(255, 255, 255, 0.1)",
                  background: openFaq === index ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.04)"
                }}
                onClick={() => toggleFaq(index)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.1rem", margin: "0", color: "#fff", fontWeight: "600" }}>{faq.q}</h3>
                  <span style={{ fontSize: "1.2rem", color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))", transition: "transform 0.2s", transform: openFaq === index ? "rotate(180deg)" : "rotate(0)" }}>
                    ▼
                  </span>
                </div>
                {openFaq === index && (
                  <div style={{ marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
                    <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.75)", lineHeight: "1.6", margin: "0" }}>
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* FOOTER CTA */}
      <AnimatedSection>
        <section style={{ 
          marginTop: "5rem", 
          padding: "4rem 2rem", 
          textAlign: "center", 
          borderRadius: "2rem",
          background: "radial-gradient(circle at center, rgba(170, 59, 255, 0.15) 0%, rgba(0,0,0,0) 70%)",
          border: "1px solid rgba(255,255,255,0.08)"
        }}>
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#fff" }}>Ready to Plan Your Germany Career Blueprint?</h2>
          <p style={{ maxWidth: "600px", margin: "0 auto 2rem", color: "var(--text)" }}>
            We review and counsel only a limited batch of motivated candidates quarterly. Speak to our chief mentor today to check your qualifications and build a roadmap.
          </p>
          <Link to="/contact" className="btn" style={{ padding: "1rem 2.5rem", fontSize: "1.1rem" }}>Book Strategy Call Now</Link>
        </section>
      </AnimatedSection>

    </div>
  );
}
