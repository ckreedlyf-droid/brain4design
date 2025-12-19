import OpenAI from "openai";

export const runtime = "nodejs"; // important for Vercel
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ ok: false, error: "Missing prompt" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });

    // returns base64
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return Response.json({ ok: false, error: "No image returned" }, { status: 500 });
    }

    return Response.json({ ok: true, b64 });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    message: "Use POST /api/generate with JSON body: { prompt: '...' }",
  });
}
