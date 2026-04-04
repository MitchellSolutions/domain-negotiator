export default async (req) => {
  try {
    const { prompt, system } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        system: system || "You are a domain negotiation advisor. Respond in valid compact JSON only. No markdown, no preamble.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";

    try {
      return Response.json(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch {
      return Response.json({ error: true });
    }
  } catch (err) {
    return Response.json({ error: true }, { status: 500 });
  }
};

export const config = { path: "/.netlify/functions/claude" };
