import { menuItems } from "@/shared/config/menu";
import { translate } from "@/shared/i18n/translate";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALES,
  type Locale,
  type MessageKey,
} from "@/shared/i18n/types";
import type { Metadata } from "next";

/** 非菜单主路由的页签标题 */
const EXTRA_ROUTE_TITLES: Record<string, MessageKey> = {
  "/customers/categories": "customers.manageCategories",
  "/login": "login.title",
  "/register": "register.title",
  "/settings/profile": "settings.profileTitle",
  "/settings/password": "settings.passwordTitle",
  "/receivables": "menu.receivables",
  "/payables": "menu.receivables",
  "/settlement-docs": "menu.settlementDocs",
};

export function titleKeyForPath(pathname: string): MessageKey {
  if (EXTRA_ROUTE_TITLES[pathname]) {
    return EXTRA_ROUTE_TITLES[pathname];
  }

  const exact = menuItems.find((item) => item.href === pathname);
  if (exact) return exact.labelKey;

  const nested = menuItems
    .filter((item) => pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (nested) return nested.labelKey;

  if (pathname === "/") return "menu.dashboard";
  return "app.name";
}

export function buildDocumentTitle(locale: Locale, pathname: string): string {
  const pageTitle = translate(locale, titleKeyForPath(pathname));
  const appName = translate(locale, "app.name");
  return `${pageTitle} · ${appName}`;
}

/** 服务端路由 layout 用的 metadata（默认繁体，客户端会按语言再同步） */
export function pageMetadata(titleKey: MessageKey): Metadata {
  return { title: translate(DEFAULT_LOCALE, titleKey) };
}

function collectTitleKeys(): MessageKey[] {
  const keys = new Set<MessageKey>(["app.name"]);
  for (const item of menuItems) keys.add(item.labelKey);
  for (const key of Object.values(EXTRA_ROUTE_TITLES)) keys.add(key);
  return [...keys];
}

/** 首屏同步设置页签标题，避免刷新后仅显示系统名 */
export function buildDocumentTitleBootScript(): string {
  const pathToKey: Record<string, MessageKey> = {
    ...Object.fromEntries(menuItems.map((item) => [item.href, item.labelKey])),
    ...EXTRA_ROUTE_TITLES,
    "/": "menu.dashboard",
  };

  const titleKeys = collectTitleKeys();
  const labels: Record<Locale, Record<string, string>> = {
    "zh-Hant": {},
    "zh-Hans": {},
    en: {},
  };

  for (const locale of LOCALES) {
    for (const key of titleKeys) {
      labels[locale][key] = translate(locale, key);
    }
  }

  return `(function(){
  var LOCALE_KEY="${LOCALE_STORAGE_KEY}";
  var DEF="${DEFAULT_LOCALE}";
  var PATH_TO_KEY=${JSON.stringify(pathToKey)};
  var LABELS=${JSON.stringify(labels)};
  function keyForPath(path){
    if(PATH_TO_KEY[path]) return PATH_TO_KEY[path];
    var nested=Object.keys(PATH_TO_KEY)
      .filter(function(h){ return path.indexOf(h+"/")===0; })
      .sort(function(a,b){ return b.length-a.length; })[0];
    if(nested) return PATH_TO_KEY[nested];
    if(path==="/") return "menu.dashboard";
    return "app.name";
  }
  var locale=DEF;
  try{
    var stored=localStorage.getItem(LOCALE_KEY);
    if(stored&&LABELS[stored]) locale=stored;
  }catch(e){}
  var dict=LABELS[locale]||LABELS[DEF];
  var pageKey=keyForPath(location.pathname);
  var appName=dict["app.name"]||"";
  var pageTitle=dict[pageKey]||appName;
  document.title=pageTitle+" · "+appName;
})();`;
}

/** 首屏同步 html lang，与字体栈、页签标题一致 */
export function buildLocaleBootScript(): string {
  return `(function(){
  var LOCALE_KEY="${LOCALE_STORAGE_KEY}";
  var DEF="${DEFAULT_LOCALE}";
  var LOCALES=${JSON.stringify(LOCALES)};
  var locale=DEF;
  try{
    var stored=localStorage.getItem(LOCALE_KEY);
    if(stored&&LOCALES.indexOf(stored)!==-1) locale=stored;
  }catch(e){}
  document.documentElement.lang=locale;
})();`;
}

export function rootDocumentTitleMetadata(): Metadata["title"] {
  const appName = translate(DEFAULT_LOCALE, "app.name");
  return {
    default: appName,
    template: `%s · ${appName}`,
  };
}
