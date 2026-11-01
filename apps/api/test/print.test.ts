import { describe, expect, it } from "vitest";
import { FRONT_BOTTOM, FRONT_SIDE, PER_EDITORIAL_PAGE, PER_PAGE, planIssue, type PrintAd, type PrintStory } from "../src/print/plan";
import { rgbOperatorsToCmyk, rgbToCmyk } from "../src/print/press";
import { articleParagraphs, nepalDayStart } from "../src/print/issue";
import { printImageUrl, renderIssueHtml } from "../src/print/render";

let n = 0;
function story(extra: Partial<PrintStory> = {}): PrintStory {
  n++;
  return {
    id: `s${n}`,
    title: `समाचार ${n}`,
    excerpt: "सारांश",
    paragraphs: ["पहिलो अनुच्छेद।"],
    imageUrl: `https://res.cloudinary.com/x/image/upload/${n}.jpg`,
    isLocal: false,
    isPriorityPlace: false,
    isBreaking: false,
    isFeatured: false,
    publishedAt: new Date(Date.UTC(2026, 9, 1) + n * 60_000),
    url: `https://hamronepal.test/n/${n}`,
    ...extra,
  };
}

describe("print edition plan", () => {
  it("puts breaking news on the front page and never prints a story twice", () => {
    const breaking = story({ isBreaking: true, topicSlug: "rajniti" });
    const others = Array.from({ length: 60 }, (_, i) =>
      story({ topicSlug: ["rajniti", "samaj", "khelkud", "antarrashtriya", "arthatantra"][i % 5] })
    );
    const plan = planIssue([...others, breaking], 6);

    expect(plan.front.lead?.id).toBe(breaking.id);
    expect(plan.front.side).toHaveLength(FRONT_SIDE);
    expect(plan.front.bottom).toHaveLength(FRONT_BOTTOM);
    expect(plan.pages.map((p) => p.number)).toEqual([2, 3, 4, 5, 6]);
    const ids = plan.used.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(1 + FRONT_SIDE + FRONT_BOTTOM + 5 * PER_PAGE);
  });

  it("sends local news to the local page, Kavre first, and tops up short sections", () => {
    const kavre = story({ isLocal: true, isPriorityPlace: true, topicSlug: "samaj", publishedAt: new Date(0) });
    const local = Array.from({ length: 3 }, () => story({ isLocal: true, topicSlug: "samaj" }));
    const sport = Array.from({ length: 20 }, () => story({ topicSlug: "khelkud" }));
    // Seven front-page stories so the local ones stay for page 3.
    const front = Array.from({ length: 7 }, () => story({ isFeatured: true, topicSlug: "rajniti" }));
    const plan = planIssue([...front, kavre, ...local, ...sport], 6);

    const localPage = plan.pages.find((p) => p.section === "स्थानीय")!;
    expect(localPage.number).toBe(3);
    expect(localPage.lead?.id).toBe(kavre.id);
    // Only four local stories exist, so the page is topped up with others.
    expect([localPage.lead, ...localPage.stories]).toHaveLength(PER_PAGE);
    // A section with none of its own stories is labelled "विविध".
    expect(plan.pages.find((p) => p.number === 5)!.section).toBe("विविध");
  });

  it("prefers a story with a photo as the lead", () => {
    const noPhoto = story({ isFeatured: true, imageUrl: undefined });
    const withPhoto = story();
    expect(planIssue([noPhoto, withPhoto], 2).front.lead?.id).toBe(withPhoto.id);
  });
});

describe("print edition text and dates", () => {
  it("turns article HTML into paragraphs without the source credit", () => {
    const html = '<p>पहिलो <b>अनुच्छेद</b>।</p><h2>उपशीर्षक</h2><p>दोस्रो।</p><p class="source-credit">स्रोत: <a href="x">रातोपाटी</a></p>';
    expect(articleParagraphs(html)).toEqual(["पहिलो अनुच्छेद।", "उपशीर्षक", "दोस्रो।"]);
  });

  it("uses Nepal's day for the issue date", () => {
    expect(nepalDayStart("2026-11-06").toISOString()).toBe("2026-11-05T18:15:00.000Z");
    expect(() => nepalDayStart("6 Nov")).toThrow();
  });

  it("asks Cloudinary for a print-sized JPEG", () => {
    expect(printImageUrl("https://res.cloudinary.com/x/image/upload/a.webp", 750)).toBe(
      "https://res.cloudinary.com/x/image/upload/c_limit,w_750,q_auto:good,f_jpg/a.webp"
    );
  });

  it("renders the masthead, info bar and a QR code per story", async () => {
    const plan = planIssue([story({ title: "मुख्य समाचार <शीर्षक>" }), story(), story()], 2);
    const html = await renderIssueHtml(plan, {
      name: "हाम्रो नेपाल",
      tagline: "तपाईंको ठाउँको, देशभरको समाचार",
      frequency: "साप्ताहिक",
      price: "५",
      siteUrl: "https://hamronepal.test",
      number: 12,
      volume: 1,
      issueDate: nepalDayStart("2026-11-06"),
      pages: 2,
    });
    expect(html).toContain("अंक १२");
    expect(html).toContain("मूल्य रु. ५");
    expect(html).toContain("मुख्य समाचार &lt;शीर्षक&gt;"); // escaped
    expect(html.match(/<svg[^>]*viewBox="0 0 \d+ \d+"[^>]*shape-rendering/g)?.length).toBeGreaterThanOrEqual(4); // site + 3 stories
    expect(html).not.toContain("__HN_PRINT__ = true"); // preview mode
  });
});

