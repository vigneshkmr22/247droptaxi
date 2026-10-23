import 'server-only';

type Runner = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

let runner: Promise<Runner> | null = null;

async function open(): Promise<Runner> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    // the neon function takes a plain query string with $1, $2 placeholders followed by the parameter array
    const run = sql as unknown as (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
    return (text, params) => run(text, params);
  }
  if (process.env.VERCEL) {
    throw new Error('DATABASE_URL is not set. Add a Postgres database to the Vercel project.');
  }
  // Local development without any account: an embedded Postgres kept in .data/pglite (run `npm run seed` once).
  const { PGlite } = await import('@electric-sql/pglite');
  const { mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const dir = join(process.cwd(), '.data', 'pglite');
  mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  await db.waitReady;
  return async (text, params) => (await db.query(text, params)).rows as Record<string, unknown>[];
}

/** Runs one parameterised statement ($1, $2, ...) and returns its rows. */
export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  runner ??= open();
  const run = await runner;
  return (await run(text, params)) as T[];
}

export async function one<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}
