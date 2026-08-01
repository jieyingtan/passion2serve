export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isQrConfigured() {
  return Boolean(
    isSupabaseConfigured() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.QR_SIGNING_SECRET,
  );
}

export function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}
