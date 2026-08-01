import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export interface EventOrganisationOption {
  id: string;
  name: string;
}

const demoOrganisations: EventOrganisationOption[] = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Bright Horizons Senior Activity Centre" },
  { id: "10000000-0000-4000-8000-000000000002", name: "New Hope Family Service Centre" },
  { id: "10000000-0000-4000-8000-000000000003", name: "Migrant Community Learning Hub" },
  { id: "10000000-0000-4000-8000-000000000004", name: "Youth Futures Singapore" },
  { id: "10000000-0000-4000-8000-000000000005", name: "Silver Connections Network" },
];

export async function getEventOrganisations() {
  if (!isSupabaseConfigured()) {
    return demoOrganisations;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beneficiary_organisations")
    .select("id, name")
    .eq("active", true)
    .order("name");

  if (error) {
    return demoOrganisations;
  }

  return data satisfies EventOrganisationOption[];
}
