import { z } from 'zod';
import { request } from './client';
import { addressSchema } from './leads';
import { INSTALLATION_STATUSES } from './customers';
import { usersPageSchema, type User } from './users';

export const SURVEY_STATUSES = ['Scheduled', 'Submitted', 'Approved', 'Rejected'] as const;
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];

export const surveySchema = z.object({
  id: z.number().int(), installationId: z.number().int(), customerId: z.number().int(),
  customerName: z.string(), customerPhone: z.string(), address: addressSchema,
  technicianId: z.number().int(), technicianName: z.string(), status: z.enum(SURVEY_STATUSES),
  scheduledAt: z.iso.datetime(), createdAt: z.iso.datetime(), createdById: z.number().int(),
  shadowFreeRoofAreaSquareMetres: z.number().nullable(), monthlyBillRupees: z.number().nullable(),
  gridSuitable: z.boolean().nullable(), roofDirectionDegrees: z.number().nullable(),
  roofTiltDegrees: z.number().nullable(), cableDistanceMetres: z.number().nullable(), notes: z.string().nullable(),
  submittedById: z.number().int().nullable(), submittedAt: z.iso.datetime().nullable(),
  reviewedById: z.number().int().nullable(), reviewedAt: z.iso.datetime().nullable(),
  reviewNotes: z.string().nullable(), version: z.number().int(),
});
export type Survey = z.infer<typeof surveySchema>;
export const surveyPageSchema = z.object({ items: z.array(surveySchema), page: z.number().int(), pageSize: z.number().int(), totalCount: z.number().int() });
export type SurveyPage = z.infer<typeof surveyPageSchema>;

export const installationSchema = z.object({
  id: z.number().int(), customerId: z.number().int(), customerName: z.string(), customerPhone: z.string(),
  address: addressSchema, leadId: z.number().int(), status: z.enum(INSTALLATION_STATUSES),
  timeZone: z.string(), createdAt: z.iso.datetime(),
});
export type Installation = z.infer<typeof installationSchema>;

export const SURVEYS_KEY = ['surveys'] as const;
export const INSTALLATIONS_KEY = ['installations'] as const;
export const surveyKey = (id: number) => [...SURVEYS_KEY, 'detail', id] as const;
export const installationKey = (id: number) => ['installation', id] as const;
export const SURVEY_PAGE_SIZE = 20;

export const fetchInstallations = (signal?: AbortSignal) =>
  request('/installations', { schema: z.array(installationSchema), signal });

export function fetchSurveys(options: { page?: number; status?: SurveyStatus; installationId?: number; pageSize?: number }, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(options.page ?? 1), pageSize: String(options.pageSize ?? SURVEY_PAGE_SIZE) });
  if (options.status) query.set('status', options.status);
  if (options.installationId) query.set('installationId', String(options.installationId));
  return request(`/surveys?${query}`, { schema: surveyPageSchema, signal });
}

export const fetchSurvey = (id: number, signal?: AbortSignal) => request(`/surveys/${id}`, { schema: surveySchema, signal });
export const fetchInstallation = (id: number, signal?: AbortSignal) => request(`/installations/${id}`, { schema: installationSchema, signal });

/** Fetch every account page: an active technician must not disappear from the selector on larger teams. */
export async function fetchTechnicians(signal?: AbortSignal): Promise<User[]> {
  const first = await request('/users?page=1&pageSize=100', { schema: usersPageSchema, signal });
  const pages = Math.ceil(first.totalCount / first.pageSize);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
    request(`/users?page=${i + 2}&pageSize=100`, { schema: usersPageSchema, signal })));
  return [first, ...rest].flatMap(page => page.items).filter(user => user.role === 'Technician' && user.isActive);
}

export type Schedule = { technicianId: number; scheduledAt: string };
export const scheduleSurvey = (installationId: number, body: Schedule) =>
  request(`/installations/${installationId}/surveys`, { method: 'POST', body, schema: surveySchema });
export const rescheduleSurvey = (id: number, body: Schedule) =>
  request(`/surveys/${id}/schedule`, { method: 'PUT', body, schema: surveySchema });
export type Report = { shadowFreeRoofAreaSquareMetres: number; monthlyBillRupees: number; gridSuitable: boolean; roofDirectionDegrees: number; roofTiltDegrees: number; cableDistanceMetres: number; notes: string | null };
export const submitReport = (id: number, body: Report) => request(`/surveys/${id}/report`, { method: 'PUT', body, schema: surveySchema });
export const reviewSurvey = (id: number, approved: boolean, notes: string | null) =>
  request(`/surveys/${id}/review`, { method: 'POST', body: { approved, notes }, schema: surveySchema });
