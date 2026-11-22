import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  demoStatusSchema,
  fetchDemoStatus,
  enableDemoMode,
  disableDemoMode,
} from './demo';

const mockDemoStatus = {
  isEnabled: true,
  totalDemoProjects: 400,
  demoLeadsCount: 400,
  demoCustomersCount: 350,
  demoInstallationsCount: 350,
};

describe('demo status schema', () => {
  it('parses valid demo status', () => {
    expect(() => demoStatusSchema.parse(mockDemoStatus)).not.toThrow();
  });
});

describe('demo API calls', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchDemoStatus calls /demo/status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockDemoStatus), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await fetchDemoStatus();
    expect(result).toEqual(mockDemoStatus);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/demo/status',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('enableDemoMode calls POST /demo/enable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockDemoStatus), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await enableDemoMode();
    expect(result).toEqual(mockDemoStatus);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/demo/enable',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('disableDemoMode calls POST /demo/disable', async () => {
    const disabled = { ...mockDemoStatus, isEnabled: false, totalDemoProjects: 0 };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(disabled), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await disableDemoMode();
    expect(result.isEnabled).toBe(false);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/demo/disable',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
