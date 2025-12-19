import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---- in-memory rate limits (good for hobby/testing; resets on cold starts)
const dailyCounts = new Map<string, { date: string; count: number }>();
const lastHit = new Map<string, number>();

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

function checkCooldown(ip: string, cooldownMs: number) {
  const now = Date.now();
  const prev = lastHit.get(ip) || 0;
  const diff = now - prev;
  if (diff < cooldownMs) {
    return { ok: false, waitMs: cooldownMs - diff };
  }
  lastHit.set(ip, now);
  return { ok: true, waitMs: 0 };
}

function clampString(s: any, maxLen: number) {
  if (typeof s !== "string") return "";
  return s.slice(0, maxLen);
}

export async function POST(req: Request) {
  try {
    const ip = getIP(req);

    // ---- Limits you can tune
    const DAILY_LIMIT = 10; // images/day per IP
    const COOLDOWN_MS = 30_000; // 30 seconds per image per IP

    const cool = checkCooldown(ip, COOLDOWN_MS);
    if (!cool.ok) {
      return Response.json(
        {
          ok: false,
          error: `Cooldown active. Please wait ${Math.ceil(cool.waitMs / 1000)}s before generating again.`,
          code: "COOLDOWN",
        },
        { status: 429 }
      );
    }

    const gate = takeDaily(ip, DAILY_LIMIT);
    if (!gate.ok) {
      return Response.json(
        {
          ok: false,
          error: `Daily image limit reached (${DAILY_LIMIT}/day). Try again tomorrow.`,
          code: "DAILY_LIMIT",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const prompt = clampString(body?.prompt, 800); // prevent huge prompts

    // Optional: size control (kept safe)
    const size = clampString(body?.size || "1024x1024", 20);
    const allowedSizes = new Set(["1024x1024", "1024x1536", "1536x1024"]);
    const safeSize = allowedSizes.has(size) ? size : "1024x1024";

    if (!prompt) {
      return Response.json({ ok: false, error: "Missing prompt" }, { status: 400 });
    }

    console.log(
      "[/api/generate] ip=",
      ip,
      "remainingToday=",
      gate.remaining,
      "size=",
      safeSize
    );

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: safeSize as any,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return Response.json({ ok: false, error: "No image returned" }, { status: 500 });
    }

    return Response.json({
      ok: true,
      remainingToday: gate.remaining,
      b64,
    });
  } catch (err: any) {
    console.error("[/api/generate] error:", err?.message || err);
    return Response.json({ ok: false, error: err?.message || "Failed to generate image" }, { status: 500 });
  }
}
