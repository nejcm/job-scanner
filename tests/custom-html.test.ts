import { describe, test, expect } from "bun:test";
import { parseJobLinksFromHtml } from "../src/connectors/custom-html.js";

describe("parseJobLinksFromHtml", () => {
  test("filters obvious noisy links and keeps likely job links", () => {
    const html = `
      <html>
        <body>
          <nav>
            <a href="/about">About</a>
            <a href="/jobs">Jobs</a>
          </nav>
          <main>
            <a href="/jobs/senior-typescript-engineer">Senior TypeScript Engineer</a>
            <a href="/blog/how-to-hire">How to hire faster</a>
          </main>
        </body>
      </html>
    `;

    const items = parseJobLinksFromHtml(html, "https://builtin.com/jobs", "builtin");
    expect(items.some((i) => String(i.link).includes("/jobs/senior-typescript-engineer"))).toBe(true);
    expect(items.some((i) => String(i.link).includes("/about"))).toBe(false);
    expect(items.some((i) => String(i.link).includes("/blog/"))).toBe(false);
  });

  test("parses JSON-LD JobPosting with company and location", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Senior Fullstack Engineer",
              "description": "<p>Build platform services</p>",
              "url": "/job/senior-fullstack-engineer",
              "datePosted": "2026-02-20",
              "hiringOrganization": { "@type": "Organization", "name": "Rocket Labs" },
              "jobLocationType": "TELECOMMUTE"
            }
          </script>
        </head>
        <body></body>
      </html>
    `;

    const items = parseJobLinksFromHtml(
      html,
      "https://www.remoterocketship.com/?page=1&sort=DateAdded",
      "remoterocketship"
    );
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Senior Fullstack Engineer");
    expect(items[0].company).toBe("Rocket Labs");
    expect(items[0].location).toBe("Remote");
    expect(String(items[0].link)).toContain("/job/senior-fullstack-engineer");
  });
});
