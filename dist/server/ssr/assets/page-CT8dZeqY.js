import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region lib/supabase-rest.ts
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";
var publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
var sessionKey = "nexus-supabase-session";
var isSupabaseConfigured = Boolean(projectUrl && publishableKey);
function headers(accessToken, extra) {
	return {
		apikey: publishableKey,
		"Content-Type": "application/json",
		...accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
		...extra
	};
}
async function parseResponse(response) {
	const body = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(body.error_description || body.message || body.msg || "Supabase вернул ошибку");
	return body;
}
function normalizeSession(session) {
	const expiresAt = session.expires_at || (session.expires_in ? Math.floor(Date.now() / 1e3) + session.expires_in : void 0);
	return {
		...session,
		expires_at: expiresAt
	};
}
function saveSupabaseSession(session) {
	if (typeof window === "undefined") return;
	if (!session) localStorage.removeItem(sessionKey);
	else localStorage.setItem(sessionKey, JSON.stringify(normalizeSession(session)));
}
function readSupabaseSession() {
	if (typeof window === "undefined") return null;
	try {
		const stored = JSON.parse(localStorage.getItem(sessionKey) || "null");
		return stored?.access_token && stored?.refresh_token && stored?.user?.id ? stored : null;
	} catch {
		return null;
	}
}
async function signInWithPassword(email, password) {
	if (!isSupabaseConfigured) throw new Error("Сначала добавьте параметры Supabase в переменные окружения");
	const session = normalizeSession(await parseResponse(await fetch(`${projectUrl}/auth/v1/token?grant_type=password`, {
		method: "POST",
		headers: headers(),
		body: JSON.stringify({
			email,
			password
		})
	})));
	saveSupabaseSession(session);
	return session;
}
async function signUpWithPassword(email, password) {
	if (!isSupabaseConfigured) throw new Error("Сначала добавьте параметры Supabase в переменные окружения");
	const result = await parseResponse(await fetch(`${projectUrl}/auth/v1/signup`, {
		method: "POST",
		headers: headers(),
		body: JSON.stringify({
			email,
			password,
			data: { product: "NEXUS OS" }
		})
	}));
	if (result.access_token) {
		const session = normalizeSession(result);
		saveSupabaseSession(session);
		return session;
	}
	return null;
}
async function refreshSupabaseSession(session) {
	if (!isSupabaseConfigured) return null;
	const refreshed = normalizeSession(await parseResponse(await fetch(`${projectUrl}/auth/v1/token?grant_type=refresh_token`, {
		method: "POST",
		headers: headers(),
		body: JSON.stringify({ refresh_token: session.refresh_token })
	})));
	saveSupabaseSession(refreshed);
	return refreshed;
}
async function ensureFreshSession(session) {
	if (!session) return null;
	const expiresAtMs = (session.expires_at || 0) * 1e3;
	if (!expiresAtMs || expiresAtMs - Date.now() > 6e4) return session;
	try {
		return await refreshSupabaseSession(session);
	} catch {
		saveSupabaseSession(null);
		return null;
	}
}
async function signOutSupabase(session) {
	if (session && isSupabaseConfigured) await fetch(`${projectUrl}/auth/v1/logout`, {
		method: "POST",
		headers: headers(session.access_token)
	}).catch(() => void 0);
	saveSupabaseSession(null);
}
async function loadCloudState(session) {
	const fresh = await ensureFreshSession(session);
	if (!fresh) throw new Error("Сессия истекла — войдите снова");
	return {
		session: fresh,
		row: (await parseResponse(await fetch(`${projectUrl}/rest/v1/nexus_user_state?user_id=eq.${encodeURIComponent(fresh.user.id)}&select=payload,updated_at&limit=1`, {
			headers: headers(fresh.access_token),
			cache: "no-store"
		})))[0] || null
	};
}
async function saveCloudState(session, payload) {
	const fresh = await ensureFreshSession(session);
	if (!fresh) throw new Error("Сессия истекла — войдите снова");
	const response = await fetch(`${projectUrl}/rest/v1/nexus_user_state?on_conflict=user_id`, {
		method: "POST",
		headers: headers(fresh.access_token, { Prefer: "resolution=merge-duplicates,return=minimal" }),
		body: JSON.stringify({
			user_id: fresh.user.id,
			payload,
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		})
	});
	if (!response.ok) await parseResponse(response);
	return fresh;
}
//#endregion
//#region app/page.tsx
var import_jsx_runtime = require_jsx_runtime();
var defaultDashboardOrder = [
	"dayCenter",
	"focus",
	"game",
	"tracker",
	"today",
	"compass",
	"habits",
	"goals",
	"projects",
	"reflection"
];
var seedGamification = {
	xp: 2840,
	events: [],
	activeDays: [],
	dailyScores: []
};
var gameBlockLabels = {
	dayCenter: "Умный центр дня",
	focus: "Фокус дня",
	game: "Уровень и XP",
	tracker: "Трекер",
	today: "Задачи",
	compass: "Компас",
	habits: "Привычки",
	goals: "Цели",
	projects: "Проекты",
	reflection: "Разбор дня"
};
var nav = [
	{
		group: "Пространство",
		items: [
			{
				label: "Обзор",
				icon: "◈"
			},
			{
				label: "Задачи",
				icon: "✓"
			},
			{
				label: "Цели",
				icon: "◎"
			},
			{
				label: "Проекты",
				icon: "▦"
			}
		]
	},
	{
		group: "Сферы жизни",
		items: [
			{
				label: "Привычки",
				icon: "↗"
			},
			{
				label: "Финансы",
				icon: "₪"
			},
			{
				label: "Здоровье",
				icon: "+"
			}
		]
	},
	{
		group: "Рефлексия",
		items: [
			{
				label: "Планирование",
				icon: "□"
			},
			{
				label: "Журнал",
				icon: "✦"
			},
			{
				label: "Настройки",
				icon: "⚙"
			}
		]
	}
];
var seedTasks = [
	{
		id: 1,
		title: "Завершить структуру лендинга",
		area: "Карьера",
		time: "10:00",
		done: false,
		priority: "high",
		projectId: 1,
		duration: 90,
		energy: "high",
		context: "computer"
	},
	{
		id: 2,
		title: "Тренировка: спина и плечи",
		area: "Здоровье",
		time: "13:30",
		done: false,
		priority: "medium",
		duration: 60,
		energy: "high",
		context: "outside"
	},
	{
		id: 3,
		title: "Разобрать расходы за неделю",
		area: "Финансы",
		time: "17:00",
		done: false,
		priority: "low",
		duration: 30,
		energy: "low",
		context: "computer"
	},
	{
		id: 4,
		title: "Прочитать 20 страниц",
		area: "Развитие",
		time: "21:00",
		done: true,
		priority: "low",
		duration: 25,
		energy: "low",
		context: "anywhere"
	}
];
var seedProjects = [
	{
		id: 1,
		name: "Запуск NEXUS OS",
		area: "Карьера",
		progress: 68,
		due: "12 авг",
		next: "Собрать MVP dashboard",
		cover: "linear-gradient(135deg,#2c2455,#7c4dff 58%,#d565ff)",
		milestones: [{
			id: 11,
			title: "Готова структура продукта",
			done: true
		}, {
			id: 12,
			title: "Проверены основные сценарии",
			done: false
		}]
	},
	{
		id: 2,
		name: "Финансовая подушка",
		area: "Финансы",
		progress: 42,
		due: "31 дек",
		next: "Настроить автоперевод",
		cover: "linear-gradient(135deg,#142c31,#198a78 58%,#6ee7b7)",
		milestones: [{
			id: 21,
			title: "Определить целевую сумму",
			done: true
		}, {
			id: 22,
			title: "Накопить первый месяц расходов",
			done: false
		}]
	},
	{
		id: 3,
		name: "Полумарафон",
		area: "Здоровье",
		progress: 56,
		due: "21 сен",
		next: "Интервальная тренировка",
		cover: "linear-gradient(135deg,#332316,#d36a2e 55%,#ffb45e)",
		milestones: [{
			id: 31,
			title: "Пробежать 10 км без остановки",
			done: true
		}, {
			id: 32,
			title: "Пройти контрольную дистанцию 15 км",
			done: false
		}]
	}
];
var seedGoals = [
	{
		id: 1,
		period: "ГОД",
		date: "2026",
		title: "Создать устойчивую систему жизни",
		note: "Жить осознанно, свободно и с запасом энергии.",
		progress: 54
	},
	{
		id: 2,
		period: "КВАРТАЛ",
		date: "Q3",
		title: "Запустить и внедрить NEXUS OS",
		note: "Единая система вместо разрозненных инструментов.",
		progress: 61,
		projectIds: [1]
	},
	{
		id: 3,
		period: "МЕСЯЦ",
		date: "Август",
		title: "Собрать рабочий MVP",
		note: "Dashboard, планирование и ежедневные ритуалы.",
		progress: 68,
		projectIds: [1]
	},
	{
		id: 4,
		period: "НЕДЕЛЯ",
		date: "Эта неделя",
		title: "Закрыть ключевые экраны",
		note: "Пять измеримых результатов.",
		progress: 60,
		projectIds: [1, 3]
	},
	{
		id: 5,
		period: "СЕГОДНЯ",
		date: "Сегодня",
		title: "Закончить основу",
		note: "2 часа 30 минут глубокого фокуса.",
		progress: 32,
		projectIds: [1]
	}
];
var seedHabitNames = [
	{
		id: 1,
		name: "Стакан воды утром",
		icon: "◒"
	},
	{
		id: 2,
		name: "10 минут медитации",
		icon: "◌"
	},
	{
		id: 3,
		name: "Чтение · 20 страниц",
		icon: "▤"
	},
	{
		id: 4,
		name: "Без телефона после 22:30",
		icon: "☾"
	}
];
var seedLifeAreas = [
	{
		id: 1,
		name: "Карьера",
		icon: "💼",
		color: "#9f7aea",
		standard: "Каждую неделю завершать один важный результат",
		reviewScore: 72
	},
	{
		id: 2,
		name: "Здоровье",
		icon: "❤️",
		color: "#ff6b7d",
		standard: "Сон, движение и восстановление без перегрузки",
		reviewScore: 78
	},
	{
		id: 3,
		name: "Финансы",
		icon: "💰",
		color: "#ffb45e",
		standard: "Тратить по плану и ежемесячно увеличивать резерв",
		reviewScore: 64
	},
	{
		id: 4,
		name: "Развитие",
		icon: "🧠",
		color: "#b8a6ff",
		standard: "Учиться через практику и фиксировать выводы",
		reviewScore: 70
	},
	{
		id: 5,
		name: "Отношения",
		icon: "🤝",
		color: "#57e0b7",
		standard: "Быть внимательным и поддерживать регулярный контакт",
		reviewScore: 74
	},
	{
		id: 6,
		name: "Отдых",
		icon: "🌿",
		color: "#7ddf84",
		standard: "Оставлять время без задач и экранов",
		reviewScore: 58
	}
];
var seedInboxItems = [{
	id: 101,
	title: "Проверить идею еженедельного обзора",
	kind: "idea",
	createdAt: "2026-08-05T08:30:00.000Z",
	area: "Развитие"
}, {
	id: 102,
	title: "Записаться на профилактический осмотр",
	kind: "task",
	createdAt: "2026-08-05T09:00:00.000Z",
	area: "Здоровье"
}];
var seedResources = [
	{
		id: 201,
		title: "Чек-лист запуска продукта",
		kind: "reference",
		area: "Карьера",
		note: "Последовательность проверки идеи, MVP и релиза.",
		projectId: 1
	},
	{
		id: 202,
		title: "Правила личного бюджета",
		kind: "note",
		area: "Финансы",
		note: "Сначала резерв и постоянные платежи, затем гибкие категории."
	},
	{
		id: 203,
		title: "План подготовки к забегу",
		kind: "link",
		area: "Здоровье",
		note: "Недельный объём, восстановление и контрольные дистанции.",
		projectId: 3
	}
];
var seedFinanceCategories = [
	{
		id: 1,
		name: "Продукты",
		icon: "🛒"
	},
	{
		id: 2,
		name: "Жильё",
		icon: "🏠"
	},
	{
		id: 3,
		name: "Транспорт",
		icon: "🚕"
	},
	{
		id: 4,
		name: "Здоровье",
		icon: "❤️"
	},
	{
		id: 5,
		name: "Развитие",
		icon: "📚"
	},
	{
		id: 6,
		name: "Отдых",
		icon: "🎟️"
	},
	{
		id: 7,
		name: "Покупки",
		icon: "🛍️"
	},
	{
		id: 8,
		name: "Другое",
		icon: "•••"
	}
];
var seedBudgetLines = [
	{
		id: 1,
		category: "Жильё",
		limit: 6e3
	},
	{
		id: 2,
		category: "Продукты",
		limit: 3500
	},
	{
		id: 3,
		category: "Транспорт",
		limit: 1200
	},
	{
		id: 4,
		category: "Здоровье",
		limit: 900
	},
	{
		id: 5,
		category: "Развитие",
		limit: 1600
	},
	{
		id: 6,
		category: "Отдых",
		limit: 1200
	},
	{
		id: 7,
		category: "Покупки",
		limit: 1e3
	},
	{
		id: 8,
		category: "Другое",
		limit: 600
	}
];
var seedRecurringExpenses = [
	{
		id: 1,
		title: "Аренда квартиры",
		category: "Жильё",
		amount: 5600,
		accountId: 2,
		dayOfMonth: 2,
		active: true,
		lastProcessedPeriod: "2026-08"
	},
	{
		id: 2,
		title: "Медицинская страховка",
		category: "Здоровье",
		amount: 320,
		accountId: 2,
		dayOfMonth: 10,
		active: true
	},
	{
		id: 3,
		title: "Мобильная связь",
		category: "Другое",
		amount: 89,
		accountId: 3,
		dayOfMonth: 15,
		active: true
	}
];
var seedAccounts = [
	{
		id: 1,
		name: "Наличные",
		type: "cash",
		balance: 1250
	},
	{
		id: 2,
		name: "Основной счёт",
		type: "debit",
		balance: 18450
	},
	{
		id: 3,
		name: "Кредитная карта",
		type: "credit",
		balance: -3400,
		linkedAccountId: 2,
		billingDay: 15
	}
];
var seedTransactions = [
	{
		id: 1,
		title: "Зарплата",
		category: "Доход",
		amount: 18500,
		kind: "income",
		date: "2026-08-01",
		accountId: 2,
		posted: true
	},
	{
		id: 2,
		title: "Аренда квартиры",
		category: "Жильё",
		amount: 5600,
		kind: "expense",
		date: "2026-08-02",
		accountId: 2,
		posted: true
	},
	{
		id: 3,
		title: "Продукты",
		category: "Продукты",
		amount: 247,
		kind: "expense",
		date: "2026-08-04",
		accountId: 1,
		posted: true
	}
];
var seedEvents = [
	{
		id: 1,
		title: "Глубокий фокус",
		day: 1,
		time: "09:00",
		tone: "lime"
	},
	{
		id: 2,
		title: "Тренировка",
		day: 1,
		time: "15:00",
		tone: "purple"
	},
	{
		id: 3,
		title: "Созвон команды",
		day: 3,
		time: "11:30",
		tone: "purple"
	},
	{
		id: 4,
		title: "Обзор недели",
		day: 5,
		time: "14:30",
		tone: "orange"
	}
];
var dayNames = [
	"Вс",
	"Пн",
	"Вт",
	"Ср",
	"Чт",
	"Пт",
	"Сб"
];
var formatIls = (value) => new Intl.NumberFormat("he-IL", {
	style: "currency",
	currency: "ILS",
	maximumFractionDigits: 0
}).format(value);
var newEntityId = () => Date.now() * 1e3 + Math.floor(Math.random() * 1e3);
function uniqueEntityIds(items) {
	const seen = /* @__PURE__ */ new Set();
	return items.map((item) => {
		const id = Number(item.id);
		if (Number.isFinite(id) && !seen.has(id)) {
			seen.add(id);
			return item;
		}
		const replacement = newEntityId();
		seen.add(replacement);
		return {
			...item,
			id: replacement
		};
	});
}
var localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
var prettyDate = (value) => (/* @__PURE__ */ new Date(`${value}T12:00:00`)).toLocaleDateString("ru-RU", {
	day: "numeric",
	month: "short"
});
var energyLabel = {
	low: "Низкая энергия",
	medium: "Средняя энергия",
	high: "Высокая энергия"
};
var contextLabel = {
	anywhere: "Где угодно",
	computer: "За компьютером",
	phone: "Телефон",
	home: "Дома",
	outside: "Вне дома"
};
function habitClock(now = /* @__PURE__ */ new Date()) {
	const activeDay = new Date(now);
	if (activeDay.getDay() === 0 && activeDay.getHours() < 5) activeDay.setDate(activeDay.getDate() - 1);
	const start = new Date(activeDay);
	start.setDate(start.getDate() - start.getDay());
	start.setHours(5, 0, 0, 0);
	const dates = Array.from({ length: 7 }, (_, i) => {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		return d;
	});
	return {
		weekStart: localDateKey(start),
		today: localDateKey(activeDay),
		dates
	};
}
function nextBillingDate(index, billingDay = 15) {
	const now = /* @__PURE__ */ new Date();
	return localDateKey(new Date(now.getFullYear(), now.getMonth() + 1 + index, billingDay, 12));
}
function startOfWeek(date = /* @__PURE__ */ new Date()) {
	const start = new Date(date);
	start.setHours(12, 0, 0, 0);
	start.setDate(start.getDate() - start.getDay());
	return start;
}
function normalizeCalendarEvents(raw) {
	const source = Array.isArray(raw) ? raw : seedEvents;
	const currentWeekStart = startOfWeek(/* @__PURE__ */ new Date());
	return uniqueEntityIds(source.map((event) => {
		if (event.date) return event;
		const fixedDate = new Date(currentWeekStart);
		fixedDate.setDate(fixedDate.getDate() + Math.max(0, Math.min(6, Number(event.day || 0))));
		return {
			...event,
			date: localDateKey(fixedDate)
		};
	}));
}
function projectCoverStyle(cover) {
	if (!cover) return {};
	return { backgroundImage: cover.startsWith("data:image") ? `linear-gradient(#090a0e22,#090a0e88),url(${cover})` : cover };
}
function projectProgressValue(project, tasks) {
	const linkedTasks = tasks.filter((task) => task.projectId === project.id && !task.archived);
	if (linkedTasks.length) return Math.round(linkedTasks.filter((task) => task.done).length / linkedTasks.length * 100);
	const milestones = project.milestones || [];
	if (milestones.length) return Math.round(milestones.filter((item) => item.done).length / milestones.length * 100);
	return project.progress;
}
function goalProgressValue(goal, projects, tasks) {
	const linked = projects.filter((project) => goal.projectIds?.includes(project.id) && !project.archived);
	if (!linked.length) return goal.progress;
	return Math.round(linked.reduce((sum, project) => sum + projectProgressValue(project, tasks), 0) / linked.length);
}
function normalizeDashboardOrder(raw) {
	const allowed = new Set(defaultDashboardOrder);
	const stored = Array.isArray(raw) ? raw.filter((item) => typeof item === "string" && allowed.has(item)) : [];
	return [...new Set(stored), ...defaultDashboardOrder.filter((item) => !stored.includes(item))];
}
function normalizeGamification(raw) {
	if (!raw || typeof raw !== "object") return seedGamification;
	const value = raw;
	return {
		xp: Number.isFinite(value.xp) ? Math.max(0, Number(value.xp)) : seedGamification.xp,
		events: Array.isArray(value.events) ? value.events.slice(0, 500) : [],
		activeDays: Array.isArray(value.activeDays) ? value.activeDays.filter((item) => typeof item === "string").slice(-120) : [],
		dailyScores: Array.isArray(value.dailyScores) ? value.dailyScores.slice(-60) : []
	};
}
function gameLevel(xp) {
	const step = 250;
	const safeXp = Math.max(0, Math.round(xp));
	const level = Math.floor(safeXp / step) + 1;
	const current = safeXp % step;
	return {
		level,
		current,
		step,
		progress: Math.round(current / step * 100),
		remaining: step - current
	};
}
function gameStreak(activeDays) {
	const days = new Set(activeDays);
	const cursor = /* @__PURE__ */ new Date();
	if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
	let streak = 0;
	while (days.has(localDateKey(cursor))) {
		streak += 1;
		cursor.setDate(cursor.getDate() - 1);
	}
	return streak;
}
function addGameEvents(current, drafts) {
	const known = new Set(current.events.map((event) => event.key));
	const fresh = drafts.filter((draft) => {
		if (known.has(draft.key)) return false;
		known.add(draft.key);
		return true;
	});
	if (!fresh.length) return current;
	const today = localDateKey(/* @__PURE__ */ new Date());
	const events = fresh.map((draft, index) => ({
		...draft,
		id: newEntityId() + index,
		date: draft.date || today
	}));
	const activeDays = new Set(current.activeDays);
	events.filter((event) => event.delta > 0).forEach((event) => activeDays.add(event.date));
	return {
		...current,
		xp: Math.max(0, current.xp + events.reduce((sum, event) => sum + event.delta, 0)),
		events: [...events, ...current.events].slice(0, 500),
		activeDays: [...activeDays].sort().slice(-120)
	};
}
function settleDueInstallments(accounts, entries) {
	const today = localDateKey(/* @__PURE__ */ new Date());
	const nextAccounts = accounts.map((a) => ({ ...a }));
	return {
		accounts: nextAccounts,
		entries: entries.map((entry) => {
			if (entry.kind !== "installment" || entry.posted || !entry.dueDate || entry.dueDate > today) return entry;
			const credit = nextAccounts.find((a) => a.id === entry.accountId);
			const debit = nextAccounts.find((a) => a.id === credit?.linkedAccountId);
			if (credit && debit) {
				debit.balance -= entry.amount;
				credit.balance += entry.amount;
			}
			return {
				...entry,
				posted: true,
				date: entry.dueDate
			};
		})
	};
}
function applyDueRecurringExpenses(accounts, entries, recurring, now = /* @__PURE__ */ new Date()) {
	const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const today = now.getDate();
	const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const nextAccounts = accounts.map((account) => ({ ...account }));
	const nextEntries = [...entries];
	let processed = 0;
	return {
		accounts: nextAccounts,
		entries: nextEntries,
		recurring: recurring.map((item) => {
			const dueDay = Math.min(maxDay, Math.max(1, item.dayOfMonth));
			const alreadyPosted = item.lastProcessedPeriod === period || nextEntries.some((entry) => entry.recurringId === item.id && entry.recurringPeriod === period);
			if (!item.active || alreadyPosted || today < dueDay) return item;
			const account = nextAccounts.find((candidate) => candidate.id === item.accountId);
			if (!account) return item;
			account.balance -= item.amount;
			nextEntries.unshift({
				id: newEntityId() + processed,
				title: item.title,
				category: item.category,
				amount: item.amount,
				kind: "expense",
				date: `${period}-${String(dueDay).padStart(2, "0")}`,
				accountId: item.accountId,
				posted: true,
				recurringId: item.id,
				recurringPeriod: period
			});
			processed += 1;
			return {
				...item,
				lastProcessedPeriod: period
			};
		}),
		processed
	};
}
function normalizeHabits(raw, storedHistory) {
	const clock = habitClock();
	const source = Array.isArray(raw) && raw.length ? raw : seedHabitNames;
	const history = [...storedHistory];
	return {
		habits: uniqueEntityIds(source.map((item, index) => {
			const old = item;
			const checks = old.checks && typeof old.checks === "object" ? old.checks : old.done ? { [clock.today]: true } : {};
			const habit = {
				id: Number(old.id || index + 1),
				name: String(old.name || `Привычка ${index + 1}`),
				icon: String(old.icon || "✦"),
				checks,
				weekStart: String(old.weekStart || clock.weekStart),
				area: String(old.area || "Здоровье")
			};
			if (habit.weekStart !== clock.weekStart) {
				if (!history.some((h) => h.habitId === habit.id && h.weekStart === habit.weekStart)) history.push({
					id: newEntityId() + index,
					habitId: habit.id,
					habitName: habit.name,
					weekStart: habit.weekStart,
					completed: Object.values(habit.checks).filter(Boolean).length,
					total: 7,
					checks: habit.checks
				});
				return {
					...habit,
					checks: {},
					weekStart: clock.weekStart
				};
			}
			return habit;
		})),
		history: uniqueEntityIds(history)
	};
}
function Ring({ value, color, size = 70 }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "ring",
		style: {
			width: size,
			height: size,
			background: `conic-gradient(${color} ${Math.max(0, Math.min(100, value)) * 3.6}deg, var(--ring-track,#262a30) 0deg)`
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "%" })] })
	});
}
function IconButton({ children, label, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: "icon-button",
		"aria-label": label,
		onClick,
		children
	});
}
function Home() {
	const initialClock = habitClock();
	const [section, setSection] = (0, import_react.useState)("Обзор");
	const [tasks, setTasks] = (0, import_react.useState)(seedTasks);
	const [projects, setProjects] = (0, import_react.useState)(seedProjects);
	const [inboxItems, setInboxItems] = (0, import_react.useState)(seedInboxItems);
	const [resources, setResources] = (0, import_react.useState)(seedResources);
	const [goals, setGoals] = (0, import_react.useState)(seedGoals);
	const [habits, setHabits] = (0, import_react.useState)(seedHabitNames.map((h) => ({
		...h,
		checks: {},
		weekStart: initialClock.weekStart
	})));
	const [lifeAreas, setLifeAreas] = (0, import_react.useState)(seedLifeAreas);
	const [financeCategories, setFinanceCategories] = (0, import_react.useState)(seedFinanceCategories);
	const [budgetLines, setBudgetLines] = (0, import_react.useState)(seedBudgetLines);
	const [recurringExpenses, setRecurringExpenses] = (0, import_react.useState)(seedRecurringExpenses);
	const [habitHistory, setHabitHistory] = (0, import_react.useState)([]);
	const [accounts, setAccounts] = (0, import_react.useState)(seedAccounts);
	const [transactions, setTransactions] = (0, import_react.useState)(seedTransactions);
	const [events, setEvents] = (0, import_react.useState)(() => normalizeCalendarEvents(seedEvents));
	const [planningFocuses, setPlanningFocuses] = (0, import_react.useState)({});
	const [healthNotes, setHealthNotes] = (0, import_react.useState)([]);
	const [journalEntries, setJournalEntries] = (0, import_react.useState)([]);
	const [weeklyReviews, setWeeklyReviews] = (0, import_react.useState)([]);
	const [modalKind, setModalKind] = (0, import_react.useState)(null);
	const [taskProjectId, setTaskProjectId] = (0, import_react.useState)(null);
	const [selectedProjectId, setSelectedProjectId] = (0, import_react.useState)(null);
	const [editingHabit, setEditingHabit] = (0, import_react.useState)(null);
	const [theme, setTheme] = (0, import_react.useState)("lime");
	const [dashboardOrder, setDashboardOrder] = (0, import_react.useState)(defaultDashboardOrder);
	const [gamification, setGamification] = (0, import_react.useState)(seedGamification);
	const [assistantOpen, setAssistantOpen] = (0, import_react.useState)(false);
	const [authOpen, setAuthOpen] = (0, import_react.useState)(false);
	const [authSession, setAuthSession] = (0, import_react.useState)(null);
	const [syncStatus, setSyncStatus] = (0, import_react.useState)("local");
	const [cloudReady, setCloudReady] = (0, import_react.useState)(false);
	const [lastSyncedAt, setLastSyncedAt] = (0, import_react.useState)("");
	const [undoStack, setUndoStack] = (0, import_react.useState)([]);
	const [mobileNav, setMobileNav] = (0, import_react.useState)(false);
	const [messages, setMessages] = (0, import_react.useState)([{
		role: "assistant",
		text: "Скажите, что нужно сделать. Я сразу добавлю задачи, цели или проекты в NEXUS — без лишних вопросов."
	}]);
	const [prompt, setPrompt] = (0, import_react.useState)("");
	const [thinking, setThinking] = (0, import_react.useState)(false);
	const [byok, setByok] = (0, import_react.useState)("");
	const [toast, setToast] = (0, import_react.useState)("");
	const [search, setSearch] = (0, import_react.useState)("");
	const [loaded, setLoaded] = (0, import_react.useState)(false);
	const [, setClockTick] = (0, import_react.useState)(0);
	const gameSnapshotRef = (0, import_react.useRef)(null);
	const authSessionRef = (0, import_react.useRef)(null);
	const statePayloadRef = (0, import_react.useRef)({});
	const lastCloudUpdatedRef = (0, import_react.useRef)("");
	const applyStoredState = (0, import_react.useCallback)((parsed) => {
		const storedHistory = Array.isArray(parsed.habitHistory) ? parsed.habitHistory : [];
		const normalized = normalizeHabits(parsed.habits, storedHistory);
		const storedRecurring = uniqueEntityIds(Array.isArray(parsed.recurringExpenses) ? parsed.recurringExpenses : seedRecurringExpenses);
		const financial = settleDueInstallments(uniqueEntityIds(Array.isArray(parsed.accounts) ? parsed.accounts : seedAccounts), uniqueEntityIds(Array.isArray(parsed.transactions) ? parsed.transactions : seedTransactions));
		const withRecurring = applyDueRecurringExpenses(financial.accounts, financial.entries, storedRecurring);
		if (Array.isArray(parsed.tasks)) setTasks(uniqueEntityIds(parsed.tasks));
		if (Array.isArray(parsed.projects)) setProjects(uniqueEntityIds(parsed.projects));
		if (Array.isArray(parsed.inboxItems)) setInboxItems(uniqueEntityIds(parsed.inboxItems));
		if (Array.isArray(parsed.resources)) setResources(uniqueEntityIds(parsed.resources));
		if (Array.isArray(parsed.goals)) setGoals(uniqueEntityIds(parsed.goals));
		if (Array.isArray(parsed.lifeAreas) && parsed.lifeAreas.length) setLifeAreas(uniqueEntityIds(parsed.lifeAreas));
		if (Array.isArray(parsed.financeCategories) && parsed.financeCategories.length) setFinanceCategories(uniqueEntityIds(parsed.financeCategories));
		if (Array.isArray(parsed.budgetLines) && parsed.budgetLines.length) setBudgetLines(uniqueEntityIds(parsed.budgetLines));
		setHabits(normalized.habits);
		setHabitHistory(normalized.history);
		setAccounts(withRecurring.accounts);
		setTransactions(withRecurring.entries);
		setRecurringExpenses(withRecurring.recurring);
		setEvents(normalizeCalendarEvents(parsed.events));
		if (parsed.planningFocuses && typeof parsed.planningFocuses === "object") setPlanningFocuses(parsed.planningFocuses);
		else if (typeof parsed.planningNote === "string" && parsed.planningNote) setPlanningFocuses({ [localDateKey(startOfWeek(/* @__PURE__ */ new Date()))]: parsed.planningNote });
		if (Array.isArray(parsed.healthNotes)) setHealthNotes(uniqueEntityIds(parsed.healthNotes));
		if (Array.isArray(parsed.journalEntries)) setJournalEntries(uniqueEntityIds(parsed.journalEntries));
		if (Array.isArray(parsed.weeklyReviews)) setWeeklyReviews(uniqueEntityIds(parsed.weeklyReviews));
		setDashboardOrder(normalizeDashboardOrder(parsed.dashboardOrder));
		setGamification(normalizeGamification(parsed.gamification));
	}, [
		setTasks,
		setProjects,
		setInboxItems,
		setResources,
		setGoals,
		setLifeAreas,
		setFinanceCategories,
		setBudgetLines,
		setHabits,
		setHabitHistory,
		setAccounts,
		setTransactions,
		setRecurringExpenses,
		setEvents,
		setPlanningFocuses,
		setHealthNotes,
		setJournalEntries,
		setWeeklyReviews,
		setDashboardOrder,
		setGamification
	]);
	(0, import_react.useEffect)(() => {
		const timer = window.setTimeout(() => {
			try {
				applyStoredState(JSON.parse(localStorage.getItem("nexus-state") || "{}"));
			} catch {}
			setByok(localStorage.getItem("nexus-byok") || "");
			const storedTheme = localStorage.getItem("nexus-theme");
			setTheme(storedTheme === "orbit" || storedTheme === "light" ? storedTheme : "lime");
			const hashSection = decodeURIComponent(window.location.hash.slice(1));
			if (nav.some((group) => group.items.some((item) => item.label === hashSection))) setSection(hashSection);
			setLoaded(true);
		}, 0);
		return () => window.clearTimeout(timer);
	}, [applyStoredState]);
	const statePayload = (0, import_react.useMemo)(() => ({
		tasks,
		projects,
		inboxItems,
		resources,
		goals,
		habits,
		lifeAreas,
		financeCategories,
		budgetLines,
		recurringExpenses,
		habitHistory,
		accounts,
		transactions,
		events,
		planningFocuses,
		planningNote: planningFocuses[localDateKey(startOfWeek(/* @__PURE__ */ new Date()))] || "",
		healthNotes,
		journalEntries,
		weeklyReviews,
		dashboardOrder,
		gamification
	}), [
		tasks,
		projects,
		inboxItems,
		resources,
		goals,
		habits,
		lifeAreas,
		financeCategories,
		budgetLines,
		recurringExpenses,
		habitHistory,
		accounts,
		transactions,
		events,
		planningFocuses,
		healthNotes,
		journalEntries,
		weeklyReviews,
		dashboardOrder,
		gamification
	]);
	(0, import_react.useEffect)(() => {
		statePayloadRef.current = statePayload;
	}, [statePayload]);
	(0, import_react.useEffect)(() => {
		if (loaded) localStorage.setItem("nexus-state", JSON.stringify(statePayload));
	}, [loaded, statePayload]);
	(0, import_react.useEffect)(() => {
		if (!loaded) return;
		const timer = window.setTimeout(() => {
			const session = readSupabaseSession();
			authSessionRef.current = session;
			setAuthSession(session);
			setSyncStatus(session ? "loading" : "local");
		}, 0);
		return () => window.clearTimeout(timer);
	}, [loaded]);
	const authUserId = authSession?.user.id;
	(0, import_react.useEffect)(() => {
		const sessionToLoad = authSessionRef.current;
		if (!loaded || !authUserId || !sessionToLoad) return;
		let cancelled = false;
		loadCloudState(sessionToLoad).then(async ({ session, row }) => {
			if (cancelled) return;
			authSessionRef.current = session;
			setAuthSession(session);
			if (row?.payload) {
				gameSnapshotRef.current = null;
				applyStoredState(row.payload);
			} else await saveCloudState(session, statePayloadRef.current);
			if (cancelled) return;
			lastCloudUpdatedRef.current = row?.updated_at || (/* @__PURE__ */ new Date()).toISOString();
			setCloudReady(true);
			setSyncStatus("synced");
			setLastSyncedAt((/* @__PURE__ */ new Date()).toISOString());
		}).catch(() => {
			if (!cancelled) {
				setCloudReady(false);
				setSyncStatus("error");
			}
		});
		return () => {
			cancelled = true;
		};
	}, [
		loaded,
		authUserId,
		applyStoredState
	]);
	(0, import_react.useEffect)(() => {
		if (!loaded || !cloudReady || !authSessionRef.current) return;
		const timer = window.setTimeout(() => {
			const session = authSessionRef.current;
			if (!session) return;
			setSyncStatus("syncing");
			saveCloudState(session, statePayload).then((fresh) => {
				authSessionRef.current = fresh;
				const savedAt = (/* @__PURE__ */ new Date()).toISOString();
				lastCloudUpdatedRef.current = savedAt;
				setLastSyncedAt(savedAt);
				setSyncStatus("synced");
			}).catch(() => setSyncStatus("error"));
		}, 900);
		return () => window.clearTimeout(timer);
	}, [
		loaded,
		cloudReady,
		statePayload
	]);
	(0, import_react.useEffect)(() => {
		if (!loaded || !cloudReady) return;
		let cancelled = false;
		const timer = window.setInterval(() => {
			const session = authSessionRef.current;
			if (!session) return;
			loadCloudState(session).then(({ session: fresh, row }) => {
				if (cancelled) return;
				authSessionRef.current = fresh;
				if (row?.updated_at && row.updated_at > lastCloudUpdatedRef.current) {
					lastCloudUpdatedRef.current = row.updated_at;
					gameSnapshotRef.current = null;
					applyStoredState(row.payload);
					setLastSyncedAt(row.updated_at);
					setSyncStatus("synced");
				}
			}).catch(() => {
				if (!cancelled) setSyncStatus("error");
			});
		}, 2e4);
		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, [
		loaded,
		cloudReady,
		applyStoredState
	]);
	(0, import_react.useEffect)(() => {
		if (!loaded) return;
		const processRecurring = () => setTransactions((currentEntries) => {
			const result = applyDueRecurringExpenses(accounts, currentEntries, recurringExpenses);
			if (!result.processed) return currentEntries;
			setAccounts(result.accounts);
			setRecurringExpenses(result.recurring);
			setToast(`Автоматически списано платежей: ${result.processed}`);
			window.setTimeout(() => setToast(""), 2600);
			return result.entries;
		});
		processRecurring();
		const timer = window.setInterval(processRecurring, 6e4);
		return () => window.clearInterval(timer);
	}, [
		loaded,
		accounts,
		recurringExpenses
	]);
	(0, import_react.useEffect)(() => {
		if (loaded) localStorage.setItem("nexus-theme", theme);
	}, [loaded, theme]);
	(0, import_react.useEffect)(() => {
		const onHash = () => {
			const next = decodeURIComponent(window.location.hash.slice(1));
			if (nav.some((g) => g.items.some((i) => i.label === next))) setSection(next);
		};
		window.addEventListener("hashchange", onHash);
		return () => window.removeEventListener("hashchange", onHash);
	}, []);
	(0, import_react.useEffect)(() => {
		const timer = window.setInterval(() => {
			setClockTick(Date.now());
			const nextClock = habitClock();
			const expired = habits.filter((h) => h.weekStart !== nextClock.weekStart);
			if (!expired.length) return;
			setHabitHistory((current) => uniqueEntityIds([...current, ...expired.filter((h) => !current.some((item) => item.habitId === h.id && item.weekStart === h.weekStart)).map((h) => ({
				id: newEntityId(),
				habitId: h.id,
				habitName: h.name,
				weekStart: h.weekStart,
				completed: Object.values(h.checks).filter(Boolean).length,
				total: 7,
				checks: h.checks
			}))]));
			setHabits((current) => current.map((h) => h.weekStart === nextClock.weekStart ? h : {
				...h,
				checks: {},
				weekStart: nextClock.weekStart
			}));
		}, 6e4);
		return () => window.clearInterval(timer);
	}, [habits]);
	const taskCompletion = (0, import_react.useMemo)(() => tasks.length ? Math.round(tasks.filter((t) => t.done).length / tasks.length * 100) : 0, [tasks]);
	const clock = habitClock();
	const habitCompletion = habits.length ? Math.round(habits.filter((h) => h.checks[clock.today]).length / habits.length * 100) : 0;
	const levelInfo = gameLevel(gamification.xp);
	(0, import_react.useEffect)(() => {
		if (!loaded) return;
		const activeClock = habitClock();
		const next = {
			today: activeClock.today,
			tasks: Object.fromEntries(tasks.map((task) => [String(task.id), {
				done: task.done,
				priority: task.priority
			}])),
			habits: Object.fromEntries(habits.map((habit) => [String(habit.id), Boolean(habit.checks[activeClock.today])])),
			projects: projects.map((project) => project.id),
			goals: goals.map((goal) => goal.id),
			inbox: inboxItems.map((item) => item.id),
			resources: resources.map((item) => item.id),
			events: events.map((item) => item.id),
			journals: journalEntries.map((item) => item.id),
			health: healthNotes.map((item) => item.id),
			reviews: weeklyReviews.map((item) => item.id),
			transactions: Object.fromEntries(transactions.map((item) => [String(item.id), {
				kind: item.kind,
				posted: Boolean(item.posted),
				recurring: Boolean(item.recurringId)
			}])),
			milestones: Object.fromEntries(projects.flatMap((project) => (project.milestones || []).map((item) => [`${project.id}-${item.id}`, item.done]))),
			focuses: Object.entries(planningFocuses).filter(([, value]) => value.trim()).map(([key]) => key)
		};
		const previous = gameSnapshotRef.current;
		gameSnapshotRef.current = next;
		if (!previous) return;
		const drafts = [];
		const stamp = Date.now();
		const taskPoints = {
			high: 20,
			medium: 15,
			low: 10
		};
		Object.entries(next.tasks).forEach(([id, task]) => {
			const before = previous.tasks[id];
			if (!before) drafts.push({
				key: `task-created-${id}`,
				delta: 3,
				title: "Задача сформулирована",
				category: "action"
			});
			else if (before.done !== task.done) drafts.push({
				key: `task-${task.done ? "done" : "undo"}-${id}-${stamp}`,
				delta: task.done ? taskPoints[task.priority] : -taskPoints[task.priority],
				title: task.done ? "Задача выполнена" : "Выполнение задачи отменено",
				category: task.done ? "completion" : "penalty"
			});
		});
		Object.entries(previous.tasks).filter(([id, task]) => !next.tasks[id] && !task.done).forEach(([id]) => drafts.push({
			key: `task-abandoned-${id}-${stamp}`,
			delta: -3,
			title: "Незавершённая задача удалена",
			category: "penalty"
		}));
		if (previous.today === next.today) Object.entries(next.habits).forEach(([id, done]) => {
			const before = previous.habits[id];
			if (before !== void 0 && before !== done) drafts.push({
				key: `habit-${done ? "done" : "undo"}-${id}-${stamp}`,
				delta: done ? 8 : -8,
				title: done ? "Привычка выполнена" : "Отметка привычки снята",
				category: done ? "completion" : "penalty"
			});
		});
		next.projects.filter((id) => !previous.projects.includes(id)).forEach((id) => drafts.push({
			key: `project-created-${id}`,
			delta: 12,
			title: "Создан проект с результатом",
			category: "action"
		}));
		next.goals.filter((id) => !previous.goals.includes(id)).forEach((id) => drafts.push({
			key: `goal-created-${id}`,
			delta: 10,
			title: "Определена новая цель",
			category: "action"
		}));
		next.inbox.filter((id) => !previous.inbox.includes(id)).forEach((id) => drafts.push({
			key: `inbox-created-${id}`,
			delta: 2,
			title: "Мысль сохранена во Входящие",
			category: "action"
		}));
		next.resources.filter((id) => !previous.resources.includes(id)).forEach((id) => drafts.push({
			key: `resource-created-${id}`,
			delta: 4,
			title: "Ресурс добавлен в PARA",
			category: "action"
		}));
		next.events.filter((id) => !previous.events.includes(id)).forEach((id) => drafts.push({
			key: `event-created-${id}`,
			delta: 4,
			title: "Время запланировано",
			category: "action"
		}));
		next.journals.filter((id) => !previous.journals.includes(id)).forEach((id) => drafts.push({
			key: `journal-created-${id}`,
			delta: 20,
			title: "Вечерний разбор завершён",
			category: "rhythm"
		}));
		next.health.filter((id) => !previous.health.includes(id)).forEach((id) => drafts.push({
			key: `health-created-${id}`,
			delta: 6,
			title: "Состояние зафиксировано",
			category: "action"
		}));
		next.reviews.filter((id) => !previous.reviews.includes(id)).forEach((id) => drafts.push({
			key: `weekly-review-${id}`,
			delta: 35,
			title: "Еженедельный обзор PARA завершён",
			category: "rhythm"
		}));
		Object.entries(next.transactions).forEach(([id, item]) => {
			if (!previous.transactions[id] && item.posted && !item.recurring && item.kind !== "installment") drafts.push({
				key: `finance-created-${id}`,
				delta: 3,
				title: "Финансовая операция учтена",
				category: "action"
			});
		});
		Object.entries(next.milestones).forEach(([id, done]) => {
			const before = previous.milestones[id];
			if (before !== void 0 && before !== done) drafts.push({
				key: `milestone-${done ? "done" : "undo"}-${id}-${stamp}`,
				delta: done ? 12 : -12,
				title: done ? "Этап проекта завершён" : "Этап проекта возвращён",
				category: done ? "completion" : "penalty"
			});
		});
		next.focuses.filter((key) => !previous.focuses.includes(key)).forEach((key) => drafts.push({
			key: `focus-created-${key}`,
			delta: 5,
			title: "Фокус недели определён",
			category: "rhythm"
		}));
		if (drafts.length) window.setTimeout(() => setGamification((current) => addGameEvents(current, drafts)), 0);
	}, [
		loaded,
		tasks,
		habits,
		projects,
		goals,
		inboxItems,
		resources,
		events,
		journalEntries,
		healthNotes,
		weeklyReviews,
		transactions,
		planningFocuses
	]);
	(0, import_react.useEffect)(() => {
		if (!loaded) return;
		const now = /* @__PURE__ */ new Date();
		const today = localDateKey(now);
		const score = Math.round((taskCompletion + habitCompletion) / 2);
		const timer = window.setTimeout(() => setGamification((current) => {
			let next = addGameEvents(current, tasks.filter((task) => !task.done && task.dueDate && task.dueDate < today).map((task) => ({
				key: `missed-deadline-${task.id}-${task.dueDate}`,
				date: today,
				delta: -4,
				title: `Пропущен срок: ${task.title}`,
				category: "penalty"
			})));
			if (now.getHours() < 21 || next.dailyScores.some((day) => day.date === today)) return next;
			const actions = next.events.filter((event) => event.date === today && event.delta > 0).length;
			const previousDay = next.dailyScores[next.dailyScores.length - 1];
			const endOfDay = [];
			if (!actions) endOfDay.push({
				key: `inactive-day-${today}`,
				date: today,
				delta: -8,
				title: "День прошёл без зафиксированных действий",
				category: "penalty"
			});
			if (previousDay && previousDay.score - score >= 15) endOfDay.push({
				key: `rhythm-drop-${today}`,
				date: today,
				delta: -Math.min(20, Math.ceil((previousDay.score - score) / 10) * 4),
				title: "Ритм снизился относительно прошлого периода",
				category: "penalty"
			});
			next = addGameEvents(next, endOfDay);
			return {
				...next,
				dailyScores: [...next.dailyScores, {
					date: today,
					score,
					actions
				}].slice(-60)
			};
		}), 0);
		return () => window.clearTimeout(timer);
	}, [
		loaded,
		tasks,
		taskCompletion,
		habitCompletion,
		clock.today
	]);
	function navigate(next) {
		setSection(next);
		window.history.pushState(null, "", `#${encodeURIComponent(next)}`);
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	}
	function notify(message) {
		setToast(message);
		window.setTimeout(() => setToast(""), 2600);
	}
	function acceptAuthSession(session) {
		authSessionRef.current = session;
		setAuthSession(session);
		setCloudReady(false);
		setSyncStatus("loading");
	}
	async function handleSignOut() {
		await signOutSupabase(authSessionRef.current);
		authSessionRef.current = null;
		setAuthSession(null);
		setCloudReady(false);
		setSyncStatus("local");
		setAuthOpen(false);
		notify("Вы вышли. Локальные данные остались на устройстве");
	}
	function captureUndo(label) {
		setUndoStack((current) => [{
			id: newEntityId(),
			label,
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			tasks,
			projects,
			goals,
			habits,
			events
		}, ...current].slice(0, 10));
	}
	function undoLastAiAction() {
		const snapshot = undoStack[0];
		if (!snapshot) return;
		setTasks(snapshot.tasks);
		setProjects(snapshot.projects);
		setGoals(snapshot.goals);
		setHabits(snapshot.habits);
		setEvents(snapshot.events);
		setUndoStack((current) => current.slice(1));
		notify(`Отменено: ${snapshot.label}`);
	}
	function openGamification() {
		navigate("Обзор");
		window.setTimeout(() => document.getElementById("nexus-game")?.scrollIntoView({
			behavior: "smooth",
			block: "center"
		}), 80);
	}
	function gameCheckIn(kind) {
		const today = clock.today;
		const setback = gamification.events.some((event) => event.key === `self-setback-${today}`);
		const recovered = gamification.events.some((event) => event.key === `self-recovery-${today}`);
		if (kind === "recovery" && !setback) {
			notify("Сначала отметьте срыв фокуса, если он действительно был");
			return;
		}
		if (kind === "recovery" && recovered) {
			notify("Ритм сегодня уже восстановлен");
			return;
		}
		const draft = kind === "setback" ? {
			key: `self-setback-${today}`,
			delta: -5,
			title: "Честно отмечен срыв фокуса",
			category: "penalty"
		} : {
			key: `self-recovery-${today}`,
			delta: 5,
			title: "Ритм восстановлен маленьким действием",
			category: "rhythm"
		};
		setGamification((current) => addGameEvents(current, [draft]));
		notify(kind === "setback" ? "−5 XP. Без вины — выберите один шаг восстановления" : "＋5 XP. Вы вернулись в ритм");
	}
	function toggleTask(id) {
		setTasks((v) => v.map((task) => task.id === id ? {
			...task,
			done: !task.done,
			completedAt: task.done ? void 0 : (/* @__PURE__ */ new Date()).toISOString()
		} : task));
	}
	function toggleHabit(id, date) {
		if (date !== clock.today) return;
		setHabits((current) => current.map((h) => h.id === id ? {
			...h,
			checks: {
				...h.checks,
				[date]: !h.checks[date]
			}
		} : h));
	}
	function createFinanceOperation(draft) {
		const accountId = Number(draft.accountId);
		const amount = Number(draft.amount);
		const kind = String(draft.kind);
		const account = accounts.find((a) => a.id === accountId);
		if (!account || !amount) return;
		const id = newEntityId();
		const category = String(draft.category || (kind === "income" ? "Доход" : "Другое"));
		const comment = String(draft.comment || "").trim();
		const entry = {
			id,
			title: comment || category,
			category,
			amount,
			kind,
			date: String(draft.date || localDateKey(/* @__PURE__ */ new Date())),
			accountId,
			posted: true
		};
		if (kind === "income") {
			setAccounts((v) => v.map((a) => a.id === accountId ? {
				...a,
				balance: a.balance + amount
			} : a));
			setTransactions((v) => [entry, ...v]);
			return;
		}
		setAccounts((v) => v.map((a) => a.id === accountId ? {
			...a,
			balance: a.balance - amount
		} : a));
		if (account.type === "credit") {
			const count = Math.max(1, Number(draft.installments || 1));
			const part = Math.round(amount / count * 100) / 100;
			const schedule = Array.from({ length: count }, (_, index) => ({
				id: id + index + 1,
				title: `${comment || category} · платёж ${index + 1}/${count}`,
				category,
				amount: index === count - 1 ? Math.round((amount - part * (count - 1)) * 100) / 100 : part,
				kind: "installment",
				date: nextBillingDate(index, account.billingDay || 15),
				dueDate: nextBillingDate(index, account.billingDay || 15),
				accountId,
				parentId: id,
				installmentIndex: index + 1,
				installmentCount: count,
				posted: false
			}));
			setTransactions((v) => [
				entry,
				...schedule,
				...v
			]);
		} else setTransactions((v) => [entry, ...v]);
	}
	function createTransfer(draft) {
		const from = Number(draft.fromAccountId);
		const to = Number(draft.toAccountId);
		const amount = Number(draft.amount);
		if (!amount || from === to) return;
		setAccounts((v) => v.map((a) => a.id === from ? {
			...a,
			balance: a.balance - amount
		} : a.id === to ? {
			...a,
			balance: a.balance + amount
		} : a));
		setTransactions((v) => [{
			id: newEntityId(),
			title: "Перевод между счетами",
			category: "Перевод",
			amount,
			kind: "transfer",
			date: localDateKey(/* @__PURE__ */ new Date()),
			accountId: from,
			toAccountId: to,
			posted: true
		}, ...v]);
	}
	function handleCreate(kind, draft) {
		const id = newEntityId();
		if (kind === "task") {
			const projectId = Number(draft.projectId || taskProjectId || 0) || void 0;
			const linkedProject = projects.find((project) => project.id === projectId);
			setTasks((v) => [...v, {
				id,
				title: String(draft.title),
				area: linkedProject?.area || String(draft.area || "Личное"),
				time: String(draft.time || "Сегодня"),
				dueDate: String(draft.dueDate || "") || void 0,
				priority: draft.priority || "medium",
				projectId,
				done: false,
				duration: Math.max(5, Number(draft.duration || 30)),
				energy: draft.energy || "medium",
				context: draft.context || "anywhere",
				createdAt: (/* @__PURE__ */ new Date()).toISOString()
			}]);
		}
		if (kind === "project") setProjects((v) => [...v, {
			id,
			name: String(draft.title),
			area: String(draft.area || "Личное"),
			progress: 0,
			due: String(draft.due || "Без срока"),
			next: String(draft.next || "Определить следующий шаг"),
			notes: String(draft.notes || ""),
			cover: String(draft.cover || "linear-gradient(135deg,#2c2455,#7c4dff 58%,#d565ff)")
		}]);
		if (kind === "goal") setGoals((v) => [...v, {
			id,
			period: String(draft.period || "МЕСЯЦ"),
			date: String(draft.date || "Сейчас"),
			title: String(draft.title),
			note: String(draft.note || "Новая цель"),
			progress: 0,
			area: String(draft.area || "Развитие")
		}]);
		if (kind === "habit") if (editingHabit) setHabits((v) => v.map((h) => h.id === editingHabit.id ? {
			...h,
			name: String(draft.title),
			icon: String(draft.icon || "✦"),
			area: String(draft.area || h.area || "Здоровье")
		} : h));
		else setHabits((v) => [...v, {
			id,
			name: String(draft.title),
			icon: String(draft.icon || "✦"),
			checks: {},
			weekStart: clock.weekStart,
			area: String(draft.area || "Здоровье")
		}]);
		if (kind === "transaction") createFinanceOperation(draft);
		if (kind === "transfer") createTransfer(draft);
		if (kind === "account") setAccounts((v) => [...v, {
			id,
			name: String(draft.title),
			type: draft.accountType,
			balance: Number(draft.balance || 0),
			linkedAccountId: Number(draft.linkedAccountId || 0) || void 0,
			billingDay: Number(draft.billingDay || 15)
		}]);
		if (kind === "health") setHealthNotes((v) => [{
			id,
			kind: "metric",
			title: String(draft.title),
			value: String(draft.value),
			date: (/* @__PURE__ */ new Date()).toISOString()
		}, ...v]);
		if (kind === "event") setEvents((v) => [...v, {
			id,
			title: String(draft.title),
			date: String(draft.date || localDateKey(/* @__PURE__ */ new Date())),
			time: String(draft.time || "09:00"),
			tone: draft.tone,
			note: String(draft.note || "")
		}]);
		notify(editingHabit ? "Привычка обновлена" : "Сохранено в NEXUS OS");
		setModalKind(null);
		setEditingHabit(null);
		setTaskProjectId(null);
	}
	function applyAssistantActions(actions) {
		let applied = 0;
		if (actions.length) captureUndo(actions.length > 1 ? `AI-планирование · ${actions.length} действий` : "действие NEXUS AI");
		actions.forEach(({ type, payload }) => {
			if (type === "create_task") {
				const projectQuery = String(payload.project || "").toLowerCase();
				const project = projectQuery ? projects.find((p) => p.name.toLowerCase().includes(projectQuery) || projectQuery.includes(p.name.toLowerCase())) : void 0;
				setTasks((v) => [...v, {
					id: newEntityId(),
					title: String(payload.title),
					area: project?.area || String(payload.area || "Личное"),
					time: String(payload.time || "Сегодня"),
					dueDate: String(payload.dueDate || "") || void 0,
					priority: payload.priority || "medium",
					projectId: project?.id,
					done: false,
					duration: Math.max(5, Number(payload.duration || 30)),
					energy: payload.energy || "medium",
					context: payload.context || "anywhere",
					createdAt: (/* @__PURE__ */ new Date()).toISOString()
				}]);
				applied++;
			}
			if (type === "complete_task") {
				const query = String(payload.title || "").toLowerCase();
				setTasks((v) => v.map((t) => t.title.toLowerCase().includes(query) ? {
					...t,
					done: true,
					completedAt: (/* @__PURE__ */ new Date()).toISOString()
				} : t));
				applied++;
			}
			if (type === "update_task" || type === "schedule_task") {
				const query = String(payload.currentTitle || payload.title || "").toLowerCase();
				setTasks((v) => v.map((task) => task.title.toLowerCase().includes(query) ? {
					...task,
					title: String(payload.newTitle || task.title),
					dueDate: String(payload.dueDate || task.dueDate || "") || void 0,
					time: String(payload.time || task.time),
					duration: Math.max(5, Number(payload.duration || task.duration || 30)),
					energy: payload.energy || task.energy || "medium",
					context: payload.context || task.context || "anywhere"
				} : task));
				applied++;
			}
			if (type === "create_project") {
				setProjects((v) => [...v, {
					id: newEntityId(),
					name: String(payload.name),
					area: String(payload.area || "Личное"),
					progress: 0,
					due: String(payload.due || "Без срока"),
					next: String(payload.next || "Определить следующий шаг"),
					cover: "linear-gradient(135deg,#2c2455,#7c4dff 58%,#d565ff)"
				}]);
				applied++;
			}
			if (type === "create_goal") {
				setGoals((v) => [...v, {
					id: newEntityId(),
					period: String(payload.period || "МЕСЯЦ"),
					date: String(payload.date || "Сейчас"),
					title: String(payload.title),
					note: String(payload.note || "Создано NEXUS AI"),
					progress: 0
				}]);
				applied++;
			}
			if (type === "create_habit") {
				setHabits((v) => [...v, {
					id: newEntityId(),
					name: String(payload.name),
					icon: "✦",
					checks: {},
					weekStart: clock.weekStart,
					area: "Здоровье"
				}]);
				applied++;
			}
		});
		if (applied) notify(`NEXUS AI выполнил действий: ${applied}`);
		return applied;
	}
	async function askAssistant(e) {
		e.preventDefault();
		if (!prompt.trim() || thinking) return;
		const text = prompt.trim();
		setPrompt("");
		setMessages((v) => [...v, {
			role: "user",
			text
		}]);
		setThinking(true);
		try {
			const data = await (await fetch("/api/assistant", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...byok ? { "x-nexus-byok": byok } : {}
				},
				body: JSON.stringify({
					message: text,
					context: {
						today: clock.today,
						tasks,
						events: events.filter((event) => event.date && event.date >= clock.today),
						projects: projects.map((p) => ({
							id: p.id,
							name: p.name,
							area: p.area,
							next: p.next,
							due: p.due
						})),
						goals,
						areas: lifeAreas.map((a) => a.name),
						habits: habits.map((h) => ({
							id: h.id,
							name: h.name,
							doneToday: !!h.checks[clock.today]
						})),
						section
					}
				})
			})).json();
			const applied = applyAssistantActions(Array.isArray(data.actions) ? data.actions : []);
			setMessages((v) => [...v, {
				role: "assistant",
				text: data.reply || (applied ? `Готово. Я применил ${applied} изменений.` : data.error || "Не удалось выполнить запрос.")
			}]);
		} catch {
			setMessages((v) => [...v, {
				role: "assistant",
				text: "Не удалось связаться с AI. Проверьте серверный ключ в настройках."
			}]);
		} finally {
			setThinking(false);
		}
	}
	function content() {
		if (section === "Обзор") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dashboard, {
			tasks,
			habits,
			projects,
			goals,
			lifeAreas,
			events,
			transactions,
			budgetLines,
			weeklyReviews,
			taskCompletion,
			habitCompletion,
			today: clock.today,
			onToggleTask: toggleTask,
			onToggleHabit: toggleHabit,
			navigate,
			order: dashboardOrder,
			setOrder: setDashboardOrder,
			gamification,
			onGameCheckIn: gameCheckIn,
			onPlanWithAi: () => {
				setPrompt("Спланируй сегодняшний день: выбери реалистичные приоритеты, назначь время с учётом длительности, энергии и контекста и сразу внеси изменения");
				setAssistantOpen(true);
			}
		});
		if (section === "Задачи") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TasksPage, {
			tasks,
			projects,
			setTasks,
			onNew: () => {
				setTaskProjectId(null);
				setModalKind("task");
			}
		});
		if (section === "Цели") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoalsPage, {
			goals,
			setGoals,
			projects,
			tasks,
			onNew: () => setModalKind("goal")
		});
		if (section === "Проекты") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProjectsPage, {
			projects,
			setProjects,
			tasks,
			setTasks,
			goals,
			lifeAreas,
			setLifeAreas,
			inboxItems,
			setInboxItems,
			resources,
			setResources,
			weeklyReviews,
			setWeeklyReviews,
			planningFocuses,
			setPlanningFocuses,
			notify,
			selectedId: selectedProjectId,
			setSelectedId: setSelectedProjectId,
			onNew: () => setModalKind("project"),
			onNewTask: (projectId) => {
				setTaskProjectId(projectId);
				setModalKind("task");
			}
		});
		if (section === "Привычки") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HabitsPage, {
			habits,
			setHabits,
			history: habitHistory,
			clock,
			onToggle: toggleHabit,
			onNew: () => {
				setEditingHabit(null);
				setModalKind("habit");
			},
			onEdit: (habit) => {
				setEditingHabit(habit);
				setModalKind("habit");
			}
		});
		if (section === "Финансы") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinancePage, {
			accounts,
			setAccounts,
			transactions,
			setTransactions,
			categories: financeCategories,
			setCategories: setFinanceCategories,
			budgetLines,
			setBudgetLines,
			recurringExpenses,
			setRecurringExpenses,
			onOperation: () => setModalKind("transaction"),
			onTransfer: () => setModalKind("transfer"),
			onAccount: () => setModalKind("account")
		});
		if (section === "Здоровье") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HealthPage, {
			notes: healthNotes,
			setNotes: setHealthNotes,
			onMetric: () => setModalKind("health"),
			notify
		});
		if (section === "Планирование") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlanningPage, {
			events,
			setEvents,
			tasks,
			setTasks,
			focuses: planningFocuses,
			setFocuses: setPlanningFocuses,
			onNew: () => setModalKind("event"),
			notify
		});
		if (section === "Журнал") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JournalPage, {
			entries: journalEntries,
			setEntries: setJournalEntries,
			notify
		});
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsPage, {
			byok,
			setByok,
			notify,
			theme,
			setTheme,
			lifeAreas,
			setLifeAreas
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `app-shell theme-${theme}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: `sidebar ${mobileNav ? "open" : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "brand",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "brand-mark",
								children: "N"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "NEXUS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "PERSONAL OS" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "mobile-close",
								onClick: () => setMobileNav(false),
								children: "×"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { children: nav.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nav-group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: group.group }), group.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: section === item.label ? "active" : "",
							onClick: () => {
								navigate(item.label);
								setMobileNav(false);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.icon }),
								item.label,
								item.label === "Задачи" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: tasks.filter((t) => !t.done).length })
							]
						}, item.label))]
					}, group.group)) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sidebar-foot",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "level level-button",
							onClick: () => {
								openGamification();
								setMobileNav(false);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "level-top",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Уровень ", levelInfo.level] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [gamification.xp.toLocaleString("ru-RU"), " XP"] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mini-track",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${levelInfo.progress}%` } })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
									levelInfo.remaining,
									" XP до нового уровня · серия ",
									gameStreak(gamification.activeDays),
									" дн."
								] })
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "profile profile-button",
							onClick: () => {
								setAuthOpen(true);
								setMobileNav(false);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "avatar",
									children: authSession?.user.email?.[0]?.toUpperCase() || "А"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: authSession?.user.email?.split("@")[0] || "Алексей" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: authSession ? syncStatus === "synced" ? "Данные синхронизированы" : "Синхронизация…" : "Локальный режим" })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: authSession && syncStatus !== "error" ? "online" : "offline" })
							]
						})]
					})
				]
			}),
			mobileNav && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "scrim",
				onClick: () => setMobileNav(false),
				"aria-label": "Закрыть меню"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "main",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "menu-button",
						onClick: () => setMobileNav(true),
						children: "☰"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "breadcrumbs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => navigate("Обзор"),
								"aria-label": "Перейти на главную страницу",
								children: "МОЯ СИСТЕМА"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "/" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: section.toUpperCase() })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "top-actions",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `sync-pill ${syncStatus}`,
								onClick: () => setAuthOpen(true),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: syncStatus === "synced" ? "✓" : syncStatus === "error" ? "!" : authSession ? "↻" : "◌" }), authSession ? syncStatus === "synced" ? "В облаке" : syncStatus === "error" ? "Ошибка синхронизации" : "Сохраняю…" : "Войти"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "search",
								children: [
									"⌕ ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										"aria-label": "Поиск",
										value: search,
										onChange: (e) => setSearch(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter" && search.trim()) {
												const task = tasks.find((t) => t.title.toLowerCase().includes(search.toLowerCase()));
												const project = projects.find((p) => p.name.toLowerCase().includes(search.toLowerCase()));
												if (task) {
													navigate("Задачи");
													notify(`Найдена задача: ${task.title}`);
												} else if (project) {
													navigate("Проекты");
													notify(`Найден проект: ${project.name}`);
												} else notify("Ничего не найдено");
												setSearch("");
											}
										},
										placeholder: "Найти что угодно..."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", { children: "↵" })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(IconButton, {
								label: "Уведомления",
								onClick: () => notify("Новых уведомлений нет"),
								children: ["♢", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "assistant-mini",
								onClick: () => setAssistantOpen(true),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✦" }), " Спросить NEXUS"]
							})
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "page",
					children: content()
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "ai-fab",
				onClick: () => setAssistantOpen(true),
				"aria-label": "Открыть AI-ассистента",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✦" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})]
			}),
			modalKind && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateModal, {
				kind: modalKind,
				accounts,
				projects,
				areas: lifeAreas,
				categories: financeCategories,
				initialProjectId: taskProjectId,
				initialHabit: editingHabit,
				onClose: () => {
					setModalKind(null);
					setEditingHabit(null);
					setTaskProjectId(null);
				},
				onCreate: (draft) => handleCreate(modalKind, draft)
			}),
			authOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthPanel, {
				session: authSession,
				syncStatus,
				lastSyncedAt,
				onSession: acceptAuthSession,
				onSignOut: handleSignOut,
				onClose: () => setAuthOpen(false)
			}),
			assistantOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "assistant-panel",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "assistant-head",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ai-orb",
							children: "✦"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "NEXUS AI" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), " выполняет действия сразу"] })] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setAssistantOpen(false),
							children: "×"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "assistant-context",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Сейчас вижу" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
							tasks.filter((t) => !t.done).length,
							" задач · ",
							habits.filter((h) => h.checks[clock.today]).length,
							"/",
							habits.length,
							" привычек · ",
							section
						] })]
					}),
					undoStack.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "assistant-undo",
						onClick: undoLastAiAction,
						children: ["↶ Отменить последнее изменение AI ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: undoStack[0].label })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "messages",
						children: [messages.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `message ${m.role}`,
							children: m.text
						}, i)), thinking && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "message assistant typing",
							children: "Выполняю…"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "suggestions",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setPrompt("Добавь задачу: подготовить план на завтра"),
							children: "Добавить задачу"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setPrompt("Разбери мой день и сразу назначь время для 3 приоритетных задач"),
							children: "Спланировать день"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "assistant-form",
						onSubmit: askAssistant,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: prompt,
							onChange: (e) => setPrompt(e.target.value),
							placeholder: "Например: распланируй мой день и сразу внеси изменения"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							children: "↑"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
						className: "ai-note",
						children: "Изменения применяются автоматически. Кнопка отмены возвращает состояние до последней команды."
					})
				]
			}),
			toast && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "toast",
				children: ["✓ ", toast]
			}),
			undoStack.length > 0 && !assistantOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "undo-bar",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["✦ ", undoStack[0].label] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: undoLastAiAction,
					children: "Отменить"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "quick-add",
				onClick: () => setModalKind("task"),
				children: ["＋ ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Добавить" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "ios-tabbar",
				"aria-label": "Быстрая навигация",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: section === "Обзор" ? "active" : "",
						onClick: () => navigate("Обзор"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "◈" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Обзор" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: section === "Задачи" ? "active" : "",
						onClick: () => navigate("Задачи"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✓" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Задачи" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mobile-tab-add",
						onClick: () => {
							setTaskProjectId(null);
							setModalKind("task");
						},
						"aria-label": "Добавить задачу",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "＋" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: section === "Проекты" ? "active" : "",
						onClick: () => {
							setSelectedProjectId(null);
							navigate("Проекты");
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "▦" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "PARA" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: section === "Финансы" ? "active" : "",
						onClick: () => navigate("Финансы"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "₪" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Финансы" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setMobileNav(true),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "•••" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Ещё" })]
					})
				]
			})
		]
	});
}
function Dashboard({ tasks, habits, projects, goals, lifeAreas, events, transactions, budgetLines, weeklyReviews, taskCompletion, habitCompletion, today, onToggleTask, onToggleHabit, navigate, order, setOrder, gamification, onGameCheckIn, onPlanWithAi }) {
	const totalScore = Math.round((taskCompletion + habitCompletion) / 2);
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [dragging, setDragging] = (0, import_react.useState)(null);
	const [pointerDragging, setPointerDragging] = (0, import_react.useState)(null);
	const level = gameLevel(gamification.xp);
	const streak = gameStreak(gamification.activeDays);
	const todayEvents = gamification.events.filter((event) => event.date === today);
	const todayDelta = todayEvents.reduce((sum, event) => sum + event.delta, 0);
	const lastScore = gamification.dailyScores[gamification.dailyScores.length - 1];
	const now = /* @__PURE__ */ new Date();
	const monthKey = today.slice(0, 7);
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
	const monthBudget = budgetLines.reduce((sum, line) => sum + line.limit, 0);
	const monthSpent = transactions.filter((item) => item.kind === "expense" && item.date.startsWith(monthKey)).reduce((sum, item) => sum + item.amount, 0);
	const safeToday = Math.max(0, (monthBudget - monthSpent) / daysLeft);
	const calendarToday = events.filter((event) => event.date === today).sort((a, b) => a.time.localeCompare(b.time));
	const candidates = tasks.filter((task) => !task.done && !task.archived && (!task.dueDate || task.dueDate <= today)).sort((a, b) => {
		const score = (task) => (task.dueDate && task.dueDate < today ? 50 : 0) + (task.dueDate === today ? 30 : 0) + {
			high: 30,
			medium: 20,
			low: 10
		}[task.priority];
		return score(b) - score(a);
	}).slice(0, 3);
	const taskMinutes = candidates.reduce((sum, task) => sum + (task.duration || 30), 0);
	const habitsLeft = habits.filter((habit) => !habit.checks[today]).length;
	const currentWeek = localDateKey(startOfWeek(now));
	const reviewDone = weeklyReviews.some((review) => review.weekStart === currentWeek);
	const spans = {
		dayCenter: "full",
		focus: "full",
		game: "full",
		tracker: "full",
		today: "half",
		compass: "half",
		habits: "half",
		goals: "half",
		projects: "half",
		reflection: "half"
	};
	function moveBlock(source, target) {
		if (source === target) return;
		setOrder((current) => {
			const next = current.filter((item) => item !== source);
			next.splice(Math.max(0, next.indexOf(target)), 0, source);
			return next;
		});
	}
	function shiftBlock(id, direction) {
		setOrder((current) => {
			const index = current.indexOf(id);
			const target = index + direction;
			if (index < 0 || target < 0 || target >= current.length) return current;
			const next = [...current];
			[next[index], next[target]] = [next[target], next[index]];
			return next;
		});
	}
	function startPointer(event, id) {
		if (event.pointerType === "mouse") return;
		event.currentTarget.setPointerCapture(event.pointerId);
		setPointerDragging(id);
	}
	function finishPointer(event) {
		if (!pointerDragging) return;
		const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-dashboard-widget]")?.dataset.dashboardWidget;
		if (target) moveBlock(pointerDragging, target);
		setPointerDragging(null);
	}
	const blocks = {
		dayCenter: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card smart-day-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "smart-day-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "УМНЫЙ ЦЕНТР ДНЯ"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: candidates.length ? `Сегодня реально закрыть ${candidates.length} важных действия` : "Главные действия на сегодня закрыты" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						taskMinutes,
						" минут фокуса · ",
						calendarToday.length,
						" событий · ",
						habitsLeft,
						" привычек осталось"
					] })
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "primary",
					onClick: onPlanWithAi,
					children: "✦ Спланировать с AI"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "smart-day-grid",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "smart-priorities",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "РЕКОМЕНДУЕМЫЙ ПОРЯДОК" }),
						candidates.map((task, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: task.energy === "high" ? "high-energy" : "",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => onToggleTask(task.id),
								"aria-label": `Выполнить ${task.title}`,
								children: "○"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
									"0",
									index + 1,
									" · ",
									task.time || "Без времени"
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: task.title }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("em", { children: [
									task.duration || 30,
									" мин · ",
									contextLabel[task.context || "anywhere"]
								] })
							] })]
						}, task.id)),
						!candidates.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "empty-copy",
							children: "Можно посвятить время восстановлению или следующему проекту."
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "smart-day-signals",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "◷" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "БЛИЖАЙШЕЕ В КАЛЕНДАРЕ" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: calendarToday[0]?.title || "Свободное окно" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: calendarToday[0]?.time || "День без встреч" })
						] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "₪" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "БЕЗОПАСНЫЙ ТЕМП" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [formatIls(safeToday), " сегодня"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("em", { children: [formatIls(Math.max(0, monthBudget - monthSpent)), " до конца месяца"] })
						] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: reviewDone ? "done" : "",
							onClick: () => navigate("Проекты"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: reviewDone ? "✓" : "◎" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ОБЗОР PARA" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: reviewDone ? "Неделя разобрана" : "Пора проверить систему" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: reviewDone ? "Следующий обзор в воскресенье" : "Пошаговый обзор займёт 10 минут" })
							] })]
						})
					]
				})]
			})]
		}),
		focus: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "focus-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "focus-glow" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "focus-top",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "01" }), " ГЛАВНЫЙ ФОКУС ДНЯ"] })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "focus-content",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: tasks.find((t) => !t.done)?.title || "Все задачи выполнены" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Один главный результат сегодня важнее длинного списка." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "tag-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["◈ ", tasks.find((t) => !t.done)?.area || "Свободное время"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["◷ ", tasks.find((t) => !t.done)?.time || "Сегодня"] })]
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "focus-action",
						onClick: () => navigate("Задачи"),
						children: ["Открыть задачи ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
					})]
				})
			]
		}),
		tracker: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card tracker-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
				title: "Трекер задач и привычек",
				subtitle: "Живой показатель выполнения сегодня",
				action: "Подробнее",
				onClick: () => navigate("Привычки")
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "tracker-metrics",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ring, {
						value: taskCompletion,
						color: "var(--lime)",
						size: 86
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Задачи" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
						tasks.filter((t) => t.done).length,
						" из ",
						tasks.length
					] })] })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ring, {
						value: habitCompletion,
						color: "var(--green)",
						size: 86
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Привычки" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
						habits.filter((h) => h.checks[today]).length,
						" из ",
						habits.length
					] })] })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "tracker-score",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ОБЩИЙ РИТМ" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [totalScore, "%"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: totalScore >= 80 ? "Отличный темп — удерживайте ритм." : totalScore >= 50 ? "Хороший прогресс. Остался один точный шаг." : "Начните с одного небольшого действия." })
						]
					})
				]
			})]
		}),
		today: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card today-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
					title: "Сегодня",
					subtitle: `${tasks.filter((t) => t.done).length} из ${tasks.length} выполнено`,
					action: "Все задачи",
					onClick: () => navigate("Задачи")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "progress-line",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${taskCompletion}%` } })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "task-list",
					children: tasks.slice(0, 4).map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: task.done ? "done" : "",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: task.done,
								onChange: () => onToggleTask(task.id)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `check ${task.priority}`,
								children: "✓"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: task.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: projects.find((p) => p.id === task.projectId)?.name || task.area })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { children: task.time })
						]
					}, task.id))
				})
			]
		}),
		compass: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card compass",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
				title: "Компас жизни",
				subtitle: "Баланс ключевых сфер"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "compass-orbits",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "orbit-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "СЕГОДНЯ" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [totalScore, "%"] })]
				}), lifeAreas.slice(0, 6).map((area, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					style: {
						"--orbit-color": area.color,
						"--orbit-index": index
					},
					onClick: () => navigate(area.name === "Финансы" ? "Финансы" : area.name === "Здоровье" ? "Здоровье" : "Задачи"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: area.icon }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: area.name })]
				}, area.id))]
			})]
		}),
		habits: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card habits-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
				title: "Привычки",
				subtitle: "Можно отметить только сегодня",
				action: "Все привычки",
				onClick: () => navigate("Привычки")
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "habit-list",
				children: habits.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: h.checks[today] ? "complete" : "",
					onClick: () => onToggleHabit(h.id, today),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "habit-icon",
							children: h.icon
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: h.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: h.checks[today] ? "Выполнено сегодня" : "Ждёт отметки" })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "habit-check",
							children: "✓"
						})
					]
				}, h.id))
			})]
		}),
		goals: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card goals-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
				title: "Главные цели",
				subtitle: "Месяц → неделя → сегодня",
				action: "Настроить связи",
				onClick: () => navigate("Цели")
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "goal-focus-board",
				children: [
					"МЕСЯЦ",
					"НЕДЕЛЯ",
					"СЕГОДНЯ"
				].map((period) => {
					const goal = goals.find((item) => item.period === period);
					const progress = goal ? goalProgressValue(goal, projects, tasks) : 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: period === "СЕГОДНЯ" ? "current" : "",
						onClick: () => navigate("Цели"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: period }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: goal?.title || "Добавьте цель" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${progress}%` } }) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
								progress,
								"% · ",
								goal?.projectIds?.length || 0,
								" проектов"
							] })
						]
					}, period);
				})
			})]
		}),
		projects: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card project-mini",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
				title: "Активные проекты",
				subtitle: `${projects.filter((project) => !project.archived).length} в работе`,
				action: "Открыть",
				onClick: () => navigate("Проекты")
			}), projects.filter((project) => !project.archived).slice(0, 3).map((project) => {
				const progress = projectProgressValue(project, tasks);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "project-row project-row-button",
					onClick: () => navigate("Проекты"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "project-badge",
							children: project.name[0]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: project.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${progress}%` } }) })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [progress, "%"] })
					]
				}, project.id);
			})]
		}),
		reflection: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card reflection",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "eyebrow",
					children: "ВЕЧЕРНИЙ РАЗБОР"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Как прошёл твой день?" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Пять минут рефлексии помогают замечать прогресс и приносят 20 XP." })
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => navigate("Журнал"),
				children: ["Начать разбор ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
			})]
		}),
		game: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card game-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "game-main",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "game-level-badge",
						children: level.level
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "eyebrow",
							children: "NEXUS LEVEL"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { children: [
							"Уровень ",
							level.level,
							" · ",
							gamification.xp.toLocaleString("ru-RU"),
							" XP"
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Очки растут за завершённые действия и честный ритм. Отмена выполнения возвращает начисленные XP." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "game-progress",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${level.progress}%` } })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
							level.current,
							" / ",
							level.step,
							" XP · ещё ",
							level.remaining,
							" до следующего уровня"
						] })
					] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "game-stats",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "СЕРИЯ" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [streak, " дней"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: streak ? "Ритм держится" : "Начните сегодня" })
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: todayDelta < 0 ? "negative" : "",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "СЕГОДНЯ" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
									todayDelta > 0 ? "+" : "",
									todayDelta,
									" XP"
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [todayEvents.length, " событий"] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "РИТМ" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: lastScore ? `${lastScore.score}%` : `${totalScore}%` }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: lastScore ? "последний итог" : "текущий день" })
						] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "game-bottom",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "game-feed",
						children: [gamification.events.slice(0, 4).map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: event.delta < 0 ? "loss" : "gain",
							children: [event.delta > 0 ? "+" : "", event.delta]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: event.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: prettyDate(event.date) })] })] }, event.id)), !gamification.events.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "empty-copy",
							children: "Первое выполненное действие появится здесь."
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "game-rules",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Как считаются очки" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Задача: +10–20 · привычка: +8" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Этап проекта: +12 · разбор: +20" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Пропущенный срок: −4 · день без действий: −8" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => onGameCheckIn("setback"),
								children: "Сорвал фокус −5"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => onGameCheckIn("recovery"),
								children: "Вернулся в ритм +5"
							})] })
						]
					})]
				})
			]
		})
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "hero-row",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "eyebrow",
					children: (/* @__PURE__ */ new Date()).toLocaleDateString("ru-RU", {
						weekday: "long",
						day: "numeric",
						month: "long"
					}).toUpperCase()
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: ["Доброе утро, Алексей ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✦" })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Сегодня хороший день, чтобы продвинуть то, что действительно важно." })
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "day-score",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ring, {
					value: totalScore,
					color: "var(--lime)",
					size: 76
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "БАЛАНС ДНЯ" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: totalScore >= 70 ? "Уверенный ритм" : "Есть пространство для роста" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "задачи + привычки" })
				] })]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "dashboard-controls",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "eyebrow",
				children: "МОЯ ГЛАВНАЯ"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: editing ? "Перетащите блоки в удобном порядке" : "Порядок блоков сохранён на этом устройстве" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setOrder(defaultDashboardOrder),
				children: "Сбросить"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: editing ? "active" : "",
				onClick: () => setEditing((value) => !value),
				children: editing ? "✓ Готово" : "Настроить расположение"
			})] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `dashboard-board ${editing ? "editing" : ""}`,
			children: order.map((id, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				id: id === "game" ? "nexus-game" : void 0,
				"data-dashboard-widget": id,
				draggable: editing,
				onDragStart: (event) => {
					setDragging(id);
					event.dataTransfer.effectAllowed = "move";
					event.dataTransfer.setData("text/nexus-dashboard", id);
				},
				onDragEnd: () => setDragging(null),
				onDragOver: (event) => {
					if (editing) event.preventDefault();
				},
				onDrop: (event) => {
					event.preventDefault();
					const source = event.dataTransfer.getData("text/nexus-dashboard");
					if (source) moveBlock(source, id);
					setDragging(null);
				},
				className: `dashboard-widget ${spans[id]} ${dragging === id || pointerDragging === id ? "dragging" : ""}`,
				children: [editing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "widget-order-controls",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "widget-drag-handle",
							"aria-label": `Перетащить блок ${gameBlockLabels[id]}`,
							onPointerDown: (event) => startPointer(event, id),
							onPointerUp: finishPointer,
							onPointerCancel: () => setPointerDragging(null),
							children: ["⠿ ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: gameBlockLabels[id] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: index === 0,
							onClick: () => shiftBlock(id, -1),
							"aria-label": "Переместить выше",
							children: "↑"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: index === order.length - 1,
							onClick: () => shiftBlock(id, 1),
							"aria-label": "Переместить ниже",
							children: "↓"
						})
					]
				}), blocks[id]]
			}, id))
		})
	] });
}
function CardHead({ title, subtitle, action, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "card-head",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: subtitle })] }), action && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick,
			children: [action, " →"]
		})]
	});
}
function PageTitle({ eyebrow, title, text, action, onAction, extra }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "page-title",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "eyebrow",
				children: eyebrow
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: title }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: text })
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "page-actions",
			children: [extra, action && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "primary",
				onClick: onAction,
				children: ["＋ ", action]
			})]
		})]
	});
}
function Stat({ value, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })] });
}
function EmptyState({ text, action, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "empty-state",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "＋" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: text }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick,
				children: action
			})
		]
	});
}
function TasksPage({ tasks, projects, setTasks, onNew }) {
	const [filter, setFilter] = (0, import_react.useState)("active");
	const [context, setContext] = (0, import_react.useState)("all");
	const visible = tasks.filter((t) => (filter === "all" || (filter === "done" ? t.done : !t.done)) && (context === "all" || (t.context || "anywhere") === context));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageTitle, {
			eyebrow: "ДЕЙСТВИЕ",
			title: "Задачи",
			text: "У каждой задачи есть оценка времени, требуемая энергия и контекст — проще выбрать действие под реальную ситуацию.",
			action: "Новая задача",
			onAction: onNew
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "stats-strip",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: tasks.filter((t) => !t.done).length.toString(),
					label: "В работе"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: tasks.filter((t) => t.done).length.toString(),
					label: "Выполнено"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: `${tasks.filter((t) => !t.done).reduce((sum, t) => sum + (t.duration || 30), 0)} мин`,
					label: "Оценка остатка"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: `${tasks.length ? Math.round(tasks.filter((t) => t.done).length / tasks.length * 100) : 0}%`,
					label: "Темп"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card full-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "filter-row",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: filter === "active" ? "active" : "",
						onClick: () => setFilter("active"),
						children: "В работе"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: filter === "done" ? "active" : "",
						onClick: () => setFilter("done"),
						children: "Выполнено"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: filter === "all" ? "active" : "",
						onClick: () => setFilter("all"),
						children: "Все"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						"aria-label": "Фильтр по контексту",
						value: context,
						onChange: (event) => setContext(event.target.value),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "all",
							children: "Все контексты"
						}), Object.entries(contextLabel).map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value,
							children: label
						}, value))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onNew,
						children: "＋ Добавить"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "large-task-list",
				children: visible.length ? visible.map((t) => {
					const project = projects.find((p) => p.id === t.projectId);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: t.done ? "done" : "",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: t.done,
								onChange: () => setTasks((v) => v.map((x) => x.id === t.id ? {
									...x,
									done: !x.done,
									completedAt: x.done ? void 0 : (/* @__PURE__ */ new Date()).toISOString()
								} : x))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `check ${t.priority}`,
								children: "✓"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t.title }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: t.area }),
									project && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("em", {
										className: "project-link",
										children: ["▦ ", project.name]
									}),
									" · ",
									t.dueDate ? prettyDate(t.dueDate) : t.time
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "task-attributes",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("em", { children: [
											"◷ ",
											t.duration || 30,
											" мин"
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("em", {
											className: `energy-${t.energy || "medium"}`,
											children: ["⚡ ", energyLabel[t.energy || "medium"]]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("em", { children: ["⌁ ", contextLabel[t.context || "anywhere"]] })
									]
								})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "Удалить задачу",
								onClick: (e) => {
									e.preventDefault();
									setTasks((v) => v.filter((x) => x.id !== t.id));
								},
								children: "×"
							})
						]
					}, t.id);
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					text: "В этом списке пока ничего нет",
					action: "Создать задачу",
					onClick: onNew
				})
			})]
		})
	] });
}
function GoalsPage({ goals, setGoals, projects, tasks, onNew }) {
	const [selectedGoalId, setSelectedGoalId] = (0, import_react.useState)(null);
	const selected = goals.find((goal) => goal.id === selectedGoalId);
	const calculated = goals.map((goal) => goalProgressValue(goal, projects, tasks));
	const average = calculated.length ? Math.round(calculated.reduce((sum, value) => sum + value, 0) / calculated.length) : 0;
	function toggleProject(goalId, projectId) {
		setGoals((current) => current.map((goal) => {
			if (goal.id !== goalId) return goal;
			const ids = goal.projectIds || [];
			return {
				...goal,
				projectIds: ids.includes(projectId) ? ids.filter((id) => id !== projectId) : [...ids, projectId]
			};
		}));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageTitle, {
			eyebrow: "НАПРАВЛЕНИЕ",
			title: "Цели и проекты",
			text: "Свяжите цель с проектами — прогресс будет считаться автоматически по выполненным задачам и этапам.",
			action: "Новая цель",
			onAction: onNew
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "stats-strip",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: `${average}%`,
					label: "Общий прогресс"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: goals.filter((goal) => (goal.projectIds?.length || 0) > 0).length.toString(),
					label: "Целей связаны"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: projects.filter((project) => !project.archived).length.toString(),
					label: "Активных проектов"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: tasks.filter((task) => task.done).length.toString(),
					label: "Задач завершено"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "timeline-chain goal-timeline",
			children: goals.map((goal, i) => {
				const progress = goalProgressValue(goal, projects, tasks);
				const linked = projects.filter((project) => goal.projectIds?.includes(project.id));
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `${i === 2 ? "accent" : ""} ${selectedGoalId === goal.id ? "selected" : ""}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: goal.period }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: goal.date }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: goal.title }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: goal.note }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "goal-project-chips",
							children: [linked.slice(0, 2).map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["▦ ", project.name] }, project.id)), linked.length > 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["＋", linked.length - 2] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "entity-actions",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setSelectedGoalId(selectedGoalId === goal.id ? null : goal.id),
									children: "Связать проекты"
								}),
								!linked.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setGoals((v) => v.map((row) => row.id === goal.id ? {
										...row,
										progress: Math.min(100, row.progress + 10)
									} : row)),
									children: "＋10%"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setGoals((v) => v.filter((row) => row.id !== goal.id));
										setSelectedGoalId(null);
									},
									children: "Удалить"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [progress, "%"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
							className: "progress-source",
							children: linked.length ? "автоматически" : "вручную"
						})
					]
				}, goal.id);
			})
		}),
		selected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card goal-link-panel",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "СВЯЗЬ ЦЕЛИ С РЕЗУЛЬТАТАМИ"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: selected.title }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Выберите проекты, которые двигают эту цель. Их прогресс сразу изменит процент цели." })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: projects.filter((project) => !project.archived).map((project) => {
					const checked = !!selected.projectIds?.includes(project.id);
					const progress = projectProgressValue(project, tasks);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: checked ? "selected" : "",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked,
								onChange: () => toggleProject(selected.id, project.id)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: checked ? "✓" : "" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: project.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
								project.area,
								" · ",
								progress,
								"%"
							] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mini-track",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${progress}%` } })
							})
						]
					}, project.id);
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "primary",
					onClick: () => setSelectedGoalId(null),
					children: "Готово"
				})
			]
		})
	] });
}
function ProjectsPage({ projects, setProjects, tasks, setTasks, goals, lifeAreas, setLifeAreas, inboxItems, setInboxItems, resources, setResources, weeklyReviews, setWeeklyReviews, planningFocuses, setPlanningFocuses, notify, selectedId, setSelectedId, onNew, onNewTask }) {
	const [tab, setTab] = (0, import_react.useState)("inbox");
	const [newInbox, setNewInbox] = (0, import_react.useState)("");
	const [inboxKind, setInboxKind] = (0, import_react.useState)("idea");
	const [inboxArea, setInboxArea] = (0, import_react.useState)(lifeAreas[0]?.name || "Личное");
	const [newResource, setNewResource] = (0, import_react.useState)("");
	const [resourceNote, setResourceNote] = (0, import_react.useState)("");
	const [resourceArea, setResourceArea] = (0, import_react.useState)(lifeAreas[0]?.name || "Личное");
	const [newMilestone, setNewMilestone] = (0, import_react.useState)("");
	const [newProjectResource, setNewProjectResource] = (0, import_react.useState)("");
	const [voiceSupported, setVoiceSupported] = (0, import_react.useState)(false);
	const [isListening, setIsListening] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (typeof window === "undefined") return;
		const timer = window.setTimeout(() => {
			const speechWindow = window;
			setVoiceSupported(!!(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
		}, 0);
		return () => window.clearTimeout(timer);
	}, []);
	const selected = projects.find((p) => p.id === selectedId);
	const activeProjects = projects.filter((project) => !project.archived);
	const projectsWithoutNextTask = activeProjects.filter((project) => !tasks.some((task) => task.projectId === project.id && !task.done)).length;
	const standaloneTasks = tasks.filter((task) => !task.done && !task.projectId).length;
	const overdueTasks = tasks.filter((task) => !task.done && task.dueDate && task.dueDate < localDateKey(/* @__PURE__ */ new Date())).length;
	function addInbox(event) {
		event.preventDefault();
		if (!newInbox.trim()) return;
		setInboxItems((current) => [{
			id: newEntityId(),
			title: newInbox.trim(),
			kind: inboxKind,
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			area: inboxArea
		}, ...current]);
		setNewInbox("");
	}
	function startVoice() {
		if (typeof window === "undefined" || isListening) return;
		const speechWindow = window;
		const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
		if (!Recognition) return;
		const recognition = new Recognition();
		recognition.lang = "ru-RU";
		recognition.interimResults = false;
		recognition.continuous = false;
		recognition.onresult = (event) => {
			const transcript = event.results[0]?.[0]?.transcript?.trim();
			if (transcript) {
				setInboxItems((current) => [{
					id: newEntityId(),
					title: transcript,
					kind: inboxKind,
					createdAt: (/* @__PURE__ */ new Date()).toISOString(),
					area: inboxArea
				}, ...current]);
				setNewInbox("");
			}
		};
		recognition.onerror = () => setIsListening(false);
		recognition.onend = () => setIsListening(false);
		try {
			setIsListening(true);
			recognition.start();
		} catch {
			setIsListening(false);
		}
	}
	function inboxToTask(item) {
		setTasks((current) => [{
			id: newEntityId(),
			title: item.title,
			area: item.area || lifeAreas[0]?.name || "Личное",
			time: "Сегодня",
			dueDate: localDateKey(/* @__PURE__ */ new Date()),
			priority: "medium",
			done: false
		}, ...current]);
		setInboxItems((current) => current.filter((row) => row.id !== item.id));
	}
	function inboxToResource(item) {
		setResources((current) => [{
			id: newEntityId(),
			title: item.title,
			kind: item.kind === "note" ? "note" : "reference",
			area: item.area || lifeAreas[0]?.name || "Личное",
			note: "Сохранено из входящих"
		}, ...current]);
		setInboxItems((current) => current.filter((row) => row.id !== item.id));
	}
	function addResource(event) {
		event.preventDefault();
		if (!newResource.trim()) return;
		setResources((current) => [{
			id: newEntityId(),
			title: newResource.trim(),
			kind: "note",
			area: resourceArea,
			note: resourceNote.trim() || "Личная заметка"
		}, ...current]);
		setNewResource("");
		setResourceNote("");
	}
	if (selected) {
		const projectId = selected.id;
		const projectArea = selected.area;
		const linked = tasks.filter((t) => t.projectId === projectId);
		const completed = linked.filter((t) => t.done).length;
		const computed = linked.length ? Math.round(completed / linked.length * 100) : selected.progress;
		const milestones = selected.milestones || [];
		const projectResources = resources.filter((resource) => resource.projectId === projectId && !resource.archived);
		const linkedGoals = goals.filter((goal) => goal.projectIds?.includes(projectId));
		function addMilestone(event) {
			event.preventDefault();
			if (!newMilestone.trim()) return;
			setProjects((current) => current.map((project) => project.id === projectId ? {
				...project,
				milestones: [...project.milestones || [], {
					id: newEntityId(),
					title: newMilestone.trim(),
					done: false
				}]
			} : project));
			setNewMilestone("");
		}
		function addProjectResource(event) {
			event.preventDefault();
			if (!newProjectResource.trim()) return;
			setResources((current) => [{
				id: newEntityId(),
				title: newProjectResource.trim(),
				kind: "note",
				area: projectArea,
				note: "Материал проекта",
				projectId
			}, ...current]);
			setNewProjectResource("");
		}
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "back-button",
				onClick: () => setSelectedId(null),
				children: "← Все проекты"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "project-detail-hero card",
				style: projectCoverStyle(selected.cover),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "eyebrow",
						children: ["ПРОЕКТ · ", selected.area]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: selected.name }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selected.notes || `Следующий шаг: ${selected.next}` })
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [computed, "%"] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "project-detail-grid",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "card project-task-panel",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
							title: "Задачи проекта",
							subtitle: `${completed} из ${linked.length} выполнено`,
							action: "Добавить задачу",
							onClick: () => onNewTask(projectId)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "large-task-list",
							children: linked.length ? linked.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: task.done ? "done" : "",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: task.done,
										onChange: () => setTasks((v) => v.map((t) => t.id === task.id ? {
											...t,
											done: !t.done
										} : t))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `check ${task.priority}`,
										children: "✓"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: task.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
										task.time,
										" · ",
										task.priority === "high" ? "Высокий" : "Обычный",
										" приоритет"
									] })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: (e) => {
											e.preventDefault();
											setTasks((v) => v.filter((t) => t.id !== task.id));
										},
										children: "×"
									})
								]
							}, task.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
								text: "В проекте ещё нет задач",
								action: "Добавить первую",
								onClick: () => onNewTask(projectId)
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: "card project-context",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "eyebrow",
								children: "КОНТЕКСТ PARA"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Следующее действие" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selected.next }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Сфера" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
								lifeAreas.find((a) => a.name === selected.area)?.icon,
								" ",
								selected.area
							] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Цели" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: linkedGoals.length ? linkedGoals.map((goal) => goal.title).join(" · ") : "Не связан" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Срок" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selected.due })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setProjects((v) => v.map((p) => p.id === projectId ? {
										...p,
										archived: true
									} : p));
									setSelectedId(null);
								},
								children: "Переместить в архив"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "card milestone-panel",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
								title: "Этапы результата",
								subtitle: `${milestones.filter((item) => item.done).length} из ${milestones.length} завершено`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								onSubmit: addMilestone,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: newMilestone,
									onChange: (event) => setNewMilestone(event.target.value),
									placeholder: "Добавить контрольную точку"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "submit",
									children: "＋"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: milestones.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: item.done ? "done" : "",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: item.done,
										onChange: () => setProjects((current) => current.map((project) => project.id === projectId ? {
											...project,
											milestones: (project.milestones || []).map((row) => row.id === item.id ? {
												...row,
												done: !row.done
											} : row)
										} : project))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✓" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setProjects((current) => current.map((project) => project.id === projectId ? {
											...project,
											milestones: (project.milestones || []).filter((row) => row.id !== item.id)
										} : project)),
										children: "×"
									})
								]
							}, item.id)) })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "card project-resource-panel",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
								title: "Материалы проекта",
								subtitle: `${projectResources.length} ресурсов рядом с задачами`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								onSubmit: addProjectResource,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: newProjectResource,
									onChange: (event) => setNewProjectResource(event.target.value),
									placeholder: "Ссылка, заметка или идея"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "submit",
									children: "Сохранить"
								})]
							}),
							projectResources.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.kind === "link" ? "↗" : item.kind === "reference" ? "◇" : "✦" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.note })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setResources((current) => current.map((row) => row.id === item.id ? {
										...row,
										archived: true
									} : row)),
									children: "×"
								})
							] }, item.id))
						]
					})
				]
			})
		] });
	}
	const visible = projects.filter((p) => tab === "archive" ? p.archived : !p.archived);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageTitle, {
			eyebrow: "ВТОРОЙ МОЗГ · PARA",
			title: "Второй мозг",
			text: "Сначала фиксируйте всё во входящих. Затем превращайте записи в действия, проекты, стандарты сфер или полезные материалы.",
			action: "Новый проект",
			onAction: onNew
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card para-review",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "eyebrow",
					children: "ЕЖЕНЕДЕЛЬНЫЙ ОБЗОР"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: inboxItems.length || projectsWithoutNextTask ? "Система просит внимания" : "Система в порядке" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Пройдите короткий пошаговый ритуал: очистите входящие, обновите проекты, сферы и выберите фокус следующей недели." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "primary",
					onClick: () => setTab("review"),
					children: "Начать пошаговый обзор →"
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "para-review-metrics",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setTab("inbox"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: inboxItems.length }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "во входящих" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setTab("projects"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: projectsWithoutNextTask }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "без следующей задачи" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setTab("projects"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: standaloneTasks }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "задач без проекта" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setTab("review"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: overdueTasks }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "просрочено" })]
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "para-tabs",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: tab === "review" ? "active" : "",
					onClick: () => setTab("review"),
					children: "◎ Обзор"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: tab === "inbox" ? "active" : "",
					onClick: () => setTab("inbox"),
					children: ["⌄ Входящие ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: inboxItems.length })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: tab === "projects" ? "active" : "",
					onClick: () => setTab("projects"),
					children: ["▦ Проекты ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: activeProjects.length })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: tab === "areas" ? "active" : "",
					onClick: () => setTab("areas"),
					children: ["◎ Сферы ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: lifeAreas.length })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: tab === "resources" ? "active" : "",
					onClick: () => setTab("resources"),
					children: ["◇ Ресурсы ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: resources.filter((item) => !item.archived).length })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: tab === "archive" ? "active" : "",
					onClick: () => setTab("archive"),
					children: ["⌁ Архив ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: projects.filter((p) => p.archived).length })]
				})
			]
		}),
		tab === "review" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ParaReviewWizard, {
			inboxItems,
			tasks,
			setTasks,
			projects,
			setProjects,
			goals,
			lifeAreas,
			setLifeAreas,
			weeklyReviews,
			setWeeklyReviews,
			planningFocuses,
			setPlanningFocuses,
			notify
		}) : tab === "inbox" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card inbox-panel",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
					title: "Входящие",
					subtitle: "Запишите или продиктуйте сейчас — организуйте во время обзора"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "inbox-capture",
					onSubmit: addInbox,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							autoFocus: true,
							value: newInbox,
							onChange: (event) => setNewInbox(event.target.value),
							placeholder: "Что пришло в голову?"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `voice-capture ${isListening ? "listening" : ""}`,
							disabled: !voiceSupported,
							onClick: startVoice,
							title: voiceSupported ? "Продиктовать запись" : "Голосовой ввод не поддерживается этим браузером",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isListening ? "◉" : "◉" }), isListening ? "Слушаю…" : voiceSupported ? "Говорить" : "Нет микрофона"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: inboxKind,
							onChange: (event) => setInboxKind(event.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "idea",
									children: "Идея"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "task",
									children: "Действие"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "note",
									children: "Заметка"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: inboxArea,
							onChange: (event) => setInboxArea(event.target.value),
							children: lifeAreas.map((area) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: area.name,
								children: [
									area.icon,
									" ",
									area.name
								]
							}, area.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							className: "primary",
							children: "Сохранить"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "inbox-list",
					children: [inboxItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "inbox-row",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `inbox-kind ${item.kind}`,
								children: item.kind === "idea" ? "✦" : item.kind === "task" ? "✓" : "≡"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
								item.area,
								" · ",
								new Date(item.createdAt).toLocaleDateString("ru-RU", {
									day: "numeric",
									month: "short"
								})
							] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => inboxToTask(item),
									children: "В задачу"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => inboxToResource(item),
									children: "В ресурс"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "Удалить",
									onClick: () => setInboxItems((current) => current.filter((row) => row.id !== item.id)),
									children: "×"
								})
							] })
						]
					}, item.id)), !inboxItems.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "empty-copy",
						children: "Входящие разобраны. Можно спокойно возвращаться к важному."
					})]
				})
			]
		}) : tab === "areas" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "area-overview area-standards",
			children: lifeAreas.map((area) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "card",
				style: { "--area-color": area.color },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: area.icon }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "area-score",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: area.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [area.reviewScore || 50, "%"] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						projects.filter((p) => p.area === area.name && !p.archived).length,
						" проектов · ",
						tasks.filter((t) => t.area === area.name && !t.done).length,
						" открытых задач"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Стандарт сферы" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: area.standard || "",
						onChange: (event) => setLifeAreas((current) => current.map((row) => row.id === area.id ? {
							...row,
							standard: event.target.value
						} : row)),
						placeholder: "Как выглядит хороший уровень этой сферы?"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						"aria-label": `Оценка сферы ${area.name}`,
						type: "range",
						min: "0",
						max: "100",
						step: "5",
						value: area.reviewScore || 50,
						onChange: (event) => setLifeAreas((current) => current.map((row) => row.id === area.id ? {
							...row,
							reviewScore: Number(event.target.value)
						} : row))
					})
				] })]
			}, area.id))
		}) : tab === "resources" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "resources-workspace",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "card resource-capture",
				onSubmit: addResource,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "БАЗА ЗНАНИЙ"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Новый ресурс" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: newResource,
						onChange: (event) => setNewResource(event.target.value),
						placeholder: "Название заметки или материала"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: resourceArea,
						onChange: (event) => setResourceArea(event.target.value),
						children: lifeAreas.map((area) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: area.name,
							children: [
								area.icon,
								" ",
								area.name
							]
						}, area.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: resourceNote,
						onChange: (event) => setResourceNote(event.target.value),
						placeholder: "Коротко: почему это полезно?"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "primary",
						children: "＋ Сохранить ресурс"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "resource-grid",
				children: resources.filter((item) => !item.archived).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "card resource-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.kind === "link" ? "↗" : item.kind === "reference" ? "◇" : "✦" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [item.area, item.projectId ? ` · ${projects.find((project) => project.id === item.projectId)?.name || "Проект"}` : ""] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: item.title }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: item.note }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setResources((current) => current.map((row) => row.id === item.id ? {
								...row,
								archived: true
							} : row)),
							children: "В архив"
						}), item.projectId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSelectedId(item.projectId || null),
							children: "Открыть проект"
						})] })
					]
				}, item.id))
			})]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "project-grid",
			children: [visible.map((p) => {
				const linked = tasks.filter((t) => t.projectId === p.id);
				const progress = linked.length ? Math.round(linked.filter((t) => t.done).length / linked.length * 100) : p.progress;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "card project-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "project-open",
						onClick: () => setSelectedId(p.id),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "project-cover",
							style: projectCoverStyle(p.cover),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								lifeAreas.find((a) => a.name === p.area)?.icon,
								" ",
								p.area
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [progress, "%"] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "project-info",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: p.name }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									linked.length,
									" задач · следующий шаг: ",
									p.next
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mini-track",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${progress}%` } })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Срок: ", p.due] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.archived ? "В архиве" : "Открыть →" })] })
							]
						})]
					}), p.archived && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "restore-button",
						onClick: () => setProjects((v) => v.map((x) => x.id === p.id ? {
							...x,
							archived: false
						} : x)),
						children: "Вернуть в проекты"
					})]
				}, p.id);
			}), !visible.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				text: tab === "archive" ? "Архив пока пуст" : "Создайте первый проект",
				action: "Новый проект",
				onClick: onNew
			})]
		})
	] });
}
function ParaReviewWizard({ inboxItems, tasks, setTasks, projects, setProjects, goals, lifeAreas, setLifeAreas, weeklyReviews, setWeeklyReviews, planningFocuses, setPlanningFocuses, notify }) {
	const [step, setStep] = (0, import_react.useState)(0);
	const weekStart = localDateKey(startOfWeek(/* @__PURE__ */ new Date()));
	const nextWeekDate = startOfWeek(/* @__PURE__ */ new Date());
	nextWeekDate.setDate(nextWeekDate.getDate() + 7);
	const nextWeek = localDateKey(nextWeekDate);
	const [focus, setFocus] = (0, import_react.useState)(planningFocuses[nextWeek] || "");
	const overdue = tasks.filter((task) => !task.done && task.dueDate && task.dueDate < localDateKey(/* @__PURE__ */ new Date()));
	const activeProjects = projects.filter((project) => !project.archived);
	const withoutNext = activeProjects.filter((project) => !tasks.some((task) => task.projectId === project.id && !task.done));
	const areaAverage = lifeAreas.length ? Math.round(lifeAreas.reduce((sum, area) => sum + (area.reviewScore || 50), 0) / lifeAreas.length) : 0;
	const completed = weeklyReviews.find((review) => review.weekStart === weekStart);
	const labels = [
		"Входящие",
		"Календарь и хвосты",
		"Активные проекты",
		"Цели и связи",
		"Сферы жизни",
		"Фокус недели"
	];
	function finish() {
		const review = {
			id: completed?.id || newEntityId(),
			weekStart,
			completedAt: (/* @__PURE__ */ new Date()).toISOString(),
			focus: focus.trim(),
			inboxCount: inboxItems.length,
			overdueCount: overdue.length,
			projectsWithoutNext: withoutNext.length,
			areaAverage
		};
		setWeeklyReviews((current) => [review, ...current.filter((item) => item.weekStart !== weekStart)]);
		if (focus.trim()) setPlanningFocuses((current) => ({
			...current,
			[nextWeek]: focus.trim()
		}));
		notify("Еженедельный обзор PARA завершён · +35 XP");
		setStep(0);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "card para-wizard",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "para-wizard-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "ПОШАГОВЫЙ ОБЗОР PARA"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: completed ? "Обзор этой недели уже завершён" : "Освободите голову и выберите следующую неделю" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: completed ? `Последний раз: ${new Date(completed.completedAt).toLocaleString("ru-RU")}` : "Шесть коротких шагов. Изменения сохраняются сразу." })
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "review-progress",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
						step + 1,
						" / ",
						labels.length
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${(step + 1) / labels.length * 100}%` } }) })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "review-stepper",
				children: labels.map((label, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: index === step ? "active" : index < step ? "done" : "",
					onClick: () => setStep(index),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: index < step ? "✓" : index + 1 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: label })]
				}, label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "review-content",
				children: [
					step === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "review-intro",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "⌄" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: inboxItems.length ? `${inboxItems.length} записей ждут решения` : "Входящие чисты" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Обработайте записи во вкладке «Входящие»: превратите их в задачи, проекты или ресурсы. Можно продолжить обзор сейчас и вернуться к ним позже." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "review-list",
								children: inboxItems.slice(0, 4).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
									item.area,
									" · ",
									item.kind
								] })] }, item.id))
							})
						]
					}),
					step === 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Просроченные и незавершённые действия" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Не переносите список вслепую: завершите, перенесите на сегодня или удалите то, что больше не важно." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "review-action-list",
							children: [overdue.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "!" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: task.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["срок был ", prettyDate(task.dueDate || localDateKey(/* @__PURE__ */ new Date()))] })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setTasks((current) => current.map((item) => item.id === task.id ? {
										...item,
										dueDate: localDateKey(/* @__PURE__ */ new Date())
									} : item)),
									children: "На сегодня"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setTasks((current) => current.map((item) => item.id === task.id ? {
										...item,
										done: true,
										completedAt: (/* @__PURE__ */ new Date()).toISOString()
									} : item)),
									children: "Готово"
								})
							] }, task.id)), !overdue.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "empty-copy",
								children: "Просроченных задач нет."
							})]
						})
					] }),
					step === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "У каждого проекта есть следующее действие" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Проект без следующего шага быстро становится фоном. Обновите формулировку прямо здесь." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "review-projects",
							children: activeProjects.map((project) => {
								const hasTask = tasks.some((task) => task.projectId === project.id && !task.done);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: hasTask ? "ready" : "attention",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: hasTask ? "✓" : "!" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: project.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: hasTask ? "Следующая задача определена" : "Нет открытой задачи" })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											defaultValue: project.next,
											onBlur: (event) => setProjects((current) => current.map((item) => item.id === project.id ? {
												...item,
												next: event.target.value || "Определить следующий шаг"
											} : item))
										})
									]
								}, project.id);
							})
						})
					] }),
					step === 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Проекты действительно двигают цели?" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Здесь видна связь. Изменить набор связанных проектов можно в разделе «Цели»." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "review-goals",
							children: goals.map((goal) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: goal.period }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: goal.title }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: goal.projectIds?.length ? `${goal.projectIds.length} проектов · ${goalProgressValue(goal, projects, tasks)}% прогресса` : "Нет связанного проекта" })
							] }, goal.id))
						})
					] }),
					step === 4 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Быстрая проверка сфер жизни" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Поставьте честную оценку. Низкая оценка — это сигнал внимания, а не повод для штрафа." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "review-areas",
							children: lifeAreas.map((area) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: area.icon }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: area.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: area.standard || "Стандарт не задан" })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [area.reviewScore || 50, "%"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "range",
									min: "0",
									max: "100",
									step: "5",
									value: area.reviewScore || 50,
									onChange: (event) => setLifeAreas((current) => current.map((item) => item.id === area.id ? {
										...item,
										reviewScore: Number(event.target.value)
									} : item))
								})
							] }, area.id))
						})
					] }),
					step === 5 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "review-focus",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Какой один результат сделает неделю хорошей?" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Этот текст автоматически появится в планировании как фокус следующей недели." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: focus,
								onChange: (event) => setFocus(event.target.value),
								placeholder: "Например: выпустить первую версию и сохранить два вечера свободными"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "review-summary",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Входящие" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: inboxItems.length })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Просрочено" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: overdue.length })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Проекты без действия" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: withoutNext.length })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Баланс сфер" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [areaAverage, "%"] })] })
								]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "review-footer",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: step === 0,
					onClick: () => setStep((value) => Math.max(0, value - 1)),
					children: "← Назад"
				}), step < labels.length - 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "primary",
					onClick: () => setStep((value) => Math.min(labels.length - 1, value + 1)),
					children: "Продолжить →"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "primary",
					onClick: finish,
					children: "✓ Завершить обзор"
				})]
			})
		]
	});
}
function HabitsPage({ habits, setHabits, history, clock, onToggle, onNew, onEdit }) {
	const todayDone = habits.filter((h) => h.checks[clock.today]).length;
	const weekDone = habits.reduce((sum, h) => sum + Object.values(h.checks).filter(Boolean).length, 0);
	const possible = Math.max(1, habits.length * (clock.dates.findIndex((d) => localDateKey(d) === clock.today) + 1));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageTitle, {
			eyebrow: "РИТМ",
			title: "Привычки",
			text: "Неделя начинается в воскресенье в 05:00. Изменять можно только сегодняшний день.",
			action: "Новая привычка",
			onAction: onNew
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "stats-strip",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: `${todayDone}/${habits.length}`,
					label: "Сегодня"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: `${Math.round(weekDone / possible * 100)}%`,
					label: "Темп недели"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: weekDone.toString(),
					label: "Отметок"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					value: history.length.toString(),
					label: "Недель в истории"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "habit-week card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "week-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
					prettyDate(clock.weekStart),
					" — ",
					prettyDate(localDateKey(clock.dates[6]))
				] }), clock.dates.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: localDateKey(d) === clock.today ? "today" : "",
					children: [dayNames[i], /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: d.getDate() })]
				}, i))]
			}), habits.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "habit-week-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: h.icon }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "habit-copy",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: h.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
							h.area,
							" · ",
							Object.values(h.checks).filter(Boolean).length,
							"/7"
						] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "habit-edit",
						onClick: () => onEdit(h),
						children: "Изменить"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "habit-delete",
						"aria-label": `Удалить ${h.name}`,
						onClick: () => setHabits((v) => v.filter((x) => x.id !== h.id)),
						children: "×"
					})
				] }), clock.dates.map((date, i) => {
					const key = localDateKey(date);
					const isToday = key === clock.today;
					const past = key < clock.today;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: !isToday,
						"aria-label": `${h.name}, ${dayNames[i]}${isToday ? ", сегодня" : past ? ", прошедший день" : ", будущий день"}`,
						title: isToday ? "Отметить сегодняшний день" : past ? "Прошедший день заблокирован" : "Будущий день заблокирован",
						onClick: () => onToggle(h.id, key),
						className: `${h.checks[key] ? "hit" : ""} ${isToday ? "editable" : "locked"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: dayNames[i] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✓" })]
					}, `${h.id}-${key}`);
				})]
			}, h.id))]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "habit-history card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
				title: "История прогресса",
				subtitle: "Завершённые недели сохраняются автоматически"
			}), history.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "history-grid",
				children: history.slice(-8).reverse().map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: prettyDate(item.weekStart) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.habitName }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mini-track",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${Math.round(item.completed / item.total * 100)}%` } })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
						item.completed,
						"/",
						item.total,
						" · ",
						Math.round(item.completed / item.total * 100),
						"%"
					] })
				] }, item.id))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "empty-copy",
				children: "История появится после первого воскресного сброса в 05:00."
			})]
		})
	] });
}
function FinancePage({ accounts, setAccounts, transactions, setTransactions, categories, setCategories, budgetLines, setBudgetLines, recurringExpenses, setRecurringExpenses, onOperation, onTransfer, onAccount }) {
	const [categoriesOpen, setCategoriesOpen] = (0, import_react.useState)(false);
	const [budgetOpen, setBudgetOpen] = (0, import_react.useState)(false);
	const [recurringOpen, setRecurringOpen] = (0, import_react.useState)(false);
	const [editingRecurring, setEditingRecurring] = (0, import_react.useState)(null);
	const now = /* @__PURE__ */ new Date();
	const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const monthTransactions = transactions.filter((item) => item.date.startsWith(monthKey));
	const income = monthTransactions.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
	const expenses = monthTransactions.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
	const monthlyBudget = budgetLines.reduce((sum, line) => sum + line.limit, 0);
	const remaining = monthlyBudget - expenses;
	const budgetUsage = monthlyBudget ? Math.round(expenses / monthlyBudget * 100) : 0;
	const capital = accounts.reduce((sum, account) => sum + account.balance, 0);
	const upcoming = transactions.filter((t) => t.kind === "installment" && !t.posted).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
	const weekStart = startOfWeek(now);
	const weekDates = Array.from({ length: 7 }, (_, index) => {
		const date = new Date(weekStart);
		date.setDate(date.getDate() + index);
		return date;
	});
	const dailySpend = weekDates.map((date) => transactions.filter((item) => item.kind === "expense" && item.date === localDateKey(date)).reduce((sum, item) => sum + item.amount, 0));
	const weekSpent = dailySpend.reduce((sum, value) => sum + value, 0);
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const weeklyBudget = monthlyBudget / daysInMonth * 7;
	const dailyPlan = weeklyBudget / 7;
	const maxDay = Math.max(dailyPlan, ...dailySpend, 1);
	const weekDeviation = weekSpent - weeklyBudget;
	function nextRecurringDate(item) {
		const moveToNext = Math.min(item.dayOfMonth, daysInMonth) < now.getDate() || item.lastProcessedPeriod === monthKey;
		const targetBase = new Date(now.getFullYear(), now.getMonth() + (moveToNext ? 1 : 0), 1, 12);
		const targetMaxDay = new Date(targetBase.getFullYear(), targetBase.getMonth() + 1, 0).getDate();
		return localDateKey(new Date(targetBase.getFullYear(), targetBase.getMonth(), Math.min(item.dayOfMonth, targetMaxDay), 12));
	}
	function saveRecurring(draft) {
		if (editingRecurring) setRecurringExpenses((current) => current.map((item) => item.id === editingRecurring.id ? {
			...draft,
			id: item.id,
			lastProcessedPeriod: item.lastProcessedPeriod
		} : item));
		else {
			const currentPeriodAlreadyPassed = draft.dayOfMonth <= now.getDate() ? monthKey : void 0;
			setRecurringExpenses((current) => [...current, {
				...draft,
				id: newEntityId(),
				lastProcessedPeriod: currentPeriodAlreadyPassed
			}]);
		}
		setRecurringOpen(false);
		setEditingRecurring(null);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageTitle, {
			eyebrow: "РЕСУРСЫ",
			title: "Финансы",
			text: "Бюджет, фактические расходы и постоянные платежи — в одном денежном ритме.",
			action: "Операция",
			onAction: onOperation,
			extra: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "secondary-action",
					onClick: () => setBudgetOpen(true),
					children: "◎ Бюджет"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "secondary-action",
					onClick: () => setCategoriesOpen(true),
					children: "◉ Категории"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "secondary-action",
					onClick: onTransfer,
					children: "⇄ Перевод"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "secondary-action",
					onClick: onAccount,
					children: "＋ Счёт"
				})
			] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "finance-hero budget-hero",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "БЮДЖЕТ НА МЕСЯЦ" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(monthlyBudget) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [budgetLines.length, " категорий"] })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ФАКТ ЗА МЕСЯЦ" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(expenses) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [budgetUsage, "% бюджета использовано"] })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: remaining < 0 ? "over-budget" : "",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: remaining < 0 ? "ПЕРЕРАСХОД" : "ОСТАЛОСЬ" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(Math.abs(remaining)) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: remaining < 0 ? "выше плана" : "доступно до конца месяца" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ДОХОДЫ ЗА МЕСЯЦ" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "lime",
						children: formatIls(income)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["капитал сейчас: ", formatIls(capital)] })
				] })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinanceForecast, {
			accounts,
			transactions,
			budgetLines,
			recurringExpenses
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card weekly-spend",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "weekly-spend-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "eyebrow",
							children: "НЕДЕЛЬНЫЙ РИТМ"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Расходы из всех источников" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Наличные, банковская и кредитная карты · план ", formatIls(weeklyBudget)] })
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: weekDeviation > 0 ? "bad" : "good",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: weekDeviation > 0 ? "ВЫШЕ НЕДЕЛЬНОГО ПЛАНА" : "НИЖЕ НЕДЕЛЬНОГО ПЛАНА" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [weekDeviation > 0 ? "+" : "−", formatIls(Math.abs(weekDeviation))] })]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "spend-scale",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "plan-line",
						style: { bottom: `${Math.min(92, dailyPlan / maxDay * 100)}%` },
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["план в день ", formatIls(dailyPlan)] })
					}), weekDates.map((date, index) => {
						const value = dailySpend[index];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `spend-day ${value > dailyPlan ? "over" : ""} ${localDateKey(date) === localDateKey(now) ? "today" : ""}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "spend-value",
									children: value ? formatIls(value) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "spend-column",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { height: `${value / maxDay * 100}%` } })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: dayNames[index] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: date.getDate() })
							]
						}, localDateKey(date));
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "weekly-source-legend",
					children: accounts.map((account) => {
						const spent = transactions.filter((item) => item.kind === "expense" && item.accountId === account.id && weekDates.some((date) => localDateKey(date) === item.date)).reduce((sum, item) => sum + item.amount, 0);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: account.type }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: account.name }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(spent) })
						] }, account.id);
					})
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinanceCalendar, {
			recurringExpenses,
			transactions,
			accounts
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "accounts-grid",
			children: accounts.map((account) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountCard, {
				account,
				debitAccounts: accounts.filter((a) => a.type === "debit"),
				onSave: (next) => setAccounts((v) => v.map((a) => a.id === next.id ? next : a))
			}, account.id))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "finance-grid",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card budget budget-vs-actual",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
					title: "Бюджет: план и факт",
					subtitle: `${new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(now)} · ${budgetUsage}%`,
					action: "Настроить",
					onClick: () => setBudgetOpen(true)
				}), categories.map((category) => {
					const actual = monthTransactions.filter((t) => t.kind === "expense" && t.category === category.name).reduce((sum, t) => sum + t.amount, 0);
					const plan = budgetLines.find((line) => line.category === category.name)?.limit || 0;
					const percent = plan ? Math.round(actual / plan * 100) : actual ? 100 : 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: actual > plan && plan > 0 ? "over" : "",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								category.icon,
								" ",
								category.name
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mini-track",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${Math.min(100, percent)}%` } })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [percent, "%"] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
								formatIls(actual),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["/ ", formatIls(plan)] })
							] })
						]
					}, category.id);
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card installments",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
					title: "План кредитных платежей",
					subtitle: `${upcoming.length} будущих списаний`
				}), upcoming.length ? upcoming.slice(0, 8).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "installment-row",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: prettyDate(item.dueDate || item.date) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "автосписание с основного счёта" })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: formatIls(item.amount) })
					]
				}, item.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "empty-copy",
					children: "Добавьте покупку с кредитной карты и выберите число платежей."
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card recurring-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
				title: "Постоянные расходы",
				subtitle: "В дату списания или при следующем открытии NEXUS",
				action: "Добавить платёж",
				onClick: () => {
					setEditingRecurring(null);
					setRecurringOpen(true);
				}
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "recurring-list",
				children: recurringExpenses.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: !item.active ? "paused" : "",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: categories.find((category) => category.name === item.category)?.icon || "↻" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
							item.category,
							" · ",
							accounts.find((account) => account.id === item.accountId)?.name
						] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: formatIls(item.amount) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "recurring-date",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "следующее списание" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: prettyDate(nextRecurringDate(item)) })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `recurring-toggle ${item.active ? "active" : ""}`,
							onClick: () => setRecurringExpenses((current) => current.map((row) => row.id === item.id ? {
								...row,
								active: !row.active
							} : row)),
							children: item.active ? "Вкл" : "Пауза"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setEditingRecurring(item);
								setRecurringOpen(true);
							},
							children: "Изменить"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": `Удалить ${item.title}`,
							onClick: () => setRecurringExpenses((current) => current.filter((row) => row.id !== item.id)),
							children: "×"
						})
					]
				}, item.id))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card transactions",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
				title: "Журнал операций",
				subtitle: `${transactions.filter((t) => t.kind !== "installment" || t.posted).length} записей`,
				action: "Новая операция",
				onClick: onOperation
			}), transactions.filter((t) => t.kind !== "installment" || t.posted).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "transaction-row",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: t.kind,
						children: t.kind === "income" ? "↑" : t.kind === "transfer" ? "⇄" : t.recurringId ? "↻" : "↓"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
						categories.find((c) => c.name === t.category)?.icon,
						" ",
						t.category,
						" · ",
						prettyDate(t.date),
						" · ",
						accounts.find((a) => a.id === t.accountId)?.name,
						t.recurringId ? " · постоянный платёж" : ""
					] })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", {
						className: t.kind,
						children: [t.kind === "income" ? "+" : t.kind === "transfer" ? "" : "−", formatIls(t.amount)]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setTransactions((v) => v.filter((x) => x.id !== t.id)),
						children: "×"
					})
				]
			}, t.id))]
		}),
		categoriesOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinanceCategoriesModal, {
			categories,
			setCategories,
			onClose: () => setCategoriesOpen(false)
		}),
		" ",
		budgetOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BudgetModal, {
			categories,
			lines: budgetLines,
			setLines: setBudgetLines,
			onClose: () => setBudgetOpen(false)
		}),
		" ",
		recurringOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecurringExpenseModal, {
			accounts,
			categories,
			initial: editingRecurring,
			onClose: () => {
				setRecurringOpen(false);
				setEditingRecurring(null);
			},
			onSave: saveRecurring
		})
	] });
}
function FinanceForecast({ accounts, transactions, budgetLines, recurringExpenses }) {
	const now = /* @__PURE__ */ new Date();
	const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const elapsed = Math.max(1, now.getDate());
	const remainingDays = Math.max(0, daysInMonth - now.getDate());
	const budget = budgetLines.reduce((sum, line) => sum + line.limit, 0);
	const actual = transactions.filter((item) => item.kind === "expense" && item.date.startsWith(period)).reduce((sum, item) => sum + item.amount, 0);
	const dailyPace = transactions.filter((item) => item.kind === "expense" && item.date.startsWith(period) && !item.recurringId).reduce((sum, item) => sum + item.amount, 0) / elapsed;
	const futureRecurring = recurringExpenses.filter((item) => item.active && item.dayOfMonth > now.getDate() && item.lastProcessedPeriod !== period).reduce((sum, item) => sum + item.amount, 0);
	const futureCredit = transactions.filter((item) => item.kind === "installment" && !item.posted && (item.dueDate || item.date).startsWith(period)).reduce((sum, item) => sum + item.amount, 0);
	const projectedVariable = dailyPace * remainingDays;
	const projectedSpend = actual + futureRecurring + projectedVariable;
	const deviation = projectedSpend - budget;
	const projectedLiquidity = accounts.filter((account) => account.type !== "credit").reduce((sum, account) => sum + account.balance, 0) - futureRecurring - futureCredit - projectedVariable;
	const safeDaily = remainingDays ? Math.max(0, (budget - actual - futureRecurring) / remainingDays) : 0;
	const forecastPercent = budget ? Math.round(projectedSpend / budget * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: `card finance-forecast ${deviation > 0 ? "risk" : "safe"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "forecast-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "ПРОГНОЗ ДО КОНЦА МЕСЯЦА"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: deviation > 0 ? `При текущем темпе возможен перерасход ${formatIls(deviation)}` : `Темп укладывается в бюджет с запасом ${formatIls(Math.abs(deviation))}` }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Прогноз обновляется после каждой операции и учитывает постоянные списания. Кредитные платежи отдельно влияют на ликвидность, но не дублируются как новый расход." })
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "forecast-ring",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ring, {
						value: Math.min(100, forecastPercent),
						color: deviation > 0 ? "#ff6b7d" : "var(--lime)",
						size: 92
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [forecastPercent, "% от бюджета"] })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "forecast-track",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "forecast-budget-line",
					style: { left: `${Math.min(96, budget / Math.max(projectedSpend, budget, 1) * 100)}%` },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "бюджет" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${Math.min(100, projectedSpend / Math.max(projectedSpend, budget, 1) * 100)}%` } })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "forecast-metrics",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ПРОГНОЗ РАСХОДОВ" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(projectedSpend) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"факт ",
							formatIls(actual),
							" + темп"
						] })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ЕЩЁ ПОСТОЯННЫХ" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(futureRecurring) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "до конца месяца" })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "КРЕДИТНЫЕ СПИСАНИЯ" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(futureCredit) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "из основного счёта" })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "БЕЗОПАСНО В ДЕНЬ" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(safeDaily) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [remainingDays, " дней осталось"] })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: projectedLiquidity < 0 ? "negative" : "",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ЛИКВИДНОСТЬ К КОНЦУ" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(projectedLiquidity) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "наличные + банк, прогноз" })
						]
					})
				]
			})
		]
	});
}
function FinanceCalendar({ recurringExpenses, transactions, accounts }) {
	const [month, setMonth] = (0, import_react.useState)(() => {
		const date = /* @__PURE__ */ new Date();
		return new Date(date.getFullYear(), date.getMonth(), 1, 12);
	});
	const year = month.getFullYear();
	const monthIndex = month.getMonth();
	const period = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
	const lastDay = new Date(year, monthIndex + 1, 0).getDate();
	const recurringItems = recurringExpenses.filter((item) => item.active).map((item) => {
		const date = localDateKey(new Date(year, monthIndex, Math.min(item.dayOfMonth, lastDay), 12));
		const paid = transactions.some((transaction) => transaction.recurringId === item.id && transaction.recurringPeriod === period) || item.lastProcessedPeriod === period;
		return {
			id: `recurring-${item.id}`,
			date,
			title: item.title,
			amount: item.amount,
			kind: "recurring",
			paid,
			account: accounts.find((account) => account.id === item.accountId)?.name || "Счёт"
		};
	});
	const creditItems = transactions.filter((item) => item.kind === "installment" && (item.dueDate || item.date).startsWith(period)).map((item) => {
		const credit = accounts.find((account) => account.id === item.accountId);
		const debit = accounts.find((account) => account.id === credit?.linkedAccountId);
		return {
			id: `credit-${item.id}`,
			date: item.dueDate || item.date,
			title: item.title,
			amount: item.amount,
			kind: "credit",
			paid: Boolean(item.posted),
			account: debit?.name || credit?.name || "Основной счёт"
		};
	});
	const items = [...recurringItems, ...creditItems].sort((a, b) => a.date.localeCompare(b.date));
	const recurringTotal = recurringItems.reduce((sum, item) => sum + item.amount, 0);
	const creditTotal = creditItems.reduce((sum, item) => sum + item.amount, 0);
	const gridStart = new Date(year, monthIndex, 1, 12);
	gridStart.setDate(gridStart.getDate() - gridStart.getDay());
	const dates = Array.from({ length: 42 }, (_, index) => {
		const date = new Date(gridStart);
		date.setDate(date.getDate() + index);
		return date;
	});
	function move(delta) {
		setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1, 12));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "card finance-calendar",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "finance-calendar-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "ДЕНЕЖНЫЙ КАЛЕНДАРЬ"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Списания и кредитные платежи" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Все обязательства видны заранее — обычные списания и рассрочки не потеряются." })
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "finance-calendar-summary",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ПОСТОЯННЫЕ" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(recurringTotal) })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "КРЕДИТНЫЕ" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(creditTotal) })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ВСЕГО" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(recurringTotal + creditTotal) })] })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "finance-calendar-toolbar",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => move(-1),
						"aria-label": "Предыдущий месяц",
						children: "←"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: new Intl.DateTimeFormat("ru-RU", {
						month: "long",
						year: "numeric"
					}).format(month) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => move(1),
						"aria-label": "Следующий месяц",
						children: "→"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							const today = /* @__PURE__ */ new Date();
							setMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
						},
						children: "Сегодня"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "finance-calendar-legend",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "● Постоянный" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "● Кредитный" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✓ Списан" })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "finance-calendar-scroll",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "finance-calendar-inner",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "finance-calendar-weekdays",
						children: dayNames.map((day) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: day }, day))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "finance-calendar-grid",
						children: dates.map((date) => {
							const key = localDateKey(date);
							const dayItems = items.filter((item) => item.date === key);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `finance-calendar-day ${date.getMonth() !== monthIndex ? "outside" : ""} ${key === localDateKey(/* @__PURE__ */ new Date()) ? "today" : ""}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: date.getDate() }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: dayItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: `finance-calendar-event ${item.kind} ${item.paid ? "paid" : ""}`,
									title: `${item.title} · ${item.account}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											item.kind === "credit" ? "◇" : "↻",
											" ",
											item.title
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: formatIls(item.amount) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.paid ? "✓ списано" : item.account })
									]
								}, item.id)) })]
							}, key);
						})
					})]
				})
			})
		]
	});
}
function AccountCard({ account, debitAccounts, onSave }) {
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [name, setName] = (0, import_react.useState)(account.name);
	const [balance, setBalance] = (0, import_react.useState)(String(account.balance));
	const [linked, setLinked] = (0, import_react.useState)(String(account.linkedAccountId || ""));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: `card account-card ${account.type}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: account.type === "cash" ? "▣" : account.type === "debit" ? "▤" : "◇" }), editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				"aria-label": "Название счёта",
				value: name,
				onChange: (e) => setName(e.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				"aria-label": "Баланс счёта",
				type: "number",
				value: balance,
				onChange: (e) => setBalance(e.target.value)
			}),
			account.type === "credit" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				"aria-label": "Счёт списания",
				value: linked,
				onChange: (e) => setLinked(e.target.value),
				children: debitAccounts.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: a.id,
					children: a.name
				}, a.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					onSave({
						...account,
						name,
						balance: Number(balance),
						linkedAccountId: Number(linked) || account.linkedAccountId
					});
					setEditing(false);
				},
				children: "Сохранить"
			})
		] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: account.type === "cash" ? "НАЛИЧНЫЕ" : account.type === "debit" ? "БАНКОВСКИЙ СЧЁТ" : "КРЕДИТНАЯ КАРТА" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(account.balance) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: account.type === "credit" ? `Списание ${account.billingDay || 15} числа` : "Доступный остаток" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setEditing(true),
				children: "Изменить"
			})
		] })]
	});
}
function HealthPage({ notes, setNotes, onMetric, notify }) {
	const [note, setNote] = (0, import_react.useState)("");
	function save() {
		if (!note.trim()) return;
		setNotes((v) => [{
			id: newEntityId(),
			kind: "note",
			title: "Заметка о состоянии",
			value: note.trim(),
			date: (/* @__PURE__ */ new Date()).toISOString()
		}, ...v]);
		setNote("");
		notify("Заметка о здоровье сохранена");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageTitle, {
			eyebrow: "СОСТОЯНИЕ",
			title: "Здоровье",
			text: "Метрики и заметки сохраняются в журнале здоровья.",
			action: "Записать метрику",
			onAction: onMetric
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "health-grid",
			children: [
				[
					"Сон",
					"7ч 42м",
					"качество 84%",
					"☾"
				],
				[
					"Энергия",
					"8 / 10",
					"стабильно весь день",
					"⚡"
				],
				[
					"Активность",
					"8 462",
					"шагов сегодня",
					"↗"
				],
				[
					"Вес",
					"78,4 кг",
					"−0,8 кг за месяц",
					"◎"
				]
			].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "card health-stat",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x[3] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: x[0] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: x[1] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: x[2] })
				]
			}, x[0]))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "health-bottom",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card energy-chart",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
					title: "Энергия за 7 дней",
					subtitle: "Среднее: 7,4"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bars",
					children: [
						52,
						68,
						62,
						81,
						74,
						88,
						79
					].map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { height: `${h}%` } }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: dayNames[i] })] }, i))
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card note-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "ЗАМЕТКА О СОСТОЯНИИ"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Что замечаешь сегодня?" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: note,
						onChange: (e) => setNote(e.target.value),
						placeholder: "Энергия, самочувствие, симптомы, мысли..."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: save,
						children: "Сохранить заметку"
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card notes-history",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
				title: "Журнал здоровья",
				subtitle: `${notes.length} записей`
			}), notes.length ? notes.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.kind === "metric" ? "◎" : "✦" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.title }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: item.value }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: new Date(item.date).toLocaleString("ru-RU") })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setNotes((v) => v.filter((n) => n.id !== item.id)),
					children: "×"
				})
			] }, item.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "empty-copy",
				children: "Добавьте первую метрику или заметку."
			})]
		})
	] });
}
function PlanningPage({ events, setEvents, tasks, setTasks, focuses, setFocuses, onNew, notify }) {
	const [view, setView] = (0, import_react.useState)("week");
	const [anchorDate, setAnchorDate] = (0, import_react.useState)(() => /* @__PURE__ */ new Date());
	const [savedWeek, setSavedWeek] = (0, import_react.useState)("");
	const [touchDraggingTaskId, setTouchDraggingTaskId] = (0, import_react.useState)(null);
	const weekStart = startOfWeek(anchorDate);
	const weekKey = localDateKey(weekStart);
	const note = focuses[weekKey] || "";
	const weekDates = Array.from({ length: 7 }, (_, i) => {
		const d = new Date(weekStart);
		d.setDate(d.getDate() + i);
		return d;
	});
	const eventDate = (event) => {
		if (event.date) return event.date;
		const fixed = startOfWeek(/* @__PURE__ */ new Date());
		fixed.setDate(fixed.getDate() + Math.max(0, Math.min(6, Number(event.day || 0))));
		return localDateKey(fixed);
	};
	const schedule = [...events.map((event) => ({
		key: `event-${event.id}`,
		id: event.id,
		type: "event",
		title: event.title,
		date: eventDate(event),
		time: event.time,
		note: event.note || "План",
		tone: event.tone,
		duration: 60
	})), ...tasks.filter((task) => task.dueDate && !task.archived).map((task) => ({
		key: `task-${task.id}`,
		id: task.id,
		type: "task",
		title: task.title,
		date: task.dueDate || "",
		time: /^\d{2}:\d{2}$/.test(task.time) ? task.time : "08:00",
		note: `${task.duration || 30} мин · ${contextLabel[task.context || "anywhere"]}`,
		done: task.done,
		duration: task.duration || 30
	}))];
	const upcoming = schedule.filter((item) => item.date >= localDateKey(/* @__PURE__ */ new Date()) && !item.done).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
	const focusSaved = savedWeek === weekKey;
	const hours = [
		"08:00",
		"10:00",
		"12:00",
		"14:00",
		"16:00",
		"18:00",
		"20:00"
	];
	function navigatePeriod(delta) {
		setAnchorDate((current) => {
			const next = new Date(current);
			if (view === "day") next.setDate(next.getDate() + delta);
			else if (view === "week") next.setDate(next.getDate() + delta * 7);
			else next.setMonth(next.getMonth() + delta, 1);
			return next;
		});
	}
	function moveTask(taskId, date, time) {
		setTasks((current) => current.map((task) => task.id === taskId ? {
			...task,
			dueDate: date,
			time: time || task.time
		} : task));
		notify(`Задача перенесена на ${prettyDate(date)}${time ? ` · ${time}` : ""}`);
	}
	function timeFromPosition(element, clientY) {
		const rect = element.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (clientY - rect.top - 48) / Math.max(1, rect.height - 48)));
		const value = Math.round((8 + ratio * 12) * 2) / 2;
		return `${String(Math.min(20, Math.floor(value))).padStart(2, "0")}:${value % 1 ? "30" : "00"}`;
	}
	function dropOnTimeline(event, date) {
		event.preventDefault();
		const taskId = Number(event.dataTransfer.getData("text/nexus-task"));
		if (!taskId) return;
		moveTask(taskId, date, timeFromPosition(event.currentTarget, event.clientY));
	}
	function taskDrag(event, item) {
		if (item.type !== "task") return;
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/nexus-task", String(item.id));
	}
	function startTouchDrag(event, item) {
		if (item.type !== "task" || event.pointerType === "mouse") return;
		event.currentTarget.setPointerCapture(event.pointerId);
		setTouchDraggingTaskId(item.id);
	}
	function finishTouchDrag(event) {
		if (touchDraggingTaskId === null) return;
		const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-calendar-date]");
		if (target?.dataset.calendarDate) {
			const time = target.dataset.calendarTimeline === "true" ? timeFromPosition(target, event.clientY) : void 0;
			moveTask(touchDraggingTaskId, target.dataset.calendarDate, time);
		}
		setTouchDraggingTaskId(null);
	}
	function renderEvent(item, index) {
		const [hoursValue, minutesValue] = /^\d{2}:\d{2}$/.test(item.time) ? item.time.split(":").map(Number) : [8, 0];
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			draggable: item.type === "task",
			onDragStart: (event) => taskDrag(event, item),
			onPointerDown: (event) => startTouchDrag(event, item),
			onPointerUp: finishTouchDrag,
			onPointerCancel: () => setTouchDraggingTaskId(null),
			className: `event ${item.type === "task" ? "task-calendar-event" : `${item.tone}-event`} ${item.done ? "completed" : ""} ${touchDraggingTaskId === item.id ? "touch-dragging" : ""}`,
			style: {
				top: Math.max(54, 54 + (hoursValue - 8 + minutesValue / 60) * 32 + index * 6),
				height: Math.max(48, Math.min(112, (item.duration || 60) / 60 * 64))
			},
			children: [
				item.type === "task" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "calendar-task-check",
					"aria-label": item.done ? "Вернуть задачу в работу" : "Выполнить задачу",
					onClick: () => setTasks((current) => current.map((task) => task.id === item.id ? {
						...task,
						done: !task.done
					} : task)),
					children: item.done ? "✓" : "○"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.title }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.type === "task" ? `${item.time} · ${item.note}` : item.time }),
				item.type === "event" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-label": "Удалить событие",
					onClick: () => setEvents((current) => current.filter((event) => event.id !== item.id)),
					children: "×"
				})
			]
		}, item.key);
	}
	function renderTimeline(dates, className) {
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: `${className} card calendar-timeline`,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "calendar-hours",
				children: hours.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: value }, value))
			}), dates.map((date) => {
				const key = localDateKey(date);
				const dayItems = schedule.filter((item) => item.date === key).sort((a, b) => a.time.localeCompare(b.time));
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					"data-calendar-date": key,
					"data-calendar-timeline": "true",
					className: `calendar-day ${key === localDateKey(/* @__PURE__ */ new Date()) ? "today" : ""}`,
					onDragOver: (event) => event.preventDefault(),
					onDrop: (event) => dropOnTimeline(event, key),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
							dayNames[date.getDay()],
							" ",
							date.getDate()
						] }),
						dayItems.map(renderEvent),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "drop-hint",
							children: "Перетащите задачу сюда"
						})
					]
				}, key);
			})]
		});
	}
	const monthFirst = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 12);
	const monthGridStart = new Date(monthFirst);
	monthGridStart.setDate(monthGridStart.getDate() - monthGridStart.getDay());
	const monthDates = Array.from({ length: 42 }, (_, index) => {
		const date = new Date(monthGridStart);
		date.setDate(date.getDate() + index);
		return date;
	});
	const periodLabel = view === "day" ? new Intl.DateTimeFormat("ru-RU", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric"
	}).format(anchorDate) : view === "week" ? `${prettyDate(localDateKey(weekDates[0]))} — ${prettyDate(localDateKey(weekDates[6]))}` : new Intl.DateTimeFormat("ru-RU", {
		month: "long",
		year: "numeric"
	}).format(anchorDate);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageTitle, {
			eyebrow: "ВРЕМЯ",
			title: "Планирование",
			text: "Выбирайте масштаб дня, недели или месяца. Задачи можно перетаскивать на нужную дату и время.",
			action: "Новый план",
			onAction: onNew
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: `card planning-note ${focusSaved ? "saved" : ""}`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "ФОКУС НЕДЕЛИ"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: note || "Что должно стать главным результатом?" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
						prettyDate(weekKey),
						" — ",
						prettyDate(localDateKey(weekDates[6]))
					] })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: note,
					onChange: (event) => {
						setFocuses((current) => ({
							...current,
							[weekKey]: event.target.value
						}));
						setSavedWeek("");
					},
					placeholder: "Например: закончить MVP и оставить пятницу без встреч"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: !note.trim(),
					onClick: () => {
						setSavedWeek(weekKey);
						notify("Фокус этой недели сохранён");
					},
					children: focusSaved ? "✓ Сохранено" : "Сохранить фокус"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "calendar-toolbar",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => navigatePeriod(-1),
					"aria-label": "Предыдущий период",
					children: "←"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: periodLabel }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => navigatePeriod(1),
					"aria-label": "Следующий период",
					children: "→"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setAnchorDate(/* @__PURE__ */ new Date()),
					children: "Сегодня"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "calendar-view-switch",
					"aria-label": "Режим календаря",
					children: [
						["day", "День"],
						["week", "Неделя"],
						["month", "Месяц"]
					].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: view === value ? "active" : "",
						onClick: () => setView(value),
						children: label
					}, value))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "calendar-legend",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "● Планы" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "● Задачи" })]
				})
			]
		}),
		view === "day" ? renderTimeline([anchorDate], "day-calendar") : view === "week" ? renderTimeline(weekDates, "week-calendar") : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "card month-calendar",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "month-calendar-inner",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "month-calendar-weekdays",
					children: dayNames.map((day) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: day }, day))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "month-calendar-grid",
					children: monthDates.map((date) => {
						const key = localDateKey(date);
						const items = schedule.filter((item) => item.date === key).sort((a, b) => a.time.localeCompare(b.time));
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							"data-calendar-date": key,
							className: `month-calendar-day ${date.getMonth() !== anchorDate.getMonth() ? "outside" : ""} ${key === localDateKey(/* @__PURE__ */ new Date()) ? "today" : ""}`,
							onDragOver: (event) => event.preventDefault(),
							onDrop: (event) => {
								event.preventDefault();
								const taskId = Number(event.dataTransfer.getData("text/nexus-task"));
								if (taskId) moveTask(taskId, key);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: date.getDate() }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [items.slice(0, 3).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								draggable: item.type === "task",
								onDragStart: (event) => taskDrag(event, item),
								onPointerDown: (event) => startTouchDrag(event, item),
								onPointerUp: finishTouchDrag,
								onPointerCancel: () => setTouchDraggingTaskId(null),
								className: `month-calendar-item ${item.type} ${item.done ? "completed" : ""} ${touchDraggingTaskId === item.id ? "touch-dragging" : ""}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.time }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.title })]
							}, item.key)), items.length > 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
								className: "month-more",
								children: ["ещё ", items.length - 3]
							})] })]
						}, key);
					})
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card upcoming-plans",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
				title: "Ближайшие планы и задачи",
				subtitle: `${upcoming.length} впереди`,
				action: "Добавить план",
				onClick: onNew
			}), upcoming.slice(0, 10).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: item.type === "task" ? "upcoming-task" : "",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: (/* @__PURE__ */ new Date(`${item.date}T12:00`)).toLocaleDateString("ru-RU", {
						day: "numeric",
						month: "short",
						weekday: "short"
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.time }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: item.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.note })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": item.type === "task" ? "Выполнить задачу" : "Удалить план",
						onClick: () => item.type === "task" ? setTasks((current) => current.map((task) => task.id === item.id ? {
							...task,
							done: true
						} : task)) : setEvents((current) => current.filter((event) => event.id !== item.id)),
						children: item.type === "task" ? "✓" : "×"
					})
				]
			}, item.key))]
		})
	] });
}
function JournalPage({ entries, setEntries, notify }) {
	const [text, setText] = (0, import_react.useState)("");
	const [mood, setMood] = (0, import_react.useState)(4);
	const [step, setStep] = (0, import_react.useState)(1);
	const [answers, setAnswers] = (0, import_react.useState)([]);
	const [selected, setSelected] = (0, import_react.useState)(null);
	const prompts = [
		"Что сегодня получилось хорошо?",
		"Что можно было сделать иначе?",
		"За что ты благодарен сегодня?",
		"Какой главный фокус на завтра?"
	];
	function next() {
		if (!text.trim()) return;
		const nextAnswers = [...answers, text.trim()];
		if (step < 4) {
			setAnswers(nextAnswers);
			setStep((v) => v + 1);
			setText("");
		} else {
			const entry = {
				id: newEntityId(),
				date: (/* @__PURE__ */ new Date()).toISOString(),
				mood,
				answers: nextAnswers
			};
			setEntries((v) => [entry, ...v]);
			setSelected(entry);
			setAnswers([]);
			setStep(1);
			setText("");
			notify("Вечерний разбор сохранён");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageTitle, {
			eyebrow: "РЕФЛЕКСИЯ",
			title: "Вечерний разбор",
			text: "Все четыре ответа сохраняются в истории."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "journal-layout",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "card journal-form",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "step-label",
						children: [
							"0",
							step,
							" / 04"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: prompts[step - 1] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Даже маленькие наблюдения помогают видеть движение." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: text,
						onChange: (e) => setText(e.target.value),
						placeholder: "Напиши несколько честных строк..."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mood-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Энергия дня" }), [
							1,
							2,
							3,
							4,
							5
						].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setMood(x),
							className: mood === x ? "active" : "",
							children: x
						}, x))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "primary",
						onClick: next,
						children: step === 4 ? "Завершить и сохранить" : "Продолжить →"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "card journal-history",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
					title: "История записей",
					subtitle: `${entries.length} записей`
				}), entries.length ? entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: selected?.id === entry.id ? "selected" : "",
					onClick: () => setSelected(entry),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: new Date(entry.date).toLocaleDateString("ru-RU", {
						weekday: "long",
						day: "numeric",
						month: "long"
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: entry.answers[0] })]
				}, entry.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "empty-copy",
					children: "Завершите первый вечерний разбор."
				})]
			})]
		}),
		selected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card journal-entry",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "eyebrow",
					children: "СОХРАНЁННАЯ ЗАПИСЬ"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: new Date(selected.date).toLocaleString("ru-RU") }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
					"Энергия: ",
					selected.mood,
					"/5"
				] })
			] }), selected.answers.map((answer, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: prompts[i] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: answer })] }, i))]
		})
	] });
}
function SettingsPage({ byok, setByok, notify, theme, setTheme, lifeAreas, setLifeAreas }) {
	const [tab, setTab] = (0, import_react.useState)("AI-ассистент");
	function save() {
		localStorage.setItem("nexus-byok", byok);
		notify("Настройки сохранены");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageTitle, {
		eyebrow: "СИСТЕМА",
		title: "Настройки",
		text: "Персонализируйте NEXUS OS под свой ритм."
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "settings-layout",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
			className: "settings-nav",
			children: [
				["✦", "AI-ассистент"],
				["◎", "Сферы жизни"],
				["◐", "Внешний вид"],
				["◉", "Профиль"],
				["♢", "Уведомления"],
				["⇄", "Данные"]
			].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: tab === x[1] ? "active" : "",
				onClick: () => setTab(x[1]),
				children: [
					x[0],
					" ",
					x[1]
				]
			}, x[1]))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "card settings-card",
			children: tab === "AI-ассистент" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "settings-title",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ai-orb",
						children: "✦"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "NEXUS AI" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Выполняет понятные команды сразу, без подтверждений." })] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "secure-option",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Рекомендуемый режим · серверный ключ" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"Добавьте ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "OPENAI_API_KEY" }),
						" в Vercel. Ключ остаётся на сервере."
					] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "БЕЗОПАСНО" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "warning",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "!" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "BYOK менее безопасен" }), "Ключ хранится только в этом браузере."] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "setting-field",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Личный OpenAI API key" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "key-input",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "password",
							value: byok,
							onChange: (e) => setByok(e.target.value),
							placeholder: "sk-proj-••••••••"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setByok(""),
							children: "Очистить"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "primary",
					onClick: save,
					children: "Сохранить"
				})
			] }) : tab === "Внешний вид" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeSettings, {
				theme,
				setTheme,
				notify
			}) : tab === "Сферы жизни" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LifeAreasSettings, {
				areas: lifeAreas,
				setAreas: setLifeAreas,
				notify
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsPlaceholder, {
				title: tab,
				text: tab === "Данные" ? "Данные задач, привычек, финансов и журналов хранятся локально на этом устройстве." : "Раздел настроек активен и готов к персонализации.",
				onClick: save
			})
		})]
	})] });
}
function SettingsPlaceholder({ title, text, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "settings-placeholder",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "eyebrow",
				children: "НАСТРОЙКИ"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: title }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: text }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "setting-field",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Статус" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: "Активно",
					readOnly: true
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "primary",
				onClick,
				children: "Сохранить"
			})
		]
	});
}
function AuthPanel({ session, syncStatus, lastSyncedAt, onSession, onSignOut, onClose }) {
	const [mode, setMode] = (0, import_react.useState)("signin");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [message, setMessage] = (0, import_react.useState)("");
	async function submit(event) {
		event.preventDefault();
		if (busy) return;
		setBusy(true);
		setMessage("");
		try {
			const next = mode === "signin" ? await signInWithPassword(email.trim(), password) : await signUpWithPassword(email.trim(), password);
			if (next) {
				onSession(next);
				setMessage("Вход выполнен. Загружаю облачные данные…");
			} else setMessage("Проверьте почту и подтвердите регистрацию, затем войдите.");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Не удалось выполнить вход");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "modal-wrap auth-wrap",
		onMouseDown: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "quick-modal auth-panel",
			onMouseDown: (event) => event.stopPropagation(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "eyebrow",
				children: "NEXUS CLOUD"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onClose,
				children: "×"
			})] }), !isSupabaseConfigured ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "auth-cloud-icon",
					children: "☁"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Подключите Supabase" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Локальный режим продолжает работать. Для входа и синхронизации добавьте публичные параметры проекта в Vercel или ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: ".env.local" }),
					", затем выполните SQL-миграцию из папки ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "supabase/migrations" }),
					"."
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "auth-env",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "NEXT_PUBLIC_SUPABASE_URL" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "NEXT_PUBLIC_SUPABASE_ANON_KEY" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "primary modal-submit",
					onClick: onClose,
					children: "Понятно"
				})
			] }) : session ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "auth-user",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: session.user.email?.[0]?.toUpperCase() || "N" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ВЫ ВОШЛИ КАК" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: session.user.email || "Пользователь NEXUS" })] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `cloud-status ${syncStatus}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: syncStatus === "synced" ? "✓" : syncStatus === "error" ? "!" : "↻" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: syncStatus === "synced" ? "Все изменения в облаке" : syncStatus === "error" ? "Не удалось синхронизировать" : "Синхронизация…" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: lastSyncedAt ? `Последнее сохранение ${new Date(lastSyncedAt).toLocaleTimeString("ru-RU", {
						hour: "2-digit",
						minute: "2-digit"
					})}` : "Объединяем данные устройства и облака" })] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "cloud-policy",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Как работает синхронизация" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "При первом входе облачная версия загружается на устройство. После этого каждое изменение автоматически сохраняется с задержкой меньше секунды. Данные других пользователей закрыты RLS-политиками." })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "auth-signout",
					onClick: onSignOut,
					children: "Выйти из аккаунта"
				})
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "auth-cloud-icon",
					children: "☁"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: mode === "signin" ? "Войти и синхронизировать" : "Создать аккаунт NEXUS" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Задачи, PARA, привычки, финансы и настройки будут доступны на ваших устройствах." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "auth-switch",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: mode === "signin" ? "active" : "",
						onClick: () => setMode("signin"),
						children: "Вход"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: mode === "signup" ? "active" : "",
						onClick: () => setMode("signup"),
						children: "Регистрация"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: submit,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "modal-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "email",
								required: true,
								autoComplete: "email",
								value: email,
								onChange: (event) => setEmail(event.target.value),
								placeholder: "name@example.com"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "modal-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Пароль" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "password",
								required: true,
								minLength: 6,
								autoComplete: mode === "signin" ? "current-password" : "new-password",
								value: password,
								onChange: (event) => setPassword(event.target.value),
								placeholder: "Минимум 6 символов"
							})]
						}),
						message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "auth-message",
							children: message
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							className: "primary modal-submit",
							disabled: busy,
							children: busy ? "Подождите…" : mode === "signin" ? "Войти" : "Создать аккаунт"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
					className: "auth-note",
					children: "Сессия хранится на этом устройстве. В базе сохраняется только ваша строка данных, закрытая политиками доступа Supabase."
				})
			] })]
		})
	});
}
function ThemeSettings({ theme, setTheme, notify }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "eyebrow",
			children: "ВНЕШНИЙ ВИД"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Тема интерфейса" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "settings-copy",
			children: "Выбор применяется сразу и сохраняется на этом устройстве."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "theme-grid",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: theme === "lime" ? "selected" : "",
					onClick: () => {
						setTheme("lime");
						notify("Тема «Фокус» включена");
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "theme-preview lime-preview",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Фокус" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Графит и лаймовый акцент" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: theme === "orbit" ? "selected" : "",
					onClick: () => {
						setTheme("orbit");
						notify("Тема «Орбита» включена");
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "theme-preview orbit-preview",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Орбита" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Премиальный чёрный и фиолетовый" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: theme === "light" ? "selected" : "",
					onClick: () => {
						setTheme("light");
						notify("Светлая тема iOS включена");
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "theme-preview light-preview",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Светлая iOS" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Молочное стекло и системный синий" })
					]
				})
			]
		})
	] });
}
function LifeAreasSettings({ areas, setAreas, notify }) {
	const [name, setName] = (0, import_react.useState)("");
	const [icon, setIcon] = (0, import_react.useState)("✨");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "eyebrow",
			children: "КОМПАС ЖИЗНИ"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Сферы жизни" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "settings-copy",
			children: "Эти кнопки используются в задачах, проектах, целях и привычках."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "area-editor",
			children: areas.map((area) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					"aria-label": "Иконка сферы",
					value: area.icon,
					onChange: (e) => setAreas((v) => v.map((a) => a.id === area.id ? {
						...a,
						icon: e.target.value
					} : a))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					"aria-label": "Название сферы",
					value: area.name,
					onChange: (e) => setAreas((v) => v.map((a) => a.id === area.id ? {
						...a,
						name: e.target.value
					} : a))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					"aria-label": "Цвет сферы",
					type: "color",
					value: area.color,
					onChange: (e) => setAreas((v) => v.map((a) => a.id === area.id ? {
						...a,
						color: e.target.value
					} : a))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: areas.length <= 1,
					onClick: () => setAreas((v) => v.filter((a) => a.id !== area.id)),
					children: "×"
				})
			] }, area.id))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "area-add",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: icon,
					onChange: (e) => setIcon(e.target.value),
					"aria-label": "Иконка новой сферы"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: name,
					onChange: (e) => setName(e.target.value),
					placeholder: "Новая сфера"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						if (!name.trim()) return;
						setAreas((v) => [...v, {
							id: newEntityId(),
							name: name.trim(),
							icon: icon || "✨",
							color: "#9f7aea"
						}]);
						setName("");
						notify("Сфера добавлена");
					},
					children: "＋ Добавить"
				})
			]
		})
	] });
}
function FinanceCategoriesModal({ categories, setCategories, onClose }) {
	const [name, setName] = (0, import_react.useState)("");
	const [icon, setIcon] = (0, import_react.useState)("✨");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "modal-wrap",
		onMouseDown: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "quick-modal category-modal",
			onMouseDown: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "eyebrow",
					children: "ФИНАНСЫ · КАТЕГОРИИ"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					children: "×"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Категории операций" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "category-editor",
					children: categories.map((category) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							"aria-label": "Иконка категории",
							value: category.icon,
							onChange: (e) => setCategories((v) => v.map((c) => c.id === category.id ? {
								...c,
								icon: e.target.value
							} : c))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							"aria-label": "Название категории",
							value: category.name,
							onChange: (e) => setCategories((v) => v.map((c) => c.id === category.id ? {
								...c,
								name: e.target.value
							} : c))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setCategories((v) => v.filter((c) => c.id !== category.id)),
							children: "×"
						})
					] }, category.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "category-add",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: icon,
							onChange: (e) => setIcon(e.target.value),
							"aria-label": "Иконка новой категории"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: name,
							onChange: (e) => setName(e.target.value),
							placeholder: "Новая категория"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								if (!name.trim()) return;
								setCategories((v) => [...v, {
									id: newEntityId(),
									name: name.trim(),
									icon: icon || "✨"
								}]);
								setName("");
							},
							children: "＋"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "primary modal-submit",
					onClick: onClose,
					children: "Готово"
				})
			]
		})
	});
}
function BudgetModal({ categories, lines, setLines, onClose }) {
	const [values, setValues] = (0, import_react.useState)(() => Object.fromEntries(categories.map((category) => [category.name, String(lines.find((line) => line.category === category.name)?.limit || 0)])));
	const total = Object.values(values).reduce((sum, value) => sum + (Number(value) || 0), 0);
	function save() {
		setLines(categories.map((category) => ({
			id: lines.find((line) => line.category === category.name)?.id || newEntityId(),
			category: category.name,
			limit: Math.max(0, Number(values[category.name]) || 0)
		})));
		onClose();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "modal-wrap",
		onMouseDown: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "quick-modal budget-modal",
			onMouseDown: (event) => event.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "eyebrow",
					children: "ФИНАНСЫ · БЮДЖЕТ"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					children: "×"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "План расходов на месяц" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Укажите лимит для каждой категории. Факт будет считаться автоматически по операциям." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "budget-total",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ОБЩИЙ БЮДЖЕТ" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatIls(total) })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "budget-editor",
					children: categories.map((category) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: category.icon }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: category.name }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							min: "0",
							step: "10",
							value: values[category.name] || "",
							onChange: (event) => setValues((current) => ({
								...current,
								[category.name]: event.target.value
							}))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "₪" })] })
					] }, category.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "primary modal-submit",
					onClick: save,
					children: "Сохранить бюджет"
				})
			]
		})
	});
}
function RecurringExpenseModal({ accounts, categories, initial, onClose, onSave }) {
	const [title, setTitle] = (0, import_react.useState)(initial?.title || "");
	const [amount, setAmount] = (0, import_react.useState)(String(initial?.amount || ""));
	const [accountId, setAccountId] = (0, import_react.useState)(String(initial?.accountId || accounts.find((account) => account.type === "debit")?.id || accounts[0]?.id || ""));
	const [category, setCategory] = (0, import_react.useState)(initial?.category || categories[0]?.name || "Другое");
	const [day, setDay] = (0, import_react.useState)(String(initial?.dayOfMonth || 1));
	const [active, setActive] = (0, import_react.useState)(initial?.active ?? true);
	function submit(event) {
		event.preventDefault();
		if (!title.trim() || !Number(amount)) return;
		onSave({
			title: title.trim(),
			amount: Number(amount),
			accountId: Number(accountId),
			category,
			dayOfMonth: Math.max(1, Math.min(31, Number(day) || 1)),
			active
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "modal-wrap",
		onMouseDown: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "quick-modal recurring-modal",
			onSubmit: submit,
			onMouseDown: (event) => event.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "eyebrow",
					children: "ФИНАНСЫ · АВТОСПИСАНИЕ"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					children: "×"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: initial ? "Изменить постоянный расход" : "Новый постоянный расход" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "modal-field",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Название" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						required: true,
						value: title,
						onChange: (event) => setTitle(event.target.value),
						placeholder: "Например, аренда квартиры"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "modal-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "modal-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Сумма, ₪" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								required: true,
								type: "number",
								min: "0.01",
								step: "0.01",
								value: amount,
								onChange: (event) => setAmount(event.target.value)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "modal-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "День списания" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								required: true,
								type: "number",
								min: "1",
								max: "31",
								value: day,
								onChange: (event) => setDay(event.target.value)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "modal-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Счёт" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: accountId,
								onChange: (event) => setAccountId(event.target.value),
								children: accounts.map((account) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: account.id,
									children: [
										account.name,
										" · ",
										formatIls(account.balance)
									]
								}, account.id))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "modal-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Категория" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: category,
								onChange: (event) => setCategory(event.target.value),
								children: categories.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: item.name,
									children: [
										item.icon,
										" ",
										item.name
									]
								}, item.id))
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "recurring-active",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: active,
						onChange: (event) => setActive(event.target.checked)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Автосписание активно" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Операция будет создана один раз в месяц" })] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					className: "primary modal-submit",
					children: initial ? "Сохранить изменения" : "Добавить постоянный расход"
				})
			]
		})
	});
}
function AreaPicker({ areas, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "area-picker span-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Сфера жизни" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: areas.map((area) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: value === area.name ? "selected" : "",
				style: { "--area-color": area.color },
				onClick: () => onChange(area.name),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: area.icon }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: area.name })]
			}, area.id)) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "hidden",
				name: "area",
				value
			})
		]
	});
}
function FinanceOperationModal({ accounts, categories, onClose, onCreate }) {
	const [amount, setAmount] = (0, import_react.useState)("");
	const [kind, setKind] = (0, import_react.useState)("expense");
	const [accountId, setAccountId] = (0, import_react.useState)(String(accounts[0]?.id || ""));
	const [category, setCategory] = (0, import_react.useState)(categories[0]?.name || "Другое");
	const [comment, setComment] = (0, import_react.useState)("");
	const [installments, setInstallments] = (0, import_react.useState)("1");
	const selected = accounts.find((a) => a.id === Number(accountId));
	function key(value) {
		if (value === "C") setAmount("");
		else if (value === "⌫") setAmount((v) => v.slice(0, -1));
		else if (value === "." && !amount.includes(".")) setAmount((v) => (v || "0") + ".");
		else if (value !== "." && amount.replace(".", "").length < 9) setAmount((v) => (v === "0" ? "" : v) + value);
	}
	function submit(e) {
		e.preventDefault();
		if (!Number(amount)) return;
		onCreate({
			amount: Number(amount),
			kind,
			accountId,
			category: kind === "income" ? "Доход" : category,
			comment,
			installments,
			date: localDateKey(/* @__PURE__ */ new Date())
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "modal-wrap",
		onMouseDown: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "quick-modal finance-modal",
			onSubmit: submit,
			onMouseDown: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "eyebrow",
					children: "ФИНАНСЫ · НОВАЯ ОПЕРАЦИЯ"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					children: "×"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "finance-kind",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: kind === "expense" ? "active" : "",
						onClick: () => setKind("expense"),
						children: "Расход"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: kind === "income" ? "active" : "",
						onClick: () => setKind("income"),
						children: "Доход"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "amount-screen",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "СУММА" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["₪ ", amount || "0"] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "finance-entry-grid",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "number-pad",
						children: [
							"7",
							"8",
							"9",
							"⌫",
							"4",
							"5",
							"6",
							"00",
							"1",
							"2",
							"3",
							".",
							"C",
							"0"
						].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => key(value),
							children: value
						}, value))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "operation-fields",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Счёт" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: accountId,
								onChange: (e) => setAccountId(e.target.value),
								children: accounts.map((account) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: account.id,
									children: [
										account.name,
										" · ",
										formatIls(account.balance)
									]
								}, account.id))
							})] }),
							selected?.type === "credit" && kind === "expense" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Разбить покупку" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: installments,
								onChange: (e) => setInstallments(e.target.value),
								children: Array.from({ length: 12 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: index + 1,
									children: [
										index + 1,
										" ",
										index === 0 ? "платёж" : "платежей"
									]
								}, index))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Комментарий · необязательно" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: comment,
								onChange: (e) => setComment(e.target.value),
								placeholder: "Например: ужин с друзьями"
							})] })
						]
					})]
				}),
				kind === "expense" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "category-picker",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "КАТЕГОРИЯ" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: categories.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: category === item.name ? "selected" : "",
						onClick: () => setCategory(item.name),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: item.icon }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.name })]
					}, item.id)) })]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "hidden",
					value: "Доход"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "submit",
					className: "primary modal-submit",
					disabled: !Number(amount),
					children: ["Сохранить ", kind === "expense" ? "расход" : "доход"]
				})
			]
		})
	});
}
async function coverFromFile(file) {
	return await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(/* @__PURE__ */ new Error("Не удалось прочитать файл"));
		reader.onload = () => {
			const image = new Image();
			image.onload = () => {
				const scale = Math.min(1, 1200 / image.width);
				const canvas = document.createElement("canvas");
				canvas.width = Math.round(image.width * scale);
				canvas.height = Math.round(image.height * scale);
				const context = canvas.getContext("2d");
				if (!context) return reject(/* @__PURE__ */ new Error("Не удалось обработать изображение"));
				context.drawImage(image, 0, 0, canvas.width, canvas.height);
				resolve(canvas.toDataURL("image/jpeg", .78));
			};
			image.onerror = () => reject(/* @__PURE__ */ new Error("Неверный формат изображения"));
			image.src = String(reader.result);
		};
		reader.readAsDataURL(file);
	});
}
function CreateModal({ kind, accounts, projects, areas, categories, initialProjectId, initialHabit, onClose, onCreate }) {
	const initialProject = projects.find((p) => p.id === initialProjectId);
	const [area, setArea] = (0, import_react.useState)(initialHabit?.area || initialProject?.area || areas[0]?.name || "Личное");
	const [cover, setCover] = (0, import_react.useState)("linear-gradient(135deg,#2c2455,#7c4dff 58%,#d565ff)");
	const titles = {
		task: "Новая задача",
		project: "Новый проект",
		goal: "Новая цель",
		habit: initialHabit ? "Редактировать привычку" : "Новая привычка",
		transaction: "Новая операция",
		account: "Новый счёт",
		transfer: "Перевод между счетами",
		health: "Метрика здоровья",
		event: "Новый план"
	};
	if (kind === "transaction") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinanceOperationModal, {
		accounts,
		categories,
		onClose,
		onCreate
	});
	function submit(e) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		onCreate({
			...Object.fromEntries(fd.entries()),
			area,
			cover
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "modal-wrap",
		onMouseDown: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "quick-modal entity-modal",
			onSubmit: submit,
			onMouseDown: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "eyebrow",
					children: "NEXUS · СОЗДАНИЕ"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					children: "×"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: titles[kind] }),
				!["transfer"].includes(kind) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: kind === "health" ? "Показатель" : "Название",
					name: "title",
					placeholder: "Введите название",
					defaultValue: initialHabit?.name
				}),
				[
					"task",
					"project",
					"goal",
					"habit"
				].includes(kind) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AreaPicker, {
					areas,
					value: area,
					onChange: setArea
				}),
				kind === "task" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "modal-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
							label: "Проект · необязательно",
							name: "projectId",
							options: [["", "Без проекта"], ...projects.filter((p) => !p.archived).map((p) => [String(p.id), p.name])],
							defaultValue: String(initialProjectId || "")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Дата",
							name: "dueDate",
							type: "date",
							placeholder: "",
							required: false
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Время",
							name: "time",
							type: "time",
							placeholder: "Сегодня",
							required: false
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
							label: "Приоритет",
							name: "priority",
							options: [
								["medium", "Средний"],
								["high", "Высокий"],
								["low", "Низкий"]
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
							label: "Продолжительность",
							name: "duration",
							options: [
								["15", "15 минут"],
								["30", "30 минут"],
								["45", "45 минут"],
								["60", "1 час"],
								["90", "1,5 часа"],
								["120", "2 часа"]
							],
							defaultValue: "30"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
							label: "Энергия",
							name: "energy",
							options: [
								["medium", "Средняя"],
								["high", "Высокая"],
								["low", "Низкая"]
							],
							defaultValue: "medium"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
							label: "Контекст",
							name: "context",
							options: [
								["anywhere", "Где угодно"],
								["computer", "За компьютером"],
								["phone", "Телефон"],
								["home", "Дома"],
								["outside", "Вне дома"]
							],
							defaultValue: "anywhere"
						})
					]
				}),
				kind === "project" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "cover-picker",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Обложка проекта" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "cover-preview",
							style: projectCoverStyle(cover)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cover-options",
							children: [[
								"linear-gradient(135deg,#2c2455,#7c4dff 58%,#d565ff)",
								"linear-gradient(135deg,#142c31,#198a78 58%,#6ee7b7)",
								"linear-gradient(135deg,#332316,#d36a2e 55%,#ffb45e)"
							].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								style: { backgroundImage: item },
								onClick: () => setCover(item),
								"aria-label": "Выбрать градиент"
							}, item)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["＋ Фото", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "file",
								accept: "image/*",
								onChange: async (e) => {
									const file = e.target.files?.[0];
									if (file) setCover(await coverFromFile(file));
								}
							})] })]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "modal-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Срок",
							name: "due",
							type: "date",
							placeholder: "",
							required: false
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Следующий шаг",
							name: "next",
							placeholder: "Первое конкретное действие",
							required: false
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "span-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Заметка / ожидаемый результат",
								name: "notes",
								placeholder: "Что должно измениться после завершения",
								required: false
							})
						})
					]
				})] }),
				kind === "goal" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "modal-grid",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
						label: "Период",
						name: "period",
						options: [
							["ГОД", "Год"],
							["КВАРТАЛ", "Квартал"],
							["МЕСЯЦ", "Месяц"],
							["НЕДЕЛЯ", "Неделя"],
							["СЕГОДНЯ", "Сегодня"]
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Дата",
						name: "date",
						placeholder: "Q4 / Август",
						required: false
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Критерий результата",
					name: "note",
					placeholder: "Что будет считаться успехом",
					required: false
				})] }),
				kind === "habit" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Символ",
					name: "icon",
					placeholder: "✦",
					required: false,
					defaultValue: initialHabit?.icon
				}),
				kind === "transfer" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "modal-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
							label: "Откуда",
							name: "fromAccountId",
							options: accounts.filter((a) => a.type !== "credit").map((a) => [String(a.id), `${a.name} · ${formatIls(a.balance)}`])
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
							label: "Куда",
							name: "toAccountId",
							options: accounts.filter((a) => a.type !== "credit").map((a) => [String(a.id), `${a.name} · ${formatIls(a.balance)}`])
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "span-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Сумма, ₪",
								name: "amount",
								type: "number",
								placeholder: "500"
							})
						})
					]
				}),
				kind === "account" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "modal-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
							label: "Тип счёта",
							name: "accountType",
							options: [
								["cash", "Наличные"],
								["debit", "Банковский счёт"],
								["credit", "Кредитная карта"]
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Начальный баланс, ₪",
							name: "balance",
							type: "number",
							placeholder: "0"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
							label: "Счёт списания кредитки",
							name: "linkedAccountId",
							options: accounts.filter((a) => a.type === "debit").map((a) => [String(a.id), a.name])
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "День списания",
							name: "billingDay",
							type: "number",
							placeholder: "15",
							required: false
						})
					]
				}),
				kind === "health" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Значение",
					name: "value",
					placeholder: "Например, 78,4 кг"
				}),
				kind === "event" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "modal-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Дата",
							name: "date",
							type: "date",
							placeholder: "",
							defaultValue: localDateKey(/* @__PURE__ */ new Date())
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Время",
							name: "time",
							type: "time",
							placeholder: "09:00",
							defaultValue: "09:00"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
							label: "Цвет",
							name: "tone",
							options: [
								["lime", "Лайм"],
								["purple", "Фиолетовый"],
								["orange", "Оранжевый"]
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Заметка · необязательно",
					name: "note",
					placeholder: "Контекст, место или напоминание",
					required: false
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "primary modal-submit",
					type: "submit",
					children: initialHabit ? "Сохранить изменения" : "Создать и сохранить"
				})
			]
		})
	});
}
function Field({ label, name, placeholder, type = "text", required = true, defaultValue }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "modal-field",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			required,
			name,
			type,
			placeholder,
			defaultValue
		})]
	});
}
function SelectField({ label, name, options, defaultValue }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "modal-field",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
			name,
			defaultValue,
			children: options.map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
				value,
				children: label
			}, `${name}-${value}`))
		})]
	});
}
//#endregion
export { Home as default };
