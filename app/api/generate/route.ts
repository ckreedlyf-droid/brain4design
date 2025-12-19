import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== "string") {
      return Response.json(
        { ok: false, error: "Missing prompt (string) in JSON body." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { ok: false, error: "OPENAI_API_KEY is missing in server env vars." },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });

    const b64 = result?.data?.[0]?.b64_json;

    if (!b64) {
      return Response.json(
        { ok: false, error: "No image returned from OpenAI.", raw: result },
        { status: 502 }
      );
    }

    return Response.json({ ok: true, b64 });
  } catch (err: any) {
    // This will show up in Vercel runtime logs
    console.error("API /api/generate error:", err);

    return Response.json(
      {
        ok: false,
        error: err?.message || "Unknown server error",
        name: err?.name,
        status: err?.status,
        code: err?.code,
        type: err?.type,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ ok: true, message: "Use POST /api/generate" });
}
