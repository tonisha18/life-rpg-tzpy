# Rekindle

Rekindle is a countryside cottage life RPG that turns daily routines and self-care habits into a mindful journey through an interactive autumn cottage.

## Problem

Habit trackers feel like chores, so people stop using them. This app turns daily self-care and productivity into a cozy quest loop, with an interactive world and a companion that reacts to your progress, so the routine feels worth returning to.

## Stack

- Next.js 15 + React 19
- Tailwind CSS
- Supabase Auth, Postgres, and Row Level Security
- Web Audio API for procedural ambient sound
- 360° panorama embed (PanoramaGenerator)

## Project Structure

- **`/frontend`** — Next.js 15 Web Application
  - UI components, Studio Ghibli countryside themes, Web Audio API, and 360° cottage views.
  - Has its own `package.json`, `.env.example`, `server.js`, and `next.config.ts`.
- **`/backend`** — Supabase Database & Backend Services
  - Database schema (`schema.sql`), SQL migrations (`migrations/`), and API RPC specifications (`API_REFERENCE.md`).
  - Has its own `package.json`, `.env.example`, and standalone Node `server.js`.

## Local Setup

1. Install dependencies.

```bash
npm run install:all
```

Or directly inside `frontend`:

```bash
cd frontend
npm install
```

2. Create a Supabase project.

- Go to https://supabase.com
- Create a new project
- Save the project URL and anon key

3. Create the database schema.

- Open `backend/migrations/20260912_rpg_backend_v2_1.sql`
- Paste it into the Supabase SQL editor and run it
- This creates all `rpg_*` tables, Row Level Security policies, and RPC functions:
  - `rpg_complete_task(task_id, idempotency_key)`
  - `rpg_select_daily_tasks(task_ids)`
  - `rpg_purchase_reward(item_id)`
  - `rpg_get_player_state()`
- To roll back, run `backend/migrations/20260912_rpg_backend_v2_1_down.sql`

4. Configure environment variables.

Copy `.env.example` to `frontend/.env.local` and fill in your values.

```bash
cp .env.example frontend/.env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

If you skip this step, the app runs in offline/guest demo mode automatically.

5. Start the app.

```bash
npm run dev
```

Open http://localhost:3000 to begin your journey.

## Deployment to Git

1. Initialize git (if not already initialized).

```bash
git init
```

2. Stage and commit all project files.

```bash
git add .
git commit -m "feat: Rekindle - Ghibli cottage 360 panorama life RPG"
```

3. Rename the main branch and push.

```bash
git branch -M main
git remote add origin https://github.com/your-username/rekindle.git
git push -u origin main
```

Prefer incremental commits? Stage `backend/`, then `frontend/`, then the remaining docs and config, each as its own commit.

## Database Model

- `rpg_*` tables store player state, task completions, and rewards, all under Row Level Security.
- `backend/API_REFERENCE.md` documents the RPC function signatures and contracts.
- Migrations are additive and reversible via the matching `_down.sql` file.

## Repo Scripts

- `npm run dev` - start the frontend development server
- `npm run install:all` - install dependencies for the project
- `npm run build` - create production build
- `npm start` / `npm run serve` - launch public production Node server using `server.js`

## Public Server Deployment (`server.js`)

The included `server.js` allows deploying the application to any Node.js hosting platform (such as Render, Railway, Heroku, cPanel Node App Manager, AWS, DigitalOcean, PM2, or custom VPS) rather than running locally on `localhost`.

### 1. Build the production app
```bash
npm run build
```

### 2. Start the public server
```bash
npm start
# OR
node server.js
```

### Environment Variables for Production
- `PORT` (default `3000`) - Port to bind server to
- `HOST` (default `0.0.0.0`) - Network host interface (allows public external traffic)
- `NODE_ENV` (`production`) - Enable production performance optimizations
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

## Notes

- The app is fully usable without Supabase credentials via Guest Adventurer demo mode.
- Keep the 360° panorama embed URL and illustration assets under `frontend/public/themes/`.
- Supabase RLS policies gate all `rpg_*` tables per authenticated user.

## License

MIT © Rekindle Contributors. Illustrations inspired by Studio Ghibli aesthetics. 360° panorama powered by PanoramaGenerator.
