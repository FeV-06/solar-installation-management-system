import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the db module before importing the route handler
vi.mock("@/server/db", () => {
  return {
    db: {
      get: vi.fn(),
    },
  };
});

// Import route handler and mocked db
import { GET } from "@/app/api/health/route";
import { db } from "@/server/db";

describe("GET /api/health (route integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with ok data envelope when database query succeeds", async () => {
    vi.mocked(db.get).mockReturnValueOnce({ "?column?": 1 });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const json = await response.json();
    expect(json).toEqual({
      data: {
        status: "ok",
        database: "connected",
      },
    });
  });

  it("returns 503 with DATABASE_UNAVAILABLE error envelope when database query fails", async () => {
    vi.mocked(db.get).mockImplementationOnce(() => { throw new Error("Connection refused"); });

    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const json = await response.json();
    expect(json).toEqual({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database is unavailable",
      },
    });
  });
});
