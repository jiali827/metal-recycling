import type { Locale, MessageDict } from "../types";
import zhHant from "./zh-Hant";
import zhHans from "./zh-Hans";
import en from "./en";

export const catalogs: Record<Locale, MessageDict> = {
  "zh-Hant": zhHant,
  "zh-Hans": zhHans,
  en,
};
