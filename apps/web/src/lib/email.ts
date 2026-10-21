import type { Locale } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";

const DEFAULT_FROM = { email: "hello@openheard.com", name: "openheard" };

// Self-hosters send from their own Email Sending domain via EMAIL_FROM / EMAIL_FROM_NAME.
function sender(vars: { EMAIL_FROM?: string; EMAIL_FROM_NAME?: string }) {
  return vars.EMAIL_FROM
    ? { email: vars.EMAIL_FROM, name: vars.EMAIL_FROM_NAME || DEFAULT_FROM.name }
    : DEFAULT_FROM;
}
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const TEXT_STYLE = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;";

// `brand` is the workspace name, already HTML-escaped; it heads the email.
export function emailLayout(content: string, locale: Locale, footer = "", brand?: string) {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background: #f7f7f7;">
  <div style="max-width: 520px; margin: 0 auto; padding: 48px 20px;">
    <div style="background: #ffffff; border-radius: 12px; padding: 40px 36px; border: 1px solid #eee;">
      <div style="margin-bottom: 28px;">
        <span style="${TEXT_STYLE} font-size: 16px; font-weight: 700; color: #111; letter-spacing: -0.3px;">${brand ?? "openheard"}</span>
      </div>
      ${content}
    </div>
    <p style="${TEXT_STYLE} font-size: 11px; color: #aaa; text-align: center; margin-top: 24px; line-height: 1.6;">
      ${brand ? `${brand} &middot; ${m.email_footer_board({}, { locale })}` : `openheard &middot; ${m.email_footer_openheard({}, { locale })}`}
    </p>${footer}
  </div>
</body>
</html>`;
}

export function emailButton(href: string, label: string) {
  return `<div style="margin: 28px 0;">
    <a href="${href}" style="display: inline-block; padding: 12px 28px; background: #111; color: #ffffff; text-decoration: none; border-radius: 8px; ${TEXT_STYLE} font-size: 14px; font-weight: 600;">${label}</a>
  </div>`;
}

export type SendResult = { ok: boolean; code?: string };

// Never throws: a failed send is logged and reported, the caller carries on.
export async function sendEmail(to: string, subject: string, html: string, text: string, opts?: { headers?: Record<string, string> }): Promise<SendResult> {
  try {
    const { env } = await import("@openheard/env/server");
    if (!(env as any).EMAIL) {
      console.log(`[email] No EMAIL binding — logging instead\n  To: ${to}\n  Subject: ${subject}\n  ${text.replace(/\n/g, "\n  ")}`);
      return { ok: true };
    }
    const replyTo = (env as unknown as { EMAIL_REPLY_TO?: string }).EMAIL_REPLY_TO;
    const result = await (env as any).EMAIL.send({ to, from: sender(env as any), subject, html, text, ...(replyTo ? { replyTo } : {}), ...(opts?.headers ? { headers: opts.headers } : {}) });
    console.log(`[email] sent: ${subject}`, result?.messageId ?? "");
    return { ok: true };
  } catch (err: any) {
    console.error("[email] send failed:", err.code ?? "", err.message ?? err);
    return { ok: false, code: typeof err?.code === "string" ? err.code : undefined };
  }
}

export async function sendMagicLinkEmail(to: string, url: string, locale: Locale) {
  await sendEmail(
    to,
    m.email_magic_subject({}, { locale }),
    emailLayout(`
      <h1 style="${TEXT_STYLE} font-size: 20px; font-weight: 700; color: #111; margin: 0 0 12px;">${m.email_magic_title({}, { locale })}</h1>
      <p style="${TEXT_STYLE} font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 4px;">${m.email_magic_intro({}, { locale })}</p>
      ${emailButton(url, m.email_magic_button({}, { locale }))}
      <p style="${TEXT_STYLE} font-size: 13px; color: #999; line-height: 1.6; margin: 0;">${m.email_ignore_html({}, { locale })}</p>
    `, locale),
    `${m.email_magic_title({}, { locale })}\n\n${m.email_magic_text_intro({}, { locale })}\n\n${url}\n\n${m.email_ignore_text({}, { locale })}`,
  );
}

export async function sendPasswordResetEmail(to: string, url: string, locale: Locale) {
  await sendEmail(
    to,
    m.email_reset_title({}, { locale }),
    emailLayout(`
      <h1 style="${TEXT_STYLE} font-size: 20px; font-weight: 700; color: #111; margin: 0 0 12px;">${m.email_reset_title({}, { locale })}</h1>
      <p style="${TEXT_STYLE} font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 4px;">${m.email_reset_intro({}, { locale })}</p>
      ${emailButton(url, m.email_reset_button({}, { locale }))}
      <p style="${TEXT_STYLE} font-size: 13px; color: #999; line-height: 1.6; margin: 0;">${m.email_ignore_html({}, { locale })}</p>
    `, locale),
    `${m.email_reset_title({}, { locale })}\n\n${m.email_reset_text_intro({}, { locale })}\n\n${url}\n\n${m.email_ignore_text({}, { locale })}`,
  );
}

export async function sendInviteEmail(to: string, inviterName: string, workspaceName: string, joinUrl: string, locale: Locale) {
  await sendEmail(
    to,
    m.email_invite_subject({ inviter: inviterName, workspace: workspaceName }, { locale }),
    emailLayout(`
      <h1 style="${TEXT_STYLE} font-size: 20px; font-weight: 700; color: #111; margin: 0 0 12px;">${m.email_invite_title({}, { locale })}</h1>
      <p style="${TEXT_STYLE} font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 4px;">
        ${m.email_invite_body({ inviter: escapeHtml(inviterName), workspace: `<strong>${escapeHtml(workspaceName)}</strong>` }, { locale })}
      </p>
      ${emailButton(joinUrl, m.email_invite_button({}, { locale }))}
      <p style="${TEXT_STYLE} font-size: 13px; color: #999; line-height: 1.6; margin: 0;">${m.email_invite_expires({}, { locale })}</p>
    `, locale, "", escapeHtml(workspaceName)),
    `${m.email_invite_subject({ inviter: inviterName, workspace: workspaceName }, { locale })}\n\n${m.email_invite_text_join({ url: joinUrl }, { locale })}\n\n${m.email_invite_expires({}, { locale })}`,
  );
}
