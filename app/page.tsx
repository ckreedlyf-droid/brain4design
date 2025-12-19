"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type AltGen = { name: string; url: string; note?: string };

type BriefPayload = {
  designType: "Flyer" | "Newsletter";
  format: string;
  flyerFold?: "Single" | "Bi-fold" | "Tri-fold";
  renderSize: { width: number; height: number };
  location: string;
  audience: "buyer" | "seller" | "realtor" | "all";
  surpriseCopy: boolean;
  copy: {
    headline?: string;
    subhead?: string;
    cta?: string;
    dateTime?: string;
    keyPoints?: string[];
  };
  surpriseDesign: boolean;
  designDirection: {
    tone: string;
    density: string;
    brandWords: string;
    paletteHint: string;
  };
};

type BriefShape = {
  prompt?: string;
  copy?: { headline?: string; subhead?: string; cta?: string; dateTime?: string; keyPoints?: string[] };
  designerNotes?: any;
  alternativeGenerators?: AltGen[];
};

type BriefOk = { ok: true; remainingToday: number; brief: BriefShape };
type BriefErr = {
  ok: false;
  error: string;
  code?: "COOLDOWN" | "DAILY_LIMIT" | "BAD_REQUEST" | "SERVER_ERROR";
  cooldownSeconds?: number;
  remainingToday?: number;
};

type GenOk = { ok: true; b64: string };
type GenErr = { ok: false; error: string; code?: string };

function isErr<T extends { ok: boolean }>(x: T): x is Extract<T, { ok: false }> {
  return x.ok === false;
}

