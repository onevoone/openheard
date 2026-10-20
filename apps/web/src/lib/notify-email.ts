// The emails that close the loop with voters: a post changed status, a
// changelog entry went out, and the changelog double opt-in. Pure string
// building; lib/notify.ts decides who gets them.
import type { Locale } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";

import { emailButton, emailLayout, escapeHtml } from "./email";

const TEXT = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;";

export type Rendered = { subject: string; html: string; text: string };
export type Unsub = { url: string; label: string };

// Subject lines are single-line plain text; a title with a newline in it must
// not start a new header.
function oneLine(s: string, max = 120): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max - 1).trimEnd() + "…" : flat;
}

function footer(unsubs: Unsub[]): string {
  if (!unsubs.length) return "";
  const links = unsubs.map((u) => `<a href="${escapeHtml(u.url)}" style="color: #999; text-decoration: underline;">${escapeHtml(u.label)}</a>`).join(" &middot; ");
  return `<p style="${TEXT} font-size: 11px; color: #aaa; text-align: center; margin-top: 8px; line-height: 1.6;">${links}</p>`;
}

function textFooter(unsubs: Unsub[]): string {
  return unsubs.map((u) => `${u.label}: ${u.url}`).join("\n");
}

function statusPill(label: string, color: string): string {
  const c = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#999999";
  return `<span style="${TEXT} display: inline-block; padding: 2px 10px; border-radius: 999px; background: ${c}1a; color: #111; font-size: 13px; font-weight: 600;"><span style="display: inline-block; width: 7px; height: 7px; border-radius: 999px; background: ${c}; margin-right: 6px; vertical-align: 1px;"></span>${escapeHtml(label)}</span>`;
}

export type StatusLabel = { label: string; color: string };

export function statusChangeEmail(input: {
  locale: Locale;
  workspaceName: string;
  postTitle: string;
  postUrl: string;
  from: StatusLabel;
  to: StatusLabel;
  note?: string | null;
  unsubs: Unsub[];
}): Rendered {
  const { locale, workspaceName, postTitle, postUrl, from, to, note, unsubs } = input;
  const subject = m.email_status_subject({ title: oneLine(postTitle, 80), status: oneLine(to.label, 30).toLocaleLowerCase(locale) }, { locale });
  const noteHtml = note
    ? `<div style="border-left: 2px solid #e5e5e5; padding: 2px 0 2px 14px; margin: 20px 0 0;">
        <p style="${TEXT} font-size: 12px; color: #999; margin: 0 0 4px;">${m.email_status_note_title({ workspace: escapeHtml(workspaceName) }, { locale })}</p>
        <p style="${TEXT} font-size: 15px; color: #333; line-height: 1.6; margin: 0; white-space: pre-wrap;">${escapeHtml(note)}</p>
      </div>`
    : "";
  const html = emailLayout(
    `
      <p style="${TEXT} font-size: 13px; color: #999; margin: 0 0 8px;">${m.email_status_intro({ workspace: escapeHtml(workspaceName) }, { locale })}</p>
      <h1 style="${TEXT} font-size: 20px; font-weight: 700; color: #111; margin: 0 0 16px; letter-spacing: -0.3px;">${escapeHtml(postTitle)}</h1>
      <p style="${TEXT} margin: 0;">${statusPill(from.label, from.color)} <span style="color: #999; font-size: 13px; padding: 0 6px;">&rarr;</span> ${statusPill(to.label, to.color)}</p>
      ${noteHtml}
      ${emailButton(postUrl, m.email_status_button({}, { locale }))}
      <p style="${TEXT} font-size: 13px; color: #999; line-height: 1.6; margin: 0;">${m.email_why_status({}, { locale })}</p>
    `,
    locale,
    footer(unsubs),
    escapeHtml(workspaceName),
  );
  const text = [
    m.email_status_intro({ workspace: workspaceName }, { locale }),
    "",
    postTitle,
    `${from.label} -> ${to.label}`,
    ...(note ? ["", m.email_status_note_text({ note }, { locale })] : []),
    "",
    `${m.email_status_button({}, { locale })}: ${postUrl}`,
    "",
    m.email_why_status({}, { locale }),
    textFooter(unsubs),
  ].join("\n");
  return { subject, html, text };
}

