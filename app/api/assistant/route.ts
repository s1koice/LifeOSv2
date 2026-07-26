import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM = `Ты — NEXUS AI, краткий и практичный персональный ассистент по планированию жизни. Отвечай по-русски. Помогай формулировать измеримые цели, проекты и следующие действия. Учитывай переданный контекст. Не утверждай, что уже изменил данные: предлагай конкретный план, который пользователь сможет подтвердить. Избегай медицинских и финансовых гарантий.`;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: string; context?: unknown };
    if (!body.message?.trim()) return Response.json({ error: "Введите сообщение." }, { status: 400 });
    const byok = request.headers.get("x-nexus-byok");
    const apiKey = byok || process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: "AI пока не подключён. Добавьте OPENAI_API_KEY в Vercel или необязательный BYOK-ключ в настройках." }, { status: 503 });
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions: SYSTEM,
      input: `Контекст NEXUS OS:\n${JSON.stringify(body.context)}\n\nЗапрос пользователя: ${body.message}`,
      max_output_tokens: 700,
    });
    return Response.json({ reply: response.output_text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return Response.json({ error: `Не удалось получить ответ: ${message}` }, { status: 500 });
  }
}
