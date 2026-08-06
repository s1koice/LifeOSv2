import OpenAI from "openai";

export const runtime = "nodejs";

type Action = { type: string; payload: Record<string, unknown> };

const SYSTEM = `Ты — исполнительный персональный ассистент NEXUS AI. Отвечай по-русски, кратко и по делу.
Главное правило: если пользователь просит создать, добавить, завершить, изменить или спланировать сущности, вызывай подходящие инструменты сразу. Не спрашивай подтверждение и не задавай уточняющие вопросы, если можно выбрать разумное значение по умолчанию. Пользователь предпочитает быстро получить результат и потом исправить его кнопкой отмены или вручную.
Для каждой задачи оцени продолжительность в минутах, требуемую энергию и контекст. Если пользователь просит спланировать день, выбери до 5 существующих незавершённых задач из контекста, назначь им реалистичные дату и время через update_task, избегай пересечения времени и учитывай высокий уровень энергии в первой половине дня. Если задач недостаточно и результат явно требует новых действий — создай их. Дату всегда передавай в формате YYYY-MM-DD, время — HH:MM. Если упоминается существующий проект, передай его название в поле project; иначе пустую строку. Если в одном сообщении несколько задач, вызови create_task для каждой. После действий сообщи одним коротким предложением, что выполнено.`;

const tools: OpenAI.Responses.Tool[] = [
  { type: "function", name: "create_task", description: "Немедленно добавить задачу в общий список и при необходимости связать с существующим проектом", strict: true, parameters: { type: "object", properties: { title: { type: "string" }, area: { type: "string" }, dueDate: { type: "string", description: "Дата YYYY-MM-DD или пустая строка" }, time: { type: "string", description: "Время HH:MM" }, duration: { type: "number", description: "Оценка в минутах" }, energy: { type: "string", enum: ["low", "medium", "high"] }, context: { type: "string", enum: ["anywhere", "computer", "phone", "home", "outside"] }, priority: { type: "string", enum: ["high", "medium", "low"] }, project: { type: "string", description: "Название существующего проекта или пустая строка" } }, required: ["title", "area", "dueDate", "time", "duration", "energy", "context", "priority", "project"], additionalProperties: false } },
  { type: "function", name: "update_task", description: "Изменить и поставить в календарь существующую задачу", strict: true, parameters: { type: "object", properties: { currentTitle: { type: "string", description: "Текущее название задачи из контекста" }, newTitle: { type: "string", description: "Новое название или текущее без изменений" }, dueDate: { type: "string", description: "Дата YYYY-MM-DD" }, time: { type: "string", description: "Время HH:MM" }, duration: { type: "number" }, energy: { type: "string", enum: ["low", "medium", "high"] }, context: { type: "string", enum: ["anywhere", "computer", "phone", "home", "outside"] } }, required: ["currentTitle", "newTitle", "dueDate", "time", "duration", "energy", "context"], additionalProperties: false } },
  { type: "function", name: "complete_task", description: "Отметить существующую задачу выполненной по названию", strict: true, parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"], additionalProperties: false } },
  { type: "function", name: "create_project", description: "Немедленно создать проект", strict: true, parameters: { type: "object", properties: { name: { type: "string" }, area: { type: "string" }, due: { type: "string" }, next: { type: "string" } }, required: ["name", "area", "due", "next"], additionalProperties: false } },
  { type: "function", name: "create_goal", description: "Немедленно создать цель", strict: true, parameters: { type: "object", properties: { title: { type: "string" }, period: { type: "string", enum: ["ГОД", "КВАРТАЛ", "МЕСЯЦ", "НЕДЕЛЯ", "СЕГОДНЯ"] }, date: { type: "string" }, note: { type: "string" } }, required: ["title", "period", "date", "note"], additionalProperties: false } },
  { type: "function", name: "create_habit", description: "Немедленно создать новую привычку", strict: true, parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } },
];

function parseOfflineActions(message: string): Action[] {
  const normalized = message.trim();
  if (!/(добав|созда|запиш|постав)/i.test(normalized)) return [];
  const taskMatch = normalized.match(/(?:задач[ауи]?|сделать)\s*[:—-]?\s*(.+)/i);
  if (!taskMatch) return [];
  return taskMatch[1].split(/\s*(?:,|;|\n|\s+и\s+)\s*/).filter(Boolean).map((title, index) => ({ type: "create_task", payload: { title: title.replace(/[.!]+$/, ""), area: "Личное", dueDate: new Date().toISOString().slice(0, 10), time: index === 0 ? "09:00" : "11:00", duration: 30, energy: index === 0 ? "high" : "medium", context: "anywhere", priority: index === 0 ? "high" : "medium", project: "" } }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: string; context?: unknown };
    if (!body.message?.trim()) return Response.json({ error: "Введите сообщение." }, { status: 400 });
    const apiKey = request.headers.get("x-nexus-byok") || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const actions = parseOfflineActions(body.message);
      if (actions.length) return Response.json({ reply: `Готово. Добавлено задач: ${actions.length}.`, actions, offline: true });
      return Response.json({ error: "Добавьте OPENAI_API_KEY в Vercel или BYOK-ключ в настройках. Простые команды добавления задач работают и без ключа." }, { status: 503 });
    }
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions: SYSTEM,
      input: `Текущая дата: ${new Date().toISOString().slice(0, 10)}.\nКонтекст NEXUS OS:\n${JSON.stringify(body.context)}\n\nКоманда пользователя: ${body.message}`,
      tools,
      tool_choice: "auto",
      parallel_tool_calls: true,
      max_output_tokens: 900,
    });
    const actions: Action[] = [];
    for (const item of response.output) {
      if (item.type !== "function_call") continue;
      try { actions.push({ type: item.name, payload: JSON.parse(item.arguments) as Record<string, unknown> }); } catch { /* ignore malformed action */ }
    }
    const reply = response.output_text || (actions.length ? `Готово. Выполнено действий: ${actions.length}.` : "Готово.");
    return Response.json({ reply, actions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return Response.json({ error: `Не удалось выполнить команду: ${message}` }, { status: 500 });
  }
}
