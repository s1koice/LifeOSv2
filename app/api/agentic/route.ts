import { createAgenticProvider } from "@/lib/agentic-provider";
import { buildAgenticContext, type AgenticContextInput, type AgenticSkill } from "@/lib/agentic";

export const runtime = "nodejs";

const skills = new Set<AgenticSkill>(["morning", "evening", "weekly", "finance", "goals"]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as { skill?: AgenticSkill; context?: AgenticContextInput };
    const skill = body.skill && skills.has(body.skill) ? body.skill : "morning";
    if (!body.context || typeof body.context !== "object") return Response.json({ error: "Нет контекста NEXUS" }, { status: 400 });
    const context = buildAgenticContext(body.context);
    const apiKey = request.headers.get("x-nexus-byok")?.trim() || process.env.OPENAI_API_KEY;
    const provider = createAgenticProvider(apiKey, process.env.OPENAI_MODEL);
    const brief = await provider.analyze(skill, context);
    return Response.json({ brief, provider: provider.id });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Daily Operator не смог выполнить анализ" }, { status: 500 });
  }
}

