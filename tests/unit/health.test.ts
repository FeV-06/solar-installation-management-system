import { describe, expect, it, vi } from "vitest";
import { checkHealth } from "@/server/health";

describe("checkHealth", () => {
  it("returns status ok and database connected when the database query succeeds", async () => {
    const probe = vi.fn().mockResolvedValue([{ 1: 1 }]);

    const result = await checkHealth(probe);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "ok",
      database: "connected",
    });
  });

  it("returns status error and database unavailable when the database query throws an error", async () => {
    const probe = vi.fn().mockRejectedValue(new Error("SQLITE_BUSY: database is locked"));

    const result = await checkHealth(probe);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "error",
      database: "unavailable",
    });
  });

  it("handles non-Error rejection values gracefully without crashing", async () => {
    const probe = vi.fn().mockRejectedValue("network timeout");

    const result = await checkHealth(probe);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "error",
      database: "unavailable",
    });
  });
});
