import { dictionaries, type TranslationDict, type Lang } from "./dictionaries";

export function getTranslations(lang: Lang): TranslationDict {
  return dictionaries[lang];
}

export function formatDate(
  date: Date | string,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  const locales: Record<Lang, string> = {
    en: "en-SG",
    zh: "zh-SG",
    ms: "ms-SG",
    ta: "ta-SG",
  };
  return new Intl.DateTimeFormat(locales[lang], {
    ...options,
    timeZone: "Asia/Singapore",
  }).format(new Date(date));
}

export function formatDateShort(
  date: Date | string,
  lang: Lang,
): { month: string; day: string } {
  const month = new Intl.DateTimeFormat(getLocale(lang), {
    month: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date(date));
  const day = new Intl.DateTimeFormat(getLocale(lang), {
    day: "numeric",
    timeZone: "Asia/Singapore",
  }).format(new Date(date));
  return { month, day };
}

export function getLocale(lang: Lang): string {
  const locales: Record<Lang, string> = {
    en: "en-SG",
    zh: "zh-SG",
    ms: "ms-SG",
    ta: "ta-SG",
  };
  return locales[lang];
}

export function getHtmlLang(lang: Lang): string {
  return lang;
}

export { dictionaries };
export type { TranslationDict, Lang };
