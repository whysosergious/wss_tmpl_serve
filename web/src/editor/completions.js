import { javascriptLanguage } from "./pme/pme.mod.js";

export function globalCompletionSource(context) {
  const before = context.matchBefore(/[\w.]*$/);
  if (!context.explicit && !before) return null;

  const prefix = before.text;
  const parts = prefix.split(".");
  let obj = globalThis;

  // Navigate nested objects
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]];
    if (!obj || typeof obj !== "object") return null;
  }

  const lastPrefix = parts.at(-1) || "";
  const options = Object.keys(obj)
    .filter((k) => k.startsWith(lastPrefix) && !k.startsWith("_"))
    .slice(0, 50)
    .map((k) => ({
      label: k,
      type: parts.length > 1 ? "property" : "variable",
      info: `${k}: ${obj[k]?.constructor?.name ?? typeof obj[k]}`,
    }));

  const from = before.from + prefix.lastIndexOf(".") + 1;
  return options.length ? { from, options, validFor: /^[\w]*$/ } : null;
}

export const globalCompletions = javascriptLanguage.data.of({
  autocomplete: globalCompletionSource,
});
