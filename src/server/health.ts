export type HealthResult =
  | { status: "ok"; database: "connected" }
  | { status: "error"; database: "unavailable" };

export async function checkHealth(checkDatabase: () => Promise<unknown>): Promise<HealthResult> {
  try {
    await checkDatabase();
    return { status: "ok", database: "connected" };
  } catch {
    return { status: "error", database: "unavailable" };
  }
}
