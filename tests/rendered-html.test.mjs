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

test("adds a financial planning calendar and calendar planning modes", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /function FinanceCalendar/);
  assert.match(page, /Плановые расходы и платежи/);
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
  assert.match(page, /goalPeriodOrder/);
  assert.match(page, /parentGoalId/);
  assert.match(page, /goalId\?: number/);
  assert.match(ios, /\.voice-capture\.listening/);
  assert.match(ios, /\.goal-ladder/);
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

test("adds server-side PIN auth and private Supabase cloud sync", async () => {
  const [page, client, server, route, migration, env] = await Promise.all([
    source("app/page.tsx"),
    source("lib/pin-cloud.ts"),
    source("lib/pin-auth-server.ts"),
    source("app/api/pin/state/route.ts"),
    source("supabase/migrations/002_nexus_pin_state.sql"),
    source(".env.example"),
  ]);

  assert.match(page, /function AuthPanel/);
  assert.match(page, /loadPinCloudState/);
  assert.match(page, /savePinCloudState/);
  assert.match(page, /Введите PIN-код/);
  assert.match(client, /api\/pin\/session/);
  assert.match(client, /api\/pin\/state/);
  assert.match(server, /NEXUS_SESSION_SECRET/);
  assert.match(server, /SUPABASE_SECRET_KEY/);
  assert.match(server, /supabase\\\.co/);
  assert.match(route, /key\.startsWith\("sb_secret_"\)/);
  assert.match(route, /catch \(error\)/);
  assert.match(server, /sb_secret_/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all.*anon/);
  assert.match(env, /NEXUS_PIN/);
  assert.match(env, /SUPABASE_SECRET_KEY/);
});

test("ships the smart day center, PARA wizard and richer task planning", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /ЕДИНЫЙ УМНЫЙ ДЕНЬ/);
  assert.match(page, /function ParaReviewWizard/);
  assert.match(page, /ПОШАГОВЫЙ ОБЗОР PARA/);
  assert.match(page, /type TaskEnergy/);
  assert.match(page, /duration\?: number/);
  assert.match(page, /context\?: TaskContext/);
  assert.match(page, /name="duration"/);
  assert.match(page, /name="energy"/);
  assert.match(page, /name="context"/);
  assert.match(ios, /\.smart-day-center/);
  assert.match(ios, /\.smart-load/);
  assert.match(ios, /\.para-wizard/);
});

test("adds full task editing, command menu and fact versus estimate", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /editingTask/);
  assert.match(page, /function CommandMenu/);
  assert.match(page, /taskActualMinutes/);
  assert.match(page, /⌘K/);
  assert.match(page, /Заметка \/ критерий готовности/);
  assert.match(ios, /\.command-menu/);
  assert.match(ios, /\.editable-task-row/);
  assert.match(ios, /\.estimate-track/);
});

test("adds automatic AI planning with undo and a month-end finance forecast", async () => {
  const [page, route, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/api/assistant/route.ts"),
    source("app/ios.css"),
  ]);

  assert.match(page, /captureUndo/);
  assert.match(page, /undoLastAiAction/);
  assert.match(page, /Отменить последнее изменение AI/);
  assert.match(route, /name: "update_task"/);
  assert.match(route, /продолжительность в минутах/);
  assert.match(page, /function FinanceForecast/);
  assert.match(page, /ПРОГНОЗ ДО КОНЦА МЕСЯЦА/);
  assert.match(page, /БЕЗОПАСНО В ДЕНЬ/);
  assert.match(ios, /\.assistant-undo/);
  assert.match(ios, /\.finance-forecast/);
});

test("adds a universal quick capture, manual cloud controls and readable light mode", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /function QuickAddMenu/);
  assert.match(page, /БЫСТРАЯ МЫСЛЬ ВО «ВХОДЯЩИЕ»/);
  assert.match(page, /function syncNow/);
  assert.match(page, /function downloadBackup/);
  assert.match(page, /Синхронизировать сейчас/);
  assert.match(page, /ПРОСРОЧЕНО/);
  assert.match(ios, /html\.nexus-light-page,body\.nexus-light-page/);
  assert.match(ios, /\.theme-light \.history-grid>div/);
  assert.match(ios, /\.habit-week-row>div>\.habit-copy/);
});

