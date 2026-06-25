import React, { useState, useEffect, useRef } from "react";
import AnimatedSection from "../components/AnimatedSection";

export default function CrmAgent() {
  // Simulator State
  const [sessionActive, setSessionActive] = useState(false);
  const [leadSource, setLeadSource] = useState("Instagram"); // Instagram or WhatsApp
  const [formData, setFormData] = useState({
    name: "Abhishek Rawat",
    phone: "+91-9876543210",
    email: "abhishek@gmail.com",
  });
  
  const [step, setStep] = useState(1);
  const [chatMessages, setChatMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("crm"); // crm, n8n, alerts, analytics
  const [crmRows, setCrmRows] = useState([
    {
      timestamp: "2026-06-06 09:12:45",
      name: "Priyanjali Sharma",
      phone: "+91-8765432190",
      email: "priya@gmail.com",
      source: "Instagram",
      interest: "Study Abroad 🎓",
      country: "Germany",
      timeline: "Within 3 months",
      budget: "Yes, ready",
      callTime: "Morning",
      score: "HOT",
      status: "Interested",
      notes: "Extremely motivated candidate. Prefers English taught MSc programs in Berlin.",
    },
    {
      timestamp: "2026-06-06 10:04:12",
      name: "Rohit Negi",
      phone: "+91-7654321098",
      email: "rohitnegi@yahoo.com",
      source: "WhatsApp",
      interest: "Work Abroad 💼",
      country: "Germany (Ausbildung)",
      timeline: "3–6 months",
      budget: "Needs guidance",
      callTime: "Evening",
      score: "WARM",
      status: "New",
      notes: "Nursing graduate. Interested in B1 German language course + Ausbildung placement.",
    },
    {
      timestamp: "2026-06-06 11:20:01",
      name: "Karan Johar",
      phone: "+91-9988776655",
      email: "karan@gmail.com",
      source: "Instagram",
      interest: "Career Counseling 🧭",
      country: "Canada",
      timeline: "Just exploring",
      budget: "Not yet",
      callTime: "Afternoon",
      score: "COLD",
      status: "Not Interested",
      notes: "Just exploring opportunities. Added to newsletter.",
    }
  ]);

  const [activeN8nNode, setActiveN8nNode] = useState("node-idle");
  const [currentLeadData, setCurrentLeadData] = useState({
    interest: "",
    country: "",
    timeline: "",
    budget: "",
    callTime: "",
    score: "PENDING",
  });

  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, typing]);

  // Handle n8n state lighting
  const triggerN8n = (nodeId, delay = 600) => {
    setActiveN8nNode(nodeId);
    return new Promise((resolve) => setTimeout(resolve, delay));
  };

  // Simulating Greet (Step 1)
  const startSimulation = async () => {
    setChatMessages([]);
    setStep(1);
    setSessionActive(true);
    setCurrentLeadData({
      interest: "",
      country: "",
      timeline: "",
      budget: "",
      callTime: "",
      score: "PENDING",
    });

    // n8n Webhook Glow
    await triggerN8n("node-trigger", 800);
    await triggerN8n("node-normalize", 600);
    await triggerN8n("node-duplicate", 600);
    await triggerN8n("node-sheets-append", 600);
    await triggerN8n("node-wa-greet", 800);
    setActiveN8nNode("node-ai-agent");

    // Add entry to CRM sheets initial log
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newRow = {
      timestamp,
      name: formData.name,
      phone: formData.phone,
      email: leadSource === "Instagram" ? formData.email : "N/A",
      source: leadSource,
      interest: "Pending...",
      country: "Pending...",
      timeline: "Pending...",
      budget: "Pending...",
      callTime: "Pending...",
      score: "PENDING",
      status: "New",
      notes: "Lead qualification session started.",
    };
    setCrmRows((prev) => [...prev, newRow]);

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setChatMessages([
        {
          sender: "ai",
          text: `Hi ${formData.name.split(" ")[0]} 👋 Welcome to *Gateway To Future*! We help students and professionals build careers across borders 🌍. I'm your GTF AI Assistant. May I ask a few quick questions to find the best opportunity for you?`
        }
      ]);
      setStep(2);
    }, 1000);
  };

  // Process User Response
  const handleUserReply = async (userText, dataValue, nextStepIndex) => {
    // 1. Add user message to chat
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    
    // Update local data depending on step
    let updatedLeadData = { ...currentLeadData };
    let crmUpdateField = {};

    if (step === 2) {
      updatedLeadData.interest = dataValue;
      crmUpdateField = { interest: dataValue };
    } else if (step === 3) {
      updatedLeadData.country = dataValue;
      crmUpdateField = { country: dataValue };
    } else if (step === 4) {
      updatedLeadData.timeline = dataValue;
      crmUpdateField = { timeline: dataValue };
    } else if (step === 5) {
      updatedLeadData.budget = dataValue;
      crmUpdateField = { budget: dataValue };
    } else if (step === 6) {
      updatedLeadData.callTime = dataValue;
      crmUpdateField = { callTime: dataValue };
      
      // Calculate Score at Step 6 completion
      const isHot = dataValue && updatedLeadData.timeline === "Within 3 months" && updatedLeadData.budget === "Yes, ready";
      const isCold = updatedLeadData.timeline === "Just exploring" || updatedLeadData.timeline === "6–12 months" || updatedLeadData.budget === "Not yet";
      const calculatedScore = isHot ? "HOT" : isCold ? "COLD" : "WARM";
      
      updatedLeadData.score = calculatedScore;
      crmUpdateField = { 
        callTime: dataValue,
        score: calculatedScore,
        notes: `Interest: ${updatedLeadData.interest}. Target: ${updatedLeadData.country}. Timeline: ${updatedLeadData.timeline}. Budget: ${updatedLeadData.budget}.`
      };
    }

    setCurrentLeadData(updatedLeadData);

    // Update spreadsheet row live
    setCrmRows((prev) => {
      const copy = [...prev];
      const targetIndex = copy.findIndex((r) => r.phone === formData.phone);
      if (targetIndex !== -1) {
        copy[targetIndex] = { ...copy[targetIndex], ...crmUpdateField };
      }
      return copy;
    });

    setTyping(true);
    
    // n8n Node active while AI processes
    await triggerN8n("node-ai-agent", 500);

    setTimeout(async () => {
      setTyping(false);
      let aiText = "";
      
      if (nextStepIndex === 3) {
        aiText = `Are you looking for:\n(A) Study Abroad 🎓\n(B) Work/Job Abroad 💼\n(C) Visa Assistance 🛂\n(D) Career Counseling 🧭\n\nReply with A, B, C, or D.`;
        setStep(3);
      } else if (nextStepIndex === 4) {
        aiText = `Which country are you most interested in? (e.g., Germany, Canada, UK, Australia, Dubai)`;
        setStep(4);
      } else if (nextStepIndex === 5) {
        aiText = `When are you planning to start your journey?\n(A) Within 3 months\n(B) 3–6 months\n(C) 6–12 months\n(D) Just exploring`;
        setStep(5);
      } else if (nextStepIndex === 6) {
        aiText = `Have you started looking into the investment required for your chosen path?\n(A) Yes, I have a budget ready\n(B) I need guidance on costs\n(C) Not yet`;
        setStep(6);
      } else if (nextStepIndex === 7) {
        aiText = `Perfect! What's the best time to reach you for a FREE 15-minute consultation call with our expert counselor?\n(A) Morning 9am–12pm\n(B) Afternoon 12pm–4pm\n(C) Evening 4pm–8pm`;
        setStep(7);
      } else if (nextStepIndex === 8) {
        // Conversation finished, trigger final classification flow
        await triggerN8n("node-router", 500);
        
        if (updatedLeadData.score === "HOT") {
          await triggerN8n("node-hot-notify", 800);
          aiText = `Hi ${formData.name.split(" ")[0]} 🌟 Great news! Based on your profile, you're an excellent candidate for ${updatedLeadData.interest} in ${updatedLeadData.country}.\n\nOur expert counselor has a slot available for you.\n📅 Book your FREE consultation here: https://calendly.com/gtf-admissions\n📞 Or call us: +91-7417032155\n\nWe're excited to help you *Create a Career Without Borders!* 🚀\n— Team GTF`;
        } else if (updatedLeadData.score === "WARM") {
          await triggerN8n("node-warm-drip", 800);
          aiText = `Hi ${formData.name.split(" ")[0]} 👋 This is GTF — just following up on your inquiry about ${updatedLeadData.interest}.\n\nDid you know we've helped 500+ students reach ${updatedLeadData.country} in the last 2 years? 🎓\nHere's a free guide to get you started: http://gatewaytofuture.com/guide\n\nReply anytime — we're here to help! 💬\n— Team GTF`;
        } else {
          await triggerN8n("node-cold-newsletter", 800);
          aiText = `Hi ${formData.name.split(" ")[0]}! Hope you're doing well 😊\n\nQuick update from *Gateway To Future* — we're now accepting applications for ${updatedLeadData.country} for the upcoming intake.\n\nNo pressure — just wanted to keep you in the loop! Whenever you're ready, we're here 🌍\n— Team GTF`;
        }
        
        await triggerN8n("node-sheets-update", 600);
        setActiveN8nNode("node-idle");
        setStep(8); // Finished
      }

      setChatMessages((prev) => [...prev, { sender: "ai", text: aiText }]);
    }, 1000);
  };

  const updateRowStatus = (index, newStatus) => {
    setCrmRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: newStatus };
      return copy;
    });
    console.log(`[NOTION SAVE] Lead status updated to "${newStatus}" in Notion Database.`);
  };

  return (
    <div className="container" style={{ padding: "2rem 0", color: "#fff" }}>
      {/* Styles Injection */}
      <style>{`
        /* Glow animations */
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 5px rgba(170, 59, 255, 0.4); border-color: rgba(170, 59, 255, 0.4); }
          50% { box-shadow: 0 0 20px rgba(170, 59, 255, 0.8); border-color: rgba(170, 59, 255, 0.9); }
          100% { box-shadow: 0 0 5px rgba(170, 59, 255, 0.4); border-color: rgba(170, 59, 255, 0.4); }
        }
        @keyframes activeNodeGlow {
          0% { box-shadow: 0 0 4px #22c55e; border-color: #22c55e; background: rgba(34, 197, 94, 0.2); }
          50% { box-shadow: 0 0 20px #22c55e; border-color: #4ade80; background: rgba(34, 197, 94, 0.4); }
          100% { box-shadow: 0 0 4px #22c55e; border-color: #22c55e; background: rgba(34, 197, 94, 0.2); }
        }
        .active-glow {
          animation: pulseGlow 2s infinite ease-in-out;
        }
        .node-active {
          animation: activeNodeGlow 1.5s infinite ease-in-out !important;
          border-color: #22c55e !important;
          color: #fff !important;
        }
        .tab-btn {
          padding: 0.75rem 1.5rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          font-weight: 600;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          background: hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l));
          border-color: transparent;
        }
        .tab-btn:hover {
          background: rgba(255,255,255,0.12);
        }
        .tab-btn.active:hover {
          background: hsl(var(--color-primary-h), var(--color-primary-s), calc(var(--color-primary-l) - 5%));
        }
      `}</style>

      {/* Header */}
      <AnimatedSection>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "inline-block", background: "rgba(170, 59, 255, 0.15)", border: "1px solid rgba(170, 59, 255, 0.3)", borderRadius: "9999px", padding: "0.25rem 1rem", fontSize: "0.85rem", fontWeight: "bold", color: "#c084fc", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem" }}>
            🤖 AI Agent & CRM Dashboard
          </div>
          <h1 style={{ fontSize: "3.2rem", fontWeight: "800", background: "linear-gradient(to right, #fff, #9ca3af)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0.5rem 0" }}>GTF Qualification Agent</h1>
          <p style={{ fontSize: "1.2rem", color: "var(--text)", maxWidth: "800px", margin: "0 auto" }}>
            Instantly qualify and classify international education leads from Instagram Forms and WhatsApp Business API.
          </p>
        </div>
      </AnimatedSection>

      <div className="grid-2" style={{ gap: "2rem", alignItems: "stretch", display: "grid", gridTemplateColumns: "1fr 1.5fr" }}>
        
        {/* WhatsApp Phone Mockup Panel */}
        <AnimatedSection>
          <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "2rem", background: "rgba(22, 23, 29, 0.8)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            {/* Phone Header */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#128C7E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.1rem" }}>💬</div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: "bold", fontSize: "0.95rem" }}>Gateway To Future</div>
                    <span style={{ fontSize: "0.75rem", color: "#22c55e", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <span style={{ width: "6px", height: "6px", background: "#22c55e", borderRadius: "50%" }}></span> Online Agent
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: "0.8rem", background: "rgba(255,255,255,0.08)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", color: "#9ca3af" }}>WhatsApp API</span>
              </div>

              {/* Lead Setup Fields if simulation not active */}
              {!sessionActive ? (
                <div style={{ textAlign: "left", padding: "1.5rem 0" }}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>🔑 1. Setup Incoming Lead</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Lead Source</label>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                        <button onClick={() => setLeadSource("Instagram")} style={{ flex: 1, padding: "0.5rem", borderRadius: "0.25rem", border: "1px solid", borderColor: leadSource === "Instagram" ? "#aa3bff" : "rgba(255,255,255,0.15)", background: leadSource === "Instagram" ? "rgba(170, 59, 255, 0.2)" : "transparent", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>📸 Instagram Ads</button>
                        <button onClick={() => setLeadSource("WhatsApp")} style={{ flex: 1, padding: "0.5rem", borderRadius: "0.25rem", border: "1px solid", borderColor: leadSource === "WhatsApp" ? "#aa3bff" : "rgba(255,255,255,0.15)", background: leadSource === "WhatsApp" ? "rgba(170, 59, 255, 0.2)" : "transparent", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>🟢 WhatsApp Inbound</button>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Full Name</label>
                      <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: "100%", padding: "0.5rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.25rem", color: "#fff", outline: "none", marginTop: "0.25rem" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Phone (WhatsApp)</label>
                      <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: "100%", padding: "0.5rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.25rem", color: "#fff", outline: "none", marginTop: "0.25rem" }} />
                    </div>
                    {leadSource === "Instagram" && (
                      <div>
                        <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Email Address</label>
                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: "100%", padding: "0.5rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.25rem", color: "#fff", outline: "none", marginTop: "0.25rem" }} />
                      </div>
                    )}
                  </div>
                  <button onClick={startSimulation} className="btn active-glow" style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}>
                    🚀 Simulate Webhook Inflow
                  </button>
                </div>
              ) : (
                /* Chat Message Logs */
                <div style={{ height: "350px", overflowY: "auto", background: "rgba(0,0,0,0.2)", borderRadius: "1rem", padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: msg.sender === "ai" ? "flex-start" : "flex-end" }}>
                      <div style={{ maxWidth: "85%", padding: "0.75rem 1rem", borderRadius: "1rem", borderTopLeftRadius: msg.sender === "ai" ? "0" : "1rem", borderTopRightRadius: msg.sender === "user" ? "0" : "1rem", background: msg.sender === "ai" ? "rgba(255,255,255,0.1)" : "#128C7E", color: "#fff", fontSize: "0.9rem", textAlign: "left", whiteSpace: "pre-wrap", border: msg.sender === "ai" ? "1px solid rgba(255,255,255,0.15)" : "none" }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  
                  {typing && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ padding: "0.75rem 1rem", borderRadius: "1rem", borderTopLeftRadius: "0", background: "rgba(255,255,255,0.1)", color: "#9ca3af", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <span style={{ fontSize: "0.8rem" }}>typing</span>
                        <span className="dot" style={{ animation: "pulse 1.4s infinite", animationDelay: "0s" }}>.</span>
                        <span className="dot" style={{ animation: "pulse 1.4s infinite", animationDelay: "0.2s" }}>.</span>
                        <span className="dot" style={{ animation: "pulse 1.4s infinite", animationDelay: "0.4s" }}>.</span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef}></div>
                </div>
              )}
            </div>

            {/* Conversation Flow Control Buttons */}
            {sessionActive && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem", marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Conversation Flow Step {step}/7</span>
                  {step === 8 && (
                    <button onClick={() => setSessionActive(false)} style={{ background: "transparent", border: "none", color: "#c084fc", fontSize: "0.8rem", cursor: "pointer", fontWeight: "bold" }}>🔄 Reset Simulator</button>
                  )}
                </div>

                {/* Step 2 Buttons: Greet Response */}
                {step === 2 && !typing && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <button onClick={() => handleUserReply("Yes, please!", "Yes", 3)} className="btn" style={{ fontSize: "0.85rem", padding: "0.6rem" }}>"Yes, please! May I ask?"</button>
                    <button onClick={() => handleUserReply("Sure, let's start.", "Yes", 3)} className="btn" style={{ fontSize: "0.85rem", padding: "0.6rem", background: "rgba(255,255,255,0.15)" }}>"Sure, let's start."</button>
                  </div>
                )}

                {/* Step 3 Buttons: Service Goal */}
                {step === 3 && !typing && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <button onClick={() => handleUserReply("A) Study Abroad 🎓", "Study Abroad 🎓", 4)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>A) Study Abroad 🎓</button>
                    <button onClick={() => handleUserReply("B) Work/Job Abroad 💼", "Work Abroad 💼", 4)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>B) Work/Job Abroad 💼</button>
                    <button onClick={() => handleUserReply("C) Visa Assistance 🛂", "Visa Assistance 🛂", 4)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>C) Visa Assistance 🛂</button>
                    <button onClick={() => handleUserReply("D) Career Counseling 🧭", "Career Counseling 🧭", 4)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>D) Career Counseling 🧭</button>
                  </div>
                )}

                {/* Step 4 Buttons: Destination */}
                {step === 4 && !typing && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                    <button onClick={() => handleUserReply("Germany", "Germany", 5)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>Germany 🇩🇪</button>
                    <button onClick={() => handleUserReply("Canada", "Canada", 5)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>Canada 🇨🇦</button>
                    <button onClick={() => handleUserReply("UK", "UK", 5)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>UK 🇬🇧</button>
                    <button onClick={() => handleUserReply("Australia", "Australia", 5)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>Australia 🇦🇺</button>
                    <button onClick={() => handleUserReply("Dubai", "Dubai", 5)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>Dubai 🇦🇪</button>
                    <button onClick={() => handleUserReply("USA", "USA", 5)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>USA 🇺🇸</button>
                  </div>
                )}

                {/* Step 5 Buttons: Timeline */}
                {step === 5 && !typing && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <button onClick={() => handleUserReply("A) Within 3 months", "Within 3 months", 6)} className="btn" style={{ fontSize: "0.85rem", padding: "0.6rem" }}>A) Within 3 months (HOT criteria)</button>
                    <button onClick={() => handleUserReply("B) 3–6 months", "3–6 months", 6)} className="btn" style={{ fontSize: "0.85rem", padding: "0.6rem", background: "rgba(255,255,255,0.15)" }}>B) 3–6 months (WARM criteria)</button>
                    <button onClick={() => handleUserReply("C) 6–12 months", "6–12 months", 6)} className="btn" style={{ fontSize: "0.85rem", padding: "0.6rem", background: "rgba(255,255,255,0.15)" }}>C) 6–12 months (COLD criteria)</button>
                    <button onClick={() => handleUserReply("D) Just exploring", "Just exploring", 6)} className="btn" style={{ fontSize: "0.85rem", padding: "0.6rem", background: "rgba(255,255,255,0.15)" }}>D) Just exploring (COLD criteria)</button>
                  </div>
                )}

                {/* Step 6 Buttons: Budget */}
                {step === 6 && !typing && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <button onClick={() => handleUserReply("A) Yes, I have a budget ready", "Yes, ready", 7)} className="btn" style={{ fontSize: "0.85rem", padding: "0.6rem" }}>A) Yes, I have a budget ready (HOT criteria)</button>
                    <button onClick={() => handleUserReply("B) I need guidance on costs", "Needs guidance", 7)} className="btn" style={{ fontSize: "0.85rem", padding: "0.6rem", background: "rgba(255,255,255,0.15)" }}>B) I need guidance on costs</button>
                    <button onClick={() => handleUserReply("C) Not yet", "Not yet", 7)} className="btn" style={{ fontSize: "0.85rem", padding: "0.6rem", background: "rgba(255,255,255,0.15)" }}>C) Not yet</button>
                  </div>
                )}

                {/* Step 7 Buttons: Call Time */}
                {step === 7 && !typing && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                    <button onClick={() => handleUserReply("A) Morning 9am–12pm", "Morning", 8)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>A) Morning</button>
                    <button onClick={() => handleUserReply("B) Afternoon 12pm–4pm", "Afternoon", 8)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>B) Afternoon</button>
                    <button onClick={() => handleUserReply("C) Evening 4pm–8pm", "Evening", 8)} className="btn" style={{ fontSize: "0.8rem", padding: "0.6rem" }}>C) Evening</button>
                  </div>
                )}

                {step === 8 && (
                  <div style={{ textAlign: "center", padding: "0.5rem", background: "rgba(34,197,94,0.15)", borderRadius: "0.5rem", border: "1px solid rgba(34,197,94,0.3)" }}>
                    <span style={{ fontSize: "0.95rem", color: "#4ade80", fontWeight: "bold" }}>
                      ✅ Lead Qualified as {currentLeadData.score}!
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </AnimatedSection>

        {/* Dashboard Tabs Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Tab Selection */}
          <AnimatedSection>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button onClick={() => setActiveTab("crm")} className={`tab-btn ${activeTab === "crm" ? "active" : ""}`}>📊 Google Sheet CRM</button>
              <button onClick={() => setActiveTab("n8n")} className={`tab-btn ${activeTab === "n8n" ? "active" : ""}`}>⚙️ n8n Workflow</button>
              <button onClick={() => setActiveTab("alerts")} className={`tab-btn ${activeTab === "alerts" ? "active" : ""}`}>🔔 Alerts & Drips</button>
              <button onClick={() => setActiveTab("analytics")} className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}>📈 Lead Analytics</button>
            </div>
          </AnimatedSection>

          {/* Tab 1 Content: Google Sheet CRM Log */}
          {activeTab === "crm" && (
            <AnimatedSection>
              <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", overflowX: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    🟢 Google Sheets CRM Log
                  </h3>
                  <span style={{ fontSize: "0.75rem", background: "rgba(34, 197, 94, 0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}>Live Synced</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.15)", color: "#9ca3af" }}>
                      <th style={{ padding: "0.5rem" }}>Timestamp</th>
                      <th style={{ padding: "0.5rem" }}>Full Name</th>
                      <th style={{ padding: "0.5rem" }}>Phone</th>
                      <th style={{ padding: "0.5rem" }}>Source</th>
                      <th style={{ padding: "0.5rem" }}>Interest</th>
                      <th style={{ padding: "0.5rem" }}>Country</th>
                      <th style={{ padding: "0.5rem" }}>Timeline</th>
                      <th style={{ padding: "0.5rem" }}>Budget</th>
                      <th style={{ padding: "0.5rem" }}>Lead Score</th>
                      <th style={{ padding: "0.5rem" }}>Lead Status (Notation)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crmRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: row.phone === formData.phone ? "rgba(170,59,255,0.1)" : "transparent" }}>
                        <td style={{ padding: "0.5rem", color: "#9ca3af" }}>{row.timestamp.split(" ")[1] || row.timestamp}</td>
                        <td style={{ padding: "0.5rem", fontWeight: "bold" }}>{row.name}</td>
                        <td style={{ padding: "0.5rem" }}>{row.phone}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <span style={{ padding: "0.1rem 0.4rem", borderRadius: "0.25rem", background: row.source === "Instagram" ? "rgba(219,39,119,0.15)" : "rgba(34,197,94,0.15)", color: row.source === "Instagram" ? "#f472b6" : "#4ade80" }}>{row.source}</span>
                        </td>
                        <td style={{ padding: "0.5rem" }}>{row.interest}</td>
                        <td style={{ padding: "0.5rem" }}>{row.country}</td>
                        <td style={{ padding: "0.5rem" }}>{row.timeline}</td>
                        <td style={{ padding: "0.5rem" }}>{row.budget}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <span style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.25rem",
                            fontWeight: "bold",
                            background: row.score === "HOT" ? "rgba(239,68,68,0.2)" : row.score === "WARM" ? "rgba(234,179,8,0.2)" : row.score === "COLD" ? "rgba(107,114,128,0.2)" : "rgba(255,255,255,0.08)",
                            color: row.score === "HOT" ? "#ef4444" : row.score === "WARM" ? "#eab308" : row.score === "COLD" ? "#9ca3af" : "#fff"
                          }}>{row.score}</span>
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          <select
                            value={row.status}
                            onChange={(e) => updateRowStatus(idx, e.target.value)}
                            style={{
                              padding: "0.25rem",
                              background: "rgba(255,255,255,0.15)",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: "0.25rem",
                              color: "#fff",
                              outline: "none",
                              fontSize: "0.75rem",
                              fontWeight: "bold"
                            }}
                          >
                            <option value="New" style={{ background: "var(--bg-dark)" }}>New 🆕</option>
                            <option value="Old" style={{ background: "var(--bg-dark)" }}>Old ⏳</option>
                            <option value="Interested" style={{ background: "var(--bg-dark)" }}>Interested 👍</option>
                            <option value="Not Interested" style={{ background: "var(--bg-dark)" }}>Not Interested 👎</option>
                            <option value="Scam" style={{ background: "var(--bg-dark)", color: "#ef4444" }}>Scam 🚫</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimatedSection>
          )}

          {/* Tab 2 Content: n8n Flow Visualization */}
          {activeTab === "n8n" && (
            <AnimatedSection>
              <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1.5rem" }}>⚙️ n8n Automation Engine Workflow</h3>
                
                {/* Node Grid Graphic */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    {/* Node 1 */}
                    <div id="node-trigger" className={`glass-card ${activeN8nNode === "node-trigger" ? "node-active" : ""}`} style={{ flex: 1, minWidth: "160px", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>NODE 1 — TRIGGER</div>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginTop: "0.25rem" }}>Webhook Inflow</strong>
                      <span style={{ fontSize: "0.65rem", color: "#aa3bff" }}>Meta Cloud API / n8n</span>
                    </div>

                    {/* Node 2 */}
                    <div id="node-normalize" className={`glass-card ${activeN8nNode === "node-normalize" ? "node-active" : ""}`} style={{ flex: 1, minWidth: "160px", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>NODE 2 — FUNCTION</div>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginTop: "0.25rem" }}>Normalize Leads</strong>
                      <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>JavaScript Data Clean</span>
                    </div>

                    {/* Node 3 */}
                    <div id="node-duplicate" className={`glass-card ${activeN8nNode === "node-duplicate" ? "node-active" : ""}`} style={{ flex: 1, minWidth: "160px", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>NODE 3 — CHECK</div>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginTop: "0.25rem" }}>Check Duplicate</strong>
                      <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>Google Sheets CRM Search</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    {/* Node 4 */}
                    <div id="node-sheets-append" className={`glass-card ${activeN8nNode === "node-sheets-append" ? "node-active" : ""}`} style={{ flex: 1, minWidth: "160px", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>NODE 4 — LOG</div>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginTop: "0.25rem" }}>Log CRM Row</strong>
                      <span style={{ fontSize: "0.65rem", color: "#22c55e" }}>Google Sheets Insert</span>
                    </div>

                    {/* Node 5 */}
                    <div id="node-wa-greet" className={`glass-card ${activeN8nNode === "node-wa-greet" ? "node-active" : ""}`} style={{ flex: 1, minWidth: "160px", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>NODE 5 — WHATSAPP</div>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginTop: "0.25rem" }}>Send Greeting</strong>
                      <span style={{ fontSize: "0.65rem", color: "#128C7E" }}>WhatsApp Business Out</span>
                    </div>

                    {/* Node 6 */}
                    <div id="node-ai-agent" className={`glass-card ${activeN8nNode === "node-ai-agent" ? "node-active" : ""}`} style={{ flex: 1, minWidth: "160px", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>NODE 6 — CORE AI</div>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginTop: "0.25rem" }}>OpenAI / Gemini Agent</strong>
                      <span style={{ fontSize: "0.65rem", color: "#c084fc" }}>Active Conversation Engine</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    {/* Node 7 */}
                    <div id="node-router" className={`glass-card ${activeN8nNode === "node-router" ? "node-active" : ""}`} style={{ flex: 1, minWidth: "160px", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>NODE 7 — ROUTER</div>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginTop: "0.25rem" }}>Lead Classifier</strong>
                      <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>IF: Score Classifier</span>
                    </div>

                    {/* Node 8A */}
                    <div id="node-hot-notify" className={`glass-card ${activeN8nNode === "node-hot-notify" ? "node-active" : ""}`} style={{ flex: 1, minWidth: "160px", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#ef4444" }}>BRANCH 8A — HOT</div>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginTop: "0.25rem" }}>Notify Team & Book</strong>
                      <span style={{ fontSize: "0.65rem", color: "#ef4444" }}>Calendly + Gmail SMTP</span>
                    </div>

                    {/* Node 8B */}
                    <div id="node-warm-drip" className={`glass-card ${activeN8nNode === "node-warm-drip" ? "node-active" : ""}`} style={{ flex: 1, minWidth: "160px", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#eab308" }}>BRANCH 8B — WARM</div>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginTop: "0.25rem" }}>Drip Sequence</strong>
                      <span style={{ fontSize: "0.65rem", color: "#eab308" }}>WhatsApp 5-day flow</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    {/* Node 8C */}
                    <div id="node-cold-newsletter" className={`glass-card ${activeN8nNode === "node-cold-newsletter" ? "node-active" : ""}`} style={{ flex: 1, minWidth: "160px", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>BRANCH 8C — COLD</div>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginTop: "0.25rem" }}>Tag Newsletter</strong>
                      <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>Cold marketing list</span>
                    </div>

                    {/* Node 9 */}
                    <div id="node-sheets-update" className={`glass-card ${activeN8nNode === "node-sheets-update" ? "node-active" : ""}`} style={{ flex: 2, minWidth: "300px", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>NODE 9 — CRM RECONCILE</div>
                      <strong style={{ fontSize: "0.85rem", display: "block", marginTop: "0.25rem" }}>Update Spreadsheet Rows</strong>
                      <span style={{ fontSize: "0.65rem", color: "#22c55e" }}>Reconcile score, parameters, & AI summary</span>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          )}

          {/* Tab 3 Content: Team Alerts and Drips */}
          {activeTab === "alerts" && (
            <AnimatedSection>
              <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "1.5rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#ef4444", marginBottom: "1rem" }}>🔥 HOT Lead Internal Team Alert</h3>
                    <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem", color: "#fca5a5", lineHeight: "1.4" }}>
                      🔥 NEW HOT LEAD — GTF<br />
                      Name: {currentLeadData.score === "HOT" ? formData.name : "[Lead Name]"}<br />
                      Phone: {currentLeadData.score === "HOT" ? formData.phone : "[Lead Phone]"}<br />
                      Interest: {currentLeadData.score === "HOT" ? currentLeadData.interest : "[Service]"} ➔ {currentLeadData.score === "HOT" ? currentLeadData.country : "[Country]"}<br />
                      Timeline: {currentLeadData.score === "HOT" ? currentLeadData.timeline : "[Within 3 months]"}<br />
                      Budget: Ready<br />
                      Preferred Call: {currentLeadData.score === "HOT" ? currentLeadData.callTime : "[Call Time]"}<br />
                      Source: {leadSource}<br />
                      ➔ ACTION REQUIRED: Call within 2 hours for best conversion.
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "#9ca3af", display: "block", marginTop: "0.5rem" }}>Automatically dispatched via Gmail SMTP to counsel@gatewaytofuture.com.</span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#eab308", marginBottom: "1rem" }}>🔁 WARM Lead 5-Day WhatsApp Drip Sequence</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.75rem" }}>
                      <div style={{ padding: "0.75rem", background: "rgba(255,255,255,0.04)", borderRadius: "0.5rem", borderLeft: "3px solid #eab308" }}>
                        <strong>Day 1 Follow-up:</strong>
                        <p style={{ color: "#9ca3af", marginTop: "0.25rem" }}>
                          "Hi {formData.name.split(" ")[0]} 👋 Just following up on your inquiry about {currentLeadData.interest || "[Service]"}. Did you know we've helped 500+ students reach Germany in 2 years? Here is your free guide..."
                        </p>
                      </div>
                      <div style={{ padding: "0.75rem", background: "rgba(255,255,255,0.04)", borderRadius: "0.5rem", borderLeft: "3px solid #eab308" }}>
                        <strong>Day 3 Social Proof:</strong>
                        <p style={{ color: "#9ca3af", marginTop: "0.25rem" }}>
                          "Hi {formData.name.split(" ")[0]}, studying/working in Germany can feel overwhelming—but it doesn't have to be! We handle admissions, visa, block account setup & job support. Reply YES to see success stories!"
                        </p>
                      </div>
                      <div style={{ padding: "0.75rem", background: "rgba(255,255,255,0.04)", borderRadius: "0.5rem", borderLeft: "3px solid #eab308" }}>
                        <strong>Day 5 Last Offer:</strong>
                        <p style={{ color: "#9ca3af", marginTop: "0.25rem" }}>
                          "Hi {formData.name.split(" ")[0]} 🌟 Last message for now! We have limited free consultation slots this week. Reply BOOK to claim yours at your convenience. Let's build your future!"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          )}

          {/* Tab 4 Content: Lead Analytics */}
          {activeTab === "analytics" && (
            <AnimatedSection>
              <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1.25rem" }}>📊 Lead Flow Performance Analytics</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
                  <div style={{ padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase" }}>Total Leads</div>
                    <strong style={{ fontSize: "2rem", display: "block", margin: "0.25rem 0", color: "#fff" }}>{crmRows.length}</strong>
                    <span style={{ fontSize: "0.65rem", color: "#22c55e" }}>📈 Live simulated</span>
                  </div>
                  
                  <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.08)", borderRadius: "0.75rem", border: "1px solid rgba(239, 68, 68, 0.2)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "#ef4444", textTransform: "uppercase" }}>🔥 Hot Leads</div>
                    <strong style={{ fontSize: "2rem", display: "block", margin: "0.25rem 0", color: "#ef4444" }}>{crmRows.filter(r => r.score === "HOT").length}</strong>
                    <span style={{ fontSize: "0.65rem", color: "#fca5a5" }}>⚡ Response &lt; 2h</span>
                  </div>

                  <div style={{ padding: "1rem", background: "rgba(234, 179, 8, 0.08)", borderRadius: "0.75rem", border: "1px solid rgba(234, 179, 8, 0.2)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "#eab308", textTransform: "uppercase" }}>🔁 Warm Leads</div>
                    <strong style={{ fontSize: "2rem", display: "block", margin: "0.25rem 0", color: "#eab308" }}>{crmRows.filter(r => r.score === "WARM").length}</strong>
                    <span style={{ fontSize: "0.65rem", color: "#fef08a" }}>🧪 Drip Active</span>
                  </div>

                  <div style={{ padding: "1rem", background: "rgba(107, 114, 128, 0.08)", borderRadius: "0.75rem", border: "1px solid rgba(107, 114, 128, 0.2)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase" }}>❄️ Cold Leads</div>
                    <strong style={{ fontSize: "2rem", display: "block", margin: "0.25rem 0", color: "#9ca3af" }}>{crmRows.filter(r => r.score === "COLD").length}</strong>
                    <span style={{ fontSize: "0.65rem", color: "#d1d5db" }}>✉️ Newsletter</span>
                  </div>
                </div>

                <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(170, 59, 255, 0.05)", border: "1px solid rgba(170, 59, 255, 0.15)", borderRadius: "0.75rem" }}>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#c084fc", marginBottom: "0.5rem" }}>💡 System Optimization Note</h4>
                  <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    Hot lead conversion rates increase by <strong>340%</strong> when contacting them within 2 hours of qualification. Ensure n8n Gmail notifications trigger immediate mobile alerts via email-to-SMS gateways or team Slack channels.
                  </p>
                </div>
              </div>
            </AnimatedSection>
          )}

          {/* Quick Setup Checklist */}
          <AnimatedSection>
            <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>📋 GTF Quick Setup Checklist</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.8rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input type="checkbox" defaultChecked disabled />
                    <span>Create Meta Developer App (WhatsApp + Ads)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input type="checkbox" defaultChecked disabled />
                    <span>Set up n8n instance (self-hosted / cloud)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input type="checkbox" defaultChecked disabled />
                    <span>Create Google Sheet CRM (13 columns)</span>
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input type="checkbox" defaultChecked disabled />
                    <span>Hook Facebook Lead Ads node to n8n</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input type="checkbox" defaultChecked disabled />
                    <span>Connect WhatsApp API webhook & OpenAI</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input type="checkbox" defaultChecked disabled />
                    <span>Test and activate end-to-end automation</span>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>

      </div>
    </div>
  );
}
