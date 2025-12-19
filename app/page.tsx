"use client";

import React, { useMemo, useState } from "react";

type DesignType = "flyer" | "newsletter";
type Aspect = "a4" | "ig_story" | "ig_post" | "email_header" | "linkedin_banner";
type Tone =
  | "premium_minimal"
  | "bold_modern"
  | "clean_corporate"
  | "warm_human"
  | "playful"
  | "luxury_editorial";

type Density = "airy" | "balanced" | "packed";

type PresetId =
  | "event_flyer"
  | "real_estate_open_house"
  | "church_service"
  | "product_promo"
  | "newsletter_weekly"
  | "newsletter_product";

type DesignerNotes = {
  concept?: string;
  hierarchy?: string[];
  layoutChoices?: string[];
  typography?: string[];
  colorLogic?: string[];
  whyEffective?: string[];
  improvements?: string[];
};

const PRESETS: Record<
  PresetId,
  {
    label: string;
    type: DesignType;
    aspect: Aspect;
    tone: Tone;
    density: Density;
    starter: Partial<FormState>;
  }
> = {
  event_flyer: {
    label: "Event Flyer (Workshop / Meetup)",
    type: "flyer",
    aspect: "a4",
    tone: "bold_modern",
    density: "balanced",
    starter: {
      headline: "Marketing Workshop 2025",
      subhead: "Learn real strategies to grow your business",
      cta: "Register Now",
      dateTime: "Sat • Jan 20 • 2:00 PM",
      location: "Valenzuela City",
      audience: "Business owners, creators, freelancers",
      keyPoints: "Live training • Q&A • Networking",
      brandWords: "confident, clean, energetic, trustworthy",
      palette: "navy, white, accent yellow",
    },
  },
  real_estate_open_house: {
    label: "Real Estate Open House Flyer",
    type: "flyer",
    aspect: "a4",
    tone: "clean_corporate",
    density: "balanced",
    starter: {
      headline: "OPEN HOUSE",
      subhead: "Modern 3BR Home • Prime Location",
      cta: "Book a Viewing",
      dateTime: "Sun • 10 AM to 4 PM",
      location: "Bolinao, Pangasinan",
      audience: "Home buyers and investors",
      keyPoints: "3BR • 2BA • Parking • Near amenities",
      brandWords: "premium, clean, high-trust, polished",
      palette: "white, charcoal, muted gold",
    },
  },
  church_service: {
    label: "Church Service Flyer",
    type: "flyer",
    aspect: "ig_post",
    tone: "warm_human",
    density: "airy",
    starter: {
      headline: "Sunday Service",
      subhead: "Come as you are. Find rest and hope.",
      cta: "Join Us",
      dateTime: "Every Sunday • 9:00 AM",
      location: "CCF Valenzuela",
      audience: "Families, seekers, students",
      keyPoints: "Worship • Message • Fellowship",
      brandWords: "warm, welcoming, gentle, hopeful",
      palette: "warm beige, white, deep brown",
    },
  },
  product_promo: {
    label: "Product Promo Flyer",
    type: "flyer",
    aspect: "ig_story",
    tone: "luxury_editorial",
    density: "airy",
    starter: {
      headline: "Limited Drop",
      subhead: "Clean essentials. Premium feel.",
      cta: "Shop Now",
      dateTime: "This Weekend Only",
      location: "Online",
      audience: "Style-conscious buyers",
      keyPoints: "Limited stock • Free shipping over ₱999",
      brandWords: "minimal, premium, editorial, confident",
      palette: "cream, black, subtle copper",
    },
  },
  newsletter_weekly: {
    label: "Newsletter (Weekly Digest Header)",
    type: "newsletter",
    aspect: "email_header",
    tone: "clean_corporate",
    density: "airy",
    starter: {
      headline: "This Week’s Highlights",
      subhead: "Wins, updates, and what’s next",
      cta: "Read the Full Digest",
      dateTime: "Week of Dec 19",
      location: "",
      audience: "Team + community",
      keyPoints: "Key metrics • Top stories • Next steps",
      brandWords: "clear, structured, calm, competent",
      palette: "white, slate, accent blue",
    },
  },
  newsletter_product: {
    label: "Newsletter (Product Announcement Header)",
    type: "newsletter",
    aspect: "email_header",
    tone: "bold_modern",
    density: "balanced",
    starter: {
      headline: "New Feature: Smart Templates",
      subhead: "Create faster. Stay consistent.",
      cta: "See What’s New",
      dateTime: "Just launched",
      location: "",
      audience: "Users and subscribers",
      keyPoints: "New presets • Better exports • Faster flow",
      brandWords: "innovative, bold, modern, easy",
      palette: "dark teal, white, neon accent",
    },
  },
};

