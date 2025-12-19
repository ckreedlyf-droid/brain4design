"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BriefOk = {
  ok: true;
  remainingToday: number;
  brief: {
    title?: string;
    designType?: string;
    format?: string;
    renderSize?: { width: number; height: number };
    audience?: string;
    location?: string;

    // core outputs
    prompt?: string; // image prompt
    copy?: {
      headline?: string;
      subhead?: string;
      cta?: string;
      keyPoints?: string[];
      dateTime?: string;
    };
    layoutPlan?: any;
    designerNotes?: any;

    alternativeGenerators?: Array<{ name: string; url: string; note?: string }>;
  };
};

type BriefErr = {
  ok: false;
  error: string;
  code?: "COOLDOWN" | "DAILY_LIMIT" | "BAD_REQUEST" | "SERVER_ERROR";
  remainingToday?: number;
  cooldownSeconds?: number;
};

type GenOk = {
  ok: true;
  b64: string;
  remainingToday?: number;
  dailyLimit?: number;
  cooldownSeconds?: number;
};

type GenErr = {
  ok: false;
  error: string;
  code?: string;
  remainingToday?: number;
  dailyLimit?: number;
  cooldownSeconds?: number;
};

function isErr<T extends { ok: boolean }>(x: T): x is Extract<T, { ok: false }> {
  return x.ok === false;
}

