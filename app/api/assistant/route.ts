import OpenAI from "openai";

export const runtime = "nodejs";

type Action = { type: string; payload: Record<string, unknown> };

const SYSTEM = `Ты — исполнительный персональный ассистент и финансовый аудитор NEXUS AI. Отвечай по-русски, кратко и по делу.
Главное правило: если пользователь просит создать, добавить, завершить, изменить или спланировать сущности, вызывай подходящие инструменты сразу. Не спрашивай подтверждение и не задавай уточняющие вопросы, если можно выбрать разумное значение по умолчанию. Пользователь предпочитает быстро получить результат и потом исправить его кнопкой отмены или вручную.
Для каждой задачи оцени продолжительность в минутах, требуемую энергию и контекст. Если пользователь просит спланировать день, выбери до 5 существующих незавершённых задач из контекста, назначь им реалистичные дату и время через update_task, избегай пересечения времени и учитывай высокий уровень энергии в первой половине дня. Если задач недостаточно и результат явно требует новых действий — создай их. Дату всегда передавай в формате YYYY-MM-DD, время — HH:MM. Если упоминается существующий проект, передай его название в поле project; иначе пустую строку. Если в одном сообщении несколько задач, вызови create_task для каждой.
Если в контексте есть finance, анализируй уже сохранённые операции, счета, бюджет и кредиты. Используй только реальные ID из контекста. Исправляй автоматически только уверенные ошибки. Удаляй операцию только если это точный дубль; сохраняй более раннюю или более полную запись. Покупка по кредитке — расход в день покупки, а итоговое погашение карты и платёж кредита — перевод, не новый расход. Не меняй сумму, дату или остаток по догадке. Кредит обновляй только когда из данных однозначно видны остаток, платёж или номер платежа. После действий сообщи одним коротким предложением, что проверено и изменено.`;

const CAPTURE_SYSTEM = `Ты — быстрый сортировщик входящих NEXUS OS. Пользователь присылает одну мысль голосом или текстом. Не задавай вопросов и не проси подтверждение. Сразу вызови organize_capture ровно один раз.
Выбери task, если это конкретное действие; project, если это многосоставной результат из нескольких шагов; resource, если это идея, справочная информация или материал без очевидного действия. Привяжи существующие проект и цель только при уверенном совпадении с контекстом, иначе передай пустые строки. Используй разумные значения по умолчанию. Ответ после действия — одно короткое предложение.`;

const organizeCaptureTool: OpenAI.Responses.Tool = { type: "function", name: "organize_capture", description: "Без уточнений разобрать запись из входящих и немедленно создать задачу, проект или ресурс", strict: true, parameters: { type: "object", properties: { original: { type: "string" }, destination: { type: "string", enum: ["task", "project", "resource"] }, title: { type: "string" }, area: { type: "string" }, dueDate: { type: "string", description: "YYYY-MM-DD или пустая строка" }, time: { type: "string", description: "HH:MM или пустая строка" }, duration: { type: "number" }, energy: { type: "string", enum: ["low", "medium", "high"] }, context: { type: "string", enum: ["anywhere", "computer", "phone", "home", "outside"] }, priority: { type: "string", enum: ["high", "medium", "low"] }, project: { type: "string" }, goal: { type: "string" }, next: { type: "string" }, note: { type: "string" } }, required: ["original", "destination", "title", "area", "dueDate", "time", "duration", "energy", "context", "priority", "project", "goal", "next", "note"], additionalProperties: false } };

