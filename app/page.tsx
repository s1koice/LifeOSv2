"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadPinCloudState, readPinSession, savePinCloudState, signInWithPin, signOutPin, type PinSession } from "@/lib/pin-cloud";

type Section = "Обзор" | "Задачи" | "Цели" | "Проекты" | "Привычки" | "Финансы" | "Здоровье" | "Планирование" | "Журнал" | "Настройки";
type Priority = "high" | "medium" | "low";
type TaskEnergy = "low" | "medium" | "high";
type TaskContext = "anywhere" | "computer" | "phone" | "home" | "outside";
type LifeArea = { id: number; name: string; icon: string; color: string; standard?: string; reviewScore?: number };
type Task = { id: number; title: string; area: string; time: string; done: boolean; priority: Priority; projectId?: number; goalId?: number; dueDate?: string; archived?: boolean; duration?: number; energy?: TaskEnergy; context?: TaskContext; notes?: string; createdAt?: string; completedAt?: string };
type Milestone = { id: number; title: string; done: boolean };
type Project = { id: number; name: string; area: string; progress: number; due: string; next: string; cover?: string; notes?: string; milestones?: Milestone[]; archived?: boolean };
type InboxItem = { id: number; title: string; kind: "idea" | "task" | "note"; createdAt: string; area?: string };
type ResourceItem = { id: number; title: string; kind: "note" | "link" | "reference"; area: string; note: string; url?: string; projectId?: number; archived?: boolean };
type Goal = { id: number; period: string; date: string; title: string; note: string; progress: number; area?: string; projectIds?: number[]; parentGoalId?: number };
type Habit = { id: number; name: string; icon: string; checks: Record<string, boolean>; weekStart: string; area?: string };
type HabitHistory = { id: number; habitId: number; habitName: string; weekStart: string; completed: number; total: number; checks: Record<string, boolean> };
type AccountType = "cash" | "debit" | "credit";
type Account = { id: number; name: string; type: AccountType; balance: number; linkedAccountId?: number; billingDay?: number };
type FinanceKind = "income" | "expense" | "transfer" | "installment";
type Transaction = { id: number; title: string; category: string; amount: number; kind: FinanceKind; date: string; accountId: number; toAccountId?: number; parentId?: number; installmentIndex?: number; installmentCount?: number; dueDate?: string; posted?: boolean; recurringId?: number; recurringPeriod?: string };
type FinanceCategory = { id: number; name: string; icon: string };
type BudgetLine = { id: number; category: string; limit: number };
type RecurringExpense = { id: number; title: string; category: string; amount: number; accountId: number; dayOfMonth: number; active: boolean; lastProcessedPeriod?: string };
type CalendarEvent = { id: number; title: string; date?: string; day?: number; time: string; tone: "lime" | "purple" | "orange"; note?: string };
type HealthNote = { id: number; kind: "note" | "metric"; title: string; value: string; date: string };
type JournalEntry = { id: number; date: string; mood: number; answers: string[] };
type ParaWeeklyReview = { id: number; weekStart: string; completedAt: string; focus: string; inboxCount: number; overdueCount: number; projectsWithoutNext: number; areaAverage: number };
type ModalKind = "task" | "project" | "goal" | "habit" | "transaction" | "account" | "transfer" | "health" | "event" | null;
type AssistantAction = { type: string; payload: Record<string, unknown> };
type SpeechResultEvent = { results: { [index: number]: { [index: number]: { transcript: string } } } };
type SpeechRecognitionLike = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((event: SpeechResultEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type Theme = "lime" | "orbit" | "light";
type DashboardBlockId = "dayCenter" | "focus" | "tracker" | "today" | "compass" | "habits" | "goals" | "projects" | "reflection" | "game";
type UndoSnapshot = { id: number; label: string; createdAt: string; tasks: Task[]; projects: Project[]; goals: Goal[]; habits: Habit[]; events: CalendarEvent[] };
type SyncStatus = "local" | "loading" | "syncing" | "synced" | "error";
type NexusNotification = { id: string; icon: string; title: string; text: string; section: Section; action: string; tone?: "warning" | "info" | "success" };
type UserProfile = { name: string; textScale: "normal" | "large" | "extra" };
type FocusSession = { id: number; taskId?: number; taskTitle: string; startedAt: string; endedAt: string; minutes: number };
type GameEvent = { id: number; key: string; date: string; delta: number; title: string; category: "action" | "completion" | "rhythm" | "penalty" };
type GameDay = { date: string; score: number; actions: number };
type GamificationState = { xp: number; events: GameEvent[]; activeDays: string[]; dailyScores: GameDay[] };
type GameEventDraft = Omit<GameEvent, "id" | "date"> & { date?: string };
type GameSnapshot = {
  today: string;
  tasks: Record<string, { done: boolean; priority: Priority }>;
  habits: Record<string, boolean>;
  projects: number[];
  goals: number[];
  inbox: number[];
  resources: number[];
  events: number[];
  journals: number[];
  health: number[];
  reviews: number[];
  transactions: Record<string, { kind: FinanceKind; posted: boolean; recurring: boolean }>;
  milestones: Record<string, boolean>;
  focuses: string[];
  focusSessions: number[];
};

const defaultDashboardOrder: DashboardBlockId[] = ["dayCenter", "focus", "game", "tracker", "today", "compass", "habits", "goals", "projects", "reflection"];
const seedGamification: GamificationState = { xp: 2840, events: [], activeDays: [], dailyScores: [] };
const gameBlockLabels: Record<DashboardBlockId, string> = { dayCenter: "Умный центр дня", focus: "Фокус дня", game: "Уровень и XP", tracker: "Трекер", today: "Задачи", compass: "Компас", habits: "Привычки", goals: "Цели", projects: "Проекты", reflection: "Разбор дня" };

const nav: { group: string; items: { label: Section; icon: string }[] }[] = [
  { group: "Пространство", items: [{ label: "Обзор", icon: "◈" }, { label: "Задачи", icon: "✓" }, { label: "Цели", icon: "◎" }, { label: "Проекты", icon: "▦" }] },
  { group: "Сферы жизни", items: [{ label: "Привычки", icon: "↗" }, { label: "Финансы", icon: "₪" }, { label: "Здоровье", icon: "+" }] },
  { group: "Рефлексия", items: [{ label: "Планирование", icon: "□" }, { label: "Журнал", icon: "✦" }, { label: "Настройки", icon: "⚙" }] },
];

const seedTasks: Task[] = [
  { id: 1, title: "Завершить структуру лендинга", area: "Карьера", time: "10:00", done: false, priority: "high", projectId: 1, goalId: 5, duration: 90, energy: "high", context: "computer" },
  { id: 2, title: "Тренировка: спина и плечи", area: "Здоровье", time: "13:30", done: false, priority: "medium", duration: 60, energy: "high", context: "outside" },
  { id: 3, title: "Разобрать расходы за неделю", area: "Финансы", time: "17:00", done: false, priority: "low", duration: 30, energy: "low", context: "computer" },
  { id: 4, title: "Прочитать 20 страниц", area: "Развитие", time: "21:00", done: true, priority: "low", duration: 25, energy: "low", context: "anywhere" },
];

const seedProjects: Project[] = [
  { id: 1, name: "Запуск NEXUS OS", area: "Карьера", progress: 68, due: "12 авг", next: "Собрать MVP dashboard", cover: "linear-gradient(135deg,#2c2455,#7c4dff 58%,#d565ff)", milestones: [{ id: 11, title: "Готова структура продукта", done: true }, { id: 12, title: "Проверены основные сценарии", done: false }] },
  { id: 2, name: "Финансовая подушка", area: "Финансы", progress: 42, due: "31 дек", next: "Настроить автоперевод", cover: "linear-gradient(135deg,#142c31,#198a78 58%,#6ee7b7)", milestones: [{ id: 21, title: "Определить целевую сумму", done: true }, { id: 22, title: "Накопить первый месяц расходов", done: false }] },
  { id: 3, name: "Полумарафон", area: "Здоровье", progress: 56, due: "21 сен", next: "Интервальная тренировка", cover: "linear-gradient(135deg,#332316,#d36a2e 55%,#ffb45e)", milestones: [{ id: 31, title: "Пробежать 10 км без остановки", done: true }, { id: 32, title: "Пройти контрольную дистанцию 15 км", done: false }] },
];

const seedGoals: Goal[] = [
  { id: 1, period: "ГОД", date: "2026", title: "Создать устойчивую систему жизни", note: "Жить осознанно, свободно и с запасом энергии.", progress: 54 },
  { id: 2, period: "КВАРТАЛ", date: "Q3", title: "Запустить и внедрить NEXUS OS", note: "Единая система вместо разрозненных инструментов.", progress: 61, projectIds: [1], parentGoalId: 1 },
  { id: 3, period: "МЕСЯЦ", date: "Август", title: "Собрать рабочий MVP", note: "Dashboard, планирование и ежедневные ритуалы.", progress: 68, projectIds: [1], parentGoalId: 1 },
  { id: 4, period: "НЕДЕЛЯ", date: "Эта неделя", title: "Закрыть ключевые экраны", note: "Пять измеримых результатов.", progress: 60, projectIds: [1, 3], parentGoalId: 3 },
  { id: 5, period: "СЕГОДНЯ", date: "Сегодня", title: "Закончить основу", note: "2 часа 30 минут глубокого фокуса.", progress: 32, projectIds: [1], parentGoalId: 4 },
];

const seedHabitNames = [
  { id: 1, name: "Стакан воды утром", icon: "◒" },
  { id: 2, name: "10 минут медитации", icon: "◌" },
  { id: 3, name: "Чтение · 20 страниц", icon: "▤" },
  { id: 4, name: "Без телефона после 22:30", icon: "☾" },
];

const seedLifeAreas: LifeArea[] = [
  { id: 1, name: "Карьера", icon: "💼", color: "#9f7aea", standard: "Каждую неделю завершать один важный результат", reviewScore: 72 },
  { id: 2, name: "Здоровье", icon: "❤️", color: "#ff6b7d", standard: "Сон, движение и восстановление без перегрузки", reviewScore: 78 },
  { id: 3, name: "Финансы", icon: "💰", color: "#ffb45e", standard: "Тратить по плану и ежемесячно увеличивать резерв", reviewScore: 64 },
  { id: 4, name: "Развитие", icon: "🧠", color: "#b8a6ff", standard: "Учиться через практику и фиксировать выводы", reviewScore: 70 },
  { id: 5, name: "Отношения", icon: "🤝", color: "#57e0b7", standard: "Быть внимательным и поддерживать регулярный контакт", reviewScore: 74 },
  { id: 6, name: "Отдых", icon: "🌿", color: "#7ddf84", standard: "Оставлять время без задач и экранов", reviewScore: 58 },
];

const seedInboxItems: InboxItem[] = [
  { id: 101, title: "Проверить идею еженедельного обзора", kind: "idea", createdAt: "2026-08-05T08:30:00.000Z", area: "Развитие" },
  { id: 102, title: "Записаться на профилактический осмотр", kind: "task", createdAt: "2026-08-05T09:00:00.000Z", area: "Здоровье" },
];

const seedResources: ResourceItem[] = [
  { id: 201, title: "Чек-лист запуска продукта", kind: "reference", area: "Карьера", note: "Последовательность проверки идеи, MVP и релиза.", projectId: 1 },
  { id: 202, title: "Правила личного бюджета", kind: "note", area: "Финансы", note: "Сначала резерв и постоянные платежи, затем гибкие категории." },
  { id: 203, title: "План подготовки к забегу", kind: "link", area: "Здоровье", note: "Недельный объём, восстановление и контрольные дистанции.", projectId: 3 },
];

const seedFinanceCategories: FinanceCategory[] = [
  { id: 1, name: "Продукты", icon: "🛒" }, { id: 2, name: "Жильё", icon: "🏠" },
  { id: 3, name: "Транспорт", icon: "🚕" }, { id: 4, name: "Здоровье", icon: "❤️" },
  { id: 5, name: "Развитие", icon: "📚" }, { id: 6, name: "Отдых", icon: "🎟️" },
  { id: 7, name: "Покупки", icon: "🛍️" }, { id: 8, name: "Другое", icon: "•••" },
];

const seedBudgetLines: BudgetLine[] = [
  { id: 1, category: "Жильё", limit: 6000 }, { id: 2, category: "Продукты", limit: 3500 },
  { id: 3, category: "Транспорт", limit: 1200 }, { id: 4, category: "Здоровье", limit: 900 },
  { id: 5, category: "Развитие", limit: 1600 }, { id: 6, category: "Отдых", limit: 1200 },
  { id: 7, category: "Покупки", limit: 1000 }, { id: 8, category: "Другое", limit: 600 },
];

const seedRecurringExpenses: RecurringExpense[] = [
  { id: 1, title: "Аренда квартиры", category: "Жильё", amount: 5600, accountId: 2, dayOfMonth: 2, active: true, lastProcessedPeriod: "2026-08" },
  { id: 2, title: "Медицинская страховка", category: "Здоровье", amount: 320, accountId: 2, dayOfMonth: 10, active: true },
  { id: 3, title: "Мобильная связь", category: "Другое", amount: 89, accountId: 3, dayOfMonth: 15, active: true },
];

const seedAccounts: Account[] = [
  { id: 1, name: "Наличные", type: "cash", balance: 1250 },
  { id: 2, name: "Основной счёт", type: "debit", balance: 18450 },
  { id: 3, name: "Кредитная карта", type: "credit", balance: -3400, linkedAccountId: 2, billingDay: 15 },
];

const seedTransactions: Transaction[] = [
  { id: 1, title: "Зарплата", category: "Доход", amount: 18500, kind: "income", date: "2026-08-01", accountId: 2, posted: true },
  { id: 2, title: "Аренда квартиры", category: "Жильё", amount: 5600, kind: "expense", date: "2026-08-02", accountId: 2, posted: true },
  { id: 3, title: "Продукты", category: "Продукты", amount: 247, kind: "expense", date: "2026-08-04", accountId: 1, posted: true },
];

const seedEvents: CalendarEvent[] = [
  { id: 1, title: "Глубокий фокус", day: 1, time: "09:00", tone: "lime" },
  { id: 2, title: "Тренировка", day: 1, time: "15:00", tone: "purple" },
  { id: 3, title: "Созвон команды", day: 3, time: "11:30", tone: "purple" },
  { id: 4, title: "Обзор недели", day: 5, time: "14:30", tone: "orange" },
];

const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const formatIls = (value: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(value);
const newEntityId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
function uniqueEntityIds<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.map(item => {
    const id = Number(item.id);
    if (Number.isFinite(id) && !seen.has(id)) { seen.add(id); return item; }
    const replacement = newEntityId(); seen.add(replacement); return { ...item, id: replacement };
  });
}
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const prettyDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const energyLabel: Record<TaskEnergy, string> = { low: "Низкая энергия", medium: "Средняя энергия", high: "Высокая энергия" };
const contextLabel: Record<TaskContext, string> = { anywhere: "Где угодно", computer: "За компьютером", phone: "Телефон", home: "Дома", outside: "Вне дома" };

function habitClock(now = new Date()) {
  const activeDay = new Date(now);
  if (activeDay.getDay() === 0 && activeDay.getHours() < 5) activeDay.setDate(activeDay.getDate() - 1);
  const start = new Date(activeDay);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(5, 0, 0, 0);
  const dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  return { weekStart: localDateKey(start), today: localDateKey(activeDay), dates };
}

function nextBillingDate(index: number, billingDay = 15) {
  const now = new Date();
  return localDateKey(new Date(now.getFullYear(), now.getMonth() + 1 + index, billingDay, 12));
}

function startOfWeek(date = new Date()) {
  const start = new Date(date);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function normalizeCalendarEvents(raw: unknown): CalendarEvent[] {
  const source = Array.isArray(raw) ? raw as CalendarEvent[] : seedEvents;
  const currentWeekStart = startOfWeek(new Date());
  return uniqueEntityIds(source.map(event => {
    if (event.date) return event;
    const fixedDate = new Date(currentWeekStart);
    fixedDate.setDate(fixedDate.getDate() + Math.max(0, Math.min(6, Number(event.day || 0))));
    return { ...event, date: localDateKey(fixedDate) };
  }));
}

function projectCoverStyle(cover?: string): React.CSSProperties {
  if (!cover) return {};
  return { backgroundImage: cover.startsWith("data:image") ? `linear-gradient(#090a0e22,#090a0e88),url(${cover})` : cover };
}

function projectProgressValue(project: Project, tasks: Task[]) {
  const linkedTasks = tasks.filter(task => task.projectId === project.id && !task.archived);
  if (linkedTasks.length) return Math.round(linkedTasks.filter(task => task.done).length / linkedTasks.length * 100);
  const milestones = project.milestones || [];
  if (milestones.length) return Math.round(milestones.filter(item => item.done).length / milestones.length * 100);
  return project.progress;
}

function goalProgressValue(goal: Goal, projects: Project[], tasks: Task[], goals: Goal[] = []) {
  const values: number[] = [];
  const linkedProjects = projects.filter(project => goal.projectIds?.includes(project.id) && !project.archived);
  linkedProjects.forEach(project => values.push(projectProgressValue(project, tasks)));
  const linkedTasks = tasks.filter(task => task.goalId === goal.id && !task.archived);
  if (linkedTasks.length) values.push(Math.round(linkedTasks.filter(task => task.done).length / linkedTasks.length * 100));
  const childGoals = goals.filter(child => child.parentGoalId === goal.id);
  childGoals.forEach(child => values.push(child.progress));
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : goal.progress;
}

const goalPeriodOrder = ["ГОД", "МЕСЯЦ", "НЕДЕЛЯ", "СЕГОДНЯ"] as const;
function goalParentPeriod(period: string) {
  if (period === "СЕГОДНЯ") return "НЕДЕЛЯ";
  if (period === "НЕДЕЛЯ") return "МЕСЯЦ";
  if (period === "МЕСЯЦ") return "ГОД";
  return "";
}

function taskActualMinutes(taskId: number, sessions: FocusSession[]) {
  return sessions.filter(session => session.taskId === taskId).reduce((sum, session) => sum + session.minutes, 0);
}

function normalizeGoals(raw: Goal[]) {
  const source = uniqueEntityIds(raw);
  return source.map(goal => {
    if (goal.parentGoalId || goal.period === "ГОД") return goal;
    const parentPeriod = goalParentPeriod(goal.period);
    const parent = source.find(candidate => candidate.period === parentPeriod);
    return parent ? { ...goal, parentGoalId: parent.id } : goal;
  });
}

function normalizeDashboardOrder(raw: unknown): DashboardBlockId[] {
  const allowed = new Set<DashboardBlockId>(defaultDashboardOrder);
  const stored = Array.isArray(raw) ? raw.filter((item): item is DashboardBlockId => typeof item === "string" && allowed.has(item as DashboardBlockId)) : [];
  return [...new Set(stored), ...defaultDashboardOrder.filter(item => !stored.includes(item))];
}

function normalizeGamification(raw: unknown): GamificationState {
  if (!raw || typeof raw !== "object") return seedGamification;
  const value = raw as Partial<GamificationState>;
  return {
    xp: Number.isFinite(value.xp) ? Math.max(0, Number(value.xp)) : seedGamification.xp,
    events: Array.isArray(value.events) ? value.events.slice(0, 500) : [],
    activeDays: Array.isArray(value.activeDays) ? value.activeDays.filter(item => typeof item === "string").slice(-120) : [],
    dailyScores: Array.isArray(value.dailyScores) ? value.dailyScores.slice(-60) : [],
  };
}

function gameLevel(xp: number) {
  const step = 250;
  const safeXp = Math.max(0, Math.round(xp));
  const level = Math.floor(safeXp / step) + 1;
  const current = safeXp % step;
  return { level, current, step, progress: Math.round(current / step * 100), remaining: step - current };
}

function gameStreak(activeDays: string[]) {
  const days = new Set(activeDays);
  const cursor = new Date();
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDateKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

function addGameEvents(current: GamificationState, drafts: GameEventDraft[]) {
  const known = new Set(current.events.map(event => event.key));
  const fresh = drafts.filter(draft => { if (known.has(draft.key)) return false; known.add(draft.key); return true; });
  if (!fresh.length) return current;
  const today = localDateKey(new Date());
  const events = fresh.map((draft, index): GameEvent => ({ ...draft, id: newEntityId() + index, date: draft.date || today }));
  const activeDays = new Set(current.activeDays);
  events.filter(event => event.delta > 0).forEach(event => activeDays.add(event.date));
  return { ...current, xp: Math.max(0, current.xp + events.reduce((sum, event) => sum + event.delta, 0)), events: [...events, ...current.events].slice(0, 500), activeDays: [...activeDays].sort().slice(-120) };
}

function settleDueInstallments(accounts: Account[], entries: Transaction[]) {
  const today = localDateKey(new Date());
  const nextAccounts = accounts.map(a => ({ ...a }));
  const nextEntries = entries.map(entry => {
    if (entry.kind !== "installment" || entry.posted || !entry.dueDate || entry.dueDate > today) return entry;
    const credit = nextAccounts.find(a => a.id === entry.accountId);
    const debit = nextAccounts.find(a => a.id === credit?.linkedAccountId);
    if (credit && debit) { debit.balance -= entry.amount; credit.balance += entry.amount; }
    return { ...entry, posted: true, date: entry.dueDate };
  });
  return { accounts: nextAccounts, entries: nextEntries };
}

function applyDueRecurringExpenses(accounts: Account[], entries: Transaction[], recurring: RecurringExpense[], now = new Date()) {
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = now.getDate();
  const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const nextAccounts = accounts.map(account => ({ ...account }));
  const nextEntries = [...entries];
  let processed = 0;
  const nextRecurring = recurring.map(item => {
    const dueDay = Math.min(maxDay, Math.max(1, item.dayOfMonth));
    const alreadyPosted = item.lastProcessedPeriod === period || nextEntries.some(entry => entry.recurringId === item.id && entry.recurringPeriod === period);
    if (!item.active || alreadyPosted || today < dueDay) return item;
    const account = nextAccounts.find(candidate => candidate.id === item.accountId);
    if (!account) return item;
    account.balance -= item.amount;
    nextEntries.unshift({ id: newEntityId() + processed, title: item.title, category: item.category, amount: item.amount, kind: "expense", date: `${period}-${String(dueDay).padStart(2, "0")}`, accountId: item.accountId, posted: true, recurringId: item.id, recurringPeriod: period });
    processed += 1;
    return { ...item, lastProcessedPeriod: period };
  });
  return { accounts: nextAccounts, entries: nextEntries, recurring: nextRecurring, processed };
}

function normalizeHabits(raw: unknown, storedHistory: HabitHistory[]) {
  const clock = habitClock();
  const source = Array.isArray(raw) && raw.length ? raw : seedHabitNames;
  const history = [...storedHistory];
  const habits: Habit[] = source.map((item, index) => {
    const old = item as Partial<Habit> & { done?: boolean };
    const checks = old.checks && typeof old.checks === "object" ? old.checks : old.done ? { [clock.today]: true } : {};
    const habit: Habit = { id: Number(old.id || index + 1), name: String(old.name || `Привычка ${index + 1}`), icon: String(old.icon || "✦"), checks, weekStart: String(old.weekStart || clock.weekStart), area: String(old.area || "Здоровье") };
    if (habit.weekStart !== clock.weekStart) {
      if (!history.some(h => h.habitId === habit.id && h.weekStart === habit.weekStart)) history.push({ id: newEntityId() + index, habitId: habit.id, habitName: habit.name, weekStart: habit.weekStart, completed: Object.values(habit.checks).filter(Boolean).length, total: 7, checks: habit.checks });
      return { ...habit, checks: {}, weekStart: clock.weekStart };
    }
    return habit;
  });
  return { habits: uniqueEntityIds(habits), history: uniqueEntityIds(history) };
}

function Ring({ value, color, size = 70 }: { value: number; color: string; size?: number }) {
  return <div className="ring" style={{ width: size, height: size, background: `conic-gradient(${color} ${Math.max(0, Math.min(100, value)) * 3.6}deg, var(--ring-track,#262a30) 0deg)` }}><div><strong>{value}</strong><small>%</small></div></div>;
}

function IconButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return <button type="button" className="icon-button" aria-label={label} onClick={onClick}>{children}</button>;
}

export default function Home() {
  const initialClock = habitClock();
  const [section, setSection] = useState<Section>("Обзор");
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>(seedInboxItems);
  const [resources, setResources] = useState<ResourceItem[]>(seedResources);
  const [goals, setGoals] = useState<Goal[]>(seedGoals);
  const [habits, setHabits] = useState<Habit[]>(seedHabitNames.map(h => ({ ...h, checks: {}, weekStart: initialClock.weekStart })));
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>(seedLifeAreas);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategory[]>(seedFinanceCategories);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>(seedBudgetLines);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(seedRecurringExpenses);
  const [habitHistory, setHabitHistory] = useState<HabitHistory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(seedAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [events, setEvents] = useState<CalendarEvent[]>(() => normalizeCalendarEvents(seedEvents));
  const [planningFocuses, setPlanningFocuses] = useState<Record<string, string>>({});
  const [healthNotes, setHealthNotes] = useState<HealthNote[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<ParaWeeklyReview[]>([]);
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [taskProjectId, setTaskProjectId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [theme, setTheme] = useState<Theme>("lime");
  const [dashboardOrder, setDashboardOrder] = useState<DashboardBlockId[]>(defaultDashboardOrder);
  const [gamification, setGamification] = useState<GamificationState>(seedGamification);
  const [profile, setProfile] = useState<UserProfile>({ name: "Алексей", textScale: "large" });
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [focusTaskId, setFocusTaskId] = useState<number | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authSession, setAuthSession] = useState<PinSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [syncError, setSyncError] = useState("");
  const [cloudReady, setCloudReady] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([{ role: "assistant", text: "Скажите, что нужно сделать. Я сразу добавлю задачи, цели или проекты в NEXUS — без лишних вопросов." }]);
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [byok, setByok] = useState("");
  const [toast, setToast] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [, setClockTick] = useState(0);
  const gameSnapshotRef = useRef<GameSnapshot | null>(null);
  const authSessionRef = useRef<PinSession | null>(null);
  const statePayloadRef = useRef<Record<string, unknown>>({});
  const lastCloudUpdatedRef = useRef("");

  const applyStoredState = useCallback((parsed: Record<string, unknown>) => {
    const storedHistory = Array.isArray(parsed.habitHistory) ? parsed.habitHistory as HabitHistory[] : [];
    const normalized = normalizeHabits(parsed.habits, storedHistory);
    const storedRecurring = uniqueEntityIds<RecurringExpense>((Array.isArray(parsed.recurringExpenses) ? parsed.recurringExpenses : seedRecurringExpenses) as RecurringExpense[]);
    const financial = settleDueInstallments(uniqueEntityIds(Array.isArray(parsed.accounts) ? parsed.accounts as Account[] : seedAccounts), uniqueEntityIds(Array.isArray(parsed.transactions) ? parsed.transactions as Transaction[] : seedTransactions));
    const withRecurring = applyDueRecurringExpenses(financial.accounts, financial.entries, storedRecurring);
    if (Array.isArray(parsed.tasks)) setTasks(uniqueEntityIds(parsed.tasks as Task[]));
    if (Array.isArray(parsed.projects)) setProjects(uniqueEntityIds(parsed.projects as Project[]));
    if (Array.isArray(parsed.inboxItems)) setInboxItems(uniqueEntityIds(parsed.inboxItems as InboxItem[]));
    if (Array.isArray(parsed.resources)) setResources(uniqueEntityIds(parsed.resources as ResourceItem[]));
    if (Array.isArray(parsed.goals)) setGoals(normalizeGoals(parsed.goals as Goal[]));
    if (Array.isArray(parsed.lifeAreas) && parsed.lifeAreas.length) setLifeAreas(uniqueEntityIds(parsed.lifeAreas as LifeArea[]));
    if (Array.isArray(parsed.financeCategories) && parsed.financeCategories.length) setFinanceCategories(uniqueEntityIds(parsed.financeCategories as FinanceCategory[]));
    if (Array.isArray(parsed.budgetLines) && parsed.budgetLines.length) setBudgetLines(uniqueEntityIds(parsed.budgetLines as BudgetLine[]));
    setHabits(normalized.habits); setHabitHistory(normalized.history);
    setAccounts(withRecurring.accounts); setTransactions(withRecurring.entries); setRecurringExpenses(withRecurring.recurring);
    setEvents(normalizeCalendarEvents(parsed.events));
    if (parsed.planningFocuses && typeof parsed.planningFocuses === "object") setPlanningFocuses(parsed.planningFocuses as Record<string, string>);
    else if (typeof parsed.planningNote === "string" && parsed.planningNote) setPlanningFocuses({ [localDateKey(startOfWeek(new Date()))]: parsed.planningNote });
    if (Array.isArray(parsed.healthNotes)) setHealthNotes(uniqueEntityIds(parsed.healthNotes as HealthNote[]));
    if (Array.isArray(parsed.journalEntries)) setJournalEntries(uniqueEntityIds(parsed.journalEntries as JournalEntry[]));
    if (Array.isArray(parsed.weeklyReviews)) setWeeklyReviews(uniqueEntityIds(parsed.weeklyReviews as ParaWeeklyReview[]));
    if (parsed.profile && typeof parsed.profile === "object") {
      const next = parsed.profile as Partial<UserProfile>;
      setProfile({ name: typeof next.name === "string" && next.name.trim() ? next.name.trim() : "Алексей", textScale: next.textScale === "normal" || next.textScale === "extra" ? next.textScale : "large" });
    }
    if (Array.isArray(parsed.focusSessions)) setFocusSessions(uniqueEntityIds(parsed.focusSessions as FocusSession[]));
    setDashboardOrder(normalizeDashboardOrder(parsed.dashboardOrder));
    setGamification(normalizeGamification(parsed.gamification));
  }, [setTasks, setProjects, setInboxItems, setResources, setGoals, setLifeAreas, setFinanceCategories, setBudgetLines, setHabits, setHabitHistory, setAccounts, setTransactions, setRecurringExpenses, setEvents, setPlanningFocuses, setHealthNotes, setJournalEntries, setWeeklyReviews, setDashboardOrder, setGamification]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(localStorage.getItem("nexus-state") || "{}") as Record<string, unknown>;
        applyStoredState(parsed);
      } catch { /* keep demo data */ }
      setByok(localStorage.getItem("nexus-byok") || "");
      const storedTheme = localStorage.getItem("nexus-theme");
      setTheme(storedTheme === "orbit" || storedTheme === "light" ? storedTheme : "lime");
      const hashSection = decodeURIComponent(window.location.hash.slice(1)) as Section;
      if (nav.some(group => group.items.some(item => item.label === hashSection))) setSection(hashSection);
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [applyStoredState]);

  const statePayload = useMemo<Record<string, unknown>>(() => ({ tasks, projects, inboxItems, resources, goals, habits, lifeAreas, financeCategories, budgetLines, recurringExpenses, habitHistory, accounts, transactions, events, planningFocuses, planningNote: planningFocuses[localDateKey(startOfWeek(new Date()))] || "", healthNotes, journalEntries, weeklyReviews, dashboardOrder, gamification, profile, focusSessions }), [tasks, projects, inboxItems, resources, goals, habits, lifeAreas, financeCategories, budgetLines, recurringExpenses, habitHistory, accounts, transactions, events, planningFocuses, healthNotes, journalEntries, weeklyReviews, dashboardOrder, gamification, profile, focusSessions]);
  useEffect(() => { statePayloadRef.current = statePayload; }, [statePayload]);

  useEffect(() => {
    if (loaded) localStorage.setItem("nexus-state", JSON.stringify(statePayload));
  }, [loaded, statePayload]);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    readPinSession().then(result => {
      if (cancelled) return;
      const session = result.authenticated ? { authenticated: true } as PinSession : null;
      authSessionRef.current = session;
      setAuthSession(session);
      setSyncStatus(session ? "loading" : "local");
      if (!session) setAuthOpen(true);
    }).catch(() => {
      if (!cancelled) { setAuthSession(null); setSyncStatus("local"); setAuthOpen(true); }
    }).finally(() => { if (!cancelled) setAuthChecked(true); });
    return () => { cancelled = true; };
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !authSession?.authenticated) return;
    let cancelled = false;
    loadPinCloudState().then(async ({ row }) => {
      if (cancelled) return;
      if (row?.payload) { gameSnapshotRef.current=null; applyStoredState(row.payload); }
      else await savePinCloudState(statePayloadRef.current);
      if (cancelled) return;
      lastCloudUpdatedRef.current=row?.updated_at||new Date().toISOString();
      setCloudReady(true); setSyncError(""); setSyncStatus("synced"); setLastSyncedAt(new Date().toISOString());
    }).catch(error => { if (!cancelled) { setCloudReady(false); setSyncError(error instanceof Error?error.message:"Не удалось связаться с Supabase"); setSyncStatus("error"); } });
    return () => { cancelled = true; };
  }, [loaded, authSession?.authenticated, applyStoredState]);

  useEffect(() => {
    if (!loaded || !cloudReady || !authSessionRef.current) return;
    const timer = window.setTimeout(() => {
      setSyncStatus("syncing");
      savePinCloudState(statePayload).then(({ row }) => {
        const savedAt=row.updated_at||new Date().toISOString();lastCloudUpdatedRef.current=savedAt;setLastSyncedAt(savedAt);setSyncError("");setSyncStatus("synced");
      }).catch(error => {setSyncError(error instanceof Error?error.message:"Не удалось сохранить данные");setSyncStatus("error")});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [loaded, cloudReady, statePayload]);

  useEffect(()=>{
    if(!loaded||!cloudReady)return;
    let cancelled=false;
    const timer=window.setInterval(()=>{if(!authSessionRef.current)return;loadPinCloudState().then(({row})=>{if(cancelled)return;setSyncError("");if(row?.updated_at&&row.updated_at>lastCloudUpdatedRef.current){lastCloudUpdatedRef.current=row.updated_at;gameSnapshotRef.current=null;applyStoredState(row.payload);setLastSyncedAt(row.updated_at);setSyncStatus("synced")}}).catch(error=>{if(!cancelled){setSyncError(error instanceof Error?error.message:"Не удалось связаться с Supabase");setSyncStatus("error")}})},20_000);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[loaded,cloudReady,applyStoredState]);

  useEffect(() => {
    if (!loaded) return;
    const processRecurring = () => setTransactions(currentEntries => {
      const result = applyDueRecurringExpenses(accounts, currentEntries, recurringExpenses);
      if (!result.processed) return currentEntries;
      setAccounts(result.accounts);
      setRecurringExpenses(result.recurring);
      setToast(`Автоматически списано платежей: ${result.processed}`);
      window.setTimeout(() => setToast(""), 2600);
      return result.entries;
    });
    processRecurring();
    const timer = window.setInterval(processRecurring, 60_000);
    return () => window.clearInterval(timer);
  }, [loaded, accounts, recurringExpenses]);

  useEffect(() => {
    if (loaded) localStorage.setItem("nexus-theme", theme);
    document.documentElement.classList.toggle("nexus-light-page", theme === "light");
    document.body.classList.toggle("nexus-light-page", theme === "light");
    return () => {
      document.documentElement.classList.remove("nexus-light-page");
      document.body.classList.remove("nexus-light-page");
    };
  }, [loaded, theme]);

  useEffect(() => {
    const onHash = () => { const next = decodeURIComponent(window.location.hash.slice(1)) as Section; if (nav.some(g => g.items.some(i => i.label === next))) setSection(next); };
    window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onCommand = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onCommand);
    return () => window.removeEventListener("keydown", onCommand);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick(Date.now());
      const nextClock = habitClock();
      const expired = habits.filter(h => h.weekStart !== nextClock.weekStart);
      if (!expired.length) return;
      setHabitHistory(current => uniqueEntityIds([...current, ...expired.filter(h => !current.some(item => item.habitId === h.id && item.weekStart === h.weekStart)).map(h => ({ id: newEntityId(), habitId: h.id, habitName: h.name, weekStart: h.weekStart, completed: Object.values(h.checks).filter(Boolean).length, total: 7, checks: h.checks }))]));
      setHabits(current => current.map(h => h.weekStart === nextClock.weekStart ? h : { ...h, checks: {}, weekStart: nextClock.weekStart }));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [habits]);

  const taskCompletion = useMemo(() => tasks.length ? Math.round(tasks.filter(t => t.done).length / tasks.length * 100) : 0, [tasks]);
  const clock = habitClock();
  const habitCompletion = habits.length ? Math.round(habits.filter(h => h.checks[clock.today]).length / habits.length * 100) : 0;
  const levelInfo = gameLevel(gamification.xp);
  const notifications = useMemo<NexusNotification[]>(() => {
    const items:NexusNotification[]=[];
    tasks.filter(task=>!task.done&&!task.archived&&task.dueDate&&task.dueDate<clock.today).slice(0,4).forEach(task=>items.push({id:`task-${task.id}`,icon:"!",title:"Просрочена задача",text:task.title,section:"Задачи",action:"Открыть",tone:"warning"}));
    const todayEvents=events.filter(event=>event.date===clock.today).sort((a,b)=>a.time.localeCompare(b.time));
    if(todayEvents.length)items.push({id:"events-today",icon:"□",title:`Сегодня ${todayEvents.length} ${todayEvents.length===1?"событие":"события"}`,text:`Ближайшее: ${todayEvents[0].time} · ${todayEvents[0].title}`,section:"Планирование",action:"Календарь",tone:"info"});
    const habitsLeft=habits.filter(habit=>!habit.checks[clock.today]).length;
    if(habitsLeft)items.push({id:"habits-left",icon:"↗",title:"Привычки ждут отметки",text:`На сегодня осталось: ${habitsLeft}`,section:"Привычки",action:"Отметить",tone:"info"});
    const horizon=new Date();horizon.setDate(horizon.getDate()+7);const horizonKey=localDateKey(horizon);
    const duePayments=transactions.filter(item=>item.kind==="installment"&&!item.posted&&item.dueDate&&item.dueDate>=clock.today&&item.dueDate<=horizonKey);
    if(duePayments.length)items.push({id:"payments-due",icon:"₪",title:"Предстоящие платежи",text:`В ближайшие 7 дней: ${formatIls(duePayments.reduce((sum,item)=>sum+item.amount,0))}`,section:"Финансы",action:"Проверить",tone:"warning"});
    if(inboxItems.length)items.push({id:"para-inbox",icon:"◇",title:"Разобрать Входящие PARA",text:`Неразобранных записей: ${inboxItems.length}`,section:"Проекты",action:"Разобрать",tone:"info"});
    if(!items.length)items.push({id:"all-clear",icon:"✓",title:"Всё спокойно",text:"Просроченных задач и срочных сигналов нет",section:"Обзор",action:"На главную",tone:"success"});
    return items;
  },[tasks,events,habits,transactions,inboxItems,clock.today]);

  useEffect(() => {
    if (!loaded) return;
    const activeClock = habitClock();
    const next: GameSnapshot = {
      today: activeClock.today,
      tasks: Object.fromEntries(tasks.map(task => [String(task.id), { done: task.done, priority: task.priority }])),
      habits: Object.fromEntries(habits.map(habit => [String(habit.id), Boolean(habit.checks[activeClock.today])])),
      projects: projects.map(project => project.id), goals: goals.map(goal => goal.id), inbox: inboxItems.map(item => item.id), resources: resources.map(item => item.id), events: events.map(item => item.id), journals: journalEntries.map(item => item.id), health: healthNotes.map(item => item.id), reviews: weeklyReviews.map(item=>item.id),
      transactions: Object.fromEntries(transactions.map(item => [String(item.id), { kind: item.kind, posted: Boolean(item.posted), recurring: Boolean(item.recurringId) }])),
      milestones: Object.fromEntries(projects.flatMap(project => (project.milestones || []).map(item => [`${project.id}-${item.id}`, item.done]))),
      focuses: Object.entries(planningFocuses).filter(([, value]) => value.trim()).map(([key]) => key),
      focusSessions: focusSessions.map(session => session.id),
    };
    const previous = gameSnapshotRef.current;
    gameSnapshotRef.current = next;
    if (!previous) return;
    const drafts: GameEventDraft[] = [];
    const stamp = Date.now();
    const taskPoints: Record<Priority, number> = { high: 20, medium: 15, low: 10 };
    Object.entries(next.tasks).forEach(([id, task]) => {
      const before = previous.tasks[id];
      if (!before) drafts.push({ key: `task-created-${id}`, delta: 3, title: "Задача сформулирована", category: "action" });
      else if (before.done !== task.done) drafts.push({ key: `task-${task.done ? "done" : "undo"}-${id}-${stamp}`, delta: task.done ? taskPoints[task.priority] : -taskPoints[task.priority], title: task.done ? "Задача выполнена" : "Выполнение задачи отменено", category: task.done ? "completion" : "penalty" });
    });
    Object.entries(previous.tasks).filter(([id, task]) => !next.tasks[id] && !task.done).forEach(([id]) => drafts.push({ key: `task-abandoned-${id}-${stamp}`, delta: -3, title: "Незавершённая задача удалена", category: "penalty" }));
    if (previous.today === next.today) Object.entries(next.habits).forEach(([id, done]) => { const before = previous.habits[id]; if (before !== undefined && before !== done) drafts.push({ key: `habit-${done ? "done" : "undo"}-${id}-${stamp}`, delta: done ? 8 : -8, title: done ? "Привычка выполнена" : "Отметка привычки снята", category: done ? "completion" : "penalty" }); });
    next.projects.filter(id => !previous.projects.includes(id)).forEach(id => drafts.push({ key: `project-created-${id}`, delta: 12, title: "Создан проект с результатом", category: "action" }));
    next.goals.filter(id => !previous.goals.includes(id)).forEach(id => drafts.push({ key: `goal-created-${id}`, delta: 10, title: "Определена новая цель", category: "action" }));
    next.inbox.filter(id => !previous.inbox.includes(id)).forEach(id => drafts.push({ key: `inbox-created-${id}`, delta: 2, title: "Мысль сохранена во Входящие", category: "action" }));
    next.resources.filter(id => !previous.resources.includes(id)).forEach(id => drafts.push({ key: `resource-created-${id}`, delta: 4, title: "Ресурс добавлен в PARA", category: "action" }));
    next.events.filter(id => !previous.events.includes(id)).forEach(id => drafts.push({ key: `event-created-${id}`, delta: 4, title: "Время запланировано", category: "action" }));
    next.journals.filter(id => !previous.journals.includes(id)).forEach(id => drafts.push({ key: `journal-created-${id}`, delta: 20, title: "Вечерний разбор завершён", category: "rhythm" }));
    next.health.filter(id => !previous.health.includes(id)).forEach(id => drafts.push({ key: `health-created-${id}`, delta: 6, title: "Состояние зафиксировано", category: "action" }));
    next.reviews.filter(id => !previous.reviews.includes(id)).forEach(id => drafts.push({ key: `weekly-review-${id}`, delta: 35, title: "Еженедельный обзор PARA завершён", category: "rhythm" }));
    Object.entries(next.transactions).forEach(([id, item]) => { if (!previous.transactions[id] && item.posted && !item.recurring && item.kind !== "installment") drafts.push({ key: `finance-created-${id}`, delta: 3, title: "Финансовая операция учтена", category: "action" }); });
    Object.entries(next.milestones).forEach(([id, done]) => { const before = previous.milestones[id]; if (before !== undefined && before !== done) drafts.push({ key: `milestone-${done ? "done" : "undo"}-${id}-${stamp}`, delta: done ? 12 : -12, title: done ? "Этап проекта завершён" : "Этап проекта возвращён", category: done ? "completion" : "penalty" }); });
    next.focuses.filter(key => !previous.focuses.includes(key)).forEach(key => drafts.push({ key: `focus-created-${key}`, delta: 5, title: "Фокус недели определён", category: "rhythm" }));
    next.focusSessions.filter(id => !previous.focusSessions.includes(id)).forEach(id => drafts.push({ key: `focus-session-${id}`, delta: 10, title: "Сессия глубокого фокуса завершена", category: "rhythm" }));
    if (drafts.length) window.setTimeout(() => setGamification(current => addGameEvents(current, drafts)), 0);
  }, [loaded, tasks, habits, projects, goals, inboxItems, resources, events, journalEntries, healthNotes, weeklyReviews, transactions, planningFocuses, focusSessions]);

  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const today = localDateKey(now);
    const score = Math.round((taskCompletion + habitCompletion) / 2);
    const timer = window.setTimeout(() => setGamification(current => {
      const drafts: GameEventDraft[] = tasks.filter(task => !task.done && task.dueDate && task.dueDate < today).map(task => ({ key: `missed-deadline-${task.id}-${task.dueDate}`, date: today, delta: -4, title: `Пропущен срок: ${task.title}`, category: "penalty" as const }));
      let next = addGameEvents(current, drafts);
      if (now.getHours() < 21 || next.dailyScores.some(day => day.date === today)) return next;
      const actions = next.events.filter(event => event.date === today && event.delta > 0).length;
      const previousDay = next.dailyScores[next.dailyScores.length - 1];
      const endOfDay: GameEventDraft[] = [];
      if (!actions) endOfDay.push({ key: `inactive-day-${today}`, date: today, delta: -8, title: "День прошёл без зафиксированных действий", category: "penalty" });
      if (previousDay && previousDay.score - score >= 15) endOfDay.push({ key: `rhythm-drop-${today}`, date: today, delta: -Math.min(20, Math.ceil((previousDay.score - score) / 10) * 4), title: "Ритм снизился относительно прошлого периода", category: "penalty" });
      next = addGameEvents(next, endOfDay);
      return { ...next, dailyScores: [...next.dailyScores, { date: today, score, actions }].slice(-60) };
    }), 0);
    return () => window.clearTimeout(timer);
  }, [loaded, tasks, taskCompletion, habitCompletion, clock.today]);

  function navigate(next: Section) { setSection(next); window.history.pushState(null, "", `#${encodeURIComponent(next)}`); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  async function syncNow() {
    if (!authSessionRef.current) { setAuthOpen(true); return; }
    setSyncStatus("syncing");
    try {
      const { row } = await savePinCloudState(statePayloadRef.current);
      const savedAt = row.updated_at || new Date().toISOString();
      lastCloudUpdatedRef.current = savedAt; setCloudReady(true); setLastSyncedAt(savedAt); setSyncError(""); setSyncStatus("synced"); notify("Данные сохранены в облаке");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Не удалось сохранить данные"); setSyncStatus("error"); setAuthOpen(true);
    }
  }
  function downloadBackup() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: statePayloadRef.current }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `nexus-backup-${clock.today}.json`; link.click(); URL.revokeObjectURL(url); notify("Резервная копия сохранена");
  }
  async function restoreBackup(file: File) {
    try {
      const parsed=JSON.parse(await file.text()) as {data?:unknown}|Record<string,unknown>;
      const candidate=("data" in parsed?parsed.data:parsed) as Record<string,unknown>|undefined;
      const knownKeys=["tasks","projects","goals","habits","transactions","events"];
      if(!candidate||typeof candidate!=="object"||!knownKeys.some(key=>key in candidate))throw new Error("Файл не похож на резервную копию NEXUS");
      if(!window.confirm("Заменить текущие данные содержимым резервной копии?"))return;
      applyStoredState(candidate);statePayloadRef.current=candidate;localStorage.setItem("nexus-state",JSON.stringify(candidate));
      if(authSessionRef.current){setSyncStatus("syncing");const{row}=await savePinCloudState(candidate);const savedAt=row.updated_at||new Date().toISOString();lastCloudUpdatedRef.current=savedAt;setLastSyncedAt(savedAt);setCloudReady(true);setSyncStatus("synced");setSyncError("")}
      notify("Резервная копия восстановлена");setAuthOpen(false);
    }catch(error){setSyncError(error instanceof Error?error.message:"Не удалось восстановить данные");setSyncStatus("error")}
  }
  function openQuickAdd() { setQuickAddOpen(true); }
  function chooseQuickAdd(kind: Exclude<ModalKind, null>) { setQuickAddOpen(false); setEditingHabit(null); setEditingTask(null); setTaskProjectId(null); setModalKind(kind); }
  function captureInboxNote(title: string) {
    setInboxItems(current => [{ id: newEntityId(), title, kind: "note", createdAt: new Date().toISOString(), area: "Личное" }, ...current]); setQuickAddOpen(false); notify("Добавлено во Входящие");
  }
  function acceptAuthSession(session: PinSession) {
    authSessionRef.current = session; setAuthSession(session); setCloudReady(false); setSyncStatus("loading");
  }
  async function handleSignOut() {
    await signOutPin();
    authSessionRef.current = null; setAuthSession(null); setCloudReady(false); setSyncStatus("local"); setAuthOpen(true); notify("Система заблокирована");
  }
  function captureUndo(label: string) {
    setUndoStack(current => [{ id: newEntityId(), label, createdAt: new Date().toISOString(), tasks, projects, goals, habits, events }, ...current].slice(0, 10));
  }
  function undoLastAiAction() {
    const snapshot = undoStack[0]; if (!snapshot) return;
    setTasks(snapshot.tasks); setProjects(snapshot.projects); setGoals(snapshot.goals); setHabits(snapshot.habits); setEvents(snapshot.events);
    setUndoStack(current => current.slice(1)); notify(`Отменено: ${snapshot.label}`);
  }
  function openGamification(){navigate("Обзор");window.setTimeout(()=>document.getElementById("nexus-game")?.scrollIntoView({behavior:"smooth",block:"center"}),80)}
  function gameCheckIn(kind:"setback"|"recovery"){
    const today=clock.today;const setback=gamification.events.some(event=>event.key===`self-setback-${today}`);const recovered=gamification.events.some(event=>event.key===`self-recovery-${today}`);
    if(kind==="recovery"&&!setback){notify("Сначала отметьте срыв фокуса, если он действительно был");return}if(kind==="recovery"&&recovered){notify("Ритм сегодня уже восстановлен");return}
    const draft:GameEventDraft=kind==="setback"?{key:`self-setback-${today}`,delta:-5,title:"Честно отмечен срыв фокуса",category:"penalty"}:{key:`self-recovery-${today}`,delta:5,title:"Ритм восстановлен маленьким действием",category:"rhythm"};
    setGamification(current=>addGameEvents(current,[draft]));notify(kind==="setback"?"−5 XP. Без вины — выберите один шаг восстановления":"＋5 XP. Вы вернулись в ритм");
  }
  function toggleTask(id: number) { setTasks(v => v.map(task => task.id === id ? { ...task, done: !task.done, completedAt: task.done ? undefined : new Date().toISOString() } : task)); }
  function toggleHabit(id: number, date: string) {
    if (date !== clock.today) return;
    setHabits(current => current.map(h => h.id === id ? { ...h, checks: { ...h.checks, [date]: !h.checks[date] } } : h));
  }

  function createFinanceOperation(draft: Record<string, unknown>) {
    const accountId = Number(draft.accountId); const amount = Number(draft.amount); const kind = String(draft.kind) as "income" | "expense";
    const account = accounts.find(a => a.id === accountId); if (!account || !amount) return;
    const id = newEntityId();
    const category = String(draft.category || (kind === "income" ? "Доход" : "Другое"));
    const comment = String(draft.comment || "").trim();
    const entry: Transaction = { id, title: comment || category, category, amount, kind, date: String(draft.date || localDateKey(new Date())), accountId, posted: true };
    if (kind === "income") {
      setAccounts(v => v.map(a => a.id === accountId ? { ...a, balance: a.balance + amount } : a)); setTransactions(v => [entry, ...v]); return;
    }
    setAccounts(v => v.map(a => a.id === accountId ? { ...a, balance: a.balance - amount } : a));
    if (account.type === "credit") {
      const count = Math.max(1, Number(draft.installments || 1)); const part = Math.round((amount / count) * 100) / 100;
      const schedule: Transaction[] = Array.from({ length: count }, (_, index) => ({ id: id + index + 1, title: `${comment || category} · платёж ${index + 1}/${count}`, category, amount: index === count - 1 ? Math.round((amount - part * (count - 1)) * 100) / 100 : part, kind: "installment", date: nextBillingDate(index, account.billingDay || 15), dueDate: nextBillingDate(index, account.billingDay || 15), accountId, parentId: id, installmentIndex: index + 1, installmentCount: count, posted: false }));
      setTransactions(v => [entry, ...schedule, ...v]);
    } else setTransactions(v => [entry, ...v]);
  }

  function createTransfer(draft: Record<string, unknown>) {
    const from = Number(draft.fromAccountId); const to = Number(draft.toAccountId); const amount = Number(draft.amount); if (!amount || from === to) return;
    setAccounts(v => v.map(a => a.id === from ? { ...a, balance: a.balance - amount } : a.id === to ? { ...a, balance: a.balance + amount } : a));
    setTransactions(v => [{ id: newEntityId(), title: "Перевод между счетами", category: "Перевод", amount, kind: "transfer", date: localDateKey(new Date()), accountId: from, toAccountId: to, posted: true }, ...v]);
  }

  function handleCreate(kind: Exclude<ModalKind, null>, draft: Record<string, unknown>) {
    const id = newEntityId();
    if (kind === "task") {
      const projectId = Number(draft.projectId || taskProjectId || 0) || undefined;
      const goalId = Number(draft.goalId || 0) || undefined;
      const fields = { title: String(draft.title), area: String(draft.area || "Личное"), time: String(draft.time || "Сегодня"), dueDate: String(draft.dueDate || "") || undefined, priority: (draft.priority || "medium") as Priority, projectId, goalId, duration: Math.max(5, Number(draft.duration || 30)), energy: (draft.energy || "medium") as TaskEnergy, context: (draft.context || "anywhere") as TaskContext, notes: String(draft.notes || "") };
      if (editingTask) setTasks(current => current.map(task => task.id === editingTask.id ? { ...task, ...fields } : task));
      else setTasks(current => [...current, { id, ...fields, done: false, createdAt: new Date().toISOString() }]);
    }
    if (kind === "project") setProjects(v => [...v, { id, name: String(draft.title), area: String(draft.area || "Личное"), progress: 0, due: String(draft.due || "Без срока"), next: String(draft.next || "Определить следующий шаг"), notes: String(draft.notes || ""), cover: String(draft.cover || "linear-gradient(135deg,#2c2455,#7c4dff 58%,#d565ff)") }]);
    if (kind === "goal") setGoals(v => [...v, { id, period: String(draft.period || "МЕСЯЦ"), date: String(draft.date || "Сейчас"), title: String(draft.title), note: String(draft.note || "Новая цель"), progress: 0, area: String(draft.area || "Развитие"), parentGoalId: Number(draft.parentGoalId || 0) || undefined }]);
    if (kind === "habit") {
      if (editingHabit) setHabits(v => v.map(h => h.id === editingHabit.id ? { ...h, name: String(draft.title), icon: String(draft.icon || "✦"), area: String(draft.area || h.area || "Здоровье") } : h));
      else setHabits(v => [...v, { id, name: String(draft.title), icon: String(draft.icon || "✦"), checks: {}, weekStart: clock.weekStart, area: String(draft.area || "Здоровье") }]);
    }
    if (kind === "transaction") createFinanceOperation(draft);
    if (kind === "transfer") createTransfer(draft);
    if (kind === "account") setAccounts(v => [...v, { id, name: String(draft.title), type: draft.accountType as AccountType, balance: Number(draft.balance || 0), linkedAccountId: Number(draft.linkedAccountId || 0) || undefined, billingDay: Number(draft.billingDay || 15) }]);
    if (kind === "health") setHealthNotes(v => [{ id, kind: "metric", title: String(draft.title), value: String(draft.value), date: new Date().toISOString() }, ...v]);
    if (kind === "event") setEvents(v => [...v, { id, title: String(draft.title), date: String(draft.date || localDateKey(new Date())), time: String(draft.time || "09:00"), tone: draft.tone as CalendarEvent["tone"], note: String(draft.note || "") }]);
    notify(editingHabit ? "Привычка обновлена" : editingTask ? "Задача обновлена" : "Сохранено в NEXUS OS"); setModalKind(null); setEditingHabit(null); setEditingTask(null); setTaskProjectId(null);
  }

  function applyAssistantActions(actions: AssistantAction[]) {
    let applied = 0;
    if (actions.length) captureUndo(actions.length > 1 ? `AI-планирование · ${actions.length} действий` : "действие NEXUS AI");
    actions.forEach(({ type, payload }) => {
      if (type === "create_task") { const projectQuery=String(payload.project||"").toLowerCase();const project=projectQuery?projects.find(p=>p.name.toLowerCase().includes(projectQuery)||projectQuery.includes(p.name.toLowerCase())):undefined;setTasks(v => [...v, { id: newEntityId(), title: String(payload.title), area: project?.area||String(payload.area || "Личное"), time: String(payload.time || "Сегодня"), dueDate:String(payload.dueDate||"")||undefined, priority: (payload.priority || "medium") as Priority, projectId: project?.id, done: false, duration:Math.max(5,Number(payload.duration||30)), energy:(payload.energy||"medium") as TaskEnergy, context:(payload.context||"anywhere") as TaskContext, createdAt:new Date().toISOString() }]); applied++; }
      if (type === "complete_task") { const query = String(payload.title || "").toLowerCase(); setTasks(v => v.map(t => t.title.toLowerCase().includes(query) ? { ...t, done: true, completedAt:new Date().toISOString() } : t)); applied++; }
      if (type === "update_task" || type === "schedule_task") { const query=String(payload.currentTitle||payload.title||"").toLowerCase();setTasks(v=>v.map(task=>task.title.toLowerCase().includes(query)?{...task,title:String(payload.newTitle||task.title),dueDate:String(payload.dueDate||task.dueDate||"")||undefined,time:String(payload.time||task.time),duration:Math.max(5,Number(payload.duration||task.duration||30)),energy:(payload.energy||task.energy||"medium") as TaskEnergy,context:(payload.context||task.context||"anywhere") as TaskContext}:task));applied++; }
      if (type === "create_project") { setProjects(v => [...v, { id: newEntityId(), name: String(payload.name), area: String(payload.area || "Личное"), progress: 0, due: String(payload.due || "Без срока"), next: String(payload.next || "Определить следующий шаг"), cover: "linear-gradient(135deg,#2c2455,#7c4dff 58%,#d565ff)" }]); applied++; }
      if (type === "create_goal") { setGoals(v => [...v, { id: newEntityId(), period: String(payload.period || "МЕСЯЦ"), date: String(payload.date || "Сейчас"), title: String(payload.title), note: String(payload.note || "Создано NEXUS AI"), progress: 0 }]); applied++; }
      if (type === "create_habit") { setHabits(v => [...v, { id: newEntityId(), name: String(payload.name), icon: "✦", checks: {}, weekStart: clock.weekStart, area: "Здоровье" }]); applied++; }
    });
    if (applied) notify(`NEXUS AI выполнил действий: ${applied}`);
    return applied;
  }

  async function askAssistant(e: FormEvent) {
    e.preventDefault(); if (!prompt.trim() || thinking) return;
    const text = prompt.trim(); setPrompt(""); setMessages(v => [...v, { role: "user", text }]); setThinking(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json", ...(byok ? { "x-nexus-byok": byok } : {}) }, body: JSON.stringify({ message: text, context: { today:clock.today, tasks, events:events.filter(event=>event.date&&event.date>=clock.today), projects: projects.map(p=>({id:p.id,name:p.name,area:p.area,next:p.next,due:p.due})), goals, areas: lifeAreas.map(a=>a.name), habits: habits.map(h => ({ id: h.id, name: h.name, doneToday: !!h.checks[clock.today] })), section } }) });
      const data = await response.json(); const applied = applyAssistantActions(Array.isArray(data.actions) ? data.actions : []);
      setMessages(v => [...v, { role: "assistant", text: data.reply || (applied ? `Готово. Я применил ${applied} изменений.` : data.error || "Не удалось выполнить запрос.") }]);
    } catch { setMessages(v => [...v, { role: "assistant", text: "Не удалось связаться с AI. Проверьте серверный ключ в настройках." }]); }
    finally { setThinking(false); }
  }

  function content() {
    if (section === "Обзор") return <Dashboard userName={profile.name} tasks={tasks} habits={habits} projects={projects} goals={goals} lifeAreas={lifeAreas} events={events} transactions={transactions} budgetLines={budgetLines} weeklyReviews={weeklyReviews} focusSessions={focusSessions} taskCompletion={taskCompletion} habitCompletion={habitCompletion} today={clock.today} onToggleTask={toggleTask} onToggleHabit={toggleHabit} onStartFocus={setFocusTaskId} navigate={navigate} order={dashboardOrder} setOrder={setDashboardOrder} gamification={gamification} onGameCheckIn={gameCheckIn} onPlanWithAi={()=>{setPrompt("Спланируй сегодняшний день: выбери реалистичные приоритеты, назначь время с учётом длительности, энергии и контекста и сразу внеси изменения");setAssistantOpen(true)}}/>;
    if (section === "Задачи") return <TasksPage tasks={tasks} projects={projects} goals={goals} focusSessions={focusSessions} setTasks={setTasks} onNew={() => { setEditingTask(null); setTaskProjectId(null); setModalKind("task"); }} onEdit={task => { setEditingTask(task); setTaskProjectId(task.projectId || null); setModalKind("task"); }}/>;
    if (section === "Цели") return <GoalsPage goals={goals} setGoals={setGoals} projects={projects} tasks={tasks} onNew={() => setModalKind("goal")}/>;
    if (section === "Проекты") return <ProjectsPage projects={projects} setProjects={setProjects} tasks={tasks} setTasks={setTasks} goals={goals} lifeAreas={lifeAreas} setLifeAreas={setLifeAreas} inboxItems={inboxItems} setInboxItems={setInboxItems} resources={resources} setResources={setResources} weeklyReviews={weeklyReviews} setWeeklyReviews={setWeeklyReviews} planningFocuses={planningFocuses} setPlanningFocuses={setPlanningFocuses} notify={notify} selectedId={selectedProjectId} setSelectedId={setSelectedProjectId} onNew={() => setModalKind("project")} onNewTask={projectId => { setEditingTask(null); setTaskProjectId(projectId); setModalKind("task"); }}/>;
    if (section === "Привычки") return <HabitsPage habits={habits} setHabits={setHabits} history={habitHistory} clock={clock} onToggle={toggleHabit} onNew={() => { setEditingHabit(null); setModalKind("habit"); }} onEdit={habit => { setEditingHabit(habit); setModalKind("habit"); }}/>;
    if (section === "Финансы") return <FinancePage accounts={accounts} setAccounts={setAccounts} transactions={transactions} setTransactions={setTransactions} categories={financeCategories} setCategories={setFinanceCategories} budgetLines={budgetLines} setBudgetLines={setBudgetLines} recurringExpenses={recurringExpenses} setRecurringExpenses={setRecurringExpenses} onOperation={() => setModalKind("transaction")} onTransfer={() => setModalKind("transfer")} onAccount={() => setModalKind("account")}/>;
    if (section === "Здоровье") return <HealthPage notes={healthNotes} setNotes={setHealthNotes} onMetric={() => setModalKind("health")} notify={notify}/>;
    if (section === "Планирование") return <PlanningPage events={events} setEvents={setEvents} tasks={tasks} setTasks={setTasks} focuses={planningFocuses} setFocuses={setPlanningFocuses} onNew={() => setModalKind("event")} notify={notify}/>;
    if (section === "Журнал") return <JournalPage entries={journalEntries} setEntries={setJournalEntries} notify={notify}/>;
    return <SettingsPage byok={byok} setByok={setByok} notify={notify} theme={theme} setTheme={setTheme} lifeAreas={lifeAreas} setLifeAreas={setLifeAreas} profile={profile} setProfile={setProfile}/>;
  }

  return <div className={`app-shell theme-${theme} text-${profile.textScale}`}>
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}><div className="brand"><span className="brand-mark">N</span><div><strong>NEXUS</strong><small>PERSONAL OS</small></div><button type="button" className="mobile-close" onClick={() => setMobileNav(false)}>×</button></div><nav>{nav.map(group => <div className="nav-group" key={group.group}><p>{group.group}</p>{group.items.map(item => <button type="button" key={item.label} className={section === item.label ? "active" : ""} onClick={() => { navigate(item.label); setMobileNav(false); }}><span>{item.icon}</span>{item.label}{item.label === "Задачи" && <em>{tasks.filter(t => !t.done).length}</em>}</button>)}</div>)}</nav><div className="sidebar-foot"><button type="button" className="level level-button" onClick={()=>{openGamification();setMobileNav(false)}}><div className="level-top"><span>Уровень {levelInfo.level}</span><b>{gamification.xp.toLocaleString("ru-RU")} XP</b></div><div className="mini-track"><i style={{ width: `${levelInfo.progress}%` }}/></div><small>{levelInfo.remaining} XP до нового уровня · серия {gameStreak(gamification.activeDays)} дн.</small></button><button type="button" className="profile profile-button" onClick={()=>{setAuthOpen(true);setMobileNav(false)}}><div className="avatar">{(profile.name.trim()[0]||"А").toUpperCase()}</div><div><strong>{profile.name}</strong><small>{authSession?syncStatus==="synced"?"Данные сохранены":"Синхронизация…":"Система заблокирована"}</small></div><span className={authSession&&syncStatus!=="error"?"online":"offline"}/></button></div></aside>
    {mobileNav && <button type="button" className="scrim" onClick={() => setMobileNav(false)} aria-label="Закрыть меню"/>}
    <main className="main"><header><button type="button" className="menu-button" onClick={() => setMobileNav(true)}>☰</button><div className="breadcrumbs"><button type="button" onClick={()=>navigate("Обзор")} aria-label="Перейти на главную страницу">МОЯ СИСТЕМА</button><b>/</b><strong>{section.toUpperCase()}</strong></div><div className="top-actions"><button type="button" className={`sync-pill ${syncStatus}`} onClick={()=>authSession?void syncNow():setAuthOpen(true)} title={authSession?"Сохранить данные сейчас":"Войти в систему"}><span>{syncStatus==="synced"?"✓":syncStatus==="error"?"!":authSession?"↻":"◌"}</span>{authSession?syncStatus==="synced"?"В облаке":syncStatus==="error"?"Ошибка синхронизации":"Сохраняю…":"Войти"}</button><button type="button" className="search command-trigger" onClick={()=>setCommandOpen(true)}>⌕ <span>Найти или выполнить…</span><kbd>⌘K</kbd></button><IconButton label="Уведомления" onClick={() => setNotificationsOpen(true)}>♢{notifications.length>0&&<b className="notification-count">{notifications.length}</b>}</IconButton><button type="button" className="assistant-mini" onClick={() => setAssistantOpen(true)}><span>✦</span> Спросить NEXUS</button></div></header><div className="page">{content()}</div></main>
    <button type="button" className="ai-fab" onClick={() => setAssistantOpen(true)} aria-label="Открыть AI-ассистента"><span>✦</span><i/></button>
    {modalKind && <CreateModal kind={modalKind} accounts={accounts} projects={projects} goals={goals} areas={lifeAreas} categories={financeCategories} initialProjectId={taskProjectId} initialHabit={editingHabit} initialTask={editingTask} onClose={() => { setModalKind(null); setEditingHabit(null); setEditingTask(null); setTaskProjectId(null); }} onCreate={draft => handleCreate(modalKind, draft)}/>} 
    {authChecked&&authOpen&&<AuthPanel userName={profile.name} session={authSession} syncStatus={syncStatus} syncError={syncError} lastSyncedAt={lastSyncedAt} onSession={acceptAuthSession} onSignOut={handleSignOut} onSync={()=>void syncNow()} onBackup={downloadBackup} onRestore={file=>void restoreBackup(file)} onClose={()=>{if(authSession)setAuthOpen(false)}}/>} 
    {quickAddOpen&&<QuickAddMenu onClose={()=>setQuickAddOpen(false)} onChoose={chooseQuickAdd} onInbox={captureInboxNote}/>} 
    {notificationsOpen&&<NotificationCenter items={notifications} onClose={()=>setNotificationsOpen(false)} onOpen={target=>{setNotificationsOpen(false);navigate(target)}}/>}
    {commandOpen&&<CommandMenu tasks={tasks} projects={projects} goals={goals} onClose={()=>setCommandOpen(false)} onNavigate={target=>{setCommandOpen(false);navigate(target)}} onCreate={kind=>{setCommandOpen(false);chooseQuickAdd(kind)}} onOpenTask={task=>{setCommandOpen(false);setEditingTask(task);setTaskProjectId(task.projectId||null);setModalKind("task")}}/>}
    {focusTaskId!==null&&<FocusMode task={tasks.find(task=>task.id===focusTaskId)||null} sessions={focusSessions} onClose={()=>setFocusTaskId(null)} onFinish={(minutes,complete)=>{const task=tasks.find(item=>item.id===focusTaskId);if(!task)return;setFocusSessions(current=>[{id:newEntityId(),taskId:task.id,taskTitle:task.title,startedAt:new Date(Date.now()-minutes*60_000).toISOString(),endedAt:new Date().toISOString(),minutes},...current]);if(complete)setTasks(current=>current.map(item=>item.id===task.id?{...item,done:true,completedAt:new Date().toISOString()}:item));setFocusTaskId(null);notify(complete?`Фокус завершён · задача выполнена`:`Сессия фокуса сохранена · ${minutes} мин`)}}/>}
    {assistantOpen && <aside className="assistant-panel"><div className="assistant-head"><div><span className="ai-orb">✦</span><div><strong>NEXUS AI</strong><small><i/> выполняет действия сразу</small></div></div><button type="button" onClick={() => setAssistantOpen(false)}>×</button></div><div className="assistant-context"><span>Сейчас вижу</span><b>{tasks.filter(t => !t.done).length} задач · {habits.filter(h => h.checks[clock.today]).length}/{habits.length} привычек · {section}</b></div>{undoStack.length>0&&<button type="button" className="assistant-undo" onClick={undoLastAiAction}>↶ Отменить последнее изменение AI <small>{undoStack[0].label}</small></button>}<div className="messages">{messages.map((m, i) => <div key={i} className={`message ${m.role}`}>{m.text}</div>)}{thinking && <div className="message assistant typing">Выполняю…</div>}</div><div className="suggestions"><button type="button" onClick={() => setPrompt("Добавь задачу: подготовить план на завтра")}>Добавить задачу</button><button type="button" onClick={() => setPrompt("Разбери мой день и сразу назначь время для 3 приоритетных задач")}>Спланировать день</button></div><form className="assistant-form" onSubmit={askAssistant}><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Например: распланируй мой день и сразу внеси изменения"/><button type="submit">↑</button></form><small className="ai-note">Изменения применяются автоматически. Кнопка отмены возвращает состояние до последней команды.</small></aside>}
    {toast && <div className="toast">✓ {toast}</div>}
    {undoStack.length>0&&!assistantOpen&&<div className="undo-bar"><span>✦ {undoStack[0].label}</span><button type="button" onClick={undoLastAiAction}>Отменить</button></div>}
    <button type="button" className="quick-add" onClick={openQuickAdd}>＋ <span>Добавить</span></button>
    <nav className="ios-tabbar" aria-label="Быстрая навигация"><button type="button" className={section==="Обзор"?"active":""} onClick={()=>navigate("Обзор")}><span>◈</span><small>Обзор</small></button><button type="button" className={section==="Задачи"?"active":""} onClick={()=>navigate("Задачи")}><span>✓</span><small>Задачи</small></button><button type="button" className="mobile-tab-add" onClick={openQuickAdd} aria-label="Быстро добавить"><span>＋</span></button><button type="button" className={section==="Проекты"?"active":""} onClick={()=>{setSelectedProjectId(null);navigate("Проекты")}}><span>▦</span><small>PARA</small></button><button type="button" className={section==="Финансы"?"active":""} onClick={()=>navigate("Финансы")}><span>₪</span><small>Финансы</small></button><button type="button" onClick={()=>setMobileNav(true)}><span>•••</span><small>Ещё</small></button></nav>
  </div>;
}

function Dashboard({userName,tasks,habits,projects,goals,lifeAreas,events,transactions,budgetLines,weeklyReviews,focusSessions,taskCompletion,habitCompletion,today,onToggleTask,onToggleHabit,onStartFocus,navigate,order,setOrder,gamification,onGameCheckIn,onPlanWithAi}:{userName:string;tasks:Task[];habits:Habit[];projects:Project[];goals:Goal[];lifeAreas:LifeArea[];events:CalendarEvent[];transactions:Transaction[];budgetLines:BudgetLine[];weeklyReviews:ParaWeeklyReview[];focusSessions:FocusSession[];taskCompletion:number;habitCompletion:number;today:string;onToggleTask:(id:number)=>void;onToggleHabit:(id:number,date:string)=>void;onStartFocus:(id:number)=>void;navigate:(s:Section)=>void;order:DashboardBlockId[];setOrder:React.Dispatch<React.SetStateAction<DashboardBlockId[]>>;gamification:GamificationState;onGameCheckIn:(kind:"setback"|"recovery")=>void;onPlanWithAi:()=>void}) {
  const totalScore=Math.round((taskCompletion+habitCompletion)/2);
  const[editing,setEditing]=useState(false);const[dragging,setDragging]=useState<DashboardBlockId|null>(null);const[pointerDragging,setPointerDragging]=useState<DashboardBlockId|null>(null);
  const level=gameLevel(gamification.xp);const streak=gameStreak(gamification.activeDays);const todayEvents=gamification.events.filter(event=>event.date===today);const todayDelta=todayEvents.reduce((sum,event)=>sum+event.delta,0);const lastScore=gamification.dailyScores[gamification.dailyScores.length-1];
  const now=new Date();const monthKey=today.slice(0,7);const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();const daysLeft=Math.max(1,daysInMonth-now.getDate()+1);const monthBudget=budgetLines.reduce((sum,line)=>sum+line.limit,0);const monthSpent=transactions.filter(item=>item.kind==="expense"&&item.date.startsWith(monthKey)).reduce((sum,item)=>sum+item.amount,0);const safeToday=Math.max(0,(monthBudget-monthSpent)/daysLeft);const calendarToday=events.filter(event=>event.date===today).sort((a,b)=>a.time.localeCompare(b.time));const overdueCount=tasks.filter(task=>!task.done&&!task.archived&&task.dueDate&&task.dueDate<today).length;const candidates=tasks.filter(task=>!task.done&&!task.archived&&(!task.dueDate||task.dueDate<=today)).sort((a,b)=>{const score=(task:Task)=>(task.dueDate&&task.dueDate<today?50:0)+(task.dueDate===today?30:0)+({high:30,medium:20,low:10}[task.priority]);return score(b)-score(a)}).slice(0,3);const taskMinutes=candidates.reduce((sum,task)=>sum+(task.duration||30),0);const todayActual=focusSessions.filter(session=>session.endedAt.slice(0,10)===today).reduce((sum,session)=>sum+session.minutes,0);const dailyCapacity=360;const loadPercent=Math.min(100,Math.round(taskMinutes/dailyCapacity*100));const habitsLeft=habits.filter(habit=>!habit.checks[today]).length;const currentWeek=localDateKey(startOfWeek(now));const reviewDone=weeklyReviews.some(review=>review.weekStart===currentWeek);
  const spans:Record<DashboardBlockId,"full"|"half">={dayCenter:"full",focus:"full",game:"full",tracker:"full",today:"half",compass:"half",habits:"half",goals:"full",projects:"half",reflection:"half"};
  function moveBlock(source:DashboardBlockId,target:DashboardBlockId){if(source===target)return;setOrder(current=>{const next=current.filter(item=>item!==source);next.splice(Math.max(0,next.indexOf(target)),0,source);return next})}
  function shiftBlock(id:DashboardBlockId,direction:-1|1){setOrder(current=>{const index=current.indexOf(id);const target=index+direction;if(index<0||target<0||target>=current.length)return current;const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next})}
  function startPointer(event:React.PointerEvent<HTMLButtonElement>,id:DashboardBlockId){if(event.pointerType==="mouse")return;event.currentTarget.setPointerCapture(event.pointerId);setPointerDragging(id)}
  function finishPointer(event:React.PointerEvent<HTMLButtonElement>){if(!pointerDragging)return;const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>("[data-dashboard-widget]")?.dataset.dashboardWidget as DashboardBlockId|undefined;if(target)moveBlock(pointerDragging,target);setPointerDragging(null)}
  const blocks:Record<DashboardBlockId,React.ReactNode>={
    dayCenter:<section className="card smart-day-center"><div className="smart-day-head"><div><span className="eyebrow">ЕДИНЫЙ УМНЫЙ ДЕНЬ</span><h2>{candidates.length?`Сегодня реально закрыть ${candidates.length} важных действия`:"Главные действия на сегодня закрыты"}</h2><p>{taskMinutes} минут запланировано · {todayActual} минут сделано · {habitsLeft} привычек осталось{overdueCount?` · ${overdueCount} просрочено`:""}</p></div><button type="button" className="primary" onClick={onPlanWithAi}>✦ Собрать мой день</button></div><div className="smart-load"><div><span><small>ПЛАНИРОВАНИЕ ЗАГРУЗКИ</small><strong>{taskMinutes} из {dailyCapacity} минут</strong></span><b className={taskMinutes>dailyCapacity?"overload":""}>{taskMinutes>dailyCapacity?"Перегрузка":`${loadPercent}% дня`}</b></div><div className="smart-load-track"><i style={{width:`${loadPercent}%`}}/></div><p><span>Оценка: {taskMinutes} мин</span><span>Факт: {todayActual} мин</span><span>Резерв: {Math.max(0,dailyCapacity-taskMinutes)} мин</span></p></div><div className="smart-day-grid"><div className="smart-priorities"><strong>РЕКОМЕНДУЕМЫЙ ПОРЯДОК</strong>{candidates.map((task,index)=><label className={`${task.energy==="high"?"high-energy":""} ${task.dueDate&&task.dueDate<today?"overdue":""}`} key={task.id}><button type="button" onClick={()=>onToggleTask(task.id)} aria-label={`Выполнить ${task.title}`}>○</button><span><small>{task.dueDate&&task.dueDate<today?"ПРОСРОЧЕНО":`0${index+1} · ${task.time||"Без времени"}`}</small><b>{task.title}</b><em>{task.duration||30} мин оценка · {taskActualMinutes(task.id,focusSessions)} мин факт · {contextLabel[task.context||"anywhere"]}</em></span></label>)}{!candidates.length&&<p className="empty-copy">Можно посвятить время восстановлению или следующему проекту.</p>}</div><div className="smart-day-signals"><article><span>◷</span><div><small>БЛИЖАЙШЕЕ В КАЛЕНДАРЕ</small><strong>{calendarToday[0]?.title||"Свободное окно"}</strong><em>{calendarToday[0]?.time||"День без встреч"}</em></div></article><article><span>₪</span><div><small>БЕЗОПАСНЫЙ ТЕМП</small><strong>{formatIls(safeToday)} сегодня</strong><em>{formatIls(Math.max(0,monthBudget-monthSpent))} до конца месяца</em></div></article><button type="button" className={reviewDone?"done":""} onClick={()=>navigate("Проекты")}><span>{reviewDone?"✓":"◎"}</span><div><small>ОБЗОР PARA</small><strong>{reviewDone?"Неделя разобрана":"Пора проверить систему"}</strong><em>{reviewDone?"Следующий обзор в воскресенье":"Пошаговый обзор займёт 10 минут"}</em></div></button></div></div></section>,
    focus:<section className="focus-card"><div className="focus-glow"/><div className="focus-top"><span><i>01</i> ГЛАВНЫЙ ФОКУС ДНЯ</span></div><div className="focus-content"><div><h2>{tasks.find(t=>!t.done&&!t.archived)?.title||"Все задачи выполнены"}</h2><p>Один главный результат сегодня важнее длинного списка.</p><div className="tag-row"><span>◈ {tasks.find(t=>!t.done&&!t.archived)?.area||"Свободное время"}</span><span>◷ {focusSessions.filter(session=>session.endedAt.slice(0,10)===today).reduce((sum,session)=>sum+session.minutes,0)} мин фокуса сегодня</span></div></div>{tasks.find(t=>!t.done&&!t.archived)?<button type="button" className="focus-action" onClick={()=>onStartFocus(tasks.find(t=>!t.done&&!t.archived)!.id)}>Начать фокус <span>→</span></button>:<button type="button" className="focus-action" onClick={()=>navigate("Задачи")}>Открыть задачи <span>→</span></button>}</div></section>,
    tracker:<section className="card tracker-card"><CardHead title="Трекер задач и привычек" subtitle="Живой показатель выполнения сегодня" action="Подробнее" onClick={()=>navigate("Привычки")}/><div className="tracker-metrics"><div><Ring value={taskCompletion} color="var(--lime)" size={86}/><span><strong>Задачи</strong><small>{tasks.filter(t=>t.done).length} из {tasks.length}</small></span></div><div><Ring value={habitCompletion} color="var(--green)" size={86}/><span><strong>Привычки</strong><small>{habits.filter(h=>h.checks[today]).length} из {habits.length}</small></span></div><div className="tracker-score"><small>ОБЩИЙ РИТМ</small><strong>{totalScore}%</strong><p>{totalScore>=80?"Отличный темп — удерживайте ритм.":totalScore>=50?"Хороший прогресс. Остался один точный шаг.":"Начните с одного небольшого действия."}</p></div></div></section>,
    today:<section className="card today-card"><CardHead title="Сегодня" subtitle={`${tasks.filter(t=>t.done).length} из ${tasks.length} выполнено`} action="Все задачи" onClick={()=>navigate("Задачи")}/><div className="progress-line"><i style={{width:`${taskCompletion}%`}}/></div><div className="task-list">{tasks.slice(0,4).map(task=><label className={task.done?"done":""} key={task.id}><input type="checkbox" checked={task.done} onChange={()=>onToggleTask(task.id)}/><span className={`check ${task.priority}`}>✓</span><div><strong>{task.title}</strong><small>{projects.find(p=>p.id===task.projectId)?.name||task.area}</small></div><time>{task.time}</time></label>)}</div></section>,
    compass:<section className="card compass"><CardHead title="Компас жизни" subtitle="Баланс ключевых сфер"/><div className="compass-orbits"><div className="orbit-center"><small>СЕГОДНЯ</small><strong>{totalScore}%</strong></div>{lifeAreas.slice(0,6).map((area,index)=><button type="button" key={area.id} style={{"--orbit-color":area.color,"--orbit-index":index} as React.CSSProperties} onClick={()=>navigate(area.name==="Финансы"?"Финансы":area.name==="Здоровье"?"Здоровье":"Задачи")}><span>{area.icon}</span><small>{area.name}</small></button>)}</div></section>,
    habits:<section className="card habits-card"><CardHead title="Привычки" subtitle="Можно отметить только сегодня" action="Все привычки" onClick={()=>navigate("Привычки")}/><div className="habit-list">{habits.map(h=><button type="button" key={h.id} className={h.checks[today]?"complete":""} onClick={()=>onToggleHabit(h.id,today)}><span className="habit-icon">{h.icon}</span><div><strong>{h.name}</strong><small>{h.checks[today]?"Выполнено сегодня":"Ждёт отметки"}</small></div><span className="habit-check">✓</span></button>)}</div></section>,
    goals:<section className="card goals-card goal-ladder-card"><CardHead title="Главная линия целей" subtitle="Идите снизу вверх: действие дня двигает неделю, месяц и год" action="Настроить связи" onClick={()=>navigate("Цели")}/><div className="goal-ladder"><div className="goal-ladder-note"><span>↑</span><div><strong>СНИЗУ ВВЕРХ</strong><small>Начните с цели дня</small></div></div>{goalPeriodOrder.map((period,index)=>{const goal=goals.find(item=>item.period===period);const progress=goal?goalProgressValue(goal,projects,tasks,goals):0;const linkedTasks=goal?tasks.filter(task=>task.goalId===goal.id).length:0;const parent=goal?goals.find(item=>item.id===goal.parentGoalId):undefined;return <div className={`goal-ladder-level level-${period.toLowerCase()} ${period==="СЕГОДНЯ"?"current":""}`} key={period}>{index>0&&<span className="goal-connector">↑</span>}<button type="button" onClick={()=>navigate("Цели")}><div className="goal-level-icon">{period==="ГОД"?"✦":period==="МЕСЯЦ"?"◐":period==="НЕДЕЛЯ"?"▤":"✓"}</div><div className="goal-level-copy"><span>{period} · {goal?.date||"не задано"}</span><strong>{goal?.title||"Добавить главную цель"}</strong><small>{parent?`Связано с: ${parent.title}`:period==="ГОД"?"Главное направление":"Связь не настроена"}</small></div><div className="goal-level-progress"><b>{progress}%</b><div><i style={{width:`${progress}%`}}/></div><small>{goal?.projectIds?.length||0} проектов · {linkedTasks} задач</small></div></button></div>})}</div></section>,
    projects:<section className="card project-mini"><CardHead title="Активные проекты" subtitle={`${projects.filter(project=>!project.archived).length} в работе`} action="Открыть" onClick={()=>navigate("Проекты")}/>{projects.filter(project=>!project.archived).slice(0,3).map(project=>{const progress=projectProgressValue(project,tasks);return <button type="button" className="project-row project-row-button" onClick={()=>navigate("Проекты")} key={project.id}><div className="project-badge">{project.name[0]}</div><div><strong>{project.name}</strong><span><i style={{width:`${progress}%`}}/></span></div><b>{progress}%</b></button>})}</section>,
    reflection:<section className="card reflection"><div><span className="eyebrow">ВЕЧЕРНИЙ РАЗБОР</span><h3>Как прошёл твой день?</h3><p>Пять минут рефлексии помогают замечать прогресс и приносят 20 XP.</p></div><button type="button" onClick={()=>navigate("Журнал")}>Начать разбор <span>→</span></button></section>,
    game:<section className="card game-card"><div className="game-main"><span className="game-level-badge">{level.level}</span><div><span className="eyebrow">NEXUS LEVEL</span><h2>Уровень {level.level} · {gamification.xp.toLocaleString("ru-RU")} XP</h2><p>Очки растут за завершённые действия и честный ритм. Отмена выполнения возвращает начисленные XP.</p><div className="game-progress"><i style={{width:`${level.progress}%`}}/></div><small>{level.current} / {level.step} XP · ещё {level.remaining} до следующего уровня</small></div></div><div className="game-stats"><div><small>СЕРИЯ</small><strong>{streak} дней</strong><span>{streak?"Ритм держится":"Начните сегодня"}</span></div><div className={todayDelta<0?"negative":""}><small>СЕГОДНЯ</small><strong>{todayDelta>0?"+":""}{todayDelta} XP</strong><span>{todayEvents.length} событий</span></div><div><small>РИТМ</small><strong>{lastScore?`${lastScore.score}%`:`${totalScore}%`}</strong><span>{lastScore?"последний итог":"текущий день"}</span></div></div><div className="game-bottom"><div className="game-feed">{gamification.events.slice(0,4).map(event=><div key={event.id}><span className={event.delta<0?"loss":"gain"}>{event.delta>0?"+":""}{event.delta}</span><p><strong>{event.title}</strong><small>{prettyDate(event.date)}</small></p></div>)}{!gamification.events.length&&<p className="empty-copy">Первое выполненное действие появится здесь.</p>}</div><div className="game-rules"><strong>Как считаются очки</strong><span>Задача: +10–20 · привычка: +8</span><span>Этап проекта: +12 · разбор: +20</span><span>Пропущенный срок: −4 · день без действий: −8</span><div><button type="button" onClick={()=>onGameCheckIn("setback")}>Сорвал фокус −5</button><button type="button" onClick={()=>onGameCheckIn("recovery")}>Вернулся в ритм +5</button></div></div></div></section>,
  };
  return <><section className="hero-row"><div><span className="eyebrow">{new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"}).toUpperCase()}</span><h1>Доброе утро, {userName} <span>✦</span></h1><p>Сегодня хороший день, чтобы продвинуть то, что действительно важно.</p></div><div className="day-score"><Ring value={totalScore} color="var(--lime)" size={76}/><div><small>БАЛАНС ДНЯ</small><strong>{totalScore>=70?"Уверенный ритм":"Есть пространство для роста"}</strong><span>задачи + привычки</span></div></div></section><div className="dashboard-controls"><div><span className="eyebrow">МОЯ ГЛАВНАЯ</span><strong>{editing?"Перетащите блоки в удобном порядке":"Порядок блоков сохранён на этом устройстве"}</strong></div><div>{editing&&<button type="button" onClick={()=>setOrder(defaultDashboardOrder)}>Сбросить</button>}<button type="button" className={editing?"active":""} onClick={()=>setEditing(value=>!value)}>{editing?"✓ Готово":"Настроить расположение"}</button></div></div><div className={`dashboard-board ${editing?"editing":""}`}>{order.map((id,index)=><div id={id==="game"?"nexus-game":undefined} data-dashboard-widget={id} draggable={editing} onDragStart={event=>{setDragging(id);event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/nexus-dashboard",id)}} onDragEnd={()=>setDragging(null)} onDragOver={event=>{if(editing)event.preventDefault()}} onDrop={event=>{event.preventDefault();const source=event.dataTransfer.getData("text/nexus-dashboard") as DashboardBlockId;if(source)moveBlock(source,id);setDragging(null)}} className={`dashboard-widget ${spans[id]} ${dragging===id||pointerDragging===id?"dragging":""}`} key={id}>{editing&&<div className="widget-order-controls"><button type="button" className="widget-drag-handle" aria-label={`Перетащить блок ${gameBlockLabels[id]}`} onPointerDown={event=>startPointer(event,id)} onPointerUp={finishPointer} onPointerCancel={()=>setPointerDragging(null)}>⠿ <span>{gameBlockLabels[id]}</span></button><button type="button" disabled={index===0} onClick={()=>shiftBlock(id,-1)} aria-label="Переместить выше">↑</button><button type="button" disabled={index===order.length-1} onClick={()=>shiftBlock(id,1)} aria-label="Переместить ниже">↓</button></div>}{blocks[id]}</div>)}</div></>;
}

