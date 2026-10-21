import { describe, expect, it } from "vitest";

import { authErrorMessage } from "./auth-errors";

describe("authErrorMessage", () => {
  it("words the refusals better-auth tags with a code, in the language asked for", () => {
    const wrong = { error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password", statusText: "Unauthorized" } };
    expect(authErrorMessage(wrong, "en")).toBe("Invalid email or password");
    expect(authErrorMessage(wrong, "uk")).toBe("Неправильна адреса електронної пошти або пароль");
    expect(authErrorMessage({ error: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", message: "User already exists. Use another email." } }, "uk")).toBe("Користувач із такою адресою вже існує. Використайте іншу адресу.");
    expect(authErrorMessage({ error: { code: "TOKEN_EXPIRED" } }, "uk")).toBe("Термін дії посилання минув");
  });

  it("keeps better-auth's English for codes it does not know, then the status text", () => {
    expect(authErrorMessage({ error: { code: "SOMETHING_NEW", message: "Something new happened" } }, "uk")).toBe("Something new happened");
    expect(authErrorMessage({ error: { statusText: "Bad Gateway" } }, "uk")).toBe("Bad Gateway");
    expect(authErrorMessage({ error: {} }, "uk")).toBe("Сталася неочікувана помилка.");
  });

  it("words a rate-limit refusal that has no code", () => {
    expect(authErrorMessage({ error: { status: 429, message: "Too many requests. Please try again later." } }, "en")).toBe("Too many tries. Try again in a few minutes.");
    expect(authErrorMessage({ error: { status: 429 } }, "uk")).toBe("Забагато спроб. Спробуйте за кілька хвилин.");
  });
});