const tools: OpenAI.Responses.Tool[] = [
  { type: "function", name: "create_task", description: "Немедленно добавить задачу в общий список и при необходимости связать с существующим проектом", strict: true, parameters: { type: "object", properties: { title: { type: "string" }, area: { type: "string" }, dueDate: { type: "string", description: "Дата YYYY-MM-DD или пустая строка" }, time: { type: "string", description: "Время HH:MM" }, duration: { type: "number", description: "Оценка в минутах" }, energy: { type: "string", enum: ["low", "medium", "high"] }, context: { type: "string", enum: ["anywhere", "computer", "phone", "home", "outside"] }, priority: { type: "string", enum: ["high", "medium", "low"] }, project: { type: "string", description: "Название существующего проекта или пустая строка" } }, required: ["title", "area", "dueDate", "time", "duration", "energy", "context", "priority", "project"], additionalProperties: false } },
  { type: "function", name: "update_task", description: "Изменить и поставить в календарь существующую задачу", strict: true, parameters: { type: "object", properties: { currentTitle: { type: "string", description: "Текущее название задачи из контекста" }, newTitle: { type: "string", description: "Новое название или текущее без изменений" }, dueDate: { type: "string", description: "Дата YYYY-MM-DD" }, time: { type: "string", description: "Время HH:MM" }, duration: { type: "number" }, energy: { type: "string", enum: ["low", "medium", "high"] }, context: { type: "string", enum: ["anywhere", "computer", "phone", "home", "outside"] } }, required: ["currentTitle", "newTitle", "dueDate", "time", "duration", "energy", "context"], additionalProperties: false } },
  { type: "function", name: "complete_task", description: "Отметить существующую задачу выполненной по названию", strict: true, parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"], additionalProperties: false } },
  { type: "function", name: "create_project", description: "Немедленно создать проект", strict: true, parameters: { type: "object", properties: { name: { type: "string" }, area: { type: "string" }, due: { type: "string" }, next: { type: "string" } }, required: ["name", "area", "due", "next"], additionalProperties: false } },
  { type: "function", name: "create_goal", description: "Немедленно создать цель", strict: true, parameters: { type: "object", properties: { title: { type: "string" }, period: { type: "string", enum: ["ГОД", "КВАРТАЛ", "МЕСЯЦ", "НЕДЕЛЯ", "СЕГОДНЯ"] }, date: { type: "string" }, note: { type: "string" } }, required: ["title", "period", "date", "note"], additionalProperties: false } },
  { type: "function", name: "create_habit", description: "Немедленно создать новую привычку", strict: true, parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } },
  { type: "function", name: "update_finance_transaction", description: "Исправить существующую финансовую операцию по точному ID", strict: true, parameters: { type: "object", properties: { transactionId: { type: "number" }, title: { type: "string" }, category: { type: "string" }, kind: { type: "string", enum: ["expense", "income", "transfer"] }, accountId: { type: "number" }, date: { type: "string", description: "YYYY-MM-DD" }, amount: { type: "number" }, posted: { type: "boolean" }, reason: { type: "string" } }, required: ["transactionId", "title", "category", "kind", "accountId", "date", "amount", "posted", "reason"], additionalProperties: false } },
  { type: "function", name: "delete_finance_transaction", description: "Удалить только подтверждённый точный дубль финансовой операции", strict: true, parameters: { type: "object", properties: { transactionId: { type: "number" }, reason: { type: "string" } }, required: ["transactionId", "reason"], additionalProperties: false } },
  { type: "function", name: "update_loan", description: "Обновить существующий кредит по точному ID", strict: true, parameters: { type: "object", properties: { loanId: { type: "number" }, name: { type: "string" }, originalAmount: { type: "number" }, balance: { type: "number" }, monthlyPayment: { type: "number" }, paidPayments: { type: "number" }, totalPayments: { type: "number" }, paymentDay: { type: "number" }, active: { type: "boolean" }, reason: { type: "string" } }, required: ["loanId", "name", "originalAmount", "balance", "monthlyPayment", "paidPayments", "totalPayments", "paymentDay", "active", "reason"], additionalProperties: false } },
  { type: "function", name: "create_loan", description: "Создать кредит, когда в данных однозначно виден новый кредит", strict: true, parameters: { type: "object", properties: { name: { type: "string" }, originalAmount: { type: "number" }, balance: { type: "number" }, monthlyPayment: { type: "number" }, paidPayments: { type: "number" }, totalPayments: { type: "number" }, paymentDay: { type: "number" }, active: { type: "boolean" }, reason: { type: "string" } }, required: ["name", "originalAmount", "balance", "monthlyPayment", "paidPayments", "totalPayments", "paymentDay", "active", "reason"], additionalProperties: false } },
  { type: "function", name: "update_budget_line", description: "Исправить лимит существующей категории бюджета", strict: true, parameters: { type: "object", properties: { category: { type: "string" }, limit: { type: "number" }, reason: { type: "string" } }, required: ["category", "limit", "reason"], additionalProperties: false } },
  { type: "function", name: "update_account_balance", description: "Обновить реальный баланс счёта только по явно указанной пользователем сумме", strict: true, parameters: { type: "object", properties: { accountId: { type: "number" }, balance: { type: "number" }, reason: { type: "string" } }, required: ["accountId", "balance", "reason"], additionalProperties: false } },
];

