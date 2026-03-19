# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on port 3000
npm run build      # Production build (Vite)
```

No test or lint scripts are configured. ESLint is available via `eslint.config.mjs` but has no npm script.

### iOS / Mobile

```bash
npm run ios:sync   # Build and sync with Capacitor iOS
npm run ios:open   # Open Xcode
npm run ios:run    # Run on simulator/device
```

## Architecture

**Visum Portal** is a B2B distributor portal for IRIS Technology's Visum® product line. It is a React SPA with two separate portals:

- **Distributor Portal** — cyan theme, accessed at `/login`; for distributor company users
- **Admin Portal** — red theme, accessed at `/admin/login`; for IRIS internal staff

The app runs as a web app and as an iOS/Android app via **Capacitor 7**. Mobile layout variants exist under `src/components/mobile/` and are rendered when running natively (detected via `Capacitor.isNativePlatform()`) or when window width is small.

### Key Technology

- **React 18 + TypeScript + Vite + TailwindCSS 4**
- **Supabase** — PostgreSQL database, auth (email/password + Azure/Google OAuth), storage buckets, Row Level Security
- **Radix UI** — headless UI primitives wrapped in `src/components/ui/`
- **React Router v6** — all routing in `src/App.tsx`
- **i18next** — 5 languages (EN, DE, FR, ES, IT), translations in `src/locales/`
- **React Hook Form** — all forms
- **Supabase Edge Functions** — Deno-based serverless functions in `supabase/functions/`

### Routing & Auth (`src/App.tsx`)

All route definitions and auth state live here. The app checks `supabase.auth.getSession()` on load. Routes branch based on:
1. Whether the user is authenticated
2. Whether they are an admin role (`super-admin`, `admin`, `content-manager`, `viewer`) or a distributor user
3. Whether they are on a native mobile platform

### Data Layer (`src/lib/`)

- `supabase.ts` — public Supabase client (anon key, respects RLS)
- `supabase-admin.ts` — service-role client that bypasses RLS; used only for admin operations
- `api/` — one file per domain entity (distributors, products, customers, devices, announcements, etc.); each exports typed async functions that wrap Supabase queries

### Backend

All backend logic is Supabase:
- **Database**: PostgreSQL with RLS. Migrations are in `supabase/migrations/`; standalone schema files in `database/`
- **Storage buckets**: `product-images`, `product-documents`, `marketing-materials`, `training-videos`, `distributor-documents`
- **Edge Functions** (Deno):
  - `create-admin-user` — creates admin users in auth + `admin_users` + `user_profiles`
  - `send-release-notification` — sends emails on new software releases
  - `delete-distributor` — deletes a distributor and associated data (called via POST)

### Types

All database entity types are defined in `src/types/database.ts`. Always use these types rather than inlining inline object shapes.

### Activity Tracking

`src/lib/activityTracker.ts` logs user actions to the `activity_logs` table. Admin portal's Activity Reports page queries this data. Refer to `ACTIVITY_TRACKING_DEBUG_GUIDE.md` for implementation details.

### Internationalization

All user-visible strings must use the `useTranslation` hook from `react-i18next`. Translation keys live in `src/locales/{lang}/common.json`. Use `translationUtils.ts` helpers for dynamic content.
