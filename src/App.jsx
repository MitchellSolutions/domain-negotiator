import { useState, useCallback } from "react";

// ── STYLES ────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #1a1208;
    --ink2: #3d3220;
    --ink3: #7a6a50;
    --ink4: #b8a88a;
    --paper: #f5f0e8;
    --paper2: #ede8de;
    --paper3: #e4ddd0;
    --amber: #c47a1e;
    --amber2: #e8931f;
    --red: #b83232;
    --green: #2a6e3f;
    --border: #d4c9b0;
  }
  body {
    background: var(--paper);
    color: var(--ink);
    font-family: 'IBM Plex Sans', sans-serif;
  }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-6px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .appear { animation: fadeUp 0.3s ease both; }
  .slide  { animation: slideIn 0.25s ease both; }
  input, textarea, select {
    background: white;
    border: 1.5px solid var(--border);
    border-radius: 4px;
    padding: 10px 13px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: var(--ink);
    outline: none;
    width: 100%;
    transition: border-color 0.15s;
  }
  input:focus, textarea:focus, select:focus { border-color: var(--amber); }
  button { cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; transition: all 0.15s; }
  button:disabled { cursor: default; }
  button:not(:disabled):hover { opacity: 0.82; }
`;

// ── API CALL — routes through Netlify function to protect the key ─────────────
async function callAI(prompt, system) {
  const res = await fetch("/.netlify/functions/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system }),
  });
  if (!res.ok) return { error: true };
  const d = await res.json();
  return d;
}

// ── STAGES ────────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "setup",   short: "Situation"    },
  { id: "value",   short: "Valuation"    },
  { id: "open",    short: "First Offer"  },
  { id: "counter", short: "Counter",  locked: true },
  { id: "close",   short: "Close",    locked: true },
];

// ── SHARED UI ─────────────────────────────────────────────────────────────────
function v(name) { return `var(--${name})`; }

function Card({ children, style, amber }) {
  return (
    <div style={{
      background: "white",
      border: `1.5px solid ${amber ? v("amber") : v("border")}`,
      borderRadius: 6,
      padding: "18px 20px",
      boxShadow: amber ? `0 0 0 3px ${v("amber")}18` : "0 1px 3px rgba(0,0,0,0.05)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Notice({ text, type = "warn" }) {
  const cols = { warn: v("amber"), error: v("red"), ok: v("green") };
  const c = cols[type];
  return (
    <div style={{
      background: type === "warn" ? "#fdf3e3" : type === "error" ? "#faeaea" : "#e8f4ec",
      border: `1px solid ${c}40`,
      borderRadius: 5,
      padding: "10px 14px",
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      marginBottom: 14,
    }}>
      <span style={{ color: c, fontSize: 13, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>
        {type === "ok" ? "✓" : "!"}
      </span>
      <p style={{ fontSize: 12, color: v("ink2"), lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14,
      border: `2px solid ${v("border")}`, borderTopColor: v("amber"),
      borderRadius: "50%", animation: "spin 0.7s linear infinite",
    }} />
  );
}

function PrimaryBtn({ onClick, loading, disabled, children, full }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        width: full ? "100%" : undefined,
        padding: "12px 22px",
        borderRadius: 5,
        border: "none",
        background: loading || disabled ? v("paper3") : v("ink"),
        color: loading || disabled ? v("ink4") : v("paper"),
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "0.5px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10,
      letterSpacing: "2px",
      textTransform: "uppercase",
      color: v("ink3"),
      marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        background: "transparent",
        border: `1px solid ${v("border")}`,
        color: v("ink3"),
        borderRadius: 4,
        padding: "5px 12px",
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function ScriptBox({ label, text, note }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Label>{label}</Label>
        <CopyBtn text={text} />
      </div>
      <div style={{
        background: v("paper"),
        border: `1px solid ${v("border")}`,
        borderRadius: 5,
        padding: "14px 16px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        lineHeight: 1.75,
        color: v("ink2"),
        whiteSpace: "pre-wrap",
      }}>
        {text}
      </div>
      {note && (
        <p style={{ fontSize: 11, color: v("ink3"), marginTop: 6, lineHeight: 1.5, fontStyle: "italic" }}>
          {note}
        </p>
      )}
    </div>
  );
}

function Bullets({ items, icon = "→", color }) {
  const c = color || v("amber");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ color: c, fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icon}</span>
          <span style={{ fontSize: 13, color: v("ink2"), lineHeight: 1.55 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
function Progress({ current, unlocked }) {
  const currentIdx = STAGES.findIndex(s => s.id === current);
  return (
    <div style={{
      display: "flex",
      borderBottom: `1px solid ${v("border")}`,
      marginBottom: 28,
      overflowX: "auto",
    }}>
      {STAGES.map((s, i) => {
        const isActive = s.id === current;
        const isPast   = currentIdx > i;
        const isLocked = s.locked && !unlocked;
        return (
          <div key={s.id} style={{
            flex: 1,
            minWidth: 70,
            padding: "10px 8px",
            textAlign: "center",
            borderBottom: isActive
              ? `2px solid ${v("amber")}`
              : "2px solid transparent",
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              color: isActive ? v("amber")
                   : isPast   ? v("green")
                   : isLocked ? v("ink4")
                   :            v("ink3"),
            }}>
              {isPast ? "✓ " : ""}{s.short}{isLocked ? " 🔒" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── STAGE 1: SETUP ────────────────────────────────────────────────────────────
function SetupStage({ onNext }) {
  const [form, setForm] = useState({
    domain: "", userType: "", maxBudget: "", reason: "", timeline: "flexible",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.domain && form.userType && form.maxBudget && form.reason;

  return (
    <div className="appear">
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: v("ink"), marginBottom: 6 }}>
        Tell me about your situation
      </h2>
      <p style={{ fontSize: 13, color: v("ink3"), marginBottom: 22, lineHeight: 1.6 }}>
        The more honest context you give, the better your strategy. Nothing here leaves this page.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Label>Domain you want to acquire</Label>
          <input
            value={form.domain}
            onChange={e => set("domain", e.target.value)}
            placeholder="e.g. LoanAgent.com"
          />
        </div>

        <div>
          <Label>You are a...</Label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { v: "investor", label: "Domain Investor", sub: "Buying to resell" },
              { v: "business", label: "Business / Startup", sub: "Buying to use" },
            ].map(opt => (
              <button
                key={opt.v}
                onClick={() => set("userType", opt.v)}
                style={{
                  flex: 1, padding: "12px 14px", borderRadius: 5, textAlign: "left",
                  border: `1.5px solid ${form.userType === opt.v ? v("amber") : v("border")}`,
                  background: form.userType === opt.v ? "#fdf3e3" : "white",
                  color: v("ink"),
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: v("ink3") }}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Your absolute maximum budget (USD)</Label>
          <input
            type="number"
            value={form.maxBudget}
            onChange={e => set("maxBudget", e.target.value)}
            placeholder="e.g. 2500"
          />
          <p style={{ fontSize: 11, color: v("ink4"), marginTop: 5 }}>
            This stays private. It shapes your strategy — we will never suggest opening at this number.
          </p>
        </div>

        <div>
          <Label>Why do you want this specific domain?</Label>
          <textarea
            value={form.reason}
            onChange={e => set("reason", e.target.value)}
            rows={3}
            placeholder={
              form.userType === "investor"
                ? "e.g. Strong 2-word .com in AI fintech niche, similar names sold for $2-5k on NameBio"
                : "e.g. It's our company name and we're launching in 3 months"
            }
          />
          {form.userType === "business" && (
            <p style={{ fontSize: 11, color: v("red"), marginTop: 5 }}>
              ⚠ Don't mention your company name or urgency to the seller. This is for your eyes only.
            </p>
          )}
        </div>

        <div>
          <Label>Timeline</Label>
          <select value={form.timeline} onChange={e => set("timeline", e.target.value)}>
            <option value="flexible">Flexible — no pressure</option>
            <option value="weeks">A few weeks</option>
            <option value="urgent">Urgent — I need this soon</option>
          </select>
          {form.timeline === "urgent" && (
            <p style={{ fontSize: 11, color: v("red"), marginTop: 5 }}>
              ⚠ Urgency is your biggest negotiation weakness. Never reveal this to the seller.
            </p>
          )}
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <PrimaryBtn onClick={() => onNext(form)} disabled={!valid} full>
          Continue to Valuation →
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ── STAGE 2: VALUATION ────────────────────────────────────────────────────────
function ValuationStage({ setup, onNext }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan]       = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const res = await callAI(
      `Analyse the domain "${setup.domain}" for negotiation purposes.
