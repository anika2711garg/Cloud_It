# AI Study Hub

A full-stack (serverless) study management app built with React + Vite + Tailwind CSS and Supabase for Auth, PostgreSQL, and Storage.

## Features

- Supabase Auth: sign up, login, logout, session persistence
- Protected routes for all app pages
- Dashboard with total uploads, quiz attempts, subjects count
- Subject management
- Nested folder system (Google Drive-like)
- File upload to Supabase Storage bucket `study-files`
- Quiz creation (MCQ), question management, and quiz attempts
- Progress tracking with score history and recent activity

## Stack

- React 19 + Vite
- Tailwind CSS
- Supabase (`@supabase/supabase-js`)

## Project Structure

```
src/
	components/
		folders/
		layout/
		shared/
	context/
	lib/
	pages/
	services/
	App.jsx
	main.jsx
supabase/
	schema.sql
```

## 1. Environment Variables

Create `.env.local` from `.env.example`:

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

`VITE_SUPABASE_PUBLISHABLE_KEY` is also supported for compatibility.

## 2. Supabase Setup

1. Open your Supabase project.
2. Go to SQL Editor and run `supabase/schema.sql`.
3. Confirm a storage bucket named `study-files` exists.
4. In Authentication, enable Email/Password provider.

If you already ran an older version of the schema before dual mode support was added, run `supabase/dual_mode_migration.sql` once to add role and published-quiz policies.

## 3. Install and Run

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## 4. Vercel Deployment

1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Add environment variables in Vercel project settings:
	 - `VITE_SUPABASE_URL`
	 - `VITE_SUPABASE_ANON_KEY`
4. Deploy.

Vercel uses the default build command `npm run build` and output directory `dist` for Vite.