function ToggleRow(props: {
  title: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { title, desc, checked, onChange } = props;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        alignItems: "center",
        marginTop: 10,
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 13 }}>{title}</div>
        {desc ? <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4, lineHeight: 1.35 }}>{desc}</div> : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 56,
          height: 32,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: checked ? "rgba(99,102,241,0.85)" : "rgba(255,255,255,0.08)",
          position: "relative",
          cursor: "pointer",
          flexShrink: 0,
        }}
        aria-pressed={checked}
        title={checked ? "On" : "Off"}
      >
        <span
          style={{
            position: "absolute",
            top: 4,
            left: checked ? 28 : 4,
            width: 24,
            height: 24,
            borderRadius: 999,
            background: "rgba(255,255,255,0.92)",
            transition: "left 160ms ease",
          }}
        />
      </button>
    </div>
  );
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
  const [briefData, setBriefData] = useState<BriefShape | null>(null);

  // ---- image generation
  const [genLoading, setGenLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  // ---- cooldown handling (brief)
  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  const cooldownTimer = useRef<number | null>(null);

  // ---- message
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const renderSize = useMemo(() => {
    // Keep it simple for now: portrait outputs
    if (format.includes("Social")) return { width: 1024, height: 1536 };
    if (format.includes("US Letter")) return { width: 1024, height: 1536 };
    return { width: 1024, height: 1536 };
  }, [format]);

  const sizeString = useMemo(() => `${renderSize.width}x${renderSize.height}`, [renderSize]);

  const startCooldown = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    setCooldownLeft(s);

    if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);

    if (s <= 0) return;

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

  const buildPayload = (): BriefPayload => {
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
      location: location || "Sacramento, CA",
      audience,

      surpriseCopy,
      copy: {
        headline: headline.trim() || undefined,
        subhead: subhead.trim() || undefined,
        cta: cta.trim() || undefined,
        dateTime: dateTime.trim() || undefined,
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

      // update remaining if present (both ok and err may include it)
      if ("remainingToday" in data && typeof data.remainingToday === "number") {
        setBriefRemaining(data.remainingToday);
      }

      if (isErr(data)) {
        // Friendly messages
        if (data.code === "COOLDOWN") {
          const secs = typeof data.cooldownSeconds === "number" ? data.cooldownSeconds : 60;
          startCooldown(secs);
          setMessage({ type: "info", text: data.error || `Cooldown active. Try again in ${secs}s.` });
          return;
        }

        if (data.code === "DAILY_LIMIT" || res.status === 429) {
          setMessage({
            type: "error",
            text:
              data.error ||
              "Daily brief limit reached (10/day). Try again tomorrow, or reuse the same prompt with other generators below.",
          });
          return;
        }

        setMessage({ type: "error", text: data.error || "Brief failed. Please try again." });
        return;
      }

      setBriefRemaining(data.remainingToday);
      setBriefData(data.brief);

      setMessage({
        type: "success",
        text: "Brief ready. Review the prompt and notes. Generate an image only when the direction looks correct.",
      });

      // UI cooldown: always 60s after brief call (even if backend doesn't enforce)
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
          size: sizeString, // must match allowed sizes in your route.ts
        }),
      });

      const data = (await res.json()) as GenOk | GenErr;

      if (isErr(data)) {
        setMessage({
          type: "error",
          text: data.error || "Failed to generate image.",
        });
        return;
      }

      setImage(`data:image/png;base64,${data.b64}`);
      setMessage({
        type: "success",
        text: "Image generated. Pro tip: iterate the brief (cheap) several times before generating again (expensive).",
      });
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
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ marginBottom: 14 }}>
          <h1 style={{ margin: 0, fontSize: 40, letterSpacing: -0.5 }}>Brain4Design</h1>
          <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.85, lineHeight: 1.4 }}>
            Brief-first workflow (cheap), then image generation (costly) only after the “high-paid designer brain” chooses the direction.
          </p>
        </header>

        {/* TOP BAR (brief-first) */}
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
              fontWeight: 900,
              cursor: briefDisabled ? "not-allowed" : "pointer",
            }}
            title="Create a brief (cheap step)"
          >
            {briefLoading ? "Creating brief..." : cooldownLeft > 0 ? `Cooldown (${cooldownLeft}s)` : "Create Brief (cheap)"}
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
              fontWeight: 900,
              cursor: !canGenerateImage ? "not-allowed" : "pointer",
              opacity: !canGenerateImage ? 0.6 : 1,
            }}
            title={!briefData?.prompt ? "Create a brief first" : "Generate an image using the brief prompt (spend)"}
          >
            {genLoading ? "Generating..." : "Generate Image (spend)"}
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
            Brief limit: 10/day per IP • UI cooldown: 60s • Image calls are the expensive part
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
            <div style={{ fontWeight: 900, marginBottom: 4 }}>
              {message.type === "success" ? "Success" : message.type === "info" ? "Heads up" : "Error"}
            </div>
            <div style={{ opacity: 0.92, lineHeight: 1.4 }}>{message.text}</div>
          </div>
        )}

        {/* MAIN GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "420px 1fr",
            gap: 14,
          }}
        >
          {/* LEFT: BRIEF FORM */}
          <section
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Brief Builder</div>

            <label style={labelStyle}>Design type</label>
            <select value={designType} onChange={(e) => setDesignType(e.target.value as any)} style={selectStyle}>
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

            <div style={{ height: 12 }} />

            <div style={{ fontWeight: 900, marginBottom: 8 }}>Content</div>

            <ToggleRow
              title="Surprise me with the best headline/subhead/CTA"
              desc="When ON, the designer brain will refine your copy before generating."
              checked={surpriseCopy}
              onChange={setSurpriseCopy}
            />

            <label style={labelStyle}>Headline (optional)</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} style={inputStyle} placeholder="Leave blank to let the designer decide" />

            <label style={labelStyle}>Subhead (optional)</label>
            <input value={subhead} onChange={(e) => setSubhead(e.target.value)} style={inputStyle} placeholder="Leave blank to let the designer decide" />

            <label style={labelStyle}>CTA (optional)</label>
            <input value={cta} onChange={(e) => setCta(e.target.value)} style={inputStyle} placeholder="Leave blank to let the designer decide" />

            <label style={labelStyle}>Date/Time (optional)</label>
            <input value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={inputStyle} placeholder="e.g., Sat 2PM" />

            <label style={labelStyle}>Key points (max 5, one per line)</label>
            <textarea
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              placeholder={"• Short bullet\n• Short bullet\n• Short bullet"}
            />

            <div style={{ height: 12 }} />
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Design direction</div>

            <ToggleRow
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

            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>
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
              <div style={{ opacity: 0.78, lineHeight: 1.6 }}>
                Start here: click <b>Create Brief (cheap)</b>.
                <br />
                When the prompt and notes look right, then generate an image.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: image ? "1fr 360px" : "1fr", gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Image prompt (transparent)</div>
                  <textarea
                    value={briefData.prompt || ""}
                    readOnly
                    style={{
                      ...inputStyle,
                      minHeight: 150,
                      resize: "vertical",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                      fontSize: 12,
                      opacity: 0.95,
                    }}
                  />

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Refined copy</div>
                      <div style={cardStyle}>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>Headline</div>
                        <div style={{ fontWeight: 900 }}>{briefData.copy?.headline || "—"}</div>
                        <div style={{ height: 8 }} />
                        <div style={{ fontSize: 12, opacity: 0.7 }}>Subhead</div>
                        <div style={{ lineHeight: 1.35 }}>{briefData.copy?.subhead || "—"}</div>
                        <div style={{ height: 8 }} />
                        <div style={{ fontSize: 12, opacity: 0.7 }}>CTA</div>
                        <div style={{ fontWeight: 800 }}>{briefData.copy?.cta || "—"}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Designer notes</div>
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
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Try other generators (optional)</div>
                      <div style={cardStyle}>
                        {briefData.alternativeGenerators.map((g, idx) => (
                          <div
                            key={`${g.name}-${idx}`}
                            style={{
                              padding: "8px 0",
                              borderBottom:
                                idx === briefData.alternativeGenerators!.length - 1
                                  ? "none"
                                  : "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <div style={{ fontWeight: 900 }}>{g.name}</div>
                            {g.note ? <div style={{ fontSize: 12, opacity: 0.75 }}>{g.note}</div> : null}
                            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{g.url}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {image && (
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Generated image</div>
                    <div
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                        overflow: "hidden",
                        background: "rgba(0,0,0,0.25)",
                      }}
                    >
                      <img
                        src={image}
                        alt="Generated design"
                        style={{ width: "100%", height: "auto", display: "block", background: "#fff" }}
                      />
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
                      Tip: iterate the brief multiple times (cheap) before generating another image (costly).
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
          Note: Brief calls are capped at 10/day per IP to control spend. The goal is to teach users through prompt transparency and designer notes.
        </div>
      </div>

      {/* small responsive tweak */}
      <style jsx>{`
        @media (max-width: 980px) {
          main > div > div {
            max-width: 100% !important;
          }
          main div[style*="grid-template-columns: 420px 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
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