export function changelogEmail(input: {
  locale: Locale;
  workspaceName: string;
  title: string;
  version?: string | null;
  body: string;
  entryUrl: string;
  posts: { title: string; url: string }[];
  // True when the recipient voted on, commented on or posted a linked post.
  follows: boolean;
  unsubs: Unsub[];
}): Rendered {
  const { locale, workspaceName, title, version, body, entryUrl, posts, follows, unsubs } = input;
  const subject = m.email_changelog_subject({ workspace: oneLine(workspaceName, 40), title: oneLine(title, 80) }, { locale });
  const excerpt = body.length > 600 ? body.slice(0, 597).trimEnd() + "…" : body;
  const postsHtml = posts.length
    ? `<p style="${TEXT} font-size: 12px; color: #999; margin: 20px 0 6px;">${m.email_changelog_shipped_from({}, { locale })}</p>
       <ul style="${TEXT} margin: 0; padding: 0 0 0 18px; font-size: 14px; line-height: 1.7;">
         ${posts.map((p) => `<li><a href="${escapeHtml(p.url)}" style="color: #111;">${escapeHtml(p.title)}</a></li>`).join("")}
       </ul>`
    : "";
  const why = follows ? m.email_why_changelog_follow({}, { locale }) : m.email_why_changelog_subscribed({ workspace: workspaceName }, { locale });
  const html = emailLayout(
    `
      <p style="${TEXT} font-size: 13px; color: #999; margin: 0 0 8px;">${m.email_changelog_eyebrow({ workspace: escapeHtml(workspaceName) }, { locale })}${version ? ` &middot; ${escapeHtml(version)}` : ""}</p>
      <h1 style="${TEXT} font-size: 20px; font-weight: 700; color: #111; margin: 0 0 12px; letter-spacing: -0.3px;">${escapeHtml(title)}</h1>
      ${excerpt ? `<p style="${TEXT} font-size: 15px; color: #555; line-height: 1.7; margin: 0; white-space: pre-wrap;">${escapeHtml(excerpt)}</p>` : ""}
      ${postsHtml}
      ${emailButton(entryUrl, m.email_changelog_button({}, { locale }))}
      <p style="${TEXT} font-size: 13px; color: #999; line-height: 1.6; margin: 0;">${escapeHtml(why)}</p>
    `,
    locale,
    footer(unsubs),
    escapeHtml(workspaceName),
  );
  const text = [
    `${m.email_changelog_eyebrow({ workspace: workspaceName }, { locale })}${version ? ` · ${version}` : ""}`,
    "",
    title,
    ...(excerpt ? ["", excerpt] : []),
    ...(posts.length ? ["", `${m.email_changelog_shipped_from({}, { locale })}:`, ...posts.map((p) => `- ${p.title}: ${p.url}`)] : []),
    "",
    `${m.email_changelog_button({}, { locale })}: ${entryUrl}`,
    "",
    why,
    textFooter(unsubs),
  ].join("\n");
  return { subject, html, text };
}

export function confirmSubscriptionEmail(input: { locale: Locale; workspaceName: string; confirmUrl: string }): Rendered {
  const { locale, workspaceName, confirmUrl } = input;
  return {
    subject: m.email_confirm_subject({ workspace: oneLine(workspaceName, 60) }, { locale }),
    html: emailLayout(`
      <h1 style="${TEXT} font-size: 20px; font-weight: 700; color: #111; margin: 0 0 12px;">${m.email_confirm_title({}, { locale })}</h1>
      <p style="${TEXT} font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 4px;">${m.email_confirm_body({ workspace: escapeHtml(workspaceName) }, { locale })}</p>
      ${emailButton(confirmUrl, m.email_confirm_button({}, { locale }))}
      <p style="${TEXT} font-size: 13px; color: #999; line-height: 1.6; margin: 0;">${m.email_confirm_ignore({}, { locale })}</p>
    `, locale, "", escapeHtml(workspaceName)),
    text: `${m.email_confirm_subject({ workspace: workspaceName }, { locale })}\n\n${m.email_confirm_text_link({ url: confirmUrl }, { locale })}\n\n${m.email_confirm_text_note({}, { locale })}`,
  };
}
