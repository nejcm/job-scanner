import type { IJobConnector } from "./types.js";

const WWR_RSS = "https://weworkremotely.com/remote-jobs.rss";
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

export const weworkremotelyConnector: IJobConnector = {
  name: "weworkremotely",
  async fetch() {
    const res = await fetchWithTimeout(WWR_RSS, { "User-Agent": "JobScanner/1.0" });
    if (!res.ok) throw new Error(`WeWorkRemotely: ${res.status}`);
    const text = await res.text();
    return parseRssToRawItems(text, "weworkremotely");
  },
};

function parseRssToRawItems(xml: string, source: string): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.at(1) ?? block.match(/<title>([^<]*)<\/title>/)?.at(1) ?? "";
    const link = block.match(/<link>([^<]*)<\/link>/)?.at(1) ?? "";
    const desc = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.at(1) ?? block.match(/<description>([^<]*)<\/description>/)?.at(1) ?? "";
    const pubDate = block.match(/<pubDate>([^<]*)<\/pubDate>/)?.at(1) ?? null;
    items.push({ source, title, link, description: desc, pubDate, raw: block });
  }
  return items;
}

export { parseRssToRawItems };
