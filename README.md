# Lifebot (Tej's version)

## Setup
1. Create a Supabase project → run `supabase/schema.sql` in the SQL editor.
2. Copy `.env.local.example` → `.env.local`, fill in Supabase URL/keys + your Anthropic API key.
3. `npm install && npm run dev`

## How it works
- **Timer**: pick a category → start → stop as Finished/Abandoned + optional note. Writes to `sessions`.
- **Coach** (`/api/coach`): pulls `category_stats` view (continuation rate, avg duration) + last 20 sessions + today's check-in, feeds it to Claude with a system prompt that forces data-backed advice, never generic tips.
- **Categories**: Coding Skills, DSA, UI/UX Side Hustle, Burnout App, Job Applications, Other — matches your Notion tracker.

## Not built yet (v2)
- Morning check-in UI (table + API exist, no form yet)
- Gamification layer (streaks/XP/progress — schema supports it, UI doesn't yet)
- Notion sync
- Mobile PWA wrapper

## Why advice will be generic at first
The coach needs ~2-3 weeks of logged sessions per category before continuation-rate numbers mean anything. Until then it'll fall back to reasonable defaults (front-load hardest task, end on your best-completion category).
