import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { IJobConnector } from "./connectors/types.js";

const CACHE_DIR = ".cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DELAY_MS = 1000;

function cachePath(name: string): string {
  return join(CACHE_DIR, `${name}.json`);
}

async function getCached(name: string): Promise<unknown[] | null> {
  try {
    const path = cachePath(name);
    const data = await readFile(path, "utf-8");
    const parsed = JSON.parse(data) as { cachedAt: number; payload: unknown[] };
    if (Date.now() - parsed.cachedAt < CACHE_TTL_MS) return parsed.payload;
  } catch {
    // ignore
  }
  return null;
}

async function setCached(name: string, payload: unknown[]): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const path = cachePath(name);
    await writeFile(path, JSON.stringify({ cachedAt: Date.now(), payload }), "utf-8");
  } catch {
    // ignore
  }
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
      if (i < attempts - 1) {
        const delay = Math.min(1000 * 2 ** i, 10000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw last;
}

export async function fetchAll(connectors: IJobConnector[]): Promise<{ source: string; raw: unknown[] }[]> {
  const results: { source: string; raw: unknown[] }[] = [];
  for (const conn of connectors) {
    const cached = await getCached(conn.name);
    if (cached != null) {
      results.push({ source: conn.name, raw: cached });
      continue;
    }
    const raw = await withRetry(() => conn.fetch());
    const list = Array.isArray(raw) ? raw : [];
    results.push({ source: conn.name, raw: list });
    await setCached(conn.name, list);
    if (connectors.indexOf(conn) < connectors.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  return results;
}
