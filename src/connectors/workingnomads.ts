import type { IJobConnector } from "./types.js";

const WORKING_NOMADS_API = "https://www.workingnomads.com/api/exposed_jobs";
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

export const workingnomadsConnector: IJobConnector = {
  name: "workingnomads",
  async fetch() {
    const res = await fetchWithTimeout(WORKING_NOMADS_API, { "User-Agent": "JobScanner/1.0" });
    if (!res.ok) throw new Error(`WorkingNomads: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },
};
