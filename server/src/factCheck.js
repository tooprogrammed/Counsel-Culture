import Anthropic from "@anthropic-ai/sdk";

const { ANTHROPIC_API_KEY } = process.env;
const client = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

export function factCheckingEnabled() {
  return Boolean(client);
}

// Asks the model to assess a single spoken claim. Returns a small structured
// verdict rather than free text so the client can render it consistently.
export async function checkClaim(text) {
  if (!client) {
    throw new Error("Fact-checking is not configured (set ANTHROPIC_API_KEY in server/.env)");
  }

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `A debate participant just said the following out loud. Assess whether it is factually accurate.

Statement: "${text}"

Reply with exactly three lines, no markdown:
Verdict: <one of: True, False, Misleading, Unverifiable, Opinion>
Explanation: <one or two sentences>
Confidence: <Low, Medium, or High>`,
      },
    ],
  });

  const raw = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const verdict = raw.match(/Verdict:\s*(.+)/i)?.[1]?.trim() ?? "Unverifiable";
  const explanation = raw.match(/Explanation:\s*(.+)/i)?.[1]?.trim() ?? raw.trim();
  const confidence = raw.match(/Confidence:\s*(.+)/i)?.[1]?.trim() ?? "Low";

  return { verdict, explanation, confidence, checkedAt: Date.now() };
}
