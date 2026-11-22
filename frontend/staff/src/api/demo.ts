import { z } from 'zod';
import { request } from './client';

export const demoStatusSchema = z.object({
  isEnabled: z.boolean(),
  totalDemoProjects: z.number().int(),
  demoLeadsCount: z.number().int(),
  demoCustomersCount: z.number().int(),
  demoInstallationsCount: z.number().int(),
});

export type DemoStatus = z.infer<typeof demoStatusSchema>;

export const DEMO_STATUS_KEY = ['demo-status'] as const;

export const fetchDemoStatus = (signal?: AbortSignal) =>
  request('/demo/status', {
    schema: demoStatusSchema,
    signal,
  });

export const enableDemoMode = () =>
  request('/demo/enable', {
    method: 'POST',
    schema: demoStatusSchema,
  });

export const disableDemoMode = () =>
  request('/demo/disable', {
    method: 'POST',
    schema: demoStatusSchema,
  });
