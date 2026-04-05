import { useState, useCallback, useEffect, useRef } from "react";

// ── STYLES ────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #e8e0d0;
    --ink2: #c8bfb0;
    --ink3: #8a9aaa;
    --ink4: #556070;
    --paper: #080f1a;
    --paper2: #0d1825;
    --paper3: #121e2e;
    --amber: #c8922a;
    --amber2: #e8b84b;
    --teal: #2ab8b0;
    --teal2: #1a8880;
    --red: #c0444a;
    --green: #2a9e6a;
    --border: #1e3048;
    --border2: #2a4060;
    --gold: #d4a030;
  }
  body { background: var(--paper); color: var(--ink); font-family: 'IBM Plex Sans', sans-serif; }
  body::before {
    content: '';
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: radial-gradient(ellipse at 20% 0%, rgba(42,184,176,0.06) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 100%, rgba(200,146,42,0.06) 0%, transparent 60%);
  }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .appear { animation: fadeUp 0.3s ease both; }
  .slide { animation: slideIn 0.25s ease both; }
  .fade-in { animation: fadeIn 0.5s ease both; }
  .fade-in-delay-1 { animation: fadeIn 0.5s ease 0.1s both; }
  .fade-in-delay-2 { animation: fadeIn 0.5s ease 0.2s both; }
  .fade-in-delay-3 { animation: fadeIn 0.5s ease 0.3s both; }
  .fade-in-delay-4 { animation: fadeIn 0.5s ease 0.4s both; }
 input, textarea, select {
  background: var(--paper2); border: 1.5px solid var(--border2);
  border-radius: 4px; padding: 10px 13px;
  font-family: 'IBM Plex Mono', monospace; font-size: 13px;
  color: var(--ink); outline: none; width: 100%;
  transition: border-color 0.2s, box-shadow 0.2s;
  position: relative; z-index: 2;
  }
  input:focus, textarea:focus, select:focus {
    border-color: var(--teal);
    box-shadow: 0 0 0 3px rgba(42,184,176,0.12);
  }
  select option { background: var(--paper2); color: var(--ink); }
  button { cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; transition: all 0.15s; }
  button:hover { opacity: 0.85; }
  .landing-section { scroll-margin-top: 60px; }
