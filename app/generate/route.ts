import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---- in-memory counters (OK for hobby/testing; resets on cold starts)
const genDailyCounts = new Map<string, { date: string; count: number }>();
const genCooldowns = new Map<string, { until: number }>();

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

function takeDaily(ip: string, limit: number) {
  const date = todayKey();
  const cur = genDailyCounts.get(ip);

  if (!cur || cur.date !== date) {
    genDailyCounts.set(ip, { date, count: 1 });
    return { ok: true, remaining: limit - 1 };
  }

  if (cur.count >= limit) return { ok: false, remaining: 0 };

  cur.count += 1;
  genDailyCounts.set(ip, cur);
  return { ok: true, remaining: limit - cur.count };
}

function checkCooldown(ip: string) {
  const now = Date.now();
  const cur = genCooldowns.get(ip);
  if (!cur) return { ok: true, remainingSeconds: 0 };

  if (now >= cur.until) {
    genCooldowns.delete(ip);
    return { ok: true, remainingSeconds: 0 };
  }

  const secs = Math.ceil((cur.until - now) / 1000);
  return { ok: false, remainingSeconds: secs };
}

function setCooldown(ip: string, seconds: number) {
  genCooldowns.set(ip, { until: Date.now() + seconds * 1000 });
}

function normalizeSize(size?: string) {
  // allow only safe sizes (you can expand later)
  const allowed = new Set(["1024x1024", "1024x1536", "1536x1024"]);
  if (size && allowed.has(size)) return size;
  return "1024x1536"; // good default for print-ish designs
}

export async function POST(req: Request) {
  try {
    const ip = getIP(req);

    // 1) Cooldown gate
    const cooldownGate = checkCooldown(ip);
    if (!cooldownGate.ok) {
      return Response.json(
        {
          ok: false,
          code: "COOLDOWN",
          error: `Please wait ${cooldownGate.remainingSeconds}s before generating again (cooldown).`,
          cooldownSeconds: cooldownGate.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // 2) Daily gate (10/day per IP)
    const dailyLimit = 10;
    const dailyGate = takeDaily(ip, dailyLimit);
    if (!dailyGate.ok) {
      return Response.json(
        {
          ok: false,
          code: "DAILY_LIMIT",
          error: "Daily image limit reached (10/day). Create briefs freely, then generate images tomorrow.",
          remainingToday: 0,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== "string") {
      return Response.json(
        { ok: false, code: "BAD_REQUEST", error: "Missing prompt." },
        { status: 400 }
      );
    }

    const size = normalizeSize(body?.size);

    // 3) Call image model
    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
    });

    const b64 = result?.data?.[0]?.b64_json;

    if (!b64) {
      return Response.json(
        { ok: false, code: "SERVER_ERROR", error: "No image returned." },
        { status: 500 }
      );
    }

    // 4) Set cooldown AFTER successful image generation
    setCooldown(ip, 60);

    return Response.json({
      ok: true,
      b64,
      remainingToday: dailyGate.remaining,
      cooldownSeconds: 60,
    });
  } catch (err: any) {
    return Response.json(
      { ok: false, code: "SERVER_ERROR", error: err?.message || "Generate error" },
      { status: 500 }
    );
  }
}

// Optional: GET helper
export async function GET() {
  return Response.json({
    ok: true,
    message: "POST /api/generate with JSON body: { prompt: '...', size?: '1024x1536' }",
  });
}
