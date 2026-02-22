import { describe, test, expect } from "bun:test";
import { dedupe } from "../src/pipeline.js";
import type { Job } from "../src/types.js";

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: overrides.id ?? "1",
    source: "test",
    sourceId: "1",
    title: "Engineer",
    company: "Acme",
    companyDomain: null,
    location: "Remote",
    isRemote: true,
    remoteRegion: "Worldwide",
    employmentType: null,
    seniority: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    techTags: [],
    descriptionText: "",
    applyUrl: "https://example.com/apply",
    postedAt: null,
    scrapedAt: new Date().toISOString(),
    raw: {},
    ...overrides,
  };
}

describe("dedupe", () => {
  test("exact duplicate by applyUrl is removed", () => {
    const a = job({ id: "a", applyUrl: "https://same.com/job" });
    const b = job({ id: "b", applyUrl: "https://same.com/job" });
    const result = dedupe([a, b]);
    expect(result).toHaveLength(1);
  });

  test("exact duplicate by company+title+location is removed", () => {
    const a = job({ id: "a", applyUrl: "", company: "Acme", title: "Dev", location: "Remote" });
    const b = job({ id: "b", applyUrl: "", company: "Acme", title: "Dev", location: "Remote" });
    const result = dedupe([a, b]);
    expect(result).toHaveLength(1);
  });

  test("unrelated jobs are kept", () => {
    const a = job({ id: "a", applyUrl: "https://a.com", company: "A", title: "Role A" });
    const b = job({ id: "b", applyUrl: "https://b.com", company: "B", title: "Role B" });
    const result = dedupe([a, b]);
    expect(result).toHaveLength(2);
  });
});