function CardHead({title,subtitle,action,onClick}:{title:string;subtitle:string;action?:string;onClick?:()=>void}){return <div className="card-head"><div><h3>{title}</h3><span>{subtitle}</span></div>{action&&<button type="button" onClick={onClick}>{action} →</button>}</div>}
function PageTitle({eyebrow,title,text,action,onAction,extra}:{eyebrow:string;title:string;text:string;action?:string;onAction?:()=>void;extra?:React.ReactNode}){return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div><div className="page-actions">{extra}{action&&<button type="button" className="primary" onClick={onAction}>＋ {action}</button>}</div></div>}
function Stat({value,label}:{value:string;label:string}){return <div><strong>{value}</strong><span>{label}</span></div>}
function EmptyState({text,action,onClick}:{text:string;action:string;onClick:()=>void}){return <div className="empty-state"><span>＋</span><strong>{text}</strong><button type="button" onClick={onClick}>{action}</button></div>}

function TasksPage({tasks,projects,goals,focusSessions,setTasks,onNew,onEdit}:{tasks:Task[];projects:Project[];goals:Goal[];focusSessions:FocusSession[];setTasks:React.Dispatch<React.SetStateAction<Task[]>>;onNew:()=>void;onEdit:(task:Task)=>void}){
  const[filter,setFilter]=useState<"active"|"done"|"all">("active");
  const[context,setContext]=useState<TaskContext|"all">("all");
  const visible=tasks.filter(t=>(filter==="all"||(filter==="done"?t.done:!t.done))&&(context==="all"||(t.context||"anywhere")===context));
  const estimated=tasks.reduce((sum,task)=>sum+(task.duration||30),0);
  const actual=focusSessions.reduce((sum,session)=>sum+session.minutes,0);
  return <><PageTitle eyebrow="ДЕЙСТВИЕ" title="Задачи" text="Редактируйте сферу, цель, проект, срок, энергию и длительность. Факт считается по сохранённым сессиям фокуса." action="Новая задача" onAction={onNew}/><div className="stats-strip"><Stat value={tasks.filter(t=>!t.done).length.toString()} label="В работе"/><Stat value={tasks.filter(t=>t.done).length.toString()} label="Выполнено"/><Stat value={`${estimated} мин`} label="Оценка"/><Stat value={`${actual} мин`} label="Факт фокуса"/></div><section className="card full-card"><div className="filter-row"><button type="button" className={filter==="active"?"active":""} onClick={()=>setFilter("active")}>В работе</button><button type="button" className={filter==="done"?"active":""} onClick={()=>setFilter("done")}>Выполнено</button><button type="button" className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>Все</button><select aria-label="Фильтр по контексту" value={context} onChange={event=>setContext(event.target.value as TaskContext|"all")}><option value="all">Все контексты</option>{Object.entries(contextLabel).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><span/><button type="button" onClick={onNew}>＋ Добавить</button></div><div className="large-task-list">{visible.length?visible.map(task=>{const project=projects.find(item=>item.id===task.projectId);const goal=goals.find(item=>item.id===task.goalId);const fact=taskActualMinutes(task.id,focusSessions);const estimate=task.duration||30;const ratio=Math.min(100,Math.round(fact/estimate*100));return <article key={task.id} className={`editable-task-row ${task.done?"done":""}`}><label className="task-toggle"><input type="checkbox" checked={task.done} onChange={()=>setTasks(current=>current.map(item=>item.id===task.id?{...item,done:!item.done,completedAt:item.done?undefined:new Date().toISOString()}:item))}/><span className={`check ${task.priority}`}>✓</span></label><div className="task-body"><strong>{task.title}</strong><small><b>{task.area}</b>{project&&<em className="project-link">▦ {project.name}</em>}{goal&&<em className="goal-link">◎ {goal.title}</em>} · {task.dueDate?prettyDate(task.dueDate):task.time}</small><span className="task-attributes"><em>◷ оценка {estimate} мин</em><em>● факт {fact} мин</em><em className={`energy-${task.energy||"medium"}`}>⚡ {energyLabel[task.energy||"medium"]}</em><em>⌁ {contextLabel[task.context||"anywhere"]}</em></span>{task.notes&&<p>{task.notes}</p>}<div className="estimate-track" aria-label={`Факт ${fact} из ${estimate} минут`}><i style={{width:`${ratio}%`}}/></div></div><div className="task-row-actions"><button type="button" onClick={()=>onEdit(task)}>Изменить</button><button type="button" aria-label="Удалить задачу" onClick={()=>setTasks(current=>current.filter(item=>item.id!==task.id))}>×</button></div></article>}):<EmptyState text="В этом списке пока ничего нет" action="Создать задачу" onClick={onNew}/>}</div></section></>;
}

function GoalsPage({goals,setGoals,projects,tasks,onNew}:{goals:Goal[];setGoals:React.Dispatch<React.SetStateAction<Goal[]>>;projects:Project[];tasks:Task[];onNew:()=>void}){
  const[selectedGoalId,setSelectedGoalId]=useState<number|null>(null);
  const selected=goals.find(goal=>goal.id===selectedGoalId);
  const calculated=goals.map(goal=>goalProgressValue(goal,projects,tasks,goals));
  const average=calculated.length?Math.round(calculated.reduce((sum,value)=>sum+value,0)/calculated.length):0;
  function toggleProject(goalId:number,projectId:number){setGoals(current=>current.map(goal=>{if(goal.id!==goalId)return goal;const ids=goal.projectIds||[];return {...goal,projectIds:ids.includes(projectId)?ids.filter(id=>id!==projectId):[...ids,projectId]}}))}
  return <><PageTitle eyebrow="НАПРАВЛЕНИЕ" title="Цели и проекты" text="Связывайте цели сверху вниз, а выполняйте снизу вверх: день → неделя → месяц → год. Задачи и проекты автоматически двигают прогресс." action="Новая цель" onAction={onNew}/><div className="stats-strip"><Stat value={`${average}%`} label="Общий прогресс"/><Stat value={goals.filter(goal=>goal.parentGoalId).length.toString()} label="Связей между целями"/><Stat value={projects.filter(project=>!project.archived).length.toString()} label="Активных проектов"/><Stat value={tasks.filter(task=>task.goalId).length.toString()} label="Задач связаны"/></div><section className="timeline-chain goal-timeline">{goals.map((goal,i)=>{const progress=goalProgressValue(goal,projects,tasks,goals);const linked=projects.filter(project=>goal.projectIds?.includes(project.id));const linkedTasks=tasks.filter(task=>task.goalId===goal.id);const parent=goals.find(item=>item.id===goal.parentGoalId);return <div className={`${i===2?"accent":""} ${selectedGoalId===goal.id?"selected":""}`} key={goal.id}><em>{goal.period}</em><span>{goal.date}</span><h3>{goal.title}</h3><p>{goal.note}</p><div className="goal-project-chips">{parent&&<small>↑ {parent.period}: {parent.title}</small>}{linked.slice(0,2).map(project=><small key={project.id}>▦ {project.name}</small>)}{linkedTasks.length>0&&<small>✓ {linkedTasks.length} задач</small>}</div><div className="entity-actions"><button type="button" onClick={()=>setSelectedGoalId(selectedGoalId===goal.id?null:goal.id)}>Связать проекты</button>{!linked.length&&!linkedTasks.length&&<button type="button" onClick={()=>setGoals(v=>v.map(row=>row.id===goal.id?{...row,progress:Math.min(100,row.progress+10)}:row))}>＋10%</button>}<button type="button" onClick={()=>{setGoals(v=>v.filter(row=>row.id!==goal.id));setSelectedGoalId(null)}}>Удалить</button></div><b>{progress}%</b><small className="progress-source">{linked.length||linkedTasks.length?"автоматически":"вручную"}</small></div>})}</section>{selected&&<section className="card goal-link-panel"><div><span className="eyebrow">СВЯЗЬ ЦЕЛИ С РЕЗУЛЬТАТАМИ</span><h3>{selected.title}</h3><p>Выберите проекты, которые двигают эту цель. Задачи можно связать с целью в полном редакторе задачи.</p></div><div>{projects.filter(project=>!project.archived).map(project=>{const checked=!!selected.projectIds?.includes(project.id);const progress=projectProgressValue(project,tasks);return <label className={checked?"selected":""} key={project.id}><input type="checkbox" checked={checked} onChange={()=>toggleProject(selected.id,project.id)}/><span>{checked?"✓":""}</span><div><strong>{project.name}</strong><small>{project.area} · {progress}%</small></div><div className="mini-track"><i style={{width:`${progress}%`}}/></div></label>})}</div><button type="button" className="primary" onClick={()=>setSelectedGoalId(null)}>Готово</button></section>}</>;
}

function ProjectsPage({projects,setProjects,tasks,setTasks,goals,lifeAreas,setLifeAreas,inboxItems,setInboxItems,resources,setResources,weeklyReviews,setWeeklyReviews,planningFocuses,setPlanningFocuses,notify,selectedId,setSelectedId,onNew,onNewTask}:{projects:Project[];setProjects:React.Dispatch<React.SetStateAction<Project[]>>;tasks:Task[];setTasks:React.Dispatch<React.SetStateAction<Task[]>>;goals:Goal[];lifeAreas:LifeArea[];setLifeAreas:React.Dispatch<React.SetStateAction<LifeArea[]>>;inboxItems:InboxItem[];setInboxItems:React.Dispatch<React.SetStateAction<InboxItem[]>>;resources:ResourceItem[];setResources:React.Dispatch<React.SetStateAction<ResourceItem[]>>;weeklyReviews:ParaWeeklyReview[];setWeeklyReviews:React.Dispatch<React.SetStateAction<ParaWeeklyReview[]>>;planningFocuses:Record<string,string>;setPlanningFocuses:React.Dispatch<React.SetStateAction<Record<string,string>>>;notify:(s:string)=>void;selectedId:number|null;setSelectedId:(id:number|null)=>void;onNew:()=>void;onNewTask:(projectId:number)=>void}){
  const[tab,setTab]=useState<"review"|"inbox"|"projects"|"areas"|"resources"|"archive">("inbox");
  const[newInbox,setNewInbox]=useState("");
  const[inboxKind,setInboxKind]=useState<InboxItem["kind"]>("idea");
  const[inboxArea,setInboxArea]=useState(lifeAreas[0]?.name||"Личное");
  const[newResource,setNewResource]=useState("");
  const[resourceNote,setResourceNote]=useState("");
  const[resourceArea,setResourceArea]=useState(lifeAreas[0]?.name||"Личное");
  const[newMilestone,setNewMilestone]=useState("");
  const[newProjectResource,setNewProjectResource]=useState("");
  const[voiceSupported,setVoiceSupported]=useState(false);
  const[isListening,setIsListening]=useState(false);
  useEffect(()=>{if(typeof window==="undefined")return;const timer=window.setTimeout(()=>{const speechWindow=window as typeof window&{SpeechRecognition?:SpeechRecognitionConstructor;webkitSpeechRecognition?:SpeechRecognitionConstructor};setVoiceSupported(!!(speechWindow.SpeechRecognition||speechWindow.webkitSpeechRecognition))},0);return()=>window.clearTimeout(timer)},[]);
  const selected=projects.find(p=>p.id===selectedId);
  const activeProjects=projects.filter(project=>!project.archived);
  const projectsWithoutNextTask=activeProjects.filter(project=>!tasks.some(task=>task.projectId===project.id&&!task.done)).length;
  const standaloneTasks=tasks.filter(task=>!task.done&&!task.projectId).length;
  const overdueTasks=tasks.filter(task=>!task.done&&task.dueDate&&task.dueDate<localDateKey(new Date())).length;

  function addInbox(event:FormEvent){event.preventDefault();if(!newInbox.trim())return;setInboxItems(current=>[{id:newEntityId(),title:newInbox.trim(),kind:inboxKind,createdAt:new Date().toISOString(),area:inboxArea},...current]);setNewInbox("")}
  function startVoice(){if(typeof window==="undefined"||isListening)return;const speechWindow=window as typeof window&{SpeechRecognition?:SpeechRecognitionConstructor;webkitSpeechRecognition?:SpeechRecognitionConstructor};const Recognition=speechWindow.SpeechRecognition||speechWindow.webkitSpeechRecognition;if(!Recognition)return;const recognition=new Recognition();recognition.lang="ru-RU";recognition.interimResults=false;recognition.continuous=false;recognition.onresult=event=>{const transcript=event.results[0]?.[0]?.transcript?.trim();if(transcript){setInboxItems(current=>[{id:newEntityId(),title:transcript,kind:inboxKind,createdAt:new Date().toISOString(),area:inboxArea},...current]);setNewInbox("")}};recognition.onerror=()=>setIsListening(false);recognition.onend=()=>setIsListening(false);try{setIsListening(true);recognition.start()}catch{setIsListening(false)}}
  function inboxToTask(item:InboxItem){setTasks(current=>[{id:newEntityId(),title:item.title,area:item.area||lifeAreas[0]?.name||"Личное",time:"Сегодня",dueDate:localDateKey(new Date()),priority:"medium",done:false},...current]);setInboxItems(current=>current.filter(row=>row.id!==item.id))}
  function inboxToResource(item:InboxItem){setResources(current=>[{id:newEntityId(),title:item.title,kind:item.kind==="note"?"note":"reference",area:item.area||lifeAreas[0]?.name||"Личное",note:"Сохранено из входящих"},...current]);setInboxItems(current=>current.filter(row=>row.id!==item.id))}
  function addResource(event:FormEvent){event.preventDefault();if(!newResource.trim())return;setResources(current=>[{id:newEntityId(),title:newResource.trim(),kind:"note",area:resourceArea,note:resourceNote.trim()||"Личная заметка"},...current]);setNewResource("");setResourceNote("")}

  if(selected){
    const projectId=selected.id;
    const projectArea=selected.area;
    const linked=tasks.filter(t=>t.projectId===projectId);
    const completed=linked.filter(t=>t.done).length;
    const computed=linked.length?Math.round(completed/linked.length*100):selected.progress;
    const milestones=selected.milestones||[];
    const projectResources=resources.filter(resource=>resource.projectId===projectId&&!resource.archived);
    const linkedGoals=goals.filter(goal=>goal.projectIds?.includes(projectId));
    function addMilestone(event:FormEvent){event.preventDefault();if(!newMilestone.trim())return;setProjects(current=>current.map(project=>project.id===projectId?{...project,milestones:[...(project.milestones||[]),{id:newEntityId(),title:newMilestone.trim(),done:false}]}:project));setNewMilestone("")}
    function addProjectResource(event:FormEvent){event.preventDefault();if(!newProjectResource.trim())return;setResources(current=>[{id:newEntityId(),title:newProjectResource.trim(),kind:"note",area:projectArea,note:"Материал проекта",projectId},...current]);setNewProjectResource("")}
    return <><button type="button" className="back-button" onClick={()=>setSelectedId(null)}>← Все проекты</button><section className="project-detail-hero card" style={projectCoverStyle(selected.cover)}><div><span className="eyebrow">ПРОЕКТ · {selected.area}</span><h1>{selected.name}</h1><p>{selected.notes||`Следующий шаг: ${selected.next}`}</p></div><strong>{computed}%</strong></section><div className="project-detail-grid"><section className="card project-task-panel"><CardHead title="Задачи проекта" subtitle={`${completed} из ${linked.length} выполнено`} action="Добавить задачу" onClick={()=>onNewTask(projectId)}/><div className="large-task-list">{linked.length?linked.map(task=><label key={task.id} className={task.done?"done":""}><input type="checkbox" checked={task.done} onChange={()=>setTasks(v=>v.map(t=>t.id===task.id?{...t,done:!t.done}:t))}/><span className={`check ${task.priority}`}>✓</span><div><strong>{task.title}</strong><small>{task.time} · {task.priority==="high"?"Высокий":"Обычный"} приоритет</small></div><button type="button" onClick={e=>{e.preventDefault();setTasks(v=>v.filter(t=>t.id!==task.id))}}>×</button></label>):<EmptyState text="В проекте ещё нет задач" action="Добавить первую" onClick={()=>onNewTask(projectId)}/>}</div></section><aside className="card project-context"><span className="eyebrow">КОНТЕКСТ PARA</span><h3>Следующее действие</h3><p>{selected.next}</p><div><span>Сфера</span><strong>{lifeAreas.find(a=>a.name===selected.area)?.icon} {selected.area}</strong></div><div><span>Цели</span><strong>{linkedGoals.length?linkedGoals.map(goal=>goal.title).join(" · "):"Не связан"}</strong></div><div><span>Срок</span><strong>{selected.due}</strong></div><button type="button" onClick={()=>{setProjects(v=>v.map(p=>p.id===projectId?{...p,archived:true}:p));setSelectedId(null)}}>Переместить в архив</button></aside><section className="card milestone-panel"><CardHead title="Этапы результата" subtitle={`${milestones.filter(item=>item.done).length} из ${milestones.length} завершено`}/><form onSubmit={addMilestone}><input value={newMilestone} onChange={event=>setNewMilestone(event.target.value)} placeholder="Добавить контрольную точку"/><button type="submit">＋</button></form><div>{milestones.map(item=><label className={item.done?"done":""} key={item.id}><input type="checkbox" checked={item.done} onChange={()=>setProjects(current=>current.map(project=>project.id===projectId?{...project,milestones:(project.milestones||[]).map(row=>row.id===item.id?{...row,done:!row.done}:row)}:project))}/><span>✓</span><strong>{item.title}</strong><button type="button" onClick={()=>setProjects(current=>current.map(project=>project.id===projectId?{...project,milestones:(project.milestones||[]).filter(row=>row.id!==item.id)}:project))}>×</button></label>)}</div></section><section className="card project-resource-panel"><CardHead title="Материалы проекта" subtitle={`${projectResources.length} ресурсов рядом с задачами`}/><form onSubmit={addProjectResource}><input value={newProjectResource} onChange={event=>setNewProjectResource(event.target.value)} placeholder="Ссылка, заметка или идея"/><button type="submit">Сохранить</button></form>{projectResources.map(item=><div key={item.id}><span>{item.kind==="link"?"↗":item.kind==="reference"?"◇":"✦"}</span><div><strong>{item.title}</strong><small>{item.note}</small></div><button type="button" onClick={()=>setResources(current=>current.map(row=>row.id===item.id?{...row,archived:true}:row))}>×</button></div>)}</section></div></>;
  }

  const visible=projects.filter(p=>tab==="archive"?p.archived:!p.archived);
  return <><PageTitle eyebrow="ВТОРОЙ МОЗГ · PARA" title="Второй мозг" text="Сначала фиксируйте всё во входящих. Затем превращайте записи в действия, проекты, стандарты сфер или полезные материалы." action="Новый проект" onAction={onNew}/><section className="card para-review"><div><span className="eyebrow">ЕЖЕНЕДЕЛЬНЫЙ ОБЗОР</span><h3>{inboxItems.length||projectsWithoutNextTask?"Система просит внимания":"Система в порядке"}</h3><p>Пройдите короткий пошаговый ритуал: очистите входящие, обновите проекты, сферы и выберите фокус следующей недели.</p><button type="button" className="primary" onClick={()=>setTab("review")}>Начать пошаговый обзор →</button></div><div className="para-review-metrics"><button type="button" onClick={()=>setTab("inbox")}><strong>{inboxItems.length}</strong><span>во входящих</span></button><button type="button" onClick={()=>setTab("projects")}><strong>{projectsWithoutNextTask}</strong><span>без следующей задачи</span></button><button type="button" onClick={()=>setTab("projects")}><strong>{standaloneTasks}</strong><span>задач без проекта</span></button><button type="button" onClick={()=>setTab("review")}><strong>{overdueTasks}</strong><span>просрочено</span></button></div></section><div className="para-tabs"><button className={tab==="review"?"active":""} onClick={()=>setTab("review")}>◎ Обзор</button><button className={tab==="inbox"?"active":""} onClick={()=>setTab("inbox")}>⌄ Входящие <b>{inboxItems.length}</b></button><button className={tab==="projects"?"active":""} onClick={()=>setTab("projects")}>▦ Проекты <b>{activeProjects.length}</b></button><button className={tab==="areas"?"active":""} onClick={()=>setTab("areas")}>◎ Сферы <b>{lifeAreas.length}</b></button><button className={tab==="resources"?"active":""} onClick={()=>setTab("resources")}>◇ Ресурсы <b>{resources.filter(item=>!item.archived).length}</b></button><button className={tab==="archive"?"active":""} onClick={()=>setTab("archive")}>⌁ Архив <b>{projects.filter(p=>p.archived).length}</b></button></div>
  {tab==="review"?<ParaReviewWizard inboxItems={inboxItems} tasks={tasks} setTasks={setTasks} projects={projects} setProjects={setProjects} goals={goals} lifeAreas={lifeAreas} setLifeAreas={setLifeAreas} weeklyReviews={weeklyReviews} setWeeklyReviews={setWeeklyReviews} planningFocuses={planningFocuses} setPlanningFocuses={setPlanningFocuses} notify={notify}/>:tab==="inbox"?<section className="card inbox-panel"><CardHead title="Входящие" subtitle="Запишите или продиктуйте сейчас — организуйте во время обзора"/><form className="inbox-capture" onSubmit={addInbox}><input autoFocus value={newInbox} onChange={event=>setNewInbox(event.target.value)} placeholder="Что пришло в голову?"/><button type="button" className={`voice-capture ${isListening?"listening":""}`} disabled={!voiceSupported} onClick={startVoice} title={voiceSupported?"Продиктовать запись":"Голосовой ввод не поддерживается этим браузером"}><span>{isListening?"◉":"◉"}</span>{isListening?"Слушаю…":voiceSupported?"Говорить":"Нет микрофона"}</button><select value={inboxKind} onChange={event=>setInboxKind(event.target.value as InboxItem["kind"])}><option value="idea">Идея</option><option value="task">Действие</option><option value="note">Заметка</option></select><select value={inboxArea} onChange={event=>setInboxArea(event.target.value)}>{lifeAreas.map(area=><option value={area.name} key={area.id}>{area.icon} {area.name}</option>)}</select><button type="submit" className="primary">Сохранить</button></form><div className="inbox-list">{inboxItems.map(item=><article className="inbox-row" key={item.id}><span className={`inbox-kind ${item.kind}`}>{item.kind==="idea"?"✦":item.kind==="task"?"✓":"≡"}</span><div><strong>{item.title}</strong><small>{item.area} · {new Date(item.createdAt).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}</small></div><div><button type="button" onClick={()=>inboxToTask(item)}>В задачу</button><button type="button" onClick={()=>inboxToResource(item)}>В ресурс</button><button type="button" aria-label="Удалить" onClick={()=>setInboxItems(current=>current.filter(row=>row.id!==item.id))}>×</button></div></article>)}{!inboxItems.length&&<p className="empty-copy">Входящие разобраны. Можно спокойно возвращаться к важному.</p>}</div></section>:tab==="areas"?<div className="area-overview area-standards">{lifeAreas.map(area=><article className="card" key={area.id} style={{"--area-color":area.color} as React.CSSProperties}><span>{area.icon}</span><div><div className="area-score"><h3>{area.name}</h3><b>{area.reviewScore||50}%</b></div><p>{projects.filter(p=>p.area===area.name&&!p.archived).length} проектов · {tasks.filter(t=>t.area===area.name&&!t.done).length} открытых задач</p><label><small>Стандарт сферы</small><textarea value={area.standard||""} onChange={event=>setLifeAreas(current=>current.map(row=>row.id===area.id?{...row,standard:event.target.value}:row))} placeholder="Как выглядит хороший уровень этой сферы?"/></label><input aria-label={`Оценка сферы ${area.name}`} type="range" min="0" max="100" step="5" value={area.reviewScore||50} onChange={event=>setLifeAreas(current=>current.map(row=>row.id===area.id?{...row,reviewScore:Number(event.target.value)}:row))}/></div></article>)}</div>:tab==="resources"?<section className="resources-workspace"><form className="card resource-capture" onSubmit={addResource}><div><span className="eyebrow">БАЗА ЗНАНИЙ</span><h3>Новый ресурс</h3></div><input value={newResource} onChange={event=>setNewResource(event.target.value)} placeholder="Название заметки или материала"/><select value={resourceArea} onChange={event=>setResourceArea(event.target.value)}>{lifeAreas.map(area=><option value={area.name} key={area.id}>{area.icon} {area.name}</option>)}</select><textarea value={resourceNote} onChange={event=>setResourceNote(event.target.value)} placeholder="Коротко: почему это полезно?"/><button type="submit" className="primary">＋ Сохранить ресурс</button></form><div className="resource-grid">{resources.filter(item=>!item.archived).map(item=><article className="card resource-card" key={item.id}><span>{item.kind==="link"?"↗":item.kind==="reference"?"◇":"✦"}</span><small>{item.area}{item.projectId?` · ${projects.find(project=>project.id===item.projectId)?.name||"Проект"}`:""}</small><h3>{item.title}</h3><p>{item.note}</p><div><button type="button" onClick={()=>setResources(current=>current.map(row=>row.id===item.id?{...row,archived:true}:row))}>В архив</button>{item.projectId&&<button type="button" onClick={()=>setSelectedId(item.projectId||null)}>Открыть проект</button>}</div></article>)}</div></section>:<div className="project-grid">{visible.map(p=>{const linked=tasks.filter(t=>t.projectId===p.id);const progress=linked.length?Math.round(linked.filter(t=>t.done).length/linked.length*100):p.progress;return <article className="card project-card" key={p.id}><button type="button" className="project-open" onClick={()=>setSelectedId(p.id)}><div className="project-cover" style={projectCoverStyle(p.cover)}><span>{lifeAreas.find(a=>a.name===p.area)?.icon} {p.area}</span><b>{progress}%</b></div><div className="project-info"><h3>{p.name}</h3><p>{linked.length} задач · следующий шаг: {p.next}</p><div className="mini-track"><i style={{width:`${progress}%`}}/></div><div><span>Срок: {p.due}</span><span>{p.archived?"В архиве":"Открыть →"}</span></div></div></button>{p.archived&&<button type="button" className="restore-button" onClick={()=>setProjects(v=>v.map(x=>x.id===p.id?{...x,archived:false}:x))}>Вернуть в проекты</button>}</article>})}{!visible.length&&<EmptyState text={tab==="archive"?"Архив пока пуст":"Создайте первый проект"} action="Новый проект" onClick={onNew}/>}</div>}</>;
}

function ParaReviewWizard({inboxItems,tasks,setTasks,projects,setProjects,goals,lifeAreas,setLifeAreas,weeklyReviews,setWeeklyReviews,planningFocuses,setPlanningFocuses,notify}:{inboxItems:InboxItem[];tasks:Task[];setTasks:React.Dispatch<React.SetStateAction<Task[]>>;projects:Project[];setProjects:React.Dispatch<React.SetStateAction<Project[]>>;goals:Goal[];lifeAreas:LifeArea[];setLifeAreas:React.Dispatch<React.SetStateAction<LifeArea[]>>;weeklyReviews:ParaWeeklyReview[];setWeeklyReviews:React.Dispatch<React.SetStateAction<ParaWeeklyReview[]>>;planningFocuses:Record<string,string>;setPlanningFocuses:React.Dispatch<React.SetStateAction<Record<string,string>>>;notify:(s:string)=>void}){
  const[step,setStep]=useState(0);const weekStart=localDateKey(startOfWeek(new Date()));const nextWeekDate=startOfWeek(new Date());nextWeekDate.setDate(nextWeekDate.getDate()+7);const nextWeek=localDateKey(nextWeekDate);const[focus,setFocus]=useState(planningFocuses[nextWeek]||"");const overdue=tasks.filter(task=>!task.done&&task.dueDate&&task.dueDate<localDateKey(new Date()));const activeProjects=projects.filter(project=>!project.archived);const withoutNext=activeProjects.filter(project=>!tasks.some(task=>task.projectId===project.id&&!task.done));const areaAverage=lifeAreas.length?Math.round(lifeAreas.reduce((sum,area)=>sum+(area.reviewScore||50),0)/lifeAreas.length):0;const completed=weeklyReviews.find(review=>review.weekStart===weekStart);const labels=["Входящие","Календарь и хвосты","Активные проекты","Цели и связи","Сферы жизни","Фокус недели"];
  function finish(){const review:ParaWeeklyReview={id:completed?.id||newEntityId(),weekStart,completedAt:new Date().toISOString(),focus:focus.trim(),inboxCount:inboxItems.length,overdueCount:overdue.length,projectsWithoutNext:withoutNext.length,areaAverage};setWeeklyReviews(current=>[review,...current.filter(item=>item.weekStart!==weekStart)]);if(focus.trim())setPlanningFocuses(current=>({...current,[nextWeek]:focus.trim()}));notify("Еженедельный обзор PARA завершён · +35 XP");setStep(0)}
  return <section className="card para-wizard"><div className="para-wizard-head"><div><span className="eyebrow">ПОШАГОВЫЙ ОБЗОР PARA</span><h2>{completed?"Обзор этой недели уже завершён":"Освободите голову и выберите следующую неделю"}</h2><p>{completed?`Последний раз: ${new Date(completed.completedAt).toLocaleString("ru-RU")}`:"Шесть коротких шагов. Изменения сохраняются сразу."}</p></div><div className="review-progress"><strong>{step+1} / {labels.length}</strong><div><i style={{width:`${(step+1)/labels.length*100}%`}}/></div></div></div><div className="review-stepper">{labels.map((label,index)=><button type="button" className={index===step?"active":index<step?"done":""} onClick={()=>setStep(index)} key={label}><span>{index<step?"✓":index+1}</span><small>{label}</small></button>)}</div><div className="review-content">
    {step===0&&<div className="review-intro"><span>⌄</span><h3>{inboxItems.length?`${inboxItems.length} записей ждут решения`:"Входящие чисты"}</h3><p>Обработайте записи во вкладке «Входящие»: превратите их в задачи, проекты или ресурсы. Можно продолжить обзор сейчас и вернуться к ним позже.</p><div className="review-list">{inboxItems.slice(0,4).map(item=><div key={item.id}><strong>{item.title}</strong><small>{item.area} · {item.kind}</small></div>)}</div></div>}
    {step===1&&<div><h3>Просроченные и незавершённые действия</h3><p>Не переносите список вслепую: завершите, перенесите на сегодня или удалите то, что больше не важно.</p><div className="review-action-list">{overdue.map(task=><div key={task.id}><span>!</span><div><strong>{task.title}</strong><small>срок был {prettyDate(task.dueDate||localDateKey(new Date()))}</small></div><button type="button" onClick={()=>setTasks(current=>current.map(item=>item.id===task.id?{...item,dueDate:localDateKey(new Date())}:item))}>На сегодня</button><button type="button" onClick={()=>setTasks(current=>current.map(item=>item.id===task.id?{...item,done:true,completedAt:new Date().toISOString()}:item))}>Готово</button></div>)}{!overdue.length&&<p className="empty-copy">Просроченных задач нет.</p>}</div></div>}
    {step===2&&<div><h3>У каждого проекта есть следующее действие</h3><p>Проект без следующего шага быстро становится фоном. Обновите формулировку прямо здесь.</p><div className="review-projects">{activeProjects.map(project=>{const hasTask=tasks.some(task=>task.projectId===project.id&&!task.done);return <label className={hasTask?"ready":"attention"} key={project.id}><span>{hasTask?"✓":"!"}</span><div><strong>{project.name}</strong><small>{hasTask?"Следующая задача определена":"Нет открытой задачи"}</small></div><input defaultValue={project.next} onBlur={event=>setProjects(current=>current.map(item=>item.id===project.id?{...item,next:event.target.value||"Определить следующий шаг"}:item))}/></label>})}</div></div>}
    {step===3&&<div><h3>Проекты действительно двигают цели?</h3><p>Здесь видна связь. Изменить набор связанных проектов можно в разделе «Цели».</p><div className="review-goals">{goals.map(goal=><article key={goal.id}><span>{goal.period}</span><strong>{goal.title}</strong><small>{goal.projectIds?.length?`${goal.projectIds.length} проектов · ${goalProgressValue(goal,projects,tasks)}% прогресса`:"Нет связанного проекта"}</small></article>)}</div></div>}
    {step===4&&<div><h3>Быстрая проверка сфер жизни</h3><p>Поставьте честную оценку. Низкая оценка — это сигнал внимания, а не повод для штрафа.</p><div className="review-areas">{lifeAreas.map(area=><label key={area.id}><span>{area.icon}</span><div><strong>{area.name}</strong><small>{area.standard||"Стандарт не задан"}</small></div><b>{area.reviewScore||50}%</b><input type="range" min="0" max="100" step="5" value={area.reviewScore||50} onChange={event=>setLifeAreas(current=>current.map(item=>item.id===area.id?{...item,reviewScore:Number(event.target.value)}:item))}/></label>)}</div></div>}
    {step===5&&<div className="review-focus"><h3>Какой один результат сделает неделю хорошей?</h3><p>Этот текст автоматически появится в планировании как фокус следующей недели.</p><textarea value={focus} onChange={event=>setFocus(event.target.value)} placeholder="Например: выпустить первую версию и сохранить два вечера свободными"/><div className="review-summary"><span><small>Входящие</small><strong>{inboxItems.length}</strong></span><span><small>Просрочено</small><strong>{overdue.length}</strong></span><span><small>Проекты без действия</small><strong>{withoutNext.length}</strong></span><span><small>Баланс сфер</small><strong>{areaAverage}%</strong></span></div></div>}
  </div><div className="review-footer"><button type="button" disabled={step===0} onClick={()=>setStep(value=>Math.max(0,value-1))}>← Назад</button>{step<labels.length-1?<button type="button" className="primary" onClick={()=>setStep(value=>Math.min(labels.length-1,value+1))}>Продолжить →</button>:<button type="button" className="primary" onClick={finish}>✓ Завершить обзор</button>}</div></section>
}

function HabitsPage({habits,setHabits,history,clock,onToggle,onNew,onEdit}:{habits:Habit[];setHabits:React.Dispatch<React.SetStateAction<Habit[]>>;history:HabitHistory[];clock:ReturnType<typeof habitClock>;onToggle:(id:number,date:string)=>void;onNew:()=>void;onEdit:(habit:Habit)=>void}){
  const todayDone=habits.filter(h=>h.checks[clock.today]).length;const weekDone=habits.reduce((sum,h)=>sum+Object.values(h.checks).filter(Boolean).length,0);const possible=Math.max(1,habits.length*(clock.dates.findIndex(d=>localDateKey(d)===clock.today)+1));
  return <><PageTitle eyebrow="РИТМ" title="Привычки" text="Неделя начинается в воскресенье в 05:00. Изменять можно только сегодняшний день." action="Новая привычка" onAction={onNew}/><div className="stats-strip"><Stat value={`${todayDone}/${habits.length}`} label="Сегодня"/><Stat value={`${Math.round(weekDone/possible*100)}%`} label="Темп недели"/><Stat value={weekDone.toString()} label="Отметок"/><Stat value={history.length.toString()} label="Недель в истории"/></div><div className="habit-week card"><div className="week-head"><h3>{prettyDate(clock.weekStart)} — {prettyDate(localDateKey(clock.dates[6]))}</h3>{clock.dates.map((d,i)=><span className={localDateKey(d)===clock.today?"today":""} key={i}>{dayNames[i]}<small>{d.getDate()}</small></span>)}</div>{habits.map(h=><div className="habit-week-row" key={h.id}><div><span>{h.icon}</span><span className="habit-copy"><strong>{h.name}</strong><small>{h.area} · {Object.values(h.checks).filter(Boolean).length}/7</small></span><button type="button" className="habit-edit" onClick={()=>onEdit(h)}>Изменить</button><button type="button" className="habit-delete" aria-label={`Удалить ${h.name}`} onClick={()=>setHabits(v=>v.filter(x=>x.id!==h.id))}>×</button></div>{clock.dates.map((date,i)=>{const key=localDateKey(date);const isToday=key===clock.today;const past=key<clock.today;return <button type="button" key={`${h.id}-${key}`} disabled={!isToday} aria-label={`${h.name}, ${dayNames[i]}${isToday?", сегодня":past?", прошедший день":", будущий день"}`} title={isToday?"Отметить сегодняшний день":past?"Прошедший день заблокирован":"Будущий день заблокирован"} onClick={()=>onToggle(h.id,key)} className={`${h.checks[key]?"hit":""} ${isToday?"editable":"locked"}`}><small>{dayNames[i]}</small><span>✓</span></button>})}</div>)}</div><section className="habit-history card"><CardHead title="История прогресса" subtitle="Завершённые недели сохраняются автоматически"/>{history.length?<div className="history-grid">{history.slice(-8).reverse().map(item=><div key={item.id}><span>{prettyDate(item.weekStart)}</span><strong>{item.habitName}</strong><div className="mini-track"><i style={{width:`${Math.round(item.completed/item.total*100)}%`}}/></div><small>{item.completed}/{item.total} · {Math.round(item.completed/item.total*100)}%</small></div>)}</div>:<p className="empty-copy">История появится после первого воскресного сброса в 05:00.</p>}</section></>;
}

function FinancePage({accounts,setAccounts,transactions,setTransactions,categories,setCategories,budgetLines,setBudgetLines,recurringExpenses,setRecurringExpenses,onOperation,onTransfer,onAccount}:{accounts:Account[];setAccounts:React.Dispatch<React.SetStateAction<Account[]>>;transactions:Transaction[];setTransactions:React.Dispatch<React.SetStateAction<Transaction[]>>;categories:FinanceCategory[];setCategories:React.Dispatch<React.SetStateAction<FinanceCategory[]>>;budgetLines:BudgetLine[];setBudgetLines:React.Dispatch<React.SetStateAction<BudgetLine[]>>;recurringExpenses:RecurringExpense[];setRecurringExpenses:React.Dispatch<React.SetStateAction<RecurringExpense[]>>;onOperation:()=>void;onTransfer:()=>void;onAccount:()=>void}){
  const[categoriesOpen,setCategoriesOpen]=useState(false);const[budgetOpen,setBudgetOpen]=useState(false);const[recurringOpen,setRecurringOpen]=useState(false);const[editingRecurring,setEditingRecurring]=useState<RecurringExpense|null>(null);
  const now=new Date();const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;const monthTransactions=transactions.filter(item=>item.date.startsWith(monthKey));const income=monthTransactions.filter(t=>t.kind==="income").reduce((s,t)=>s+t.amount,0);const expenses=monthTransactions.filter(t=>t.kind==="expense").reduce((s,t)=>s+t.amount,0);const monthlyBudget=budgetLines.reduce((sum,line)=>sum+line.limit,0);const remaining=monthlyBudget-expenses;const budgetUsage=monthlyBudget?Math.round(expenses/monthlyBudget*100):0;const capital=accounts.reduce((sum,account)=>sum+account.balance,0);const upcoming=transactions.filter(t=>t.kind==="installment"&&!t.posted).sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||""));
  const weekStart=startOfWeek(now);const weekDates=Array.from({length:7},(_,index)=>{const date=new Date(weekStart);date.setDate(date.getDate()+index);return date});const dailySpend=weekDates.map(date=>transactions.filter(item=>item.kind==="expense"&&item.date===localDateKey(date)).reduce((sum,item)=>sum+item.amount,0));const weekSpent=dailySpend.reduce((sum,value)=>sum+value,0);const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();const weeklyBudget=monthlyBudget/daysInMonth*7;const dailyPlan=weeklyBudget/7;const maxDay=Math.max(dailyPlan,...dailySpend,1);const weekDeviation=weekSpent-weeklyBudget;
  function nextRecurringDate(item:RecurringExpense){const currentDueDay=Math.min(item.dayOfMonth,daysInMonth);const moveToNext=currentDueDay<now.getDate()||item.lastProcessedPeriod===monthKey;const targetBase=new Date(now.getFullYear(),now.getMonth()+(moveToNext?1:0),1,12);const targetMaxDay=new Date(targetBase.getFullYear(),targetBase.getMonth()+1,0).getDate();return localDateKey(new Date(targetBase.getFullYear(),targetBase.getMonth(),Math.min(item.dayOfMonth,targetMaxDay),12))}
  function saveRecurring(draft:Omit<RecurringExpense,"id">){if(editingRecurring)setRecurringExpenses(current=>current.map(item=>item.id===editingRecurring.id?{...draft,id:item.id,lastProcessedPeriod:item.lastProcessedPeriod}:item));else{const currentPeriodAlreadyPassed=draft.dayOfMonth<=now.getDate()?monthKey:undefined;setRecurringExpenses(current=>[...current,{...draft,id:newEntityId(),lastProcessedPeriod:currentPeriodAlreadyPassed}])}setRecurringOpen(false);setEditingRecurring(null)}
  return <><PageTitle eyebrow="РЕСУРСЫ" title="Финансы" text="Бюджет, фактические расходы и постоянные платежи — в одном денежном ритме." action="Операция" onAction={onOperation} extra={<><button type="button" className="secondary-action" onClick={()=>setBudgetOpen(true)}>◎ Бюджет</button><button type="button" className="secondary-action" onClick={()=>setCategoriesOpen(true)}>◉ Категории</button><button type="button" className="secondary-action" onClick={onTransfer}>⇄ Перевод</button><button type="button" className="secondary-action" onClick={onAccount}>＋ Счёт</button></>}/>
  <div className="finance-hero budget-hero"><div><small>БЮДЖЕТ НА МЕСЯЦ</small><strong>{formatIls(monthlyBudget)}</strong><span>{budgetLines.length} категорий</span></div><div><small>ФАКТ ЗА МЕСЯЦ</small><strong>{formatIls(expenses)}</strong><span>{budgetUsage}% бюджета использовано</span></div><div className={remaining<0?"over-budget":""}><small>{remaining<0?"ПЕРЕРАСХОД":"ОСТАЛОСЬ"}</small><strong>{formatIls(Math.abs(remaining))}</strong><span>{remaining<0?"выше плана":"доступно до конца месяца"}</span></div><div><small>ДОХОДЫ ЗА МЕСЯЦ</small><strong className="lime">{formatIls(income)}</strong><span>капитал сейчас: {formatIls(capital)}</span></div></div>
  <FinanceForecast accounts={accounts} transactions={transactions} budgetLines={budgetLines} recurringExpenses={recurringExpenses}/>
  <section className="card weekly-spend"><div className="weekly-spend-head"><div><span className="eyebrow">НЕДЕЛЬНЫЙ РИТМ</span><h3>Расходы из всех источников</h3><p>Наличные, банковская и кредитная карты · план {formatIls(weeklyBudget)}</p></div><div className={weekDeviation>0?"bad":"good"}><small>{weekDeviation>0?"ВЫШЕ НЕДЕЛЬНОГО ПЛАНА":"НИЖЕ НЕДЕЛЬНОГО ПЛАНА"}</small><strong>{weekDeviation>0?"+":"−"}{formatIls(Math.abs(weekDeviation))}</strong></div></div><div className="spend-scale"><div className="plan-line" style={{bottom:`${Math.min(92,dailyPlan/maxDay*100)}%`}}><span>план в день {formatIls(dailyPlan)}</span></div>{weekDates.map((date,index)=>{const value=dailySpend[index];const over=value>dailyPlan;return <div className={`spend-day ${over?"over":""} ${localDateKey(date)===localDateKey(now)?"today":""}`} key={localDateKey(date)}><div className="spend-value">{value?formatIls(value):"—"}</div><div className="spend-column"><i style={{height:`${value/maxDay*100}%`}}/></div><strong>{dayNames[index]}</strong><small>{date.getDate()}</small></div>})}</div><div className="weekly-source-legend">{accounts.map(account=>{const spent=transactions.filter(item=>item.kind==="expense"&&item.accountId===account.id&&weekDates.some(date=>localDateKey(date)===item.date)).reduce((sum,item)=>sum+item.amount,0);return <div key={account.id}><span className={account.type}/><small>{account.name}</small><strong>{formatIls(spent)}</strong></div>})}</div></section>
  <FinanceCalendar recurringExpenses={recurringExpenses} transactions={transactions} accounts={accounts}/>
  <section className="accounts-grid">{accounts.map(account=><AccountCard key={account.id} account={account} debitAccounts={accounts.filter(a=>a.type==="debit")} onSave={next=>setAccounts(v=>v.map(a=>a.id===next.id?next:a))}/>)}</section>
  <div className="finance-grid"><section className="card budget budget-vs-actual"><CardHead title="Бюджет: план и факт" subtitle={`${new Intl.DateTimeFormat("ru-RU",{month:"long"}).format(now)} · ${budgetUsage}%`} action="Настроить" onClick={()=>setBudgetOpen(true)}/>{categories.map(category=>{const actual=monthTransactions.filter(t=>t.kind==="expense"&&t.category===category.name).reduce((sum,t)=>sum+t.amount,0);const plan=budgetLines.find(line=>line.category===category.name)?.limit||0;const percent=plan?Math.round(actual/plan*100):actual?100:0;return <div className={actual>plan&&plan>0?"over":""} key={category.id}><span>{category.icon} {category.name}</span><div><div className="mini-track"><i style={{width:`${Math.min(100,percent)}%`}}/></div><small>{percent}%</small></div><b>{formatIls(actual)} <small>/ {formatIls(plan)}</small></b></div>})}</section><section className="card installments"><CardHead title="План кредитных платежей" subtitle={`${upcoming.length} будущих списаний`}/>{upcoming.length?upcoming.slice(0,8).map(item=><div className="installment-row" key={item.id}><span>{prettyDate(item.dueDate||item.date)}</span><div><strong>{item.title}</strong><small>автосписание с основного счёта</small></div><b>{formatIls(item.amount)}</b></div>):<p className="empty-copy">Добавьте покупку с кредитной карты и выберите число платежей.</p>}</section></div>
  <section className="card recurring-card"><CardHead title="Постоянные расходы" subtitle="В дату списания или при следующем открытии NEXUS" action="Добавить платёж" onClick={()=>{setEditingRecurring(null);setRecurringOpen(true)}}/><div className="recurring-list">{recurringExpenses.map(item=><div className={!item.active?"paused":""} key={item.id}><span>{categories.find(category=>category.name===item.category)?.icon||"↻"}</span><div><strong>{item.title}</strong><small>{item.category} · {accounts.find(account=>account.id===item.accountId)?.name}</small></div><b>{formatIls(item.amount)}</b><div className="recurring-date"><small>следующее списание</small><strong>{prettyDate(nextRecurringDate(item))}</strong></div><button type="button" className={`recurring-toggle ${item.active?"active":""}`} onClick={()=>setRecurringExpenses(current=>current.map(row=>row.id===item.id?{...row,active:!row.active}:row))}>{item.active?"Вкл":"Пауза"}</button><button type="button" onClick={()=>{setEditingRecurring(item);setRecurringOpen(true)}}>Изменить</button><button type="button" aria-label={`Удалить ${item.title}`} onClick={()=>setRecurringExpenses(current=>current.filter(row=>row.id!==item.id))}>×</button></div>)}</div></section>
  <section className="card transactions"><CardHead title="Журнал операций" subtitle={`${transactions.filter(t=>t.kind!=="installment"||t.posted).length} записей`} action="Новая операция" onClick={onOperation}/>{transactions.filter(t=>t.kind!=="installment"||t.posted).map(t=><div className="transaction-row" key={t.id}><span className={t.kind}>{t.kind==="income"?"↑":t.kind==="transfer"?"⇄":t.recurringId?"↻":"↓"}</span><div><strong>{t.title}</strong><small>{categories.find(c=>c.name===t.category)?.icon} {t.category} · {prettyDate(t.date)} · {accounts.find(a=>a.id===t.accountId)?.name}{t.recurringId?" · постоянный платёж":""}</small></div><b className={t.kind}>{t.kind==="income"?"+":t.kind==="transfer"?"":"−"}{formatIls(t.amount)}</b><button type="button" onClick={()=>setTransactions(v=>v.filter(x=>x.id!==t.id))}>×</button></div>)}</section>
  {categoriesOpen&&<FinanceCategoriesModal categories={categories} setCategories={setCategories} onClose={()=>setCategoriesOpen(false)}/>} {budgetOpen&&<BudgetModal categories={categories} lines={budgetLines} setLines={setBudgetLines} onClose={()=>setBudgetOpen(false)}/>} {recurringOpen&&<RecurringExpenseModal accounts={accounts} categories={categories} initial={editingRecurring} onClose={()=>{setRecurringOpen(false);setEditingRecurring(null)}} onSave={saveRecurring}/>}</>;
}

