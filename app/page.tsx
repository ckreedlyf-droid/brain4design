"use client";

import React, { useEffect, useMemo, useState } from "react";

type DesignType = "flyer" | "newsletter";
type FlyerFold = "single" | "bifold" | "trifold";
type Aspect = "a4" | "ig_story" | "ig_post" | "email_header" | "linkedin_banner";
type Tone =
  | "premium_minimal"
  | "bold_modern"
  | "clean_corporate"
  | "warm_human"
  | "playful"
  | "luxury_editorial";
type Density = "airy" | "balanced" | "packed";
type Audience = "buyer" | "seller" | "realtor" | "all";
type PresetId =
  | "event_flyer"
  | "real_estate_open_house"
  | "market_update"
  | "newsletter_weekly"
  | "newsletter_market";

type DesignerNotes = {
  concept?: string;
  hierarchy?: string[];
  layoutChoices?: string[];
  typography?: string[];
  colorLogic?: string[];
  whyEffective?: string[];
  improvements?: string[];
};

type FormState = {
  designType: DesignType;
  flyerFold: FlyerFold;
  aspect: Aspect;

  // locked
  location: "Sacramento, CA";

  // audience control
  audience: Audience;

  // content
  headline: string;
  subhead: string;
  cta: string;
  dateTime: string;
  keyPoints: string;

  // newsletter-only slots (optional)
  monthTheme: string; // theme within the month
  stats: string; // stats included section text
  tipOfTheMonth: string;

  // direction
  tone: Tone;
  density: Density;
  brandWords: string;
  palette: string;
  imageryPreference: string;
  doNotInclude: string;
  extraNotes: string;
};

// ---------- helpers ----------
function aspectToSize(a: Aspect): "1024x1024" | "1024x1536" | "1536x1024" {
  switch (a) {
    case "a4":
    case "ig_story":
      return "1024x1536";
    case "linkedin_banner":
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
      return "Airy";
    case "balanced":
      return "Balanced";
    case "packed":
      return "Packed";
  }
}

