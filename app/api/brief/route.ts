import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

type Brief = {
  designType: DesignType;
  flyerFold: FlyerFold;
  aspect: Aspect;
  location: "Sacramento, CA";
  audience: Audience;

  headline: string;
  subhead: string;
  cta: string;
  dateTime: string;
  keyPoints: string;

  monthTheme: string;
  stats: string;
  tipOfTheMonth: string;

  tone: Tone;
  density: Density;
  brandWords: string;
  palette: string;
  imageryPreference: string;
  doNotInclude: string;
  extraNotes: string;
};

function clampText(s: any, max = 200) {
  const v = typeof s === "string" ? s : "";
  return v.length > max ? v.slice(0, max) : v;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const designType: DesignType = body?.designType === "newsletter" ? "newsletter" : "flyer";
    const flyerFold: FlyerFold =
      body?.flyerFold === "bifold" || body?.flyerFold === "trifold" ? body.flyerFold : "single";
    const aspect: Aspect =
      body?.aspect === "a4" ||
      body?.aspect === "ig_story" ||
      body?.aspect === "ig_post" ||
      body?.aspect === "email_header" ||
      body?.aspect === "linkedin_banner"
        ? body.aspect
        : "a4";

    const audience: Audience =
      body?.audience === "buyer" || body?.audience === "seller" || body?.audience === "realtor" || body?.audience === "all"
        ? body.audience
        : "all";

    // Always locked
    const location: "Sacramento, CA" = "Sacramento, CA";

    // Optional user-provided hints
    const userHeadline = clampText(body?.headline, 120);
    const userSubhead = clampText(body?.subhead, 140);
    const userCta = clampText(body?.cta, 60);
    const userDateTime = clampText(body?.dateTime, 80);
    const userKeyPoints = clampText(body?.keyPoints, 160);

    const userMonthTheme = clampText(body?.monthTheme, 120);
    const userStats = clampText(body?.stats, 160);
    const userTip = clampText(body?.tipOfTheMonth, 140);

    const userTone = body?.tone as Tone | undefined;
    const userDensity = body?.density as Density | undefined;
    const userBrandWords = clampText(body?.brandWords, 160);
    const userPalette = clampText(body?.palette, 120);
    const userImagery = clampText(body?.imageryPreference, 160);
    const userDoNotInclude = clampText(body?.doNotInclude, 200);
    const extraNotes = clampText(body?.extraNotes, 240);

    const surpriseContent = body?.surpriseContent !== false; // default true
    const surpriseDirection = body?.surpriseDirection !== false; // default true

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Cheap + strong enough
    const model = "gpt-4.1-mini";

    const system = [
      "You are a highly paid, world-class graphic designer and creative director specializing in flyers and newsletters.",
      "You are conversion-aware: you optimize for clarity, hierarchy, and fast scanning.",
      "You make surprising but tasteful design and copy choices that still feel professional and brand-safe.",
      "You never output em-dashes. Use simple punctuation.",
      "Return JSON only, matching the provided schema. No extra keys.",
      "",
      "Hard constraints you must follow:",
      "- location is always Sacramento, CA",
      "- audience must be one of: buyer, seller, realtor, all",
      "- flyerFold must be one of: single, bifold, trifold",
      "- tone must be one of: premium_minimal, bold_modern, clean_corporate, warm_human, playful, luxury_editorial",
      "- density must be one of: airy, balanced, packed",
      "",
      "Copy rules:",
      "- Headline must be punchy and unique. Avoid generic cliches.",
      "- Subhead is one sentence, practical, value-forward.",
      "- CTA is 2 to 5 words, action-oriented.",
      "- Key points should be 3 to 5 items separated by ' • '",
      "",
      "Newsletter rules:",
      "- monthTheme is a short theme phrase.",
      "- stats is a short label-style line with 3 stat placeholders separated by ' • '.",
      "- tipOfTheMonth is one clear actionable tip line.",
      "",
      "Design direction rules:",
      "- palette should be 2 neutrals + 1 accent (written as comma-separated words).",
      "- brandWords should be 3 to 5 words, comma-separated.",
      "- imageryPreference should be specific and tasteful, not cheesy.",
      "- doNotInclude should be a strict list, comma-separated.",
    ].join("\n");

    const user = [
      `DesignType: ${designType}`,
      `FlyerFold: ${flyerFold}`,
      `Aspect: ${aspect}`,
      `Audience: ${audience}`,
      `Location: ${location}`,
      "",
      `User hints (may be empty):`,
      `headline: ${userHeadline}`,
      `subhead: ${userSubhead}`,
      `cta: ${userCta}`,
      `dateTime: ${userDateTime}`,
      `keyPoints: ${userKeyPoints}`,
      `monthTheme: ${userMonthTheme}`,
      `stats: ${userStats}`,
      `tipOfTheMonth: ${userTip}`,
      `tone: ${userTone || ""}`,
      `density: ${userDensity || ""}`,
      `brandWords: ${userBrandWords}`,
      `palette: ${userPalette}`,
      `imageryPreference: ${userImagery}`,
      `doNotInclude: ${userDoNotInclude}`,
      `extraNotes: ${extraNotes}`,
      "",
      `Surprise modes:`,
      `surpriseContent: ${surpriseContent ? "ON" : "OFF"}`,
      `surpriseDirection: ${surpriseDirection ? "ON" : "OFF"}`,
      "",
      "Task:",
      "- If surpriseContent is ON, propose best headline, subhead, cta, keyPoints (and newsletter sections if newsletter).",
      "- If surpriseContent is OFF, keep user-provided headline/subhead/cta/keyPoints as-is unless empty, then fill.",
      "- If surpriseDirection is ON, choose tone, density, brandWords, palette, imageryPreference, doNotInclude.",
      "- If surpriseDirection is OFF, keep provided tone/density/palette/brandWords/imagery if present, fill only if empty.",
      "",
      "Keep it professional, modern, and not like generic templates seen everywhere online.",
    ].join("\n");

    const response = await client.responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "brief",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              brief: {
                type: "object",
                additionalProperties: false,
                properties: {
                  designType: { type: "string", enum: ["flyer", "newsletter"] },
                  flyerFold: { type: "string", enum: ["single", "bifold", "trifold"] },
                  aspect: { type: "string", enum: ["a4", "ig_story", "ig_post", "email_header", "linkedin_banner"] },
                  location: { type: "string", enum: ["Sacramento, CA"] },
                  audience: { type: "string", enum: ["buyer", "seller", "realtor", "all"] },

                  headline: { type: "string" },
                  subhead: { type: "string" },
                  cta: { type: "string" },
                  dateTime: { type: "string" },
                  keyPoints: { type: "string" },

                  monthTheme: { type: "string" },
                  stats: { type: "string" },
                  tipOfTheMonth: { type: "string" },

                  tone: {
                    type: "string",
                    enum: [
                      "premium_minimal",
                      "bold_modern",
                      "clean_corporate",
                      "warm_human",
                      "playful",
                      "luxury_editorial",
                    ],
                  },
                  density: { type: "string", enum: ["airy", "balanced", "packed"] },
                  brandWords: { type: "string" },
                  palette: { type: "string" },
                  imageryPreference: { type: "string" },
                  doNotInclude: { type: "string" },
                  extraNotes: { type: "string" },
                },
                required: [
                  "designType",
                  "flyerFold",
                  "aspect",
                  "location",
                  "audience",
                  "headline",
                  "subhead",
                  "cta",
                  "dateTime",
                  "keyPoints",
                  "monthTheme",
                  "stats",
                  "tipOfTheMonth",
                  "tone",
                  "density",
                  "brandWords",
                  "palette",
                  "imageryPreference",
                  "doNotInclude",
                  "extraNotes",
                ],
              },
            },
            required: ["brief"],
          },
        },
      },
    });

    const text = response.output_text;
    const parsed = JSON.parse(text) as { brief: Brief };

    // Defensive fixups: enforce locked location
    parsed.brief.location = "Sacramento, CA";

    return Response.json({ ok: true, brief: parsed.brief });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