export default function Home() {
  // ---- brief form state
  const [designType, setDesignType] = useState<"Flyer" | "Newsletter">("Flyer");
  const [format, setFormat] = useState<string>("A4 (print)");
  const [flyerFold, setFlyerFold] = useState<"Single" | "Bi-fold" | "Tri-fold">("Single");
  const [audience, setAudience] = useState<"buyer" | "seller" | "realtor" | "all">("buyer");
  const [location, setLocation] = useState<string>("Sacramento, CA");

  const [surpriseCopy, setSurpriseCopy] = useState(true);
  const [headline, setHeadline] = useState("");
  const [subhead, setSubhead] = useState("");
  const [cta, setCta] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [keyPoints, setKeyPoints] = useState("");

  const [surpriseDesign, setSurpriseDesign] = useState(true);
  const [tone, setTone] = useState("Bold Modern");
  const [density, setDensity] = useState("Balanced");
  const [brandWords, setBrandWords] = useState("trustworthy, innovative, dedicated");
  const [paletteHint, setPaletteHint] = useState("teal + orange accents, clean modern");

  // ---- outputs
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefRemaining, setBriefRemaining] = useState<number | null>(null);
  const [briefData, setBriefData] = useState<BriefOk["brief"] | null>(null);

  // ---- image generation
  const [genLoading, setGenLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  // ---- cooldown handling (brief)
  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  const cooldownTimer = useRef<number | null>(null);

  // ---- message
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(
    null
  );

  const renderSize = useMemo(() => {
    // keep it simple
    // Flyers: portrait by default
    if (designType === "Flyer") {
      if (format.includes("A4")) return { width: 1024, height: 1536 };
      return { width: 1024, height: 1536 };
    }
    // Newsletter: more letter-ish portrait
    return { width: 1024, height: 1536 };
  }, [designType, format]);

  const startCooldown = (seconds: number) => {
    setCooldownLeft(seconds);
    if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);

    cooldownTimer.current = window.setInterval(() => {
      setCooldownLeft((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);
          cooldownTimer.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);
    };
  }, []);

  const briefDisabled = briefLoading || cooldownLeft > 0;
  const canGenerateImage = !!briefData?.prompt && !genLoading;

  const statusLine = useMemo(() => {
    if (briefRemaining != null) return `Remaining today: ${briefRemaining}/10`;
    return "Remaining today: —";
  }, [briefRemaining]);

  const buildPayload = () => {
    const keys = keyPoints
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    return {
      designType,
      format,
      flyerFold: designType === "Flyer" ? flyerFold : undefined,
      renderSize,
      location,
      audience,

      surpriseCopy,
      copy: {
        headline: headline || undefined,
        subhead: subhead || undefined,
        cta: cta || undefined,
        dateTime: dateTime || undefined,
        keyPoints: keys.length ? keys : undefined,
      },

      surpriseDesign,
      designDirection: {
        tone,
        density,
        brandWords,
        paletteHint,
      },
    };
  };

  const requestBrief = async () => {
    setBriefLoading(true);
    setMessage(null);
    setBriefData(null);
    setImage(null);

    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      const data = (await res.json()) as BriefOk | BriefErr;

      // update remaining if present
      if (typeof (data as any).remainingToday === "number") setBriefRemaining((data as any).remainingToday);

      if (isErr(data)) {
        if (data.code === "COOLDOWN" && typeof data.cooldownSeconds === "number") {
          startCooldown(data.cooldownSeconds);
          setMessage({ type: "info", text: data.error });
        } else if (data.code === "DAILY_LIMIT") {
          setMessage({ type: "error", text: data.error });
        } else {
          setMessage({ type: "error", text: data.error || "Brief failed." });
        }
        return;
      }

      setBriefRemaining(data.remainingToday);
      setBriefData(data.brief);
      setMessage({ type: "success", text: "Brief ready. Review the prompt and notes, then generate an image if you want." });

      // cooldown 60s after brief call
      startCooldown(60);
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Network error while creating brief." });
    } finally {
      setBriefLoading(false);
    }
  };

  const generateImage = async () => {
    if (!briefData?.prompt) {
      setMessage({ type: "info", text: "Create a brief first so the designer brain can craft the best prompt." });
      return;
    }

    setGenLoading(true);
    setMessage(null);
    setImage(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: briefData.prompt,
          size: `${renderSize.width}x${renderSize.height}`,
        }),
      });

      const data = (await res.json()) as GenOk | GenErr;

      if (isErr(data)) {
        setMessage({ type: "error", text: data.error || "Failed to generate image." });
        return;
      }

      setImage(`data:image/png;base64,${data.b64}`);
      setMessage({ type: "success", text: "Image generated. Nice. Now iterate the brief for better results without wasting image calls." });
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Network error while generating image." });
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "#e7ecff",
        padding: 24,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        <header style={{ marginBottom: 14 }}>
          <h1 style={{ margin: 0, fontSize: 40, letterSpacing: -0.5 }}>Brain4Design</h1>
          <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.85 }}>
            Brief-first workflow (cheap), then image generation (costly) only after the “high-paid designer brain” decides the direction.
          </p>
        </header>

        {/* TOP BAR */}
        <section
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <button
            onClick={requestBrief}
            disabled={briefDisabled}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: briefDisabled ? "rgba(255,255,255,0.06)" : "rgba(120,140,255,0.20)",
              color: "#e7ecff",
              padding: "10px 14px",
              fontWeight: 800,
              cursor: briefDisabled ? "not-allowed" : "pointer",
            }}
          >
            {briefLoading ? "Creating brief..." : cooldownLeft > 0 ? `Brief cooldown (${cooldownLeft}s)` : "Create Brief"}
          </button>

          <button
            onClick={generateImage}
            disabled={!canGenerateImage}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: !canGenerateImage ? "rgba(255,255,255,0.06)" : "rgba(80,200,140,0.18)",
              color: "#e7ecff",
              padding: "10px 14px",
              fontWeight: 800,
              cursor: !canGenerateImage ? "not-allowed" : "pointer",
              opacity: !canGenerateImage ? 0.6 : 1,
            }}
            title={!briefData?.prompt ? "Create a brief first" : "Generate an image using the brief prompt"}
          >
            {genLoading ? "Generating image..." : "Generate Image (uses spend)"}
          </button>

          <div
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.25)",
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            {statusLine}
          </div>

          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Brief limit: 10/day per IP • Cooldown: 60s • Image calls are the expensive part
          </div>
        </section>

        {message && (
          <div
            style={{
              borderRadius: 16,
              padding: "12px 14px",
              border: "1px solid rgba(255,255,255,0.10)",
              background:
                message.type === "success"
                  ? "rgba(80,200,140,0.12)"
                  : message.type === "info"
                  ? "rgba(120,140,255,0.12)"
                  : "rgba(255,120,120,0.12)",
              marginBottom: 14,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 4 }}>
              {message.type === "success" ? "Success" : message.type === "info" ? "Heads up" : "Error"}
            </div>
            <div style={{ opacity: 0.9, lineHeight: 1.4 }}>{message.text}</div>
          </div>
        )}

        {/* MAIN GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 14 }}>
          {/* LEFT: BRIEF FORM */}
          <section
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>1) Brief Builder</div>

            <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Design type</label>
            <select
              value={designType}
              onChange={(e) => setDesignType(e.target.value as any)}
              style={selectStyle}
            >
              <option value="Flyer">Flyer</option>
              <option value="Newsletter">Newsletter</option>
            </select>

            <label style={labelStyle}>Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} style={selectStyle}>
              <option>A4 (print)</option>
              <option>US Letter (print)</option>
              <option>Social (1080x1350)</option>
            </select>

            {designType === "Flyer" && (
              <>
                <label style={labelStyle}>Flyer fold</label>
                <select value={flyerFold} onChange={(e) => setFlyerFold(e.target.value as any)} style={selectStyle}>
                  <option value="Single">Single</option>
                  <option value="Bi-fold">Bi-fold</option>
                  <option value="Tri-fold">Tri-fold</option>
                </select>
              </>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Audience</label>
                <select value={audience} onChange={(e) => setAudience(e.target.value as any)} style={selectStyle}>
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="realtor">Realtor</option>
                  <option value="all">All</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ height: 10 }} />

            <div style={{ fontWeight: 900, marginBottom: 8 }}>2) Content</div>

            <toggleRow
              title="Surprise me with the best headline/subhead/CTA"
              desc="When ON, the designer brain will refine your copy before generating."
              checked={surpriseCopy}
              onChange={setSurpriseCopy}
            />

            <label style={labelStyle}>Headline</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} style={inputStyle} placeholder="Optional" />

            <label style={labelStyle}>Subhead</label>
            <input value={subhead} onChange={(e) => setSubhead(e.target.value)} style={inputStyle} placeholder="Optional" />

            <label style={labelStyle}>CTA</label>
            <input value={cta} onChange={(e) => setCta(e.target.value)} style={inputStyle} placeholder="Optional" />

            <label style={labelStyle}>Date/Time (optional)</label>
            <input value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={inputStyle} placeholder="e.g., Sat 2PM" />

            <label style={labelStyle}>Key points (max 5, one per line)</label>
            <textarea
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              placeholder="• 3–5 bullets"
            />

            <div style={{ height: 10 }} />
            <div style={{ fontWeight: 900, marginBottom: 8 }}>3) Design direction</div>

            <toggleRow
              title="Surprise me with pro design choices"
              desc="When ON, the designer brain picks palette, imagery style, spacing, and hierarchy."
              checked={surpriseDesign}
              onChange={setSurpriseDesign}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} style={selectStyle}>
                  <option>Bold Modern</option>
                  <option>Clean Luxury</option>
                  <option>Warm Friendly</option>
                  <option>Corporate Minimal</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Density</label>
                <select value={density} onChange={(e) => setDensity(e.target.value)} style={selectStyle}>
                  <option>Airy</option>
                  <option>Balanced</option>
                  <option>Dense</option>
                </select>
              </div>
            </div>

            <label style={labelStyle}>Brand words</label>
            <input value={brandWords} onChange={(e) => setBrandWords(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Palette hint</label>
            <input value={paletteHint} onChange={(e) => setPaletteHint(e.target.value)} style={inputStyle} />

            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 10 }}>
              Render size: {renderSize.width}x{renderSize.height}
            </div>
          </section>

          {/* RIGHT: OUTPUT */}
          <section
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 14,
              minHeight: 520,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Designer Brain Output</div>

            {!briefData ? (
              <div style={{ opacity: 0.75, lineHeight: 1.6 }}>
                Create a brief first. This is the cheap step.
                <br />
                Once the prompt and notes look good, generate an image.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: image ? "1fr 360px" : "1fr", gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Image prompt (transparent)</div>
                  <textarea
                    value={briefData.prompt || ""}
                    readOnly
                    style={{
                      ...inputStyle,
                      minHeight: 140,
                      resize: "vertical",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                      fontSize: 12,
                      opacity: 0.95,
                    }}
                  />

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Refined copy</div>
                      <div style={cardStyle}>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>Headline</div>
                        <div style={{ fontWeight: 800 }}>{briefData.copy?.headline || "—"}</div>
                        <div style={{ height: 8 }} />
                        <div style={{ fontSize: 12, opacity: 0.7 }}>Subhead</div>
                        <div>{briefData.copy?.subhead || "—"}</div>
                        <div style={{ height: 8 }} />
                        <div style={{ fontSize: 12, opacity: 0.7 }}>CTA</div>
                        <div style={{ fontWeight: 700 }}>{briefData.copy?.cta || "—"}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Designer notes</div>
                      <div style={cardStyle}>
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontSize: 12,
                            lineHeight: 1.5,
                            opacity: 0.95,
                          }}
                        >
                          {JSON.stringify(briefData.designerNotes ?? {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {briefData.alternativeGenerators?.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Try other generators (optional)</div>
                      <div style={cardStyle}>
                        {briefData.alternativeGenerators.map((g, idx) => (
                          <div key={idx} style={{ padding: "8px 0", borderBottom: idx === briefData.alternativeGenerators!.length - 1 ? "none" : "1px solid rgba(255,255,255,0.08)" }}>
                            <div style={{ fontWeight: 800 }}>{g.name}</div>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>{g.note || ""}</div>
                            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{g.url}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {image && (
                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Generated image</div>
                    <div
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                        overflow: "hidden",
                        background: "rgba(0,0,0,0.25)",
                      }}
                    >
                      <img src={image} alt="Generated design" style={{ width: "100%", height: "auto", display: "block", background: "#fff" }} />
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
                      Tip: iterate the brief multiple times (cheap) before generating another image (costly).
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

// --- tiny helper “component” (no JSX component name conflict)
function toggleRow(props: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.22)",
        padding: 10,
        marginBottom: 10,
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 13 }}>{props.title}</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{props.desc}</div>
      </div>
      <button
        onClick={() => props.onChange(!props.checked)}
        style={{
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: props.checked ? "rgba(80,200,140,0.18)" : "rgba(255,255,255,0.06)",
          color: "#e7ecff",
          padding: "8px 12px",
          fontWeight: 900,
          cursor: "pointer",
          minWidth: 64,
          textAlign: "center",
        }}
      >
        {props.checked ? "ON" : "OFF"}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  opacity: 0.8,
  marginTop: 10,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.22)",
  color: "#e7ecff",
  padding: "10px 12px",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "10px 12px",
};

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.22)",
  padding: 12,
};
