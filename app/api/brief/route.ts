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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `
You are a highly paid senior graphic designer and creative director.
You design flyers and newsletters that are clean, conversion-focused, and visually surprising.
You understand hierarchy, spacing, typography, and clarity.

IMPORTANT RULES:
- Output ONLY valid JSON
- Do NOT include markdown
- Do NOT include explanations outside JSON
- No em-dashes
- Be concise but high quality
`;

    const userPrompt = `
Create a professional design brief for a ${body.designType || "flyer"}.

Constraints:
- Location: Sacramento, CA (always)
- Audience: ${body.audience || "all"}
- Flyer fold: ${body.flyerFold || "single"}
- Aspect: ${body.aspect || "a4"}

Surprise rules:
- surpriseContent: ${body.surpriseContent !== false}
- surpriseDirection: ${body.surpriseDirection !== false}

If surpriseContent is true, invent strong copy.
If false, respect provided values unless empty.

If surpriseDirection is true, choose tone, palette, imagery like a senior designer.

Return this JSON shape EXACTLY:

{
  "designType": "flyer | newsletter",
  "flyerFold": "single | bifold | trifold",
  "aspect": "a4 | ig_story | ig_post | email_header | linkedin_banner",
  "location": "Sacramento, CA",
  "audience": "buyer | seller | realtor | all",
  "headline": "",
  "subhead": "",
  "cta": "",
  "dateTime": "",
  "keyPoints": "",
  "monthTheme": "",
  "stats": "",
  "tipOfTheMonth": "",
  "tone": "premium_minimal | bold_modern | clean_corporate | warm_human | playful | luxury_editorial",
  "density": "airy | balanced | packed",
  "brandWords": "",
  "palette": "",
  "imageryPreference": "",
  "doNotInclude": "",
  "extraNotes": ""
}
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.output_text;

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        { ok: false, error: "Model did not return valid JSON" },
        { status: 500 }
      );
    }

    // Enforce locked value
    parsed.location = "Sacramento, CA";

    return Response.json({ ok: true, brief: parsed });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