function audienceLabel(a: Audience) {
  switch (a) {
    case "buyer":
      return "Buyer";
    case "seller":
      return "Seller";
    case "realtor":
      return "Realtor/Agent";
    case "all":
      return "All (Buyer/Seller/Realtor)";
  }
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt(s: FormState) {
  const sizeHint =
    s.aspect === "email_header"
      ? "wide email newsletter header"
      : s.aspect === "linkedin_banner"
      ? "wide LinkedIn banner"
      : s.aspect === "ig_story"
      ? "vertical story format"
      : s.aspect === "a4"
      ? "vertical A4 flyer"
      : "square social post";

  const typeHint = s.designType === "newsletter" ? "newsletter design" : "flyer design";

  const foldHint =
    s.designType === "flyer"
      ? s.flyerFold === "single"
        ? "single-page flyer"
        : s.flyerFold === "bifold"
        ? "bi-fold brochure style (front cover + inside spread feel)"
        : "tri-fold brochure style (three columns, brochure feel)"
      : "";

  const densityHint =
    s.density === "airy"
      ? "Use generous whitespace. Clean premium spacing."
      : s.density === "packed"
      ? "Fit more info, but keep hierarchy and readability strong."
      : "Balanced spacing and hierarchy.";

  const directorVoice = `
You are a top-tier creative director and senior graphic designer who designs high-converting flyers and newsletters.
You obsess over hierarchy, spacing, contrast, and clarity. You make surprising but tasteful choices that still read instantly.
Produce a design that looks like it was made by a highly paid professional, not an AI image.
Avoid clutter. Keep typography clean and readable. Use a clear grid.
If text appears, keep it minimal and readable. Prefer blocks and layout structure over lots of small text.
`;

  const fixedLocation = `Sacramento, CA`;

  const newsletterBlocks =
    s.designType === "newsletter"
      ? `
NEWSLETTER SECTIONS (visual placeholders are OK):
- Theme of the month: "${s.monthTheme || "Monthly theme"}"
- Stats section: "${s.stats || "Key stats"}"
- Tip of the month: "${s.tipOfTheMonth || "Tip of the month"}"
`
      : "";

  const content = `
TYPE: ${typeHint} in ${sizeHint}.
${s.designType === "flyer" ? `FORMAT: ${foldHint}.` : ""}
AUDIENCE: ${audienceLabel(s.audience)}.
LOCATION: ${fixedLocation}.
TONE: ${toneLabel(s.tone)}.
DENSITY: ${densityLabel(s.density)}.

CONTENT (layout guidance):
- Headline: "${s.headline}"
- Subhead: "${s.subhead}"
- CTA: "${s.cta}"
${s.dateTime ? `- Date/Time: "${s.dateTime}"` : ""}
${s.keyPoints ? `- Key points: "${s.keyPoints}"` : ""}
${newsletterBlocks}

BRAND & STYLE:
- Brand words: ${s.brandWords || "premium, clean, trustworthy"}
- Palette: ${s.palette || "white, charcoal, muted accent"}
- Imagery preference: ${s.imageryPreference || "clean shapes + subtle gradients + modern real estate vibe"}

RULES:
- ${densityHint}
- Strong hierarchy: headline dominates, subhead supports, CTA is obvious.
- Align elements to a grid; consistent margins.
- Prioritize legibility on mobile.
- ${
    s.doNotInclude
      ? `Do not include: ${s.doNotInclude}`
      : "Do not include faces, clutter, busy patterns, or messy text."
  }
${s.extraNotes ? `EXTRA NOTES: ${s.extraNotes}` : ""}
`;

  return `${directorVoice}\n${content}`.trim();
}

// fallback “designer notes” until /api/advice is added
function fallbackNotes(s: FormState): DesignerNotes {
  return {
    concept:
      s.designType === "flyer"
        ? `A ${toneLabel(s.tone)} flyer built for fast scanning: headline → value → CTA, tuned for ${audienceLabel(
            s.audience
          )} in Sacramento.`
        : `A ${toneLabel(s.tone)} newsletter layout that guides the eye: theme → stats → tip, with a clean header + sections.`,
    hierarchy: [
      "1) Headline is the 1-second read (largest).",
      "2) Subhead clarifies value in one line.",
      "3) Key details are grouped and secondary.",
      "4) CTA is distinct, high-contrast, and easy to spot.",
    ],
    layoutChoices: [
      `Use a grid and consistent margins. ${s.density === "airy" ? "More whitespace for premium feel." : "Balanced spacing."}`,
      s.designType === "flyer"
        ? `Format: ${s.flyerFold} influences structure (columns/panels).`
        : "Newsletter: section blocks create predictable reading flow.",
      "Group related info into blocks to reduce mental load.",
    ],
    typography: ["Limit to 2 type styles.", "Bold headline, clean body, strong contrast.", "Avoid tiny text."],
    colorLogic: [
      `Palette direction: ${s.palette || "neutral + one accent"}.`,
      "Use one accent mainly for CTA and highlights.",
      "Keep background calm so headline wins.",
    ],
    whyEffective: [
      "Fast comprehension: viewer instantly understands what it is and what to do next.",
      "Hierarchy prevents a wall of text.",
      "Whitespace signals premium and increases readability.",
      "CTA stands out without being spammy.",
    ],
    improvements: [
      "If it feels generic: introduce one signature shape motif or diagonal band.",
      "If readability suffers: reduce key points to 3 bullets and increase padding.",
      "If CTA is weak: add a button shape or increase contrast and size.",
      "If busy: simplify background and remove small decorative elements.",
    ],
  };
}

// Optional: AI fill endpoint (you can add later). If not present, we fallback.
async function tryAIFill(input: Partial<FormState>) {
  try {
    const res = await fetch("/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.ok && data?.brief) return data.brief as Partial<FormState>;
    return null;
  } catch {
    return null;
  }
}

// Fallback “surprise me” generator: pro-ish, but cheap and reliable
function fallbackSurpriseFill(s: FormState): Partial<FormState> {
  const buyerHeadlines = [
    "Your Next Home, Made Simple",
    "Ready to Buy in Sacramento?",
    "Stop Scrolling. Start House-Hunting.",
    "New Listings. Real Guidance.",
  ];
  const sellerHeadlines = [
    "Sell Smarter in Sacramento",
    "Get Top Dollar, Without the Stress",
    "Your Home Deserves a Strategy",
    "List with Confidence",
  ];
  const realtorHeadlines = [
    "Agents: Win More Listings",
    "Elevate Your Real Estate Brand",
    "Marketing That Converts",
    "Stand Out in Sacramento",
  ];
  const allHeadlines = [
    "Sacramento Real Estate, Simplified",
    "Move with Confidence",
    "Your Next Step Starts Here",
    "Smart Moves. Real Results.",
  ];

  const subheads = [
    "Clear advice, clean process, and next-step clarity.",
    "No pressure. Just strategy and action.",
    "Fast answers, real guidance, better decisions.",
    "Modern marketing and real-world results.",
  ];

  const ctas = ["Book a Call", "Get a Free Home Valuation", "See Listings", "Ask an Agent", "Get Started"];

  const palettes = [
    "charcoal, white, muted gold accent",
    "deep navy, white, soft gray accent",
    "warm white, slate, sage accent",
    "black, white, a single bold accent color",
  ];

  const brandWords = [
    "premium, clean, high-trust, polished",
    "friendly, modern, confident, clear",
    "minimal, editorial, calm, premium",
    "bold, modern, direct, high-contrast",
  ];

  const imagery = [
    "clean geometric shapes + subtle gradients",
    "modern real estate vibe with abstract shapes, no faces",
    "editorial layout with large whitespace and one hero block",
    "clean grid, strong blocks, subtle line icons",
  ];

  const headline =
    s.audience === "buyer"
      ? pick(buyerHeadlines)
      : s.audience === "seller"
      ? pick(sellerHeadlines)
      : s.audience === "realtor"
      ? pick(realtorHeadlines)
      : pick(allHeadlines);

  const tone: Tone = pick(["clean_corporate", "premium_minimal", "bold_modern", "luxury_editorial"]);

  return {
    headline,
    subhead: pick(subheads),
    cta: pick(ctas),
    keyPoints:
      s.designType === "newsletter"
        ? "Market snapshot • Featured listing • Tip of the month"
        : "Local expertise • Clear next steps • No-pressure guidance",
    tone,
    density: pick(["airy", "balanced"] as Density[]),
    palette: pick(palettes),
    brandWords: pick(brandWords),
    imageryPreference: pick(imagery),
    doNotInclude: "no faces, no clutter, no messy typography, no busy patterns",
  };
}

// ---------- presets ----------
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
    label: "Flyer: Local Event Promo",
    type: "flyer",
    aspect: "a4",
    tone: "bold_modern",
    density: "balanced",
    starter: {
      flyerFold: "single",
      audience: "all",
      headline: "Sacramento Homebuyer Workshop",
      subhead: "Practical steps to buy with confidence",
      cta: "Reserve Your Seat",
      dateTime: "Sat • 2:00 PM",
      keyPoints: "Live Q&A • Market updates • Next-step checklist",
      brandWords: "confident, clean, energetic, trustworthy",
      palette: "deep navy, white, accent yellow",
      imageryPreference: "clean shapes + subtle gradients",
      doNotInclude: "no faces, no clutter, no messy typography",
      extraNotes: "",
    },
  },
  real_estate_open_house: {
    label: "Flyer: Real Estate Open House",
    type: "flyer",
    aspect: "a4",
    tone: "clean_corporate",
    density: "balanced",
    starter: {
      flyerFold: "single",
      audience: "buyer",
      headline: "OPEN HOUSE",
      subhead: "Modern 3BR Home, Prime Sacramento Location",
      cta: "Book a Viewing",
      dateTime: "Sun • 10 AM to 4 PM",
      keyPoints: "3BR • 2BA • Parking • Near amenities",
      brandWords: "premium, clean, high-trust, polished",
      palette: "white, charcoal, muted gold accent",
      imageryPreference: "modern real estate vibe with abstract shapes, no faces",
      doNotInclude: "no faces, no clutter, no busy patterns",
      extraNotes: "",
    },
  },
  market_update: {
    label: "Flyer: Market Update (Seller Focus)",
    type: "flyer",
    aspect: "ig_post",
    tone: "premium_minimal",
    density: "airy",
    starter: {
      flyerFold: "single",
      audience: "seller",
      headline: "Sacramento Market Update",
      subhead: "Know your home’s position before you decide",
      cta: "Get a Free Valuation",
      dateTime: "This Month",
      keyPoints: "Median price • Days on market • Buyer demand",
      brandWords: "clear, calm, trustworthy, premium",
      palette: "warm white, slate, muted accent",
      imageryPreference: "editorial layout with large whitespace and one hero block",
      doNotInclude: "no clutter, no tiny text",
      extraNotes: "",
    },
  },
  newsletter_weekly: {
    label: "Newsletter: Weekly Digest",
    type: "newsletter",
    aspect: "email_header",
    tone: "clean_corporate",
    density: "airy",
    starter: {
      audience: "all",
      headline: "This Week in Sacramento Real Estate",
      subhead: "Highlights, stats, and next steps",
      cta: "Read the Full Digest",
      dateTime: "Week of Dec 19",
      monthTheme: "Confidence in your next move",
      stats: "Median price • Days on market • New listings",
      tipOfTheMonth: "One simple step to improve your offer",
      keyPoints: "Featured listings • Market snapshot • Tip of the month",
      brandWords: "clear, structured, calm, competent",
      palette: "white, slate, accent blue",
      imageryPreference: "clean grid + subtle line icons",
      doNotInclude: "no clutter, no messy typography",
      extraNotes: "",
    },
  },
  newsletter_market: {
    label: "Newsletter: Monthly Market Note",
    type: "newsletter",
    aspect: "email_header",
    tone: "premium_minimal",
    density: "airy",
    starter: {
      audience: "all",
      headline: "Sacramento Monthly Market Note",
      subhead: "A clear snapshot for buyers and sellers",
      cta: "See the Summary",
      dateTime: "This Month",
      monthTheme: "Smart timing, smart decisions",
      stats: "Median sold price • Inventory • Interest rate trends",
      tipOfTheMonth: "One negotiation move most people miss",
      keyPoints: "Stats • Featured listing • Tip",
      brandWords: "minimal, editorial, calm, premium",
      palette: "charcoal, white, muted gold accent",
      imageryPreference: "editorial layout with whitespace and one accent band",
      doNotInclude: "no clutter, no tiny text",
      extraNotes: "",
    },
  },
};

