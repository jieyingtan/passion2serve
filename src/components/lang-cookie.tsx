"use client";

import { useEffect } from "react";

export function LangCookie({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.cookie = `lang=${lang};path=/;max-age=31536000;SameSite=Lax`;
  }, [lang]);

  return null;
}
