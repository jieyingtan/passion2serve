import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const confirmation = process.argv.find((argument) => argument.startsWith("--confirm="))?.split("=")[1];
if (confirmation !== "clear-test-data") {
  throw new Error("Run with --confirm=clear-test-data to confirm the reset.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase URL and service role key are required.");
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const retainedCoordinatorEmail = "mark@passion2serve.com";
const retainedVolunteerIds = Array.from({ length: 9 }, (_, index) =>
  `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function deleteAll(table) {
  const { error } = await supabase.from(table).delete().not("id", "is", null);
  if (error) throw new Error(`Could not clear ${table}: ${error.message}`);
}

async function listAllAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function listStorageFiles(prefix = "") {
  const { data, error } = await supabase.storage
    .from("certificates-private")
    .list(prefix, { limit: 1000 });
  if (error) throw error;

  const paths = [];
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id) paths.push(path);
    else paths.push(...await listStorageFiles(path));
  }
  return paths;
}

// Remove records that can prevent participant or event deletion first. Event
// deletion cascades through posts, metrics, registrations, attendance and all
// other event-owned data.
await Promise.all([
  deleteAll("audit_logs"),
  deleteAll("notification_deliveries"),
]);
console.log("Cleared logs and generated deliveries.");
await deleteAll("events");
console.log("Cleared events and event-owned records.");

const authUsers = await listAllAuthUsers();
const markUser = authUsers.find((user) => user.email?.toLowerCase() === retainedCoordinatorEmail);
if (!markUser) throw new Error("Mark's coordinator account was not found; reset stopped for safety.");

const retainedIds = `(${retainedVolunteerIds.join(",")})`;
const usersToDelete = authUsers.filter((user) => user.id !== markUser.id);
const [authDeletionResults, profileResult, volunteerResult, certificateFiles] = await Promise.all([
  Promise.all(usersToDelete.map(async (user) => {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Could not delete auth user ${user.id}: ${error.message}`);
  })),
  // Clear profiles that were created without a corresponding Auth account.
  supabase.from("profiles").delete().neq("id", markUser.id),
  // Preserve the approved Excel volunteer directory and remove transient imports.
  supabase.from("volunteers").delete().not("id", "in", retainedIds),
  listStorageFiles(),
]);
void authDeletionResults;
if (profileResult.error) throw new Error(`Could not clear participant profiles: ${profileResult.error.message}`);
if (volunteerResult.error) throw new Error(`Could not clear transient volunteers: ${volunteerResult.error.message}`);
console.log(`Cleared ${usersToDelete.length} non-Mark account(s) and transient volunteer records.`);

for (let index = 0; index < certificateFiles.length; index += 100) {
  const { error } = await supabase.storage
    .from("certificates-private")
    .remove(certificateFiles.slice(index, index + 100));
  if (error) throw new Error(`Could not clear certificate files: ${error.message}`);
}
console.log(`Cleared ${certificateFiles.length} generated certificate file(s).`);

const [
  { count: eventCount, error: eventCountError },
  { count: profileCount, error: profileCountError },
  { count: volunteerCount, error: volunteerCountError },
  { data: markProfile, error: markProfileError },
] = await Promise.all([
  supabase.from("events").select("id", { count: "exact", head: true }),
  supabase.from("profiles").select("id", { count: "exact", head: true }),
  supabase.from("volunteers").select("id", { count: "exact", head: true }),
  supabase.from("profiles").select("email,role").eq("id", markUser.id).maybeSingle(),
]);

const verificationError = eventCountError || profileCountError || volunteerCountError || markProfileError;
if (verificationError) throw verificationError;
if (eventCount !== 0 || profileCount !== 1 || volunteerCount !== 9) {
  throw new Error(`Reset verification failed: events=${eventCount}, profiles=${profileCount}, volunteers=${volunteerCount}.`);
}
if (markProfile?.email !== retainedCoordinatorEmail || markProfile.role !== "coordinator") {
  throw new Error("Mark's retained profile is not a coordinator profile.");
}

const remainingFiles = await listStorageFiles();
if (remainingFiles.length) throw new Error(`${remainingFiles.length} certificate file(s) remain.`);

console.log(`Cleared test data from Supabase project ${projectRef}.`);
console.log(`Retained coordinator: ${retainedCoordinatorEmail}.`);
console.log(`Retained permanent volunteers: ${volunteerCount}.`);
console.log("Events, participant accounts, generated follow-ups, analytics, and certificate files: 0.");
