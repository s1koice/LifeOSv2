"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Section = "Обзор" | "Задачи" | "Цели" | "Проекты" | "Привычки" | "Финансы" | "Здоровье" | "Планирование" | "Журнал" | "Настройки";
type Task = { id: number; title: string; area: string; time: string; done: boolean; priority: "high" | "medium" | "low" };
type Project = { id: number; name: string; area: string; progress: number; due: string; next: string };
type Goal = { id: number; period: string; date: string; title: string; note: string; progress: number };
type Transaction = { id: number; title: string; category: string; amount: number; type: "income" | "expense"; date: string };
type CalendarEvent = { id: number; title: string; day: number; time: string; tone: "lime" | "purple" | "orange" };
type ModalKind = "task" | "project" | "goal" | "habit" | "transaction" | "health" | "event" | null;

const nav: { group: string; items: { label: Section; icon: string }[] }[] = [
  { group: "Пространство", items: [{ label: "Обзор", icon: "◈" }, { label: "Задачи", icon: "✓" }, { label: "Цели", icon: "◎" }, { label: "Проекты", icon: "▦" }] },
  { group: "Сферы жизни", items: [{ label: "Привычки", icon: "↗" }, { label: "Финансы", icon: "₽" }, { label: "Здоровье", icon: "+" }] },
  { group: "Рефлексия", items: [{ label: "Планирование", icon: "□" }, { label: "Журнал", icon: "✦" }, { label: "Настройки", icon: "⚙" }] },
];

const seedTasks: Task[] = [
  { id: 1, title: "Завершить структуру лендинга", area: "NEXUS OS", time: "10:00", done: false, priority: "high" },
  { id: 2, title: "Тренировка: спина и плечи", area: "Здоровье", time: "13:30", done: false, priority: "medium" },
  { id: 3, title: "Разобрать расходы за неделю", area: "Финансы", time: "17:00", done: false, priority: "low" },
  { id: 4, title: "Прочитать 20 страниц", area: "Развитие", time: "21:00", done: true, priority: "low" },
];

const areas = [
  { name: "Энергия", value: 82, color: "#c9ff4c", hint: "+6 за неделю" },
  { name: "Здоровье", value: 74, color: "#57e0b7", hint: "7 ч 42 мин сна" },
  { name: "Финансы", value: 68, color: "#b8a6ff", hint: "71% бюджета" },
  { name: "Развитие", value: 61, color: "#ffb45e", hint: "4 ч фокуса" },
  { name: "Отношения", value: 79, color: "#ff7895", hint: "2 важных встречи" },
];

const habitsSeed = [
  { name: "Стакан воды утром", streak: 18, done: true, icon: "◒" },
  { name: "10 минут медитации", streak: 12, done: true, icon: "◌" },
  { name: "Чтение · 20 страниц", streak: 7, done: false, icon: "▤" },
  { name: "Без телефона после 22:30", streak: 5, done: false, icon: "☾" },
];

const seedProjects: Project[] = [
  { id: 1, name: "Запуск NEXUS OS", area: "Работа", progress: 68, due: "12 авг", next: "Собрать MVP dashboard" },
  { id: 2, name: "Финансовая подушка", area: "Финансы", progress: 42, due: "31 дек", next: "Настроить автоперевод" },
  { id: 3, name: "Полумарафон", area: "Здоровье", progress: 56, due: "21 сен", next: "Интервальная тренировка" },
];

const seedGoals: Goal[] = [
  { id: 1, period: "ГОД", date: "2026", title: "Создать устойчивую систему жизни", note: "Жить осознанно, свободно и с запасом энергии.", progress: 54 },
  { id: 2, period: "КВАРТАЛ", date: "Q3", title: "Запустить и внедрить NEXUS OS", note: "Единая система вместо разрозненных инструментов.", progress: 61 },
  { id: 3, period: "МЕСЯЦ", date: "Июль", title: "Собрать рабочий MVP", note: "Dashboard, планирование и ежедневные ритуалы.", progress: 68 },
  { id: 4, period: "НЕДЕЛЯ", date: "Неделя 31", title: "Закрыть ключевые экраны", note: "Пять измеримых результатов.", progress: 60 },
  { id: 5, period: "СЕГОДНЯ", date: "27 июля", title: "Закончить основу", note: "2 часа 30 минут глубокого фокуса.", progress: 32 },
];

const seedTransactions: Transaction[] = [
  { id: 1, title: "Зарплата", category: "Доход", amount: 18500, type: "income", date: "25 июля" },
  { id: 2, title: "Аренда квартиры", category: "Жильё", amount: 5600, type: "expense", date: "2 июля" },
  { id: 3, title: "Продукты", category: "Продукты", amount: 2470, type: "expense", date: "26 июля" },
  { id: 4, title: "Транспорт", category: "Транспорт", amount: 620, type: "expense", date: "24 июля" },
];

const seedEvents: CalendarEvent[] = [
  { id: 1, title: "Глубокий фокус", day: 0, time: "09:00", tone: "lime" },
  { id: 2, title: "Тренировка", day: 0, time: "15:00", tone: "purple" },
  { id: 3, title: "Созвон команды", day: 2, time: "11:30", tone: "purple" },
  { id: 4, title: "Обзор недели", day: 4, time: "14:30", tone: "orange" },
];