export default function Home() {
  // Dark mode
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("b4d_dark");
    if (saved) setDark(saved === "true");
  }, []);
  useEffect(() => {
    localStorage.setItem("b4d_dark", String(dark));
  }, [dark]);

  const [preset, setPreset] = useState<PresetId>("real_estate_open_house");

  const initialState: FormState = useMemo(() => {
    const p = PRESETS[preset];
    const st = p.starter;

    return {
      designType: p.type,
      flyerFold: (st.flyerFold || "single") as FlyerFold,
      aspect: p.aspect,
      location: "Sacramento, CA",
      audience: (st.audience || "all") as Audience,

      headline: st.headline || "",
      subhead: st.subhead || "",
      cta: st.cta || "",
      dateTime: st.dateTime || "",
      keyPoints: st.keyPoints || "",

      monthTheme: st.monthTheme || "",
      stats: st.stats || "",
      tipOfTheMonth: st.tipOfTheMonth || "",

      tone: (st.tone || p.tone) as Tone,
      density: (st.density || p.density) as Density,
      brandWords: st.brandWords || "",
      palette: st.palette || "",
      imageryPreference: st.imageryPreference || "",
      doNotInclude: st.doNotInclude || "no faces, no clutter, no messy typography",
      extraNotes: st.extraNotes || "",
    };
  }, [preset]);

  const [form, setForm] = useState<FormState>(initialState);
  useEffect(() => setForm(initialState), [initialState]);

  // “Surprise me” switches
  const [surpriseContent, setSurpriseContent] = useState(true);
  const [surpriseDirection, setSurpriseDirection] = useState(true);

  const size = useMemo(() => aspectToSize(form.aspect), [form.aspect]);

  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [notes, setNotes] = useState<DesignerNotes | null>(null);
  const [rawPrompt, setRawPrompt] = useState<string>("");

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Smart fill: tries /api/brief, else fallback
  const applySurprise = async () => {
    const baseInput: Partial<FormState> = {
      designType: form.designType,
      flyerFold: form.flyerFold,
      aspect: form.aspect,
      audience: form.audience,
      location: form.location,
      // include what user already typed so AI can refine instead of overwrite
      headline: form.headline,
      subhead: form.subhead,
      cta: form.cta,
      dateTime: form.dateTime,
      keyPoints: form.keyPoints,
      monthTheme: form.monthTheme,
      stats: form.stats,
      tipOfTheMonth: form.tipOfTheMonth,
      tone: form.tone,
      density: form.density,
      brandWords: form.brandWords,
      palette: form.palette,
      imageryPreference: form.imageryPreference,
      doNotInclude: form.doNotInclude,
      extraNotes: form.extraNotes,
      // flags
      // (your /api/brief can respect these later)
      // @ts-ignore
      surpriseContent,
      // @ts-ignore
      surpriseDirection,
    };

    const ai = await tryAIFill(baseInput);
    if (ai) {
      setForm((prev) => ({
        ...prev,
        ...ai,
        location: "Sacramento, CA",
      }));
      return;
    }

    // fallback
    const fb = fallbackSurpriseFill(form);
    setForm((prev) => ({
      ...prev,
      ...(surpriseContent ? { headline: fb.headline!, subhead: fb.subhead!, cta: fb.cta!, keyPoints: fb.keyPoints! } : {}),
      ...(surpriseDirection
        ? {
            tone: fb.tone!,
            density: fb.density!,
            palette: fb.palette!,
            brandWords: fb.brandWords!,
            imageryPreference: fb.imageryPreference!,
            doNotInclude: fb.doNotInclude!,
          }
        : {}),
      location: "Sacramento, CA",
    }));
  };

  const generate = async () => {
    setLoading(true);
    setImage(null);
    setNotes(null);

    try {
      // If “surprise me” is on, we fill first (so prompt uses the best designer-picked inputs)
      if (surpriseContent || surpriseDirection) {
        await applySurprise();
      }

      // Build prompt AFTER any surprise fill
      const prompt = buildPrompt({
        ...form,
        location: "Sacramento, CA",
      });
      setRawPrompt(prompt);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          size, // your /api/generate can ignore this for now, still fine
          meta: {
            designType: form.designType,
            flyerFold: form.flyerFold,
            aspect: form.aspect,
            audience: form.audience,
            tone: form.tone,
            density: form.density,
          },
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(data.error || "Failed to generate image");
        setLoading(false);
        return;
      }

      setImage(`data:image/png;base64,${data.b64}`);
      setNotes(fallbackNotes(form));
    } catch (e: any) {
      alert(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI style tokens ----------
  const theme = useMemo(() => {
    if (dark) {
      return {
        bg: "#0b0d12",
        panel: "#111522",
        panel2: "#0f1320",
        text: "#e8eaf2",
        muted: "#a5adc0",
        border: "#222a3d",
        input: "#0c1020",
        inputBorder: "#2a3350",
        button: "#e8eaf2",
        buttonText: "#0b0d12",
        buttonAlt: "#1a2140",
        buttonAltText: "#e8eaf2",
        soft: "#0f152a",
      };
    }
    return {
      bg: "#f7f7fb",
      panel: "#ffffff",
      panel2: "#ffffff",
      text: "#111827",
      muted: "#6b7280",
      border: "#e5e7eb",
      input: "#ffffff",
      inputBorder: "#d1d5db",
      button: "#111827",
      buttonText: "#ffffff",
      buttonAlt: "#ffffff",
      buttonAltText: "#111827",
      soft: "#f3f4f6",
    };
  }, [dark]);

  const Card: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({
    title,
    children,
    right,
  }) => (
    <div
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: 16,
        background: theme.panel,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontWeight: 900, color: theme.text }}>{title}</div>
        {right}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );

  const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: 12, fontWeight: 800, color: theme.muted, marginBottom: 6 }}>{children}</div>
  );

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: `1px solid ${theme.inputBorder}`,
        background: theme.input,
        color: theme.text,
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
        borderRadius: 12,
        border: `1px solid ${theme.inputBorder}`,
        background: theme.input,
        color: theme.text,
        outline: "none",
        minHeight: 90,
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
        borderRadius: 12,
        border: `1px solid ${theme.inputBorder}`,
        background: theme.input,
        color: theme.text,
        outline: "none",
      }}
    />
  );

  const ToggleRow: React.FC<{
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
    hint?: string;
  }> = ({ label, value, onChange, hint }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 12,
        background: theme.soft,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div>
        <div style={{ fontWeight: 900, color: theme.text, fontSize: 13 }}>{label}</div>
        {hint ? <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{hint}</div> : null}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          borderRadius: 999,
          padding: "8px 12px",
          border: `1px solid ${theme.border}`,
          background: value ? theme.button : theme.buttonAlt,
          color: value ? theme.buttonText : theme.buttonAltText,
          fontWeight: 900,
          cursor: "pointer",
        }}
        type="button"
      >
        {value ? "ON" : "OFF"}
      </button>
    </div>
  );

  return (
    <main style={{ padding: 22, background: theme.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, color: theme.text }}>Brain4Design</h1>
            <p style={{ marginTop: 8, marginBottom: 0, color: theme.muted }}>
              Flyer + Newsletter studio with a “high-paid designer brain” and teach-you-why notes.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => setDark((v) => !v)}
              type="button"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                background: theme.panel2,
                color: theme.text,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {dark ? "Light Mode" : "Dark Mode"}
            </button>

            <button
              onClick={generate}
              disabled={loading}
              type="button"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                background: theme.button,
                color: theme.buttonText,
                fontWeight: 950,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Generating..." : "Generate Design"}
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: theme.border, margin: "16px 0" }} />

        {/* Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16 }}>
          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card title="1) Fast Start">
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
                  <Select value={form.designType} onChange={(e) => update("designType", e.target.value as DesignType)}>
                    <option value="flyer">Flyer</option>
                    <option value="newsletter">Newsletter</option>
                  </Select>
                </div>

                <div>
                  <Label>Format</Label>
                  <Select value={form.aspect} onChange={(e) => update("aspect", e.target.value as Aspect)}>
                    <option value="a4">A4 (print)</option>
                    <option value="ig_story">IG Story (9:16)</option>
                    <option value="ig_post">IG Post (1:1)</option>
                    <option value="email_header">Email Header (wide)</option>
                    <option value="linkedin_banner">LinkedIn Banner (wide)</option>
                  </Select>
                  <div style={{ marginTop: 6, fontSize: 12, color: theme.muted }}>
                    Render size: <b style={{ color: theme.text }}>{size}</b>
                  </div>
                </div>
              </div>

              {form.designType === "flyer" ? (
                <div style={{ marginTop: 10 }}>
                  <Label>Flyer fold</Label>
                  <Select value={form.flyerFold} onChange={(e) => update("flyerFold", e.target.value as FlyerFold)}>
                    <option value="single">Single</option>
                    <option value="bifold">Bi-fold</option>
                    <option value="trifold">Tri-fold</option>
                  </Select>
                </div>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <div>
                  <Label>Audience</Label>
                  <Select value={form.audience} onChange={(e) => update("audience", e.target.value as Audience)}>
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="realtor">Realtor/Agent</option>
                    <option value="all">All</option>
                  </Select>
                </div>

                <div>
                  <Label>Location</Label>
                  <Input value={form.location} disabled />
                </div>
              </div>
            </Card>

            <Card
              title="2) Content (what must be communicated)"
              right={
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={applySurprise}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: `1px solid ${theme.border}`,
                      background: theme.panel2,
                      color: theme.text,
                      fontWeight: 900,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Surprise Fill
                  </button>
                </div>
              }
            >
              <div style={{ display: "grid", gap: 10 }}>
                <ToggleRow
                  label="Surprise me with the best headline/subhead/CTA"
                  value={surpriseContent}
                  onChange={setSurpriseContent}
                  hint="When ON, the designer brain will pick or refine the copy before generating."
                />

                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <Label>Headline</Label>
                    <Input value={form.headline} onChange={(e) => update("headline", e.target.value)} />
                  </div>

                  <div>
                    <Label>Subhead</Label>
                    <Input value={form.subhead} onChange={(e) => update("subhead", e.target.value)} />
                  </div>

                  <div>
                    <Label>CTA</Label>
                    <Input value={form.cta} onChange={(e) => update("cta", e.target.value)} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <Label>Date/Time</Label>
                      <Input value={form.dateTime} onChange={(e) => update("dateTime", e.target.value)} />
                    </div>
                    <div>
                      <Label>Key points (3–5 max)</Label>
                      <Input value={form.keyPoints} onChange={(e) => update("keyPoints", e.target.value)} />
                    </div>
                  </div>

                  {form.designType === "newsletter" ? (
                    <>
                      <div style={{ height: 1, background: theme.border, margin: "6px 0" }} />
                      <div style={{ fontWeight: 900, color: theme.text, fontSize: 13 }}>Newsletter sections</div>

                      <div>
                        <Label>Theme of the month</Label>
                        <Input value={form.monthTheme} onChange={(e) => update("monthTheme", e.target.value)} />
                      </div>
                      <div>
                        <Label>Stats section</Label>
                        <Input value={form.stats} onChange={(e) => update("stats", e.target.value)} />
                      </div>
                      <div>
                        <Label>Tip of the month</Label>
                        <Input value={form.tipOfTheMonth} onChange={(e) => update("tipOfTheMonth", e.target.value)} />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card
              title="3) Design direction"
              right={
                <button
                  type="button"
                  onClick={applySurprise}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: `1px solid ${theme.border}`,
                    background: theme.panel2,
                    color: theme.text,
                    fontWeight: 900,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Surprise Direction
                </button>
              }
            >
              <div style={{ display: "grid", gap: 10 }}>
                <ToggleRow
                  label="Surprise me with pro design choices"
                  value={surpriseDirection}
                  onChange={setSurpriseDirection}
                  hint="When ON, the designer brain picks tone, palette, spacing, and imagery style."
                />

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

                <div>
                  <Label>Brand words</Label>
                  <Input value={form.brandWords} onChange={(e) => update("brandWords", e.target.value)} />
                </div>

                <div>
                  <Label>Palette</Label>
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
                  <Label>Extra notes</Label>
                  <Textarea value={form.extraNotes} onChange={(e) => update("extraNotes", e.target.value)} />
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card title="Preview">
              <div
                style={{
                  background: dark ? "#0c1020" : "#fafafa",
                  border: `1px solid ${theme.border}`,
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
                    style={{ width: "100%", height: "auto", borderRadius: 12, maxWidth: 820 }}
                  />
                ) : (
                  <div style={{ color: theme.muted, textAlign: "center" }}>
                    <div style={{ fontWeight: 950, marginBottom: 6, color: theme.text }}>
                      No design generated yet
                    </div>
                    <div style={{ fontSize: 13 }}>
                      Click <b style={{ color: theme.text }}>Generate Design</b>.
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: theme.muted }}>
                Tip: Keep key points short. Let layout do the heavy lifting.
              </div>
            </Card>

            <Card title="Designer Notes">
              {notes ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 950, color: theme.text, marginBottom: 6 }}>Concept</div>
                    <div style={{ fontSize: 13, color: theme.muted }}>{notes.concept}</div>

                    <div style={{ height: 1, background: theme.border, margin: "12px 0" }} />

                    <div style={{ fontWeight: 950, color: theme.text, marginBottom: 6 }}>Hierarchy</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: theme.muted }}>
                      {(notes.hierarchy || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>

                    <div style={{ height: 1, background: theme.border, margin: "12px 0" }} />

                    <div style={{ fontWeight: 950, color: theme.text, marginBottom: 6 }}>Layout choices</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: theme.muted }}>
                      {(notes.layoutChoices || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div style={{ fontWeight: 950, color: theme.text, marginBottom: 6 }}>Typography</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: theme.muted }}>
                      {(notes.typography || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>

                    <div style={{ height: 1, background: theme.border, margin: "12px 0" }} />

                    <div style={{ fontWeight: 950, color: theme.text, marginBottom: 6 }}>Color logic</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: theme.muted }}>
                      {(notes.colorLogic || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>

                    <div style={{ height: 1, background: theme.border, margin: "12px 0" }} />

                    <div style={{ fontWeight: 950, color: theme.text, marginBottom: 6 }}>Improvements</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: theme.muted }}>
                      {(notes.improvements || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div style={{ color: theme.muted, fontSize: 13 }}>
                  Generate a design to see strategy, hierarchy, and pro improvement notes.
                </div>
              )}
            </Card>

            <Card title="Prompt Transparency">
              <div
                style={{
                  fontSize: 12,
                  color: theme.text,
                  background: dark ? "#0c1020" : "#f3f4f6",
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12,
                  padding: 12,
                  whiteSpace: "pre-wrap",
                  maxHeight: 260,
                  overflow: "auto",
                }}
              >
                {rawPrompt || "Prompt will appear here after generating."}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
