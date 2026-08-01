"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Languages } from "lucide-react";

import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { changeLanguage } from "@/app/participant/actions/language";

const LANGUAGES: { code: Lang; native: string }[] = [
  { code: "en", native: "English" },
  { code: "zh", native: "中文" },
  { code: "ms", native: "Bahasa Melayu" },
  { code: "ta", native: "தமிழ்" },
];

export function LocaleSwitch({ currentLang }: { currentLang: Lang }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === currentLang) ?? LANGUAGES[0];

  async function switchTo(lang: Lang) {
    document.cookie = `lang=${lang};path=/;max-age=31536000;SameSite=Lax`;
    setOpen(false);
    await changeLanguage(lang);
    router.refresh();
  }

  return (
    <div className="relative mt-3">
      <button
        aria-expanded={open}
        aria-label="Switch language"
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <Languages className="size-4" />
        <span className="flex-1 text-left">{current.native}</span>
        <svg className={cn("size-3 transition-transform", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-full rounded-xl border bg-background p-1 shadow-lg">
          {LANGUAGES.map((lang) => (
            <button
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                lang.code === currentLang && "bg-primary/10 font-semibold text-primary",
              )}
              key={lang.code}
              onClick={() => switchTo(lang.code)}
              type="button"
            >
              {lang.native}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
