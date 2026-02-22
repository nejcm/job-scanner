import { describe, test, expect } from "bun:test";
import { normalizeRss } from "../src/pipeline.js";

describe("linkedin-feeds (normalizeRss)", () => {
  test("normalizes RSS-shaped item with source linkedin-feeds to unified job", () => {
    const raw = {
      source: "linkedin-feeds",
      title: "Senior Frontend Engineer",
      link: "https://example.com/job/123",
      description: "<p>React and TypeScript.</p>",
      pubDate: "2026-02-20T12:00:00Z",
      company: "Acme Inc",
      location: "Remote - US",
    };
    const job = normalizeRss(raw, "linkedin-feeds");
    expect(job.source).toBe("linkedin-feeds");
    expect(job.sourceId).toBe("https://example.com/job/123");
    expect(job.title).toBe("Senior Frontend Engineer");
    expect(job.company).toBe("Acme Inc");
    expect(job.location).toBe("Remote - US");
    expect(job.applyUrl).toBe("https://example.com/job/123");
    expect(job.remoteRegion).toBe("Remote - US");
    expect(job.postedAt).toBeTruthy();
    expect(job.descriptionText).toContain("React");
    expect(job.isRemote).toBe(true);
  });

  test("handles minimal RSS item (title + link only)", () => {
    const raw = { title: "Backend Dev", link: "https://jobs.example.com/1" };
    const job = normalizeRss(raw, "linkedin-feeds");
    expect(job.source).toBe("linkedin-feeds");
    expect(job.title).toBe("Backend Dev");
    expect(job.applyUrl).toBe("https://jobs.example.com/1");
    expect(job.company).toBe("");
    expect(job.remoteRegion).toBe("Worldwide");
  });
});