`;

// ── AI CALL ───────────────────────────────────────────────────────────────────
async function callAI(prompt, system) {
  const res = await fetch("/.netlify/functions/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system }),
  });
  try {
    const raw = await res.json();
    const text = raw?.content?.[0]?.text || raw?.text || JSON.stringify(raw);
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch { return { error: true }; }
}
// ── LEMON SQUEEZY CHECKOUT URL ────────────────────────────────────────────────

const CHECKOUT_URL = "https://ownthatdomain.lemonsqueezy.com/checkout/buy/8a02425f-624d-45b7-a4e8-665a091b3d89";
// ── STAGES ────────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "setup",   label: "01  Context",       short: "Context"  },
  { id: "value",   label: "02  Your Position", short: "Position" },
  { id: "open",    label: "03  First Move",    short: "First Move" },
  { id: "counter", label: "04  Seller Reply",  short: "Reply",   locked: true },
  { id: "close",   label: "05  Final Decision",short: "Decision",locked: true },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function Label({ children, sub }) {
  return (
    <div style={{ marginBottom: sub ? 4 : 8 }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
        letterSpacing: "2px", textTransform: "uppercase", color: "var(--teal)" }}>
        {children}
      </span>
    </div>
  );
}

function Card({ children, style, amber }) {
  return (
    <div style={{
      background: "var(--paper2)", border: `1.5px solid ${amber ? "var(--amber)" : "var(--border2)"}`,
      borderRadius: 6, padding: "18px 20px",
      boxShadow: amber ? "0 0 0 3px rgba(200,146,42,0.15), 0 2px 12px rgba(0,0,0,0.4)" : "0 2px 12px rgba(0,0,0,0.3)",
      ...style,
    }}>{children}</div>
  );
}

function Notice({ text, type = "warn" }) {
  const colors = { warn: "var(--amber)", error: "var(--red)", ok: "var(--teal)" };
  const c = colors[type];
  return (
    <div style={{ background: `${c}08`, border: `1px solid ${c}30`,
      borderRadius: 5, padding: "10px 14px", display: "flex", gap: 10,
      alignItems: "flex-start", marginBottom: 14 }}>
      <span style={{ color: c, fontSize: 13, flexShrink: 0, marginTop: 1 }}>
        {type === "ok" ? "✓" : "!"}
      </span>
      <p style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

function Spinner() {
  return <div style={{ display: "inline-block", width: 14, height: 14,
    border: "2px solid var(--border2)", borderTopColor: "var(--teal)",
    borderRadius: "50%", animation: "pulse 0.8s linear infinite" }} />;
}

function PrimaryBtn({ onClick, loading, disabled, children, full }) {
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{
      width: full ? "100%" : undefined,
      padding: "12px 22px", borderRadius: 5, border: "none",
      background: loading || disabled ? "var(--border)" : "linear-gradient(135deg, var(--teal2), var(--teal))",
      color: loading || disabled ? "var(--ink4)" : "#fff",
      boxShadow: loading || disabled ? "none" : "0 0 16px rgba(42,184,176,0.25)",
      fontSize: 13, fontWeight: 500, letterSpacing: "0.5px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    }}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function LockedBadge() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6,
      background: "linear-gradient(135deg, var(--amber), var(--amber2))", color: "#0d1825", borderRadius: 4,
      padding: "3px 10px", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px" }}>
      ⚡ Unlock for £29
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text);
      setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: "transparent", border: "1px solid var(--border2)",
        color: "var(--teal)", borderRadius: 4, padding: "5px 12px",
        fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function ScriptBox({ label, text, note }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          letterSpacing: "2px", textTransform: "uppercase", color: "var(--teal)" }}>{label}</span>
        <CopyBtn text={text} />
      </div>
      <div style={{ background: "var(--paper3)", border: "1px solid var(--border2)",
        borderRadius: 5, padding: "14px 16px", fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12, lineHeight: 1.75, color: "var(--ink2)", whiteSpace: "pre-wrap" }}>
        {text}
      </div>
      {note && <p style={{ fontSize: 11, color: "var(--ink3)", marginTop: 6,
        lineHeight: 1.5, fontStyle: "italic" }}>{note}</p>}
    </div>
  );
}

// ── LANDING PAGE ──────────────────────────────────────────────────────────────
function LandingPage({ onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", position: "relative", zIndex: 1 }}>
      {/* HERO */}
      <div style={{ 
        padding: "80px 24px 60px", 
        maxWidth: 800, 
        margin: "0 auto", 
        textAlign: "center" 
      }}>
        <div className="fade-in" style={{ marginBottom: 16 }}>
          <span style={{ 
            fontFamily: "'Cinzel', serif", 
            fontSize: 28,
            background: "linear-gradient(135deg, var(--amber2), var(--gold))",
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            letterSpacing: "2px" 
          }}>OwnThatDomain</span>
        </div>
        
        <h1 className="fade-in-delay-1" style={{ 
          fontFamily: "'Cinzel', serif", 
          fontSize: "clamp(24px, 5vw, 36px)", 
          color: "var(--ink)",
          lineHeight: 1.3,
          marginBottom: 20,
          maxWidth: 700,
          margin: "0 auto 20px"
        }}>
          Acquire the domain you want without overpaying, guessing, or weakening your position
        </h1>
        
        <p className="fade-in-delay-2" style={{ 
          fontSize: 16, 
          color: "var(--ink3)", 
          lineHeight: 1.7,
          maxWidth: 600,
          margin: "0 auto 32px"
        }}>
          A strategic domain acquisition framework that helps you approach owners correctly, 
          negotiate from a stronger position, avoid pricing mistakes, 
          and improve your chances of securing the right name.
        </p>
        
        <div className="fade-in-delay-3">
          <button onClick={onStart} style={{
            background: "linear-gradient(135deg, var(--teal2), var(--teal))",
            color: "#fff",
            border: "none",
            borderRadius: 5,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 0 24px rgba(42,184,176,0.3)",
          }}>
            Build your acquisition strategy →
          </button>
        </div>
      </div>

      {/* 5 OUTCOMES */}
      <div style={{ 
        padding: "40px 24px 60px", 
        maxWidth: 700, 
        margin: "0 auto" 
      }}>
        <h2 className="fade-in" style={{ 
          fontFamily: "'IBM Plex Mono', monospace", 
          fontSize: 11, 
          letterSpacing: "2px", 
          textTransform: "uppercase",
          color: "var(--teal)",
          marginBottom: 24,
          textAlign: "center"
        }}>What you get</h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { title: "Negotiate with more leverage", desc: "Know how to approach the owner without showing desperation or weakening your position." },
            { title: "Avoid overpaying", desc: "Use a smarter acquisition process that reduces emotional and impulsive mistakes." },
            { title: "Increase your odds of success", desc: "Follow a structured approach that improves outreach, timing, and follow-up." },
            { title: "Protect your budget", desc: "Avoid common traps that push buyers into inflated pricing." },
            { title: "Strengthen your brand position", desc: "Secure a domain that improves trust, memorability, and long-term brand value." },
          ].map((item, i) => (
            <div key={i} style={{ 
              display: "flex", 
              gap: 14, 
              alignItems: "flex-start",
              background: "var(--paper2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "16px 18px"
            }}>
              <span style={{ 
                color: "var(--amber)", 
                fontSize: 14, 
                flexShrink: 0,
                marginTop: 2
              }}>→</span>
              <div>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 500, 
                  color: "var(--ink)", 
                  marginBottom: 4 
                }}>{item.title}</div>
                <div style={{ 
                  fontSize: 13, 
                  color: "var(--ink3)", 
                  lineHeight: 1.6 
                }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WHO THIS IS FOR */}
      <div style={{ 
        padding: "40px 24px 60px", 
        maxWidth: 700, 
        margin: "0 auto",
        borderTop: "1px solid var(--border)"
      }}>
        <h2 style={{ 
          fontFamily: "'IBM Plex Mono', monospace", 
          fontSize: 11, 
          letterSpacing: "2px", 
          textTransform: "uppercase",
          color: "var(--teal)",
          marginBottom: 24,
          textAlign: "center"
        }}>Built for</h2>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
          gap: 12 
        }}>
          {[
            "Founders acquiring a serious brand name",
            "Entrepreneurs replacing a weak domain",
            "Businesses buying a category-defining asset",
            "Buyers who want to avoid overpaying in private domain deals",
          ].map((item, i) => (
            <div key={i} style={{ 
              display: "flex", 
              gap: 10, 
              alignItems: "center",
              padding: "12px 16px",
              background: "var(--paper3)",
              borderRadius: 5
            }}>
              <span style={{ color: "var(--green)", fontSize: 12 }}>✓</span>
              <span style={{ fontSize: 13, color: "var(--ink2)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* WHAT IT HELPS YOU AVOID */}
      <div style={{ 
        padding: "40px 24px 60px", 
        maxWidth: 700, 
        margin: "0 auto",
        borderTop: "1px solid var(--border)"
      }}>
        <h2 style={{ 
          fontFamily: "'IBM Plex Mono', monospace", 
          fontSize: 11, 
          letterSpacing: "2px", 
          textTransform: "uppercase",
          color: "var(--red)",
          marginBottom: 24,
          textAlign: "center"
        }}>What it helps you avoid</h2>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
          gap: 12 
        }}>
          {[
            "Revealing too much interest too early",
            "Accepting inflated asking prices too fast",
            "Approaching the deal without a plan",
            "Mishandling owner communication",
            "Losing a strong domain through weak negotiation",
          ].map((item, i) => (
            <div key={i} style={{ 
              display: "flex", 
              gap: 10, 
              alignItems: "center",
              padding: "12px 16px",
              background: "rgba(192,68,74,0.08)",
              border: "1px solid rgba(192,68,74,0.2)",
              borderRadius: 5
            }}>
              <span style={{ color: "var(--red)", fontSize: 12 }}>✗</span>
              <span style={{ fontSize: 13, color: "var(--ink2)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BRAND UPSIDE */}
      <div style={{ 
        padding: "40px 24px 60px", 
        maxWidth: 700, 
        margin: "0 auto",
        borderTop: "1px solid var(--border)"
      }}>
        <h2 style={{ 
          fontFamily: "'Cinzel', serif", 
          fontSize: 20, 
          color: "var(--ink)",
          marginBottom: 10,
          textAlign: "center"
        }}>The right domain is not just a URL</h2>
        <p style={{ 
          fontSize: 14, 
          color: "var(--ink3)", 
          textAlign: "center",
          marginBottom: 24
        }}>It can improve:</p>
        
        <div style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          justifyContent: "center",
          gap: 10 
        }}>
          {["Trust", "Recall", "Direct traffic quality", "Conversion confidence", "Perceived authority"].map((item, i) => (
            <span key={i} style={{ 
              padding: "8px 16px",
              background: "var(--paper2)",
              border: "1px solid var(--amber)",
              borderRadius: 20,
              fontSize: 13,
              color: "var(--amber2)"
            }}>{item}</span>
          ))}
        </div>
      </div>

      {/* PRICING */}
      <div style={{ 
        padding: "40px 24px 60px", 
        maxWidth: 700, 
        margin: "0 auto",
        borderTop: "1px solid var(--border)"
      }}>
        <h2 style={{ 
          fontFamily: "'IBM Plex Mono', monospace", 
          fontSize: 11, 
          letterSpacing: "2px", 
          textTransform: "uppercase",
          color: "var(--teal)",
          marginBottom: 24,
          textAlign: "center"
        }}>How it works</h2>
        
        <div style={{ 
          background: "var(--paper2)", 
          border: "1px solid var(--border2)",
          borderRadius: 8,
          padding: "24px",
          textAlign: "center"
        }}>
          <p style={{ fontSize: 15, color: "var(--ink)", marginBottom: 16, lineHeight: 1.7 }}>
            <strong style={{ color: "var(--amber2)" }}>Start free.</strong> The first three stages are yours at no cost: 
            understand your position, see the likely range, and draft your first move.
          </p>
          <p style={{ fontSize: 15, color: "var(--ink)", marginBottom: 20, lineHeight: 1.7 }}>
            <strong style={{ color: "var(--amber2)" }}>Unlock live negotiation support when the seller replies.</strong> Get structured help 
            assessing the response, planning your next move, and closing the deal with more control.
          </p>
          <p style={{ fontSize: 13, color: "var(--ink4)" }}>
            No subscription. More control than a broker. More structure than doing it alone.
          </p>
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={{ 
        padding: "40px 24px 80px", 
        maxWidth: 700, 
        margin: "0 auto",
        textAlign: "center"
      }}>
        <button onClick={onStart} style={{
          background: "linear-gradient(135deg, var(--amber), var(--amber2))",
          color: "#0d1825",
          border: "none",
          borderRadius: 5,
          padding: "16px 40px",
          fontSize: 16,
          fontFamily: "'Cinzel', serif",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 0 24px rgba(200,146,42,0.3)",
        }}>
          Start with a stronger negotiation position
        </button>
        <p style={{ 
          fontSize: 12, 
          color: "var(--ink4)", 
          marginTop: 14 
        }}>
          Free to start. No account required. Everything stays in your browser.
        </p>
      </div>

      {/* FOOTER */}
      <div style={{ 
        borderTop: "1px solid var(--border)", 
        padding: "16px 24px",
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        gap: 24,
        background: "rgba(6,12,22,0.6)"
      }}>
        <a href="/terms" style={{ fontSize: 11, color: "var(--ink4)", textDecoration: "none" }}>Terms of Service</a>
        <a href="/refund-policy" style={{ fontSize: 11, color: "var(--ink4)", textDecoration: "none" }}>Refund Policy</a>
      </div>
    </div>
  );
}

// ── STAGE PROGRESS ────────────────────────────────────────────────────────────
function Progress({ current, unlocked }) {
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: "1px solid var(--border)",
      paddingBottom: 0 }}>
      {STAGES.map((s, i) => {
        const isActive = s.id === current;
        const isPast = STAGES.findIndex(x => x.id === current) > i;
        const isLocked = s.locked && !unlocked;
        return (
          <div key={s.id} style={{
            flex: 1, padding: "10px 6px", textAlign: "center",
            borderBottom: isActive ? "2px solid var(--teal)" : "2px solid transparent",
            position: "relative",
          }}>
            <div style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "1.5px", textTransform: "uppercase",
              color: isActive ? "var(--teal)" : isPast ? "var(--green)" : isLocked ? "var(--ink4)" : "var(--ink3)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {isPast ? "✓ " : ""}{s.short}
              {isLocked && " 🔒"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── STAGE 1: CONTEXT ──────────────────────────────────────────────────────────
function SetupStage({ onNext }) {
  const [form, setForm] = useState({
    domain: "", userType: "", maxBudget: "", reason: "", timeline: "flexible",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.domain && form.userType && form.maxBudget && form.reason;

  return (
    <div className="appear">
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22,
        color: "var(--amber2)", marginBottom: 6 }}>Understand your position</h2>
      <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 22, lineHeight: 1.6 }}>
        The more honest context you give, the clearer your negotiation strategy will be. Nothing here leaves this page.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Label>Domain you want to acquire</Label>
          <input value={form.domain} onChange={e => set("domain", e.target.value)}
            placeholder="e.g. LoanAgent.com" />
        </div>

        <div>
          <Label>You are a...</Label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { v: "investor", label: "Domain Investor", sub: "Buying to resell" },
              { v: "business", label: "Business / Startup", sub: "Buying to use" },
            ].map(opt => (
              <button key={opt.v} onClick={() => set("userType", opt.v)} style={{
                flex: 1, padding: "12px 14px", borderRadius: 5, textAlign: "left",
                border: `1.5px solid ${form.userType === opt.v ? "var(--amber)" : "var(--border2)"}`,
                background: form.userType === opt.v ? "rgba(200,146,42,0.15)" : "var(--paper2)",
                color: "var(--ink)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "var(--ink3)" }}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Your absolute maximum budget (£)</Label>
          <input type="number" value={form.maxBudget}
            onChange={e => set("maxBudget", e.target.value)}
            placeholder="e.g. 2500" />
          <p style={{ fontSize: 11, color: "var(--ink4)", marginTop: 5 }}>
            This stays private. It shapes your strategy — we will never suggest opening at this number.
          </p>
        </div>

        <div>
          <Label>Why do you want this specific domain?</Label>
          <textarea value={form.reason} onChange={e => set("reason", e.target.value)}
            rows={3} placeholder={
              form.userType === "investor"
                ? "e.g. Strong 2-word .com in AI fintech niche, similar names sold for $2-5k on NameBio"
                : "e.g. It's our company name and we're launching in 3 months, it would complete our brand"
            } />
          {form.userType === "business" &&
            <p style={{ fontSize: 11, color: "var(--red)", marginTop: 5 }}>
              ⚠ Do not mention your company name or urgency to the seller. This is for your eyes only.
            </p>}
        </div>

        <div>
          <Label>Timeline</Label>
          <select value={form.timeline} onChange={e => set("timeline", e.target.value)}>
            <option value="flexible">Flexible — no pressure</option>
            <option value="weeks">A few weeks</option>
            <option value="urgent">Urgent — I need this soon</option>
          </select>
          {form.timeline === "urgent" &&
            <p style={{ fontSize: 11, color: "var(--red)", marginTop: 5 }}>
              ⚠ Urgency is your biggest negotiation weakness. Never reveal this to the seller.
            </p>}
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <PrimaryBtn onClick={() => onNext(form)} disabled={!valid} full>
          See your position →
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ── STAGE 2: YOUR POSITION ────────────────────────────────────────────────────
function ValuationStage({ setup, onNext }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const res = await callAI(`Analyse the domain "${setup.domain}" for negotiation purposes.
Buyer type: ${setup.userType}
Max budget: £${setup.maxBudget}
Reason: ${setup.reason}