function FinanceForecast({accounts,transactions,budgetLines,recurringExpenses}:{accounts:Account[];transactions:Transaction[];budgetLines:BudgetLine[];recurringExpenses:RecurringExpense[]}){
  const now=new Date();const period=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();const elapsed=Math.max(1,now.getDate());const remainingDays=Math.max(0,daysInMonth-now.getDate());const budget=budgetLines.reduce((sum,line)=>sum+line.limit,0);const actual=transactions.filter(item=>item.kind==="expense"&&item.date.startsWith(period)).reduce((sum,item)=>sum+item.amount,0);const variableActual=transactions.filter(item=>item.kind==="expense"&&item.date.startsWith(period)&&!item.recurringId).reduce((sum,item)=>sum+item.amount,0);const dailyPace=variableActual/elapsed;const futureRecurring=recurringExpenses.filter(item=>item.active&&item.dayOfMonth>now.getDate()&&item.lastProcessedPeriod!==period).reduce((sum,item)=>sum+item.amount,0);const futureCredit=transactions.filter(item=>item.kind==="installment"&&!item.posted&&(item.dueDate||item.date).startsWith(period)).reduce((sum,item)=>sum+item.amount,0);const projectedVariable=dailyPace*remainingDays;const projectedSpend=actual+futureRecurring+projectedVariable;const deviation=projectedSpend-budget;const liquid=accounts.filter(account=>account.type!=="credit").reduce((sum,account)=>sum+account.balance,0);const projectedLiquidity=liquid-futureRecurring-futureCredit-projectedVariable;const safeDaily=remainingDays?Math.max(0,(budget-actual-futureRecurring)/remainingDays):0;const forecastPercent=budget?Math.round(projectedSpend/budget*100):0;
  return <section className={`card finance-forecast ${deviation>0?"risk":"safe"}`}><div className="forecast-head"><div><span className="eyebrow">ПРОГНОЗ ДО КОНЦА МЕСЯЦА</span><h3>{deviation>0?`При текущем темпе возможен перерасход ${formatIls(deviation)}`:`Темп укладывается в бюджет с запасом ${formatIls(Math.abs(deviation))}`}</h3><p>Прогноз обновляется после каждой операции и учитывает постоянные списания. Кредитные платежи отдельно влияют на ликвидность, но не дублируются как новый расход.</p></div><div className="forecast-ring"><Ring value={Math.min(100,forecastPercent)} color={deviation>0?"#ff6b7d":"var(--lime)"} size={92}/><small>{forecastPercent}% от бюджета</small></div></div><div className="forecast-track"><div className="forecast-budget-line" style={{left:`${Math.min(96,budget/Math.max(projectedSpend,budget,1)*100)}%`}}><span>бюджет</span></div><i style={{width:`${Math.min(100,projectedSpend/Math.max(projectedSpend,budget,1)*100)}%`}}/></div><div className="forecast-metrics"><article><small>ПРОГНОЗ РАСХОДОВ</small><strong>{formatIls(projectedSpend)}</strong><span>факт {formatIls(actual)} + темп</span></article><article><small>ЕЩЁ ПОСТОЯННЫХ</small><strong>{formatIls(futureRecurring)}</strong><span>до конца месяца</span></article><article><small>КРЕДИТНЫЕ СПИСАНИЯ</small><strong>{formatIls(futureCredit)}</strong><span>из основного счёта</span></article><article><small>БЕЗОПАСНО В ДЕНЬ</small><strong>{formatIls(safeDaily)}</strong><span>{remainingDays} дней осталось</span></article><article className={projectedLiquidity<0?"negative":""}><small>ЛИКВИДНОСТЬ К КОНЦУ</small><strong>{formatIls(projectedLiquidity)}</strong><span>наличные + банк, прогноз</span></article></div></section>
}

