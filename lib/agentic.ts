export type AgenticSkill = "morning" | "evening" | "weekly" | "finance" | "goals";
export type MemoryKind = "profile" | "current" | "episodic" | "pattern";
export type MemoryStatus = "candidate" | "saved" | "discarded";
export type SuggestionStatus = "pending" | "accepted" | "dismissed";
export type AgenticTone = "warning" | "focus" | "good";
export type AgenticSection = "Обзор" | "Задачи" | "Цели" | "Проекты" | "Привычки" | "Финансы" | "Здоровье" | "Планирование" | "Журнал" | "Настройки";

export type AgentMemory = {
  id: string;
  kind: MemoryKind;
  content: string;
  source: string;
  relevance: number;
  status: MemoryStatus;
  createdAt: string;
  evidenceCount?: number;
  related?: string[];
};

export type AgentSuggestionAction = {
  type: "open_section" | "schedule_today" | "create_task" | "create_journal" | "organize_inbox";
  label: string;
  section: AgenticSection;
  targetId?: number;
  payload?: Record<string, unknown>;
};

export type AgentSuggestion = {
  id: string;
  skill: AgenticSkill;
  title: string;
  reason: string;
  evidence: string;
  action: AgentSuggestionAction;
  status: SuggestionStatus;
  createdAt: string;
};

export type AgentActionLog = {
  id: string;
  createdAt: string;
  skill: AgenticSkill | "assistant";
  stage: "analyzed" | "proposed" | "executed" | "dismissed" | "memory";
  title: string;
  details: string;
};

export type EntityLink = {
  id: string;
  fromType: "goal" | "project" | "task" | "habit" | "health" | "finance" | "journal" | "insight";
  fromId: string;
  toType: "goal" | "project" | "task" | "habit" | "health" | "finance" | "journal" | "insight";
  toId: string;
  relation: string;
};

export type AgenticAttention = {
  id: string;
  tone: AgenticTone;
  title: string;
  reason: string;
  evidence: string;
  section: AgenticSection;
};

export type AgenticTopResult = { id: string; title: string; reason: string; taskId?: number };
export type AgenticInsight = { title: string; body: string; evidenceCount: number; confidence: number; possiblePattern: boolean };

export type AgenticBrief = {
  id: string;
  date: string;
  skill: AgenticSkill;
  generatedAt: string;
  summary: string;
  state: { sleep: string; energy: string; mood: string };
  attention: AgenticAttention[];
  top3: AgenticTopResult[];
  insight: AgenticInsight;
  suggestions: AgentSuggestion[];
  memoryCandidates: AgentMemory[];
  provider?: "rules" | "openai";
};

export type RoutineRun = { id: string; skill: AgenticSkill; date: string; createdAt: string; source: "routine" | "manual"; provider: "rules" | "openai" };

type ContextTask = { id: number; title: string; area: string; done: boolean; archived?: boolean; priority?: string; dueDate?: string; time?: string; duration?: number; projectId?: number; goalId?: number; createdAt?: string; completedAt?: string };
type ContextProject = { id: number; name: string; area: string; next?: string; due?: string; archived?: boolean };
type ContextGoal = { id: number; title: string; period: string; area?: string; projectIds?: number[]; parentGoalId?: number; progress?: number };
type ContextHabit = { id: number; name: string; area?: string; checks: Record<string, boolean> };
type ContextHealth = { id: number; title: string; value: string; date: string };
type ContextTransaction = { id: number; date: string; title: string; category: string; amount: number; kind: string; posted?: boolean; loanPayment?: boolean };
type ContextJournal = { id: number; date: string; mood: number; answers?: string[] };
type ContextInbox = { id: number; title: string; kind?: string; area?: string; createdAt: string; status?: string };

export type AgenticContext = {
  today: string;
  tasks: ContextTask[];
  projects: ContextProject[];
  goals: ContextGoal[];
  habits: ContextHabit[];
  health: ContextHealth[];
  transactions: ContextTransaction[];
  journals: ContextJournal[];
  inbox: ContextInbox[];
  budgetTotal: number;
  inboxCount: number;
  previousReviews: Array<{ weekStart: string; focus: string; completedAt: string }>;
  savedMemory: AgentMemory[];
};

export type AgenticContextInput = Omit<AgenticContext, "tasks" | "projects" | "goals" | "habits" | "health" | "transactions" | "journals" | "inbox" | "previousReviews"> & {
  tasks: ContextTask[];
  projects: ContextProject[];
  goals: ContextGoal[];
  habits: ContextHabit[];
  health: ContextHealth[];
  transactions: ContextTransaction[];
  journals: ContextJournal[];
  inbox: ContextInbox[];
  previousReviews: Array<{ weekStart: string; focus: string; completedAt: string }>;
};

