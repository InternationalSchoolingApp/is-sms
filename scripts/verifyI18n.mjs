#!/usr/bin/env node
/**
 * Student dashboard translations check (docs/i18n.md). Fails (exit 1) when:
 *   1. a namespace JSON exists in one language but not another, or is missing from messages/<locale>/index.js;
 *   2. a key exists in English but not in another language (or the other way round);
 *   3. a message is not valid ICU, or uses different {placeholders} / <tags> than its English original;
 *   4. source code calls t("key") on a useTranslations("ns") / getTranslations("ns") translator and ns.key
 *      does not exist in English (literal keys only; t(variable) cannot be checked statically).
 * Usage: npm run verify:i18n
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, TYPE } from "@formatjs/icu-messageformat-parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MESSAGES = path.join(root, "messages");
const LOCALES = ["en", "fr", "pt", "zh", "es"];
const SOURCE_DIRS = ["app", "components", "hooks", "utils", "constant", "i18n", "services"];
const errors = [];
const err = (msg) => errors.push(msg);

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    err(`${path.relative(root, file)}: invalid JSON (${e.message})`);
    return {};
  }
};

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (k.includes(".")) err(`key "${key}" contains a dot (next-intl uses dots as separators)`);
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

// Argument names and tag names a message uses (plural/select branches included).
function signature(ast, acc = new Set()) {
  for (const el of ast) {
    if (el.type === TYPE.argument || el.type === TYPE.number || el.type === TYPE.date || el.type === TYPE.time) acc.add(`{${el.value}}`);
    if (el.type === TYPE.plural || el.type === TYPE.select) {
      acc.add(`{${el.value}}`);
      for (const opt of Object.values(el.options)) signature(opt.value, acc);
    }
    if (el.type === TYPE.tag) {
      acc.add(`<${el.value}>`);
      signature(el.children, acc);
    }
  }
  return acc;
}

function parseMessage(id, text) {
  if (typeof text !== "string") {
    err(`${id}: value is not a string`);
    return null;
  }
  try {
    return signature(parse(text));
  } catch (e) {
    err(`${id}: invalid ICU message (${e.message})`);
    return null;
  }
}

// 1-3: files, keys, ICU.
const namespaces = fs.readdirSync(path.join(MESSAGES, "en")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
const english = {};
for (const locale of LOCALES) {
  const dir = path.join(MESSAGES, locale);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
  const index = fs.readFileSync(path.join(dir, "index.js"), "utf8");
  for (const ns of namespaces) if (!files.includes(ns)) err(`messages/${locale}/${ns}.json is missing`);
  for (const ns of files) {
    if (!namespaces.includes(ns)) err(`messages/${locale}/${ns}.json has no English counterpart`);
    if (!new RegExp(`from "\\./${ns}\\.json"`).test(index)) err(`messages/${locale}/index.js does not import ${ns}.json`);
  }
}
for (const ns of namespaces) english[ns] = flatten(readJson(path.join(MESSAGES, "en", `${ns}.json`)));
for (const ns of namespaces) {
  const enFlat = english[ns];
  const enSigs = {};
  for (const [key, text] of Object.entries(enFlat)) enSigs[key] = parseMessage(`en ${ns}.${key}`, text);
  for (const locale of LOCALES.slice(1)) {
    const file = path.join(MESSAGES, locale, `${ns}.json`);
    if (!fs.existsSync(file)) continue;
    const flat = flatten(readJson(file));
    for (const key of Object.keys(enFlat)) if (!(key in flat)) err(`${locale} ${ns}.${key}: missing translation`);
    for (const [key, text] of Object.entries(flat)) {
      if (!(key in enFlat)) {
        err(`${locale} ${ns}.${key}: not in English`);
        continue;
      }
      const sig = parseMessage(`${locale} ${ns}.${key}`, text);
      const enSig = enSigs[key];
      if (sig && enSig) {
        const a = [...enSig].sort().join(" ");
        const b = [...sig].sort().join(" ");
        if (a !== b) err(`${locale} ${ns}.${key}: placeholders/tags differ from English (en: ${a || "none"} | ${locale}: ${b || "none"})`);
      }
    }
  }
}

// 4: literal keys used in source.
function sourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, out);
    else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}
const exists = (fullKey) => {
  const [ns, ...rest] = fullKey.split(".");
  const flat = english[ns];
  if (!flat) return false;
  const key = rest.join(".");
  if (key in flat) return true;
  // A namespace-level object (t("group") is invalid, but t.raw("group") / nested translators may point at one).
  return Object.keys(flat).some((k) => k.startsWith(`${key}.`));
};
let checkedCalls = 0;
for (const file of SOURCE_DIRS.flatMap((d) => sourceFiles(path.join(root, d)))) {
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).split(path.sep).join("/");
  // One file can hold several components that each bind the same variable name (usually `t`) to a different
  // namespace; without scope analysis a literal key is accepted when it exists in any namespace bound to that name.
  const bindings = new Map();
  for (const [, name, ns] of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:["'`]([\w.]+)["'`])?\s*\)/g)) {
    if (!bindings.has(name)) bindings.set(name, new Set());
    bindings.get(name).add(ns || "");
  }
  // Every namespace any translator in this file is bound to. A helper like `joinDays(keys, t, locale)` receives a
  // translator as a parameter named `t`, so its `t("key")` calls cannot be tied to a top-level binding statically;
  // a name used as a function parameter is checked against all of the file's namespaces instead of flagged.
  const fileNamespaces = new Set([...bindings.values()].flatMap((s) => [...s]));
  const paramNames = new Set();
  for (const m of src.matchAll(/(?:function\s*\w*\s*|=>\s*|\(\s*)\(([^)]*)\)/g)) {
    for (const p of m[1].split(",")) {
      const id = p.trim().replace(/[:=].*$/, "").trim();
      if (/^\w+$/.test(id)) paramNames.add(id);
    }
  }
  for (const [name, spaces] of bindings) {
    const scopes = paramNames.has(name) ? new Set([...spaces, ...fileNamespaces]) : spaces;
    const call = new RegExp(`(?<![\\w.])${name}(?:\\.(?:rich|markup|raw|has))?\\(\\s*["'\`]([\\w.]+)["'\`]`, "g");
    for (const m of src.matchAll(call)) {
      checkedCalls++;
      if (/\.has\(/.test(m[0])) continue;
      const candidates = [...scopes].map((ns) => (ns ? `${ns}.${m[1]}` : m[1]));
      if (!candidates.some(exists)) err(`${rel}: ${name}("${m[1]}") -> "${candidates.join('" / "')}" does not exist in English messages`);
    }
  }
}

if (errors.length) {
  console.error(`i18n check failed with ${errors.length} problem(s):`);
  for (const e of errors.slice(0, 300)) console.error(`  - ${e}`);
  if (errors.length > 300) console.error(`  ... and ${errors.length - 300} more`);
  process.exit(1);
}
const keyCount = Object.values(english).reduce((n, flat) => n + Object.keys(flat).length, 0);
console.log(`i18n OK: ${namespaces.length} namespaces, ${keyCount} English keys x ${LOCALES.length} languages, ${checkedCalls} t() calls checked.`);
