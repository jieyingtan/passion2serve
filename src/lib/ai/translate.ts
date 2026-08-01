import OpenAI from "openai";

import { createAdminClient } from "@/lib/supabase/admin";

if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const SUPPORTED_LANGUAGES = ["zh", "ms", "ta"] as const;
type TargetLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_NAMES: Record<TargetLanguage, string> = {
  zh: "Chinese (Simplified)",
  ms: "Malay (Bahasa Melayu)",
  ta: "Tamil (தமிழ்)",
};

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

async function translateContent(
  name: string,
  description: string | null,
  venue: string,
  language: TargetLanguage,
) {
  const openai = getOpenAI();
  if (!openai) throw new Error("OPENAI_API_KEY is not configured.");

  const languageName = LANGUAGE_NAMES[language];
  const systemPrompt = `You are a professional translator for a community service platform called Passion2Serve. Translate the following event details from English into ${languageName}. 

IMPORTANT RULES:
1. Preserve all proper nouns, organisation names, and place names in their original form unless a widely accepted translated name exists.
2. Keep the tone warm, inclusive, and community-focused.
3. For the event name, create a natural-sounding translation that would appeal to a ${languageName}-speaking audience.
4. For the description, maintain all key information while adapting the phrasing naturally.
5. For the venue, translate only if the venue name is a generic location (e.g., "Community Hall" → translate); keep specific place names as-is.
6. Return ONLY valid JSON with exactly these keys: name, description, venue. Do not include any other text.`;

  const userContent = JSON.stringify({
    name,
    ...(description ? { description } : {}),
    venue,
  });

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-nano-2026-03-17",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_completion_tokens: 2000,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty response.");

  const parsed = JSON.parse(raw);
  return {
    language,
    name: parsed.name || name,
    description: parsed.description ?? description ?? null,
    venue: parsed.venue || venue,
  };
}

export async function saveEventTranslations(
  eventId: string,
  name: string,
  description: string | null,
  venue: string,
) {
  const admin = createAdminClient();

  const { error: enError } = await admin.from("event_translations").upsert(
    { event_id: eventId, language: "en" as const, name, description, venue },
    { onConflict: "event_id,language" },
  );
  if (enError) console.error("Failed to save English event translation:", enError);

  const openai = getOpenAI();
  if (!openai) return;

  await Promise.all(
    SUPPORTED_LANGUAGES.map(async (language) => {
      try {
        const result = await translateContent(name, description, venue, language);
        const { error } = await admin.from("event_translations").upsert(
          { event_id: eventId, language: result.language, name: result.name, description: result.description, venue: result.venue },
          { onConflict: "event_id,language" },
        );
        if (error) console.error(`Failed to save ${language} translation:`, error);
      } catch (err) {
        console.error(`Translation failed for ${language}:`, err);
      }
    }),
  );
}

export async function updateEventTranslations(
  eventId: string,
  name: string,
  description: string | null,
  venue: string,
) {
  const admin = createAdminClient();

  const { error: enError } = await admin.from("event_translations").upsert(
    { event_id: eventId, language: "en", name, description, venue },
    { onConflict: "event_id,language" },
  );
  if (enError) console.error("Failed to save English event translation:", enError);

  const openai = getOpenAI();
  if (!openai) return;

  await Promise.all(
    SUPPORTED_LANGUAGES.map(async (language) => {
      try {
        const result = await translateContent(name, description, venue, language);
        const { error } = await admin.from("event_translations").upsert(
          { event_id: eventId, language: result.language, name: result.name, description: result.description, venue: result.venue },
          { onConflict: "event_id,language" },
        );
        if (error) console.error(`Failed to update ${language} translation:`, error);
      } catch (err) {
        console.error(`Translation update failed for ${language}:`, err);
      }
    }),
  );
}
