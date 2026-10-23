import { query } from "@/lib/snowflake";
import { cleanText } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await query<{ REPLY: string }>(
      "SELECT AI_COMPLETE('llama3.3-70b', 'Say hi in 5 words') AS REPLY"
    );
    return Response.json({ ok: true, reply: cleanText(rows[0]?.REPLY) });
  } catch (err) {
    console.error("[api/health]", err);
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
