import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Allowed image sizes for gpt-image-1 (matches SDK typing)
type ImageSize =
  | "auto"
  | "1024x1536"
  | "1024x1024"
  | "1536x1024"
  | "256x256"
  | "512x512"
  | "1792x1024"
  | "1024x1792";

function coerceImageSize(input: any): ImageSize {
  const s = String(input || "").trim();
  const allowed: ImageSize[] = [
    "auto",
    "1024x1536",
    "1024x1024",
    "1536x1024",
    "256x256",
    "512x512",
    "1792x1024",
    "1024x1792",
  ];
  return (allowed as string[]).includes(s) ? (s as ImageSize) : "1024x1536";
}

function getIP(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return "unknown";
}

function nowMs() {
  return Date.now();
}

// Basic in-memory guardrails (ok for hobby/testing; resets on cold start)
const dailyCounts = new Map<string, { date: string; count: number }>();
const cooldowns = new Map<string, number>(); // ip -> nextAllowedMs

function todayKeyUTC() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function takeDaily(ip: string, limit: number) {
  const date = todayKeyUTC();
  const cur = dailyCounts.get(ip);
  if (!cur || cur.date !== date) {
    dailyCounts.set(ip, { date, count: 1 });
    return { ok: true, remaining: limit - 1 };
  }
  if (cur.count >= limit) return { ok: false, remaining: 0 };
  cur.count += 1;
  dailyCounts.set(ip, cur);
  return { ok: true, remaining: limit - cur.count };
}

function checkCooldown(ip: string, cooldownSeconds: number) {
  const next = cooldowns.get(ip) || 0;
  const t = nowMs();
  if (t < next) {
    const remaining = Math.ceil((next - t) / 1000);
    return { ok: false, remainingSeconds: remaining };
  }
  cooldowns.set(ip, t + cooldownSeconds * 1000);
  return { ok: true, remainingSeconds: 0 };
}

export async function POST(req: Request) {
  try {
    const ip = getIP(req);

    // Guardrails
    const DAILY_LIMIT = 10;
    const COOLDOWN_SECONDS = 60;

    // Cooldown first (prevents spam-clicking cost)
    const cd = checkCooldown(ip, COOLDOWN_SECONDS);
    if (!cd.ok) {
      return Response.json(
        {
          ok: false,
          code: "COOLDOWN",
          error: `Cooldown active. Please wait ${cd.remainingSeconds}s before generating again.`,
          cooldownSeconds: cd.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Daily cap
    const gate = takeDaily(ip, DAILY_LIMIT);
    if (!gate.ok) {
      return Response.json(
        {
          ok: false,
          code: "DAILY_LIMIT",
          error: "Daily image limit reached (10/day). Use /api/brief to keep working, then generate tomorrow.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();

    const prompt = body?.prompt;
    const size = coerceImageSize(body?.size); // ✅ fixes TS union type issue

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ ok: false, error: "Missing prompt" }, { status: 400 });
    }

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
    });

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      return Response.json({ ok: false, error: "No image returned" }, { status: 500 });
    }

    return Response.json({
      ok: true,
      b64,
      remainingToday: gate.remaining,
      size,
    });
  } catch (err: any) {
    return Response.json(
      {
        ok: false,
        error: err?.message || "Failed to generate image",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    message: "Use POST with JSON body: { prompt: '...', size: '1024x1536' }",
  });
}
