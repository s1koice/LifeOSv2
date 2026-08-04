"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Section = "Обзор" | "Задачи" | "Цели" | "Проекты" | "Привычки" | "Финансы" | "Здоровье" | "Планирование" | "Журнал" | "Настройки";
type Priority = "high" | "medium" | "low";
type Task = { id: number; title: string; area: string; time: string; done: boolean; priority: Priority };
type Project = { id: number; name: string; area: string; progress: number; due: string; next: string };
type Goal = { id: number; period: string; date: string; title: string; note: string; progress: number };
type Habit = { id: number; name: string; icon: string; checks: Record<string, boolean>; weekStart: string };
type HabitHistory = { id: number; habitId: number; habitName: string; weekStart: string; completed: number; total: number; checks: Record<string, boolean> };
type AccountType = "cash" | "debit" | "credit";
type Account = { id: number; name: string; type: AccountType; balance: number; linkedAccountId?: number; billingDay?: number };
type FinanceKind = "income" | "expense" | "transfer" | "installment";
type Transaction = { id: number; title: string; category: string; amount: number; kind: FinanceKind; date: string; accountId: number; toAccountId?: number; parentId?: number; installmentIndex?: number; installmentCount?: number; dueDate?: string; posted?: boolean };
type CalendarEvent = { id: number; title: string; day: number; time: string; tone: "lime" | "purple" | "orange" };
type HealthNote = { id: number; kind: "note" | "metric"; title: string; value: string; date: string };
type JournalEntry = { id: number; date: string; mood: number; answers: string[] };
type ModalKind = "task" | "project" | "goal" | "habit" | "transaction" | "account" | "transfer" | "health" | "event" | null;
type AssistantAction = { type: string; payload: Record<string, unknown> };

const nav: { group: string; items: { label: Section; icon: string }[] }[] = [
  { group: "Пространство", items: [{ label: "Обзор", icon: "◈" }, { label: "Задачи", icon: "✓" }, { label: "Цели", icon: "◎" }, { label: "Проекты", icon: "▦" }] },
  { group: "Сферы жизни", items: [{ label: "Привычки", icon: "↗" }, { label: "Финансы", icon: "₪" }, { label: "Здоровье", icon: "+" }] },
  { group: "Рефлексия", items: [{ label: "Планирование", icon: "□" }, { label: "Журнал", icon: "✦" }, { label: "Настройки", icon: "⚙" }] },
];

const seedTasks: Task[] = [
  { id: 1, title: "Завершить структуру лендинга", area: "NEXUS OS", time: "10:00", done: false, priority: "high" },
  { id: 2, title: "Тренировка: спина и плечи", area: "Здоровье", time: "13:30", done: false, priority: "medium" },
  { id: 3, title: "Разобрать расходы за неделю", area: "Финансы", time: "17:00", done: false, priority: "low" },
  { id: 4, title: "Прочитать 20 страниц", area: "Развитие", time: "21:00", done: true, priority: "low" },
];

const seedProjects: Project[] = [
  { id: 1, name: "Запуск NEXUS OS", area: "Работа", progress: 68, due: "12 авг", next: "Собрать MVP dashboard" },
  { id: 2, name: "Финансовая подушка", area: "Финансы", progress: 42, due: "31 дек", next: "Настроить автоперевод" },
  { id: 3, name: "Полумарафон", area: "Здоровье", progress: 56, due: "21 сен", next: "Интервальная тренировка" },
];

const seedGoals: Goal[] = [
  { id: 1, period: "ГОД", date: "2026", title: "Создать устойчивую систему жизни", note: "Жить осознанно, свободно и с запасом энергии.", progress: 54 },
  { id: 2, period: "КВАРТАЛ", date: "Q3", title: "Запустить и внедрить NEXUS OS", note: "Единая система вместо разрозненных инструментов.", progress: 61 },
  { id: 3, period: "МЕСЯЦ", date: "Август", title: "Собрать рабочий MVP", note: "Dashboard, планирование и ежедневные ритуалы.", progress: 68 },
  { id: 4, period: "НЕДЕЛЯ", date: "Эта неделя", title: "Закрыть ключевые экраны", note: "Пять измеримых результатов.", progress: 60 },
  { id: 5, period: "СЕГОДНЯ", date: "Сегодня", title: "Закончить основу", note: "2 часа 30 минут глубокого фокуса.", progress: 32 },
];