Give an honest assessment to help the buyer understand their position. You do not have live sales data.
Base your estimate on:
- Extension strength (.com, .ai, .io etc)
- Word count and length
- Niche demand signals
- Comparable domain patterns from your training data

Be honest about uncertainty. Give a range, not a point estimate.
Flag if the domain seems overpriced or underpriced relative to stated budget.

JSON: {
  "extension_quality": "strong|moderate|weak",
  "estimated_range": "£X - £Y",
  "confidence": "low|medium|high",
  "confidence_reason": "one sentence on why",
  "opening_anchor": "£Z",
  "opening_anchor_logic": "why this opening makes sense",
  "budget_verdict": "reasonable|tight|generous|unknown",
  "comparable_patterns": "2 sentences on what similar domains have sold for - be honest if you're uncertain",
  "key_risks": ["risk 1", "risk 2"],
  "negotiation_leverage": ["leverage point 1", "leverage point 2"],
  "data_disclaimer": "one sentence reminding buyer to verify on NameBio"
}`);
    setData(res); setLoading(false); setRan(true);
  }, [setup]);

  return (
    <div className="appear">
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22,
        color: "var(--amber2)", marginBottom: 6 }}>Your position</h2>
      <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 18, lineHeight: 1.6 }}>
        Before making your first move, pressure-test the likely value and see where you stand. This assessment uses extension strength, comparable sales patterns, and niche demand signals. Verify on NameBio before committing real money.
      </p>

      {!ran && (
        <PrimaryBtn onClick={run} loading={loading} full>
          {loading ? "Analysing..." : "See your position"}
        </PrimaryBtn>
      )}

      {data && !data.error && (
        <div className="slide" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Notice text={data.data_disclaimer} type="warn" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { l: "Estimated Range", v: data.estimated_range, note: "Sense-check only" },
              { l: "Opening Anchor", v: data.opening_anchor, note: "Start here" },
              { l: "Your Budget", v: `£${setup.maxBudget}`, note: data.budget_verdict },
            ].map(item => (
              <Card key={item.l}>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "2px", textTransform: "uppercase",
                  color: "var(--teal)", marginBottom: 6 }}>{item.l}</div>
                <div style={{ fontFamily: "'Cinzel', serif",
                  fontSize: 20, color: "var(--amber2)", marginBottom: 3 }}>{item.v}</div>
                <div style={{ fontSize: 11, color: "var(--ink4)" }}>{item.note}</div>
              </Card>
            ))}
          </div>

          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "2px", textTransform: "uppercase",
                  color: "var(--ink3)", marginBottom: 8 }}>Your Leverage</div>
                {data.negotiation_leverage?.map((l, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "var(--green)", fontSize: 12 }}>↑</span>
                    <span style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.5 }}>{l}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "2px", textTransform: "uppercase",
                  color: "var(--ink3)", marginBottom: 8 }}>Risks</div>
                {data.key_risks?.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "var(--red)", fontSize: 12 }}>↓</span>
                    <span style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "2px", textTransform: "uppercase",
              color: "var(--ink3)", marginBottom: 8 }}>Comparable Patterns</div>
            <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.65 }}>
              {data.comparable_patterns}
            </p>
            <p style={{ fontSize: 11, color: "var(--amber)", marginTop: 10,
              borderTop: `1px solid ${"var(--border)"}`, paddingTop: 10 }}>
              Confidence: {data.confidence} — {data.confidence_reason}
            </p>
          </Card>

          <div style={{ display: "flex", gap: 10 }}>
            <PrimaryBtn onClick={() => { setData(null); setRan(false); }} style={{ flex: "none" }}>
              Re-run
            </PrimaryBtn>
            <PrimaryBtn onClick={() => onNext(data)} full>
              Prepare your first move →
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STAGE 3: FIRST MOVE ───────────────────────────────────────────────────────
function OpenStage({ setup, valuation, onNext }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const res = await callAI(`Write opening contact messages for acquiring "${setup.domain}".

