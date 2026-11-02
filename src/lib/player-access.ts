// Existing immutable account IDs keep printed links stable without a schema change.
export const accountQrRoles = ["ORGANIZER", "PARTICIPANT", "FACILITATOR"] as ("ORGANIZER" | "PARTICIPANT" | "FACILITATOR")[];

export function playerAccessPath(id: string) {
  return `/players/${encodeURIComponent(id)}`;
}

export function validPlayerCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(value);
}
