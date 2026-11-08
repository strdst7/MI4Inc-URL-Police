import type { ReportPayload } from "@/lib/types";

/**
 * Optional, OpenAI-compatible narrative enrichment. No external service is
 * required: without AI_API_KEY the deterministic engine summary is returned.
 */
export async function enhanceSummary(
  payload: ReportPayload,
): Promise<{ summary: string; source: "deterministic" | "ai" }> {
  const key = process.env.AI_API_KEY;
  if (!key) return { summary: payload.summary, source: "deterministic" };

  const base = (process.env.AI_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";
  const topIssues = payload.recommendations
    .slice(0, 5)
    .map((item) => `${item.title} (${item.priority})`)
    .join("; ");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 260,
        messages: [
          {
            role: "system",
            content:
              "You are a senior web quality consultant. Write one concise, factual paragraph (max 90 words) about the measured audit signals. Never invent metrics, never claim visual design review, and clearly separate observations from recommendations.",
          },
          {
            role: "user",
            content: `Site: ${payload.host}. Scores: ${JSON.stringify(payload.scores)}. Failing/warning checks: ${payload.checks
              .filter((c) => c.status === "fail" || c.status === "warn")
              .map((c) => `${c.label}: ${c.detail}`)
              .slice(0, 12)
              .join(" | ")}. Priorities: ${topIssues}.`,
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 30) throw new Error("Empty AI narrative");
    return {
      summary: `${payload.summary}\n\nAI narrative (${model}): ${text.slice(0, 1200)}`,
      source: "ai",
    };
  } catch {
    return { summary: payload.summary, source: "deterministic" };
  } finally {
    clearTimeout(timer);
  }
}