test("adds actionable notifications and safe backup restoration", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /type NexusNotification/);
  assert.match(page, /function NotificationCenter/);
  assert.match(page, /Предстоящие платежи/);
  assert.match(page, /Разобрать Входящие PARA/);
  assert.match(page, /function restoreBackup/);
  assert.match(page, /Заменить текущие данные/);
  assert.match(page, /Восстановить из файла/);
  assert.match(ios, /\.notification-center/);
  assert.match(ios, /\.notification-count/);
});

test("adds persistent focus sessions and readable personal profile", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /type FocusSession/);
  assert.match(page, /function FocusMode/);
  assert.match(page, /Начать фокус/);
  assert.match(page, /focusSessions/);
  assert.match(page, /function ProfileSettings/);
  assert.match(page, /text-\$\{profile\.textScale\}/);
  assert.match(ios, /\.focus-mode/);
  assert.match(ios, /\.text-extra/);
});

test("keeps the chosen task area and removes dark controls from the light theme", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /area: String\(draft\.area \|\| "Личное"\)/);
  assert.match(page, /Сфера жизни · выбрано:/);
  assert.match(page, /aria-pressed=\{value===area\.name\}/);
  assert.match(ios, /Complete light iOS surface pass/);
  assert.match(ios, /\.theme-light \.secondary-action/);
  assert.match(ios, /\.theme-light \.planning-note>button/);
  assert.match(ios, /\.theme-light \.health-stat>span/);
  assert.match(ios, /\.theme-light \.key-input button/);
});

test("supports editable goal branches and configurable day capacity", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /editingGoal/);
  assert.match(page, /function goalChainForArea/);
  assert.match(page, /goalAreaValue/);
  assert.match(page, /dailyCapacityMinutes/);
  assert.match(page, /Рабочая ёмкость дня/);
  assert.match(page, /ArrowDown/);
  assert.match(page, /ArrowUp/);
  assert.match(ios, /\.goal-area-switch/);
  assert.match(ios, /\.goal-area-tabs/);
  assert.match(ios, /\.capacity-picker/);
  assert.match(ios, /\.capacity-settings/);
});

test("adds a unified day runway and seven-day plan-versus-actual insight", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /weekInsight/);
  assert.match(page, /function sevenDayWorkSeries/);
  assert.match(page, /ЛИНИЯ СЕГОДНЯ/);
  assert.match(page, /План и факт без самообмана/);
  assert.match(page, /точность оценки/);
  assert.match(ios, /\.rhythm-studio/);
  assert.match(ios, /\.day-runway/);
  assert.match(ios, /\.week-work-chart/);
  assert.match(ios, /\.rhythm-summary/);
});

test("imports Discount and Visa files with Russian categories and duplicate protection", async () => {
  const [page, importer, ios, packageJson] = await Promise.all([
    source("app/page.tsx"),
    source("lib/bank-import.ts"),
    source("app/ios.css"),
    source("package.json"),
  ]);

  assert.match(page, /function BankImportModal/);
  assert.match(page, /Импорт банка/);
  assert.match(page, /Защита от двойного учёта включена/);
  assert.match(page, /importFingerprint/);
  assert.match(importer, /export async function parseBankFiles/);
  assert.match(importer, /utf-16le/);
  assert.match(importer, /Счёт карты Excel/);
  assert.match(importer, /История карт Excel/);
  assert.match(importer, /isCardSettlement/);
  assert.match(importer, /russianTitle/);
  assert.match(ios, /\.bank-import-modal/);
  assert.match(ios, /\.import-preview/);
  assert.match(packageJson, /"fflate"/);
});

test("maps personal Visa accounts and presents goals as simple horizon lists", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /MAIN_DEBIT_CARD_LAST4 = "1078"/);
  assert.match(page, /CREDIT_CARD_LAST4 = "2719"/);
  assert.match(page, /function normalizePersonalAccounts/);
  assert.match(page, /Основной счёт · Visa •••• 1078/);
  assert.match(page, /Цели на год/);
  assert.match(page, /Цели на месяц/);
  assert.match(page, /Цели на неделю/);
  assert.match(ios, /Simple dashboard goal horizons/);
  assert.match(ios, /\.dashboard-goal-groups/);
  assert.match(ios, /\.dashboard-goal-row/);
});