function FinanceCalendar({recurringExpenses,transactions,accounts}:{recurringExpenses:RecurringExpense[];transactions:Transaction[];accounts:Account[]}){
  type FinanceCalendarItem={id:string;date:string;title:string;amount:number;kind:"recurring"|"credit";paid:boolean;account:string};
  const[month,setMonth]=useState(()=>{const date=new Date();return new Date(date.getFullYear(),date.getMonth(),1,12)});
  const year=month.getFullYear();const monthIndex=month.getMonth();const period=`${year}-${String(monthIndex+1).padStart(2,"0")}`;const lastDay=new Date(year,monthIndex+1,0).getDate();
  const recurringItems:FinanceCalendarItem[]=recurringExpenses.filter(item=>item.active).map(item=>{const date=localDateKey(new Date(year,monthIndex,Math.min(item.dayOfMonth,lastDay),12));const paid=transactions.some(transaction=>transaction.recurringId===item.id&&transaction.recurringPeriod===period)||item.lastProcessedPeriod===period;return{id:`recurring-${item.id}`,date,title:item.title,amount:item.amount,kind:"recurring",paid,account:accounts.find(account=>account.id===item.accountId)?.name||"Счёт"}});
  const creditItems:FinanceCalendarItem[]=transactions.filter(item=>item.kind==="installment"&&(item.dueDate||item.date).startsWith(period)).map(item=>{const credit=accounts.find(account=>account.id===item.accountId);const debit=accounts.find(account=>account.id===credit?.linkedAccountId);return{id:`credit-${item.id}`,date:item.dueDate||item.date,title:item.title,amount:item.amount,kind:"credit",paid:Boolean(item.posted),account:debit?.name||credit?.name||"Основной счёт"}});
  const items=[...recurringItems,...creditItems].sort((a,b)=>a.date.localeCompare(b.date));const recurringTotal=recurringItems.reduce((sum,item)=>sum+item.amount,0);const creditTotal=creditItems.reduce((sum,item)=>sum+item.amount,0);
  const gridStart=new Date(year,monthIndex,1,12);gridStart.setDate(gridStart.getDate()-gridStart.getDay());const dates=Array.from({length:42},(_,index)=>{const date=new Date(gridStart);date.setDate(date.getDate()+index);return date});
  function move(delta:number){setMonth(current=>new Date(current.getFullYear(),current.getMonth()+delta,1,12))}
  return <section className="card finance-calendar"><div className="finance-calendar-head"><div><span className="eyebrow">ДЕНЕЖНЫЙ КАЛЕНДАРЬ</span><h3>Списания и кредитные платежи</h3><p>Все обязательства видны заранее — обычные списания и рассрочки не потеряются.</p></div><div className="finance-calendar-summary"><span><small>ПОСТОЯННЫЕ</small><strong>{formatIls(recurringTotal)}</strong></span><span><small>КРЕДИТНЫЕ</small><strong>{formatIls(creditTotal)}</strong></span><span><small>ВСЕГО</small><strong>{formatIls(recurringTotal+creditTotal)}</strong></span></div></div><div className="finance-calendar-toolbar"><button type="button" onClick={()=>move(-1)} aria-label="Предыдущий месяц">←</button><strong>{new Intl.DateTimeFormat("ru-RU",{month:"long",year:"numeric"}).format(month)}</strong><button type="button" onClick={()=>move(1)} aria-label="Следующий месяц">→</button><button type="button" onClick={()=>{const today=new Date();setMonth(new Date(today.getFullYear(),today.getMonth(),1,12))}}>Сегодня</button><div className="finance-calendar-legend"><span>● Постоянный</span><span>● Кредитный</span><span>✓ Списан</span></div></div><div className="finance-calendar-scroll"><div className="finance-calendar-inner"><div className="finance-calendar-weekdays">{dayNames.map(day=><span key={day}>{day}</span>)}</div><div className="finance-calendar-grid">{dates.map(date=>{const key=localDateKey(date);const dayItems=items.filter(item=>item.date===key);return <div className={`finance-calendar-day ${date.getMonth()!==monthIndex?"outside":""} ${key===localDateKey(new Date())?"today":""}`} key={key}><strong>{date.getDate()}</strong><div>{dayItems.map(item=><article className={`finance-calendar-event ${item.kind} ${item.paid?"paid":""}`} title={`${item.title} · ${item.account}`} key={item.id}><span>{item.kind==="credit"?"◇":"↻"} {item.title}</span><b>{formatIls(item.amount)}</b><small>{item.paid?"✓ списано":item.account}</small></article>)}</div></div>})}</div></div></div></section>;
}

