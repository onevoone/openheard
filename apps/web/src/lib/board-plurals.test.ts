import { m } from "@openheard/i18n/messages";
import { describe, expect, it } from "vitest";

// The counts on the public board: Ukrainian needs one/few/many, English
// reads "1 post", never "1 posts".
const uk = { locale: "uk" } as const;
const en = { locale: "en" } as const;

describe("count messages", () => {
  it("inflect ideas in Ukrainian", () => {
    expect([1, 2, 5, 11, 21, 22, 25].map((count) => m.board_count_posts({ count }, uk))).toEqual(["1 ідея", "2 ідеї", "5 ідей", "11 ідей", "21 ідея", "22 ідеї", "25 ідей"]);
  });

  it("say one post in English", () => {
    expect(m.board_count_posts({ count: 1 }, en)).toBe("1 post");
    expect(m.board_count_posts({ count: 3 }, en)).toBe("3 posts");
  });

  it("cover votes, releases, articles and results", () => {
    expect(m.post_votes_count({ count: 1 }, en)).toBe("1 vote");
    expect(m.post_votes_count({ count: 3 }, uk)).toBe("3 голоси");
    expect(m.changelog_releases({ count: 1 }, en)).toBe("1 release");
    expect(m.changelog_releases({ count: 5 }, uk)).toBe("5 випусків");
    expect(m.help_articles_count({ count: 1 }, en)).toBe("1 article");
    expect(m.help_articles_count({ count: 4 }, uk)).toBe("4 статті");
    expect(m.help_results_count({ count: 1 }, en)).toBe("1 result");
    expect(m.help_results_count({ count: 2 }, uk)).toBe("2 результати");
  });

  it("read the vote total aloud with the formatted number", () => {
    expect(m.vote_status_voted({ count: 1, shown: "1" }, en)).toBe("1 vote, voted");
    expect(m.vote_status_not_voted({ count: 1200, shown: "1,200" }, en)).toBe("1,200 votes, not voted");
    expect(m.vote_status_voted({ count: 21, shown: "21" }, uk)).toBe("21 голос, ви проголосували");
  });
});
