export async function GET() {
  return Response.json({
    ok: true,
    message: "Use POST /api/generate with JSON body to generate images."
  });
}
