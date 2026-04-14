# EduVault

A modern study workspace built with React + Vite + Tailwind CSS and powered by Supabase.

## What This App Includes

- Authentication flow (sign up, login, logout, protected routes)
- Teacher and student mode
- Dashboard analytics and activity feed
- Subject management
- File manager with folders and uploads
- Quiz creation, publishing, attempts, and score tracking
- Animated UI, dark/light mode, and skeleton loading states

## Core Technologies Used

- React 19
- Vite 8
- React Router DOM 7
- Tailwind CSS 3
- Framer Motion
- Lucide React icons
- Supabase JavaScript SDK (`@supabase/supabase-js`)

## Supabase Services Used (Important)

### 1) Supabase Authentication

Authentication is used as the identity layer for the whole app:

- Email/password sign up and login
- Session persistence
- Route protection (public vs protected pages)
- User context for ownership-based data access

### 2) Supabase Storage (Storage as a Service)

Supabase Storage is used to store study files and deliver public file links:

- Bucket used: `study-files`
- Upload flow: client uploads file to storage bucket
- App stores metadata in `files` table (`name`, `file_url`, `folder_id`, `subject_id`, `user_id`)
- File manager page reads links and lets users open/download files

This project heavily relies on Supabase Storage as a managed file service and Supabase Authentication for secure user identity.

## Database and Policies

- PostgreSQL tables + RLS policies are defined in [supabase/schema.sql](supabase/schema.sql)
- Dual-mode additions are in [supabase/dual_mode_migration.sql](supabase/dual_mode_migration.sql)

## Project Structure

```text
src/
	components/
		files/
		folders/
		layout/
		quizzes/
		shared/
		subjects/
	context/
	lib/
	pages/
	services/
	App.jsx
	main.jsx
supabase/
	schema.sql
	dual_mode_migration.sql
```

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

Optional compatibility key:

```bash
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

## Supabase Setup

1. Create/open your Supabase project.
2. In SQL Editor, run [supabase/schema.sql](supabase/schema.sql).
3. If required for older setups, run [supabase/dual_mode_migration.sql](supabase/dual_mode_migration.sql).
4. Enable Email/Password in Authentication providers.
5. Create/confirm storage bucket `study-files`.

## Local Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Deployment (Vercel)

Live deployed link: [https://cloud1406.vercel.app]()

1. Push the repo to GitHub.
2. Import project into Vercel.
3. Set environment variables:
	 - `VITE_SUPABASE_URL`
	 - `VITE_SUPABASE_ANON_KEY`
4. Deploy.

Vercel defaults for this app:

- Build command: `npm run build`
- Output directory: `dist`
