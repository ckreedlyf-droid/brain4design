"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type BriefOk = {
  ok: true;
  remainingToday: number;
  brief: Brief;
};

type BriefErr = {
  ok: false;
  error: string;
  remainingToday?: number;
};

type Brief = {
  mode: "brief" | "copy";
  designType: "flyer" | "newsletter";
  flyerFold: "single" | "bifold" | "trifold" | null;
  format: string;
  renderSize: { width: number; height: number };
  location: string;
  audience: "buyer" | "seller" | "realtor" | "all";

  theme: {
    seasonContext: string;
    holidayReasoning: string[];
    takeItOrLeaveItSuggestions: string[];
  };

  copy: {
    headline: string;
    subhead: string;
    cta: string;
    dateTime: string;
    keyPoints: string[];
  };

  design: {
    tone: string;
    density: "minimal" | "balanced" | "dense";
    palette: string;
    imageryStyle: string;
    layoutStyle: string;
  };

  // IMPORTANT: This is what enables Generate Image
  prompt: string;

  designerNotes: {
    quickSummary: string;
    doThis: string[];
    avoidThis: string[];
    hierarchy: string[];
    spacingAndGrid: string[];
    typography: string[];
    colorLogic: string[];
    imagery: string[];
    foldAndPrintNotes: string[];
    exportChecklist: string[];
  };

  promptTransparency: {
    whatTheModelOptimizedFor: string[];
    whyThisWorks: string[];
    risksAndTradeoffs: string[];
  };

  alternativeGenerators?: { name: string; url: string; note?: string }[];
};

type GenOk = { ok: true; b64: string };
type GenErr = { ok: false; error: string };

function isErr<T extends { ok: boolean }>(x: T): x is Extract<T, { ok: false }> {
  return x.ok === false;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 900, marginBottom: 10, fontSize: 14 }}>{children}</div>;
}

