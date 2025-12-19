import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---- in-memory limiter (hobby/testing; resets on cold starts)
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
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
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
function normStr(v: any) {
  if (typeof v !== "string") return "";
  return v.trim();
}
function normalizeDesignType(v: any): DesignType | null {
  const s = normStr(v).toLowerCase();
  if (s === "flyer") return "flyer";
  if (s === "newsletter") return "newsletter";
  return null;
}
function normalizeFlyerFold(v: any): FlyerFold | null {
  const s0 = normStr(v).toLowerCase();
  if (!s0) return null;
  const s = s0.replace(/[\s-]/g, "");
  if (s === "single") return "single";
  if (s === "bifold") return "bifold";
  if (s === "trifold") return "trifold";
  return null;
}
function normalizeAudience(v: any): Audience {
  const s = normStr(v).toLowerCase();
  if (s === "buyer" || s === "seller" || s === "realtor" || s === "all") return s;
  return "buyer";
}
function normalizeDensity(v: any): Density {
  const s = normStr(v).toLowerCase();
  if (s === "minimal" || s === "balanced" || s === "dense") return s;
  return "balanced";
}

function daysUntilMonthDay(now: Date, monthIndex0: number, day: number) {
  // monthIndex0: 0=Jan ... 11=Dec
  const y = now.getFullYear();
  const targetThisYear = new Date(y, monthIndex0, day, 0, 0, 0, 0);
  const target = targetThisYear >= now ? targetThisYear : new Date(y + 1, monthIndex0, day, 0, 0, 0, 0);
  const ms = target.getTime() - now.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function seasonalContext(now: Date) {
  const month = now.getMonth(); // 0-11
  const day = now.getDate();
  const iso = now.toISOString();

  const daysToChristmas = daysUntilMonthDay(now, 11, 25);
  const daysToNewYear = daysUntilMonthDay(now, 0, 1);

  // Simple seasonal buckets (good enough for design suggestions)
  let seasonLabel = "General";
  if (month === 11) seasonLabel = "Holiday Season (December)";
  else if (month === 0) seasonLabel = "New Year / Fresh Start (January)";
  else if (month >= 5 && month <= 7) seasonLabel = "Summer (June–August)";
  else if (month >= 8 && month <= 10) seasonLabel = "Fall (September–November)";
  else if (month >= 1 && month <= 4) seasonLabel = "Spring (February–May)";

  const holidayHints: string[] = [];
  if (month === 11 && day <= 25) {
    holidayHints.push(`It is ${daysToChristmas} day(s) before Christmas.`);
    holidayHints.push("Holiday attention span is short. Make the CTA extremely obvious.");
  }
  if (daysToNewYear <= 14) {
    holidayHints.push(`New Year is coming in ${daysToNewYear} day(s).`);
    holidayHints.push("‘Fresh start’ messaging can outperform generic promos.");
  }

  return { iso, seasonLabel, holidayHints, daysToChristmas, daysToNewYear };
}

export async function POST(req: Request) {
  try {
    const ip = getIP(req);
    const limit = 10;
    const gate = takeDailyToken(ip, limit);

    if (!gate.ok) {
      return Response.json(
        { ok: false, error: "Daily brief limit reached (10/day). Try again tomorrow.", remainingToday: 0 },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Modes:
    // - "brief": full brief (default)
    // - "copy": only refine copy + theme suggestions (cheap + fast)
    const mode: "brief" | "copy" = body?.mode === "copy" ? "copy" : "brief";

    const designType = normalizeDesignType(body?.designType);
    if (!designType) {
      return Response.json(
        { ok: false, error: "Invalid designType. Use flyer/newsletter (or Flyer/Newsletter).", remainingToday: gate.remaining },
        { status: 400 }
      );
    }

    const format = clampString(body?.format, 40);
    if (!format) {
      return Response.json({ ok: false, error: "Missing format.", remainingToday: gate.remaining }, { status: 400 });
    }

    const width = Number(body?.renderSize?.width);
    const height = Number(body?.renderSize?.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 256 || height < 256 || width > 2048 || height > 2048) {
      return Response.json({ ok: false, error: "Invalid renderSize.", remainingToday: gate.remaining }, { status: 400 });
    }

    const location = clampString(body?.location || "Sacramento, CA", 80);
    const audience = normalizeAudience(body?.audience);

    const flyerFold = designType === "flyer" ? normalizeFlyerFold(body?.flyerFold) ?? undefined : undefined;

    // Read BOTH payload shapes (your UI + older API)
    const surpriseCopy = Boolean(body?.surpriseCopy ?? body?.content?.surpriseCopy);
    const surpriseDesign = Boolean(body?.surpriseDesign ?? body?.direction?.surpriseDesign);

    const copySrc = body?.copy ?? body?.content ?? {};
    const headline = clampString(copySrc?.headline || "", 140);
    const subhead = clampString(copySrc?.subhead || "", 200);
    const cta = clampString(copySrc?.cta || "", 100);
    const dateTime = clampString(copySrc?.dateTime || "", 80);

    const keyPointsRaw = copySrc?.keyPoints;
    const keyPoints: string[] = Array.isArray(keyPointsRaw)
      ? keyPointsRaw.map((x: any) => clampString(x, 100)).filter(Boolean).slice(0, 6)
      : [];

    const dirSrc = body?.designDirection ?? body?.direction ?? {};
    const tone = clampString(dirSrc?.tone || "Bold Modern", 50);
    const density = normalizeDensity(dirSrc?.density);
    const brandWords = clampString(dirSrc?.brandWords || "", 140);
    const paletteHint = clampString(dirSrc?.paletteHint || "", 160);
    const imageryHint = clampString(dirSrc?.imageryHint || "", 180);

    const now = new Date();
    const ctx = seasonalContext(now);

    console.log("[/api/brief] ip=", ip, "mode=", mode, "designType=", designType, "audience=", audience, "size=", `${width}x${height}`, "remainingToday=", gate.remaining);

    const system = `
You are the highest-paid senior graphic designer + creative director.
Your output must be extremely readable to a human editor who will actually build the design.
Return VALID JSON ONLY. No markdown. No code fences.

BIG GOAL:
- Give practical instructions that a designer/editor can execute immediately.
- Write like: "Do this", "Avoid this", "If X then Y".
- Assume time is limited. Make decisions confidently.

You must be context-aware:
- Consider today's date and proximity to holidays/season.
- Give theme suggestions as "Take it or leave it".

Never use em-dashes.

OUTPUT SHAPE (must include all keys):
{
  "mode": "brief" | "copy",

  "designType": "flyer"|"newsletter",
  "flyerFold": "single"|"bifold"|"trifold"|null,
  "format": string,
  "renderSize": { "width": number, "height": number },
  "location": string,
  "audience": "buyer"|"seller"|"realtor"|"all",

  "theme": {
    "seasonContext": string,
    "holidayReasoning": string[],
    "takeItOrLeaveItSuggestions": string[]
  },

  "copy": {
    "headline": string,
    "subhead": string,
    "cta": string,
    "dateTime": string,
    "keyPoints": string[]
  },

  "design": {
    "tone": string,
    "density": "minimal"|"balanced"|"dense",
    "palette": string,
    "imageryStyle": string,
    "layoutStyle": string
  },

  "prompt": string,

  "designerNotes": {
    "quickSummary": string,
    "doThis": string[],
    "avoidThis": string[],
    "hierarchy": string[],
    "spacingAndGrid": string[],
    "typography": string[],
    "colorLogic": string[],
    "imagery": string[],
    "foldAndPrintNotes": string[],
    "exportChecklist": string[]
  },

  "promptTransparency": {
    "whatTheModelOptimizedFor": string[],
    "whyThisWorks": string[],
    "risksAndTradeoffs": string[]
  }
}

RULES:
- If mode == "copy": focus on theme + copy + brief notes. Keep prompt + design fields present but simpler.
- If surpriseCopy is true, rewrite the copy strongly for the audience/location and season.
- If surpriseCopy is false, keep user's copy, only lightly clean it (grammar + clarity).
- If surpriseDesign is true, pick palette/imagery/layout like a pro.
- If surpriseDesign is false, honor paletteHint/imageryHint and keep notes shorter.
- Optimize for mobile scan and print clarity (no tiny text).
- Key points: 3–6 max, scannable.
- For folds: mention safe margins and fold lines.
- prompt must be directly usable for an image generator (describe layout, typography vibe, spacing, color, imagery, no faces unless necessary).
`;

    const userPayload = {
      mode,
      todayISO: ctx.iso,
      seasonContext: ctx.seasonLabel,
      holidayHints: ctx.holidayHints,

      designType,
      flyerFold: flyerFold ?? null,
      format,
      renderSize: { width, height },
      location,
      audience,

      content: { surpriseCopy, headline, subhead, cta, dateTime, keyPoints },
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

    // Hard-compat: ensure prompt exists even if model returned "imagePrompt"
    if (!brief.prompt && brief.imagePrompt) brief.prompt = brief.imagePrompt;

    brief.alternativeGenerators = [
      { name: "Microsoft Designer (Image Creator)", url: "https://designer.microsoft.com/", note: "Often free with Microsoft account." },
      { name: "Adobe Firefly", url: "https://firefly.adobe.com/", note: "Has free credits depending on plan/account." },
      { name: "Canva AI Image Generator", url: "https://www.canva.com/", note: "Magic Media / AI tools available depending on plan." },
      { name: "Leonardo AI", url: "https://leonardo.ai/", note: "Has free tier options depending on account." },
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
