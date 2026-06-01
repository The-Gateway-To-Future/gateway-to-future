import React from "react";
import AnimatedSection from "../components/AnimatedSection";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <section className="hero">
      <AnimatedSection>
        <h1>
          Build your <span className="highlight">German future</span>
        </h1>
        <p>
          Premium institute experience for Germany aspirants – live classes, mentorship, and visa support.
        </p>
        <div className="hero-actions">
          <motion.a
            href="/contact"
            className="btn btn-primary"
            whileHover={{ scale: 1.05 }}
          >
            Apply for mentorship
          </motion.a>
          <motion.a
            href="/courses"
            className="btn btn-secondary"
            whileHover={{ scale: 1.05 }}
          >
            Explore programs
          </motion.a>
        </div>
      </AnimatedSection>
      <div className="metrics grid-3">
        {[
          { value: "500+", label: "Students mentored" },
          { value: "A1–C1", label: "German language ecosystem" },
          { value: "4.9★", label: "Student satisfaction" },
        ].map((m, i) => (
          <AnimatedSection key={i}>
            <div className="metric">
              <strong>{m.value}</strong>
              <span>{m.label}</span>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
