import React, { useState } from "react";
import AnimatedSection from "../components/AnimatedSection";

export default function Community() {
  const [vacancies, setVacancies] = useState([
    {
      id: "vac_001",
      title: "Nursing Ausbildung (Pflegefachkraft)",
      location: "Munich, Bayern",
      stipend: "€1,100 - €1,300 per month",
      germanLevel: "B1 Minimum (telc/Goethe)",
      slots: 15,
      postedDate: "2026-06-06",
      details: "Premium hospital group placement including subsidized accommodation and intensive visa support.",
      broadcasted: true
    },
    {
      id: "vac_002",
      title: "IT System Integration Ausbildung",
      location: "Frankfurt, Hessen",
      stipend: "€1,050 - €1,200 per month",
      germanLevel: "B2 Required (strong spoken)",
      slots: 8,
      postedDate: "2026-06-05",
      details: "Tech company Ausbildung. Experience in basic networking or Python scripting is a major advantage.",
      broadcasted: false
    },
    {
      id: "vac_003",
      title: "Hotel Management Ausbildung (Hotelfachmann)",
      location: "Hamburg (Central)",
      stipend: "€980 - €1,120 per month",
      germanLevel: "B1 Preferred",
      slots: 12,
      postedDate: "2026-06-06",
      details: "Placement with a renowned 4-star hotel chain. Meals and laundry services provided on-site.",
      broadcasted: false
    }
  ]);

  const [newVacancy, setNewVacancy] = useState({
    title: "",
    location: "",
    stipend: "",
    germanLevel: "B1 Minimum",
    slots: "",
    details: ""
  });

  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [broadcastLog, setBroadcastLog] = useState("");
  const [channels, setChannels] = useState([
    { name: "Telegram Channel", handle: "@gtf_careers", members: 1420, type: "Telegram", status: "Connected" },
    { name: "WhatsApp Community Group", handle: "GTF Student Community", members: 890, type: "WhatsApp", status: "Connected" },
    { name: "Instagram Broadcast List", handle: "GTF Career Seekers", members: 2150, type: "Instagram", status: "Connected" }
  ]);

  const handleAddVacancy = (e) => {
    e.preventDefault();
    if (!newVacancy.title || !newVacancy.location || !newVacancy.stipend) return;

    const created = {
      id: "vac_" + (Date.now()),
      title: newVacancy.title,
      location: newVacancy.location,
      stipend: newVacancy.stipend,
      germanLevel: newVacancy.germanLevel,
      slots: parseInt(newVacancy.slots) || 5,
      postedDate: new Date().toISOString().substring(0, 10),
      details: newVacancy.details || "Details pending.",
      broadcasted: false
    };

    setVacancies((prev) => [created, ...prev]);
    setNewVacancy({
      title: "",
      location: "",
      stipend: "",
      germanLevel: "B1 Minimum",
      slots: "",
      details: ""
    });
    alert("🎉 Job vacancy successfully logged in vacancies database!");
  };

  const triggerBroadcast = (vacancy) => {
    // Generate text formatting matching broadcast_vacancies.js
    const cardText = `📢 *NEW VACANCY ANNOUNCEMENT — GATEWAY TO FUTURE* 🌍\n\n💼 *Position:* ${vacancy.title}\n📍 *Location:* ${vacancy.location}\n💰 *Stipend:* ${vacancy.stipend}\n🗣️ *Language requirement:* ${vacancy.germanLevel}\n👤 *Available Slots:* ${vacancy.slots} positions\n\n📄 *Description:* ${vacancy.details}\n\n👉 Apply instantly through the GTF Lead Router portal or message us directly on WhatsApp/Instagram!\n_Creating Career Without Borders_ 🚀`;

    setSelectedBroadcast(vacancy);
    setBroadcastLog(cardText);

    // Update vacancy broadcasted state
    setVacancies((prev) =>
      prev.map((v) => (v.id === vacancy.id ? { ...v, broadcasted: true } : v))
    );

    // Temporarily increase channel engagement metrics to simulate reaction
    setChannels((prev) =>
      prev.map((c) => ({ ...c, members: c.members + Math.floor(Math.random() * 5) + 1 }))
    );
  };

  return (
    <div className="container" style={{ padding: "2rem 0", color: "#fff" }}>
      {/* Header */}
      <AnimatedSection>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "inline-block", background: "rgba(170, 59, 255, 0.15)", border: "1px solid rgba(170, 59, 255, 0.3)", borderRadius: "9999px", padding: "0.25rem 1rem", fontSize: "0.85rem", fontWeight: "bold", color: "#c084fc", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem" }}>
            📢 Vacancy Broadcast & Community Hub
          </div>
          <h1 style={{ fontSize: "3.2rem", fontWeight: "800", background: "linear-gradient(to right, #fff, #9ca3af)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0.5rem 0" }}>GTF Vacancy Community</h1>
          <p style={{ fontSize: "1.2rem", color: "var(--text)", maxWidth: "800px", margin: "0 auto" }}>
            Publish new vocational and job vacancies across Germany, and instantly broadcast them to your active student communities.
          </p>
        </div>
      </AnimatedSection>

      <div className="grid-2" style={{ gap: "2rem", display: "grid", gridTemplateColumns: "1.2fr 1fr" }}>
        
        {/* Left Column: Vacancies List & Post Vacancy form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Vacancies List */}
          <AnimatedSection>
            <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1.25rem" }}>💼 Active Job Vacancies ({vacancies.length})</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {vacancies.map((vac) => (
                  <div key={vac.id} className="glass-card" style={{ padding: "1rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
                    {/* Broadcast Badge */}
                    <span style={{
                      position: "absolute",
                      top: "1rem",
                      right: "1rem",
                      fontSize: "0.65rem",
                      fontWeight: "bold",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "9999px",
                      background: vac.broadcasted ? "rgba(34,197,94,0.15)" : "rgba(107,114,128,0.15)",
                      color: vac.broadcasted ? "#4ade80" : "#9ca3af",
                      border: vac.broadcasted ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(107,114,128,0.3)"
                    }}>
                      {vac.broadcasted ? "📢 Broadcasted" : "⏳ Pending"}
                    </span>

                    <h4 style={{ fontSize: "1.05rem", fontWeight: "bold", margin: "0 0 0.5rem 0", color: "#fff", maxWidth: "80%" }}>
                      {vac.title}
                    </h4>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
                      <div>📍 <strong>Location:</strong> {vac.location}</div>
                      <div>💰 <strong>Stipend:</strong> {vac.stipend}</div>
                      <div>🗣️ <strong>Lang:</strong> {vac.germanLevel}</div>
                      <div>👤 <strong>Slots:</strong> {vac.slots} open positions</div>
                    </div>

                    <p style={{ fontSize: "0.8rem", color: "#d1d5db", margin: "0 0 1rem 0", lineHeight: "1.4" }}>
                      {vac.details}
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem" }}>
                      <span style={{ fontSize: "0.65rem", color: "#6b7280" }}>Posted on {vac.postedDate}</span>
                      <button
                        onClick={() => triggerBroadcast(vac)}
                        className="btn"
                        style={{
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.75rem",
                          background: vac.broadcasted ? "rgba(170, 59, 255, 0.2)" : "#aa3bff",
                          color: vac.broadcasted ? "#c084fc" : "#fff",
                          border: vac.broadcasted ? "1px solid rgba(170, 59, 255, 0.4)" : "none"
                        }}
                      >
                        {vac.broadcasted ? "🔁 Broadcast Again" : "📢 Broadcast to Channels"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Add Vacancy Form */}
          <AnimatedSection>
            <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>➕ Publish New Vacancy</h3>
              
              <form onSubmit={handleAddVacancy} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "0.75rem", color: "#9ca3af", display: "block", marginBottom: "0.25rem" }}>Job Title / Program Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IT System Integration Ausbildung"
                    value={newVacancy.title}
                    onChange={(e) => setNewVacancy({ ...newVacancy, title: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.35rem", color: "#fff", outline: "none", fontSize: "0.8rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "#9ca3af", display: "block", marginBottom: "0.25rem" }}>Location (Germany) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Frankfurt, Hessen"
                    value={newVacancy.location}
                    onChange={(e) => setNewVacancy({ ...newVacancy, location: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.35rem", color: "#fff", outline: "none", fontSize: "0.8rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "#9ca3af", display: "block", marginBottom: "0.25rem" }}>Monthly Stipend *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. €1,100 per month"
                    value={newVacancy.stipend}
                    onChange={(e) => setNewVacancy({ ...newVacancy, stipend: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.35rem", color: "#fff", outline: "none", fontSize: "0.8rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "#9ca3af", display: "block", marginBottom: "0.25rem" }}>German Language Requirement</label>
                  <select
                    value={newVacancy.germanLevel}
                    onChange={(e) => setNewVacancy({ ...newVacancy, germanLevel: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.35rem", color: "#fff", outline: "none", fontSize: "0.8rem" }}
                  >
                    <option value="A2/B1 Accepted" style={{ background: "var(--bg-dark)" }}>A2/B1 Accepted</option>
                    <option value="B1 Minimum" style={{ background: "var(--bg-dark)" }}>B1 Minimum</option>
                    <option value="B2 Required" style={{ background: "var(--bg-dark)" }}>B2 Required</option>
                    <option value="No German Required" style={{ background: "var(--bg-dark)" }}>No German Required</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "#9ca3af", display: "block", marginBottom: "0.25rem" }}>Available Slots / Vacancies</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    value={newVacancy.slots}
                    onChange={(e) => setNewVacancy({ ...newVacancy, slots: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.35rem", color: "#fff", outline: "none", fontSize: "0.8rem" }}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "0.75rem", color: "#9ca3af", display: "block", marginBottom: "0.25rem" }}>Program/Vacancy Details</label>
                  <textarea
                    placeholder="Details about stipend increases, accommodation subsidies, flight reimbursement, etc."
                    value={newVacancy.details}
                    onChange={(e) => setNewVacancy({ ...newVacancy, details: e.target.value })}
                    style={{ width: "100%", height: "80px", padding: "0.5rem", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.35rem", color: "#fff", outline: "none", fontSize: "0.8rem", resize: "none" }}
                  />
                </div>

                <button type="submit" className="btn" style={{ gridColumn: "span 2", padding: "0.6rem" }}>💾 Save & Add to Database</button>
              </form>
            </div>
          </AnimatedSection>
        </div>

        {/* Right Column: Channels directory & Live Broadcast Payload Log */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Connected Channels Directory */}
          <AnimatedSection>
            <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>📢 Active Broadcast Channels</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {channels.map((ch) => (
                  <div key={ch.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "rgba(255,255,255,0.04)", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#22c55e"
                        }}></span>
                        <strong>{ch.name}</strong>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.25rem" }}>Handle: {ch.handle}</div>
                    </div>
                    
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.85rem", color: "#c084fc", fontWeight: "bold" }}>{ch.members.toLocaleString()} members</span>
                      <div style={{ fontSize: "0.65rem", color: "#22c55e" }}>Status: {ch.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Live Broadcast API Dispatch */}
          {selectedBroadcast && (
            <AnimatedSection>
              <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left", background: "rgba(170, 59, 255, 0.05)", border: "1px solid rgba(170, 59, 255, 0.3)" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#c084fc", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  🟢 Channel Broadcast Dispatched
                </h3>
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
                  Broadcasting vacancy: <strong>{selectedBroadcast.title}</strong> across Telegram and WhatsApp API gateways.
                </p>
                <pre style={{ padding: "0.75rem", background: "#0b141a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#38bdf8", fontFamily: "monospace", fontSize: "0.7rem", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                  {broadcastLog}
                </pre>
              </div>
            </AnimatedSection>
          )}

          {/* Vacancy Broadcast API Integration Guide */}
          <AnimatedSection>
            <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "1.5rem", textAlign: "left" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>🔌 Broadcast Automation Integration</h3>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
                Behind the scenes, we use the Telegram Bot API and WhatsApp Cloud API to push notifications to student groups instantly:
              </p>
              <pre style={{ padding: "0.75rem", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#a855f7", fontFamily: "monospace", fontSize: "0.65rem", overflowX: "auto" }}>
{`// Dispatching announcement card via Telegram
const dispatchVacancy = async (textCard) => {
  const url = "https://api.telegram.org/bot<TOKEN>/sendMessage";
  await axios.post(url, {
    chat_id: "@gtf_careers",
    text: textCard,
    parse_mode: "Markdown"
  });
};`}
              </pre>
            </div>
          </AnimatedSection>

        </div>

      </div>
    </div>
  );
}
