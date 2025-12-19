import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---- super-simple in-memory limiter (OK for hobby/testing; resets on cold starts)
const briefCounts = new Map<string, { date: string; count: number }>();

function getIP(req: Request) {
  // Vercel: x-forwarded-for is usually present
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
    // Attempt to recover if model wrapped in code fences
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  }
}

export async function POST(req: Request) {
  try {
    const ip = getIP(req);
    const limit = 10;
    const gate = takeDailyToken(ip, limit);
    if (!gate.ok) {
      return Response.json(
        { ok: false, error: "Daily brief limit reached (10/day). Try again tomorrow or lower brief usage." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Minimal validation
    const designType = body?.designType;
    const format = body?.format;
    const renderSize = body?.renderSize;
    const location = body?.location || "Sacramento, CA";
    const audience = body?.audience || "buyer";

    if (!designType || !format || !renderSize?.width || !renderSize?.height) {
      return Response.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const system = `
You are a highly-paid senior graphic designer specialized in flyers and newsletters.
You surprise the user with smart choices while staying practical and printable.
You must output VALID JSON ONLY (no markdown).

Goals:
- Create a strong design brief
- Provide an image-generation prompt (for an image model)
- Provide teach-you-why designer notes (hierarchy, typography, color logic, layout)
- Keep copy punchy and scannable

Constraints:
- Location defaults to Sacramento, CA
- Audience can be buyer/seller/realtor/all
- If "surpriseCopy" true, you may rewrite headline/subhead/CTA to be better.
- If "surpriseDesign" true, you may choose palette/imagery style that fits.
- Avoid tiny text.
- No em-dashes.
`;

    const user = JSON.stringify(body);

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = completion.choices?.[0]?.message?.content || "";
    const brief = safeJsonParse(text);

    // Attach recommended “other tools” links (you can change these anytime)
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
    return Response.json(
      { ok: false, error: err?.message || "Brief error" },
      { status: 500 }
    );
  }
}
