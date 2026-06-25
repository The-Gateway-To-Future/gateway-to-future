import React, { useState } from "react";
import AnimatedSection from "../components/AnimatedSection";

export default function CallCenter() {
  const [chatLog, setChatLog] = useState(
    `[06/06/2026, 10:15:30] Amit Rawat: Hello, I am Amit Rawat from Haridwar. I saw your Instagram ad about Nursing Ausbildung in Germany.
[06/06/2026, 10:16:02] GTF Agent: Hi Amit! Welcome to Gateway To Future. We have B1 nursing Ausbildung slots open. May I get your contact details and timeline?
[06/06/2026, 10:16:45] Amit Rawat: Yes, my phone number is +91-9922883344. I want to start within 2 months, by August.
[06/06/2026, 10:17:15] GTF Agent: Perfect, I will log your profile.
---
Instagram Chat - Lead ID: insta_99214
User: Neha Bisht
Message: Interested in MSc Study Abroad in UK. Email: neha.bisht@gmail.com. Contact: +91-8877665544. Timeline: 3 months.`
  );

  const [extractedLeads, setExtractedLeads] = useState([
    {
      id: 1,
      name: "Saurabh Negi",
      phone: "+91-9876543211",
      email: "saurabh@gmail.com",
      goal: "Study Abroad",
      country: "Canada",
      timeline: "3–6 months",
      agent: "Unassigned",
      forwarded: false,
      status: "New"
    },
    {
      id: 2,
      name: "Kiran Joshi",
      phone: "+91-8765432112",
      email: "kiran.j@yahoo.com",
      goal: "Work Abroad",
      country: "Germany (Ausbildung)",
      timeline: "Within 3 months",
      agent: "Priya Sharma",
      forwarded: true,
      status: "Interested"
    }
  ]);

  const [agents, setAgents] = useState([
    { name: "Rahul Verma", phone: "+91-9988770011", status: "Online", activeLeads: 4 },
    { name: "Priya Sharma", phone: "+91-8877661122", status: "Online", activeLeads: 6 },
    { name: "Amit Bisht", phone: "+91-7766552233", status: "Busy", activeLeads: 8 },
    { name: "Siddhi Rawat", phone: "+91-6655443322", status: "Offline", activeLeads: 0 }
  ]);

  const [newAgent, setNewAgent] = useState({ name: "", phone: "" });
  const [selectedForwardLead, setSelectedForwardLead] = useState(null);
  const [forwardingPayload, setForwardingPayload] = useState("");

  // Simple RegEx parser for Chat Logs
  const parseChatLog = () => {
    const lines = chatLog.split("\n");
    const foundLeads = [];
    
    // We search the text for names, phone numbers, emails, countries, and goals
    // Custom logic to scan blocks of text
    const textBlocks = chatLog.split("---");
    
    textBlocks.forEach((block, idx) => {
      // Find Phone Number
      const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\d{10}/;
      const phoneMatch = block.match(phoneRegex);
      const phone = phoneMatch ? phoneMatch[0].trim() : "+91-XXXXXXXXXX";

      // Find Email
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const emailMatch = block.match(emailRegex);
      const email = emailMatch ? emailMatch[0].trim() : "N/A";

      // Find Name
      let name = "Unknown Lead";
      if (block.includes("Amit Rawat")) {
        name = "Amit Rawat";
      } else if (block.includes("Neha Bisht")) {
        name = "Neha Bisht";
      } else {
        // Fallback: look for "I am [Name]" or "Name: [Name]"
        const nameMatch = block.match(/(?:I am|name is|User:)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
        if (nameMatch) name = nameMatch[1].trim();
      }

      // Find Country
      let country = "Germany";
      if (block.toLowerCase().includes("uk") || block.toLowerCase().includes("united kingdom")) country = "UK";
      else if (block.toLowerCase().includes("canada")) country = "Canada";
      else if (block.toLowerCase().includes("dubai")) country = "Dubai";
      else if (block.toLowerCase().includes("australia")) country = "Australia";

      // Find Goal
      let goal = "Study Abroad";
      if (block.toLowerCase().includes("ausbildung") || block.toLowerCase().includes("work")) goal = "Work Abroad (Ausbildung)";
      else if (block.toLowerCase().includes("visa")) goal = "Visa Assistance";
      else if (block.toLowerCase().includes("counseling")) goal = "Career Counseling";

      // Timeline
      let timeline = "Within 3 months";
      if (block.toLowerCase().includes("3-6 months") || block.toLowerCase().includes("3–6")) timeline = "3–6 months";
      else if (block.toLowerCase().includes("exploring")) timeline = "Exploring";

      if (phoneMatch || emailMatch) {
        foundLeads.push({
          id: Date.now() + idx,
          name,
          phone,
          email,
          goal,
          country,
          timeline,
          agent: "Unassigned",
          forwarded: false,
          status: "New"
        });
      }
    });

    if (foundLeads.length > 0) {
      setExtractedLeads((prev) => {
        // filter duplicates by phone
        const existingPhones = prev.map(l => l.phone);
        const filteredNew = foundLeads.filter(l => !existingPhones.includes(l.phone));
        return [...prev, ...filteredNew];
      });
      alert(`🎉 Successfully extracted ${foundLeads.length} leads from chat logs!`);
    } else {
      alert("⚠️ No phone numbers or lead indicators found in the chat log.");
    }
  };

  // Handle lead forwarding
  const forwardLeadToAgent = (lead, agentName) => {
    const targetAgent = agents.find(a => a.name === agentName);
    if (!targetAgent) return;

    // Simulate WhatsApp API Payload
    const textMessage = `🔥 *NEW LEAD ASSIGNED — GTF CALL CENTER*\n\n👤 *Name:* ${lead.name}\n📞 *Phone:* ${lead.phone}\n📧 *Email:* ${lead.email}\n🎯 *Goal:* ${lead.goal}\n🌍 *Target:* ${lead.country}\n⏳ *Timeline:* ${lead.timeline}\n\n👉 Please call this client within 2 hours. Update follow-up status in Notion.`;
    
    const payload = {
      messaging_product: "whatsapp",
      to: targetAgent.phone.replace(/[-+]/g, ""),
      type: "text",
      text: { body: textMessage }
    };

    setForwardingPayload(JSON.stringify(payload, null, 2));
    setSelectedForwardLead({ lead, agent: targetAgent });

    // Update Lead state
    setExtractedLeads(prev => prev.map(l => {
      if (l.id === lead.id) {
        return { ...l, agent: agentName, forwarded: true };
      }
      return l;
    }));

    // Update Agent active lead counter
    setAgents(prev => prev.map(a => {
      if (a.name === agentName) {
        return { ...a, activeLeads: a.activeLeads + 1 };
      }
      return a;
    }));
  };

  const handleAddAgent = (e) => {
    e.preventDefault();
    if (!newAgent.name || !newAgent.phone) return;
    setAgents((prev) => [
      ...prev,
      { name: newAgent.name, phone: newAgent.phone, status: "Online", activeLeads: 0 }
    ]);
    setNewAgent({ name: "", phone: "" });
  };

  const updateLeadStatus = (leadId, newStatus) => {
    setExtractedLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        console.log(`[NOTION SAVE] Lead status updated to "${newStatus}" in Notion Database for ${l.name}.`);
        return { ...l, status: newStatus };
      }
      return l;
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Interested": return "#22c55e";
      case "Not Interested": return "#ef4444";
      case "Scam": return "#eab308";
      case "Old": return "#9ca3af";
      case "New":
      default: return "#60a5fa";
    }
  };

  return (
    <div className="container" style={{ padding: "2rem 0", color: "#fff" }}>
      {/* Header */}
      <AnimatedSection>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "inline-block", background: "rgba(170, 59, 255, 0.15)", border: "1px solid rgba(170, 59, 255, 0.3)", borderRadius: "9999px", padding: "0.25rem 1rem", fontSize: "0.85rem", fontWeight: "bold", color: "#c084fc", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem" }}>
            📞 Lead Router & Call Center Console
          </div>
          <h1 style={{ fontSize: "3.2rem", fontWeight: "800", background: "linear-gradient(to right, #fff, #9ca3af)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0.5rem 0" }}>GTF Call Agent Manager</h1>
          <p style={{ fontSize: "1.2rem", color: "var(--text)", maxWidth: "800px", margin: "0 auto" }}>
            Extract client details from WhatsApp/Instagram chat backups and instantly forward leads to your active call center agents.
          </p>
        </div>
      </AnimatedSection>

      <div className="grid-2" style={{ gap: "2rem", display: "grid", gridTemplateColumns: "1.2fr 1fr" }}>
        
        {/* Left Column: Chat Log Extractor & Routing Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Chat Backups Extractor */}
          <AnimatedSection>
            <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>📥 WhatsApp / Instagram Chat Backup Extractor</h3>
              <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "1rem" }}>
                Paste conversational logs or exported chat txt backups here. Our engine scans for names, contact coordinates, target countries, and program interests.
              </p>
              <textarea
                value={chatLog}
                onChange={(e) => setChatLog(e.target.value)}
                style={{ width: "100%", height: "150px", padding: "0.75rem", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff", outline: "none", fontFamily: "monospace", fontSize: "0.8rem", resize: "none", marginBottom: "1rem" }}
              />
              <button onClick={parseChatLog} className="btn" style={{ width: "100%" }}>⚙️ Extract Clients & Add to Leads Table</button>
            </div>
          </AnimatedSection>

          {/* Lead Routing Table */}
          <AnimatedSection>
            <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", overflowX: "auto" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem", textAlign: "left" }}>📋 Extracted Client Leads</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.15)", color: "#9ca3af" }}>
                    <th style={{ padding: "0.5rem" }}>Client Name</th>
                    <th style={{ padding: "0.5rem" }}>Phone Number</th>
                    <th style={{ padding: "0.5rem" }}>Goal</th>
                    <th style={{ padding: "0.5rem" }}>Country</th>
                    <th style={{ padding: "0.5rem" }}>Status Notation</th>
                    <th style={{ padding: "0.5rem" }}>Assigned Agent</th>
                    <th style={{ padding: "0.5rem" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedLeads.map((lead) => (
                    <tr key={lead.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: lead.forwarded ? "rgba(34,197,94,0.03)" : "transparent" }}>
                      <td style={{ padding: "0.5rem", fontWeight: "bold" }}>{lead.name}</td>
                      <td style={{ padding: "0.5rem" }}>{lead.phone}</td>
                      <td style={{ padding: "0.5rem" }}>{lead.goal}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <span style={{ padding: "0.1rem 0.4rem", borderRadius: "0.25rem", background: "rgba(170,59,255,0.15)", color: "#c084fc" }}>{lead.country}</span>
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <select
                          value={lead.status || "New"}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                          style={{
                            padding: "0.25rem",
                            background: "rgba(255,255,255,0.15)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "0.25rem",
                            color: getStatusColor(lead.status || "New"),
                            fontWeight: "bold",
                            outline: "none",
                            fontSize: "0.75rem"
                          }}
                        >
                          <option value="New" style={{ background: "var(--bg-dark)", color: "#60a5fa" }}>New 🆕</option>
                          <option value="Old" style={{ background: "var(--bg-dark)", color: "#9ca3af" }}>Old ⏳</option>
                          <option value="Interested" style={{ background: "var(--bg-dark)", color: "#22c55e" }}>Interested 👍</option>
                          <option value="Not Interested" style={{ background: "var(--bg-dark)", color: "#ef4444" }}>Not Interested 👎</option>
                          <option value="Scam" style={{ background: "var(--bg-dark)", color: "#eab308" }}>Scam 🚫</option>
                        </select>
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <select
                          value={lead.agent}
                          onChange={(e) => forwardLeadToAgent(lead, e.target.value)}
                          style={{ padding: "0.25rem", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "0.25rem", color: "#fff", outline: "none" }}
                        >
                          <option value="Unassigned" style={{ background: "var(--bg-dark)" }}>Choose Agent...</option>
                          {agents.filter(a => a.status === "Online" || a.status === "Busy").map(a => (
                            <option key={a.name} value={a.name} style={{ background: "var(--bg-dark)" }}>{a.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <button
                          disabled={lead.agent === "Unassigned"}
                          onClick={() => forwardLeadToAgent(lead, lead.agent)}
                          className="btn"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: lead.forwarded ? "#22c55e" : "#aa3bff", cursor: lead.agent === "Unassigned" ? "not-allowed" : "pointer" }}
                        >
                          {lead.forwarded ? "⚡ Re-Forward" : "📩 Forward"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedSection>
        </div>

        {/* Right Column: Agent Manager & Forwarding API Console */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Active Call Agents Console */}
          <AnimatedSection>
            <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>📞 Call Agents Directory</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {agents.map((agent) => (
                  <div key={agent.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "rgba(255,255,255,0.04)", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: agent.status === "Online" ? "#22c55e" : agent.status === "Busy" ? "#eab308" : "#9ca3af"
                      }}></span>
                      <div>
                        <strong>{agent.name}</strong>
                        <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{agent.phone}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", color: "#a855f7", fontWeight: "bold" }}>{agent.activeLeads} leads</span>
                      <div style={{ fontSize: "0.65rem", color: "#9ca3af" }}>Status: {agent.status}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Agent Form */}
              <form onSubmit={handleAddAgent} style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
                <input
                  type="text"
                  placeholder="Agent Name"
                  required
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  style={{ flex: 1, padding: "0.5rem", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.25rem", color: "#fff", outline: "none", fontSize: "0.8rem" }}
                />
                <input
                  type="text"
                  placeholder="Phone"
                  required
                  value={newAgent.phone}
                  onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
                  style={{ flex: 1, padding: "0.5rem", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.25rem", color: "#fff", outline: "none", fontSize: "0.8rem" }}
                />
                <button type="submit" className="btn" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>➕ Add</button>
              </form>
            </div>
          </AnimatedSection>

          {/* WhatsApp Cloud API Notification Mock */}
          {selectedForwardLead && (
            <AnimatedSection>
              <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left", background: "rgba(18, 140, 126, 0.08)", border: "1px solid rgba(18, 140, 126, 0.3)" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#128C7E", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  🟢 WhatsApp API Payload Dispatched
                </h3>
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
                  To Agent: <strong>{selectedForwardLead.agent.name}</strong> ({selectedForwardLead.agent.phone})
                </p>
                <pre style={{ padding: "0.75rem", background: "#0b141a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#38bdf8", fontFamily: "monospace", fontSize: "0.7rem", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                  {forwardingPayload}
                </pre>
              </div>
            </AnimatedSection>
          )}

          {/* Production Integration Guide */}
          <AnimatedSection>
            <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>🔌 Production Webhook Integration</h3>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
                In production, n8n connects to the **Meta Cloud API** webhook to fetch conversations. Here is the Node.js/Express service script to extract phone contacts and queries from message logs automatically:
              </p>
              <pre style={{ padding: "0.75rem", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#a855f7", fontFamily: "monospace", fontSize: "0.65rem", overflowX: "auto" }}>
{`// Meta Cloud API WhatsApp Webhook Listener
app.post("/webhook/whatsapp", (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (message && message.type === "text") {
    const phone = message.from; // Sender WhatsApp ID
    const textBody = message.text.body;
    
    // Parse name & target coordinates using LLM / Regex
    const lead = extractLeadDetails(phone, textBody);
    
    // Check Notion Database & Route to free Call Agent
    routeToCallCenter(lead);
  }
  res.sendStatus(200);
});`}
              </pre>
            </div>
          </AnimatedSection>
        </div>

      </div>
    </div>
  );
}