type FormState = {
  designType: DesignType;
  aspect: Aspect;
  tone: Tone;
  density: Density;

  headline: string;
  subhead: string;
  cta: string;

  dateTime: string;
  location: string;
  audience: string;
  keyPoints: string;

  brandWords: string;
  palette: string;

  imageryPreference: string; // e.g. "abstract shapes", "photo-like", "illustration"
  doNotInclude: string; // e.g. "no faces", "no clutter"
  extraNotes: string;
};

function aspectToSize(a: Aspect): "1024x1024" | "1024x1536" | "1536x1024" {
  // best-effort mapping to allowed sizes your current route uses
  switch (a) {
    case "a4":
      return "1024x1536";
    case "ig_story":
      return "1024x1536";
    case "linkedin_banner":
      return "1536x1024";
    case "email_header":
      return "1536x1024";
    case "ig_post":
    default:
      return "1024x1024";
  }
}

function toneLabel(t: Tone) {
  switch (t) {
    case "premium_minimal":
      return "Premium Minimal";
    case "bold_modern":
      return "Bold Modern";
    case "clean_corporate":
      return "Clean Corporate";
    case "warm_human":
      return "Warm Human";
    case "playful":
      return "Playful";
    case "luxury_editorial":
      return "Luxury Editorial";
  }
}

function densityLabel(d: Density) {
  switch (d) {
    case "airy":
      return "Airy (lots of whitespace)";
    case "balanced":
      return "Balanced";
    case "packed":
      return "Packed (information-dense)";
  }
}

function buildPrompt(s: FormState) {
  const sizeHint =
    s.aspect === "email_header"
      ? "wide header banner"
      : s.aspect === "linkedin_banner"
      ? "wide professional banner"
      : s.aspect === "ig_story"
      ? "vertical story format"
      : s.aspect === "a4"
      ? "vertical A4 flyer"
      : "square social post";

  const typeHint = s.designType === "newsletter" ? "newsletter header design" : "flyer design";

  const densityHint =
    s.density === "airy"
      ? "Use generous whitespace. Clear separation between sections."
      : s.density === "packed"
      ? "Fit more information, but keep hierarchy strong and readable."
      : "Balanced spacing and hierarchy.";

  const toneHint = toneLabel(s.tone);

  // “Paid designer brain” style instruction:
  const directorVoice = `
You are a top-tier creative director and senior graphic designer who designs high-converting flyers and newsletters.
You obsess over hierarchy, spacing, contrast, and clarity. You make surprising but tasteful choices that still read instantly.
Produce a design that looks like it was made by a highly paid professional, not an AI image.
Avoid messy text. If text appears, keep it minimal and readable. Use clear layout blocks and visual hierarchy.
`;

  const content = `
TYPE: ${typeHint} in ${sizeHint}.
TONE: ${toneHint}.
DENSITY: ${densityLabel(s.density)}.

CONTENT (use as layout guidance):
- Headline: "${s.headline}"
- Subhead: "${s.subhead}"
- CTA: "${s.cta}"
${s.dateTime ? `- Date/Time: "${s.dateTime}"` : ""}
${s.location ? `- Location: "${s.location}"` : ""}
${s.keyPoints ? `- Key points: "${s.keyPoints}"` : ""}
${s.audience ? `- Audience: "${s.audience}"` : ""}

BRAND & STYLE:
- Brand words: ${s.brandWords || "clean, clear, modern"}
- Color palette: ${s.palette || "neutral with one accent"}
- Imagery preference: ${s.imageryPreference || "abstract shapes / subtle patterns / modern gradients"}

RULES:
- ${densityHint}
- Strong hierarchy: headline dominates, subhead supports, CTA is obvious.
- Align elements to a grid; consistent margins.
- Prioritize legibility on mobile.
- ${s.doNotInclude ? `Do not include: ${s.doNotInclude}` : "No clutter. No over-decoration."}
${s.extraNotes ? `EXTRA NOTES: ${s.extraNotes}` : ""}
`;

  return `${directorVoice}\n${content}`.trim();
}

