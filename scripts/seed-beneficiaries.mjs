import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase URL and service role key are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const beneficiaries = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Bright Horizons Senior Activity Centre",
    contact_name: "Grace Lim",
    contact_email: "grace@brighthorizons.example",
    active: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "New Hope Family Service Centre",
    contact_name: "Muhammad Firdaus",
    contact_email: "firdaus@newhope.example",
    active: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "Migrant Community Learning Hub",
    contact_name: "Anita Rao",
    contact_email: "anita@mclh.example",
    active: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    name: "Youth Futures Singapore",
    contact_name: "Jason Ong",
    contact_email: "jason@youthfutures.example",
    active: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    name: "Silver Connections Network",
    contact_name: "Nur Aisyah",
    contact_email: "aisyah@silverconnections.example",
    active: true,
  },
];

const { error } = await supabase.from("beneficiary_organisations").upsert(beneficiaries);

if (error) {
  throw error;
}

console.log(`${beneficiaries.length} mock beneficiary organisations seeded.`);
