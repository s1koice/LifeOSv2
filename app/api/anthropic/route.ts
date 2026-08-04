import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role?: "user" | "assistant";
  content?: string;
};

type NexusRequest = {
  system?: string;
  messages?: ChatMessage[];
  max_tokens?: number;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: { message: "OPENAI_API_KEY is not configured" } },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as NexusRequest;
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const input = messages
      .filter((message) => typeof message.content === "string")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content ?? "",
      }));

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        instructions:
          body.system ||
          "Ты NEXUS AI Coach. Отвечай на русском языке, кратко и конкретно.",
        input,
        max_output_tokens: Math.min(Math.max(body.max_tokens ?? 1200, 100), 3000),
        store: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: {
            message:
              data?.error?.message ||
              `OpenAI request failed with status ${response.status}`,
          },
        },
        { status: response.status },
      );
    }

    const text = Array.isArray(data?.output)
      ? data.output
          .filter((item: { type?: string }) => item?.type === "message")
          .flatMap((item: { content?: Array<{ type?: string; text?: string }> }) =>
            Array.isArray(item.content) ? item.content : [],
          )
          .filter(
            (item: { type?: string; text?: string }) =>
              item?.type === "output_text" && typeof item.text === "string",
          )
          .map((item: { text: string }) => item.text)
          .join("")
      : "";

    return NextResponse.json({
      content: [{ type: "text", text: text || "OpenAI вернул пустой ответ." }],
      provider: "openai",
      model: data?.model || "gpt-4.1",
      response_id: data?.id,
    });
  } catch (error) {
    console.error("NEXUS OpenAI route error", error);
    return NextResponse.json(
      { error: { message: "Failed to process the OpenAI request" } },
      { status: 500 },
    );
  }
}
