# OSRS Training Planner

A small web app for looking up an Old School RuneScape player and finding training methods for each skill.

Enter an RSN, click a skill, choose a target level, and the app shows the XP left plus a few relevant training options. Player stats come from the OSRS hiscores and are saved in Postgres.

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
