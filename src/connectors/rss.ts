import type { IJobConnector } from "./types.js";
import { parseRssToRawItems } from "./weworkremotely.js";
const REQUEST_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function createRssConnector(feeds: string[]): IJobConnector {
  return {
    name: "rss",
    async fetch() {
      const all: Record<string, unknown>[] = [];
      for (const url of feeds) {
        try {
          const res = await fetchWithTimeout(url, { "User-Agent": "JobScanner/1.0" });
          if (!res.ok) continue;
          const text = await res.text();
          const items = parseRssToRawItems(text, "rss");
          for (const item of items) {
            all.push({ ...item, feedUrl: url });
          }
        } catch {
          // skip failed feed
        }
      }
      return all;
    },
  };
}
