import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("contains the complete life-planning navigation and working create flows", async () => {
  const page = await source("app/page.tsx");

  for (const section of ["Обзор", "Задачи", "Цели", "Проекты", "Привычки", "Финансы", "Здоровье", "Планирование", "Журнал", "Настройки"]) {
    assert.match(page, new RegExp(`"${section}"`));
  }

  assert.match(page, /function handleCreate/);
  assert.match(page, /setTasks/);
  assert.match(page, /setProjects/);
  assert.match(page, /setGoals/);
  assert.match(page, /setModalKind\("task"\)/);
  assert.match(page, /localStorage\.setItem\("nexus-state"/);
  assert.match(page, /currency:\s*"ILS"/);
  assert.doesNotMatch(page, /₽/);
});

test("implements PARA inbox, resources, area standards and linked project work", async () => {
  const page = await source("app/page.tsx");

  assert.match(page, /type InboxItem/);
  assert.match(page, /type ResourceItem/);
  assert.match(page, /type Milestone/);
  assert.match(page, /inboxToTask/);
  assert.match(page, /inboxToResource/);
  assert.match(page, /projectId:\s*selected\.id|projectId}/);
  assert.match(page, /ЕЖЕНЕДЕЛЬНЫЙ ОБЗОР/);
  assert.match(page, /Стандарт сферы/);
  assert.match(page, /Этапы результата/);
  assert.match(page, /inboxItems, resources/);
});

test("ships the iOS interaction layer and secure server-side AI route", async () => {
  const [layout, ios, route] = await Promise.all([
    source("app/layout.tsx"),
    source("app/ios.css"),
    source("app/api/assistant/route.ts"),
  ]);

  assert.match(layout, /import "\.\/ios\.css"/);
  assert.match(ios, /\.ios-tabbar/);
  assert.match(ios, /backdrop-filter:blur/);
  assert.match(ios, /env\(safe-area-inset-bottom\)/);
  assert.match(ios, /border-radius:26px 26px 0 0/);
  assert.match(route, /OPENAI_API_KEY/);
  assert.match(route, /responses\.create/);
});

test("keeps calendar entries on real dates and habits readable on mobile", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /function normalizeCalendarEvents/);
  assert.match(page, /planningFocuses/);
  assert.match(page, /task-calendar-event/);
  assert.match(page, /onClick=\{\(\)=>navigate\("Обзор"\)\}/);
  assert.match(ios, /\.breadcrumbs button/);
  assert.match(ios, /\.habit-week-row\{min-width:0!important/);
  assert.match(ios, /grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
});

test("adds financial obligations calendar and calendar planning modes", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /function FinanceCalendar/);
  assert.match(page, /Списания и кредитные платежи/);
  assert.match(page, /kind==="installment"/);
  assert.match(page, /type CalendarView="day"\|"week"\|"month"/);
  assert.match(page, /\["day","День"\]/);
  assert.match(page, /text\/nexus-task/);
  assert.match(page, /onDrop=/);
  assert.match(page, /startTouchDrag/);
  assert.match(page, /data-calendar-date/);
  assert.match(ios, /\.finance-calendar-grid/);
  assert.match(ios, /\.month-calendar-grid/);
  assert.match(ios, /\.calendar-view-switch/);
  assert.match(ios, /touch-action:none/);
});

test("supports voice inbox and goal progress driven by linked projects", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /SpeechRecognition/);
  assert.match(page, /recognition\.lang="ru-RU"/);
  assert.match(page, /className=\{`voice-capture/);
  assert.match(page, /projectIds\?: number\[\]/);
  assert.match(page, /function goalProgressValue/);
  assert.match(page, /toggleProject/);
  assert.match(page, /\["МЕСЯЦ","НЕДЕЛЯ","СЕГОДНЯ"\]/);
  assert.match(ios, /\.voice-capture\.listening/);
  assert.match(ios, /\.goal-focus-board/);
  assert.match(ios, /\.goal-link-panel/);
});

test("supports a reorderable dashboard, light iOS theme and live gamification", async () => {
  const [page, globals, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/globals.css"),
    source("app/ios.css"),
  ]);

  assert.match(page, /type DashboardBlockId/);
  assert.match(page, /defaultDashboardOrder/);
  assert.match(page, /data-dashboard-widget/);
  assert.match(page, /text\/nexus-dashboard/);
  assert.match(page, /dashboardOrder, gamification/);
  assert.match(page, /type Theme = "lime" \| "orbit" \| "light"/);
  assert.match(page, /Светлая iOS/);
  assert.match(page, /function addGameEvents/);
  assert.match(page, /missed-deadline/);
  assert.match(page, /inactive-day/);
  assert.match(page, /Ритм снизился относительно прошлого периода/);
  assert.match(globals, /\.light-preview/);
  assert.match(ios, /\.dashboard-board/);
  assert.match(ios, /\.game-card/);
  assert.match(ios, /\.theme-light/);
});
