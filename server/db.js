import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7 talks to the database through a driver adapter rather than reading
// the URL out of schema.prisma, so the connection string is wired up here.
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Paste your Neon connection string into server/.env — see the README.'
  );
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
