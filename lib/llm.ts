import { query, withTimeout } from "@/lib/snowflake";

export const LLM_MODEL = "llama3.3-70b";

export function cleanText(text: unknown): string {
  return String(text ?? "").trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " ");
}

export async function complete(prompt: string, timeoutMs = 15000): Promise<string> {
  const rows = await withTimeout(
    query<{ REPLY: string }>(`SELECT AI_COMPLETE('${LLM_MODEL}', ?) AS REPLY`, [prompt]),
    timeoutMs
  );
  const text = cleanText(rows[0]?.REPLY);
  if (!text) throw new Error("Empty LLM reply");
  return text;
}
