import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function readArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

const email = readArgument("email")?.toLowerCase();
const fullName = readArgument("name");
const phone = readArgument("phone")?.replace(/[\s()-]/g, "");
const password = process.env.COORDINATOR_BOOTSTRAP_PASSWORD;

if (!email || !fullName || !phone || !password) {
  console.error(
    "Provide --email, --name, --phone and set COORDINATOR_BOOTSTRAP_PASSWORD in the environment.",
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("The Coordinator password must contain at least 8 characters.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const usersResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersResult.error) {
  throw usersResult.error;
}

const existing = usersResult.data.users.find((user) => user.email?.toLowerCase() === email);
const attributes = {
  email,
  password,
  phone,
  email_confirm: true,
  phone_confirm: true,
  user_metadata: { full_name: fullName },
  app_metadata: { app_role: "coordinator", managed_by: "backend" },
};

const authResult = existing
  ? await supabase.auth.admin.updateUserById(existing.id, attributes)
  : await supabase.auth.admin.createUser(attributes);

if (authResult.error || !authResult.data.user) {
  throw authResult.error || new Error("Coordinator account creation failed.");
}

const profileResult = await supabase.from("profiles").upsert({
  id: authResult.data.user.id,
  role: "coordinator",
  full_name: fullName,
  email,
  phone,
});

if (profileResult.error) {
  console.warn("Auth user saved. Apply the database migrations to create the Coordinator profile.");
} else {
  console.log(existing ? "Coordinator account updated." : "Coordinator account created.");
}