Buyer type: ${setup.userType}
Max budget: $${setup.maxBudget}
Reason: ${setup.reason}

Give an honest valuation. You have no live sales data.
Base your estimate on extension strength, word count, niche demand, and comparable patterns from training data.
Be honest about uncertainty. Give a range, not a point estimate.
Flag if the domain seems overpriced or underpriced relative to the stated budget.

JSON only:
{
  "extension_quality": "strong|moderate|weak",
  "estimated_range": "$X - $Y",
  "confidence": "low|medium|high",
  "confidence_reason": "one sentence",
  "opening_anchor": "$Z",
  "opening_anchor_logic": "why this opening makes sense",
  "budget_verdict": "reasonable|tight|generous",
  "comparable_patterns": "2 sentences on similar domains — be honest if uncertain",
  "key_risks": ["risk 1", "risk 2"],
  "negotiation_leverage": ["leverage 1", "leverage 2"],
  "data_disclaimer": "one sentence reminding buyer to verify on NameBio"
}`
    );
    setData(res);
    setLoading(false);
    setRan(true);
  }, [setup]);

  return (
    <div className="appear">
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: v("ink"), marginBottom: 6 }}>
        Valuation Assessment
      </h2>
      <p style={{ fontSize: 13, color: v("ink3"), marginBottom: 18, lineHeight: 1.6 }}>
        Before making any offer, you need a realistic sense of what this domain is worth and what to open with.
        These are AI estimates — verify on NameBio before committing real money.
      </p>

      {!ran && (
        <PrimaryBtn onClick={run} loading={loading} full>
          {loading ? "Analysing..." : "Generate Valuation"}
        </PrimaryBtn>
      )}

      {data && !data.error && (
        <div className="slide" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Notice text={data.data_disclaimer} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { l: "Estimated Range",   val: data.estimated_range,    note: "AI estimate only" },
              { l: "Suggested Opening", val: data.opening_anchor,     note: "Start here" },
              { l: "Your Budget",       val: `$${setup.maxBudget}`,   note: data.budget_verdict },
            ].map(item => (
              <Card key={item.l}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                  letterSpacing: "2px", textTransform: "uppercase",
                  color: v("ink3"), marginBottom: 6,
                }}>
                  {item.l}
                </div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 19, color: v("ink"), marginBottom: 3,
                }}>
                  {item.val}
                </div>
                <div style={{ fontSize: 11, color: v("ink4") }}>{item.note}</div>
              </Card>
            ))}
          </div>

          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <Label>Your Leverage</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.negotiation_leverage?.map((l, i) => (
                    <div key={i} style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: v("green"), fontSize: 12 }}>↑</span>
                      <span style={{ fontSize: 12, color: v("ink2"), lineHeight: 1.5 }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Risks</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.key_risks?.map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: v("red"), fontSize: 12 }}>↓</span>
                      <span style={{ fontSize: 12, color: v("ink2"), lineHeight: 1.5 }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <Label>Comparable Patterns</Label>
            <p style={{ fontSize: 13, color: v("ink2"), lineHeight: 1.65, marginBottom: 10 }}>
              {data.comparable_patterns}
            </p>
            <p style={{
              fontSize: 11, color: v("amber"),
              borderTop: `1px solid ${v("border")}`, paddingTop: 10,
            }}>
              Confidence: {data.confidence} — {data.confidence_reason}
            </p>
          </Card>

          <div style={{ display: "flex", gap: 10 }}>
            <PrimaryBtn onClick={() => { setData(null); setRan(false); }}>Re-run</PrimaryBtn>
            <PrimaryBtn onClick={() => onNext(data)} full>Generate Opening Offer →</PrimaryBtn>
          </div>
        </div>
      )}

      {data?.error && (
        <Notice text="Something went wrong. Check your ANTHROPIC_API_KEY environment variable in Netlify." type="error" />
      )}
    </div>
  );
}

// ── STAGE 3: OPENING OFFER ────────────────────────────────────────────────────
function OpenStage({ setup, valuation, onNext }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const res = await callAI(
      `Write opening contact scripts for acquiring "${setup.domain}".