function AccountCard({account,debitAccounts,onSave}:{account:Account;debitAccounts:Account[];onSave:(a:Account)=>void}){
  const[editing,setEditing]=useState(false);const[name,setName]=useState(account.name);const[balance,setBalance]=useState(String(account.balance));const[linked,setLinked]=useState(String(account.linkedAccountId||""));
  return <article className={`card account-card ${account.type}`}><span>{account.type==="cash"?"▣":account.type==="debit"?"▤":"◇"}</span>{editing?<><input aria-label="Название счёта" value={name} onChange={e=>setName(e.target.value)}/><input aria-label="Баланс счёта" type="number" value={balance} onChange={e=>setBalance(e.target.value)}/>{account.type==="credit"&&<select aria-label="Счёт списания" value={linked} onChange={e=>setLinked(e.target.value)}>{debitAccounts.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select>}<button type="button" onClick={()=>{onSave({...account,name,balance:Number(balance),linkedAccountId:Number(linked)||account.linkedAccountId});setEditing(false)}}>Сохранить</button></>:<><small>{account.type==="cash"?"НАЛИЧНЫЕ":account.type==="debit"?"БАНКОВСКИЙ СЧЁТ":"КРЕДИТНАЯ КАРТА"}</small><strong>{formatIls(account.balance)}</strong><p>{account.type==="credit"?`Списание ${account.billingDay||15} числа`:"Доступный остаток"}</p><button type="button" onClick={()=>setEditing(true)}>Изменить</button></>}</article>
}

function HealthPage({notes,setNotes,onMetric,notify}:{notes:HealthNote[];setNotes:React.Dispatch<React.SetStateAction<HealthNote[]>>;onMetric:()=>void;notify:(s:string)=>void}){
  const[note,setNote]=useState("");function save(){if(!note.trim())return;setNotes(v=>[{id:newEntityId(),kind:"note",title:"Заметка о состоянии",value:note.trim(),date:new Date().toISOString()},...v]);setNote("");notify("Заметка о здоровье сохранена")}
  return <><PageTitle eyebrow="СОСТОЯНИЕ" title="Здоровье" text="Метрики и заметки сохраняются в журнале здоровья." action="Записать метрику" onAction={onMetric}/><div className="health-grid">{[["Сон","7ч 42м","качество 84%","☾"],["Энергия","8 / 10","стабильно весь день","⚡"],["Активность","8 462","шагов сегодня","↗"],["Вес","78,4 кг","−0,8 кг за месяц","◎"]].map(x=><article className="card health-stat" key={x[0]}><span>{x[3]}</span><small>{x[0]}</small><strong>{x[1]}</strong><p>{x[2]}</p></article>)}</div><div className="health-bottom"><section className="card energy-chart"><CardHead title="Энергия за 7 дней" subtitle="Среднее: 7,4"/><div className="bars">{[52,68,62,81,74,88,79].map((h,i)=><div key={i}><i style={{height:`${h}%`}}/><span>{dayNames[i]}</span></div>)}</div></section><section className="card note-card"><span className="eyebrow">ЗАМЕТКА О СОСТОЯНИИ</span><h3>Что замечаешь сегодня?</h3><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Энергия, самочувствие, симптомы, мысли..."/><button type="button" onClick={save}>Сохранить заметку</button></section></div><section className="card notes-history"><CardHead title="Журнал здоровья" subtitle={`${notes.length} записей`}/>{notes.length?notes.map(item=><div key={item.id}><span>{item.kind==="metric"?"◎":"✦"}</span><div><strong>{item.title}</strong><p>{item.value}</p><small>{new Date(item.date).toLocaleString("ru-RU")}</small></div><button type="button" onClick={()=>setNotes(v=>v.filter(n=>n.id!==item.id))}>×</button></div>):<p className="empty-copy">Добавьте первую метрику или заметку.</p>}</section></>;
}

function PlanningPage({events,setEvents,tasks,setTasks,focuses,setFocuses,onNew,notify}:{events:CalendarEvent[];setEvents:React.Dispatch<React.SetStateAction<CalendarEvent[]>>;tasks:Task[];setTasks:React.Dispatch<React.SetStateAction<Task[]>>;focuses:Record<string,string>;setFocuses:React.Dispatch<React.SetStateAction<Record<string,string>>>;onNew:()=>void;notify:(s:string)=>void}){
  type ScheduleItem={key:string;id:number;type:"event"|"task";title:string;date:string;time:string;note:string;tone?:CalendarEvent["tone"];done?:boolean;duration?:number};
  type CalendarView="day"|"week"|"month";
  const[view,setView]=useState<CalendarView>("week");
  const[anchorDate,setAnchorDate]=useState(()=>new Date());
  const[savedWeek,setSavedWeek]=useState("");
  const[touchDraggingTaskId,setTouchDraggingTaskId]=useState<number|null>(null);
  const weekStart=startOfWeek(anchorDate);
  const weekKey=localDateKey(weekStart);
  const note=focuses[weekKey]||"";
  const weekDates=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d});
  const eventDate=(event:CalendarEvent)=>{if(event.date)return event.date;const fixed=startOfWeek(new Date());fixed.setDate(fixed.getDate()+Math.max(0,Math.min(6,Number(event.day||0))));return localDateKey(fixed)};
  const schedule:ScheduleItem[]=[...events.map(event=>({key:`event-${event.id}`,id:event.id,type:"event" as const,title:event.title,date:eventDate(event),time:event.time,note:event.note||"План",tone:event.tone,duration:60})),...tasks.filter(task=>task.dueDate&&!task.archived).map(task=>({key:`task-${task.id}`,id:task.id,type:"task" as const,title:task.title,date:task.dueDate||"",time:/^\d{2}:\d{2}$/.test(task.time)?task.time:"08:00",note:`${task.duration||30} мин · ${contextLabel[task.context||"anywhere"]}`,done:task.done,duration:task.duration||30}))];
  const upcoming=schedule.filter(item=>item.date>=localDateKey(new Date())&&!item.done).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const focusSaved=savedWeek===weekKey;
  const hours=["08:00","10:00","12:00","14:00","16:00","18:00","20:00"];
  function navigatePeriod(delta:number){setAnchorDate(current=>{const next=new Date(current);if(view==="day")next.setDate(next.getDate()+delta);else if(view==="week")next.setDate(next.getDate()+delta*7);else next.setMonth(next.getMonth()+delta,1);return next})}
  function moveTask(taskId:number,date:string,time?:string){setTasks(current=>current.map(task=>task.id===taskId?{...task,dueDate:date,time:time||task.time}:task));notify(`Задача перенесена на ${prettyDate(date)}${time?` · ${time}`:""}`)}
  function timeFromPosition(element:HTMLElement,clientY:number){const rect=element.getBoundingClientRect();const ratio=Math.max(0,Math.min(1,(clientY-rect.top-48)/Math.max(1,rect.height-48)));const value=Math.round((8+ratio*12)*2)/2;const hour=Math.min(20,Math.floor(value));return`${String(hour).padStart(2,"0")}:${value%1?"30":"00"}`}
  function dropOnTimeline(event:React.DragEvent<HTMLDivElement>,date:string){event.preventDefault();const taskId=Number(event.dataTransfer.getData("text/nexus-task"));if(!taskId)return;moveTask(taskId,date,timeFromPosition(event.currentTarget,event.clientY))}
  function taskDrag(event:React.DragEvent<HTMLDivElement>,item:ScheduleItem){if(item.type!=="task")return;event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/nexus-task",String(item.id))}
  function startTouchDrag(event:React.PointerEvent<HTMLDivElement>,item:ScheduleItem){if(item.type!=="task"||event.pointerType==="mouse")return;event.currentTarget.setPointerCapture(event.pointerId);setTouchDraggingTaskId(item.id)}
  function finishTouchDrag(event:React.PointerEvent<HTMLDivElement>){if(touchDraggingTaskId===null)return;const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>("[data-calendar-date]");if(target?.dataset.calendarDate){const time=target.dataset.calendarTimeline==="true"?timeFromPosition(target,event.clientY):undefined;moveTask(touchDraggingTaskId,target.dataset.calendarDate,time)}setTouchDraggingTaskId(null)}
  function renderEvent(item:ScheduleItem,index:number){const [hoursValue,minutesValue]=/^\d{2}:\d{2}$/.test(item.time)?item.time.split(":").map(Number):[8,0];return <div draggable={item.type==="task"} onDragStart={event=>taskDrag(event,item)} onPointerDown={event=>startTouchDrag(event,item)} onPointerUp={finishTouchDrag} onPointerCancel={()=>setTouchDraggingTaskId(null)} className={`event ${item.type==="task"?"task-calendar-event":`${item.tone}-event`} ${item.done?"completed":""} ${touchDraggingTaskId===item.id?"touch-dragging":""}`} style={{top:Math.max(54,54+(hoursValue-8+minutesValue/60)*32+index*6),height:Math.max(48,Math.min(112,(item.duration||60)/60*64))}} key={item.key}>{item.type==="task"&&<button type="button" className="calendar-task-check" aria-label={item.done?"Вернуть задачу в работу":"Выполнить задачу"} onClick={()=>setTasks(current=>current.map(task=>task.id===item.id?{...task,done:!task.done}:task))}>{item.done?"✓":"○"}</button>}<span>{item.title}</span><small>{item.type==="task"?`${item.time} · ${item.note}`:item.time}</small>{item.type==="event"&&<button type="button" aria-label="Удалить событие" onClick={()=>setEvents(current=>current.filter(event=>event.id!==item.id))}>×</button>}</div>}
  function renderTimeline(dates:Date[],className:string){return <section className={`${className} card calendar-timeline`}><div className="calendar-hours">{hours.map(value=><span key={value}>{value}</span>)}</div>{dates.map(date=>{const key=localDateKey(date);const dayItems=schedule.filter(item=>item.date===key).sort((a,b)=>a.time.localeCompare(b.time));return <div data-calendar-date={key} data-calendar-timeline="true" className={`calendar-day ${key===localDateKey(new Date())?"today":""}`} onDragOver={event=>event.preventDefault()} onDrop={event=>dropOnTimeline(event,key)} key={key}><strong>{dayNames[date.getDay()]} {date.getDate()}</strong>{dayItems.map(renderEvent)}<span className="drop-hint">Перетащите задачу сюда</span></div>})}</section>}
  const monthFirst=new Date(anchorDate.getFullYear(),anchorDate.getMonth(),1,12);const monthGridStart=new Date(monthFirst);monthGridStart.setDate(monthGridStart.getDate()-monthGridStart.getDay());const monthDates=Array.from({length:42},(_,index)=>{const date=new Date(monthGridStart);date.setDate(date.getDate()+index);return date});
  const periodLabel=view==="day"?new Intl.DateTimeFormat("ru-RU",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(anchorDate):view==="week"?`${prettyDate(localDateKey(weekDates[0]))} — ${prettyDate(localDateKey(weekDates[6]))}`:new Intl.DateTimeFormat("ru-RU",{month:"long",year:"numeric"}).format(anchorDate);
  return <><PageTitle eyebrow="ВРЕМЯ" title="Планирование" text="Выбирайте масштаб дня, недели или месяца. Задачи можно перетаскивать на нужную дату и время." action="Новый план" onAction={onNew}/><section className={`card planning-note ${focusSaved?"saved":""}`}><div><span className="eyebrow">ФОКУС НЕДЕЛИ</span><h3>{note||"Что должно стать главным результатом?"}</h3><small>{prettyDate(weekKey)} — {prettyDate(localDateKey(weekDates[6]))}</small></div><textarea value={note} onChange={event=>{setFocuses(current=>({...current,[weekKey]:event.target.value}));setSavedWeek("")}} placeholder="Например: закончить MVP и оставить пятницу без встреч"/><button type="button" disabled={!note.trim()} onClick={()=>{setSavedWeek(weekKey);notify("Фокус этой недели сохранён")}}>{focusSaved?"✓ Сохранено":"Сохранить фокус"}</button></section><div className="calendar-toolbar"><button type="button" onClick={()=>navigatePeriod(-1)} aria-label="Предыдущий период">←</button><strong>{periodLabel}</strong><button type="button" onClick={()=>navigatePeriod(1)} aria-label="Следующий период">→</button><button type="button" onClick={()=>setAnchorDate(new Date())}>Сегодня</button><div className="calendar-view-switch" aria-label="Режим календаря">{[["day","День"],["week","Неделя"],["month","Месяц"]].map(([value,label])=><button type="button" className={view===value?"active":""} onClick={()=>setView(value as CalendarView)} key={value}>{label}</button>)}</div><div className="calendar-legend"><span>● Планы</span><span>● Задачи</span></div></div>{view==="day"?renderTimeline([anchorDate],"day-calendar"):view==="week"?renderTimeline(weekDates,"week-calendar"):<section className="card month-calendar"><div className="month-calendar-inner"><div className="month-calendar-weekdays">{dayNames.map(day=><span key={day}>{day}</span>)}</div><div className="month-calendar-grid">{monthDates.map(date=>{const key=localDateKey(date);const items=schedule.filter(item=>item.date===key).sort((a,b)=>a.time.localeCompare(b.time));return <div data-calendar-date={key} className={`month-calendar-day ${date.getMonth()!==anchorDate.getMonth()?"outside":""} ${key===localDateKey(new Date())?"today":""}`} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const taskId=Number(event.dataTransfer.getData("text/nexus-task"));if(taskId)moveTask(taskId,key)}} key={key}><strong>{date.getDate()}</strong><div>{items.slice(0,3).map(item=><div draggable={item.type==="task"} onDragStart={event=>taskDrag(event,item)} onPointerDown={event=>startTouchDrag(event,item)} onPointerUp={finishTouchDrag} onPointerCancel={()=>setTouchDraggingTaskId(null)} className={`month-calendar-item ${item.type} ${item.done?"completed":""} ${touchDraggingTaskId===item.id?"touch-dragging":""}`} key={item.key}><small>{item.time}</small><span>{item.title}</span></div>)}{items.length>3&&<small className="month-more">ещё {items.length-3}</small>}</div></div>})}</div></div></section>}<section className="card upcoming-plans"><CardHead title="Ближайшие планы и задачи" subtitle={`${upcoming.length} впереди`} action="Добавить план" onClick={onNew}/>{upcoming.slice(0,10).map(item=><div className={item.type==="task"?"upcoming-task":""} key={item.key}><span>{new Date(`${item.date}T12:00`).toLocaleDateString("ru-RU",{day:"numeric",month:"short",weekday:"short"})}</span><strong>{item.time}</strong><div><b>{item.title}</b><small>{item.note}</small></div><button type="button" aria-label={item.type==="task"?"Выполнить задачу":"Удалить план"} onClick={()=>item.type==="task"?setTasks(current=>current.map(task=>task.id===item.id?{...task,done:true}:task)):setEvents(current=>current.filter(event=>event.id!==item.id))}>{item.type==="task"?"✓":"×"}</button></div>)}</section></>;
}