// If /api/advice is not yet implemented, we provide a solid “designer critique” fallback.
function fallbackNotes(s: FormState): DesignerNotes {
  const notes: DesignerNotes = {
    concept: `A ${toneLabel(s.tone)} ${s.designType === "flyer" ? "flyer" : "newsletter header"} built around fast scanning: headline → proof/value → CTA.`,
    hierarchy: [
      "1) Headline is the first 1 second read (largest).",
      "2) Subhead clarifies value in one line.",
      "3) Key details (date/location) are grouped and secondary.",
      "4) CTA is a distinct shape/button and high-contrast.",
    ],
    layoutChoices: [
      `Grid alignment with consistent margins (${s.density === "airy" ? "more whitespace for premium feel" : "balanced spacing"}).`,
      "Information grouped into blocks (reduces cognitive load).",
      "One focal area, one supporting area, one CTA area.",
    ],
    typography: [
      "Headline: bold sans, tight tracking, strong contrast.",
      "Body: clean sans with comfortable line-height.",
      "Limit to 2 type styles to keep it premium.",
    ],
    colorLogic: [
      `Palette direction: ${s.palette || "neutral + one accent"}.`,
      "Use one accent color mainly for CTA and small highlights (not everywhere).",
      "Keep background calm so text wins.",
    ],
    whyEffective: [
      "Fast comprehension: viewer understands what, for whom, and what to do next.",
      "Hierarchy prevents “wall of text.”",
      "CTA stands out without screaming.",
      "Looks consistent with real brand design systems.",
    ],
    improvements: [
      "If it feels bland: add one controlled visual element (shape, gradient band, or icon row).",
      "If readability suffers: increase padding and simplify key points to 3–5 items.",
      "If CTA is weak: increase contrast or add a subtle container/button shape.",
    ],
  };

  return notes;
}