function parseOfflineActions(message: string): Action[] {
  const normalized = message.trim();
  if (!/(добав|созда|запиш|постав)/i.test(normalized)) return [];
  const taskMatch = normalized.match(/(?:задач[ауи]?|сделать)\s*[:—-]?\s*(.+)/i);
  if (!taskMatch) return [];
  return taskMatch[1].split(/\s*(?:,|;|\n|\s+и\s+)\s*/).filter(Boolean).map((title, index) => ({ type: "create_task", payload: { title: title.replace(/[.!]+$/, ""), area: "Личное", dueDate: new Date().toISOString().slice(0, 10), time: index === 0 ? "09:00" : "11:00", duration: 30, energy: index === 0 ? "high" : "medium", context: "anywhere", priority: index === 0 ? "high" : "medium", project: "" } }));
}

function parseOfflineCapture(message: string, context: unknown): Action {
  const normalized = message.trim().replace(/[.!]+$/, "");
  const hint = context && typeof context === "object" && "hintArea" in context ? String((context as { hintArea?: unknown }).hintArea || "") : "";
  const projectLike = /(^|\s)(проект|запустить|организовать|переезд|ремонт|создать систему|разработать)(\s|$)/i.test(normalized);
  const taskLike = /(^|\s)(купить|позвонить|написать|сделать|оплатить|заказать|отправить|проверить|записаться|забронировать)(\s|$)/i.test(normalized);
  const destination = projectLike && !taskLike ? "project" : taskLike ? "task" : "resource";
  return { type: "organize_capture", payload: { original: message, destination, title: normalized, area: hint || "Личное", dueDate: destination === "task" ? new Date().toISOString().slice(0, 10) : "", time: "", duration: 30, energy: "medium", context: "anywhere", priority: "medium", project: "", goal: "", next: destination === "project" ? "Определить первый конкретный шаг" : "", note: destination === "resource" ? "Сохранено из быстрых входящих" : "" } };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: string; context?: unknown; mode?: "capture" | "assistant" };
    if (!body.message?.trim()) return Response.json({ error: "Введите сообщение." }, { status: 400 });
    const captureMode = body.mode === "capture";
    const apiKey = request.headers.get("x-nexus-byok") || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      if (captureMode) return Response.json({ reply: "Запись разобрана и сохранена.", actions: [parseOfflineCapture(body.message, body.context)], offline: true });
      const actions = parseOfflineActions(body.message);
      if (actions.length) return Response.json({ reply: `Готово. Добавлено задач: ${actions.length}.`, actions, offline: true });
      return Response.json({ error: "Добавьте OPENAI_API_KEY в Vercel или BYOK-ключ в настройках. Простые команды добавления задач работают и без ключа." }, { status: 503 });
    }
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions: captureMode ? CAPTURE_SYSTEM : SYSTEM,
      input: `Текущая дата: ${new Date().toISOString().slice(0, 10)}.\nКонтекст NEXUS OS:\n${JSON.stringify(body.context)}\n\n${captureMode ? "Запись из входящих" : "Команда пользователя"}: ${body.message}`,
      tools: captureMode ? [organizeCaptureTool] : tools,
      tool_choice: captureMode ? "required" : "auto",
      parallel_tool_calls: !captureMode,
      max_output_tokens: captureMode ? 500 : 1800,
    });
    const actions: Action[] = [];
    for (const item of response.output) {
      if (item.type !== "function_call") continue;
      try { actions.push({ type: item.name, payload: JSON.parse(item.arguments) as Record<string, unknown> }); } catch { /* ignore malformed action */ }
    }
    if (captureMode && !actions.length) actions.push(parseOfflineCapture(body.message, body.context));
    const reply = response.output_text || (actions.length ? `Готово. Выполнено действий: ${actions.length}.` : "Готово.");
    return Response.json({ reply, actions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return Response.json({ error: `Не удалось выполнить команду: ${message}` }, { status: 500 });
  }
}
