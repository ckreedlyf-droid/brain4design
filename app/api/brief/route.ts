import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---- super-simple in-memory limiter (OK for hobby/testing; resets on cold starts)
const briefCounts = new Map<string, { date: string; count: number }>();

type DesignType = "flyer" | "newsletter";
type FlyerFold = "single" | "bifold" | "trifold";
type Audience = "buyer" | "seller" | "realtor" | "all";
type Density = "minimal" | "balanced" | "dense";

function getIP(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return "unknown";
}

function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function takeDailyToken(ip: string, limit: number) {
  const date = todayKey();
  const cur = briefCounts.get(ip);
  if (!cur || cur.date !== date) {
    briefCounts.set(ip, { date, count: 1 });
    return { ok: true, remaining: limit - 1 };
  }
  if (cur.count >= limit) return { ok: false, remaining: 0 };
  cur.count += 1;
  briefCounts.set(ip, cur);
  return { ok: true, remaining: limit - cur.count };
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  }
}

function clampString(s: any, maxLen: number) {
  if (typeof s !== "string") return "";
  return s.slice(0, maxLen);
}

function isOneOf<T extends string>(v: any, allowed: readonly T[]): v is T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v);
}

export async function POST(req: Request) {
  try {
    const ip = getIP(req);
    const limit = 10;
    const gate = takeDailyToken(ip, limit);

    if (!gate.ok) {
      return Response.json(
        { ok: false, error: "Daily brief limit reached (10/day). Try again tomorrow." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // ---- Minimal validation + normalization
    const designTypeRaw = body?.designType;
    const formatRaw = body?.format;
    const renderSize = body?.renderSize;
    const location = clampString(body?.location || "Sacramento, CA", 80);
    const audienceRaw = body?.audience || "buyer";

    const allowedDesignTypes = ["flyer", "newsletter"] as const;
    const allowedFolds = ["single", "bifold", "trifold"] as const;
    const allowedAudience = ["buyer", "seller", "realtor", "all"] as const;
    const allowedDensity = ["minimal", "balanced", "dense"] as const;

    if (!isOneOf(designTypeRaw, allowedDesignTypes)) {
      return Response.json({ ok: false, error: "Invalid designType." }, { status: 400 });
    }
    const designType: DesignType = designTypeRaw;

    const format = clampString(formatRaw, 40);
    if (!format) {
      return Response.json({ ok: false, error: "Missing format." }, { status: 400 });
    }

    const width = Number(renderSize?.width);
    const height = Number(renderSize?.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 256 || height < 256 || width > 2048 || height > 2048) {
      return Response.json({ ok: false, error: "Invalid renderSize." }, { status: 400 });
    }

    const audience: Audience = isOneOf(audienceRaw, allowedAudience) ? audienceRaw : "buyer";

    // Optional inputs (capped)
    const flyerFold: FlyerFold | undefined =
      designType === "flyer" && isOneOf(body?.flyerFold, allowedFolds) ? body.flyerFold : undefined;

    const surpriseCopy = Boolean(body?.content?.surpriseCopy);
    const surpriseDesign = Boolean(body?.direction?.surpriseDesign);

    const headline = clampString(body?.content?.headline || "", 120);
    const subhead = clampString(body?.content?.subhead || "", 180);
    const cta = clampString(body?.content?.cta || "", 90);

    const keyPoints: string[] = Array.isArray(body?.content?.keyPoints)
      ? body.content.keyPoints
          .map((x: any) => clampString(x, 90))
          .filter(Boolean)
          .slice(0, 5)
      : [];

    const tone = clampString(body?.direction?.tone || "Bold Modern", 40);
    const density: Density = isOneOf(body?.direction?.density, allowedDensity) ? body.direction.density : "balanced";
    const brandWords = clampString(body?.direction?.brandWords || "", 120);
    const paletteHint = clampString(body?.direction?.paletteHint || "", 120);
    const imageryHint = clampString(body?.direction?.imageryHint || "", 140);

    // ---- Logging for auditing spend
    console.log("[/api/brief] ip=", ip, "designType=", designType, "audience=", audience, "size=", `${width}x${height}`, "remainingToday=", gate.remaining);

    const system = `
You are a highly-paid senior graphic designer specialized in flyers and newsletters.
You surprise the user with smart choices while staying practical and printable.
Return VALID JSON ONLY. No markdown. No code fences.

OUTPUT SHAPE (must include all keys):
{
  "designType": "flyer"|"newsletter",
  "flyerFold": "single"|"bifold"|"trifold"|null,
  "format": string,
  "renderSize": { "width": number, "height": number },
  "location": string,
  "audience": "buyer"|"seller"|"realtor"|"all",

  "headline": string,
  "subhead": string,
  "cta": string,
  "keyPoints": string[],

  "tone": string,
  "palette": string,
  "imageryStyle": string,

  "imagePrompt": string,

  "designerNotes": {
    "concept": string,
    "hierarchy": string[],
    "typography": string[],
    "colorLogic": string[],
    "layoutChoices": string[],
    "improvements": string[]
  },

  "promptTransparency": {
    "whatTheModelOptimizedFor": string[],
    "whyThisWorks": string[]
  }
}

RULES:
- Location defaults to Sacramento, CA.
- Audience is buyer/seller/realtor/all.
- If surpriseCopy is true, rewrite headline/subhead/cta to be stronger for that audience in that location.
- If surpriseDesign is true, choose palette + imageryStyle + layout logic like a pro.
- Avoid tiny text; optimize for mobile scan + print clarity.
- No em-dashes.
- Keep copy scannable: strong headline, 1-line subhead, 1 clear CTA, 3-5 key points max.
- For flyer folds: mention fold-safe margins in layout notes.
- imagePrompt must be directly usable in an image generator.
`;

    const userPayload = {
      designType,
      flyerFold: flyerFold ?? null,
      format,
      renderSize: { width, height },
      location,
      audience,
      content: { surpriseCopy, headline, subhead, cta, keyPoints },
      direction: { surpriseDesign, tone, density, brandWords, paletteHint, imageryHint },
    };

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    });

    const text = completion.choices?.[0]?.message?.content || "";
    const brief = safeJsonParse(text);

    // Ensure helpful “other tools” links are included (so users can reuse prompt elsewhere)
    brief.alternativeGenerators = [
      {
        name: "Microsoft Designer (Image Creator)",
        url: "https://designer.microsoft.com/",
        note: "Often free with Microsoft account.",
      },
      {
        name: "Adobe Firefly",
        url: "https://firefly.adobe.com/",
        note: "Has free credits depending on plan/account.",
      },
      {
        name: "Canva AI Image Generator",
        url: "https://www.canva.com/",
        note: "Magic Media / AI tools available depending on plan.",
      },
      {
        name: "Leonardo AI",
        url: "https://leonardo.ai/",
        note: "Has free tier options depending on account.",
      },
    ];

    return Response.json({
      ok: true,
      remainingToday: gate.remaining,
      brief,
    });
  } catch (err: any) {
    console.error("[/api/brief] error:", err?.message || err);
    return Response.json({ ok: false, error: err?.message || "Brief error" }, { status: 500 });
  }
}
