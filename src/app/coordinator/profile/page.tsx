import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function CoordinatorProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name,email,phone,role").eq("id", user.id).maybeSingle();
  if (!profile) return null;
  return <div className="mx-auto max-w-3xl space-y-8"><div><Badge variant="success"><ShieldCheck className="mr-1 size-3.5"/>Coordinator account</Badge><h1 className="mt-4 text-3xl font-bold">My profile</h1><p className="mt-2 text-muted-foreground">Your coordinator identity and contact details.</p></div><Card className="border-0"><CardHeader><div className="grid size-14 place-items-center rounded-full bg-secondary text-secondary-foreground"><UserRound className="size-6"/></div><CardTitle className="mt-3">{profile.full_name}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-3 rounded-xl bg-muted p-4"><Mail className="size-5 text-primary"/><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p><p className="font-medium">{profile.email}</p></div></div><div className="flex items-center gap-3 rounded-xl bg-muted p-4"><Phone className="size-5 text-primary"/><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</p><p className="font-medium">{profile.phone || "Not provided"}</p></div></div></CardContent></Card></div>;
}