const skillNames: Record<AgenticSkill, string> = { morning: "Утренний бриф", evening: "Вечерний разбор", weekly: "Обзор недели", finance: "Финансовый обзор", goals: "Обзор целей" };
const nowId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const dateOnly = (value?: string) => String(value || "").slice(0, 10);

function numberFromText(value: string) {
  const match = value.replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function healthValue(notes: ContextHealth[], pattern: RegExp) {
  return [...notes].filter(note => pattern.test(`${note.title} ${note.value}`)).sort((a, b) => b.date.localeCompare(a.date))[0];
}

function priorityScore(task: ContextTask, today: string) {
  const due = dateOnly(task.dueDate);
  return (due && due < today ? 80 : 0) + (due === today ? 45 : 0) + (task.priority === "high" ? 35 : task.priority === "medium" ? 20 : 8) + (task.projectId ? 8 : 0) + (task.goalId ? 8 : 0);
}

function currentMonth(today: string) { return today.slice(0, 7); }

export function buildAgenticContext(input: AgenticContextInput): AgenticContext {
  return {
    ...input,
    tasks: input.tasks.filter(task => !task.archived),
    projects: input.projects.filter(project => !project.archived),
    transactions: input.transactions.filter(item => item.posted !== false).slice(0, 500),
    inbox: input.inbox.filter(item => item.status !== "organized").slice(0, 30),
    savedMemory: input.savedMemory.filter(memory => memory.status === "saved").slice(0, 80),
  };
}

export function buildEntityLinks(context: AgenticContext): EntityLink[] {
  const links: EntityLink[] = [];
  context.tasks.forEach(task => {
    if (task.projectId) links.push({ id: `task-${task.id}-project-${task.projectId}`, fromType: "task", fromId: String(task.id), toType: "project", toId: String(task.projectId), relation: "belongs_to" });
    if (task.goalId) links.push({ id: `task-${task.id}-goal-${task.goalId}`, fromType: "task", fromId: String(task.id), toType: "goal", toId: String(task.goalId), relation: "advances" });
  });
  context.goals.forEach(goal => {
    goal.projectIds?.forEach(projectId => links.push({ id: `project-${projectId}-goal-${goal.id}`, fromType: "project", fromId: String(projectId), toType: "goal", toId: String(goal.id), relation: "advances" }));
    if (goal.parentGoalId) links.push({ id: `goal-${goal.id}-goal-${goal.parentGoalId}`, fromType: "goal", fromId: String(goal.id), toType: "goal", toId: String(goal.parentGoalId), relation: "supports" });
  });
  context.habits.forEach(habit => links.push({ id: `habit-${habit.id}-health-general`, fromType: "habit", fromId: String(habit.id), toType: "health", toId: "general", relation: "influences" }));
  return links;
}

function detectPossiblePattern(context: AgenticContext): AgenticInsight {
  const training = context.habits.find(habit => /трен|спорт|бег|зал/i.test(habit.name));
  const sleepNotes = context.health.filter(note => /сон|sleep/i.test(`${note.title} ${note.value}`));
  if (training && sleepNotes.length >= 3) {
    const observations = sleepNotes.map(note => ({ date: dateOnly(note.date), hours: numberFromText(note.value) })).filter(item => item.date && item.hours !== undefined);
    const lowSleep = observations.filter(item => Number(item.hours) < 6.5);
    const followedByMiss = lowSleep.filter(item => !training.checks[item.date]);
    if (lowSleep.length >= 3 && followedByMiss.length >= 2) return { title: "Возможная связь сна и тренировок", body: `${followedByMiss.length} из ${lowSleep.length} дней с коротким сном совпали с пропуском «${training.name}». Это возможная закономерность, а не доказанная причина.`, evidenceCount: lowSleep.length, confidence: Math.round(followedByMiss.length / lowSleep.length * 100), possiblePattern: true };
  }
  const monthTransactions = context.transactions.filter(item => item.kind === "expense" && !item.loanPayment && item.date.startsWith(currentMonth(context.today)));
  const daily = new Map<string, number>();
  monthTransactions.forEach(item => daily.set(item.date, (daily.get(item.date) || 0) + item.amount));
  const highDays = [...daily.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (highDays.length >= 3) return { title: "Расходы концентрируются в отдельные дни", body: `Три самых затратных дня месяца дали ${Math.round(highDays.reduce((sum, [, amount]) => sum + amount, 0))} ₪ расходов. Стоит проверить категории этих дней, не предполагая причин заранее.`, evidenceCount: highDays.length, confidence: 65, possiblePattern: true };
  const openByProject = new Map<number, number>();
  context.tasks.filter(task => !task.done && task.projectId).forEach(task => openByProject.set(Number(task.projectId), (openByProject.get(Number(task.projectId)) || 0) + 1));
  const withoutAction = context.projects.filter(project => !openByProject.get(project.id));
  if (withoutAction.length) return { title: "Проектам нужен следующий физический шаг", body: `${withoutAction.length} активных проектов не имеют открытых связанных задач. Без ближайшего действия прогресс трудно поддерживать.`, evidenceCount: withoutAction.length, confidence: 90, possiblePattern: false };
  return { title: "Система движется без явного узкого места", body: "Сейчас недостаточно повторных наблюдений для надёжной закономерности. NEXUS продолжит накапливать только значимые сигналы.", evidenceCount: 0, confidence: 40, possiblePattern: false };
}

function attentionFor(context: AgenticContext, skill: AgenticSkill): AgenticAttention[] {
  const attention: AgenticAttention[] = [];
  const open = context.tasks.filter(task => !task.done);
  const overdue = open.filter(task => dateOnly(task.dueDate) && dateOnly(task.dueDate) < context.today);
  const habitsDone = context.habits.filter(habit => habit.checks[context.today]).length;
  const sleep = healthValue(context.health, /сон|sleep/i);
  const sleepHours = sleep ? numberFromText(sleep.value) : undefined;
  const monthSpent = context.transactions.filter(item => item.kind === "expense" && !item.loanPayment && item.date.startsWith(currentMonth(context.today))).reduce((sum, item) => sum + item.amount, 0);
  const goalsWithoutProjects = context.goals.filter(goal => !goal.projectIds?.length && !context.tasks.some(task => task.goalId === goal.id));
  const projectsWithoutAction = context.projects.filter(project => !open.some(task => task.projectId === project.id));
  if ((skill === "morning" || skill === "evening" || skill === "weekly") && overdue.length) attention.push({ id: "overdue", tone: "warning", title: `${overdue.length} просроченных задач`, reason: "Они конкурируют с сегодняшним планом и создают скрытую нагрузку.", evidence: overdue.slice(0, 2).map(task => task.title).join(" · "), section: "Задачи" });
  if ((skill === "morning" || skill === "weekly") && sleepHours !== undefined && sleepHours < 6.5) attention.push({ id: "sleep", tone: "warning", title: `Сон ${sleepHours} ч`, reason: "Сегодня стоит уменьшить нагрузку и не планировать слишком много задач с высокой энергией.", evidence: sleep?.value || "", section: "Здоровье" });
  if ((skill === "morning" || skill === "evening" || skill === "weekly") && context.habits.length && habitsDone < Math.ceil(context.habits.length / 2)) attention.push({ id: "habits", tone: "focus", title: `Привычки ${habitsDone}/${context.habits.length}`, reason: "Большая часть сегодняшнего ритма ещё не отмечена.", evidence: context.habits.filter(habit => !habit.checks[context.today]).slice(0, 3).map(habit => habit.name).join(" · "), section: "Привычки" });
  if ((skill === "finance" || skill === "morning" || skill === "weekly") && context.budgetTotal > 0 && monthSpent > context.budgetTotal) attention.push({ id: "budget", tone: "warning", title: `Бюджет использован на ${Math.round(monthSpent / context.budgetTotal * 100)}%`, reason: "Фактические расходы уже выше месячного плана.", evidence: `${Math.round(monthSpent)} ₪ из ${Math.round(context.budgetTotal)} ₪`, section: "Финансы" });
  if ((skill === "goals" || skill === "weekly") && goalsWithoutProjects.length) attention.push({ id: "goal-links", tone: "focus", title: `${goalsWithoutProjects.length} целей без движущих действий`, reason: "Цель не связана ни с проектом, ни с конкретной задачей.", evidence: goalsWithoutProjects.slice(0, 2).map(goal => goal.title).join(" · "), section: "Цели" });
  if ((skill === "goals" || skill === "weekly" || skill === "morning") && projectsWithoutAction.length) attention.push({ id: "project-next", tone: "focus", title: `${projectsWithoutAction.length} проектов без следующей задачи`, reason: "В проекте указан результат, но нет открытого физического действия.", evidence: projectsWithoutAction.slice(0, 2).map(project => project.name).join(" · "), section: "Проекты" });
  if (context.inboxCount > 0) attention.push({ id: "inbox", tone: "focus", title: `${context.inboxCount} записей во Входящих`, reason: "Daily Operator может разобрать первую запись после вашего подтверждения.", evidence: context.inbox[0]?.title || "Неразобранные входящие", section: "Проекты" });
  if (!attention.length) attention.push({ id: "stable", tone: "good", title: "Критичных отклонений не найдено", reason: "Можно спокойно двигаться по трём главным результатам.", evidence: "Текущие данные NEXUS", section: "Обзор" });
  return attention.slice(0, 5);
}

function suggestionFromAttention(attention: AgenticAttention[], context: AgenticContext, skill: AgenticSkill): AgentSuggestion[] {
  const first = attention.find(item => item.id === "inbox") || attention.find(item => item.tone !== "good");
  if (!first) return [];
  const overdue = context.tasks.find(task => !task.done && dateOnly(task.dueDate) && dateOnly(task.dueDate) < context.today);
  const projectWithoutAction = context.projects.find(project => !context.tasks.some(task => !task.done && task.projectId === project.id));
  let action: AgentSuggestionAction = { type: "open_section", label: `Открыть «${first.section}»`, section: first.section };
  if (first.id === "overdue" && overdue) action = { type: "schedule_today", label: "Перенести одну задачу на сегодня", section: "Задачи", targetId: overdue.id };
  if (first.id === "project-next" && projectWithoutAction) action = { type: "create_task", label: "Создать следующий шаг", section: "Задачи", targetId: projectWithoutAction.id, payload: { title: projectWithoutAction.next || `Определить следующий шаг: ${projectWithoutAction.name}`, area: projectWithoutAction.area, projectId: projectWithoutAction.id } };
  if (first.id === "inbox" && context.inbox[0]) {
    const item = context.inbox[0];
    const kind = /^https?:\/\//i.test(item.title) ? "resource" : /(^|\s)(проект|project)(\s|:|$)/i.test(item.title) ? "project" : "task";
    action = { type: "organize_inbox", label: kind === "resource" ? "Сохранить как ресурс" : kind === "project" ? "Создать проект" : "Создать задачу", section: kind === "project" || kind === "resource" ? "Проекты" : "Задачи", targetId: item.id, payload: { title: item.title.replace(/^https?:\/\//i, "").trim() || item.title, url: /^https?:\/\//i.test(item.title) ? item.title : "", area: item.area || "Личное", kind } };
  }
  return [{ id: nowId("suggestion"), skill, title: first.title, reason: first.reason, evidence: first.evidence, action, status: "pending", createdAt: new Date().toISOString() }];
}

export function runAgenticSkill(skill: AgenticSkill, context: AgenticContext): AgenticBrief {
  const open = context.tasks.filter(task => !task.done).sort((a, b) => priorityScore(b, context.today) - priorityScore(a, context.today));
  const attention = attentionFor(context, skill);
  const insight = detectPossiblePattern(context);
  const top3 = open.slice(0, 3).map((task, index) => ({ id: `top-${task.id}`, taskId: task.id, title: task.title, reason: index === 0 ? "Самый высокий эффект или срочность" : task.projectId || task.goalId ? "Поддерживает активный проект или цель" : "Реалистично поместится в текущий день" }));
  const suggestions = suggestionFromAttention(attention, context, skill);
  const memoryCandidates: AgentMemory[] = insight.evidenceCount >= 3 ? [{ id: nowId("memory"), kind: "pattern", content: insight.body, source: skillNames[skill], relevance: insight.confidence, status: "candidate", createdAt: new Date().toISOString(), evidenceCount: insight.evidenceCount, related: attention.slice(0, 2).map(item => item.id) }] : [];
  const latestJournal = [...context.journals].sort((a, b) => b.date.localeCompare(a.date))[0];
  const sleep = healthValue(context.health, /сон|sleep/i);
  const energy = healthValue(context.health, /энерг/i);
  return {
    id: nowId("brief"), date: context.today, skill, generatedAt: new Date().toISOString(), provider: "rules",
    summary: `${skillNames[skill]}: ${attention.filter(item => item.tone !== "good").length} сигналов, ${top3.length} приоритета.`,
    state: { sleep: sleep?.value || "Нет данных", energy: energy?.value || "Нет данных", mood: latestJournal ? `${latestJournal.mood}/5` : "Нет данных" },
    attention, top3, insight, suggestions, memoryCandidates,
  };
}