describe("print edition ads and editorial", () => {
  const many = () => Array.from({ length: 60 }, (_, i) => story({ topicSlug: ["rajniti", "samaj", "khelkud", "antarrashtriya", "arthatantra"][i % 5] }));
  const ad = (placement: PrintAd["placement"], id: string): PrintAd => ({ id, title: id, imageUrl: "https://x.test/a.jpg", placement });

  it("puts full-page ads on the last pages, never on page 2, and reports ads that don't fit", () => {
    const fulls = ["f1", "f2", "f3", "f4", "f5"].map((id) => ad("print-full", id));
    const plan = planIssue(many(), 6, { ads: fulls });
    expect(plan.pages.filter((p) => p.fullAd).map((p) => p.number)).toEqual([3, 4, 5, 6]);
    expect(plan.pages[0].fullAd).toBeUndefined();
    expect(plan.unplacedAds.map((a) => a.id)).toEqual(["f5"]);
  });

  it("gives half-page and box ads the space of stories", () => {
    const plan = planIssue(many(), 6, {
      ads: [ad("print-half", "h1"), ad("print-box", "b1"), ad("print-box", "b2"), ad("print-strip", "s1"), ad("print-strip", "s2")],
    });
    const half = plan.pages.find((p) => p.halfAd)!;
    expect(half.number).toBe(6);
    expect([half.lead, ...half.stories].filter(Boolean)).toHaveLength(1);
    const boxed = plan.pages.filter((p) => p.boxAds.length);
    expect(boxed.map((p) => p.number)).toEqual([4, 5]); // spread out, from the back
    for (const p of boxed) expect([p.lead, ...p.stories].filter(Boolean)).toHaveLength(PER_PAGE - 1);
    expect(plan.front.strip?.id).toBe("s1");
    expect(plan.unplacedAds.map((a) => a.id)).toEqual(["s2"]);
  });

  it("puts the editorial on page 2 with fewer stories beside it", () => {
    const editorial = story({ title: "सम्पादकीय", topicSlug: "sampadakiya" });
    const plan = planIssue(many(), 6, { editorial });
    expect(plan.pages[0].editorial?.id).toBe(editorial.id);
    expect([plan.pages[0].lead, ...plan.pages[0].stories].filter(Boolean)).toHaveLength(PER_EDITORIAL_PAGE);
    expect(plan.used.filter((s) => s.id === editorial.id)).toHaveLength(1);
  });
});

describe("press colours", () => {
  it("prints black and grey on the black plate only, brand colours with fixed inks", () => {
    expect(rgbToCmyk(0, 0, 0)).toEqual([0, 0, 0, 1]);
    expect(rgbToCmyk(0.078, 0.078, 0.078)).toEqual([0, 0, 0, 1]); // near-black: solid
    expect(rgbToCmyk(0.4, 0.4, 0.4)).toEqual([0, 0, 0, 0.6]);
    expect(rgbToCmyk(0xc8 / 255, 0x10 / 255, 0x2e / 255)).toEqual([0, 1, 0.8, 0.1]); // flag crimson
    const [c, m, y, k] = rgbToCmyk(0.05, 0.02, 0.3); // dark saturated colour
    expect(c + m + y + k).toBeLessThanOrEqual(2.4 + 1e-9); // newsprint ink limit
  });

  it("rewrites RGB colour operators as CMYK", () => {
    expect(rgbOperatorsToCmyk("q .0784 .0784 .0784 rg BT /F1 9 Tf <0012> Tj ET 0 0 0 RG")).toBe(
      "q 0 0 0 1 k BT /F1 9 Tf <0012> Tj ET 0 0 0 1 K"
    );
  });
});
