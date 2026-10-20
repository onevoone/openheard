import { beforeEach, describe, expect, it, vi } from "vitest";

const sent = vi.hoisted(() => [] as { to: string; subject: string; html: string; text: string }[]);
vi.mock("@openheard/env/server", () => ({
  env: { EMAIL: { send: vi.fn(async (msg: (typeof sent)[number]) => (sent.push(msg), { messageId: "m1" })) } },
}));

import { sendInviteEmail, sendMagicLinkEmail, sendPasswordResetEmail } from "./email";

describe("sendInviteEmail", () => {
  beforeEach(() => void (sent.length = 0));

  it("escapes the workspace and inviter names in the HTML, not the plain text", async () => {
    await sendInviteEmail("a@example.com", "Eve <script>x</script>", "Acme <b>Co</b>", "https://example.com/join/t", "en");
    const [msg] = sent;
    expect(msg.html).toContain("Acme &lt;b&gt;Co&lt;/b&gt;");
    expect(msg.html).toContain("Eve &lt;script&gt;x&lt;/script&gt;");
    expect(msg.html).not.toContain("<b>Co</b>");
    expect(msg.html).not.toContain("<script>");
    expect(msg.text).toContain("Acme <b>Co</b>");
  });

  it("keeps English word for word", async () => {
    await sendInviteEmail("a@example.com", "Eve", "Acme", "https://example.com/join/t", "en");
    const [msg] = sent;
    expect(msg.subject).toBe("Eve invited you to Acme");
    expect(msg.html).toContain('<html lang="en">');
    expect(msg.html).toContain("Eve invited you to join <strong>Acme</strong>.");
    expect(msg.html).toContain("Acme &middot; feedback board");
    expect(msg.text).toBe("Eve invited you to Acme\n\nJoin here: https://example.com/join/t\n\nThis invite link expires in 7 days.");
  });

  it("writes the invite in Ukrainian and still escapes the names", async () => {
    await sendInviteEmail("a@example.com", "Eve <i>", "Acme <b>Co</b>", "https://example.com/join/t", "uk");
    const [msg] = sent;
    expect(msg.subject).toBe("Eve <i> запрошує вас до простору «Acme <b>Co</b>»");
    expect(msg.html).toContain('<html lang="uk">');
    expect(msg.html).toContain("Eve &lt;i&gt; запрошує вас приєднатися до простору «<strong>Acme &lt;b&gt;Co&lt;/b&gt;</strong>».");
    expect(msg.html).toContain("Acme &lt;b&gt;Co&lt;/b&gt; &middot; дошка відгуків");
    expect(msg.html).toContain("Прийняти запрошення");
    expect(msg.html).not.toContain("<b>Co</b>");
    expect(msg.text).toBe("Eve <i> запрошує вас до простору «Acme <b>Co</b>»\n\nПриєднатися: https://example.com/join/t\n\nЗапрошення дійсне 7 днів.");
  });

  it("labels the sign-in and reset emails by language", async () => {
    await sendMagicLinkEmail("a@example.com", "https://example.com/m", "uk");
    await sendPasswordResetEmail("a@example.com", "https://example.com/r", "en");
    expect(sent.map((s) => s.subject)).toEqual(["Посилання для входу", "Reset your password"]);
    expect(sent[0]!.html).toContain("openheard &middot; дошка відгуків із відкритим кодом");
    expect(sent[1]!.html).toContain("openheard &middot; open source feedback board");
  });
});
