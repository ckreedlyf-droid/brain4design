import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// naive in-memory cache (works for hobby; resets on cold starts)
const cache = new Map<string, { b64: string; ts: number }>();
const lastCallByIP = new Map<string, number>();

function getIP(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return "unknown";
}

function keyFor(prompt: string, size: string) {
  return `${size}::${prompt}`.slice(0, 2000);
}

export async function POST(req: Request) {
  try {
    const ip = getIP(req);

    // Cooldown: 10 seconds between image calls per IP
    const now = Date.now();
    const last = lastCallByIP.get(ip) || 0;
    if (now - last < 10_000) {
      return Response.json({ ok: false, error: "Slow down: wait 10s between image generations." }, { status: 429 });
    }
    lastCallByIP.set(ip, now);

    const { prompt, size } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ ok: false, error: "Missing prompt" }, { status: 400 });
    }

    const finalSize = typeof size === "string" ? size : "1024x1024";
    const k = keyFor(prompt, finalSize);

    // cache valid for 10 minutes
    const cached = cache.get(k);
    if (cached && now - cached.ts < 10 * 60 * 1000) {
      return Response.json({ ok: true, b64: cached.b64, cached: true });
    }

    // LOGGING (helps audit spend in Vercel logs)
    console.log("[/api/generate] ip=", ip, "size=", finalSize, "promptChars=", prompt.length);

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: finalSize,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return Response.json({ ok: false, error: "No image returned" }, { status: 500 });
    }

    cache.set(k, { b64, ts: now });
    return Response.json({ ok: true, b64, cached: false });
  } catch (err: any) {
    console.error("[/api/generate] error:", err?.message || err);
    return Response.json({ ok: false, error: err?.message || "Failed to generate image" }, { status: 500 });
  }
}