function BulletList({ items }: { items: string[] }) {
  if (!items?.length) return <div style={{ opacity: 0.7 }}>—</div>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
      {items.map((x, i) => (
        <li key={i} style={{ marginBottom: 6 }}>
          {x}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  // ---- brief form state (UI-friendly)
  const [designType, setDesignType] = useState<"Flyer" | "Newsletter">("Flyer");
  const [format, setFormat] = useState<string>("A4 (print)");
  const [flyerFold, setFlyerFold] = useState<"Single" | "Bi-fold" | "Tri-fold">("Single");
  const [audience, setAudience] = useState<"buyer" | "seller" | "realtor" | "all">("buyer");
  const [location, setLocation] = useState<string>("Sacramento, CA");

  // Content inputs
  const [surpriseCopy, setSurpriseCopy] = useState(true);
  const [headline, setHeadline] = useState("");
  const [subhead, setSubhead] = useState("");
  const [cta, setCta] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [keyPointsText, setKeyPointsText] = useState("• Short bullet\n• Short bullet\n• Short bullet");

  // Design direction
  const [surpriseDesign, setSurpriseDesign] = useState(true);
  const [tone, setTone] = useState("Bold Modern");
  const [density, setDensity] = useState<"minimal" | "balanced" | "dense">("balanced");
  const [brandWords, setBrandWords] = useState("trustworthy, innovative, dedicated");
  const [paletteHint, setPaletteHint] = useState("teal + orange accents, clean modern");
  const [imageryHint, setImageryHint] = useState("");

  // ---- outputs
  const [briefLoading, setBriefLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [briefRemaining, setBriefRemaining] = useState<number | null>(null);
  const [briefData, setBriefData] = useState<Brief | null>(null);

  // ---- image generation
  const [genLoading, setGenLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  // ---- cooldown handling
  const [briefCooldownLeft, setBriefCooldownLeft] = useState<number>(0); // 60s after Create Brief
  const [copyCooldownLeft, setCopyCooldownLeft] = useState<number>(0); // 10s after Surprise Copy
  const briefTimer = useRef<number | null>(null);
  const copyTimer = useRef<number | null>(null);

  // ---- message
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const renderSize = useMemo(() => {
    // keep it simple
    if (format.includes("Social")) return { width: 1024, height: 1536 };
    return { width: 1024, height: 1536 };
  }, [format]);

  const statusLine = useMemo(() => {
    if (briefRemaining != null) return `Remaining today: ${briefRemaining}/10`;
    return "Remaining today: —";
  }, [briefRemaining]);

  const keyPoints = useMemo(() => {
    return keyPointsText
      .split("\n")
      .map((s) => s.replace(/^•\s?/, "").trim())
      .filter(Boolean)
      .slice(0, 6);
  }, [keyPointsText]);

  const startTimer = (kind: "brief" | "copy", seconds: number) => {
    if (kind === "brief") {
      setBriefCooldownLeft(seconds);
      if (briefTimer.current) window.clearInterval(briefTimer.current);
      briefTimer.current = window.setInterval(() => {
        setBriefCooldownLeft((prev) => {
          if (prev <= 1) {
            if (briefTimer.current) window.clearInterval(briefTimer.current);
            briefTimer.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCopyCooldownLeft(seconds);
      if (copyTimer.current) window.clearInterval(copyTimer.current);
      copyTimer.current = window.setInterval(() => {
        setCopyCooldownLeft((prev) => {
          if (prev <= 1) {
            if (copyTimer.current) window.clearInterval(copyTimer.current);
            copyTimer.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (briefTimer.current) window.clearInterval(briefTimer.current);
      if (copyTimer.current) window.clearInterval(copyTimer.current);
    };
  }, []);

  const buildPayload = () => {
    return {
      designType, // "Flyer" | "Newsletter" (API now accepts and normalizes)
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
        keyPoints: keyPoints.length ? keyPoints : undefined,
      },

      surpriseDesign,
      designDirection: {
        tone,
        density,
        brandWords,
        paletteHint,
        imageryHint,
      },
    };
  };

  const requestBrief = async () => {
    if (briefLoading || briefCooldownLeft > 0) return;
    setBriefLoading(true);
    setMessage(null);
    setImage(null);

    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "brief", ...buildPayload() }),
      });

      const data = (await res.json()) as BriefOk | BriefErr;

      if (typeof (data as any).remainingToday === "number") setBriefRemaining((data as any).remainingToday);

      if (isErr(data)) {
        setMessage({ type: "error", text: data.error || "Brief failed." });
        return;
      }

      setBriefData(data.brief);
      setBriefRemaining(data.remainingToday);

      // Fill your inputs with refined copy (optional, but feels “smart”)
      if (data.brief?.copy) {
        setHeadline(data.brief.copy.headline || "");
        setSubhead(data.brief.copy.subhead || "");
        setCta(data.brief.copy.cta || "");
        setDateTime(data.brief.copy.dateTime || "");
        if (data.brief.copy.keyPoints?.length) setKeyPointsText(data.brief.copy.keyPoints.map((k) => `• ${k}`).join("\n"));
      }

      setMessage({ type: "success", text: "Brief ready. Review the theme + notes. Then generate an image when you're happy." });
      startTimer("brief", 60);
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Network error while creating brief." });
    } finally {
      setBriefLoading(false);
    }
  };

  // Surprise Copy: cheap + short cooldown + does NOT regenerate everything
  const requestSurpriseCopy = async () => {
    if (!surpriseCopy) {
      setMessage({ type: "info", text: "Turn ON Surprise Copy first, then click Surprise Copy (10s)." });
      return;
    }
    if (copyLoading || copyCooldownLeft > 0) return;

    setCopyLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "copy", ...buildPayload() }),
      });

      const data = (await res.json()) as BriefOk | BriefErr;

      if (typeof (data as any).remainingToday === "number") setBriefRemaining((data as any).remainingToday);

      if (isErr(data)) {
        setMessage({ type: "error", text: data.error || "Copy refresh failed." });
        return;
      }

      // Merge: keep existing prompt/design if present, but overwrite theme+copy+notes
      setBriefData((prev) => {
        const base = prev ?? data.brief;
        return {
          ...base,
          theme: data.brief.theme,
          copy: data.brief.copy,
          designerNotes: data.brief.designerNotes,
          promptTransparency: data.brief.promptTransparency,
          // Keep prompt stable if you already had it (or take new)
          prompt: base?.prompt || data.brief.prompt,
          design: base?.design || data.brief.design,
        };
      });

      // Update form fields with refined copy
      setHeadline(data.brief.copy.headline || "");
      setSubhead(data.brief.copy.subhead || "");
      setCta(data.brief.copy.cta || "");
      setDateTime(data.brief.copy.dateTime || "");
      if (data.brief.copy.keyPoints?.length) setKeyPointsText(data.brief.copy.keyPoints.map((k) => `• ${k}`).join("\n"));

      setMessage({ type: "success", text: "Surprise Copy updated. Take it or leave it. Now you can generate image whenever ready." });
      startTimer("copy", 10);
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Network error while refining copy." });
    } finally {
      setCopyLoading(false);
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

      if (isErr(data as any)) {
        setMessage({ type: "error", text: (data as any).error || "Failed to generate image." });
        return;
      }

      setImage(`data:image/png;base64,${(data as GenOk).b64}`);
      setMessage({ type: "success", text: "Image generated. Next: iterate brief/copy (cheap) before spending again." });
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Network error while generating image." });
    } finally {
      setGenLoading(false);
    }
  };

  const briefDisabled = briefLoading || briefCooldownLeft > 0;
  const copyDisabled = copyLoading || copyCooldownLeft > 0 || !surpriseCopy;
  const canGenerateImage = !!briefData?.prompt && !genLoading;

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
          <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.85 }}>
            Brief-first workflow (cheap), then image generation (costly) only after the “highest-paid designer brain” chooses the direction.
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
          <button onClick={requestBrief} disabled={briefDisabled} style={btnStyle(briefDisabled, "primary")}>
            {briefLoading ? "Creating brief..." : briefCooldownLeft > 0 ? `Brief cooldown (${briefCooldownLeft}s)` : "Create Brief (cheap)"}
          </button>

          <button onClick={requestSurpriseCopy} disabled={copyDisabled} style={btnStyle(copyDisabled, "secondary")}>
            {copyLoading ? "Refreshing copy..." : copyCooldownLeft > 0 ? `Surprise Copy cooldown (${copyCooldownLeft}s)` : "Surprise Copy (10s)"}
          </button>

          <button onClick={generateImage} disabled={!canGenerateImage} style={btnStyle(!canGenerateImage, "green")} title={!briefData?.prompt ? "Create a brief first" : "Generate an image using the brief prompt"}>
            {genLoading ? "Generating image..." : "Generate Image (spend)"}
          </button>

          <div style={pillStyle}>{statusLine}</div>

          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Brief limit: 10/day per IP • Brief cooldown: 60s • Surprise Copy cooldown: 10s • Image calls are the expensive part
          </div>
        </section>

        {message && (
          <div style={alertStyle(message.type)}>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>{message.type === "success" ? "Success" : message.type === "info" ? "Heads up" : "Error"}</div>
            <div style={{ opacity: 0.92, lineHeight: 1.45 }}>{message.text}</div>
          </div>
        )}

        {/* MAIN GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 14 }}>
          {/* LEFT: BRIEF FORM */}
          <section style={panelStyle}>
            <SectionTitle>Brief Builder</SectionTitle>

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

            <div style={{ height: 14 }} />

            <SectionTitle>Content</SectionTitle>

            <ToggleRow
              title="Surprise me with the best headline/subhead/CTA + theme"
              desc="When ON, use seasonal context + audience intent to rewrite your copy. Then click Surprise Copy (10s)."
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

            <label style={labelStyle}>Key points (max 6, one per line)</label>
            <textarea value={keyPointsText} onChange={(e) => setKeyPointsText(e.target.value)} style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} />

            <div style={{ height: 14 }} />

            <SectionTitle>Design direction</SectionTitle>

            <ToggleRow
              title="Surprise me with pro design choices"
              desc="When ON, the designer picks palette, spacing, hierarchy, and imagery style."
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
                <select value={density} onChange={(e) => setDensity(e.target.value as any)} style={selectStyle}>
                  <option value="minimal">minimal</option>
                  <option value="balanced">balanced</option>
                  <option value="dense">dense</option>
                </select>
              </div>
            </div>

            <label style={labelStyle}>Brand words</label>
            <input value={brandWords} onChange={(e) => setBrandWords(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Palette hint</label>
            <input value={paletteHint} onChange={(e) => setPaletteHint(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Imagery hint (optional)</label>
            <input value={imageryHint} onChange={(e) => setImageryHint(e.target.value)} style={inputStyle} placeholder="e.g. cozy holiday photo, modern icons, abstract shapes" />

            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 10 }}>
              Render size: {renderSize.width}x{renderSize.height}
            </div>
          </section>

          {/* RIGHT: OUTPUT */}
          <section style={{ ...panelStyle, minHeight: 620 }}>
            <SectionTitle>Designer Brain Output</SectionTitle>

            {!briefData ? (
              <div style={{ opacity: 0.75, lineHeight: 1.65 }}>
                Start here: click <b>Create Brief (cheap)</b>.
                <br />
                If Surprise Copy is ON, click <b>Surprise Copy (10s)</b> to rewrite headline/subhead/CTA + theme.
                <br />
                When prompt + notes look right, generate an image.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: image ? "1fr 360px" : "1fr", gap: 14 }}>
                <div>
                  {/* THEME */}
                  <div style={cardStyle}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Theme and season context</div>
                    <div style={{ opacity: 0.9 }}>
                      <b>{briefData.theme?.seasonContext || "—"}</b>
                    </div>
                    <div style={{ height: 8 }} />
                    <div style={{ fontSize: 13, opacity: 0.9 }}>
                      <b>Reasoning</b>
                      <div style={{ height: 6 }} />
                      <BulletList items={briefData.theme?.holidayReasoning || []} />
                    </div>
                    <div style={{ height: 10 }} />
                    <div style={{ fontSize: 13, opacity: 0.9 }}>
                      <b>Take it or leave it</b>
                      <div style={{ height: 6 }} />
                      <BulletList items={briefData.theme?.takeItOrLeaveItSuggestions || []} />
                    </div>
                  </div>

                  {/* PROMPT */}
                  <div style={{ height: 12 }} />
                  <div style={cardStyle}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Image prompt (ready to use)</div>
                    <textarea
                      value={briefData.prompt || ""}
                      readOnly
                      style={{
                        ...inputStyle,
                        minHeight: 150,
                        resize: "vertical",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                        fontSize: 12,
                        opacity: 0.95,
                      }}
                    />
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
                      If Generate Image is disabled, it means prompt is empty. This build makes sure prompt is always returned.
                    </div>
                  </div>

                  {/* NOTES */}
                  <div style={{ height: 12 }} />
                  <div style={cardStyle}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Designer notes (editor-friendly)</div>

                    <div style={{ fontSize: 13, opacity: 0.95, marginBottom: 10 }}>
                      <b>Quick summary:</b> {briefData.designerNotes?.quickSummary || "—"}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>Do this</div>
                        <BulletList items={briefData.designerNotes?.doThis || []} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>Avoid this</div>
                        <BulletList items={briefData.designerNotes?.avoidThis || []} />
                      </div>
                    </div>

                    <div style={{ height: 12 }} />
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Hierarchy</div>
                    <BulletList items={briefData.designerNotes?.hierarchy || []} />

                    <div style={{ height: 12 }} />
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Spacing and grid</div>
                    <BulletList items={briefData.designerNotes?.spacingAndGrid || []} />

                    <div style={{ height: 12 }} />
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Typography</div>
                    <BulletList items={briefData.designerNotes?.typography || []} />

                    <div style={{ height: 12 }} />
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Color logic</div>
                    <BulletList items={briefData.designerNotes?.colorLogic || []} />

                    <div style={{ height: 12 }} />
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Imagery guidance</div>
                    <BulletList items={briefData.designerNotes?.imagery || []} />

                    <div style={{ height: 12 }} />
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Fold and print notes</div>
                    <BulletList items={briefData.designerNotes?.foldAndPrintNotes || []} />

                    <div style={{ height: 12 }} />
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Export checklist</div>
                    <BulletList items={briefData.designerNotes?.exportChecklist || []} />
                  </div>

                  {/* PROMPT TRANSPARENCY */}
                  <div style={{ height: 12 }} />
                  <div style={cardStyle}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Prompt transparency</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>Optimized for</div>
                        <BulletList items={briefData.promptTransparency?.whatTheModelOptimizedFor || []} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>Why it works</div>
                        <BulletList items={briefData.promptTransparency?.whyThisWorks || []} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>Risks and tradeoffs</div>
                        <BulletList items={briefData.promptTransparency?.risksAndTradeoffs || []} />
                      </div>
                    </div>
                  </div>

                  {briefData.alternativeGenerators?.length ? (
                    <>
                      <div style={{ height: 12 }} />
                      <div style={cardStyle}>
                        <div style={{ fontWeight: 900, marginBottom: 8 }}>Try other generators (optional)</div>
                        {briefData.alternativeGenerators.map((g, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: "10px 0",
                              borderBottom: idx === briefData.alternativeGenerators!.length - 1 ? "none" : "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <div style={{ fontWeight: 900 }}>{g.name}</div>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>{g.note || ""}</div>
                            <div style={{ fontSize: 12, opacity: 0.92, marginTop: 4 }}>{g.url}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>

                {image && (
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Generated image</div>
                    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", overflow: "hidden", background: "rgba(0,0,0,0.25)" }}>
                      <img src={image} alt="Generated design" style={{ width: "100%", height: "auto", display: "block", background: "#fff" }} />
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
                      Tip: iterate the brief/copy multiple times (cheap) before generating another image (costly).
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

function ToggleRow(props: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { title, desc, checked, onChange } = props;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <div>
        <div style={{ fontWeight: 900 }}>{title}</div>
        {desc ? <div style={{ opacity: 0.8, fontSize: 12.5, marginTop: 4, lineHeight: 1.4 }}>{desc}</div> : null}
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

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 14,
};

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

function btnStyle(disabled: boolean, variant: "primary" | "secondary" | "green") {
  const base: React.CSSProperties = {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#e7ecff",
    padding: "10px 14px",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };

  if (variant === "primary") return { ...base, background: disabled ? "rgba(255,255,255,0.06)" : "rgba(120,140,255,0.20)" };
  if (variant === "secondary") return { ...base, background: disabled ? "rgba(255,255,255,0.06)" : "rgba(180,160,255,0.16)" };
  return { ...base, background: disabled ? "rgba(255,255,255,0.06)" : "rgba(80,200,140,0.18)" };
}

const pillStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.25)",
  fontSize: 13,
  opacity: 0.9,
};

function alertStyle(type: "success" | "error" | "info"): React.CSSProperties {
  const bg =
    type === "success" ? "rgba(80,200,140,0.12)" : type === "info" ? "rgba(120,140,255,0.12)" : "rgba(255,120,120,0.12)";
  return {
    borderRadius: 16,
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: bg,
    marginBottom: 14,
  };
}
