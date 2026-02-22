import type { IJobConnector } from "./types.js";

const REMOTEOK_API = "https://remoteok.com/api";
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

export const remoteokConnector: IJobConnector = {
  name: "remoteok",
  async fetch() {
    const res = await fetchWithTimeout(REMOTEOK_API, {
      "User-Agent": "JobScanner/1.0 (https://github.com/job-scanner)",
    });
    if (!res.ok) throw new Error(`RemoteOK: ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data?.length ? [data] : [];
    return list.filter((item: Record<string, unknown>) => item?.id != null);
  },
};
