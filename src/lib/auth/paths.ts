export type AppRole = "coordinator" | "participant";

export function roleHome(role: AppRole) {
  return role === "coordinator" ? "/coordinator/dashboard" : "/participant/events";
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}
