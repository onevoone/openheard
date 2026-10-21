import type { Locale } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";

// better-auth answers in English and tags each refusal with a `code`. The
// sign-in, sign-up and reset forms word the ones a person can act on in the
// reader's language; anything unknown shows better-auth's own message.
type Words = (o: { locale?: Locale }) => string;

const CODES: Record<string, Words> = {
  INVALID_EMAIL_OR_PASSWORD: (o) => m.auth_err_invalid_credentials({}, o),
  INVALID_EMAIL: (o) => m.auth_err_invalid_email({}, o),
  INVALID_PASSWORD: (o) => m.auth_err_invalid_password({}, o),
  USER_ALREADY_EXISTS: (o) => m.auth_err_user_exists({}, o),
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: (o) => m.auth_err_user_exists_other({}, o),
  PASSWORD_TOO_SHORT: (o) => m.auth_err_password_short({}, o),
  PASSWORD_TOO_LONG: (o) => m.auth_err_password_long({}, o),
  EMAIL_NOT_VERIFIED: (o) => m.auth_err_email_unverified({}, o),
  INVALID_TOKEN: (o) => m.auth_err_invalid_token({}, o),
  TOKEN_EXPIRED: (o) => m.auth_err_token_expired({}, o),
  USER_NOT_FOUND: (o) => m.auth_err_user_not_found({}, o),
  SESSION_EXPIRED: (o) => m.auth_err_session_expired({}, o),
  FAILED_TO_CREATE_USER: (o) => m.auth_err_create_failed({}, o),
  VALIDATION_ERROR: (o) => m.auth_err_validation({}, o),
  MISSING_FIELD: (o) => m.auth_err_missing_field({}, o),
};

export type AuthClientError = { error: { code?: string; message?: string; statusText?: string; status?: number } };

export function authErrorMessage({ error }: AuthClientError, locale?: Locale): string {
  const o = { locale };
  const known = error.code ? CODES[error.code] : undefined;
  if (known) return known(o);
  // The rate limiter answers 429 without a code.
  if (error.status === 429) return m.err_too_many_tries({}, o);
  return error.message || error.statusText || m.state_error_text({}, o);
}