export default function Home() {
  const [preset, setPreset] = useState<PresetId>("event_flyer");

  const initialState: FormState = useMemo(() => {
    const p = PRESETS[preset];
    return {
      designType: p.type,
      aspect: p.aspect,
      tone: p.tone,
      density: p.density,

      headline: p.starter.headline || "",
      subhead: p.starter.subhead || "",
      cta: p.starter.cta || "",

      dateTime: p.starter.dateTime || "",
      location: p.starter.location || "",
      audience: p.starter.audience || "",
      keyPoints: p.starter.keyPoints || "",

      brandWords: p.starter.brandWords || "",
      palette: p.starter.palette || "",

      imageryPreference: "abstract shapes + clean gradient accents",
      doNotInclude: "no faces, no clutter, no messy typography",
      extraNotes: "",
    };
  }, [preset]);

  const [form, setForm] = useState<FormState>(initialState);

  // When preset changes, reset form to that preset
  React.useEffect(() => {
    setForm(initialState);
  }, [initialState]);

  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [notes, setNotes] = useState<DesignerNotes | null>(null);
  const [rawPrompt, setRawPrompt] = useState<string>("");

  const size = useMemo(() => aspectToSize(form.aspect), [form.aspect]);

  const generate = async () => {
    setLoading(true);
    setImage(null);
    setNotes(null);

    const prompt = buildPrompt(form);
    setRawPrompt(prompt);

    try {
      // 1) Generate image
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          // your current backend might ignore these; UI sends them for future-proofing
          meta: {
            designType: form.designType,
            aspect: form.aspect,
            size,
            tone: form.tone,
            density: form.density,
          },
          // if you later support size in your route, you can use it
          size,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(data.error || "Failed to generate image");
        setLoading(false);
        return;
      }

      setImage(`data:image/png;base64,${data.b64}`);

      // 2) Request designer advice (optional endpoint)
      // If this endpoint doesn't exist yet, fallback notes will show.
      try {
        const adviceRes = await fetch("/api/advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief: form,
            prompt,
          }),
        });

        if (adviceRes.ok) {
          const adviceData = await adviceRes.json();
          // Expect { ok: true, notes: {...} }
          if (adviceData?.ok && adviceData?.notes) {
            setNotes(adviceData.notes as DesignerNotes);
          } else {
            setNotes(fallbackNotes(form));
          }
        } else {
          setNotes(fallbackNotes(form));
        }
      } catch {
        setNotes(fallbackNotes(form));
      }
    } catch (e: any) {
      alert(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>{children}</div>
  );

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: 10,
        outline: "none",
      }}
    />
  );

  const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: 10,
        outline: "none",
        minHeight: 84,
        resize: "vertical",
      }}
    />
  );

  const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: 10,
        outline: "none",
        background: "#fff",
      }}
    />
  );

  const Divider = () => <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0" }} />;

  return (
    <main style={{ padding: 24, background: "#f7f7fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Brain4Design</h1>
            <p style={{ marginTop: 8, marginBottom: 0, color: "#4b5563" }}>
              Flyer & newsletter designer brain: strategy-first, conversion-aware, and explains the “why.”
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={generate}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: loading ? "#111827" : "#111827",
                color: "#fff",
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Generating..." : "Generate Design"}
            </button>
          </div>
        </div>

        <Divider />

        {/* Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16 }}>
          {/* LEFT: Brief Builder */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card title="1) Choose a Preset (fast start)">
              <Label>Preset</Label>
              <Select value={preset} onChange={(e) => setPreset(e.target.value as PresetId)}>
                {Object.entries(PRESETS).map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.label}
                  </option>
                ))}
              </Select>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <div>
                  <Label>Design Type</Label>
                  <Select
                    value={form.designType}
                    onChange={(e) => update("designType", e.target.value as DesignType)}
                  >
                    <option value="flyer">Flyer</option>
                    <option value="newsletter">Newsletter</option>
                  </Select>
                </div>

                <div>
                  <Label>Format</Label>
                  <Select value={form.aspect} onChange={(e) => update("aspect", e.target.value as Aspect)}>
                    <option value="a4">A4 Flyer (vertical)</option>
                    <option value="ig_story">IG Story (9:16)</option>
                    <option value="ig_post">IG Post (1:1)</option>
                    <option value="email_header">Email Header (wide)</option>
                    <option value="linkedin_banner">LinkedIn Banner (wide)</option>
                  </Select>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                    Render size: <b>{size}</b>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="2) Content (what must be communicated)">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <Label>Headline</Label>
                  <Input value={form.headline} onChange={(e) => update("headline", e.target.value)} />
                </div>

                <div>
                  <Label>Subhead (1 line value)</Label>
                  <Input value={form.subhead} onChange={(e) => update("subhead", e.target.value)} />
                </div>

                <div>
                  <Label>CTA (call to action)</Label>
                  <Input value={form.cta} onChange={(e) => update("cta", e.target.value)} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <Label>Date/Time</Label>
                    <Input value={form.dateTime} onChange={(e) => update("dateTime", e.target.value)} />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={form.location} onChange={(e) => update("location", e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label>Key points (3–5 max)</Label>
                  <Input value={form.keyPoints} onChange={(e) => update("keyPoints", e.target.value)} />
                </div>

                <div>
                  <Label>Target audience</Label>
                  <Input value={form.audience} onChange={(e) => update("audience", e.target.value)} />
                </div>
              </div>
            </Card>

            <Card title="3) Design Direction (the ‘high-paid designer’ knobs)">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <Label>Tone</Label>
                  <Select value={form.tone} onChange={(e) => update("tone", e.target.value as Tone)}>
                    <option value="premium_minimal">Premium Minimal</option>
                    <option value="bold_modern">Bold Modern</option>
                    <option value="clean_corporate">Clean Corporate</option>
                    <option value="warm_human">Warm Human</option>
                    <option value="playful">Playful</option>
                    <option value="luxury_editorial">Luxury Editorial</option>
                  </Select>
                </div>

                <div>
                  <Label>Density</Label>
                  <Select value={form.density} onChange={(e) => update("density", e.target.value as Density)}>
                    <option value="airy">Airy</option>
                    <option value="balanced">Balanced</option>
                    <option value="packed">Packed</option>
                  </Select>
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <Label>Brand words (the vibe)</Label>
                  <Input value={form.brandWords} onChange={(e) => update("brandWords", e.target.value)} />
                </div>
                <div>
                  <Label>Palette (simple is best)</Label>
                  <Input value={form.palette} onChange={(e) => update("palette", e.target.value)} />
                </div>
                <div>
                  <Label>Imagery preference</Label>
                  <Input
                    value={form.imageryPreference}
                    onChange={(e) => update("imageryPreference", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Do not include</Label>
                  <Input value={form.doNotInclude} onChange={(e) => update("doNotInclude", e.target.value)} />
                </div>
                <div>
                  <Label>Extra notes (optional)</Label>
                  <Textarea value={form.extraNotes} onChange={(e) => update("extraNotes", e.target.value)} />
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT: Preview + Designer Notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card title="Preview">
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 720,
                    maxWidth: "100%",
                    background: "#fafafa",
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 14,
                    minHeight: 420,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt="Generated design"
                      style={{ width: "100%", height: "auto", borderRadius: 12 }}
                    />
                  ) : (
                    <div style={{ color: "#6b7280", textAlign: "center" }}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>No design generated yet</div>
                      <div style={{ fontSize: 13 }}>
                        Fill the brief on the left, then click <b>Generate Design</b>.
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Quick Checks</div>
                  <div style={{ fontSize: 13, color: "#374151", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>✅ Headline should be readable in 1 second.</div>
                    <div>✅ CTA must be obvious, not hidden.</div>
                    <div>✅ Limit key points to 3–5.</div>
                    <div>✅ Use one accent color for CTA + highlights.</div>
                    <div>✅ Leave breathing room (whitespace = premium).</div>
                  </div>

                  <Divider />

                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Prompt (for transparency)</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#111827",
                      background: "#f3f4f6",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      whiteSpace: "pre-wrap",
                      maxHeight: 220,
                      overflow: "auto",
                    }}
                  >
                    {rawPrompt || "Prompt will appear here after you generate."}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Designer Notes (why this works + how to improve)">
              {notes ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Concept</div>
                    <div style={{ fontSize: 13, color: "#374151" }}>{notes.concept}</div>

                    <Divider />

                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Hierarchy</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                      {(notes.hierarchy || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>

                    <Divider />

                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Layout choices</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                      {(notes.layoutChoices || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Typography</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                      {(notes.typography || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>

                    <Divider />

                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Color logic</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                      {(notes.colorLogic || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>

                    <Divider />

                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Why it’s effective</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                      {(notes.whyEffective || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>

                    <Divider />

                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Improvements</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                      {(notes.improvements || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  Generate a design to see design strategy, hierarchy, and pro-level improvement notes.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
