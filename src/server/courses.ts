import { createClient } from "@/lib/supabase/server";

export interface CourseOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  eventType: string;
}

export async function getCourseOptions(): Promise<CourseOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("id,code,name,description,event_type").eq("active", true).order("display_order");
  return (data ?? []).map((course) => ({ id: course.id, code: course.code, name: course.name, description: course.description, eventType: course.event_type }));
}
