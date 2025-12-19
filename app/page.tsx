"use client";

import { useMemo, useState } from "react";

type DesignType = "flyer" | "newsletter";
type FlyerFold = "single" | "bifold" | "trifold";
type Audience = "buyer" | "seller" | "realtor" | "all";
type Density = "minimal" | "balanced" | "dense";

type Brief = {
  designType: DesignType;
  flyerFold?: FlyerFold;
  format: string;
  renderSize: { width: number; height: number };
  location: string;
  audience: Audience;

  headline: string;
  subhead: string;
  cta: string;
  keyPoints: string[];

  tone: string;
  palette: string;
  imageryStyle: string;

  imagePrompt: string;
  designerNotes: {
    concept: string;
    hierarchy: string[];
    typography: string[];
    colorLogic: string[];
    layoutChoices: string[];
    improvements: string[];
  };

  promptTransparency: {
    whatTheModelOptimizedFor: string[];
    whyThisWorks: string[];
  };

  alternativeGenerators?: { name: string; url: string; note?: string }[];
};

export default function Home() {
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  const [designType, setDesignType] = useState<DesignType>("flyer");
  const [flyerFold, setFlyerFold] = useState<FlyerFold>("single");
  const [format, setFormat] = useState<string>("A4 (print)");
  const [location, setLocation] = useState<string>("Sacramento, CA");
  const [audience, setAudience] = useState<Audience>("buyer");

  // Content controls
  const [surpriseCopy, setSurpriseCopy] = useState(true);
  const [headline, setHeadline] = useState("Unlock Your Dream Home Today in Sacramento");
  const [subhead, setSubhead] = useState("Exclusive listings await. Find value and comfort in every corner.");
  const [cta, setCta] = useState("Schedule Your Private Tour Now!");
  const [keyPointsRaw, setKeyPointsRaw] = useState("Personalized home matching\nLocal market insights\nNew listings weekly");

  // Design direction controls
  const [surpriseDesign, setSurpriseDesign] = useState(true);
  const [tone, setTone] = useState("Bold Modern");
  const [density, setDensity] = useState<Density>("balanced");
  const [brandWords, setBrandWords] = useState("trustworthy, innovative, dedicated");
  const [paletteHint, setPaletteHint] = useState("teal + orange accents, clean contrast");
  const [imageryHint, setImageryHint] = useState("modern lifestyle, warm, optimistic, real-estate adjacent");

  // Output
  const [brief, setBrief] = useState<Brief | null>(null);
  const [image, setImage] = useState<string | null>(null);

  const keyPoints = useMemo(() => {
    return keyPointsRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
  }, [keyPointsRaw]);

  const renderSize = useMemo(() => {
    // Keep simple: A4-ish portrait render
    // You can expand formats later
    if (format.includes("A4")) return { width: 1024, height: 1536 };
    if (format.includes("Square")) return { width: 1024, height: 1024 };
    return { width: 1024, height: 1536 };
  }, [format]);

  const buildBrief = async () => {
    setLoadingBrief(true);
    setBrief(null);
    setImage(null);

    const payload = {
      designType,
      flyerFold: designType === "flyer" ? flyerFold : undefined,
      format,
      renderSize,
      location,
      audience,
      content: {
        surpriseCopy,
        headline,
        subhead,
        cta,
        keyPoints,
      },
      direction: {
        surpriseDesign,
        tone,
        density,
        brandWords,
        paletteHint,
        imageryHint,
      },
    };

    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Brief failed");

      setBrief(data.brief as Brief);
    } catch (e: any) {
      alert(e.message || "Brief failed");
    } finally {
      setLoadingBrief(false);
    }
  };

  const generateImage = async () => {
    if (!brief) {
      alert("Generate a brief first.");
      return;
    }
    setLoadingImage(true);
    setImage(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: brief.imagePrompt,
          size: `${brief.renderSize.width}x${brief.renderSize.height}`,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Image generation failed");

      setImage(`data:image/png;base64,${data.b64}`);
    } catch (e: any) {
      alert(e.message || "Image generation failed");
    } finally {
      setLoadingImage(false);
    }
  };

  const dark = {
    page: {
      minHeight: "100vh",
      background: "radial-gradient(1200px 700px at 10% 10%, #0b1020 0%, #060913 35%, #05060b 100%)",
      color: "#e8eefc",
      padding: 20,
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    } as React.CSSProperties,
    card: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 16,
      padding: 16,
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    } as React.CSSProperties,
    label: { fontSize: 12, opacity: 0.85 } as React.CSSProperties,
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(0,0,0,0.35)",
      color: "#e8eefc",
      outline: "none",
    } as React.CSSProperties,
    select: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(0,0,0,0.35)",
      color: "#e8eefc",
      outline: "none",
    } as React.CSSProperties,
    button: (primary?: boolean) =>
      ({
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: primary ? "rgba(124,92,255,0.95)" : "rgba(255,255,255,0.10)",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
      }) as React.CSSProperties,
    row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as React.CSSProperties,
    small: { fontSize: 12, opacity: 0.8 } as React.CSSProperties,
    hr: { border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "14px 0" } as React.CSSProperties,
  };

  return (
    <main style={dark.page}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 0.2 }}>Brain4Design</h1>
          <div style={{ opacity: 0.85 }}>
            Flyer + Newsletter studio with a “high-paid designer brain” and teach-you-why notes.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, marginTop: 16 }}>
          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section style={dark.card}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>1) Fast Start</div>

              <div style={dark.row}>
                <div>
                  <div style={dark.label}>Design type</div>
                  <select style={dark.select} value={designType} onChange={(e) => setDesignType(e.target.value as any)}>
                    <option value="flyer">Flyer</option>
                    <option value="newsletter">Newsletter</option>
                  </select>
                </div>

                <div>
                  <div style={dark.label}>Format</div>
                  <select style={dark.select} value={format} onChange={(e) => setFormat(e.target.value)}>
                    <option>A4 (print)</option>
                    <option>Square (social)</option>
                  </select>
                  <div style={dark.small}>Render size: {renderSize.width}x{renderSize.height}</div>
                </div>
              </div>

              {designType === "flyer" && (
                <div style={{ marginTop: 10 }}>
                  <div style={dark.label}>Flyer fold</div>
                  <select style={dark.select} value={flyerFold} onChange={(e) => setFlyerFold(e.target.value as any)}>
                    <option value="single">Single</option>
                    <option value="bifold">Bi-fold</option>
                    <option value="trifold">Tri-fold</option>
                  </select>
                </div>
              )}

              <div style={{ ...dark.row, marginTop: 10 }}>
                <div>
                  <div style={dark.label}>Audience</div>
                  <select style={dark.select} value={audience} onChange={(e) => setAudience(e.target.value as any)}>
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="realtor">Realtor</option>
                    <option value="all">All</option>
                  </select>
                </div>

                <div>
                  <div style={dark.label}>Location</div>
                  <input style={dark.input} value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>
            </section>

            <section style={dark.card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>2) Content (what must be communicated)</div>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <span style={dark.small}>Surprise Fill</span>
                  <input
                    type="checkbox"
                    checked={surpriseCopy}
                    onChange={(e) => setSurpriseCopy(e.target.checked)}
                    style={{ transform: "scale(1.2)" }}
                  />
                </label>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={dark.label}>Headline</div>
                <input style={dark.input} value={headline} onChange={(e) => setHeadline(e.target.value)} />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={dark.label}>Subhead</div>
                <input style={dark.input} value={subhead} onChange={(e) => setSubhead(e.target.value)} />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={dark.label}>CTA</div>
                <input style={dark.input} value={cta} onChange={(e) => setCta(e.target.value)} />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={dark.label}>Key points (3–5 max, one per line)</div>
                <textarea
                  style={{ ...dark.input, minHeight: 90, resize: "vertical" }}
                  value={keyPointsRaw}
                  onChange={(e) => setKeyPointsRaw(e.target.value)}
                />
              </div>
            </section>

            <section style={dark.card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>3) Design direction</div>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <span style={dark.small}>Surprise Direction</span>
                  <input
                    type="checkbox"
                    checked={surpriseDesign}
                    onChange={(e) => setSurpriseDesign(e.target.checked)}
                    style={{ transform: "scale(1.2)" }}
                  />
                </label>
              </div>

              <div style={{ ...dark.row, marginTop: 10 }}>
                <div>
                  <div style={dark.label}>Tone</div>
                  <select style={dark.select} value={tone} onChange={(e) => setTone(e.target.value)}>
                    <option>Bold Modern</option>
                    <option>Clean Minimal</option>
                    <option>Warm Premium</option>
                    <option>Editorial</option>
                  </select>
                </div>

                <div>
                  <div style={dark.label}>Density</div>
                  <select style={dark.select} value={density} onChange={(e) => setDensity(e.target.value as any)}>
                    <option value="minimal">Minimal</option>
                    <option value="balanced">Balanced</option>
                    <option value="dense">Dense</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={dark.label}>Brand words</div>
                <input style={dark.input} value={brandWords} onChange={(e) => setBrandWords(e.target.value)} />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={dark.label}>Palette hint</div>
                <input style={dark.input} value={paletteHint} onChange={(e) => setPaletteHint(e.target.value)} />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={dark.label}>Imagery hint</div>
                <input style={dark.input} value={imageryHint} onChange={(e) => setImageryHint(e.target.value)} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button style={dark.button(true)} onClick={buildBrief} disabled={loadingBrief}>
                  {loadingBrief ? "Building Brief..." : "Build Brief"}
                </button>
                <button style={dark.button()} onClick={generateImage} disabled={loadingImage || !brief}>
                  {loadingImage ? "Generating..." : "Generate Image"}
                </button>
              </div>

              <div style={{ ...dark.small, marginTop: 10 }}>
                Tip: Keep key points short. Let layout do the heavy lifting.
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section style={dark.card}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Preview</div>

              {image ? (
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <img src={image} alt="Generated design" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              ) : (
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px dashed rgba(255,255,255,0.18)",
                    padding: 18,
                    opacity: 0.85,
                  }}
                >
                  Generate a brief, then generate an image.
                </div>
              )}

              {brief?.imagePrompt && (
                <>
                  <div style={dark.hr} />
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Prompt transparency</div>
                  <div style={dark.small}>This is what the “designer brain” sent to the image model:</div>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      padding: 12,
                      borderRadius: 12,
                      marginTop: 8,
                      lineHeight: 1.4,
                      fontSize: 12,
                    }}
                  >
                    {brief.imagePrompt}
                  </pre>
                </>
              )}

              {brief?.alternativeGenerators?.length ? (
                <>
                  <div style={dark.hr} />
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Try other generators (optional)</div>
                  <div style={dark.small}>You can reuse the prompt above in these tools:</div>
                  <ul style={{ marginTop: 8 }}>
                    {brief.alternativeGenerators.map((x) => (
                      <li key={x.url} style={{ marginBottom: 6 }}>
                        <a href={x.url} target="_blank" rel="noreferrer" style={{ color: "#9fb6ff" }}>
                          {x.name}
                        </a>
                        {x.note ? <span style={{ ...dark.small, marginLeft: 8 }}>({x.note})</span> : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>

            <section style={dark.card}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Designer Notes</div>

              {brief ? (
                <>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Concept</div>
                  <div style={{ opacity: 0.9 }}>{brief.designerNotes.concept}</div>

                  <div style={dark.hr} />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>Hierarchy</div>
                      <ul>
                        {brief.designerNotes.hierarchy.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div style={{ fontWeight: 800 }}>Typography</div>
                      <ul>
                        {brief.designerNotes.typography.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div style={{ fontWeight: 800 }}>Color logic</div>
                      <ul>
                        {brief.designerNotes.colorLogic.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div style={{ fontWeight: 800 }}>Layout choices</div>
                      <ul>
                        {brief.designerNotes.layoutChoices.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {brief.designerNotes.improvements?.length ? (
                    <>
                      <div style={dark.hr} />
                      <div style={{ fontWeight: 800 }}>Improvements</div>
                      <ul>
                        {brief.designerNotes.improvements.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  <div style={dark.hr} />
                  <div style={{ fontWeight: 800 }}>Why it works</div>
                  <ul>
                    {brief.promptTransparency.whyThisWorks.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div style={{ opacity: 0.85 }}>Generate a brief to see pro-level notes.</div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