function JournalPage({entries,setEntries,notify}:{entries:JournalEntry[];setEntries:React.Dispatch<React.SetStateAction<JournalEntry[]>>;notify:(s:string)=>void}){
  const[text,setText]=useState("");const[mood,setMood]=useState(4);const[step,setStep]=useState(1);const[answers,setAnswers]=useState<string[]>([]);const[selected,setSelected]=useState<JournalEntry|null>(null);const prompts=["Что сегодня получилось хорошо?","Что можно было сделать иначе?","За что ты благодарен сегодня?","Какой главный фокус на завтра?"];
  function next(){if(!text.trim())return;const nextAnswers=[...answers,text.trim()];if(step<4){setAnswers(nextAnswers);setStep(v=>v+1);setText("")}else{const entry={id:newEntityId(),date:new Date().toISOString(),mood,answers:nextAnswers};setEntries(v=>[entry,...v]);setSelected(entry);setAnswers([]);setStep(1);setText("");notify("Вечерний разбор сохранён")}}
  return <><PageTitle eyebrow="РЕФЛЕКСИЯ" title="Вечерний разбор" text="Все четыре ответа сохраняются в истории."/><div className="journal-layout"><section className="card journal-form"><span className="step-label">0{step} / 04</span><h2>{prompts[step-1]}</h2><p>Даже маленькие наблюдения помогают видеть движение.</p><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Напиши несколько честных строк..."/><div className="mood-row"><span>Энергия дня</span>{[1,2,3,4,5].map(x=><button type="button" onClick={()=>setMood(x)} className={mood===x?"active":""} key={x}>{x}</button>)}</div><button type="button" className="primary" onClick={next}>{step===4?"Завершить и сохранить":"Продолжить →"}</button></section><aside className="card journal-history"><CardHead title="История записей" subtitle={`${entries.length} записей`}/>{entries.length?entries.map(entry=><button type="button" className={selected?.id===entry.id?"selected":""} onClick={()=>setSelected(entry)} key={entry.id}><span>{new Date(entry.date).toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})}</span><strong>{entry.answers[0]}</strong></button>):<p className="empty-copy">Завершите первый вечерний разбор.</p>}</aside></div>{selected&&<section className="card journal-entry"><div><span className="eyebrow">СОХРАНЁННАЯ ЗАПИСЬ</span><h3>{new Date(selected.date).toLocaleString("ru-RU")}</h3><small>Энергия: {selected.mood}/5</small></div>{selected.answers.map((answer,i)=><div key={i}><strong>{prompts[i]}</strong><p>{answer}</p></div>)}</section>}</>;
}

