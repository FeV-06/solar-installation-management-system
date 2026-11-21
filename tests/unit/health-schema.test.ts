import { describe, expect, it } from "vitest";
import { z } from "zod";

// Response contract schemas conforming to docs/CONTRIBUTING_WORKSTREAMS.md
const HealthSuccessSchema = z.object({
  data: z.object({
    status: z.literal("ok"),
    database: z.literal("connected"),
  }),
});

const HealthErrorSchema = z.object({
  error: z.object({
    code: z.literal("DATABASE_UNAVAILABLE"),
    message: z.string().min(1),
  }),
});

const HealthResponseSchema = z.union([HealthSuccessSchema, HealthErrorSchema]);

describe("Health API Response Schema Contract", () => {
  it("validates successful health response envelope", () => {
    const validSuccess = {
      data: {
        status: "ok",
        database: "connected",
      },
    };

    const parsed = HealthResponseSchema.safeParse(validSuccess);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("data" in parsed.data).toBe(true);
      expect((parsed.data as z.infer<typeof HealthSuccessSchema>).data.status).toBe("ok");
    }
  });

  it("validates database unavailable error response envelope", () => {
    const validError = {
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database is unavailable",
      },
    };

    const parsed = HealthResponseSchema.safeParse(validError);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("error" in parsed.data).toBe(true);
      expect((parsed.data as z.infer<typeof HealthErrorSchema>).error.code).toBe(
        "DATABASE_UNAVAILABLE",
      );
    }
  });

  it("rejects response missing both data and error wrappers", () => {
    const rawPayload = {
      status: "ok",
      database: "connected",
    };

    const parsed = HealthResponseSchema.safeParse(rawPayload);
    expect(parsed.success).toBe(false);
  });

  it("rejects unauthorized or arbitrary error codes in health contract", () => {
    const invalidError = {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
    };

    const parsed = HealthResponseSchema.safeParse(invalidError);
    expect(parsed.success).toBe(false);
  });
});
