# LifeOS Architecture

## Goal

LifeOS is a separate personal system, not connected to KitchenOS.

## First version

The first public repository version contains a mobile-first static landing/dashboard that can be deployed immediately.

## Target architecture

- Frontend: Next.js
- UI: Tailwind CSS
- Database: Supabase Postgres
- Auth: Supabase Auth
- Hosting: Vercel
- App mode: PWA for iPhone home screen

## Core modules

### Finance

Tracks income, expenses, categories, monthly totals and budget pressure.

### Tasks

Simple daily task list with completion state.

### Daily planning

Morning focus, three main tasks and evening reflection.

### Dashboard

Single mobile screen with the most important metrics.

## Data model draft

### transactions

- id
- user_id
- type
- category
- amount
- note
- created_at

### tasks

- id
- user_id
- title
- is_done
- created_at

### daily_plans

- id
- user_id
- date
- focus
- top_tasks
- reflection

## Development policy

Keep LifeOS separate from all work projects. Personal data must never be mixed with KitchenOS data.