function SettingsPage({byok,setByok,notify,theme,setTheme,lifeAreas,setLifeAreas,profile,setProfile}:{byok:string;setByok:(s:string)=>void;notify:(s:string)=>void;theme:Theme;setTheme:(theme:Theme)=>void;lifeAreas:LifeArea[];setLifeAreas:React.Dispatch<React.SetStateAction<LifeArea[]>>;profile:UserProfile;setProfile:React.Dispatch<React.SetStateAction<UserProfile>>}){
  const[tab,setTab]=useState("AI-ассистент");function save(){localStorage.setItem("nexus-byok",byok);notify("Настройки сохранены")}
  return <><PageTitle eyebrow="СИСТЕМА" title="Настройки" text="Персонализируйте NEXUS OS под свой ритм."/><div className="settings-layout"><aside className="settings-nav">{[["✦","AI-ассистент"],["◎","Сферы жизни"],["◐","Внешний вид"],["◉","Профиль"],["♢","Уведомления"],["⇄","Данные"]].map(x=><button type="button" className={tab===x[1]?"active":""} onClick={()=>setTab(x[1])} key={x[1]}>{x[0]} {x[1]}</button>)}</aside><section className="card settings-card">{tab==="AI-ассистент"?<><div className="settings-title"><span className="ai-orb">✦</span><div><h2>NEXUS AI</h2><p>Выполняет понятные команды сразу, без подтверждений.</p></div></div><div className="secure-option"><div><strong>Рекомендуемый режим · серверный ключ</strong><p>Добавьте <code>OPENAI_API_KEY</code> в Vercel. Ключ остаётся на сервере.</p></div><span>БЕЗОПАСНО</span></div><div className="warning"><b>!</b><p><strong>BYOK менее безопасен</strong>Ключ хранится только в этом браузере.</p></div><div className="setting-field"><label>Личный OpenAI API key</label><div className="key-input"><input type="password" value={byok} onChange={e=>setByok(e.target.value)} placeholder="sk-proj-••••••••"/><button type="button" onClick={()=>setByok("")}>Очистить</button></div></div><button type="button" className="primary" onClick={save}>Сохранить</button></>:tab==="Внешний вид"?<ThemeSettings theme={theme} setTheme={setTheme} notify={notify}/>:tab==="Сферы жизни"?<LifeAreasSettings areas={lifeAreas} setAreas={setLifeAreas} notify={notify}/>:tab==="Профиль"?<ProfileSettings profile={profile} setProfile={setProfile} notify={notify}/>:<SettingsPlaceholder title={tab} text={tab==="Данные"?"Данные задач, привычек, финансов, фокус-сессий и журналов сохраняются в Supabase и резервной копии.":"Раздел настроек активен и готов к персонализации."} onClick={save}/>}</section></div></>;
}
function ProfileSettings({profile,setProfile,notify}:{profile:UserProfile;setProfile:React.Dispatch<React.SetStateAction<UserProfile>>;notify:(s:string)=>void}){return <div className="profile-settings"><span className="eyebrow">ЛИЧНЫЙ ПРОФИЛЬ</span><div className="profile-settings-head"><span>{(profile.name.trim()[0]||"А").toUpperCase()}</span><div><h2>{profile.name||"Ваше имя"}</h2><p>Имя и удобный размер текста сохраняются вместе с системой.</p></div></div><label className="setting-field"><span>Как к вам обращаться</span><input value={profile.name} maxLength={32} onChange={event=>setProfile(current=>({...current,name:event.target.value}))} placeholder="Ваше имя"/></label><div className="text-scale-picker"><span>Размер текста</span><div>{([['normal','Обычный','Компактнее'],['large','Крупный','Удобно читать'],['extra','Максимум','Самый заметный']] as const).map(([value,title,hint])=><button type="button" className={profile.textScale===value?"selected":""} key={value} onClick={()=>setProfile(current=>({...current,textScale:value}))}><b>{title}</b><small>{hint}</small></button>)}</div></div><button type="button" className="primary" disabled={!profile.name.trim()} onClick={()=>{setProfile(current=>({...current,name:current.name.trim()}));notify("Профиль сохранён в облаке")}}>Сохранить профиль</button></div>}
function SettingsPlaceholder({title,text,onClick}:{title:string;text:string;onClick:()=>void}){return <div className="settings-placeholder"><span className="eyebrow">НАСТРОЙКИ</span><h2>{title}</h2><p>{text}</p><div className="setting-field"><label>Статус</label><input value="Активно" readOnly/></div><button type="button" className="primary" onClick={onClick}>Сохранить</button></div>}

function FocusMode({task,sessions,onClose,onFinish}:{task:Task|null;sessions:FocusSession[];onClose:()=>void;onFinish:(minutes:number,complete:boolean)=>void}){
  const[duration,setDuration]=useState(Math.min(90,Math.max(15,task?.duration||25)));const[remaining,setRemaining]=useState(duration*60);const[running,setRunning]=useState(false);
  useEffect(()=>{setRemaining(duration*60);setRunning(false)},[duration]);
  useEffect(()=>{if(!running||remaining<=0)return;const timer=window.setInterval(()=>setRemaining(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer)},[running,remaining]);
  useEffect(()=>{if(remaining===0)setRunning(false)},[remaining]);
  if(!task)return null;const elapsed=duration*60-remaining;const minutes=Math.max(1,Math.ceil(elapsed/60));const progress=Math.round(elapsed/(duration*60)*100);const today=localDateKey(new Date());const todayMinutes=sessions.filter(session=>session.endedAt.slice(0,10)===today).reduce((sum,session)=>sum+session.minutes,0);const time=`${String(Math.floor(remaining/60)).padStart(2,"0")}:${String(remaining%60).padStart(2,"0")}`;
  return <div className="focus-mode-wrap"><section className="focus-mode"><header><div><span className="eyebrow">NEXUS · ГЛУБОКИЙ ФОКУС</span><small>Сегодня уже {todayMinutes} мин</small></div><button type="button" onClick={onClose}>×</button></header><div className="focus-timer" style={{"--focus-progress":`${progress*3.6}deg`} as React.CSSProperties}><div><strong>{time}</strong><span>{running?"Сосредоточьтесь на одном действии":remaining===0?"Сессия завершена":"Готовы начать"}</span></div></div><div className="focus-task-copy"><small>ТЕКУЩАЯ ЗАДАЧА</small><h2>{task.title}</h2><p>{task.area} · {task.duration||30} мин · {contextLabel[task.context||"anywhere"]}</p></div><div className="focus-presets">{[15,25,45,60].map(value=><button type="button" disabled={elapsed>0} className={duration===value?"active":""} onClick={()=>setDuration(value)} key={value}>{value} мин</button>)}</div><div className="focus-controls"><button type="button" className="focus-primary" onClick={()=>setRunning(value=>!value)}>{running?"Пауза":"▶ Начать"}</button><button type="button" disabled={elapsed===0} onClick={()=>onFinish(minutes,false)}>Сохранить сессию</button><button type="button" disabled={elapsed===0} onClick={()=>onFinish(minutes,true)}>✓ Завершить задачу</button></div><p className="focus-tip">NEXUS сохранит время и начислит 10 XP после завершения сессии.</p></section></div>
}

function CommandMenu({tasks,projects,goals,onClose,onNavigate,onCreate,onOpenTask}:{tasks:Task[];projects:Project[];goals:Goal[];onClose:()=>void;onNavigate:(section:Section)=>void;onCreate:(kind:Exclude<ModalKind,null>)=>void;onOpenTask:(task:Task)=>void}){
  const[query,setQuery]=useState("");
  const normalized=query.trim().toLowerCase();
  const createActions:{icon:string;title:string;hint:string;run:()=>void}[]=[
    {icon:"＋",title:"Новая задача",hint:"Создать действие",run:()=>onCreate("task")},
    {icon:"◎",title:"Новая цель",hint:"Добавить уровень результата",run:()=>onCreate("goal")},
    {icon:"▦",title:"Новый проект",hint:"Создать результат PARA",run:()=>onCreate("project")},
    {icon:"□",title:"Новый план",hint:"Поставить в календарь",run:()=>onCreate("event")},
    {icon:"₪",title:"Новая операция",hint:"Добавить доход или расход",run:()=>onCreate("transaction")},
    {icon:"✦",title:"Умный день",hint:"Открыть главную",run:()=>onNavigate("Обзор")},
  ];
  const foundTasks=tasks.filter(task=>!normalized||task.title.toLowerCase().includes(normalized)).slice(0,5).map(task=>({icon:"✓",title:task.title,hint:`Задача · ${task.area}`,run:()=>onOpenTask(task)}));
  const foundProjects=projects.filter(project=>normalized&&project.name.toLowerCase().includes(normalized)).slice(0,3).map(project=>({icon:"▦",title:project.name,hint:`Проект · ${project.area}`,run:()=>onNavigate("Проекты" as Section)}));
  const foundGoals=goals.filter(goal=>normalized&&goal.title.toLowerCase().includes(normalized)).slice(0,3).map(goal=>({icon:"◎",title:goal.title,hint:`${goal.period} · цель`,run:()=>onNavigate("Цели" as Section)}));
  const actions=normalized?[...foundTasks,...foundProjects,...foundGoals]:createActions;
  return <div className="command-wrap" onMouseDown={onClose}><section className="command-menu" onMouseDown={event=>event.stopPropagation()}><div className="command-search"><span>⌕</span><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&actions[0])actions[0].run()}} placeholder="Найти задачу, цель или выполнить команду…"/><kbd>esc</kbd></div><div className="command-results"><small>{normalized?"РЕЗУЛЬТАТЫ":"БЫСТРЫЕ ДЕЙСТВИЯ"}</small>{actions.map((action,index)=><button type="button" key={`${action.title}-${index}`} onClick={action.run}><span>{action.icon}</span><div><strong>{action.title}</strong><small>{action.hint}</small></div>{index===0&&<kbd>↵</kbd>}</button>)}{!actions.length&&<p>Ничего не найдено. Нажмите «Новая задача», чтобы сохранить мысль.</p>}</div><footer><span>↑↓ выбрать</span><span>↵ открыть</span><span>⌘K в любом разделе</span></footer></section></div>;
}

function NotificationCenter({items,onClose,onOpen}:{items:NexusNotification[];onClose:()=>void;onOpen:(section:Section)=>void}){
  return <div className="notification-scrim" onMouseDown={onClose}><aside className="notification-center" onMouseDown={event=>event.stopPropagation()}><header><div><span className="eyebrow">NEXUS · СИГНАЛЫ</span><h2>Центр уведомлений</h2><p>Только то, что требует внимания сейчас.</p></div><button type="button" onClick={onClose}>×</button></header><div className="notification-list">{items.map(item=><article className={item.tone||"info"} key={item.id}><span>{item.icon}</span><div><strong>{item.title}</strong><p>{item.text}</p></div><button type="button" onClick={()=>onOpen(item.section)}>{item.action} →</button></article>)}</div><footer><span>Уведомления формируются автоматически из задач, календаря, привычек, финансов и PARA.</span></footer></aside></div>
}