const formatIls = (value: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(value);

function Ring({ value, color, size = 70 }: { value: number; color: string; size?: number }) {
  return <div className="ring" style={{ width: size, height: size, background: `conic-gradient(${color} ${value * 3.6}deg, #262a30 0deg)` }}><div><strong>{value}</strong><small>%</small></div></div>;
}

function IconButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return <button className="icon-button" aria-label={label} onClick={onClick}>{children}</button>;
}

export default function Home() {
  const [section, setSection] = useState<Section>("Обзор");
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [habits, setHabits] = useState(habitsSeed);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [goals, setGoals] = useState<Goal[]>(seedGoals);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [events, setEvents] = useState<CalendarEvent[]>(seedEvents);
  const [showQuick, setShowQuick] = useState(false);
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([
    { role: "assistant", text: "Привет! Я вижу твой день целиком. Могу помочь расставить приоритеты, разбить цель на шаги или создать план проекта." },
  ]);
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [byok, setByok] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("nexus-state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.tasks) setTasks(parsed.tasks);
          if (parsed.habits) setHabits(parsed.habits);
          if (parsed.projects) setProjects(parsed.projects);
          if (parsed.goals) setGoals(parsed.goals);
          if (parsed.transactions) setTransactions(parsed.transactions);
          if (parsed.events) setEvents(parsed.events);
        } catch { /* use demo data */ }
      }
      setByok(localStorage.getItem("nexus-byok") || "");
      const hashSection = decodeURIComponent(window.location.hash.slice(1)) as Section;
      if (nav.some(group => group.items.some(item => item.label === hashSection))) setSection(hashSection);
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { if (loaded) localStorage.setItem("nexus-state", JSON.stringify({ tasks, habits, projects, goals, transactions, events })); }, [loaded, tasks, habits, projects, goals, transactions, events]);

  useEffect(() => {
    const onHash = () => {
      const next = decodeURIComponent(window.location.hash.slice(1)) as Section;
      if (nav.some(group => group.items.some(item => item.label === next))) setSection(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const completion = useMemo(() => tasks.length ? Math.round(tasks.filter(t => t.done).length / tasks.length * 100) : 0, [tasks]);

  function navigate(next: Section) {
    setSection(next);
    window.history.pushState(null, "", `#${encodeURIComponent(next)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function addTask(e: FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setTasks(v => [...v, { id: Date.now(), title: taskTitle.trim(), area: "Личное", time: "Сегодня", done: false, priority: "medium" }]);
    setTaskTitle(""); setShowQuick(false);
  }

  async function askAssistant(e: FormEvent) {
    e.preventDefault(); if (!prompt.trim() || thinking) return;
    const text = prompt.trim(); setPrompt(""); setMessages(v => [...v, { role: "user", text }]); setThinking(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json", ...(byok ? { "x-nexus-byok": byok } : {}) }, body: JSON.stringify({ message: text, context: { tasks, habits, section } }) });
      const data = await response.json();
      setMessages(v => [...v, { role: "assistant", text: data.reply || data.error || "Не удалось получить ответ." }]);
    } catch { setMessages(v => [...v, { role: "assistant", text: "Сейчас я офлайн. Добавьте серверный ключ в настройках деплоя или включите BYOK-режим." }]); }
    finally { setThinking(false); }
  }

  function content() {
    if (section === "Обзор") return <Dashboard tasks={tasks} setTasks={setTasks} habits={habits} setHabits={setHabits} projects={projects} completion={completion} navigate={navigate} />;
    if (section === "Задачи") return <TasksPage tasks={tasks} setTasks={setTasks} onNew={() => setShowQuick(true)} />;
    if (section === "Цели") return <GoalsPage goals={goals} setGoals={setGoals} onNew={() => setModalKind("goal")} />;
    if (section === "Проекты") return <ProjectsPage projects={projects} setProjects={setProjects} onNew={() => setModalKind("project")} />;
    if (section === "Привычки") return <HabitsPage habits={habits} setHabits={setHabits} onNew={() => setModalKind("habit")} />;
    if (section === "Финансы") return <FinancePage transactions={transactions} setTransactions={setTransactions} onNew={() => setModalKind("transaction")} />;
    if (section === "Здоровье") return <HealthPage onNew={() => setModalKind("health")} notify={notify} />;
    if (section === "Планирование") return <PlanningPage events={events} setEvents={setEvents} onNew={() => setModalKind("event")} />;
    if (section === "Журнал") return <JournalPage notify={notify} />;
    return <SettingsPage byok={byok} setByok={setByok} notify={notify} />;
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><span className="brand-mark">N</span><div><strong>NEXUS</strong><small>PERSONAL OS</small></div><button className="mobile-close" onClick={() => setMobileNav(false)}>×</button></div>
      <nav>{nav.map(group => <div className="nav-group" key={group.group}><p>{group.group}</p>{group.items.map(item => <button key={item.label} className={section === item.label ? "active" : ""} onClick={() => { navigate(item.label); setMobileNav(false); }}><span>{item.icon}</span>{item.label}{item.label === "Задачи" && <em>{tasks.filter(t => !t.done).length}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-foot"><div className="level"><div className="level-top"><span>Уровень 12</span><b>2 840 XP</b></div><div className="mini-track"><i style={{ width: "72%" }} /></div><small>160 XP до нового уровня</small></div><div className="profile"><div className="avatar">А</div><div><strong>Алексей</strong><small>В продуктивном режиме</small></div><span className="online" /></div></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Закрыть меню" />}
    <main className="main">
      <header><button className="menu-button" onClick={() => setMobileNav(true)}>☰</button><div className="breadcrumbs"><span>МОЯ СИСТЕМА</span><b>/</b><strong>{section.toUpperCase()}</strong></div><div className="top-actions"><div className="search">⌕ <input aria-label="Поиск" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && search.trim()) { const foundTask = tasks.find(t => t.title.toLowerCase().includes(search.toLowerCase())); const foundProject = projects.find(p => p.name.toLowerCase().includes(search.toLowerCase())); if (foundTask) { navigate("Задачи"); notify(`Найдена задача: ${foundTask.title}`); } else if (foundProject) { navigate("Проекты"); notify(`Найден проект: ${foundProject.name}`); } else notify("Ничего не найдено"); setSearch(""); } }} placeholder="Найти что угодно..." /><kbd>↵</kbd></div><IconButton label="Уведомления" onClick={() => notify("Новых уведомлений нет")}>♢<i /></IconButton><button className="assistant-mini" onClick={() => setAssistantOpen(true)}><span>✦</span> Спросить NEXUS</button></div></header>
      <div className="page">{content()}</div>
    </main>
    <button className="ai-fab" onClick={() => setAssistantOpen(true)} aria-label="Открыть AI-ассистента"><span>✦</span><i /></button>
    {showQuick && <div className="modal-wrap" onMouseDown={() => setShowQuick(false)}><form className="quick-modal" onSubmit={addTask} onMouseDown={e => e.stopPropagation()}><div><span className="eyebrow">БЫСТРОЕ ДОБАВЛЕНИЕ</span><button type="button" onClick={() => setShowQuick(false)}>×</button></div><h2>Новая задача</h2><input autoFocus value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Что нужно сделать?" /><div className="form-row"><button type="button" className="chip">Сегодня</button><button type="button" className="chip">Средний приоритет</button></div><button className="primary" type="submit">Добавить задачу <span>↵</span></button></form></div>}
    {modalKind && <CreateModal kind={modalKind} onClose={() => setModalKind(null)} onCreate={(data) => {
      if (modalKind === "project") setProjects(v => [...v, data as Project]);
      if (modalKind === "goal") setGoals(v => [...v, data as Goal]);
      if (modalKind === "habit") setHabits(v => [...v, data as typeof habitsSeed[number]]);
      if (modalKind === "transaction") setTransactions(v => [...v, data as Transaction]);
      if (modalKind === "event") setEvents(v => [...v, data as CalendarEvent]);
      notify("Сохранено в NEXUS OS"); setModalKind(null);
    }} notify={notify} />}
    {assistantOpen && <aside className="assistant-panel"><div className="assistant-head"><div><span className="ai-orb">✦</span><div><strong>NEXUS AI</strong><small><i /> онлайн · контекст включён</small></div></div><button onClick={() => setAssistantOpen(false)}>×</button></div><div className="assistant-context"><span>Сейчас вижу</span><b>{tasks.filter(t => !t.done).length} задач · {habits.filter(h => h.done).length}/4 привычки · {section}</b></div><div className="messages">{messages.map((m, i) => <div key={i} className={`message ${m.role}`}>{m.text}</div>)}{thinking && <div className="message assistant typing">Анализирую контекст…</div>}</div><div className="suggestions"><button onClick={() => setPrompt("Разбери мой день и предложи главный приоритет")}>Разобрать мой день</button><button onClick={() => setPrompt("Помоги разбить цель на шаги")}>Разбить цель</button></div><form className="assistant-form" onSubmit={askAssistant}><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Напиши, что хочешь изменить или создать..." /><button type="submit">↑</button></form><small className="ai-note">ИИ предлагает изменения — вы подтверждаете их перед применением</small></aside>}
    {toast && <div className="toast">✓ {toast}</div>}
    <button className="quick-add" onClick={() => setShowQuick(true)}>＋ <span>Добавить</span></button>
  </div>;
}

function Dashboard({ tasks, setTasks, habits, setHabits, projects, completion, navigate }: { tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; habits: typeof habitsSeed; setHabits: React.Dispatch<React.SetStateAction<typeof habitsSeed>>; projects: Project[]; completion: number; navigate: (v: Section) => void }) {
  return <>
    <section className="hero-row"><div><span className="eyebrow">ПОНЕДЕЛЬНИК · 27 ИЮЛЯ</span><h1>Доброе утро, Алексей <span>✦</span></h1><p>Сегодня хороший день, чтобы продвинуть то, что действительно важно.</p></div><div className="day-score"><Ring value={78} color="#c9ff4c" size={76}/><div><small>БАЛАНС ДНЯ</small><strong>Уверенный ритм</strong><span>↑ 6% к прошлой неделе</span></div></div></section>
    <section className="focus-card"><div className="focus-glow"/><div className="focus-top"><span><i>01</i> ГЛАВНЫЙ ФОКУС ДНЯ</span><button>•••</button></div><div className="focus-content"><div><h2>Закончить основу NEXUS OS</h2><p>Собрать ключевые экраны и подготовить первую рабочую версию.</p><div className="tag-row"><span>◈ Проект · NEXUS OS</span><span>◷ 2 ч 30 мин</span><span className="energy">⚡ Высокая энергия</span></div></div><button className="focus-action" onClick={() => navigate("Проекты")}>Войти в фокус <span>→</span></button></div></section>
    <div className="dashboard-grid"><section className="card today-card"><CardHead title="Сегодня" subtitle={`${tasks.filter(t => t.done).length} из ${tasks.length} выполнено`} action="Все задачи" onClick={() => navigate("Задачи")}/><div className="progress-line"><i style={{width: `${completion}%`}}/></div><div className="task-list">{tasks.slice(0,4).map(task => <label className={task.done ? "done" : ""} key={task.id}><input type="checkbox" checked={task.done} onChange={() => setTasks(v => v.map(t => t.id === task.id ? {...t, done: !t.done} : t))}/><span className={`check ${task.priority}`}>✓</span><div><strong>{task.title}</strong><small>{task.area}</small></div><time>{task.time}</time></label>)}</div></section>
      <section className="card compass"><CardHead title="Компас жизни" subtitle="Баланс ключевых сфер" action="Подробнее"/><div className="compass-body"><div className="radar"><div className="radar-lines"/><div className="radar-shape"/><span className="r1">Энергия</span><span className="r2">Здоровье</span><span className="r3">Финансы</span><span className="r4">Развитие</span><span className="r5">Отношения</span></div><div className="area-list">{areas.map(a => <div key={a.name}><span><i style={{background: a.color}}/>{a.name}</span><b>{a.value}</b></div>)}</div></div></section>
      <section className="card habits-card"><CardHead title="Привычки" subtitle="Сегодня" action="Все привычки" onClick={() => navigate("Привычки")}/><div className="habit-list">{habits.map((h, i) => <button key={h.name} className={h.done ? "complete" : ""} onClick={() => setHabits(v => v.map((x,j) => j === i ? {...x, done: !x.done} : x))}><span className="habit-icon">{h.icon}</span><div><strong>{h.name}</strong><small>🔥 {h.streak} дней подряд</small></div><span className="habit-check">✓</span></button>)}</div></section>
      <section className="card goals-card"><CardHead title="Цепочка целей" subtitle="От видения к действию" action="Все цели" onClick={() => navigate("Цели")}/><div className="goal-chain"><div><span>2026</span><strong>Создать устойчивую систему жизни</strong><em>ГОД</em></div><i>→</i><div><span>Q3</span><strong>Запустить и внедрить NEXUS OS</strong><em>КВАРТАЛ</em></div><i>→</i><div className="current"><span>ИЮЛЬ</span><strong>Собрать рабочий MVP</strong><em>МЕСЯЦ</em></div></div><div className="week-goal"><span>Эта неделя</span><div><b>3 / 5 ключевых результатов</b><small>60%</small></div><div className="mini-track"><i style={{width:"60%"}}/></div></div></section>
    </div>
    <section className="bottom-grid"><div className="card project-mini"><CardHead title="Активные проекты" subtitle={`${projects.length} в работе`} action="Открыть" onClick={() => navigate("Проекты")}/>{projects.slice(0,3).map(p => <button className="project-row project-row-button" onClick={() => navigate("Проекты")} key={p.id}><div className="project-badge">{p.name[0]}</div><div><strong>{p.name}</strong><span><i style={{width:`${p.progress}%`}}/></span></div><b>{p.progress}%</b></button>)}</div><div className="card reflection"><div><span className="eyebrow">ВЕЧЕРНИЙ РАЗБОР</span><h3>Как прошёл твой день?</h3><p>Пять минут рефлексии помогают замечать прогресс и двигаться осознаннее.</p></div><button onClick={() => navigate("Журнал")}>Начать разбор <span>→</span></button></div></section>
  </>;
}

function CardHead({ title, subtitle, action, onClick }: { title: string; subtitle: string; action?: string; onClick?: () => void }) { return <div className="card-head"><div><h3>{title}</h3><span>{subtitle}</span></div>{action && <button onClick={onClick}>{action} →</button>}</div>; }

function PageTitle({ eyebrow, title, text, action, onAction }: { eyebrow: string; title: string; text: string; action?: string; onAction?: () => void }) { return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action && <button className="primary" onClick={onAction}>＋ {action}</button>}</div>; }

function TasksPage({ tasks, setTasks, onNew }: { tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; onNew: () => void }) {
  const [filter, setFilter] = useState<"active" | "done" | "all">("active");
  const visible = tasks.filter(t => filter === "all" || (filter === "done" ? t.done : !t.done));
  return <><PageTitle eyebrow="ДЕЙСТВИЕ" title="Задачи" text="Один ясный список — без перегруза и шума." action="Новая задача" onAction={onNew}/><div className="stats-strip"><Stat value={tasks.filter(t=>!t.done).length.toString()} label="В работе"/><Stat value={tasks.filter(t=>t.done).length.toString()} label="Выполнено"/><Stat value={`${tasks.length * 40} мин`} label="Запланировано"/><Stat value={`${tasks.length ? Math.round(tasks.filter(t=>t.done).length/tasks.length*100) : 0}%`} label="Темп недели"/></div><section className="card full-card"><div className="filter-row"><button className={filter==="active"?"active":""} onClick={()=>setFilter("active")}>В работе</button><button className={filter==="done"?"active":""} onClick={()=>setFilter("done")}>Выполнено</button><button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>Все</button><span/><button onClick={onNew}>＋ Добавить</button></div><div className="large-task-list">{visible.length ? visible.map(t=><label key={t.id} className={t.done?"done":""}><input type="checkbox" checked={t.done} onChange={()=>setTasks(v=>v.map(x=>x.id===t.id?{...x,done:!x.done}:x))}/><span className={`check ${t.priority}`}>✓</span><div><strong>{t.title}</strong><small><b>{t.area}</b> · {t.time} · {t.priority === "high" ? "Высокий приоритет" : t.priority === "medium" ? "Средний приоритет" : "Низкий приоритет"}</small></div><button aria-label="Удалить задачу" onClick={e=>{e.preventDefault();setTasks(v=>v.filter(x=>x.id!==t.id))}}>×</button></label>) : <EmptyState text="В этом списке пока ничего нет" action="Создать задачу" onClick={onNew}/>}</div></section></>;
}

function GoalsPage({goals,setGoals,onNew}:{goals:Goal[];setGoals:React.Dispatch<React.SetStateAction<Goal[]>>;onNew:()=>void}){return <><PageTitle eyebrow="НАПРАВЛЕНИЕ" title="Цели" text="Связь ежедневных действий с тем, каким человеком вы хотите стать." action="Новая цель" onAction={onNew}/><section className="timeline-chain">{goals.map((goal,i)=><div className={i===2?"accent":""} key={goal.id}><em>{goal.period}</em><span>{goal.date}</span><h3>{goal.title}</h3><p>{goal.note}</p><div className="entity-actions"><button onClick={()=>setGoals(v=>v.map(g=>g.id===goal.id?{...g,progress:Math.min(100,g.progress+10)}:g))}>＋10%</button><button onClick={()=>setGoals(v=>v.filter(g=>g.id!==goal.id))}>Удалить</button></div><b>{goal.progress}%</b></div>)}</section></>}

function ProjectsPage({projects,setProjects,onNew}:{projects:Project[];setProjects:React.Dispatch<React.SetStateAction<Project[]>>;onNew:()=>void}){return <><PageTitle eyebrow="СИСТЕМЫ" title="Проекты" text="Переводим большие замыслы в ясные этапы и следующие действия." action="Новый проект" onAction={onNew}/><div className="project-grid">{projects.map((p,i)=><article className="card project-card" key={p.id}><div className={`project-cover p${i%3}`}><span>{p.area}</span><b>{p.progress}%</b></div><div className="project-info"><h3>{p.name}</h3><p>Следующий шаг: {p.next}</p><div className="mini-track"><i style={{width:`${p.progress}%`}}/></div><div><span>Срок: {p.due}</span><span>В работе</span></div><div className="project-actions"><button onClick={()=>setProjects(v=>v.map(x=>x.id===p.id?{...x,progress:Math.min(100,x.progress+10)}:x))}>Продвинуть +10%</button><button onClick={()=>setProjects(v=>v.filter(x=>x.id!==p.id))}>Удалить</button></div></div></article>)}{!projects.length&&<EmptyState text="Создайте первый проект и определите следующий шаг" action="Новый проект" onClick={onNew}/>}</div></>}

function HabitsPage({habits,setHabits,onNew}:{habits:typeof habitsSeed;setHabits:React.Dispatch<React.SetStateAction<typeof habitsSeed>>;onNew:()=>void}){return <><PageTitle eyebrow="РИТМ" title="Привычки" text="Небольшие действия, которые формируют вашу идентичность." action="Новая привычка" onAction={onNew}/><div className="stats-strip"><Stat value={Math.max(...habits.map(h=>h.streak),0).toString()} label="Лучший streak"/><Stat value={`${Math.round(habits.filter(h=>h.done).length/Math.max(habits.length,1)*100)}%`} label="Стабильность"/><Stat value={`${habits.filter(h=>h.done).length}/${habits.length}`} label="Сегодня"/><Stat value="+12%" label="К прошлой неделе"/></div><div className="habit-week card"><div className="week-head"><h3>Эта неделя</h3>{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(d=><span key={d}>{d}</span>)}</div>{habits.map((h,i)=><div className="habit-week-row" key={`${h.name}-${i}`}><div><span>{h.icon}</span><strong>{h.name}</strong><small>🔥 {h.streak}</small></div>{[0,1,2,3,4,5,6].map(d=><button aria-label={`${h.name}, день ${d+1}`} onClick={()=>setHabits(v=>v.map((x,j)=>j===i?{...x,done:d===0?!x.done:x.done,streak:d===0&&!x.done?x.streak+1:x.streak}:x))} className={(d>0&&d<5)|| (d===0&&h.done)?"hit":""} key={d}>✓</button>)}</div>)}</div></>}

function FinancePage({transactions,setTransactions,onNew}:{transactions:Transaction[];setTransactions:React.Dispatch<React.SetStateAction<Transaction[]>>;onNew:()=>void}){
  const income=transactions.filter(t=>t.type==="income").reduce((sum,t)=>sum+t.amount,0);
  const expenses=transactions.filter(t=>t.type==="expense").reduce((sum,t)=>sum+t.amount,0);
  const budget=16000;
  const categories=[["Жильё",5600,6000],["Продукты",2470,3500],["Транспорт",620,1200],["Развитие",980,1600],["Другое",Math.max(0,expenses-9670),3700]];
  return <><PageTitle eyebrow="РЕСУРСЫ" title="Финансы" text="Спокойный контроль денег и движение к финансовой свободе." action="Операция" onAction={onNew}/><div className="finance-hero"><div><small>КАПИТАЛ</small><strong>{formatIls(68420)}</strong><span>↑ 4,8% за месяц</span></div><div><small>ДОХОД · ИЮЛЬ</small><strong>{formatIls(income)}</strong><span>план {formatIls(20000)}</span></div><div><small>РАСХОДЫ · ИЮЛЬ</small><strong>{formatIls(expenses)}</strong><span>{Math.round(expenses/budget*100)}% месячного бюджета</span></div><div><small>СВОБОДНЫЙ ОСТАТОК</small><strong className="lime">{formatIls(income-expenses)}</strong><span>{income ? Math.round((income-expenses)/income*100) : 0}% нормы сбережений</span></div></div><div className="finance-grid"><section className="card budget"><CardHead title="Бюджет июля" subtitle={`${formatIls(expenses)} из ${formatIls(budget)}`} action="Добавить" onClick={onNew}/>{categories.map(x=><div key={x[0] as string}><span>{x[0]}</span><div className="mini-track"><i style={{width:`${Math.min(100,Number(x[1])/Number(x[2])*100)}%`}}/></div><b>{formatIls(Number(x[1]))}</b></div>)}</section><section className="card savings"><CardHead title="Цели накоплений" subtitle="2 активные цели"/><div className="saving-ring"><Ring value={42} color="#c9ff4c" size={116}/><div><strong>Финансовая подушка</strong><p>{formatIls(42000)} из {formatIls(100000)}</p><small>При текущем темпе — март 2027</small></div></div><div className="saving-ring"><Ring value={68} color="#b8a6ff" size={82}/><div><strong>Путешествие в Японию</strong><p>{formatIls(27200)} из {formatIls(40000)}</p></div></div></section></div><section className="card transactions"><CardHead title="Последние операции" subtitle={`${transactions.length} записей`} action="Новая операция" onClick={onNew}/>{transactions.map(t=><div className="transaction-row" key={t.id}><span className={t.type}>{t.type==="income"?"↑":"↓"}</span><div><strong>{t.title}</strong><small>{t.category} · {t.date}</small></div><b className={t.type}>{t.type==="income"?"+":"−"}{formatIls(t.amount)}</b><button onClick={()=>setTransactions(v=>v.filter(x=>x.id!==t.id))}>×</button></div>)}</section></>}

function HealthPage({onNew,notify}:{onNew:()=>void;notify:(v:string)=>void}){const[note,setNote]=useState("");return <><PageTitle eyebrow="СОСТОЯНИЕ" title="Здоровье" text="Следите за сигналами тела, энергией и восстановлением." action="Записать метрику" onAction={onNew}/><div className="health-grid">{[["Сон","7ч 42м","качество 84%","☾"],["Энергия","8 / 10","стабильно весь день","⚡"],["Активность","8 462","шагов сегодня","↗"],["Вес","78,4 кг","−0,8 кг за месяц","◎"]].map(x=><article className="card health-stat" key={x[0]}><span>{x[3]}</span><small>{x[0]}</small><strong>{x[1]}</strong><p>{x[2]}</p></article>)}</div><div className="health-bottom"><section className="card energy-chart"><CardHead title="Энергия за 7 дней" subtitle="Среднее: 7,4"/><div className="bars">{[52,68,62,81,74,88,79].map((h,i)=><div key={i}><i style={{height:`${h}%`}}/><span>{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][i]}</span></div>)}</div></section><section className="card note-card"><span className="eyebrow">ЗАМЕТКА О СОСТОЯНИИ</span><h3>Что замечаешь сегодня?</h3><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Энергия, самочувствие, симптомы, мысли..."/><button onClick={()=>{if(note.trim()){localStorage.setItem("nexus-health-note",note);notify("Заметка о здоровье сохранена");setNote("")}}}>Сохранить заметку</button></section></div></>}

function PlanningPage({events,setEvents,onNew}:{events:CalendarEvent[];setEvents:React.Dispatch<React.SetStateAction<CalendarEvent[]>>;onNew:()=>void}){const days=["Пн 27","Вт 28","Ср 29","Чт 30","Пт 31","Сб 01","Вс 02"];return <><PageTitle eyebrow="ВРЕМЯ" title="Планирование" text="Неделя как целостная картина: фокус, встречи и пространство для жизни." action="Событие" onAction={onNew}/><section className="week-calendar card"><div className="calendar-hours">{["08:00","10:00","12:00","14:00","16:00","18:00","20:00"].map(x=><span key={x}>{x}</span>)}</div>{days.map((d,i)=><div className="calendar-day" key={d}><strong>{d}</strong>{events.filter(e=>e.day===i).map((event,j)=><button title="Нажмите, чтобы удалить" onClick={()=>setEvents(v=>v.filter(x=>x.id!==event.id))} className={`event ${event.tone}-event`} style={{top:70+j*82,height:68}} key={event.id}>{event.title}<small>{event.time}</small></button>)}</div>)}</section></>}

function JournalPage({notify}:{notify:(v:string)=>void}){const [text,setText]=useState("");const[mood,setMood]=useState(4);const[step,setStep]=useState(1);const prompts=["Что сегодня получилось хорошо?","Что можно было сделать иначе?","За что ты благодарен сегодня?","Какой главный фокус на завтра?"];function next(){if(!text.trim())return;if(step<4){setStep(v=>v+1);setText("")}else{const old=JSON.parse(localStorage.getItem("nexus-journal")||"[]");localStorage.setItem("nexus-journal",JSON.stringify([{date:new Date().toISOString(),mood,text},...old]));notify("Вечерний разбор завершён");setStep(1);setText("")}}return <><PageTitle eyebrow="РЕФЛЕКСИЯ" title="Вечерний разбор" text="Закройте день осознанно и освободите голову для отдыха."/><div className="journal-layout"><section className="card journal-form"><span className="step-label">0{step} / 04</span><h2>{prompts[step-1]}</h2><p>Даже маленькие наблюдения помогают видеть движение.</p><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Напиши несколько честных строк..."/><div className="mood-row"><span>Энергия дня</span>{[1,2,3,4,5].map(x=><button onClick={()=>setMood(x)} className={mood===x?"active":""} key={x}>{x}</button>)}</div><button className="primary" onClick={next}>{step===4?"Завершить разбор":"Продолжить →"}</button></section><aside className="card journal-history"><CardHead title="Последние записи" subtitle="Серия: 6 дней"/>{["Воскресенье, 26 июля","Суббота, 25 июля","Пятница, 24 июля"].map((x,i)=><button key={x}><span>{x}</span><strong>{["Спокойный день, много времени с близкими...","Хорошая тренировка и прогулка...","Сфокусировался на важном проекте..."][i]}</strong></button>)}</aside></div></>}

function SettingsPage({byok,setByok,notify}:{byok:string;setByok:(v:string)=>void;notify:(v:string)=>void}){
  const [tab,setTab]=useState("AI-ассистент");
  function save(){localStorage.setItem("nexus-byok",byok);notify("Настройки сохранены")}
  function reset(){localStorage.removeItem("nexus-state");localStorage.removeItem("nexus-journal");notify("Локальные данные очищены. Обновите страницу")}
  return <><PageTitle eyebrow="СИСТЕМА" title="Настройки" text="Персонализируйте NEXUS OS под свой ритм и стиль работы."/><div className="settings-layout"><aside className="settings-nav">{[["✦","AI-ассистент"],["◉","Профиль"],["♢","Уведомления"],["◐","Внешний вид"],["⇄","Данные"]].map(x=><button className={tab===x[1]?"active":""} onClick={()=>setTab(x[1])} key={x[1]}>{x[0]} {x[1]}</button>)}</aside><section className="card settings-card">{tab==="AI-ассистент"?<><div className="settings-title"><span className="ai-orb">✦</span><div><h2>NEXUS AI</h2><p>Помогает превращать мысли в ясные цели и действия.</p></div><label className="switch"><input type="checkbox" defaultChecked/><i/></label></div><div className="secure-option"><div><strong>Рекомендуемый режим · серверный ключ</strong><p>Добавьте <code>OPENAI_API_KEY</code> в переменные окружения Vercel. Ключ остаётся на сервере и никогда не попадает в браузер.</p></div><span>БЕЗОПАСНО</span></div><div className="setting-field"><label>Модель ассистента</label><select defaultValue="gpt-5-mini"><option>gpt-5-mini</option><option>gpt-5.2</option></select><small>Настраивается на сервере через OPENAI_MODEL.</small></div><div className="divider"><span>ИЛИ · BYOK ДЛЯ ЛОКАЛЬНОГО ИСПОЛЬЗОВАНИЯ</span></div><div className="warning"><b>!</b><p><strong>Ключ в браузере менее безопасен</strong>Он хранится только на этом устройстве в localStorage и отправляется вашему API-маршруту при запросе.</p></div><div className="setting-field"><label>Личный OpenAI API key</label><div className="key-input"><input type="password" value={byok} onChange={e=>setByok(e.target.value)} placeholder="sk-proj-••••••••••••••••"/><button onClick={()=>setByok("")}>Очистить</button></div></div><button className="primary" onClick={save}>Сохранить локально</button></>:tab==="Профиль"?<SettingsPlaceholder title="Профиль" text="Имя и рабочий режим используются для персонализации интерфейса." button="Сохранить профиль" onClick={save}/>:tab==="Уведомления"?<SettingsPlaceholder title="Уведомления" text="Напоминания о дневном фокусе, привычках и вечернем разборе." button="Сохранить уведомления" onClick={save}/>:tab==="Внешний вид"?<SettingsPlaceholder title="Внешний вид" text="Тёмная тема NEXUS активна. Светлая тема появится в следующем обновлении." button="Применить" onClick={save}/>:<SettingsPlaceholder title="Локальные данные" text="Все созданные задачи, проекты и операции хранятся только в этом браузере." button="Очистить локальные данные" onClick={reset}/>}</section></div></>}

function SettingsPlaceholder({title,text,button,onClick}:{title:string;text:string;button:string;onClick:()=>void}){return <div className="settings-placeholder"><span className="eyebrow">НАСТРОЙКИ</span><h2>{title}</h2><p>{text}</p><div className="setting-field"><label>Статус</label><input value="Активно" readOnly/></div><button className="primary" onClick={onClick}>{button}</button></div>}

function EmptyState({text,action,onClick}:{text:string;action:string;onClick:()=>void}){return <div className="empty-state"><span>＋</span><strong>{text}</strong><button onClick={onClick}>{action}</button></div>}

function CreateModal({kind,onClose,onCreate,notify}:{kind:Exclude<ModalKind,null>;onClose:()=>void;onCreate:(data:Project|Goal|Transaction|CalendarEvent|typeof habitsSeed[number]|Record<string,unknown>)=>void;notify:(v:string)=>void}){
  const titles:Record<Exclude<ModalKind,null>,string>={task:"Новая задача",project:"Новый проект",goal:"Новая цель",habit:"Новая привычка",transaction:"Новая операция",health:"Метрика здоровья",event:"Новое событие"};
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const fd=new FormData(e.currentTarget);const value=(key:string)=>String(fd.get(key)||"").trim();const id=Date.now();
    if(kind==="project")onCreate({id,name:value("name"),area:value("area")||"Личное",progress:0,due:value("due")||"Без срока",next:value("next")||"Определить следующий шаг"});
    if(kind==="goal")onCreate({id,period:value("period")||"МЕСЯЦ",date:value("date")||"Сейчас",title:value("name"),note:value("note")||"Новая цель",progress:0});
    if(kind==="habit")onCreate({name:value("name"),streak:0,done:false,icon:value("icon")||"✦"});
    if(kind==="transaction")onCreate({id,title:value("name"),category:value("category")||"Другое",amount:Number(value("amount")),type:value("type") as "income"|"expense",date:"Сегодня"});
    if(kind==="event")onCreate({id,title:value("name"),day:Number(value("day")),time:value("time")||"09:00",tone:value("tone") as CalendarEvent["tone"]});
    if(kind==="health"){localStorage.setItem("nexus-health-metric",JSON.stringify({id,name:value("name"),value:value("metric"),date:new Date().toISOString()}));onCreate({id});notify("Метрика здоровья записана")}
  }
  return <div className="modal-wrap" onMouseDown={onClose}><form className="quick-modal entity-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><div><span className="eyebrow">NEXUS · СОЗДАНИЕ</span><button type="button" onClick={onClose}>×</button></div><h2>{titles[kind]}</h2>
    {(kind==="project"||kind==="goal"||kind==="habit"||kind==="transaction"||kind==="health"||kind==="event")&&<Field label={kind==="transaction"?"Название операции":kind==="health"?"Показатель":"Название"} name="name" placeholder={kind==="project"?"Например, запустить курс":kind==="event"?"Например, встреча с командой":"Введите название"}/>} 
    {kind==="project"&&<div className="modal-grid"><Field label="Сфера" name="area" placeholder="Работа"/><Field label="Срок" name="due" placeholder="31 августа"/><div className="span-2"><Field label="Следующий шаг" name="next" placeholder="Первое конкретное действие"/></div></div>}
    {kind==="goal"&&<><div className="modal-grid"><label className="modal-field"><span>Период</span><select name="period"><option>ГОД</option><option>КВАРТАЛ</option><option>МЕСЯЦ</option><option>НЕДЕЛЯ</option><option>СЕГОДНЯ</option></select></label><Field label="Дата" name="date" placeholder="Q4 / Август"/></div><Field label="Зачем это важно" name="note" placeholder="Критерий результата"/></>}
    {kind==="habit"&&<Field label="Символ" name="icon" placeholder="✦"/>}
    {kind==="transaction"&&<div className="modal-grid"><Field label="Сумма, ₪" name="amount" type="number" placeholder="250"/><label className="modal-field"><span>Тип</span><select name="type"><option value="expense">Расход</option><option value="income">Доход</option></select></label><div className="span-2"><Field label="Категория" name="category" placeholder="Продукты"/></div></div>}
    {kind==="health"&&<Field label="Значение" name="metric" placeholder="Например, 78,4 кг"/>}
    {kind==="event"&&<div className="modal-grid"><label className="modal-field"><span>День</span><select name="day">{["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"].map((d,i)=><option value={i} key={d}>{d}</option>)}</select></label><Field label="Время" name="time" type="time" placeholder="09:00"/><label className="modal-field span-2"><span>Цвет</span><select name="tone"><option value="lime">Лайм</option><option value="purple">Фиолетовый</option><option value="orange">Оранжевый</option></select></label></div>}
    <button className="primary modal-submit" type="submit">Создать и сохранить</button></form></div>
}

function Field({label,name,placeholder,type="text"}:{label:string;name:string;placeholder:string;type?:string}){return <label className="modal-field"><span>{label}</span><input required name={name} type={type} placeholder={placeholder}/></label>}

function Stat({value,label}:{value:string;label:string}){return <div><strong>{value}</strong><span>{label}</span></div>}
