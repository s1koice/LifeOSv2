import OpenAI from "openai";

export const runtime = "nodejs";

const transactionProperties = {
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
} as const;

const financeTool: OpenAI.Responses.Tool = {
  type: "function",
  name: "reconcile_finance_data",
  description: "Извлечь новые операции и предложить только уверенные исправления уже сохранённых финансов и кредитов",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      summary: { type: "string" },
      warnings: { type: "array", items: { type: "string" } },
      transactions: { type: "array", items: { type: "object", properties: transactionProperties, required: Object.keys(transactionProperties), additionalProperties: false } },
      candidateUpdates: {
        type: "array",
        items: { type: "object", properties: { candidateId: { type: "string" }, title: { type: "string" }, category: { type: "string" }, kind: { type: "string", enum: ["expense", "income", "transfer"] }, note: { type: "string" } }, required: ["candidateId", "title", "category", "kind", "note"], additionalProperties: false },
      },
      transactionUpdates: {
        type: "array",
        items: { type: "object", properties: { transactionId: { type: "number" }, operation: { type: "string", enum: ["update", "delete"] }, title: { type: "string" }, category: { type: "string" }, kind: { type: "string", enum: ["expense", "income", "transfer"] }, accountId: { type: "number" }, date: { type: "string" }, amount: { type: "number" }, posted: { type: "boolean" }, reason: { type: "string" } }, required: ["transactionId", "operation", "title", "category", "kind", "accountId", "date", "amount", "posted", "reason"], additionalProperties: false },
      },
      loanUpdates: {
        type: "array",
        items: { type: "object", properties: { loanId: { type: "number", description: "ID существующего кредита или 0 для нового" }, name: { type: "string" }, originalAmount: { type: "number" }, balance: { type: "number" }, monthlyPayment: { type: "number" }, paidPayments: { type: "number" }, totalPayments: { type: "number" }, paymentDay: { type: "number" }, active: { type: "boolean" }, reason: { type: "string" } }, required: ["loanId", "name", "originalAmount", "balance", "monthlyPayment", "paidPayments", "totalPayments", "paymentDay", "active", "reason"], additionalProperties: false },
      },
    },
    required: ["summary", "warnings", "transactions", "candidateUpdates", "transactionUpdates", "loanUpdates"],
    additionalProperties: false,
  },
};

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File).slice(0, 5);
    const context = String(form.get("context") || "{}").slice(0, 180_000);
    let parsedContext: { candidates?: unknown[] } = {};
    try { parsedContext = JSON.parse(context) as { candidates?: unknown[] }; } catch { /* keep text context */ }
    if (!files.length && !parsedContext.candidates?.length) return Response.json({ error: "Добавьте файл или скриншот" }, { status: 400 });
    const apiKey = request.headers.get("x-nexus-byok")?.trim() || process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: "Добавьте OPENAI_API_KEY в Vercel или личный ключ в настройках" }, { status: 503 });
    const imageContent = await Promise.all(files.map(async file => ({
      type: "input_image" as const,
      image_url: `data:${file.type || "image/jpeg"};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`,
      detail: "high" as const,
    })));
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model: process.env.OPENAI_FINANCE_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions: `Ты — финансовый аудитор NEXUS OS. Читай банковские скриншоты на русском, иврите и английском и проверяй уже сохранённые данные из контекста.
Все title переводи на русский, originalTitle сохраняй как в источнике. Используй только категории из контекста, иначе «Другое». Не выдумывай неразборчивые суммы, даты и остатки.
transactions — только новые операции, извлечённые с изображений. candidateUpdates — нормализация переданных candidates из Excel/CSV по их точному candidateId. transactionUpdates — только уверенные исправления существующих операций по точному ID; operation=delete допустима только для точного дубля. loanUpdates — кредитные данные, однозначно видимые в источнике; loanId берётся из контекста, 0 означает действительно новый кредит.
Покупка по кредитной карте — expense в дату покупки. Итоговое списание Visa с банковского счёта, перевод между своими счетами и платёж кредита — transfer, потому что это движение денег, а не новый расход. Если одновременно видны итог и детализация, сохраняй детализацию, а итог классифицируй как transfer или исключай. Повторяющиеся реальные покупки не считай дублями только из-за одинаковой суммы. Возвращай пустые массивы, если уверенных изменений нет.`,
      input: [{ role: "user", content: [{ type: "input_text", text: `Текущая дата: ${new Date().toISOString().slice(0, 10)}.\nКонтекст NEXUS: ${context}\nПроверь новые и существующие данные. Не задавай вопросов.` }, ...imageContent] }],
      tools: [financeTool],
      tool_choice: { type: "function", name: "reconcile_finance_data" },
      max_output_tokens: 4000,
    });
    const call = response.output.find(item => item.type === "function_call" && item.name === "reconcile_finance_data");
    if (!call || call.type !== "function_call") return Response.json({ error: "ИИ не вернул результат проверки" }, { status: 422 });
    return Response.json(JSON.parse(call.arguments));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось проанализировать данные" }, { status: 500 });
  }
}
