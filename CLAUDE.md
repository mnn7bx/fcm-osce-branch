# CLAUDE.md — FCM Companion

## Project Overview
FCM Companion is a mobile-first web app for UVA medical students to practice differential diagnosis during their Foundations of Clinical Medicine (FCM) course. Three components: Student App, Faculty Dashboard, Admin Panel.

## Stack
- **Framework:** Next.js 16, TypeScript, Tailwind v4
- **UI:** shadcn/ui components, Lucide icons
- **Database:** Supabase (shared instance with HDS Workflow Tool, `fcm_` prefixed tables)
- **AI:** Anthropic SDK (claude-sonnet-4-5 for feedback + OSCE evaluation)
- **Deploy:** Vercel

## Architecture
- `src/app/page.tsx` — Roster picker login
- `src/app/(student)/` — Student route group (mobile shell + bottom nav)
- `src/app/(faculty)/` — Faculty route group (desktop sidebar)
- `src/app/api/` — API routes (feedback, submissions, notes, dashboard, osce)
- `src/lib/feedback.ts` — Deterministic comparison + AI narrative generation
- `src/types/` — All TypeScript types

## Key Patterns
- User context via localStorage (`fcm-user` key), no auth
- Autosave via `useAutosave` hook (500ms debounce to Supabase)
- VINDICATE framework: V-I-N-D-I-C-A-T-E (9 categories, "I2" key for Iatrogenic)
- Feedback is deterministic comparison first, then AI narrative on top

## Database Tables
`fcm_users`, `fcm_cases`, `fcm_schedule`, `fcm_submissions`, `fcm_notes`, `fcm_settings`, `fcm_osce_responses`

## Commands
```bash
npm run dev    # Start dev server
npm run build  # Production build
```

## Commit Style
`type: description` (feat:, fix:, chore:, docs:)
