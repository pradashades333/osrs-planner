# OSRS Training Planner

🔗 **Live app:** [osrs-training-planner.vercel.app](https://osrs-training-planner.vercel.app/)

A small web app for looking up an Old School RuneScape player and finding training methods for each skill.

Enter an RSN, click a skill, choose a target level, and the app shows the XP left plus a few relevant training options. Player stats come from the OSRS hiscores and are saved in Postgres.

## What it can plan

### Quest planner

The planner keeps quest requirements and prerequisite links in the database. Add a quest goal and it returns a dependency-safe order, so prerequisites always appear before the quest you want to complete.

The current seed catalogue includes a focused set of early and progression quests, including the Monkey Madness I → Monkey Madness II path. It is designed to be extended by adding records to `server/data/quests.json`.

### Combined goals

After looking up a player, use the **Combined goals** panel to enter something like:

```text
70 ranged AND 80 mining AND Monkey Madness II
```

The API parses skill targets and quest names, merges overlapping requirements, calculates the XP remaining for each skill, estimates total training time from the fastest seeded methods, and places prerequisite quests in order.

| Before | Now |
| --- | --- |
| Check one skill at a time | Plan several skills and quests together |
| Manually look up quest prerequisites | Get a dependency-safe quest path |
| Guess the total grind | See combined XP and time estimates |

## Stack

- React + Vite
- Express
- Prisma + PostgreSQL
- `osrs-json-hiscores`

## Running it locally

You need Node.js and a PostgreSQL database. Put your database connection string in `server/.env`:

```env
DATABASE_URL="your-postgres-connection-string"
```

Then install dependencies, run migrations, and seed the guide data:

```powershell
cd server
npm install
npm run migrate
npm run seed
```

In another terminal, start the API:

```powershell
cd server
npm run dev
```

And start the frontend:

```powershell
cd client
npm install
npm run dev
```

Open the URL Vite prints in the terminal, usually `http://localhost:5173`.

## Notes

Training methods are stored in `server/data/methods.json`. They include a few common options per skill, with XP and GP rates intended as useful estimates rather than exact guarantees.

Quest data is stored in `server/data/quests.json`. After changing either data file, run `npm run seed` from `server` to update the database.

## Deploying on Vercel

Deploy `server` and `client` as separate Vercel projects from the same repository.

- In the server project, add `DATABASE_URL` from `server/.env` as an environment variable.
- Deploy the server first and copy its `.vercel.app` URL.
- In the client project, add `VITE_API_BASE` with that server URL, for example `https://osrs-planner-api.vercel.app`.

The client falls back to `http://localhost:3000` locally, so no change is needed for normal development.

## API examples

Build a combined plan after the player has been looked up once:

```http
POST /api/plan/Example_RSN
Content-Type: application/json

{ "text": "70 ranged AND 80 mining AND Monkey Madness II" }
```

The response includes the combined XP/time estimate, per-skill training steps, requested quest blockers, and `questOrder`.
