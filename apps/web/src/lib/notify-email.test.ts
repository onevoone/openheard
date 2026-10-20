// The three voter emails rendered in both languages. English is pinned word
// for word (it is what shipped before translation); Ukrainian is pinned so a
// reworded message shows up in review.
import { describe, expect, it } from "vitest";

import { changelogEmail, confirmSubscriptionEmail, statusChangeEmail } from "./notify-email";

const unsubs = [{ url: "https://acme.example.com/unsubscribe?t=abc", label: "Stop" }];
const pill = (label: string) => ({ label, color: "#7fb894" });

describe("statusChangeEmail", () => {
  const input = {
    workspaceName: "Acme <Co>",
    postTitle: "Dark\nmode",
    postUrl: "https://acme.example.com/p/1",
    from: pill("Planned"),
    to: pill("Shipped"),
    note: "Out <today>",
    unsubs,
  };

  it("reads as before in English", () => {
    const mail = statusChangeEmail({ ...input, locale: "en" });
    expect(mail.subject).toBe("Dark mode is now shipped");
    expect(mail.text).toBe(
      [
        "An update from Acme <Co> on a post you follow",
        "",
        "Dark\nmode",
        "Planned -> Shipped",
        "",
        "Note from the team: Out <today>",
        "",
        "View the post: https://acme.example.com/p/1",
        "",
        "You are getting this because you voted on, commented on or posted this idea.",
        "Stop: https://acme.example.com/unsubscribe?t=abc",
      ].join("\n"),
    );
    expect(mail.html).toContain('<html lang="en">');
    expect(mail.html).toContain("An update from Acme &lt;Co&gt; on a post you follow");
    expect(mail.html).toContain("Note from the Acme &lt;Co&gt; team");
    expect(mail.html).toContain("Acme &lt;Co&gt; &middot; feedback board");
  });

  it("reads in Ukrainian with the title and workspace left as they are", () => {
    const mail = statusChangeEmail({ ...input, locale: "uk", from: pill("Заплановано"), to: pill("Випущено") });
    expect(mail.subject).toBe("Статус «Dark mode» змінено: випущено");
    expect(mail.text).toBe(
      [
        "Простір Acme <Co>: оновлення ідеї, за якою ви стежите",
        "",
        "Dark\nmode",
        "Заплановано -> Випущено",
        "",
        "Нотатка від команди: Out <today>",
        "",
        "Переглянути ідею: https://acme.example.com/p/1",
        "",
        "Ви отримуєте цей лист, бо голосували за цю ідею, прокоментували її або додали її.",
        "Stop: https://acme.example.com/unsubscribe?t=abc",
      ].join("\n"),
    );
    expect(mail.html).toContain('<html lang="uk">');
    expect(mail.html).toContain("Простір Acme &lt;Co&gt;: оновлення ідеї, за якою ви стежите");
    expect(mail.html).toContain("Нотатка від команди Acme &lt;Co&gt;");
    expect(mail.html).toContain("Out &lt;today&gt;");
    expect(mail.html).not.toContain("<Co>");
    expect(mail.html).toContain("Acme &lt;Co&gt; &middot; дошка відгуків");
  });

  it("keeps a subject on one line and short in both languages", () => {
    for (const locale of ["en", "uk"] as const) {
      const { subject } = statusChangeEmail({ ...input, locale, postTitle: `${"x".repeat(200)}\r\nBcc: evil@example.com`, to: pill("Status\nTwo") });
      expect(subject).not.toMatch(/[\r\n]/);
      expect(subject.length).toBeLessThan(200);
    }
  });
});

describe("changelogEmail", () => {
  const input = {
    workspaceName: "Acme",
    title: "Dark mode",
    version: "v1.2" as string | null,
    body: "It is here.",
    entryUrl: "https://acme.example.com/changelog",
    posts: [{ title: "Dark <mode>", url: "https://acme.example.com/p/1" }],
    follows: true,
    unsubs,
  };

  it("reads as before in English", () => {
    const mail = changelogEmail({ ...input, locale: "en" });
    expect(mail.subject).toBe("Acme shipped: Dark mode");
    expect(mail.text).toBe(
      [
        "New in Acme · v1.2",
        "",
        "Dark mode",
        "",
        "It is here.",
        "",
        "Shipped from:",
        "- Dark <mode>: https://acme.example.com/p/1",
        "",
        "Read the changelog: https://acme.example.com/changelog",
        "",
        "You are getting this because you voted on, commented on or posted one of these ideas.",
        "Stop: https://acme.example.com/unsubscribe?t=abc",
      ].join("\n"),
    );
    expect(changelogEmail({ ...input, locale: "en", follows: false }).text).toContain("You are getting this because you subscribed to the Acme changelog.");
  });

  it("reads in Ukrainian", () => {
    const mail = changelogEmail({ ...input, locale: "uk" });
    expect(mail.subject).toBe("Acme: випущено — Dark mode");
    expect(mail.text).toBe(
      [
        "Що нового: Acme · v1.2",
        "",
        "Dark mode",
        "",
        "It is here.",
        "",
        "Випущено за ідеями:",
        "- Dark <mode>: https://acme.example.com/p/1",
        "",
        "Читати журнал змін: https://acme.example.com/changelog",
        "",
        "Ви отримуєте цей лист, бо голосували за одну з цих ідей, прокоментували або додали її.",
        "Stop: https://acme.example.com/unsubscribe?t=abc",
      ].join("\n"),
    );
    expect(mail.html).toContain("Що нового: Acme &middot; v1.2");
    expect(mail.html).toContain("Dark &lt;mode&gt;");
    expect(changelogEmail({ ...input, locale: "uk", follows: false, version: null }).text).toContain("бо підписані на журнал змін простору «Acme».");
  });
});

describe("confirmSubscriptionEmail", () => {
  const input = { workspaceName: "Acme <Co>", confirmUrl: "https://acme.example.com/changelog/confirm?t=abc" };

  it("reads as before in English", () => {
    const mail = confirmSubscriptionEmail({ ...input, locale: "en" });
    expect(mail.subject).toBe("Confirm changelog emails from Acme <Co>");
    expect(mail.text).toBe(
      "Confirm changelog emails from Acme <Co>\n\nConfirm here: https://acme.example.com/changelog/confirm?t=abc\n\nThis link expires in 7 days. If you did not ask for this, ignore this email.",
    );
    expect(mail.html).toContain("Confirm to get one email from Acme &lt;Co&gt; each time something ships. This link expires in 7 days.");
  });

  it("reads in Ukrainian", () => {
    const mail = confirmSubscriptionEmail({ ...input, locale: "uk" });
    expect(mail.subject).toBe("Підтвердіть підписку на журнал змін: Acme <Co>");
    expect(mail.text).toBe(
      "Підтвердіть підписку на журнал змін: Acme <Co>\n\nПідтвердити: https://acme.example.com/changelog/confirm?t=abc\n\nПосилання дійсне 7 днів. Якщо ви цього не просили, проігноруйте цей лист.",
    );
    expect(mail.html).toContain("від простору «Acme &lt;Co&gt;» щоразу, коли щось випускається");
    expect(mail.html).toContain('<html lang="uk">');
  });
});
