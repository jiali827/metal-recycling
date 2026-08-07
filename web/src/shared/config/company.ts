import type { Locale } from "@/shared/i18n/types";

/** 寶新建築材料有限公司 · 品牌常量 */
export const COMPANY_NAME_ZH_HANT = "寶新建築材料有限公司";
export const COMPANY_NAME_ZH_HANS = "宝新建筑材料有限公司";
export const COMPANY_NAME_EN = "Bao Xin Construction Materials Ltd.";

export const COMPANY_SHORT_ZH_HANT = "寶新建築材料";
export const COMPANY_SHORT_ZH_HANS = "宝新建筑材料";
export const COMPANY_SHORT_EN = "Bao Xin Construction Materials";

/** 侧栏、打印等按界面语言显示公司名 */
export function getCompanyDisplayName(locale: Locale): string {
  switch (locale) {
    case "zh-Hans":
      return COMPANY_NAME_ZH_HANS;
    case "en":
      return COMPANY_NAME_EN;
    default:
      return COMPANY_NAME_ZH_HANT;
  }
}
