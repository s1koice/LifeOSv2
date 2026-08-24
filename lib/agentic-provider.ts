import OpenAI from "openai";
import { runAgenticSkill, type AgenticBrief, type AgenticContext, type AgenticSkill } from "@/lib/agentic";

export interface AgenticProvider {
  readonly id: "rules" | "openai";
  analyze(skill: AgenticSkill, context: AgenticContext): Promise<AgenticBrief>;
}

export class RulesAgenticProvider implements AgenticProvider {
  readonly id = "rules" as const;
  async analyze(skill: AgenticSkill, context: AgenticContext) { return runAgenticSkill(skill, context); }
}

const sections = ["Обзор", "Задачи", "Цели", "Проекты", "Привычки", "Финансы", "Здоровье", "Планирование", "Журнал", "Настройки"];

export class OpenAIAgenticProvider implements AgenticProvider {
  readonly id = "openai" as const;
  constructor(private readonly apiKey: string, private readonly model = "gpt-5-mini") {}

  async analyze(skill: AgenticSkill, context: AgenticContext): Promise<AgenticBrief> {
    const fallback = runAgenticSkill(skill, context);
    const client = new OpenAI({ apiKey: this.apiKey });
    const response = await client.responses.create({
      model: this.model,
      instructions: `Ты — Daily Operator персональной системы NEXUS OS. Анализируй, а не пересказывай данные. Отвечай по-русски. Выбери максимум 5 отклонений и ровно до 3 главных результатов. Не называй корреляцию причиной: используй «возможная закономерность» и указывай число наблюдений. Не предлагай внешних или необратимых действий. Не выдумывай отсутствующие показатели. Используй сохранённую память только как контекст, а не как безусловный факт.`,
      input: `Skill: ${skill}. Сегодня: ${context.today}. Контекст NEXUS: ${JSON.stringify(context).slice(0, 150_000)}`,
      tools: [{
        type: "function",
        name: "daily_operator_brief",
        description: "Вернуть краткий анализ Daily Operator без выполнения действий",
        strict: true,
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string" },
            attention: { type: "array", maxItems: 5, items: { type: "object", properties: { id: { type: "string" }, tone: { type: "string", enum: ["warning", "focus", "good"] }, title: { type: "string" }, reason: { type: "string" }, evidence: { type: "string" }, section: { type: "string", enum: sections } }, required: ["id", "tone", "title", "reason", "evidence", "section"], additionalProperties: false } },
            top3: { type: "array", maxItems: 3, items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, reason: { type: "string" }, taskId: { type: "number" } }, required: ["id", "title", "reason", "taskId"], additionalProperties: false } },
            insight: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, evidenceCount: { type: "number" }, confidence: { type: "number" }, possiblePattern: { type: "boolean" } }, required: ["title", "body", "evidenceCount", "confidence", "possiblePattern"], additionalProperties: false },
          },
          required: ["summary", "attention", "top3", "insight"],
          additionalProperties: false,
        },
      }],
      tool_choice: { type: "function", name: "daily_operator_brief" },
      max_output_tokens: 1800,
    });
    const call = response.output.find(item => item.type === "function_call" && item.name === "daily_operator_brief");
    if (!call || call.type !== "function_call") return fallback;
    const parsed = JSON.parse(call.arguments) as Pick<AgenticBrief, "summary" | "attention" | "top3" | "insight">;
    const knownTaskIds = new Set(context.tasks.map(task => task.id));
    return {
      ...fallback,
      summary: parsed.summary || fallback.summary,
      attention: Array.isArray(parsed.attention) ? parsed.attention.slice(0, 5) : fallback.attention,
      top3: Array.isArray(parsed.top3) ? parsed.top3.filter(item => knownTaskIds.has(item.taskId || -1)).slice(0, 3) : fallback.top3,
      insight: parsed.insight || fallback.insight,
      provider: "openai",
      generatedAt: new Date().toISOString(),
    };
  }
}

export function createAgenticProvider(apiKey?: string, model?: string): AgenticProvider {
  return apiKey ? new OpenAIAgenticProvider(apiKey, model) : new RulesAgenticProvider();
}