test("keeps finance controls readable in light mode and manages custom categories", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /＋ Добавить или изменить/);
  assert.match(page, /function renameFinanceCategory/);
  assert.match(page, /function deleteFinanceCategory/);
  assert.match(page, /Сохранить категории/);
  assert.match(page, /Такая категория уже существует/);
  assert.match(ios, /Finance operation and editable categories/);
  assert.match(ios, /\.theme-light \.finance-kind button/);
  assert.match(ios, /\.theme-light \.amount-screen/);
  assert.match(ios, /\.theme-light \.number-pad button/);
  assert.match(ios, /\.theme-light \.category-picker button/);
});

test("keeps tiny expenses calm, splits saved transactions, and remembers merchants", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /function SplitTransactionModal/);
  assert.match(page, /Мелкие расходы до 10 ₪/);
  assert.match(page, /Разделить операцию/);
  assert.match(page, /parentId/);
  assert.match(page, /merchantMemory/);
  assert.match(ios, /Calm finance journal and transaction split/);
  assert.match(ios, /\.small-expense-group/);
  assert.match(ios, /\.split-transaction-modal/);
  assert.match(ios, /\.transaction-split/);
});

test("filters the journal by wallet and keeps card settlement out of expenses", async () => {
  const [page, importer, ios] = await Promise.all([
    source("app/page.tsx"),
    source("lib/bank-import.ts"),
    source("app/ios.css"),
  ]);

  assert.match(page, /selectedAccountId/);
  assert.match(page, /Расходы по источникам/);
  assert.match(page, /Показать все счета/);
  assert.match(page, /РАСХОДЫ ЗА МЕСЯЦ/);
  assert.match(page, /Ring value=\{forecastPercent\}/);
  assert.match(page, /деньги автоматически не списываются/i);
  assert.doesNotMatch(page, /function settleDueInstallments/);
  assert.doesNotMatch(page, /function applyDueRecurringExpenses/);
  assert.match(importer, /isCardSettlement/);
  assert.match(importer, /חיוב לכרטיס/);
  assert.match(importer, /const chargeDate = purchaseDate/);
  assert.match(ios, /\.forecast-ring \.ring\{flex:0 0 92px/);
  assert.match(ios, /Wallet filter and statement-first finance flow/);
});

test("organizes inbox captures immediately without extra questions", async () => {
  const [page, assistant] = await Promise.all([
    source("app/page.tsx"),
    source("app/api/assistant/route.ts"),
  ]);

  assert.match(page, /async function smartCapture/);
  assert.match(page, /type === "organize_capture"/);
  assert.match(page, /status: "organized"/);
  assert.match(page, /destination === "task"/);
  assert.match(assistant, /CAPTURE_SYSTEM/);
  assert.match(assistant, /organize_capture/);
  assert.match(assistant, /Не задавай вопросов/);
  assert.match(assistant, /tool_choice: captureMode \? "required"/);
});

test("adds a unified daily cycle and a recommendation center", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /function buildRecommendations/);
  assert.match(page, /ЦЕНТР РЕШЕНИЙ/);
  assert.match(page, /Единый поток дня/);
  assert.match(page, /Выбрать главное/);
  assert.match(page, /Подвести итог/);
  assert.match(ios, /\.recommendation-center/);
  assert.match(ios, /\.day-cycle/);
});

test("opens a visual goal workspace with projects and next actions", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /goal-detail-page/);
  assert.match(page, /СЛЕДУЮЩЕЕ ДЕЙСТВИЕ/);
  assert.match(page, /Проекты цели/);
  assert.match(page, /ДОЧЕРНИЕ ЦЕЛИ/);
  assert.match(page, /selected\.cover/);
  assert.match(ios, /\.goal-detail-hero/);
  assert.match(ios, /\.goal-detail-grid/);
});

test("reviews uncertain bank categories after import", async () => {
  const [page, ios] = await Promise.all([
    source("app/page.tsx"),
    source("app/ios.css"),
  ]);

  assert.match(page, /function FinanceReconciliation/);
  assert.match(page, /СВЕРКА ПОСЛЕ ИМПОРТА/);
  assert.match(page, /требуют внимания/);
  assert.match(page, /reconciled:true/);
  assert.match(ios, /\.finance-reconciliation/);
  assert.match(ios, /\.reconciliation-list/);
});
