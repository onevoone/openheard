// Fails when someone writes readable text in a component instead of a message,
// so the interface stays translatable. The deliberate exceptions are in
// i18n-literals.allow.ts; CONTRIBUTING.md ("Text and translations") says how
// to add one.
//
// The scan parses each file with the TypeScript compiler, so imports, class
// names, comments and `{m.some_key()}` are never mistaken for text. What counts:
//   - JSX text, and string literals shown by `{"..."}`, `{a ? "x" : "y"}`, `{a && "x"}`;
//   - the string attributes a person reads: placeholder, aria-label, title, alt, label, ...;
//   - toast.success/error/info/...("..."), confirm("..."), alert("...");
//   - new Error("...") and new OpError("...") in server and shared code.
// A literal needs a letter in it; a template keeps its fixed text, `${}` is `{}`.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { ALLOWED, NEUTRAL_WORDS } from "./i18n-literals.allow";

type Literal = { file: string; kind: "text" | "attr" | "call" | "error"; text: string };

const ATTRS = new Set(["placeholder", "aria-label", "aria-description", "aria-placeholder", "title", "alt", "label"]);
const TOAST = new Set(["success", "error", "info", "warning", "message", "loading"]);
const ERRORS = new Set(["Error", "OpError"]);
const hasLetters = (s: string) => /\p{L}/u.test(s);

const NEUTRAL = new Set(NEUTRAL_WORDS.map((w) => w.toLowerCase()));
// Only brand names and the like, plus punctuation and digits: "openheard · GDPR".
const onlyNeutral = (text: string) => (text.match(/\p{L}+/gu) ?? []).every((w) => NEUTRAL.has(w.toLowerCase()));

// The string literals an expression can show: "a", `a`, x ? "a" : "b", x && "a", x ?? "a".
function shown(node: ts.Node): ts.Node[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) return [node];
  if (ts.isParenthesizedExpression(node)) return shown(node.expression);
  if (ts.isConditionalExpression(node)) return [...shown(node.whenTrue), ...shown(node.whenFalse)];
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return shown(node.right);
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) return [...shown(node.left), ...shown(node.right)];
  }
  return [];
}

const textOf = (node: ts.Node): string => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join("{}");
  return "";
};