Buyer type: ${setup.userType === "investor"
  ? "Domain investor — present as an entrepreneur, never reveal this"
  : "Business/startup — never reveal company name or urgency"}
Opening offer: ${valuation.opening_anchor}
Timeline pressure: ${setup.timeline}

Write three scripts:
1. Email (subject + body, under 90 words)
2. Contact form message (under 50 words)
3. Parking page offer button (under 40 words)

Rules for all scripts:
- Never mention urgency or maximum budget
- Sound interested but not desperate
- Present as an individual, not a company
- Leave clear room to negotiate

JSON only:
{
  "email_subject": "...",
  "email_body": "...",
  "contact_form": "...",
  "parking_offer": "...",
  "tactical_notes": ["note 1", "note 2", "note 3"],
  "whois_tip": "one sentence on finding owner contact",
  "follow_up_timing": "when and how to follow up if no response"
}`
    );
    setData(res);
    setLoading(false);
  }, [setup, valuation]);

  return (
    <div className="appear">
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: v("ink"), marginBottom: 6 }}>
        Opening Offer Scripts
      </h2>
      <p style={{ fontSize: 13, color: v("ink3"), marginBottom: 18, lineHeight: 1.6 }}>
        Your first message sets the tone for everything. These scripts are designed to open negotiations
        without showing your hand. Edit them before sending.
      </p>

      {!data && (
        <PrimaryBtn onClick={run} loading={loading} full>
          {loading ? "Writing scripts..." : "Generate Opening Scripts"}
        </PrimaryBtn>
      )}

      {data && !data.error && (
        <div className="slide" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Notice text="Read and edit these before sending. Your own voice should come through." />

          <ScriptBox
            label="Email approach"
            text={`Subject: ${data.email_subject}\n\n${data.email_body}`}
            note="Best for domains with visible owner contact. Most professional approach."
          />
          <ScriptBox
            label="Contact form / short message"
            text={data.contact_form}
            note="Use when there is a contact form or limited character space."
          />
          <ScriptBox
            label="Parking page offer"
            text={data.parking_offer}
            note="Use when the domain has a 'make offer' interface."
          />

          <Card>
            <Label>Tactical Notes</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {data.tactical_notes?.map((n, i) => (
                <div key={i} style={{ display: "flex", gap: 10 }}>
                  <span style={{
                    color: v("amber"), fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11, flexShrink: 0, marginTop: 1,
                  }}>
                    0{i + 1}
                  </span>
                  <span style={{ fontSize: 12, color: v("ink2"), lineHeight: 1.6 }}>{n}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${v("border")}`, paddingTop: 12 }}>
              <p style={{ fontSize: 12, color: v("ink2"), marginBottom: 6 }}>
                <strong>Finding the owner:</strong> {data.whois_tip}
              </p>
              <p style={{ fontSize: 12, color: v("ink2") }}>
                <strong>If no response:</strong> {data.follow_up_timing}
              </p>
            </div>
          </Card>

          <div style={{ display: "flex", gap: 10 }}>
            <PrimaryBtn onClick={() => setData(null)}>Re-run</PrimaryBtn>
            <PrimaryBtn onClick={() => onNext(data)} full>
              I've sent my offer — handle responses →
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STAGE 4: COUNTER OFFER ────────────────────────────────────────────────────
function CounterStage({ setup, valuation, onNext, unlocked }) {
  const [response, setResponse]       = useState("");
  const [counterAmount, setCounter]   = useState("");
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const res = await callAI(
      `Counter-offer strategy for "${setup.domain}".

Buyer type: ${setup.userType}
Max budget: $${setup.maxBudget}
Opening anchor: ${valuation.opening_anchor}
Estimated range: ${valuation.estimated_range}
Seller response: ${response}
Seller counter amount: ${counterAmount || "not stated"}

Analyse what the seller's response signals and advise on the counter.

JSON only:
{
  "seller_signal": "what their response reveals",
  "recommended_counter": "$X",
  "recommended_counter_logic": "why",
  "counter_script": "ready-to-send message",
  "psychology_note": "key insight about this negotiation dynamic",
  "red_flags": ["flag 1"],
  "walk_away_signal": "what would indicate buyer should stop"
}`
    );
    setData(res);
    setLoading(false);
  }, [setup, valuation, response, counterAmount]);

  if (!unlocked) {
    return (
      <div className="appear">
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: v("ink"), marginBottom: 6 }}>
          Counter-Offer Strategy
        </h2>
        <p style={{ fontSize: 13, color: v("ink3"), marginBottom: 20, lineHeight: 1.6 }}>
          The seller has responded. This stage analyses their reply and gives you a precise counter-offer
          script — plus psychology coaching for this specific negotiation.
        </p>

        <Card amber style={{ textAlign: "center", padding: "28px 24px" }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20, color: v("ink"), marginBottom: 10,
          }}>
            Unlock the full negotiation workflow
          </div>
          <p style={{ fontSize: 13, color: v("ink3"), lineHeight: 1.6, maxWidth: 360, margin: "0 auto 20px" }}>
            Counter-offer scripts, walk-away analysis, and close guidance for this negotiation.
            One payment, no subscription.
          </p>
          <a
            href="https://YOUR_STORE.lemonsqueezy.com/checkout/buy/YOUR_PRODUCT_ID"
            style={{
              background: v("ink"), color: v("paper"),
              borderRadius: 5, padding: "13px 32px",
              fontSize: 16, fontFamily: "'Playfair Display', serif",
              display: "inline-block", textDecoration: "none",
            }}
          >
            $9 — Unlock this negotiation
          </a>
          <p style={{ fontSize: 11, color: v("ink4"), marginTop: 14 }}>
            One payment covers stages 4 and 5 for {setup.domain}
          </p>
        </Card>

        <div style={{ marginTop: 24 }}>
          <Label>Included after unlock</Label>
          <div style={{ marginTop: 10 }}>
            <Bullets items={[
              "Analysis of what the seller's response actually signals",
              "Precise counter-offer amount with reasoning",
              "Ready-to-send counter-offer script",
              "Psychology coaching for this negotiation",
              "Red flag detection — when to be cautious",
              "Walk-away signals — when to stop and move on",
            ]} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="appear">
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: v("ink"), marginBottom: 6 }}>
        Counter-Offer Strategy
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
        <div>
          <Label>What did the seller say?</Label>
          <textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            rows={4}
            placeholder="Paste or summarise their response here..."
          />
        </div>
        <div>
          <Label>Counter amount they named (if any)</Label>
          <input
            value={counterAmount}
            onChange={e => setCounter(e.target.value)}
            placeholder="e.g. $4,500 or 'not interested below $10k'"
          />
        </div>
      </div>

      {!data && (
        <PrimaryBtn onClick={run} loading={loading} disabled={!response} full>
          {loading ? "Analysing..." : "Analyse & Generate Counter"}
        </PrimaryBtn>
      )}

      {data && !data.error && (
        <div className="slide" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <Label>Seller Signal</Label>
            <p style={{ fontSize: 13, color: v("ink2"), lineHeight: 1.65, marginBottom: 10 }}>
              {data.seller_signal}
            </p>
            {data.psychology_note && (
              <p style={{
                fontSize: 12, color: v("amber"), fontStyle: "italic",
                borderTop: `1px solid ${v("border")}`, paddingTop: 10,
              }}>
                {data.psychology_note}
              </p>
            )}
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Label>Recommended Counter</Label>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: v("amber") }}>
                {data.recommended_counter}
              </span>
            </div>
            <p style={{ fontSize: 12, color: v("ink3"), lineHeight: 1.6 }}>
              {data.recommended_counter_logic}
            </p>
          </Card>

          <ScriptBox label="Counter-offer message" text={data.counter_script} />

          {data.red_flags?.length > 0 && (
            <Notice text={`Red flags: ${data.red_flags.join(" · ")}`} type="error" />
          )}

          <Card>
            <Label>Walk-Away Signal</Label>
            <p style={{ fontSize: 13, color: v("ink2"), lineHeight: 1.65 }}>
              {data.walk_away_signal}
            </p>
          </Card>

          <div style={{ display: "flex", gap: 10 }}>
            <PrimaryBtn onClick={() => setData(null)}>Re-run</PrimaryBtn>
            <PrimaryBtn onClick={() => onNext(data)} full>Deal reached / walk away →</PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STAGE 5: CLOSE / WALK AWAY ────────────────────────────────────────────────