function QuickAddMenu({onClose,onChoose,onInbox}:{onClose:()=>void;onChoose:(kind:Exclude<ModalKind,null>)=>void;onInbox:(title:string)=>void}){
  const[note,setNote]=useState("");
  const items:{kind:Exclude<ModalKind,null>;icon:string;title:string;hint:string}[]=[
    {kind:"task",icon:"✓",title:"Задача",hint:"Действие и срок"},{kind:"project",icon:"▦",title:"Проект",hint:"Результат из нескольких шагов"},{kind:"goal",icon:"◎",title:"Цель",hint:"Направление и критерий успеха"},{kind:"habit",icon:"↗",title:"Привычка",hint:"Регулярное действие"},{kind:"transaction",icon:"₪",title:"Доход или расход",hint:"Финансовая операция"},{kind:"event",icon:"□",title:"План",hint:"Дата и время"},{kind:"health",icon:"＋",title:"Здоровье",hint:"Метрика или показатель"},
  ];
  function submit(event:FormEvent){event.preventDefault();if(note.trim())onInbox(note.trim())}
  return <div className="modal-wrap quick-hub-wrap" onMouseDown={onClose}><section className="quick-modal quick-hub" onMouseDown={event=>event.stopPropagation()}><div><span className="eyebrow">NEXUS · БЫСТРОЕ ДОБАВЛЕНИЕ</span><button type="button" onClick={onClose}>×</button></div><h2>Что добавить?</h2><p>Одно место для любых записей в системе.</p><div className="quick-hub-grid">{items.map(item=><button type="button" key={item.kind} onClick={()=>onChoose(item.kind)}><span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.hint}</small></div><b>›</b></button>)}</div><form className="quick-inbox" onSubmit={submit}><label><span>БЫСТРАЯ МЫСЛЬ ВО «ВХОДЯЩИЕ»</span><input value={note} onChange={event=>setNote(event.target.value)} placeholder="Запишите мысль, разберёте позже"/></label><button type="submit" disabled={!note.trim()}>Добавить</button></form></section></div>
}

function AuthPanel({userName,session,syncStatus,syncError,lastSyncedAt,onSession,onSignOut,onSync,onBackup,onRestore,onClose}:{userName:string;session:PinSession|null;syncStatus:SyncStatus;syncError:string;lastSyncedAt:string;onSession:(session:PinSession)=>void;onSignOut:()=>void;onSync:()=>void;onBackup:()=>void;onRestore:(file:File)=>void;onClose:()=>void}){
  const[pin,setPin]=useState("");const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
  async function submit(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setMessage("");try{const next=await signInWithPin(pin);onSession(next);setMessage("Готово. Загружаю вашу систему…")}catch(error){setMessage(error instanceof Error?error.message:"Не удалось выполнить вход")}finally{setBusy(false)}}
  return <div className="modal-wrap auth-wrap" onMouseDown={onClose}><section className="quick-modal auth-panel pin-panel" onMouseDown={event=>event.stopPropagation()}><div><span className="eyebrow">NEXUS · ЛИЧНЫЙ ДОСТУП</span>{session&&<button type="button" onClick={onClose}>×</button>}</div>{session?<><div className="auth-user"><span>{(userName.trim()[0]||"А").toUpperCase()}</span><div><small>ЛИЧНАЯ СИСТЕМА</small><h2>{userName}</h2></div></div><div className={`cloud-status ${syncStatus}`}><span>{syncStatus==="synced"?"✓":syncStatus==="error"?"!":"↻"}</span><div><strong>{syncStatus==="synced"?"Все изменения сохранены":syncStatus==="error"?"Не удалось сохранить данные":"Синхронизация…"}</strong><small>{syncStatus==="error"&&syncError?syncError:lastSyncedAt?`Последнее сохранение ${new Date(lastSyncedAt).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}`:"Загружаем данные из Supabase"}</small></div></div><div className="cloud-policy"><strong>Одна система на всех устройствах</strong><p>После входа задачи, проекты, привычки, финансы и журнал автоматически загружаются и сохраняются в вашей личной записи.</p></div><div className="cloud-actions"><button type="button" onClick={onSync} disabled={syncStatus==="syncing"||syncStatus==="loading"}>↻ {syncStatus==="syncing"?"Сохраняю…":"Синхронизировать сейчас"}</button><button type="button" onClick={onBackup}>↓ Скачать резервную копию</button><label>↑ Восстановить из файла<input type="file" accept="application/json,.json" onChange={event=>{const file=event.target.files?.[0];if(file)onRestore(file);event.currentTarget.value=""}}/></label></div><button type="button" className="auth-signout" onClick={onSignOut}>Заблокировать систему</button></>:<><div className="auth-cloud-icon pin-lock">●</div><h2>Введите PIN-код</h2><p>Без почты, регистрации и лишних шагов. Один PIN открывает вашу личную систему.</p><form onSubmit={submit}><label className="modal-field pin-field"><span>PIN-код</span><input autoFocus type="password" inputMode="numeric" pattern="[0-9]*" minLength={4} maxLength={12} required autoComplete="current-password" value={pin} onChange={event=>setPin(event.target.value.replace(/\D/g,""))} placeholder="••••••"/></label>{message&&<p className="auth-message">{message}</p>}<button type="submit" className="primary modal-submit" disabled={busy||pin.length<4}>{busy?"Проверяю…":"Открыть NEXUS"}</button></form><small className="auth-note">PIN проверяется на сервере. Закрытый ключ базы данных никогда не передаётся в браузер.</small></>}</section></div>
}

function ThemeSettings({theme,setTheme,notify}:{theme:Theme;setTheme:(theme:Theme)=>void;notify:(s:string)=>void}){return <div><span className="eyebrow">ВНЕШНИЙ ВИД</span><h2>Тема интерфейса</h2><p className="settings-copy">Выбор применяется сразу и сохраняется на этом устройстве.</p><div className="theme-grid"><button type="button" className={theme==="lime"?"selected":""} onClick={()=>{setTheme("lime");notify("Тема «Фокус» включена")}}><span className="theme-preview lime-preview"><i/><i/><i/></span><strong>Фокус</strong><small>Графит и лаймовый акцент</small></button><button type="button" className={theme==="orbit"?"selected":""} onClick={()=>{setTheme("orbit");notify("Тема «Орбита» включена")}}><span className="theme-preview orbit-preview"><i/><i/><i/></span><strong>Орбита</strong><small>Премиальный чёрный и фиолетовый</small></button><button type="button" className={theme==="light"?"selected":""} onClick={()=>{setTheme("light");notify("Светлая тема iOS включена")}}><span className="theme-preview light-preview"><i/><i/><i/></span><strong>Светлая iOS</strong><small>Молочное стекло и системный синий</small></button></div></div>}

function LifeAreasSettings({areas,setAreas,notify}:{areas:LifeArea[];setAreas:React.Dispatch<React.SetStateAction<LifeArea[]>>;notify:(s:string)=>void}){const[name,setName]=useState("");const[icon,setIcon]=useState("✨");return <div><span className="eyebrow">КОМПАС ЖИЗНИ</span><h2>Сферы жизни</h2><p className="settings-copy">Эти кнопки используются в задачах, проектах, целях и привычках.</p><div className="area-editor">{areas.map(area=><div key={area.id}><input aria-label="Иконка сферы" value={area.icon} onChange={e=>setAreas(v=>v.map(a=>a.id===area.id?{...a,icon:e.target.value}:a))}/><input aria-label="Название сферы" value={area.name} onChange={e=>setAreas(v=>v.map(a=>a.id===area.id?{...a,name:e.target.value}:a))}/><input aria-label="Цвет сферы" type="color" value={area.color} onChange={e=>setAreas(v=>v.map(a=>a.id===area.id?{...a,color:e.target.value}:a))}/><button type="button" disabled={areas.length<=1} onClick={()=>setAreas(v=>v.filter(a=>a.id!==area.id))}>×</button></div>)}</div><div className="area-add"><input value={icon} onChange={e=>setIcon(e.target.value)} aria-label="Иконка новой сферы"/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Новая сфера"/><button type="button" onClick={()=>{if(!name.trim())return;setAreas(v=>[...v,{id:newEntityId(),name:name.trim(),icon:icon||"✨",color:"#9f7aea"}]);setName("");notify("Сфера добавлена")}}>＋ Добавить</button></div></div>}

function FinanceCategoriesModal({categories,setCategories,onClose}:{categories:FinanceCategory[];setCategories:React.Dispatch<React.SetStateAction<FinanceCategory[]>>;onClose:()=>void}){const[name,setName]=useState("");const[icon,setIcon]=useState("✨");return <div className="modal-wrap" onMouseDown={onClose}><div className="quick-modal category-modal" onMouseDown={e=>e.stopPropagation()}><div><span className="eyebrow">ФИНАНСЫ · КАТЕГОРИИ</span><button type="button" onClick={onClose}>×</button></div><h2>Категории операций</h2><div className="category-editor">{categories.map(category=><div key={category.id}><input aria-label="Иконка категории" value={category.icon} onChange={e=>setCategories(v=>v.map(c=>c.id===category.id?{...c,icon:e.target.value}:c))}/><input aria-label="Название категории" value={category.name} onChange={e=>setCategories(v=>v.map(c=>c.id===category.id?{...c,name:e.target.value}:c))}/><button type="button" onClick={()=>setCategories(v=>v.filter(c=>c.id!==category.id))}>×</button></div>)}</div><div className="category-add"><input value={icon} onChange={e=>setIcon(e.target.value)} aria-label="Иконка новой категории"/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Новая категория"/><button type="button" onClick={()=>{if(!name.trim())return;setCategories(v=>[...v,{id:newEntityId(),name:name.trim(),icon:icon||"✨"}]);setName("")}}>＋</button></div><button type="button" className="primary modal-submit" onClick={onClose}>Готово</button></div></div>}

function BudgetModal({categories,lines,setLines,onClose}:{categories:FinanceCategory[];lines:BudgetLine[];setLines:React.Dispatch<React.SetStateAction<BudgetLine[]>>;onClose:()=>void}){const[values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(categories.map(category=>[category.name,String(lines.find(line=>line.category===category.name)?.limit||0)])));const total=Object.values(values).reduce((sum,value)=>sum+(Number(value)||0),0);function save(){setLines(categories.map(category=>({id:lines.find(line=>line.category===category.name)?.id||newEntityId(),category:category.name,limit:Math.max(0,Number(values[category.name])||0)})));onClose()}return <div className="modal-wrap" onMouseDown={onClose}><div className="quick-modal budget-modal" onMouseDown={event=>event.stopPropagation()}><div><span className="eyebrow">ФИНАНСЫ · БЮДЖЕТ</span><button type="button" onClick={onClose}>×</button></div><h2>План расходов на месяц</h2><p>Укажите лимит для каждой категории. Факт будет считаться автоматически по операциям.</p><div className="budget-total"><small>ОБЩИЙ БЮДЖЕТ</small><strong>{formatIls(total)}</strong></div><div className="budget-editor">{categories.map(category=><label key={category.id}><span>{category.icon}</span><strong>{category.name}</strong><div><input type="number" min="0" step="10" value={values[category.name]||""} onChange={event=>setValues(current=>({...current,[category.name]:event.target.value}))}/><i>₪</i></div></label>)}</div><button type="button" className="primary modal-submit" onClick={save}>Сохранить бюджет</button></div></div>}

function RecurringExpenseModal({accounts,categories,initial,onClose,onSave}:{accounts:Account[];categories:FinanceCategory[];initial:RecurringExpense|null;onClose:()=>void;onSave:(draft:Omit<RecurringExpense,"id">)=>void}){const[title,setTitle]=useState(initial?.title||"");const[amount,setAmount]=useState(String(initial?.amount||""));const[accountId,setAccountId]=useState(String(initial?.accountId||accounts.find(account=>account.type==="debit")?.id||accounts[0]?.id||""));const[category,setCategory]=useState(initial?.category||categories[0]?.name||"Другое");const[day,setDay]=useState(String(initial?.dayOfMonth||1));const[active,setActive]=useState(initial?.active??true);function submit(event:FormEvent){event.preventDefault();if(!title.trim()||!Number(amount))return;onSave({title:title.trim(),amount:Number(amount),accountId:Number(accountId),category,dayOfMonth:Math.max(1,Math.min(31,Number(day)||1)),active})}return <div className="modal-wrap" onMouseDown={onClose}><form className="quick-modal recurring-modal" onSubmit={submit} onMouseDown={event=>event.stopPropagation()}><div><span className="eyebrow">ФИНАНСЫ · АВТОСПИСАНИЕ</span><button type="button" onClick={onClose}>×</button></div><h2>{initial?"Изменить постоянный расход":"Новый постоянный расход"}</h2><label className="modal-field"><span>Название</span><input required value={title} onChange={event=>setTitle(event.target.value)} placeholder="Например, аренда квартиры"/></label><div className="modal-grid"><label className="modal-field"><span>Сумма, ₪</span><input required type="number" min="0.01" step="0.01" value={amount} onChange={event=>setAmount(event.target.value)}/></label><label className="modal-field"><span>День списания</span><input required type="number" min="1" max="31" value={day} onChange={event=>setDay(event.target.value)}/></label><label className="modal-field"><span>Счёт</span><select value={accountId} onChange={event=>setAccountId(event.target.value)}>{accounts.map(account=><option value={account.id} key={account.id}>{account.name} · {formatIls(account.balance)}</option>)}</select></label><label className="modal-field"><span>Категория</span><select value={category} onChange={event=>setCategory(event.target.value)}>{categories.map(item=><option value={item.name} key={item.id}>{item.icon} {item.name}</option>)}</select></label></div><label className="recurring-active"><input type="checkbox" checked={active} onChange={event=>setActive(event.target.checked)}/><span><strong>Автосписание активно</strong><small>Операция будет создана один раз в месяц</small></span></label><button type="submit" className="primary modal-submit">{initial?"Сохранить изменения":"Добавить постоянный расход"}</button></form></div>}

function AreaPicker({areas,value,onChange}:{areas:LifeArea[];value:string;onChange:(value:string)=>void}){return <div className="area-picker span-2"><span>Сфера жизни · выбрано: <b>{value}</b></span><div>{areas.map(area=><button type="button" aria-pressed={value===area.name} key={area.id} className={value===area.name?"selected":""} style={{"--area-color":area.color} as React.CSSProperties} onClick={()=>onChange(area.name)}><i>{area.icon}</i><small>{area.name}</small>{value===area.name&&<em>✓</em>}</button>)}</div><input type="hidden" name="area" value={value}/></div>}

function FinanceOperationModal({accounts,categories,onClose,onCreate}:{accounts:Account[];categories:FinanceCategory[];onClose:()=>void;onCreate:(draft:Record<string,unknown>)=>void}){const[amount,setAmount]=useState("");const[kind,setKind]=useState<"expense"|"income">("expense");const[accountId,setAccountId]=useState(String(accounts[0]?.id||""));const[category,setCategory]=useState(categories[0]?.name||"Другое");const[comment,setComment]=useState("");const[installments,setInstallments]=useState("1");const selected=accounts.find(a=>a.id===Number(accountId));function key(value:string){if(value==="C")setAmount("");else if(value==="⌫")setAmount(v=>v.slice(0,-1));else if(value==="."&&!amount.includes("."))setAmount(v=>(v||"0")+".");else if(value!=="."&&amount.replace(".","").length<9)setAmount(v=>(v==="0"?"":v)+value)}function submit(e:FormEvent){e.preventDefault();if(!Number(amount))return;onCreate({amount:Number(amount),kind,accountId,category:kind==="income"?"Доход":category,comment,installments,date:localDateKey(new Date())})}return <div className="modal-wrap" onMouseDown={onClose}><form className="quick-modal finance-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><div><span className="eyebrow">ФИНАНСЫ · НОВАЯ ОПЕРАЦИЯ</span><button type="button" onClick={onClose}>×</button></div><div className="finance-kind"><button type="button" className={kind==="expense"?"active":""} onClick={()=>setKind("expense")}>Расход</button><button type="button" className={kind==="income"?"active":""} onClick={()=>setKind("income")}>Доход</button></div><div className="amount-screen"><small>СУММА</small><strong>₪ {amount||"0"}</strong></div><div className="finance-entry-grid"><div className="number-pad">{["7","8","9","⌫","4","5","6","00","1","2","3",".","C","0"].map(value=><button type="button" key={value} onClick={()=>key(value)}>{value}</button>)}</div><div className="operation-fields"><label><span>Счёт</span><select value={accountId} onChange={e=>setAccountId(e.target.value)}>{accounts.map(account=><option value={account.id} key={account.id}>{account.name} · {formatIls(account.balance)}</option>)}</select></label>{selected?.type==="credit"&&kind==="expense"&&<label><span>Разбить покупку</span><select value={installments} onChange={e=>setInstallments(e.target.value)}>{Array.from({length:12},(_,index)=><option value={index+1} key={index}>{index+1} {index===0?"платёж":"платежей"}</option>)}</select></label>}<label><span>Комментарий · необязательно</span><input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Например: ужин с друзьями"/></label></div></div>{kind==="expense"?<div className="category-picker"><span>КАТЕГОРИЯ</span><div>{categories.map(item=><button type="button" key={item.id} className={category===item.name?"selected":""} onClick={()=>setCategory(item.name)}><i>{item.icon}</i><small>{item.name}</small></button>)}</div></div>:<input type="hidden" value="Доход"/>}<button type="submit" className="primary modal-submit" disabled={!Number(amount)}>Сохранить {kind==="expense"?"расход":"доход"}</button></form></div>}

async function coverFromFile(file:File){return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error("Не удалось прочитать файл"));reader.onload=()=>{const image=new Image();image.onload=()=>{const scale=Math.min(1,1200/image.width);const canvas=document.createElement("canvas");canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);const context=canvas.getContext("2d");if(!context)return reject(new Error("Не удалось обработать изображение"));context.drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.78))};image.onerror=()=>reject(new Error("Неверный формат изображения"));image.src=String(reader.result)};reader.readAsDataURL(file)})}

function CreateModal({kind,accounts,projects,goals,areas,categories,initialProjectId,initialHabit,initialTask,onClose,onCreate}:{kind:Exclude<ModalKind,null>;accounts:Account[];projects:Project[];goals:Goal[];areas:LifeArea[];categories:FinanceCategory[];initialProjectId:number|null;initialHabit:Habit|null;initialTask:Task|null;onClose:()=>void;onCreate:(draft:Record<string,unknown>)=>void}){
  const initialProject=projects.find(p=>p.id===initialProjectId);const[area,setArea]=useState(initialTask?.area||initialHabit?.area||initialProject?.area||areas[0]?.name||"Личное");const[cover,setCover]=useState("linear-gradient(135deg,#2c2455,#7c4dff 58%,#d565ff)");const titles:Record<Exclude<ModalKind,null>,string>={task:initialTask?"Редактировать задачу":"Новая задача",project:"Новый проект",goal:"Новая цель",habit:initialHabit?"Редактировать привычку":"Новая привычка",transaction:"Новая операция",account:"Новый счёт",transfer:"Перевод между счетами",health:"Метрика здоровья",event:"Новый план"};
  if(kind==="transaction")return <FinanceOperationModal accounts={accounts} categories={categories} onClose={onClose} onCreate={onCreate}/>;
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);onCreate({...Object.fromEntries(fd.entries()),area,cover})}
  return <div className="modal-wrap" onMouseDown={onClose}><form className="quick-modal entity-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><div><span className="eyebrow">NEXUS · СОЗДАНИЕ</span><button type="button" onClick={onClose}>×</button></div><h2>{titles[kind]}</h2>
    {!["transfer"].includes(kind)&&<Field label={kind==="health"?"Показатель":"Название"} name="title" placeholder="Введите название" defaultValue={initialTask?.title||initialHabit?.name}/>} 
    {["task","project","goal","habit"].includes(kind)&&<AreaPicker areas={areas} value={area} onChange={setArea}/>} 
    {kind==="task"&&<><div className="modal-grid"><SelectField label="Проект · необязательно" name="projectId" options={[["","Без проекта"],...projects.filter(p=>!p.archived).map(p=>[String(p.id),p.name])]} defaultValue={String(initialTask?.projectId||initialProjectId||"")}/><SelectField label="Цель · необязательно" name="goalId" options={[["","Без цели"],...goals.map(goal=>[String(goal.id),`${goal.period} · ${goal.title}`])]} defaultValue={String(initialTask?.goalId||"")}/><Field label="Дата" name="dueDate" type="date" placeholder="" required={false} defaultValue={initialTask?.dueDate}/><Field label="Время" name="time" type="time" placeholder="Сегодня" required={false} defaultValue={initialTask?.time}/><SelectField label="Приоритет" name="priority" options={[["medium","Средний"],["high","Высокий"],["low","Низкий"]]} defaultValue={initialTask?.priority||"medium"}/><SelectField label="Продолжительность" name="duration" options={[["15","15 минут"],["30","30 минут"],["45","45 минут"],["60","1 час"],["90","1,5 часа"],["120","2 часа"],["180","3 часа"]]} defaultValue={String(initialTask?.duration||30)}/><SelectField label="Энергия" name="energy" options={[["medium","Средняя"],["high","Высокая"],["low","Низкая"]]} defaultValue={initialTask?.energy||"medium"}/><SelectField label="Контекст" name="context" options={[["anywhere","Где угодно"],["computer","За компьютером"],["phone","Телефон"],["home","Дома"],["outside","Вне дома"]]} defaultValue={initialTask?.context||"anywhere"}/></div><Field label="Заметка / критерий готовности" name="notes" placeholder="Что именно нужно получить в результате" required={false} defaultValue={initialTask?.notes}/></>}
    {kind==="project"&&<><div className="cover-picker"><span>Обложка проекта</span><div className="cover-preview" style={projectCoverStyle(cover)}/><div className="cover-options">{["linear-gradient(135deg,#2c2455,#7c4dff 58%,#d565ff)","linear-gradient(135deg,#142c31,#198a78 58%,#6ee7b7)","linear-gradient(135deg,#332316,#d36a2e 55%,#ffb45e)"].map(item=><button type="button" key={item} style={{backgroundImage:item}} onClick={()=>setCover(item)} aria-label="Выбрать градиент"/>)}<label>＋ Фото<input type="file" accept="image/*" onChange={async e=>{const file=e.target.files?.[0];if(file)setCover(await coverFromFile(file))}}/></label></div></div><div className="modal-grid"><Field label="Срок" name="due" type="date" placeholder="" required={false}/><Field label="Следующий шаг" name="next" placeholder="Первое конкретное действие" required={false}/><div className="span-2"><Field label="Заметка / ожидаемый результат" name="notes" placeholder="Что должно измениться после завершения" required={false}/></div></div></>}
    {kind==="goal"&&<><div className="modal-grid"><SelectField label="Период" name="period" options={[["ГОД","Год"],["МЕСЯЦ","Месяц"],["НЕДЕЛЯ","Неделя"],["СЕГОДНЯ","Сегодня"],["КВАРТАЛ","Квартал"]]}/><SelectField label="Связать с целью уровнем выше" name="parentGoalId" options={[["","Не связывать"],...goals.map(goal=>[String(goal.id),`${goal.period} · ${goal.title}`])]}/><Field label="Дата" name="date" placeholder="Август / Эта неделя" required={false}/></div><Field label="Критерий результата" name="note" placeholder="Что будет считаться успехом" required={false}/></>}
    {kind==="habit"&&<Field label="Символ" name="icon" placeholder="✦" required={false} defaultValue={initialHabit?.icon}/>} 
    {kind==="transfer"&&<div className="modal-grid"><SelectField label="Откуда" name="fromAccountId" options={accounts.filter(a=>a.type!=="credit").map(a=>[String(a.id),`${a.name} · ${formatIls(a.balance)}`])}/><SelectField label="Куда" name="toAccountId" options={accounts.filter(a=>a.type!=="credit").map(a=>[String(a.id),`${a.name} · ${formatIls(a.balance)}`])}/><div className="span-2"><Field label="Сумма, ₪" name="amount" type="number" placeholder="500"/></div></div>}
    {kind==="account"&&<div className="modal-grid"><SelectField label="Тип счёта" name="accountType" options={[["cash","Наличные"],["debit","Банковский счёт"],["credit","Кредитная карта"]]}/><Field label="Начальный баланс, ₪" name="balance" type="number" placeholder="0"/><SelectField label="Счёт списания кредитки" name="linkedAccountId" options={accounts.filter(a=>a.type==="debit").map(a=>[String(a.id),a.name])}/><Field label="День списания" name="billingDay" type="number" placeholder="15" required={false}/></div>}
    {kind==="health"&&<Field label="Значение" name="value" placeholder="Например, 78,4 кг"/>}
    {kind==="event"&&<><div className="modal-grid"><Field label="Дата" name="date" type="date" placeholder="" defaultValue={localDateKey(new Date())}/><Field label="Время" name="time" type="time" placeholder="09:00" defaultValue="09:00"/><SelectField label="Цвет" name="tone" options={[["lime","Лайм"],["purple","Фиолетовый"],["orange","Оранжевый"]]}/></div><Field label="Заметка · необязательно" name="note" placeholder="Контекст, место или напоминание" required={false}/></>}
    <button className="primary modal-submit" type="submit">{initialHabit||initialTask?"Сохранить изменения":"Создать и сохранить"}</button></form></div>;
}

function Field({label,name,placeholder,type="text",required=true,defaultValue}:{label:string;name:string;placeholder:string;type?:string;required?:boolean;defaultValue?:string}){return <label className="modal-field"><span>{label}</span><input required={required} name={name} type={type} placeholder={placeholder} defaultValue={defaultValue}/></label>}
function SelectField({label,name,options,defaultValue}:{label:string;name:string;options:string[][];defaultValue?:string}){return <label className="modal-field"><span>{label}</span><select name={name} defaultValue={defaultValue}>{options.map(([value,label])=><option value={value} key={`${name}-${value}`}>{label}</option>)}</select></label>}
