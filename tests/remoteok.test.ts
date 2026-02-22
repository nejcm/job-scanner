import { describe, test, expect } from "bun:test";
import { normalizeRemoteOk } from "../src/pipeline.js";

describe("normalizeRemoteOk", () => {
  test("normalizes API shape to unified job", () => {
    const raw = {
      id: "123",
      position: "Senior React Developer",
      company: "TestCo",
      location: "Worldwide",
      description: "<p>Build things with React.</p>",
      url: "https://remoteok.com/l/123",
      epoch: Math.floor(Date.now() / 1000) - 86400,
      salary_min: 100000,
      salary_max: 150000,
      salary_currency: "USD",
      tags: ["react", "typescript"],
    };
    const job = normalizeRemoteOk(raw);
    expect(job.source).toBe("remoteok");
    expect(job.sourceId).toBe("123");
    expect(job.title).toBe("Senior React Developer");
    expect(job.company).toBe("TestCo");
    expect(job.applyUrl).toContain("123");
    expect(job.salaryMin).toBe(100000);
    expect(job.salaryMax).toBe(150000);
    expect(job.techTags).toContain("react");
    expect(job.postedAt).toBeTruthy();
    expect(job.descriptionText).toContain("Build things");
    expect(job.raw).toBe(raw);
  });
});
