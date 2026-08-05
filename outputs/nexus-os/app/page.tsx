"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Section = "Обзор" | "Задачи" | "Цели" | "Проекты" | "Привычки" | "Финансы" | "Здоровье" | "Планирование" | "Журнал" | "Настройки";
type Task = { id: number; title: string; area: string; time: string; done: boolean; priority: "high" | "medium" | "low" };

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

const projects = [
  { name: "Запуск NEXUS OS", area: "Работа", progress: 68, due: "12 авг", next: "Собрать MVP dashboard" },
  { name: "Финансовая подушка", area: "Финансы", progress: 42, due: "31 дек", next: "Настроить автоперевод" },
  { name: "Полумарафон", area: "Здоровье", progress: 56, due: "21 сен", next: "Интервальная тренировка" },
];

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
  const [showQuick, setShowQuick] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([
    { role: "assistant", text: "Привет! Я вижу твой день целиком. Могу помочь расставить приоритеты, разбить цель на шаги или создать план проекта." },
  ]);
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [byok, setByok] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("nexus-state");
      if (saved) {
        try { const parsed = JSON.parse(saved); if (parsed.tasks) setTasks(parsed.tasks); if (parsed.habits) setHabits(parsed.habits); } catch { /* use demo data */ }
      }
      setByok(localStorage.getItem("nexus-byok") || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { localStorage.setItem("nexus-state", JSON.stringify({ tasks, habits })); }, [tasks, habits]);

  const completion = useMemo(() => Math.round(tasks.filter(t => t.done).length / tasks.length * 100), [tasks]);

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
    if (section === "Обзор") return <Dashboard tasks={tasks} setTasks={setTasks} habits={habits} setHabits={setHabits} completion={completion} navigate={setSection} />;
    if (section === "Задачи") return <TasksPage tasks={tasks} setTasks={setTasks} />;
    if (section === "Цели") return <GoalsPage />;
    if (section === "Проекты") return <ProjectsPage />;
    if (section === "Привычки") return <HabitsPage habits={habits} setHabits={setHabits} />;
    if (section === "Финансы") return <FinancePage />;
    if (section === "Здоровье") return <HealthPage />;
    if (section === "Планирование") return <PlanningPage />;
    if (section === "Журнал") return <JournalPage />;
    return <SettingsPage byok={byok} setByok={setByok} />;
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><span className="brand-mark">N</span><div><strong>NEXUS</strong><small>PERSONAL OS</small></div><button className="mobile-close" onClick={() => setMobileNav(false)}>×</button></div>
      <nav>{nav.map(group => <div className="nav-group" key={group.group}><p>{group.group}</p>{group.items.map(item => <button key={item.label} className={section === item.label ? "active" : ""} onClick={() => { setSection(item.label); setMobileNav(false); }}><span>{item.icon}</span>{item.label}{item.label === "Задачи" && <em>{tasks.filter(t => !t.done).length}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-foot"><div className="level"><div className="level-top"><span>Уровень 12</span><b>2 840 XP</b></div><div className="mini-track"><i style={{ width: "72%" }} /></div><small>160 XP до нового уровня</small></div><div className="profile"><div className="avatar">А</div><div><strong>Алексей</strong><small>В продуктивном режиме</small></div><span className="online" /></div></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Закрыть меню" />}
    <main className="main">
      <header><button className="menu-button" onClick={() => setMobileNav(true)}>☰</button><div className="breadcrumbs"><span>МОЯ СИСТЕМА</span><b>/</b><strong>{section.toUpperCase()}</strong></div><div className="top-actions"><div className="search">⌕ <input aria-label="Поиск" placeholder="Найти что угодно..." /><kbd>⌘ K</kbd></div><IconButton label="Уведомления">♢<i /></IconButton><button className="assistant-mini" onClick={() => setAssistantOpen(true)}><span>✦</span> Спросить NEXUS</button></div></header>
      <div className="page">{content()}</div>
    </main>
    <button className="ai-fab" onClick={() => setAssistantOpen(true)} aria-label="Открыть AI-ассистента"><span>✦</span><i /></button>
    {showQuick && <div className="modal-wrap" onMouseDown={() => setShowQuick(false)}><form className="quick-modal" onSubmit={addTask} onMouseDown={e => e.stopPropagation()}><div><span className="eyebrow">БЫСТРОЕ ДОБАВЛЕНИЕ</span><button type="button" onClick={() => setShowQuick(false)}>×</button></div><h2>Новая задача</h2><input autoFocus value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Что нужно сделать?" /><div className="form-row"><button type="button" className="chip">Сегодня</button><button type="button" className="chip">Средний приоритет</button></div><button className="primary" type="submit">Добавить задачу <span>↵</span></button></form></div>}
    {assistantOpen && <aside className="assistant-panel"><div className="assistant-head"><div><span className="ai-orb">✦</span><div><strong>NEXUS AI</strong><small><i /> онлайн · контекст включён</small></div></div><button onClick={() => setAssistantOpen(false)}>×</button></div><div className="assistant-context"><span>Сейчас вижу</span><b>{tasks.filter(t => !t.done).length} задач · {habits.filter(h => h.done).length}/4 привычки · {section}</b></div><div className="messages">{messages.map((m, i) => <div key={i} className={`message ${m.role}`}>{m.text}</div>)}{thinking && <div className="message assistant typing">Анализирую контекст…</div>}</div><div className="suggestions"><button onClick={() => setPrompt("Разбери мой день и предложи главный приоритет")}>Разобрать мой день</button><button onClick={() => setPrompt("Помоги разбить цель на шаги")}>Разбить цель</button></div><form className="assistant-form" onSubmit={askAssistant}><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Напиши, что хочешь изменить или создать..." /><button type="submit">↑</button></form><small className="ai-note">ИИ предлагает изменения — вы подтверждаете их перед применением</small></aside>}
    <button className="quick-add" onClick={() => setShowQuick(true)}>＋ <span>Добавить</span></button>
  </div>;
}

function Dashboard({ tasks, setTasks, habits, setHabits, completion, navigate }: { tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; habits: typeof habitsSeed; setHabits: React.Dispatch<React.SetStateAction<typeof habitsSeed>>; completion: number; navigate: (v: Section) => void }) {
  return <>
    <section className="hero-row"><div><span className="eyebrow">ПОНЕДЕЛЬНИК · 27 ИЮЛЯ</span><h1>Доброе утро, Алексей <span>✦</span></h1><p>Сегодня хороший день, чтобы продвинуть то, что действительно важно.</p></div><div className="day-score"><Ring value={78} color="#c9ff4c" size={76}/><div><small>БАЛАНС ДНЯ</small><strong>Уверенный ритм</strong><span>↑ 6% к прошлой неделе</span></div></div></section>
    <section className="focus-card"><div className="focus-glow"/><div className="focus-top"><span><i>01</i> ГЛАВНЫЙ ФОКУС ДНЯ</span><button>•••</button></div><div className="focus-content"><div><h2>Закончить основу NEXUS OS</h2><p>Собрать ключевые экраны и подготовить первую рабочую версию.</p><div className="tag-row"><span>◈ Проект · NEXUS OS</span><span>◷ 2 ч 30 мин</span><span className="energy">⚡ Высокая энергия</span></div></div><button className="focus-action" onClick={() => navigate("Проекты")}>Войти в фокус <span>→</span></button></div></section>
    <div className="dashboard-grid"><section className="card today-card"><CardHead title="Сегодня" subtitle={`${tasks.filter(t => t.done).length} из ${tasks.length} выполнено`} action="Все задачи" onClick={() => navigate("Задачи")}/><div className="progress-line"><i style={{width: `${completion}%`}}/></div><div className="task-list">{tasks.slice(0,4).map(task => <label className={task.done ? "done" : ""} key={task.id}><input type="checkbox" checked={task.done} onChange={() => setTasks(v => v.map(t => t.id === task.id ? {...t, done: !t.done} : t))}/><span className={`check ${task.priority}`}>✓</span><div><strong>{task.title}</strong><small>{task.area}</small></div><time>{task.time}</time></label>)}</div></section>
      <section className="card compass"><CardHead title="Компас жизни" subtitle="Баланс ключевых сфер" action="Подробнее"/><div className="compass-body"><div className="radar"><div className="radar-lines"/><div className="radar-shape"/><span className="r1">Энергия</span><span className="r2">Здоровье</span><span className="r3">Финансы</span><span className="r4">Развитие</span><span className="r5">Отношения</span></div><div className="area-list">{areas.map(a => <div key={a.name}><span><i style={{background: a.color}}/>{a.name}</span><b>{a.value}</b></div>)}</div></div></section>
      <section className="card habits-card"><CardHead title="Привычки" subtitle="Сегодня" action="Все привычки" onClick={() => navigate("Привычки")}/><div className="habit-list">{habits.map((h, i) => <button key={h.name} className={h.done ? "complete" : ""} onClick={() => setHabits(v => v.map((x,j) => j === i ? {...x, done: !x.done} : x))}><span className="habit-icon">{h.icon}</span><div><strong>{h.name}</strong><small>🔥 {h.streak} дней подряд</small></div><span className="habit-check">✓</span></button>)}</div></section>
      <section className="card goals-card"><CardHead title="Цепочка целей" subtitle="От видения к действию" action="Все цели" onClick={() => navigate("Цели")}/><div className="goal-chain"><div><span>2026</span><strong>Создать устойчивую систему жизни</strong><em>ГОД</em></div><i>→</i><div><span>Q3</span><strong>Запустить и внедрить NEXUS OS</strong><em>КВАРТАЛ</em></div><i>→</i><div className="current"><span>ИЮЛЬ</span><strong>Собрать рабочий MVP</strong><em>МЕСЯЦ</em></div></div><div className="week-goal"><span>Эта неделя</span><div><b>3 / 5 ключевых результатов</b><small>60%</small></div><div className="mini-track"><i style={{width:"60%"}}/></div></div></section>
    </div>
    <section className="bottom-grid"><div className="card project-mini"><CardHead title="Активные проекты" subtitle="3 в работе" action="Открыть" onClick={() => navigate("Проекты")}/>{projects.map(p => <div className="project-row" key={p.name}><div className="project-badge">{p.name[0]}</div><div><strong>{p.name}</strong><span><i style={{width:`${p.progress}%`}}/></span></div><b>{p.progress}%</b></div>)}</div><div className="card reflection"><div><span className="eyebrow">ВЕЧЕРНИЙ РАЗБОР</span><h3>Как прошёл твой день?</h3><p>Пять минут рефлексии помогают замечать прогресс и двигаться осознаннее.</p></div><button onClick={() => navigate("Журнал")}>Начать разбор <span>→</span></button></div></section>
  </>;
}

function CardHead({ title, subtitle, action, onClick }: { title: string; subtitle: string; action?: string; onClick?: () => void }) { return <div className="card-head"><div><h3>{title}</h3><span>{subtitle}</span></div>{action && <button onClick={onClick}>{action} →</button>}</div>; }

function PageTitle({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: string }) { return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action && <button className="primary">＋ {action}</button>}</div>; }

function TasksPage({ tasks, setTasks }: { tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>> }) { return <><PageTitle eyebrow="ДЕЙСТВИЕ" title="Задачи" text="Один ясный список — без перегруза и шума." action="Новая задача"/><div className="stats-strip"><Stat value={tasks.filter(t=>!t.done).length.toString()} label="В работе"/><Stat value={tasks.filter(t=>t.done).length.toString()} label="Выполнено"/><Stat value="3ч 20м" label="Запланировано"/><Stat value="82%" label="Темп недели"/></div><section className="card full-card"><div className="filter-row"><button className="active">Сегодня</button><button>Неделя</button><button>Все</button><span/><button>≡ Фильтр</button></div><div className="large-task-list">{tasks.map(t=><label key={t.id} className={t.done?"done":""}><input type="checkbox" checked={t.done} onChange={()=>setTasks(v=>v.map(x=>x.id===t.id?{...x,done:!x.done}:x))}/><span className={`check ${t.priority}`}>✓</span><div><strong>{t.title}</strong><small><b>{t.area}</b> · {t.time} · {t.priority === "high" ? "Высокий приоритет" : "Обычный приоритет"}</small></div><button onClick={()=>setTasks(v=>v.filter(x=>x.id!==t.id))}>×</button></label>)}</div></section></>; }

function GoalsPage(){return <><PageTitle eyebrow="НАПРАВЛЕНИЕ" title="Цели" text="Связь ежедневных действий с тем, каким человеком вы хотите стать." action="Новая цель"/><section className="timeline-chain"><div><em>ГОД</em><span>2026</span><h3>Создать устойчивую систему жизни</h3><p>Жить осознанно, свободно и с запасом энергии.</p><b>54%</b></div><div><em>КВАРТАЛ</em><span>Q3</span><h3>Запустить и внедрить NEXUS OS</h3><p>Единая система вместо разрозненных инструментов.</p><b>61%</b></div><div className="accent"><em>МЕСЯЦ</em><span>Июль</span><h3>Собрать рабочий MVP</h3><p>Dashboard, планирование и ежедневные ритуалы.</p><b>68%</b></div><div><em>НЕДЕЛЯ</em><span>Неделя 31</span><h3>Закрыть ключевые экраны</h3><p>Пять измеримых результатов.</p><b>60%</b></div><div><em>СЕГОДНЯ</em><span>27 июля</span><h3>Закончить основу</h3><p>2 часа 30 минут глубокого фокуса.</p><b>32%</b></div></section></>}

function ProjectsPage(){return <><PageTitle eyebrow="СИСТЕМЫ" title="Проекты" text="Переводим большие замыслы в ясные этапы и следующие действия." action="Новый проект"/><div className="project-grid">{projects.map((p,i)=><article className="card project-card" key={p.name}><div className={`project-cover p${i}`}><span>{p.area}</span><b>{p.progress}%</b></div><div className="project-info"><h3>{p.name}</h3><p>Следующий шаг: {p.next}</p><div className="mini-track"><i style={{width:`${p.progress}%`}}/></div><div><span>Срок: {p.due}</span><span>{i+3} задач в работе</span></div></div></article>)}</div></>}

function HabitsPage({habits,setHabits}:{habits:typeof habitsSeed;setHabits:React.Dispatch<React.SetStateAction<typeof habitsSeed>>}){return <><PageTitle eyebrow="РИТМ" title="Привычки" text="Небольшие действия, которые формируют вашу идентичность." action="Новая привычка"/><div className="stats-strip"><Stat value="11" label="Лучший streak"/><Stat value="76%" label="Стабильность"/><Stat value={`${habits.filter(h=>h.done).length}/4`} label="Сегодня"/><Stat value="+12%" label="К прошлой неделе"/></div><div className="habit-week card"><div className="week-head"><h3>Эта неделя</h3>{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(d=><span key={d}>{d}</span>)}</div>{habits.map((h,i)=><div className="habit-week-row" key={h.name}><div><span>{h.icon}</span><strong>{h.name}</strong><small>🔥 {h.streak}</small></div>{[0,1,2,3,4,5,6].map(d=><button onClick={()=>d===0&&setHabits(v=>v.map((x,j)=>j===i?{...x,done:!x.done}:x))} className={(d>0&&d<5)|| (d===0&&h.done)?"hit":""} key={d}>✓</button>)}</div>)}</div></>}

function FinancePage(){return <><PageTitle eyebrow="РЕСУРСЫ" title="Финансы" text="Спокойный контроль денег и движение к финансовой свободе." action="Операция"/><div className="finance-hero"><div><small>КАПИТАЛ</small><strong>₽ 824 560</strong><span>↑ 4,8% за месяц</span></div><div><small>ДОХОД · ИЮЛЬ</small><strong>₽ 286 000</strong><span>план ₽ 300 000</span></div><div><small>РАСХОДЫ · ИЮЛЬ</small><strong>₽ 164 280</strong><span>71% месячного бюджета</span></div><div><small>СВОБОДНЫЙ ОСТАТОК</small><strong className="lime">₽ 121 720</strong><span>42,5% нормы сбережений</span></div></div><div className="finance-grid"><section className="card budget"><CardHead title="Бюджет июля" subtitle="₽ 164 280 из ₽ 230 000" action="Категории"/>{[["Жильё",65000,65000],["Продукты",28700,40000],["Транспорт",12600,20000],["Развитие",18500,25000],["Другое",39480,80000]].map(x=><div key={x[0] as string}><span>{x[0]}</span><div className="mini-track"><i style={{width:`${Number(x[1])/Number(x[2])*100}%`}}/></div><b>₽ {Number(x[1]).toLocaleString("ru-RU")}</b></div>)}</section><section className="card savings"><CardHead title="Цели накоплений" subtitle="2 активные цели"/><div className="saving-ring"><Ring value={42} color="#c9ff4c" size={116}/><div><strong>Финансовая подушка</strong><p>₽ 420 000 из ₽ 1 000 000</p><small>При текущем темпе — март 2027</small></div></div><div className="saving-ring"><Ring value={68} color="#b8a6ff" size={82}/><div><strong>Путешествие в Японию</strong><p>₽ 272 000 из ₽ 400 000</p></div></div></section></div></>}

function HealthPage(){return <><PageTitle eyebrow="СОСТОЯНИЕ" title="Здоровье" text="Следите за сигналами тела, энергией и восстановлением." action="Записать метрику"/><div className="health-grid">{[["Сон","7ч 42м","качество 84%","☾"],["Энергия","8 / 10","стабильно весь день","⚡"],["Активность","8 462","шагов сегодня","↗"],["Вес","78,4 кг","−0,8 кг за месяц","◎"]].map(x=><article className="card health-stat" key={x[0]}><span>{x[3]}</span><small>{x[0]}</small><strong>{x[1]}</strong><p>{x[2]}</p></article>)}</div><div className="health-bottom"><section className="card energy-chart"><CardHead title="Энергия за 7 дней" subtitle="Среднее: 7,4"/><div className="bars">{[52,68,62,81,74,88,79].map((h,i)=><div key={i}><i style={{height:`${h}%`}}/><span>{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][i]}</span></div>)}</div></section><section className="card note-card"><span className="eyebrow">ЗАМЕТКА О СОСТОЯНИИ</span><h3>Что замечаешь сегодня?</h3><textarea placeholder="Энергия, самочувствие, симптомы, мысли..."/><button>Сохранить заметку</button></section></div></>}

function PlanningPage(){return <><PageTitle eyebrow="ВРЕМЯ" title="Планирование" text="Неделя как целостная картина: фокус, встречи и пространство для жизни." action="Событие"/><section className="week-calendar card"><div className="calendar-hours">{["08:00","10:00","12:00","14:00","16:00","18:00","20:00"].map(x=><span key={x}>{x}</span>)}</div>{["Пн 27","Вт 28","Ср 29","Чт 30","Пт 31","Сб 01","Вс 02"].map((d,i)=><div className="calendar-day" key={d}><strong>{d}</strong>{i===0&&<><i className="event lime-event" style={{top:70,height:96}}>Глубокий фокус<small>09:00–11:00</small></i><i className="event purple-event" style={{top:244,height:66}}>Тренировка<small>15:00</small></i></>}{i===2&&<i className="event purple-event" style={{top:140,height:82}}>Созвон команды<small>11:30</small></i>}{i===4&&<i className="event orange-event" style={{top:218,height:100}}>Обзор недели<small>14:30</small></i>}</div>)}</section></>}

function JournalPage(){const [text,setText]=useState("");return <><PageTitle eyebrow="РЕФЛЕКСИЯ" title="Вечерний разбор" text="Закройте день осознанно и освободите голову для отдыха."/><div className="journal-layout"><section className="card journal-form"><span className="step-label">01 / 04</span><h2>Что сегодня получилось хорошо?</h2><p>Даже маленькие победы заслуживают внимания.</p><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Сегодня я рад, что..."/><div className="mood-row"><span>Энергия дня</span>{["1","2","3","4","5"].map((x,i)=><button className={i===3?"active":""} key={x}>{x}</button>)}</div><button className="primary">Продолжить →</button></section><aside className="card journal-history"><CardHead title="Последние записи" subtitle="Серия: 6 дней"/>{["Воскресенье, 26 июля","Суббота, 25 июля","Пятница, 24 июля"].map((x,i)=><button key={x}><span>{x}</span><strong>{["Спокойный день, много времени с близкими...","Хорошая тренировка и прогулка...","Сфокусировался на важном проекте..."][i]}</strong></button>)}</aside></div></>}

function SettingsPage({byok,setByok}:{byok:string;setByok:(v:string)=>void}){const [saved,setSaved]=useState(false);function save(){localStorage.setItem("nexus-byok",byok);setSaved(true);setTimeout(()=>setSaved(false),2000)}return <><PageTitle eyebrow="СИСТЕМА" title="Настройки" text="Персонализируйте NEXUS OS под свой ритм и стиль работы."/><div className="settings-layout"><aside className="settings-nav"><button className="active">✦ AI-ассистент</button><button>◉ Профиль</button><button>♢ Уведомления</button><button>◐ Внешний вид</button><button>⇄ Данные</button></aside><section className="card settings-card"><div className="settings-title"><span className="ai-orb">✦</span><div><h2>NEXUS AI</h2><p>Помогает превращать мысли в ясные цели и действия.</p></div><label className="switch"><input type="checkbox" defaultChecked/><i/></label></div><div className="secure-option"><div><strong>Рекомендуемый режим · серверный ключ</strong><p>Добавьте <code>OPENAI_API_KEY</code> в переменные окружения Vercel. Ключ остаётся на сервере и никогда не попадает в браузер.</p></div><span>БЕЗОПАСНО</span></div><div className="setting-field"><label>Модель ассистента</label><select defaultValue="gpt-5-mini"><option>gpt-5-mini</option><option>gpt-5.2</option></select><small>Настраивается на сервере через OPENAI_MODEL.</small></div><div className="divider"><span>ИЛИ · BYOK ДЛЯ ЛОКАЛЬНОГО ИСПОЛЬЗОВАНИЯ</span></div><div className="warning"><b>!</b><p><strong>Ключ в браузере менее безопасен</strong>Он хранится только на этом устройстве в localStorage и отправляется вашему API-маршруту при запросе. Не используйте этот режим на чужом или общем компьютере.</p></div><div className="setting-field"><label>Личный OpenAI API key</label><div className="key-input"><input type="password" value={byok} onChange={e=>setByok(e.target.value)} placeholder="sk-proj-••••••••••••••••"/><button onClick={()=>setByok("")}>Очистить</button></div></div><button className="primary" onClick={save}>{saved?"Сохранено ✓":"Сохранить локально"}</button></section></div></>}

function Stat({value,label}:{value:string;label:string}){return <div><strong>{value}</strong><span>{label}</span></div>}
