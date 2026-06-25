import React, { useState } from "react";
import AnimatedSection from "../components/AnimatedSection";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    interest: "A",
    country: "Germany",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    // In a real application, this would send lead data to the backend API or n8n webhook
  };

  return (
    <div className="container subpage" style={{ paddingBottom: "3rem" }}>
      <AnimatedSection>
        <section className="page-header" style={{ padding: "4rem 0 2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: "700" }}>Book a <span style={{ color: "hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l))" }}>Strategy Call</span></h1>
          <p style={{ fontSize: "1.2rem", color: "var(--text)" }}>Get a FREE 15-minute consultation with our career counselor.</p>
        </section>
      </AnimatedSection>

      <section style={{ maxWidth: "600px", margin: "2rem auto 0" }}>
        <AnimatedSection>
          <div className="glass-card" style={{ padding: "2.5rem", borderRadius: "1.5rem" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <span style={{ fontSize: "4rem" }}>🎉</span>
                <h2 style={{ margin: "1.5rem 0 0.5rem", fontSize: "1.8rem" }}>Thank You!</h2>
                <p style={{ fontSize: "1.05rem" }}>Our counselor will reach out to you on WhatsApp within 2 hours to confirm your booking.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "left" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="name" style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Full Name</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "inherit", outline: "none", fontSize: "1rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="phone" style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Phone Number (WhatsApp)</label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="+91-XXXXXXXXXX"
                    style={{ padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "inherit", outline: "none", fontSize: "1rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="email" style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    style={{ padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "inherit", outline: "none", fontSize: "1rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="interest" style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Primary Goal</label>
                  <select
                    id="interest"
                    value={formData.interest}
                    onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                    style={{ padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.2)", color: "inherit", outline: "none", fontSize: "1rem" }}
                  >
                    <option value="A" style={{ background: "var(--bg-dark)" }}>Study Abroad 🎓</option>
                    <option value="B" style={{ background: "var(--bg-dark)" }}>Work/Job Abroad 💼</option>
                    <option value="C" style={{ background: "var(--bg-dark)" }}>Visa Assistance 🛂</option>
                    <option value="D" style={{ background: "var(--bg-dark)" }}>Career Counseling 🧭</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="country" style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Preferred Country</label>
                  <input
                    type="text"
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    style={{ padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "inherit", outline: "none", fontSize: "1rem" }}
                  />
                </div>

                <button type="submit" className="btn" style={{ marginTop: "1rem", fontSize: "1.1rem", padding: "1rem" }}>Submit Request</button>
              </form>
            )}
          </div>
        </AnimatedSection>
      </section>
    </div>
  );
}
