import OpenAI from "openai";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    message: "POST JSON to generate flyer + newsletter images."
  });
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY in environment variables.");

    const input = await req.json();

    const client = new OpenAI({ apiKey });

    // Two unique concepts (so Angeline gets variety)
    const conceptA = buildConcept(input, "Concept A", "editorial-geometry");
    const conceptB = buildConcept(input, "Concept B", "symbolic-motif");

    // We generate 4 images total:
    // - 2 Flyer A4 layouts (concept A + B)
    // - 2 Newsletter layouts (concept A + B)
    const [flyerA, flyerB, newsA, newsB] = await Promise.all([
      client.images.generate({
        model: "gpt-image-1",
        prompt: conceptA.flyerPrompt,
        size: "1024x1024"
      }),
      client.images.generate({
        model: "gpt-image-1",
        prompt: conceptB.flyerPrompt,
        size: "1024x1024"
      }),
      client.images.generate({
        model: "gpt-image-1",
        prompt: conceptA.newsletterPrompt,
        size: "1024x1024"
      }),
      client.images.generate({
        model: "gpt-image-1",
        prompt: conceptB.newsletterPrompt,
        size: "1024x1024"
      })
    ]);

    const out = {
      ok: true,
      results: [
        {
          title: "Concept A",
          style: conceptA.style,
          flyerB64: flyerA.data?.[0]?.b64_json ?? null,
          newsletterB64: newsA.data?.[0]?.b64_json ?? null,
          flyerPrompt: conceptA.flyerPrompt,
          newsletterPrompt: conceptA.newsletterPrompt
        },
        {
          title: "Concept B",
          style: conceptB.style,
          flyerB64: flyerB.data?.[0]?.b64_json ?? null,
          newsletterB64: newsB.data?.[0]?.b64_json ?? null,
          flyerPrompt: conceptB.flyerPrompt,
          newsletterPrompt: conceptB.newsletterPrompt
        }
      ]
    };

    return Response.json(out);
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

function buildConcept(input: any, label: string, style: string) {
  const audience = input?.audience ?? "Seller/Buyer/Realtor";
  const locationScope = input?.locationScope ?? "Sacramento, CA";
  const eventType = input?.eventType ?? "Open House / Community Event";
  const brandMode = input?.brandMode ?? "SAC Platinum branded";
  const foldType = input?.foldType ?? "Single page";
  const qrPlacement = input?.qrPlacement ?? "Bottom-right";
  const monthTheme = input?.monthTheme ?? "Market Momentum";

  const flyerPrompt = `
Create a FLAT graphic design (not a photo mockup) of an A4 portrait real-estate FLYER.
The design must look original and uncommon (avoid generic Canva real estate templates, avoid house-photo collages).

Context:
- Location: ${locationScope}
- Audience: ${audience}
- Event: ${eventType}
- Brand mode: ${brandMode}
- Format: ${foldType}
- Concept label: ${label}
- Visual style direction: ${style}

Hard layout requirements:
- A4 portrait layout grid with clear hierarchy.
- Headline + subhead.
- 3 short bullet highlights.
- A clearly reserved QR scan zone (blank square) at ${qrPlacement}.
- Footer strip with placeholders: Agent Name, Phone, Email, Website.

Look & feel:
- Premium, modern, lots of negative space.
- If branded: neutral gray + 1 accent color. If unbranded: restrained modern palette.
- Use abstract shapes or local-inspired geometry instead of typical home-photo layouts.

Output only the flyer design.
`;

  const newsletterPrompt = `
Create a FLAT graphic design (not a photo mockup) of a modern EMAIL NEWSLETTER layout for real estate.
Make it original and uncommon (avoid typical newsletter templates).

Context:
- Location: ${locationScope}
- Audience: ${audience}
- Theme of the month: ${monthTheme}
- Brand mode: ${brandMode}
- Concept label: ${label}
- Visual style direction: ${style}

Must include sections:
1) Header: newsletter title + month
2) Short intro paragraph
3) Market stats section: 3 stat cards (placeholders)
4) Real Estate Tip of the Month
5) Featured listing OR featured neighborhood (placeholder)
6) CTA section with a reserved blank QR square
7) Footer with contact placeholders

Look & feel:
- Strong grid, editorial spacing, premium typography.
- Stats section visible but not overpowering.

Output only the newsletter layout.
`;

  return { style, flyerPrompt, newsletterPrompt };
}