Buyer type: ${setup.userType === "investor" ? "Domain investor (never reveal this - present as entrepreneur)" : "Business/startup (never reveal company name or urgency)"}
Suggested opening offer: ${valuation.opening_anchor}
Timeline pressure: ${setup.timeline}

Write three contact messages:
1. Email approach (subject + body, under 90 words)
2. Contact form / brief message (under 50 words)
3. If the domain has a "make offer" button on a parking page (direct bid framing, under 40 words)

Rules for all messages:
- Never mention urgency
- Never reveal maximum budget
- Present as a small entrepreneur/individual buyer, not a company
- Sound interested but not desperate
- Leave room to negotiate - this is an opening, not a final offer
- For business buyers: never name your company or product
- The opening offer should be stated clearly and confidently

JSON: {
  "email_subject": "...",
  "email_body": "...",
  "contact_form": "...",
  "parking_offer": "...",
  "tactical_notes": ["note 1", "note 2", "note 3"],
  "whois_tip": "one sentence on how to find owner contact info",
  "follow_up_timing": "when and how to follow up if no response"
}`);
    setData(res); setLoading(false);
  }, [setup, valuation]);

  return (
    <div className="appear">
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22,
        color: "var(--ink)", marginBottom: 6 }}>Make your first move</h2>
      <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 18, lineHeight: 1.6 }}>
        Your first message sets the tone for everything. These are starting points designed to open the negotiation without exposing your position. Edit before sending.
      </p>

      {!data && (
        <PrimaryBtn onClick={run} loading={loading} full>
          {loading ? "Preparing your first move..." : "Draft first move"}
        </PrimaryBtn>
      )}

      {data && !data.error && (
        <div className="slide" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Notice text="Read and edit these before sending. They are a starting point, not a finished message. Your voice should come through." type="warn" />

          <ScriptBox
            label="Email approach"
            text={`Subject: ${data.email_subject}\n\n${data.email_body}`}
            note="Best for domains with visible owner contact. Looks most professional."
          />
          <ScriptBox
            label="Contact form / short message"
            text={data.contact_form}
            note="Use when the domain has a contact form or limited character space."
          />
          <ScriptBox
            label="Parking page offer"
            text={data.parking_offer}
            note="Use when the domain is parked with a make offer interface."
          />

          <Card>
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "2px", textTransform: "uppercase",
              color: "var(--ink3)", marginBottom: 10 }}>Tactical Notes</div>
            {data.tactical_notes?.map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <span style={{ color: "var(--amber)", fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11, flexShrink: 0, marginTop: 1 }}>0{i + 1}</span>
                <span style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6 }}>{n}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${"var(--border)"}`, marginTop: 12, paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--ink2)", marginBottom: 6 }}>
                <strong style={{ color: "var(--ink3)" }}>Finding the owner:</strong> {data.whois_tip}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink2)" }}>
                <strong style={{ color: "var(--ink3)" }}>If no response:</strong> {data.follow_up_timing}
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", gap: 10 }}>
            <PrimaryBtn onClick={() => setData(null)} style={{ flex: "none" }}>Re-run</PrimaryBtn>
            <PrimaryBtn onClick={() => onNext(data)} full>
              Seller replied — handle the response →
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STAGE 4: SELLER REPLY ─────────────────────────────────────────────────────
function CounterStage({ setup, valuation, onNext, unlocked }) {
  const [response, setResponse] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const res = await callAI(`Domain negotiation response guidance for "${setup.domain}".

Buyer type: ${setup.userType}
Max budget: £${setup.maxBudget}
Opening anchor: ${valuation.opening_anchor}
Estimated range: ${valuation.estimated_range}
Seller's response: ${response}
Seller's counter amount (if given): ${counterAmount || "not specified"}

Analyse the seller's response and give strategic advice.
Is this a serious seller? What does their response signal?
What should the buyer counter with and how?
What messages should they use?

JSON: {
  "seller_signal": "what their response reveals about motivation/flexibility",
  "recommended_counter": "£X",
  "recommended_counter_logic": "why",
  "counter_script": "the actual response message to send",
  "psychology_note": "one key insight about this negotiation dynamic",
  "red_flags": ["any red flags from their response"],
  "walk_away_signal": "what would indicate buyer should walk away at this point"
}`);
    setData(res); setLoading(false);
  }, [setup, valuation, response, counterAmount]);

  if (!unlocked) {
    return (
      <div className="appear">
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22,
          color: "var(--amber2)", marginBottom: 6 }}>Respond with confidence</h2>
        <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 20, lineHeight: 1.6 }}>
          The seller has replied. This is where most buyers make costly mistakes — folding too early, bidding against themselves, or misreading what the seller actually signalled. Unlock live negotiation support to handle this correctly.
        </p>
        <Card amber style={{ textAlign: "center", padding: "28px 24px" }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18,
            color: "var(--ink)", marginBottom: 10 }}>
            Unlock live negotiation support
          </div>
          <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 18, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 18px" }}>
            Get seller-signal analysis, counter-offer guidance, and close-or-walk-away support for this negotiation. One-off payment, no subscription.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => window.location.href = CHECKOUT_URL}
              style={{
                background: "linear-gradient(135deg, var(--amber), var(--amber2))",
                color: "#0d1825", border: "none", borderRadius: 5,
                padding: "12px 28px", fontSize: 16, fontFamily: "'Cinzel', serif",
                cursor: "pointer", fontWeight: 600,
              }}>
              £29 — Unlock live support
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--ink4)", marginTop: 14 }}>
            One payment covers seller-response handling and final decision support for {setup.domain}
          </p>
        </Card>

        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
            letterSpacing: "1.5px", textTransform: "uppercase",
            color: "var(--ink3)", marginBottom: 14 }}>What unlocks after payment:</h3>
          {[
            "Seller signal analysis — what their response actually reveals",
            "Recommended counter-offer amount with clear reasoning",
            "Response message ready to edit and send",
            "Negotiation psychology guidance for this specific situation",
            "Red flag detection — when to be cautious",
            "Walk-away signals — when to stop and move on",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
              <span style={{ color: "var(--teal)", fontSize: 13, flexShrink: 0 }}>→</span>
              <span style={{ fontSize: 13, color: "var(--ink2)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="appear">
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22,
        color: "var(--amber2)", marginBottom: 6 }}>Respond with confidence</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
        <div>
          <Label>What did the seller say?</Label>
          <textarea value={response} onChange={e => setResponse(e.target.value)}
            rows={4} placeholder="Paste or summarise their response here..." />
        </div>
        <div>
          <Label>Amount they named (if any)</Label>
          <input value={counterAmount} onChange={e => setCounterAmount(e.target.value)}
            placeholder="e.g. £4,500 or 'not interested in selling below £10k'" />
        </div>
      </div>

      {!data && (
        <PrimaryBtn onClick={run} loading={loading} disabled={!response} full>
          {loading ? "Analysing..." : "Analyse seller reply"}
        </PrimaryBtn>
      )}

      {data && !data.error && (
        <div className="slide" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "2px", textTransform: "uppercase",
              color: "var(--ink3)", marginBottom: 8 }}>Seller Signal</div>
            <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.65 }}>{data.seller_signal}</p>
            {data.psychology_note && (
              <p style={{ fontSize: 12, marginTop: 10,
                borderTop: `1px solid ${"var(--border)"}`, paddingTop: 10,
                fontStyle: "italic", color: "var(--teal)" }}>{data.psychology_note}</p>
            )}
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: "2px", textTransform: "uppercase", color: "var(--ink3)" }}>
                Recommended Counter
              </div>
              <span style={{ fontFamily: "'Cinzel', serif",
                fontSize: 22, color: "var(--amber2)" }}>{data.recommended_counter}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.6 }}>{data.recommended_counter_logic}</p>
          </Card>

          <ScriptBox label="Response message" text={data.counter_script} />

          {data.red_flags?.length > 0 && (
            <Notice text={`Red flags: ${data.red_flags.join(" · ")}`} type="error" />
          )}

          <Card>
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "2px", textTransform: "uppercase",
              color: "var(--ink3)", marginBottom: 8 }}>Walk-Away Signal</div>
            <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.65 }}>{data.walk_away_signal}</p>
          </Card>

          <div style={{ display: "flex", gap: 10 }}>
            <PrimaryBtn onClick={() => setData(null)} style={{ flex: "none" }}>Re-run</PrimaryBtn>
            <PrimaryBtn onClick={() => onNext(data)} full>
              Make your final decision →
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STAGE 5: FINAL DECISION ───────────────────────────────────────────────────
function CloseStage({ setup, unlocked }) {
  const [outcome, setOutcome] = useState(null);
  const [agreedPrice, setAgreedPrice] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const res = await callAI(`Domain deal closing guidance for "${setup.domain}".

Outcome: ${outcome}
${outcome === "deal" ? `Agreed price: £${agreedPrice}` : ""}
Buyer type: ${setup.userType}

${outcome === "deal"
  ? `Give step-by-step closing guidance: how to use escrow, what to watch for in the transfer, common mistakes at this stage.`
  : `Give walk-away guidance: how to leave the door open, how to document the negotiation for future reference, how to find alternative domains.`}

JSON: {
  "headline": "one sentence summary of what to do now",
  "steps": [{"step": "step title", "detail": "what to do and why"}],
  "key_warning": "the most important thing not to get wrong at this stage",
  "escrow_recommendation": "which escrow service to use and why (for deal outcome only, else omit)",
  "closing_note": "a final honest observation about this deal"
}`);
    setData(res); setLoading(false);
  }, [setup, outcome, agreedPrice]);

  if (!unlocked) {
    return (
      <div className="appear" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20,
          color: "var(--ink)", marginBottom: 10 }}>Final Decision Support</div>
        <p style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.6 }}>
          Unlock live negotiation support for £29 to access closing guidance and walk-away support.
        </p>
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => window.location.href = CHECKOUT_URL}
            style={{
              background: "linear-gradient(135deg, var(--amber), var(--amber2))",
              color: "#0d1825", border: "none", borderRadius: 5,
              padding: "12px 28px", fontSize: 16, fontFamily: "'Cinzel', serif",
              cursor: "pointer", fontWeight: 600,
            }}>
            £29 — Unlock live support
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="appear">
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22,
        color: "var(--amber2)", marginBottom: 6 }}>Decide whether to continue or walk away</h2>
      <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 20, lineHeight: 1.6 }}>
        You have reached a decision point. Tell me what happened.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {[
          { v: "deal", label: "✓ Deal reached", sub: "We agreed on a price" },
          { v: "walk", label: "✗ Walking away", sub: "Price too high or no response" },
        ].map(opt => (
          <button key={opt.v} onClick={() => setOutcome(opt.v)} style={{
            flex: 1, padding: "14px 16px", borderRadius: 5, textAlign: "left",
            border: `1.5px solid ${outcome === opt.v ? (opt.v === "deal" ? "var(--green)" : "var(--red)") : "var(--border)"}`,
            background: outcome === opt.v ? (opt.v === "deal" ? "rgba(42,158,106,0.15)" : "rgba(192,68,74,0.15)") : "var(--paper2)",
            color: "var(--ink)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: "var(--ink3)" }}>{opt.sub}</div>
          </button>
        ))}
      </div>

      {outcome === "deal" && (
        <div style={{ marginBottom: 16 }}>
          <Label>Agreed price</Label>
          <input value={agreedPrice} onChange={e => setAgreedPrice(e.target.value)}
            placeholder="e.g. 1800" type="number" />
        </div>
      )}

      {outcome && !data && (
        <PrimaryBtn onClick={run} loading={loading}
          disabled={outcome === "deal" && !agreedPrice} full>
          {loading ? "Generating guidance..." : "Get closing guidance"}
        </PrimaryBtn>
      )}

      {data && !data.error && (
        <div className="slide" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Notice text={data.headline} type={outcome === "deal" ? "ok" : "warn"} />

          {data.steps?.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%",
                background: "var(--paper3)", border: "1px solid var(--border2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, color: "var(--ink3)" }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)",
                  marginBottom: 3 }}>{s.step}</div>
                <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6 }}>{s.detail}</div>
              </div>
            </div>
          ))}

          {data.key_warning && (
            <Notice text={`⚠ ${data.key_warning}`} type="error" />
          )}

          {data.escrow_recommendation && (
            <Card>
              <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: "2px", textTransform: "uppercase",
                color: "var(--ink3)", marginBottom: 8 }}>Escrow</div>
              <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.65 }}>{data.escrow_recommendation}</p>
            </Card>
          )}

          {data.closing_note && (
            <p style={{ fontSize: 12, color: "var(--ink3)", fontStyle: "italic",
              lineHeight: 1.65, borderTop: "1px solid var(--border2)", paddingTop: 14 }}>
              {data.closing_note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [stage, setStage] = useState("setup");
  const [setup, setSetup] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const appRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order");
    if (orderId) {
      fetch(`/.netlify/functions/verify-token?order=${orderId}`)
        .then(r => r.json())
        .then(d => {
          if (d.valid) {
            setUnlocked(true);
            sessionStorage.setItem("unlocked", "true");
            window.history.replaceState({}, "", window.location.pathname);
          }
        })
        .catch(() => {});
    }
    if (sessionStorage.getItem("unlocked") === "true") {
      setUnlocked(true);
    }
  }, []);

  const goTo = id => {
    setStage(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStart = () => {
    setShowLanding(false);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  if (showLanding) {
    return (
      <>
        <style>{CSS}</style>
        <LandingPage onStart={handleStart} />
      </>
    );
  }

  return (
    <div ref={appRef} style={{ minHeight: "100vh", background: "var(--paper)", position: "relative", zIndex: 1 }}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{ background: "rgba(6,12,22,0.95)", borderBottom: "1px solid var(--border2)",
        padding: "14px 24px", backdropFilter: "blur(8px)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span 
            onClick={() => setShowLanding(true)}
            style={{ fontFamily: "'Cinzel', serif", fontSize: 16,
              background: "linear-gradient(135deg, var(--amber2), var(--gold))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "1px", cursor: "pointer" }}>OwnThatDomain</span>
          <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
            color: "var(--ink4)", letterSpacing: "1.5px", borderLeft: "1px solid var(--border2)",
            paddingLeft: 12 }}>
            PRIVATE · IN-BROWSER ONLY
          </span>
        </div>
        {setup && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
            color: "var(--teal)" }}>{setup.domain}</div>
        )}
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 16px 60px" }}>
        <Progress current={stage} unlocked={unlocked} />

        {stage === "setup" && (
          <SetupStage onNext={form => { setSetup(form); goTo("value"); }} />
        )}
        {stage === "value" && setup && (
          <ValuationStage setup={setup}
            onNext={v => { setValuation(v); goTo("open"); }} />
        )}
        {stage === "open" && setup && valuation && (
          <OpenStage setup={setup} valuation={valuation}
            onNext={() => goTo("counter")} />
        )}
        {stage === "counter" && (
          <CounterStage setup={setup} valuation={valuation}
            onNext={() => goTo("close")} unlocked={unlocked} />
        )}
        {stage === "close" && (
          <CloseStage setup={setup} unlocked={unlocked} />
        )}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "16px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(6,12,22,0.6)", flexWrap: "wrap", gap: 10 }}>
        <p style={{ fontSize: 11, color: "var(--ink4)", maxWidth: 480, lineHeight: 1.7 }}>
          Position assessments are based on extension strength, comparable sales patterns, and niche demand signals. Verify comparable sales on NameBio before committing real money. Nothing in this tool constitutes financial or legal advice.
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/terms" style={{ fontSize: 11, color: "var(--ink4)", textDecoration: "none" }}>Terms of Service</a>
          <a href="/refund-policy" style={{ fontSize: 11, color: "var(--ink4)", textDecoration: "none" }}>Refund Policy</a>
        </div>
      </div>
    </div>
  );
}