function CloseStage({ setup, unlocked }) {
  const [outcome, setOutcome]     = useState(null);
  const [agreedPrice, setPrice]   = useState("");
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const res = await callAI(
      `Domain deal ${outcome} guidance for "${setup.domain}".
Buyer type: ${setup.userType}
${outcome === "deal" ? `Agreed price: $${agreedPrice}` : "Buyer is walking away."}

${outcome === "deal"
  ? "Give step-by-step closing guidance: escrow, transfer process, common mistakes."
  : "Give walk-away guidance: leaving door open, documenting the negotiation, finding alternatives."}

JSON only:
{
  "headline": "one sentence summary",
  "steps": [{"step": "title", "detail": "what to do and why"}],
  "key_warning": "most important thing not to get wrong",
  "escrow_recommendation": "which escrow and why (deal only, else omit)",
  "closing_note": "final honest observation"
}`
    );
    setData(res);
    setLoading(false);
  }, [setup, outcome, agreedPrice]);

  if (!unlocked) {
    return (
      <div className="appear" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: v("ink"), marginBottom: 10 }}>
          Close &amp; Transfer Guidance
        </div>
        <p style={{ fontSize: 13, color: v("ink3"), lineHeight: 1.6 }}>
          Unlock the full workflow for $9 to access closing and walk-away guidance.
        </p>
      </div>
    );
  }

  return (
    <div className="appear">
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: v("ink"), marginBottom: 6 }}>
        Close or Walk Away
      </h2>
      <p style={{ fontSize: 13, color: v("ink3"), marginBottom: 20, lineHeight: 1.6 }}>
        You have reached a decision point. Tell me what happened.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {[
          { val: "deal", label: "✓ Deal reached",  sub: "We agreed on a price",         color: v("green") },
          { val: "walk", label: "✗ Walking away",  sub: "Price too high or no response", color: v("red")   },
        ].map(opt => (
          <button
            key={opt.val}
            onClick={() => setOutcome(opt.val)}
            style={{
              flex: 1, padding: "14px 16px", borderRadius: 5, textAlign: "left",
              border: `1.5px solid ${outcome === opt.val ? opt.color : v("border")}`,
              background: outcome === opt.val
                ? (opt.val === "deal" ? "#e8f4ec" : "#faeaea")
                : "white",
              color: v("ink"),
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: v("ink3") }}>{opt.sub}</div>
          </button>
        ))}
      </div>

      {outcome === "deal" && (
        <div style={{ marginBottom: 16 }}>
          <Label>Agreed price</Label>
          <input
            type="number"
            value={agreedPrice}
            onChange={e => setPrice(e.target.value)}
            placeholder="e.g. 1800"
          />
        </div>
      )}

      {outcome && !data && (
        <PrimaryBtn
          onClick={run}
          loading={loading}
          disabled={outcome === "deal" && !agreedPrice}
          full
        >
          {loading ? "Generating guidance..." : "Get closing guidance"}
        </PrimaryBtn>
      )}

      {data && !data.error && (
        <div className="slide" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Notice text={data.headline} type={outcome === "deal" ? "ok" : "warn"} />

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {data.steps?.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: v("paper2"), border: `1px solid ${v("border")}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: v("ink3"),
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: v("ink"), marginBottom: 3 }}>
                    {s.step}
                  </div>
                  <div style={{ fontSize: 12, color: v("ink2"), lineHeight: 1.6 }}>
                    {s.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.key_warning && (
            <Notice text={`Warning: ${data.key_warning}`} type="error" />
          )}

          {data.escrow_recommendation && (
            <Card>
              <Label>Escrow</Label>
              <p style={{ fontSize: 13, color: v("ink2"), lineHeight: 1.65 }}>
                {data.escrow_recommendation}
              </p>
            </Card>
          )}

          {data.closing_note && (
            <p style={{
              fontSize: 12, color: v("ink3"), fontStyle: "italic",
              lineHeight: 1.65, borderTop: `1px solid ${v("border")}`, paddingTop: 14,
            }}>
              {data.closing_note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── TOKEN STORAGE KEY ─────────────────────────────────────────────────────────
const SESSION_KEY = "dn_unlocked_token";

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [stage, setStage]         = useState("setup");
  const [setup, setSetup]         = useState(null);
  const [valuation, setValuation] = useState(null);
  const [unlocked, setUnlocked]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  // On mount: check URL for ?order= param (Lemon Squeezy redirect)
  // or restore a valid token from sessionStorage
  useState(() => {
    const run = async () => {
      // 1. Check sessionStorage for a previously verified token this session
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        // Re-verify the stored token is still valid
        const res = await fetch("/.netlify/functions/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: stored }),
        }).catch(() => null);
        if (res?.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.valid) {
            setUnlocked(true);
            return;
          }
        }
        sessionStorage.removeItem(SESSION_KEY);
      }

      // 2. Check for ?order= in the URL (redirect back from Lemon Squeezy)
      const params  = new URLSearchParams(window.location.search);
      const orderId = params.get("order");
      if (!orderId) return;

      // Remove the query param from the URL cleanly
      window.history.replaceState({}, "", window.location.pathname);

      setVerifying(true);
      try {
        const res = await fetch("/.netlify/functions/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (data.valid && data.token) {
          sessionStorage.setItem(SESSION_KEY, data.token);
          setUnlocked(true);
          // Trigger PDF download automatically on successful unlock
          triggerPdfDownload();
        } else {
          setVerifyError("Payment could not be verified. Please contact support.");
        }
      } catch {
        setVerifyError("Network error during verification. Please refresh and try again.");
      } finally {
        setVerifying(false);
      }
    };
    run();
  }, []);

  const triggerPdfDownload = () => {
    const link = document.createElement("a");
    link.href  = "/domain-negotiator-guide.pdf";
    link.download = "domain-negotiator-guide.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const goTo = id => {
    setStage(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100vh", background: v("paper") }}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{
        background: v("ink"), padding: "14px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 17, color: v("paper"), letterSpacing: "0.5px",
          }}>
            Domain Negotiator
          </span>
          <span style={{
            fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
            color: v("ink4"), letterSpacing: "1.5px",
          }}>
            PRIVATE · IN-BROWSER ONLY
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {setup && (
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, color: v("amber"),
            }}>
              {setup.domain}
            </span>
          )}
          {unlocked && (
            <button
              onClick={triggerPdfDownload}
              style={{
                background: "transparent",
                border: `1px solid ${v("amber")}60`,
                color: v("amber"),
                borderRadius: 4,
                padding: "4px 11px",
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              ↓ Guide PDF
            </button>
          )}
        </div>
      </div>

      {/* VERIFICATION BANNER */}
      {verifying && (
        <div style={{
          background: "#fdf3e3",
          borderBottom: `1px solid ${v("amber")}40`,
          padding: "10px 24px",
          textAlign: "center",
          fontSize: 13, color: v("amber"),
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <Spinner /> Verifying your payment...
        </div>
      )}
      {verifyError && (
        <div style={{
          background: "#faeaea",
          borderBottom: `1px solid ${v("red")}40`,
          padding: "10px 24px",
          textAlign: "center",
          fontSize: 13, color: v("red"),
        }}>
          {verifyError}
        </div>
      )}
      {unlocked && !verifying && (
        <div style={{
          background: "#e8f4ec",
          borderBottom: `1px solid ${v("green")}40`,
          padding: "10px 24px",
          textAlign: "center",
          fontSize: 13, color: v("green"),
        }}>
          ✓ Full workflow unlocked — PDF guide downloading now
        </div>
      )}

      {/* MAIN */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 16px 80px" }}>
        <Progress current={stage} unlocked={unlocked} />

        {stage === "setup" && (
          <SetupStage onNext={form => { setSetup(form); goTo("value"); }} />
        )}
        {stage === "value" && setup && (
          <ValuationStage
            setup={setup}
            onNext={val => { setValuation(val); goTo("open"); }}
          />
        )}
        {stage === "open" && setup && valuation && (
          <OpenStage
            setup={setup}
            valuation={valuation}
            onNext={() => goTo("counter")}
          />
        )}
        {stage === "counter" && setup && valuation && (
          <CounterStage
            setup={setup}
            valuation={valuation}
            onNext={() => goTo("close")}
            unlocked={unlocked}
          />
        )}
        {stage === "close" && setup && (
          <CloseStage setup={setup} unlocked={unlocked} />
        )}
      </div>

      {/* FOOTER */}
      <div style={{
        borderTop: `1px solid ${v("border")}`,
        padding: "16px 24px",
        background: v("paper2"),
      }}>
        <p style={{
          fontSize: 11, color: v("ink4"),
          textAlign: "center", maxWidth: 500,
          margin: "0 auto", lineHeight: 1.7,
        }}>
          All valuations are AI estimates — not verified market data.
          Verify comparable sales on NameBio before making purchase decisions.
          Nothing in this tool constitutes financial or legal advice.
        </p>
      </div>
    </div>
  );
}