function scanSource(file: string, source: string, opts: { errors: boolean }): Literal[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: Literal[] = [];
  const add = (kind: Literal["kind"], text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (hasLetters(clean)) found.push({ file, kind, text: clean });
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      add("text", node.text);
    } else if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      for (const lit of shown(node.expression)) add("text", textOf(lit));
    } else if (ts.isJsxAttribute(node) && ATTRS.has(node.name.getText(sf)) && node.initializer) {
      if (ts.isStringLiteral(node.initializer)) add("attr", node.initializer.text);
      else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) for (const lit of shown(node.initializer.expression)) add("attr", textOf(lit));
    } else if (ts.isCallExpression(node) && node.arguments[0]) {
      const callee = node.expression;
      const isToast = ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === "toast" && TOAST.has(callee.name.text);
      const isDialog = ts.isIdentifier(callee) && (callee.text === "confirm" || callee.text === "alert");
      if (isToast || isDialog) for (const lit of shown(node.arguments[0])) add("call", textOf(lit));
    } else if (opts.errors && ts.isNewExpression(node) && ts.isIdentifier(node.expression) && ERRORS.has(node.expression.text) && node.arguments?.[0]) {
      for (const lit of shown(node.arguments[0])) add("error", textOf(lit));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

// ---- which files ----

const root = resolve(import.meta.dirname, "../../../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const rel = (path: string) => relative(root, path).split(sep).join("/");
const isTest = (file: string) => /\.test\.tsx?$/.test(file);

// JSX is scanned in every component. Errors are scanned in code that can answer
// a visitor; the REST API, MCP, scripts and generated code answer in English by design.
const MACHINE_DIRS = ["apps/web/src/lib/mcp/", "apps/web/src/routes/api/", "apps/web/src/scripts/", "apps/web/src/routeTree.gen.ts"];
const MACHINE_FILES = new Set(["apps/web/src/lib/api-actions.ts", "apps/web/src/lib/api-auth.ts"]);

function scanAll(): Literal[] {
  const all = [...walk(resolve(root, "apps/web/src")), ...walk(resolve(root, "packages/ui/src")), ...walk(resolve(root, "packages/auth/src"))].map(rel).filter((f) => /\.tsx?$/.test(f) && !isTest(f));
  return all.flatMap((file) => {
    const isJsx = file.endsWith(".tsx");
    const errors = !MACHINE_DIRS.some((d) => file.startsWith(d)) && !MACHINE_FILES.has(file);
    if (!isJsx && !errors) return [];
    // A .ts file has no JSX, but toast calls and errors are still checked.
    return scanSource(file, readFileSync(resolve(root, file), "utf8"), { errors }).filter((l) => (isJsx ? true : l.kind === "error"));
  });
}

const allowed = new Map<string, Set<string>>();
for (const a of ALLOWED) allowed.set(a.file, new Set([...(allowed.get(a.file) ?? []), ...a.texts]));

describe("visitor-readable text", () => {
  const found = scanAll().filter((l) => !onlyNeutral(l.text));

  it("is written as a message, not in code", () => {
    const unexpected = found.filter((l) => !allowed.get(l.file)?.has(l.text));
    expect(
      unexpected.map((l) => `${l.file} [${l.kind}] ${JSON.stringify(l.text)}`),
      [
        "These literals look like text a visitor reads. Put each in packages/i18n/messages/{uk,en}.json and call m.your_key().",
        "If it is deliberately not translated (brand, code sample, example value, machine text), add it to apps/web/src/lib/i18n-literals.allow.ts with a reason.",
      ].join("\n"),
    ).toEqual([]);
  });

  it("has no allowlist entry that no longer matches anything", () => {
    const seen = new Set(found.map((l) => `${l.file}\u0000${l.text}`));
    const stale = ALLOWED.flatMap((a) => a.texts.filter((t) => !seen.has(`${a.file}\u0000${t}`)).map((t) => `${a.file} ${JSON.stringify(t)}`));
    expect(stale, "Remove these from i18n-literals.allow.ts: the text is gone or was moved to a message.").toEqual([]);
  });
});

describe("the scanner", () => {
  const scan = (source: string, errors = true) => scanSource("x.tsx", source, { errors }).map((l) => `${l.kind}:${l.text}`);

  it("finds JSX text, shown literals and the attributes a person reads", () => {
    expect(scan(`const a = <p title="Hello there" placeholder={"Your name"} aria-label={ok ? "Yes" : "No"} alt={\`Photo of \${n}\`}>Save changes {"and close"}</p>;`)).toEqual([
      "attr:Hello there",
      "attr:Your name",
      "attr:Yes",
      "attr:No",
      "attr:Photo of {}",
      "text:Save changes",
      "text:and close",
    ]);
  });

  it("finds toast, confirm and error text, and skips errors in machine code", () => {
    const src = `toast.error("Could not save"); if (confirm("Delete it?")) throw new Error("Nope"); throw new OpError(\`Missing \${x}\`);`;
    expect(scan(src)).toEqual(["call:Could not save", "call:Delete it?", "error:Nope", "error:Missing {}"]);
    expect(scan(src, false)).toEqual(["call:Could not save", "call:Delete it?"]);
  });

  it("ignores messages, class names, ids, symbols and numbers", () => {
    expect(scan(`import x from "some text"; const a = <p className="flex gap-2" id="main-box" aria-label={m.save()}>{m.save()} · {count} / 12 ✓</p>; toast.error(m.failed()); throw new Error(m.err_x());`)).toEqual([]);
  });

  it("treats brand names alone as fine", () => {
    expect(onlyNeutral("openheard · GDPR")).toBe(true);
    expect(onlyNeutral("Sign in to openheard")).toBe(false);
  });
});
