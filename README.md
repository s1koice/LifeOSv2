# NEXUS OS

Тёмная персональная система планирования жизни: dashboard, задачи, цепочка целей, проекты, привычки, финансы, здоровье, недельное планирование, журнал и AI-ассистент.

## Что уже работает

- адаптивный интерфейс для телефона, планшета и компьютера;
- демо-данные и работа без регистрации или базы данных;
- локальное сохранение задач и привычек в `localStorage`;
- безопасный серверный маршрут AI на официальном OpenAI SDK и Responses API;
- необязательный BYOK-режим с явным предупреждением;
- архитектура, которую можно позже подключить к Supabase.

## Локальный запуск

Требуется Node.js 22.13 или новее.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Откройте `http://localhost:3000`. Сайт полностью работает и без ключа; ключ нужен только для живых ответов AI.

## OpenAI

Рекомендуемый вариант — серверная переменная `OPENAI_API_KEY`. Она используется только в `app/api/assistant/route.ts` и не передаётся клиенту. При необходимости модель задаётся через `OPENAI_MODEL`.

BYOK в настройках предназначен для локального тестирования. Ключ хранится в `localStorage` текущего браузера, поэтому этот режим нельзя считать таким же безопасным, как серверный.

## GitHub

```bash
git init
git add .
git commit -m "Launch NEXUS OS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nexus-os.git
git push -u origin main
```

Файл `.env.local` не коммитьте — он уже исключён через `.gitignore`.

## Vercel

1. Импортируйте GitHub-репозиторий в Vercel.
2. Framework Preset: **Next.js**.
3. В Project Settings → Environment Variables добавьте `OPENAI_API_KEY` и, при желании, `OPENAI_MODEL`.
4. Нажмите Deploy.

Если AI не нужен, переменные можно не добавлять: остальная система продолжит работать.

## Структура

```text
app/
  api/assistant/route.ts  # серверный AI-маршрут
  globals.css             # дизайн-система и адаптивность
  layout.tsx              # метаданные и общий layout
  page.tsx                # интерфейс и локальная модель данных
.env.example              # пример безопасных переменных
public/                   # статические файлы
```

## Следующий шаг: Supabase

Для синхронизации между устройствами замените операции `localStorage` на репозитории данных (`tasks`, `habits`, `goals`, `projects`, `finance_entries`, `health_logs`) и подключите Supabase Auth. Интерфейс и типы предметной области можно сохранить без изменений.