const seedHabitNames = [
  { id: 1, name: "Стакан воды утром", icon: "◒" },
  { id: 2, name: "10 минут медитации", icon: "◌" },
  { id: 3, name: "Чтение · 20 страниц", icon: "▤" },
  { id: 4, name: "Без телефона после 22:30", icon: "☾" },
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

const areas = [
  { name: "Энергия", value: 82, color: "#c9ff4c" }, { name: "Здоровье", value: 74, color: "#57e0b7" },
  { name: "Финансы", value: 68, color: "#b8a6ff" }, { name: "Развитие", value: 61, color: "#ffb45e" },
  { name: "Отношения", value: 79, color: "#ff7895" },
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

function habitClock(now = new Date()) {
  const activeDay = new Date(now);
  if (activeDay.getDay() === 0 && activeDay.getHours() < 5) activeDay.setDate(activeDay.getDate() - 1);
  const start = new Date(activeDay);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(5, 0, 0, 0);
  const dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  return { weekStart: localDateKey(start), today: localDateKey(activeDay), dates };
}

function nextBillingDate(index: number) {
  const now = new Date();
  return localDateKey(new Date(now.getFullYear(), now.getMonth() + 1 + index, 15, 12));
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

function normalizeHabits(raw: unknown, storedHistory: HabitHistory[]) {
  const clock = habitClock();
  const source = Array.isArray(raw) && raw.length ? raw : seedHabitNames;
  const history = [...storedHistory];
  const habits: Habit[] = source.map((item, index) => {
    const old = item as Partial<Habit> & { done?: boolean };
    const checks = old.checks && typeof old.checks === "object" ? old.checks : old.done ? { [clock.today]: true } : {};
    const habit: Habit = { id: Number(old.id || index + 1), name: String(old.name || `Привычка ${index + 1}`), icon: String(old.icon || "✦"), checks, weekStart: String(old.weekStart || clock.weekStart) };
    if (habit.weekStart !== clock.weekStart) {
      if (!history.some(h => h.habitId === habit.id && h.weekStart === habit.weekStart)) history.push({ id: newEntityId() + index, habitId: habit.id, habitName: habit.name, weekStart: habit.weekStart, completed: Object.values(habit.checks).filter(Boolean).length, total: 7, checks: habit.checks });
      return { ...habit, checks: {}, weekStart: clock.weekStart };
    }
    return habit;
  });
  return { habits: uniqueEntityIds(habits), history: uniqueEntityIds(history) };
}

function Ring({ value, color, size = 70 }: { value: number; color: string; size?: number }) {
  return <div className="ring" style={{ width: size, height: size, background: `conic-gradient(${color} ${Math.max(0, Math.min(100, value)) * 3.6}deg, #262a30 0deg)` }}><div><strong>{value}</strong><small>%</small></div></div>;
}

function IconButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return <button type="button" className="icon-button" aria-label={label} onClick={onClick}>{children}</button>;
}

export default function Home() {
  const initialClock = habitClock();
  const [section, setSection] = useState<Section>("Обзор");
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [goals, setGoals] = useState<Goal[]>(seedGoals);
  const [habits, setHabits] = useState<Habit[]>(seedHabitNames.map(h => ({ ...h, checks: {}, weekStart: initialClock.weekStart })));
  const [habitHistory, setHabitHistory] = useState<HabitHistory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(seedAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [events, setEvents] = useState<CalendarEvent[]>(seedEvents);
  const [planningNote, setPlanningNote] = useState("");
  const [healthNotes, setHealthNotes] = useState<HealthNote[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([{ role: "assistant", text: "Скажите, что нужно сделать. Я сразу добавлю задачи, цели или проекты в NEXUS — без лишних вопросов." }]);
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [byok, setByok] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [, setClockTick] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(localStorage.getItem("nexus-state") || "{}");
        const storedHistory = Array.isArray(parsed.habitHistory) ? parsed.habitHistory : [];
        const normalized = normalizeHabits(parsed.habits, storedHistory);
        const financial = settleDueInstallments(uniqueEntityIds(Array.isArray(parsed.accounts) ? parsed.accounts : seedAccounts), uniqueEntityIds(Array.isArray(parsed.transactions) ? parsed.transactions : seedTransactions));
        if (Array.isArray(parsed.tasks)) setTasks(uniqueEntityIds(parsed.tasks));
        if (Array.isArray(parsed.projects)) setProjects(uniqueEntityIds(parsed.projects));
        if (Array.isArray(parsed.goals)) setGoals(uniqueEntityIds(parsed.goals));
        setHabits(normalized.habits); setHabitHistory(normalized.history);
        setAccounts(financial.accounts); setTransactions(financial.entries);
        if (Array.isArray(parsed.events)) setEvents(uniqueEntityIds(parsed.events));
        if (typeof parsed.planningNote === "string") setPlanningNote(parsed.planningNote);
        if (Array.isArray(parsed.healthNotes)) setHealthNotes(uniqueEntityIds(parsed.healthNotes));
        if (Array.isArray(parsed.journalEntries)) setJournalEntries(uniqueEntityIds(parsed.journalEntries));
      } catch { /* keep demo data */ }
      setByok(localStorage.getItem("nexus-byok") || "");
      const hashSection = decodeURIComponent(window.location.hash.slice(1)) as Section;
      if (nav.some(group => group.items.some(item => item.label === hashSection))) setSection(hashSection);
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("nexus-state", JSON.stringify({ tasks, projects, goals, habits, habitHistory, accounts, transactions, events, planningNote, healthNotes, journalEntries }));
  }, [loaded, tasks, projects, goals, habits, habitHistory, accounts, transactions, events, planningNote, healthNotes, journalEntries]);

  useEffect(() => {
    const onHash = () => { const next = decodeURIComponent(window.location.hash.slice(1)) as Section; if (nav.some(g => g.items.some(i => i.label === next))) setSection(next); };
    window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash);
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

  function navigate(next: Section) { setSection(next); window.history.pushState(null, "", `#${encodeURIComponent(next)}`); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function toggleTask(id: number) { setTasks(v => v.map(task => task.id === id ? { ...task, done: !task.done } : task)); }
  function toggleHabit(id: number, date: string) {
    if (date !== clock.today) return;
    setHabits(current => current.map(h => h.id === id ? { ...h, checks: { ...h.checks, [date]: !h.checks[date] } } : h));
  }

  function createFinanceOperation(draft: Record<string, unknown>) {
    const accountId = Number(draft.accountId); const amount = Number(draft.amount); const kind = String(draft.kind) as "income" | "expense";
    const account = accounts.find(a => a.id === accountId); if (!account || !amount) return;
    const id = newEntityId();
    const entry: Transaction = { id, title: String(draft.title), category: String(draft.category || "Другое"), amount, kind, date: localDateKey(new Date()), accountId, posted: true };
    if (kind === "income") {
      setAccounts(v => v.map(a => a.id === accountId ? { ...a, balance: a.balance + amount } : a)); setTransactions(v => [entry, ...v]); return;
    }
    setAccounts(v => v.map(a => a.id === accountId ? { ...a, balance: a.balance - amount } : a));
    if (account.type === "credit") {
      const count = Math.max(1, Number(draft.installments || 1)); const part = Math.round((amount / count) * 100) / 100;
      const schedule: Transaction[] = Array.from({ length: count }, (_, index) => ({ id: id + index + 1, title: `${draft.title} · платёж ${index + 1}/${count}`, category: String(draft.category || "Кредит"), amount: index === count - 1 ? Math.round((amount - part * (count - 1)) * 100) / 100 : part, kind: "installment", date: nextBillingDate(index), dueDate: nextBillingDate(index), accountId, parentId: id, installmentIndex: index + 1, installmentCount: count, posted: false }));
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
    if (kind === "task") setTasks(v => [...v, { id, title: String(draft.title), area: String(draft.area || "Личное"), time: String(draft.time || "Сегодня"), priority: (draft.priority || "medium") as Priority, done: false }]);
    if (kind === "project") setProjects(v => [...v, { id, name: String(draft.title), area: String(draft.area || "Личное"), progress: 0, due: String(draft.due || "Без срока"), next: String(draft.next || "Определить следующий шаг") }]);
    if (kind === "goal") setGoals(v => [...v, { id, period: String(draft.period || "МЕСЯЦ"), date: String(draft.date || "Сейчас"), title: String(draft.title), note: String(draft.note || "Новая цель"), progress: 0 }]);
    if (kind === "habit") setHabits(v => [...v, { id, name: String(draft.title), icon: String(draft.icon || "✦"), checks: {}, weekStart: clock.weekStart }]);
    if (kind === "transaction") createFinanceOperation(draft);
    if (kind === "transfer") createTransfer(draft);
    if (kind === "account") setAccounts(v => [...v, { id, name: String(draft.title), type: draft.accountType as AccountType, balance: Number(draft.balance || 0), linkedAccountId: Number(draft.linkedAccountId || 0) || undefined, billingDay: Number(draft.billingDay || 15) }]);
    if (kind === "health") setHealthNotes(v => [{ id, kind: "metric", title: String(draft.title), value: String(draft.value), date: new Date().toISOString() }, ...v]);
    if (kind === "event") setEvents(v => [...v, { id, title: String(draft.title), day: Number(draft.day), time: String(draft.time || "09:00"), tone: draft.tone as CalendarEvent["tone"] }]);
    notify("Сохранено в NEXUS OS"); setModalKind(null);
  }

  function applyAssistantActions(actions: AssistantAction[]) {
    let applied = 0;
    actions.forEach(({ type, payload }) => {
      if (type === "create_task") { setTasks(v => [...v, { id: newEntityId(), title: String(payload.title), area: String(payload.area || "Личное"), time: String(payload.time || "Сегодня"), priority: (payload.priority || "medium") as Priority, done: false }]); applied++; }
      if (type === "complete_task") { const query = String(payload.title || "").toLowerCase(); setTasks(v => v.map(t => t.title.toLowerCase().includes(query) ? { ...t, done: true } : t)); applied++; }
      if (type === "create_project") { setProjects(v => [...v, { id: newEntityId(), name: String(payload.name), area: String(payload.area || "Личное"), progress: 0, due: String(payload.due || "Без срока"), next: String(payload.next || "Определить следующий шаг") }]); applied++; }
      if (type === "create_goal") { setGoals(v => [...v, { id: newEntityId(), period: String(payload.period || "МЕСЯЦ"), date: String(payload.date || "Сейчас"), title: String(payload.title), note: String(payload.note || "Создано NEXUS AI"), progress: 0 }]); applied++; }
      if (type === "create_habit") { setHabits(v => [...v, { id: newEntityId(), name: String(payload.name), icon: "✦", checks: {}, weekStart: clock.weekStart }]); applied++; }
    });
    if (applied) notify(`NEXUS AI выполнил действий: ${applied}`);
    return applied;
  }

  async function askAssistant(e: FormEvent) {
    e.preventDefault(); if (!prompt.trim() || thinking) return;
    const text = prompt.trim(); setPrompt(""); setMessages(v => [...v, { role: "user", text }]); setThinking(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json", ...(byok ? { "x-nexus-byok": byok } : {}) }, body: JSON.stringify({ message: text, context: { tasks, projects, goals, habits: habits.map(h => ({ id: h.id, name: h.name, doneToday: !!h.checks[clock.today] })), section } }) });
      const data = await response.json(); const applied = applyAssistantActions(Array.isArray(data.actions) ? data.actions : []);
      setMessages(v => [...v, { role: "assistant", text: data.reply || (applied ? `Готово. Я применил ${applied} изменений.` : data.error || "Не удалось выполнить запрос.") }]);
    } catch { setMessages(v => [...v, { role: "assistant", text: "Не удалось связаться с AI. Проверьте серверный ключ в настройках." }]); }
    finally { setThinking(false); }
  }

  function content() {
    if (section === "Обзор") return <Dashboard tasks={tasks} habits={habits} projects={projects} taskCompletion={taskCompletion} habitCompletion={habitCompletion} today={clock.today} onToggleTask={toggleTask} onToggleHabit={toggleHabit} navigate={navigate}/>;
    if (section === "Задачи") return <TasksPage tasks={tasks} setTasks={setTasks} onNew={() => setModalKind("task")}/>;
    if (section === "Цели") return <GoalsPage goals={goals} setGoals={setGoals} onNew={() => setModalKind("goal")}/>;
    if (section === "Проекты") return <ProjectsPage projects={projects} setProjects={setProjects} onNew={() => setModalKind("project")}/>;
    if (section === "Привычки") return <HabitsPage habits={habits} history={habitHistory} clock={clock} onToggle={toggleHabit} onNew={() => setModalKind("habit")}/>;
    if (section === "Финансы") return <FinancePage accounts={accounts} setAccounts={setAccounts} transactions={transactions} setTransactions={setTransactions} onOperation={() => setModalKind("transaction")} onTransfer={() => setModalKind("transfer")} onAccount={() => setModalKind("account")}/>;
    if (section === "Здоровье") return <HealthPage notes={healthNotes} setNotes={setHealthNotes} onMetric={() => setModalKind("health")} notify={notify}/>;
    if (section === "Планирование") return <PlanningPage events={events} setEvents={setEvents} note={planningNote} setNote={setPlanningNote} onNew={() => setModalKind("event")} notify={notify}/>;
    if (section === "Журнал") return <JournalPage entries={journalEntries} setEntries={setJournalEntries} notify={notify}/>;
    return <SettingsPage byok={byok} setByok={setByok} notify={notify}/>;
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}><div className="brand"><span className="brand-mark">N</span><div><strong>NEXUS</strong><small>PERSONAL OS</small></div><button type="button" className="mobile-close" onClick={() => setMobileNav(false)}>×</button></div><nav>{nav.map(group => <div className="nav-group" key={group.group}><p>{group.group}</p>{group.items.map(item => <button type="button" key={item.label} className={section === item.label ? "active" : ""} onClick={() => { navigate(item.label); setMobileNav(false); }}><span>{item.icon}</span>{item.label}{item.label === "Задачи" && <em>{tasks.filter(t => !t.done).length}</em>}</button>)}</div>)}</nav><div className="sidebar-foot"><div className="level"><div className="level-top"><span>Уровень 12</span><b>2 840 XP</b></div><div className="mini-track"><i style={{ width: "72%" }}/></div><small>160 XP до нового уровня</small></div><div className="profile"><div className="avatar">А</div><div><strong>Алексей</strong><small>В продуктивном режиме</small></div><span className="online"/></div></div></aside>
    {mobileNav && <button type="button" className="scrim" onClick={() => setMobileNav(false)} aria-label="Закрыть меню"/>}
    <main className="main"><header><button type="button" className="menu-button" onClick={() => setMobileNav(true)}>☰</button><div className="breadcrumbs"><span>МОЯ СИСТЕМА</span><b>/</b><strong>{section.toUpperCase()}</strong></div><div className="top-actions"><div className="search">⌕ <input aria-label="Поиск" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && search.trim()) { const task = tasks.find(t => t.title.toLowerCase().includes(search.toLowerCase())); const project = projects.find(p => p.name.toLowerCase().includes(search.toLowerCase())); if (task) { navigate("Задачи"); notify(`Найдена задача: ${task.title}`); } else if (project) { navigate("Проекты"); notify(`Найден проект: ${project.name}`); } else notify("Ничего не найдено"); setSearch(""); } }} placeholder="Найти что угодно..."/><kbd>↵</kbd></div><IconButton label="Уведомления" onClick={() => notify("Новых уведомлений нет")}>♢<i/></IconButton><button type="button" className="assistant-mini" onClick={() => setAssistantOpen(true)}><span>✦</span> Спросить NEXUS</button></div></header><div className="page">{content()}</div></main>
    <button type="button" className="ai-fab" onClick={() => setAssistantOpen(true)} aria-label="Открыть AI-ассистента"><span>✦</span><i/></button>
    {modalKind && <CreateModal kind={modalKind} accounts={accounts} onClose={() => setModalKind(null)} onCreate={draft => handleCreate(modalKind, draft)}/>} 
    {assistantOpen && <aside className="assistant-panel"><div className="assistant-head"><div><span className="ai-orb">✦</span><div><strong>NEXUS AI</strong><small><i/> выполняет действия сразу</small></div></div><button type="button" onClick={() => setAssistantOpen(false)}>×</button></div><div className="assistant-context"><span>Сейчас вижу</span><b>{tasks.filter(t => !t.done).length} задач · {habits.filter(h => h.checks[clock.today]).length}/{habits.length} привычек · {section}</b></div><div className="messages">{messages.map((m, i) => <div key={i} className={`message ${m.role}`}>{m.text}</div>)}{thinking && <div className="message assistant typing">Выполняю…</div>}</div><div className="suggestions"><button type="button" onClick={() => setPrompt("Добавь задачу: подготовить план на завтра")}>Добавить задачу</button><button type="button" onClick={() => setPrompt("Разбери мой день и сразу добавь 3 приоритетные задачи")}>Спланировать день</button></div><form className="assistant-form" onSubmit={askAssistant}><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Например: добавь задачи купить продукты и позвонить врачу"/><button type="submit">↑</button></form><small className="ai-note">NEXUS применяет изменения сразу — всё можно поправить в соответствующем разделе</small></aside>}
    {toast && <div className="toast">✓ {toast}</div>}
    <button type="button" className="quick-add" onClick={() => setModalKind("task")}>＋ <span>Добавить</span></button>
  </div>;
}

function Dashboard({tasks,habits,projects,taskCompletion,habitCompletion,today,onToggleTask,onToggleHabit,navigate}:{tasks:Task[];habits:Habit[];projects:Project[];taskCompletion:number;habitCompletion:number;today:string;onToggleTask:(id:number)=>void;onToggleHabit:(id:number,date:string)=>void;navigate:(s:Section)=>void}) {
  const totalScore=Math.round((taskCompletion+habitCompletion)/2);
  return <><section className="hero-row"><div><span className="eyebrow">{new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"}).toUpperCase()}</span><h1>Доброе утро, Алексей <span>✦</span></h1><p>Сегодня хороший день, чтобы продвинуть то, что действительно важно.</p></div><div className="day-score"><Ring value={totalScore} color="#c9ff4c" size={76}/><div><small>БАЛАНС ДНЯ</small><strong>{totalScore>=70?"Уверенный ритм":"Есть пространство для роста"}</strong><span>задачи + привычки</span></div></div></section>
  <section className="focus-card"><div className="focus-glow"/><div className="focus-top"><span><i>01</i> ГЛАВНЫЙ ФОКУС ДНЯ</span></div><div className="focus-content"><div><h2>{tasks.find(t=>!t.done)?.title||"Все задачи выполнены"}</h2><p>Один главный результат сегодня важнее длинного списка.</p><div className="tag-row"><span>◈ {tasks.find(t=>!t.done)?.area||"Свободное время"}</span><span>◷ {tasks.find(t=>!t.done)?.time||"Сегодня"}</span></div></div><button type="button" className="focus-action" onClick={()=>navigate("Задачи")}>Открыть задачи <span>→</span></button></div></section>
  <section className="card tracker-card"><CardHead title="Трекер задач и привычек" subtitle="Живой показатель выполнения сегодня" action="Подробнее" onClick={()=>navigate("Привычки")}/><div className="tracker-metrics"><div><Ring value={taskCompletion} color="#c9ff4c" size={86}/><span><strong>Задачи</strong><small>{tasks.filter(t=>t.done).length} из {tasks.length}</small></span></div><div><Ring value={habitCompletion} color="#57e0b7" size={86}/><span><strong>Привычки</strong><small>{habits.filter(h=>h.checks[today]).length} из {habits.length}</small></span></div><div className="tracker-score"><small>ОБЩИЙ РИТМ</small><strong>{totalScore}%</strong><p>{totalScore>=80?"Отличный темп — удерживайте ритм.":totalScore>=50?"Хороший прогресс. Остался один точный шаг.":"Начните с одного небольшого действия."}</p></div></div></section>
  <div className="dashboard-grid"><section className="card today-card"><CardHead title="Сегодня" subtitle={`${tasks.filter(t=>t.done).length} из ${tasks.length} выполнено`} action="Все задачи" onClick={()=>navigate("Задачи")}/><div className="progress-line"><i style={{width:`${taskCompletion}%`}}/></div><div className="task-list">{tasks.slice(0,4).map(task=><label className={task.done?"done":""} key={task.id}><input type="checkbox" checked={task.done} onChange={()=>onToggleTask(task.id)}/><span className={`check ${task.priority}`}>✓</span><div><strong>{task.title}</strong><small>{task.area}</small></div><time>{task.time}</time></label>)}</div></section><section className="card compass"><CardHead title="Компас жизни" subtitle="Баланс ключевых сфер"/><div className="compass-body"><div className="radar"><div className="radar-lines"/><div className="radar-shape"/><span className="r1">Энергия</span><span className="r2">Здоровье</span><span className="r3">Финансы</span><span className="r4">Развитие</span><span className="r5">Отношения</span></div><div className="area-list">{areas.map(a=><div key={a.name}><span><i style={{background:a.color}}/>{a.name}</span><b>{a.value}</b></div>)}</div></div></section>
  <section className="card habits-card"><CardHead title="Привычки" subtitle="Можно отметить только сегодня" action="Все привычки" onClick={()=>navigate("Привычки")}/><div className="habit-list">{habits.map(h=><button type="button" key={h.id} className={h.checks[today]?"complete":""} onClick={()=>onToggleHabit(h.id,today)}><span className="habit-icon">{h.icon}</span><div><strong>{h.name}</strong><small>{h.checks[today]?"Выполнено сегодня":"Ждёт отметки"}</small></div><span className="habit-check">✓</span></button>)}</div></section><section className="card goals-card"><CardHead title="Цепочка целей" subtitle="От видения к действию" action="Все цели" onClick={()=>navigate("Цели")}/><div className="goal-chain">{["2026","Q3","АВГУСТ"].map((date,i)=><div className={i===2?"current":""} key={date}><span>{date}</span><strong>{["Создать устойчивую систему жизни","Запустить и внедрить NEXUS OS","Собрать рабочий MVP"][i]}</strong><em>{["ГОД","КВАРТАЛ","МЕСЯЦ"][i]}</em></div>)}</div><div className="week-goal"><span>Эта неделя</span><div><b>3 / 5 ключевых результатов</b><small>60%</small></div><div className="mini-track"><i style={{width:"60%"}}/></div></div></section></div>
  <section className="bottom-grid"><div className="card project-mini"><CardHead title="Активные проекты" subtitle={`${projects.length} в работе`} action="Открыть" onClick={()=>navigate("Проекты")}/>{projects.slice(0,3).map(p=><button type="button" className="project-row project-row-button" onClick={()=>navigate("Проекты")} key={p.id}><div className="project-badge">{p.name[0]}</div><div><strong>{p.name}</strong><span><i style={{width:`${p.progress}%`}}/></span></div><b>{p.progress}%</b></button>)}</div><div className="card reflection"><div><span className="eyebrow">ВЕЧЕРНИЙ РАЗБОР</span><h3>Как прошёл твой день?</h3><p>Пять минут рефлексии помогают замечать прогресс.</p></div><button type="button" onClick={()=>navigate("Журнал")}>Начать разбор <span>→</span></button></div></section></>;
}

function CardHead({title,subtitle,action,onClick}:{title:string;subtitle:string;action?:string;onClick?:()=>void}){return <div className="card-head"><div><h3>{title}</h3><span>{subtitle}</span></div>{action&&<button type="button" onClick={onClick}>{action} →</button>}</div>}
function PageTitle({eyebrow,title,text,action,onAction,extra}:{eyebrow:string;title:string;text:string;action?:string;onAction?:()=>void;extra?:React.ReactNode}){return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div><div className="page-actions">{extra}{action&&<button type="button" className="primary" onClick={onAction}>＋ {action}</button>}</div></div>}
function Stat({value,label}:{value:string;label:string}){return <div><strong>{value}</strong><span>{label}</span></div>}
function EmptyState({text,action,onClick}:{text:string;action:string;onClick:()=>void}){return <div className="empty-state"><span>＋</span><strong>{text}</strong><button type="button" onClick={onClick}>{action}</button></div>}

function TasksPage({tasks,setTasks,onNew}:{tasks:Task[];setTasks:React.Dispatch<React.SetStateAction<Task[]>>;onNew:()=>void}){
  const[filter,setFilter]=useState<"active"|"done"|"all">("active");const visible=tasks.filter(t=>filter==="all"||(filter==="done"?t.done:!t.done));
  return <><PageTitle eyebrow="ДЕЙСТВИЕ" title="Задачи" text="Один ясный список — без перегруза и шума." action="Новая задача" onAction={onNew}/><div className="stats-strip"><Stat value={tasks.filter(t=>!t.done).length.toString()} label="В работе"/><Stat value={tasks.filter(t=>t.done).length.toString()} label="Выполнено"/><Stat value={`${tasks.length*40} мин`} label="Запланировано"/><Stat value={`${tasks.length?Math.round(tasks.filter(t=>t.done).length/tasks.length*100):0}%`} label="Темп"/></div><section className="card full-card"><div className="filter-row"><button type="button" className={filter==="active"?"active":""} onClick={()=>setFilter("active")}>В работе</button><button type="button" className={filter==="done"?"active":""} onClick={()=>setFilter("done")}>Выполнено</button><button type="button" className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>Все</button><span/><button type="button" onClick={onNew}>＋ Добавить</button></div><div className="large-task-list">{visible.length?visible.map(t=><label key={t.id} className={t.done?"done":""}><input type="checkbox" checked={t.done} onChange={()=>setTasks(v=>v.map(x=>x.id===t.id?{...x,done:!x.done}:x))}/><span className={`check ${t.priority}`}>✓</span><div><strong>{t.title}</strong><small><b>{t.area}</b> · {t.time} · {t.priority==="high"?"Высокий":t.priority==="medium"?"Средний":"Низкий"} приоритет</small></div><button type="button" aria-label="Удалить задачу" onClick={e=>{e.preventDefault();setTasks(v=>v.filter(x=>x.id!==t.id))}}>×</button></label>):<EmptyState text="В этом списке пока ничего нет" action="Создать задачу" onClick={onNew}/>}</div></section></>;
}

function GoalsPage({goals,setGoals,onNew}:{goals:Goal[];setGoals:React.Dispatch<React.SetStateAction<Goal[]>>;onNew:()=>void}){return <><PageTitle eyebrow="НАПРАВЛЕНИЕ" title="Цели" text="Связь ежедневных действий с тем, каким человеком вы хотите стать." action="Новая цель" onAction={onNew}/><section className="timeline-chain">{goals.map((goal,i)=><div className={i===2?"accent":""} key={goal.id}><em>{goal.period}</em><span>{goal.date}</span><h3>{goal.title}</h3><p>{goal.note}</p><div className="entity-actions"><button type="button" onClick={()=>setGoals(v=>v.map(g=>g.id===goal.id?{...g,progress:Math.min(100,g.progress+10)}:g))}>＋10%</button><button type="button" onClick={()=>setGoals(v=>v.filter(g=>g.id!==goal.id))}>Удалить</button></div><b>{goal.progress}%</b></div>)}</section></>}

function ProjectsPage({projects,setProjects,onNew}:{projects:Project[];setProjects:React.Dispatch<React.SetStateAction<Project[]>>;onNew:()=>void}){return <><PageTitle eyebrow="СИСТЕМЫ" title="Проекты" text="Переводим большие замыслы в ясные этапы." action="Новый проект" onAction={onNew}/><div className="project-grid">{projects.map((p,i)=><article className="card project-card" key={p.id}><div className={`project-cover p${i%3}`}><span>{p.area}</span><b>{p.progress}%</b></div><div className="project-info"><h3>{p.name}</h3><p>Следующий шаг: {p.next}</p><div className="mini-track"><i style={{width:`${p.progress}%`}}/></div><div><span>Срок: {p.due}</span><span>В работе</span></div><div className="project-actions"><button type="button" onClick={()=>setProjects(v=>v.map(x=>x.id===p.id?{...x,progress:Math.min(100,x.progress+10)}:x))}>Продвинуть +10%</button><button type="button" onClick={()=>setProjects(v=>v.filter(x=>x.id!==p.id))}>Удалить</button></div></div></article>)}{!projects.length&&<EmptyState text="Создайте первый проект" action="Новый проект" onClick={onNew}/>}</div></>}

function HabitsPage({habits,history,clock,onToggle,onNew}:{habits:Habit[];history:HabitHistory[];clock:ReturnType<typeof habitClock>;onToggle:(id:number,date:string)=>void;onNew:()=>void}){
  const todayDone=habits.filter(h=>h.checks[clock.today]).length;const weekDone=habits.reduce((sum,h)=>sum+Object.values(h.checks).filter(Boolean).length,0);const possible=Math.max(1,habits.length*(clock.dates.findIndex(d=>localDateKey(d)===clock.today)+1));
  return <><PageTitle eyebrow="РИТМ" title="Привычки" text="Неделя начинается в воскресенье в 05:00. Изменять можно только сегодняшний день." action="Новая привычка" onAction={onNew}/><div className="stats-strip"><Stat value={`${todayDone}/${habits.length}`} label="Сегодня"/><Stat value={`${Math.round(weekDone/possible*100)}%`} label="Темп недели"/><Stat value={weekDone.toString()} label="Отметок"/><Stat value={history.length.toString()} label="Недель в истории"/></div><div className="habit-week card"><div className="week-head"><h3>{prettyDate(clock.weekStart)} — {prettyDate(localDateKey(clock.dates[6]))}</h3>{clock.dates.map((d,i)=><span className={localDateKey(d)===clock.today?"today":""} key={i}>{dayNames[i]}<small>{d.getDate()}</small></span>)}</div>{habits.map(h=><div className="habit-week-row" key={h.id}><div><span>{h.icon}</span><strong>{h.name}</strong><small>{Object.values(h.checks).filter(Boolean).length}/7</small></div>{clock.dates.map((date,i)=>{const key=localDateKey(date);const isToday=key===clock.today;const past=key<clock.today;return <button type="button" key={`${h.id}-${key}`} disabled={!isToday} aria-label={`${h.name}, ${dayNames[i]}${isToday?", сегодня":past?", прошедший день":", будущий день"}`} title={isToday?"Отметить сегодняшний день":past?"Прошедший день заблокирован":"Будущий день заблокирован"} onClick={()=>onToggle(h.id,key)} className={`${h.checks[key]?"hit":""} ${isToday?"editable":"locked"}`}>✓</button>})}</div>)}</div><section className="habit-history card"><CardHead title="История прогресса" subtitle="Завершённые недели сохраняются автоматически"/>{history.length?<div className="history-grid">{history.slice(-8).reverse().map(item=><div key={item.id}><span>{prettyDate(item.weekStart)}</span><strong>{item.habitName}</strong><div className="mini-track"><i style={{width:`${Math.round(item.completed/item.total*100)}%`}}/></div><small>{item.completed}/{item.total} · {Math.round(item.completed/item.total*100)}%</small></div>)}</div>:<p className="empty-copy">История появится после первого воскресного сброса в 05:00.</p>}</section></>;
}

function FinancePage({accounts,setAccounts,transactions,setTransactions,onOperation,onTransfer,onAccount}:{accounts:Account[];setAccounts:React.Dispatch<React.SetStateAction<Account[]>>;transactions:Transaction[];setTransactions:React.Dispatch<React.SetStateAction<Transaction[]>>;onOperation:()=>void;onTransfer:()=>void;onAccount:()=>void}){
  const income=transactions.filter(t=>t.kind==="income").reduce((s,t)=>s+t.amount,0);const expenses=transactions.filter(t=>t.kind==="expense").reduce((s,t)=>s+t.amount,0);const capital=accounts.filter(a=>a.type!=="credit").reduce((s,a)=>s+a.balance,0)+accounts.filter(a=>a.type==="credit").reduce((s,a)=>s+a.balance,0);const upcoming=transactions.filter(t=>t.kind==="installment"&&!t.posted).sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||""));
  return <><PageTitle eyebrow="РЕСУРСЫ" title="Финансы" text="Наличные, банковский счёт и кредитные обязательства в шекелях." action="Операция" onAction={onOperation} extra={<><button type="button" className="secondary-action" onClick={onTransfer}>⇄ Перевод</button><button type="button" className="secondary-action" onClick={onAccount}>＋ Счёт</button></>}/><div className="finance-hero"><div><small>КАПИТАЛ</small><strong>{formatIls(capital)}</strong><span>включая долг по кредитке</span></div><div><small>ДОХОДЫ</small><strong>{formatIls(income)}</strong><span>все операции</span></div><div><small>РАСХОДЫ</small><strong>{formatIls(expenses)}</strong><span>покупки, без двойного учёта платежей</span></div><div><small>КРЕДИТ 15 ЧИСЛА</small><strong className="lime">{formatIls(upcoming.filter(t=>t.dueDate===upcoming[0]?.dueDate).reduce((s,t)=>s+t.amount,0))}</strong><span>{upcoming[0]?.dueDate?prettyDate(upcoming[0].dueDate):"нет предстоящих платежей"}</span></div></div><section className="accounts-grid">{accounts.map(account=><AccountCard key={account.id} account={account} debitAccounts={accounts.filter(a=>a.type==="debit")} onSave={next=>setAccounts(v=>v.map(a=>a.id===next.id?next:a))}/>)}</section><div className="finance-grid"><section className="card budget"><CardHead title="Движение денег" subtitle="Все суммы в ₪" action="Добавить" onClick={onOperation}/>{[["Жильё",5600,6000],["Продукты",2470,3500],["Транспорт",620,1200],["Развитие",980,1600],["Другое",Math.max(0,expenses-9670),3700]].map(x=><div key={x[0] as string}><span>{x[0]}</span><div className="mini-track"><i style={{width:`${Math.min(100,Number(x[1])/Number(x[2])*100)}%`}}/></div><b>{formatIls(Number(x[1]))}</b></div>)}</section><section className="card installments"><CardHead title="План кредитных платежей" subtitle={`${upcoming.length} будущих списаний`}/>{upcoming.length?upcoming.slice(0,8).map(item=><div className="installment-row" key={item.id}><span>{prettyDate(item.dueDate||item.date)}</span><div><strong>{item.title}</strong><small>автосписание с основного счёта</small></div><b>{formatIls(item.amount)}</b></div>):<p className="empty-copy">Добавьте покупку с кредитной карты и выберите число платежей.</p>}</section></div><section className="card transactions"><CardHead title="Журнал операций" subtitle={`${transactions.filter(t=>t.kind!=="installment"||t.posted).length} записей`} action="Новая операция" onClick={onOperation}/>{transactions.filter(t=>t.kind!=="installment"||t.posted).map(t=><div className="transaction-row" key={t.id}><span className={t.kind}>{t.kind==="income"?"↑":t.kind==="transfer"?"⇄":"↓"}</span><div><strong>{t.title}</strong><small>{t.category} · {prettyDate(t.date)} · {accounts.find(a=>a.id===t.accountId)?.name}</small></div><b className={t.kind}>{t.kind==="income"?"+":t.kind==="transfer"?"":"−"}{formatIls(t.amount)}</b><button type="button" onClick={()=>setTransactions(v=>v.filter(x=>x.id!==t.id))}>×</button></div>)}</section></>;
}

function AccountCard({account,debitAccounts,onSave}:{account:Account;debitAccounts:Account[];onSave:(a:Account)=>void}){
  const[editing,setEditing]=useState(false);const[name,setName]=useState(account.name);const[balance,setBalance]=useState(String(account.balance));const[linked,setLinked]=useState(String(account.linkedAccountId||""));
  return <article className={`card account-card ${account.type}`}><span>{account.type==="cash"?"▣":account.type==="debit"?"▤":"◇"}</span>{editing?<><input aria-label="Название счёта" value={name} onChange={e=>setName(e.target.value)}/><input aria-label="Баланс счёта" type="number" value={balance} onChange={e=>setBalance(e.target.value)}/>{account.type==="credit"&&<select aria-label="Счёт списания" value={linked} onChange={e=>setLinked(e.target.value)}>{debitAccounts.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select>}<button type="button" onClick={()=>{onSave({...account,name,balance:Number(balance),linkedAccountId:Number(linked)||account.linkedAccountId});setEditing(false)}}>Сохранить</button></>:<><small>{account.type==="cash"?"НАЛИЧНЫЕ":account.type==="debit"?"БАНКОВСКИЙ СЧЁТ":"КРЕДИТНАЯ КАРТА"}</small><strong>{formatIls(account.balance)}</strong><p>{account.type==="credit"?`Списание ${account.billingDay||15} числа`:"Доступный остаток"}</p><button type="button" onClick={()=>setEditing(true)}>Изменить</button></>}</article>
}

function HealthPage({notes,setNotes,onMetric,notify}:{notes:HealthNote[];setNotes:React.Dispatch<React.SetStateAction<HealthNote[]>>;onMetric:()=>void;notify:(s:string)=>void}){
  const[note,setNote]=useState("");function save(){if(!note.trim())return;setNotes(v=>[{id:newEntityId(),kind:"note",title:"Заметка о состоянии",value:note.trim(),date:new Date().toISOString()},...v]);setNote("");notify("Заметка о здоровье сохранена")}
  return <><PageTitle eyebrow="СОСТОЯНИЕ" title="Здоровье" text="Метрики и заметки сохраняются в журнале здоровья." action="Записать метрику" onAction={onMetric}/><div className="health-grid">{[["Сон","7ч 42м","качество 84%","☾"],["Энергия","8 / 10","стабильно весь день","⚡"],["Активность","8 462","шагов сегодня","↗"],["Вес","78,4 кг","−0,8 кг за месяц","◎"]].map(x=><article className="card health-stat" key={x[0]}><span>{x[3]}</span><small>{x[0]}</small><strong>{x[1]}</strong><p>{x[2]}</p></article>)}</div><div className="health-bottom"><section className="card energy-chart"><CardHead title="Энергия за 7 дней" subtitle="Среднее: 7,4"/><div className="bars">{[52,68,62,81,74,88,79].map((h,i)=><div key={i}><i style={{height:`${h}%`}}/><span>{dayNames[i]}</span></div>)}</div></section><section className="card note-card"><span className="eyebrow">ЗАМЕТКА О СОСТОЯНИИ</span><h3>Что замечаешь сегодня?</h3><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Энергия, самочувствие, симптомы, мысли..."/><button type="button" onClick={save}>Сохранить заметку</button></section></div><section className="card notes-history"><CardHead title="Журнал здоровья" subtitle={`${notes.length} записей`}/>{notes.length?notes.map(item=><div key={item.id}><span>{item.kind==="metric"?"◎":"✦"}</span><div><strong>{item.title}</strong><p>{item.value}</p><small>{new Date(item.date).toLocaleString("ru-RU")}</small></div><button type="button" onClick={()=>setNotes(v=>v.filter(n=>n.id!==item.id))}>×</button></div>):<p className="empty-copy">Добавьте первую метрику или заметку.</p>}</section></>;
}

function PlanningPage({events,setEvents,note,setNote,onNew,notify}:{events:CalendarEvent[];setEvents:React.Dispatch<React.SetStateAction<CalendarEvent[]>>;note:string;setNote:(s:string)=>void;onNew:()=>void;notify:(s:string)=>void}){
  const clock=habitClock();return <><PageTitle eyebrow="ВРЕМЯ" title="Планирование" text="Неделя от воскресенья до субботы: фокус, встречи и заметки." action="Событие" onAction={onNew}/><section className="card planning-note"><div><span className="eyebrow">ФОКУС НЕДЕЛИ</span><h3>Что должно стать главным результатом?</h3></div><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Например: закончить MVP и оставить пятницу без встреч"/><button type="button" onClick={()=>notify("План недели сохранён")}>Сохранить план</button></section><section className="week-calendar card"><div className="calendar-hours">{["08:00","10:00","12:00","14:00","16:00","18:00","20:00"].map(x=><span key={x}>{x}</span>)}</div>{clock.dates.map((date,i)=><div className="calendar-day" key={i}><strong>{dayNames[i]} {date.getDate()}</strong>{events.filter(e=>e.day===i).map((event,j)=><div className={`event ${event.tone}-event`} style={{top:70+j*82,height:68}} key={event.id}>{event.title}<small>{event.time}</small><button type="button" aria-label="Удалить событие" onClick={()=>setEvents(v=>v.filter(x=>x.id!==event.id))}>×</button></div>)}</div>)}</section></>;
}

function JournalPage({entries,setEntries,notify}:{entries:JournalEntry[];setEntries:React.Dispatch<React.SetStateAction<JournalEntry[]>>;notify:(s:string)=>void}){
  const[text,setText]=useState("");const[mood,setMood]=useState(4);const[step,setStep]=useState(1);const[answers,setAnswers]=useState<string[]>([]);const[selected,setSelected]=useState<JournalEntry|null>(null);const prompts=["Что сегодня получилось хорошо?","Что можно было сделать иначе?","За что ты благодарен сегодня?","Какой главный фокус на завтра?"];
  function next(){if(!text.trim())return;const nextAnswers=[...answers,text.trim()];if(step<4){setAnswers(nextAnswers);setStep(v=>v+1);setText("")}else{const entry={id:newEntityId(),date:new Date().toISOString(),mood,answers:nextAnswers};setEntries(v=>[entry,...v]);setSelected(entry);setAnswers([]);setStep(1);setText("");notify("Вечерний разбор сохранён")}}
  return <><PageTitle eyebrow="РЕФЛЕКСИЯ" title="Вечерний разбор" text="Все четыре ответа сохраняются в истории."/><div className="journal-layout"><section className="card journal-form"><span className="step-label">0{step} / 04</span><h2>{prompts[step-1]}</h2><p>Даже маленькие наблюдения помогают видеть движение.</p><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Напиши несколько честных строк..."/><div className="mood-row"><span>Энергия дня</span>{[1,2,3,4,5].map(x=><button type="button" onClick={()=>setMood(x)} className={mood===x?"active":""} key={x}>{x}</button>)}</div><button type="button" className="primary" onClick={next}>{step===4?"Завершить и сохранить":"Продолжить →"}</button></section><aside className="card journal-history"><CardHead title="История записей" subtitle={`${entries.length} записей`}/>{entries.length?entries.map(entry=><button type="button" className={selected?.id===entry.id?"selected":""} onClick={()=>setSelected(entry)} key={entry.id}><span>{new Date(entry.date).toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})}</span><strong>{entry.answers[0]}</strong></button>):<p className="empty-copy">Завершите первый вечерний разбор.</p>}</aside></div>{selected&&<section className="card journal-entry"><div><span className="eyebrow">СОХРАНЁННАЯ ЗАПИСЬ</span><h3>{new Date(selected.date).toLocaleString("ru-RU")}</h3><small>Энергия: {selected.mood}/5</small></div>{selected.answers.map((answer,i)=><div key={i}><strong>{prompts[i]}</strong><p>{answer}</p></div>)}</section>}</>;
}

function SettingsPage({byok,setByok,notify}:{byok:string;setByok:(s:string)=>void;notify:(s:string)=>void}){
  const[tab,setTab]=useState("AI-ассистент");function save(){localStorage.setItem("nexus-byok",byok);notify("Настройки сохранены")}
  return <><PageTitle eyebrow="СИСТЕМА" title="Настройки" text="Персонализируйте NEXUS OS под свой ритм."/><div className="settings-layout"><aside className="settings-nav">{[["✦","AI-ассистент"],["◉","Профиль"],["♢","Уведомления"],["◐","Внешний вид"],["⇄","Данные"]].map(x=><button type="button" className={tab===x[1]?"active":""} onClick={()=>setTab(x[1])} key={x[1]}>{x[0]} {x[1]}</button>)}</aside><section className="card settings-card">{tab==="AI-ассистент"?<><div className="settings-title"><span className="ai-orb">✦</span><div><h2>NEXUS AI</h2><p>Выполняет понятные команды сразу, без подтверждений.</p></div></div><div className="secure-option"><div><strong>Рекомендуемый режим · серверный ключ</strong><p>Добавьте <code>OPENAI_API_KEY</code> в Vercel. Ключ остаётся на сервере.</p></div><span>БЕЗОПАСНО</span></div><div className="warning"><b>!</b><p><strong>BYOK менее безопасен</strong>Ключ хранится только в этом браузере.</p></div><div className="setting-field"><label>Личный OpenAI API key</label><div className="key-input"><input type="password" value={byok} onChange={e=>setByok(e.target.value)} placeholder="sk-proj-••••••••"/><button type="button" onClick={()=>setByok("")}>Очистить</button></div></div><button type="button" className="primary" onClick={save}>Сохранить</button></>:<SettingsPlaceholder title={tab} text={tab==="Данные"?"Данные задач, привычек, финансов и журналов хранятся локально на этом устройстве.":"Раздел настроек активен и готов к персонализации."} onClick={save}/>}</section></div></>;
}
function SettingsPlaceholder({title,text,onClick}:{title:string;text:string;onClick:()=>void}){return <div className="settings-placeholder"><span className="eyebrow">НАСТРОЙКИ</span><h2>{title}</h2><p>{text}</p><div className="setting-field"><label>Статус</label><input value="Активно" readOnly/></div><button type="button" className="primary" onClick={onClick}>Сохранить</button></div>}

function CreateModal({kind,accounts,onClose,onCreate}:{kind:Exclude<ModalKind,null>;accounts:Account[];onClose:()=>void;onCreate:(draft:Record<string,unknown>)=>void}){
  const[accountId,setAccountId]=useState(String(accounts[0]?.id||""));const selected=accounts.find(a=>a.id===Number(accountId));const titles:Record<Exclude<ModalKind,null>,string>={task:"Новая задача",project:"Новый проект",goal:"Новая цель",habit:"Новая привычка",transaction:"Новая операция",account:"Новый счёт",transfer:"Перевод между счетами",health:"Метрика здоровья",event:"Новое событие"};
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);const draft=Object.fromEntries(fd.entries());onCreate(draft)}
  return <div className="modal-wrap" onMouseDown={onClose}><form className="quick-modal entity-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><div><span className="eyebrow">NEXUS · СОЗДАНИЕ</span><button type="button" onClick={onClose}>×</button></div><h2>{titles[kind]}</h2>
    {!["transfer"].includes(kind)&&<Field label={kind==="transaction"?"Название операции":kind==="health"?"Показатель":"Название"} name="title" placeholder="Введите название"/>}
    {kind==="task"&&<div className="modal-grid"><Field label="Сфера" name="area" placeholder="Личное" required={false}/><Field label="Время" name="time" placeholder="Сегодня" required={false}/><SelectField label="Приоритет" name="priority" options={[["medium","Средний"],["high","Высокий"],["low","Низкий"]]}/></div>}
    {kind==="project"&&<div className="modal-grid"><Field label="Сфера" name="area" placeholder="Работа" required={false}/><Field label="Срок" name="due" placeholder="31 августа" required={false}/><div className="span-2"><Field label="Следующий шаг" name="next" placeholder="Первое конкретное действие" required={false}/></div></div>}
    {kind==="goal"&&<><div className="modal-grid"><SelectField label="Период" name="period" options={[["ГОД","Год"],["КВАРТАЛ","Квартал"],["МЕСЯЦ","Месяц"],["НЕДЕЛЯ","Неделя"],["СЕГОДНЯ","Сегодня"]]}/><Field label="Дата" name="date" placeholder="Q4 / Август" required={false}/></div><Field label="Критерий результата" name="note" placeholder="Что будет считаться успехом" required={false}/></>}
    {kind==="habit"&&<Field label="Символ" name="icon" placeholder="✦" required={false}/>} 
    {kind==="transaction"&&<div className="modal-grid"><Field label="Сумма, ₪" name="amount" type="number" placeholder="250"/><SelectField label="Тип" name="kind" options={[["expense","Расход"],["income","Доход"]]}/><label className="modal-field span-2"><span>Счёт</span><select name="accountId" value={accountId} onChange={e=>setAccountId(e.target.value)}>{accounts.map(a=><option value={a.id} key={a.id}>{a.name} · {formatIls(a.balance)}</option>)}</select></label>{selected?.type==="credit"&&<SelectField label="Количество платежей" name="installments" options={Array.from({length:12},(_,i)=>[String(i+1),`${i+1} ${i===0?"платёж":"платежей"}`])}/>}<Field label="Категория" name="category" placeholder="Продукты" required={false}/></div>}
    {kind==="transfer"&&<div className="modal-grid"><SelectField label="Откуда" name="fromAccountId" options={accounts.filter(a=>a.type!=="credit").map(a=>[String(a.id),`${a.name} · ${formatIls(a.balance)}`])}/><SelectField label="Куда" name="toAccountId" options={accounts.filter(a=>a.type!=="credit").map(a=>[String(a.id),`${a.name} · ${formatIls(a.balance)}`])}/><div className="span-2"><Field label="Сумма, ₪" name="amount" type="number" placeholder="500"/></div></div>}
    {kind==="account"&&<div className="modal-grid"><SelectField label="Тип счёта" name="accountType" options={[["cash","Наличные"],["debit","Банковский счёт"],["credit","Кредитная карта"]]}/><Field label="Начальный баланс, ₪" name="balance" type="number" placeholder="0"/><SelectField label="Счёт списания кредитки" name="linkedAccountId" options={accounts.filter(a=>a.type==="debit").map(a=>[String(a.id),a.name])}/><Field label="День списания" name="billingDay" type="number" placeholder="15" required={false}/></div>}
    {kind==="health"&&<Field label="Значение" name="value" placeholder="Например, 78,4 кг"/>}
    {kind==="event"&&<div className="modal-grid"><SelectField label="День" name="day" options={dayNames.map((d,i)=>[String(i),d])}/><Field label="Время" name="time" type="time" placeholder="09:00"/><SelectField label="Цвет" name="tone" options={[["lime","Лайм"],["purple","Фиолетовый"],["orange","Оранжевый"]]}/></div>}
    <button className="primary modal-submit" type="submit">Создать и сохранить</button></form></div>;
}

function Field({label,name,placeholder,type="text",required=true}:{label:string;name:string;placeholder:string;type?:string;required?:boolean}){return <label className="modal-field"><span>{label}</span><input required={required} name={name} type={type} placeholder={placeholder}/></label>}
function SelectField({label,name,options}:{label:string;name:string;options:string[][]}){return <label className="modal-field"><span>{label}</span><select name={name}>{options.map(([value,label])=><option value={value} key={`${name}-${value}`}>{label}</option>)}</select></label>}
