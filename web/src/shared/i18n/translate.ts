import { catalogs } from "./messages";
import type { Locale, MessageKey } from "./types";

type Vars = Record<string, string | number>;

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const [ns, field] = key.split(".") as [keyof typeof catalogs[Locale], string];
  const section = catalogs[locale][ns] as Record<string, string>;
  let text = section?.[field] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
