import OpenAI from "openai";

export const runtime = "nodejs";

const financeTool: OpenAI.Responses.Tool = {
  type: "function",
  name: "extract_finance_transactions",
  description: "Извлечь из банковского скриншота только реальные операции и движения денег",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      summary: { type: "string" },
      warnings: { type: "array", items: { type: "string" } },
      transactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "YYYY-MM-DD" },
            title: { type: "string", description: "Короткое понятное название на русском" },
            originalTitle: { type: "string" },
            amount: { type: "number" },
            kind: { type: "string", enum: ["expense", "income", "transfer"] },
            category: { type: "string" },
            accountHint: { type: "string" },
            cardLast4: { type: "string" },
            note: { type: "string" },
            installmentIndex: { type: "number" },
            installmentCount: { type: "number" },
            originalAmount: { type: "number" },
            billingDate: { type: "string" },
            installmentSeriesId: { type: "string" },
          },
          required: ["date", "title", "originalTitle", "amount", "kind", "category", "accountHint", "cardLast4", "note", "installmentIndex", "installmentCount", "originalAmount", "billingDate", "installmentSeriesId"],
          additionalProperties: false,
        },
      },
    },
    required: ["summary", "warnings", "transactions"],
    additionalProperties: false,
  },
};

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File).slice(0, 5);
    if (!files.length) return Response.json({ error: "Добавьте хотя бы один скриншот" }, { status: 400 });
    const apiKey = request.headers.get("x-nexus-byok")?.trim() || process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: "Добавьте OPENAI_API_KEY в Vercel или личный ключ в настройках" }, { status: 503 });
    const context = String(form.get("context") || "{}").slice(0, 60_000);
    const imageContent = await Promise.all(files.map(async file => ({
      type: "input_image" as const,
      image_url: `data:${file.type || "image/jpeg"};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`,
      detail: "high" as const,
    })));
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model: process.env.OPENAI_FINANCE_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions: `Ты — финансовый импортёр NEXUS OS. Читай банковские скриншоты на русском, иврите и английском. Все title переводи на русский, originalTitle сохраняй как на изображении. Используй только категории из контекста, иначе «Другое». Не выдумывай неразборчивые суммы или даты.
Покупка по кредитной карте — expense в дату покупки. Единое списание/итог счёта Visa с банковского счёта — transfer, потому что покупки уже учтены отдельно. Переводы между своими счетами и платежи кредита — transfer. Если на скриншоте одновременно есть итог и детализация, возвращай детализацию, а итог не дублируй. Повторяющиеся реальные покупки сохраняй отдельно. Для рассрочки заполни номера платежей; если данных нет, используй 0 и пустые строки.`,
      input: [{ role: "user", content: [{ type: "input_text", text: `Контекст NEXUS: ${context}\nИзвлеки все видимые операции. Не задавай вопросов.` }, ...imageContent] }],
      tools: [financeTool],
      tool_choice: { type: "function", name: "extract_finance_transactions" },
    });
    const call = response.output.find(item => item.type === "function_call" && item.name === "extract_finance_transactions");
    if (!call || call.type !== "function_call") return Response.json({ error: "ИИ не вернул список операций" }, { status: 422 });
    return Response.json(JSON.parse(call.arguments));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось проанализировать скриншот" }, { status: 500 });
  }
}
