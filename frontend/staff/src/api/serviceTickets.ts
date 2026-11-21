import { z } from 'zod';
import { request } from './client';

export const serviceTicketSchema = z.object({
  id: z.number().int(),
  installationId: z.number().int(),
  customerId: z.number().int(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string(),
  propertyAddress: z.string(),
  assignedTechnicianId: z.number().int().nullable().optional(),
  assignedTechnicianName: z.string().nullable().optional(),
  serialNumber: z.string(),
  hardwareItem: z.string(),
  category: z.string(),
  faultCode: z.string(),
  description: z.string(),
  photoUrl: z.string().nullable().optional(),
  damageType: z.string(),
  isWarrantyCovered: z.boolean(),
  partsCostRupees: z.number(),
  laborCostRupees: z.number(),
  totalBilledRupees: z.number(),
  status: z.string(),
  adminNotes: z.string().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
  customerApprovedAt: z.string().nullable().optional(),
  replacementPackingOrderId: z.number().int().nullable().optional(),
  replacementSerialNumber: z.string().nullable().optional(),
  technicianResolutionNotes: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  customerSignatureData: z.string().nullable().optional(),
  technicianSignedAt: z.string().nullable().optional(),
  customerConfirmedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type ServiceTicket = z.infer<typeof serviceTicketSchema>;

export const TICKETS_KEY = (status?: string) => ['service-tickets', status ?? 'all'] as const;
export const TICKET_KEY = (id: number) => ['service-ticket', id] as const;

export const fetchServiceTickets = (status?: string, signal?: AbortSignal) =>
  request(status ? `/service-tickets?status=${encodeURIComponent(status)}` : '/service-tickets', {
    schema: z.array(serviceTicketSchema),
    signal,
  });

export const fetchServiceTicket = (id: number, signal?: AbortSignal) =>
  request(`/service-tickets/${id}`, {
    schema: serviceTicketSchema,
    signal,
  });

export const reviewServiceTicket = (
  id: number,
  body: {
    damageType: string;
    isWarrantyCovered: boolean;
    partsCostRupees: number;
    laborCostRupees: number;
    adminNotes?: string;
    assignTechnicianId?: number;
  }
) =>
  request(`/service-tickets/${id}/review`, {
    method: 'PUT',
    body,
    schema: serviceTicketSchema,
  });

export const resolveServiceTicket = (
  id: number,
  body: {
    replacementSerialNumber: string;
    resolutionNotes: string;
    customerSignatureData: string;
  }
) =>
  request(`/service-tickets/${id}/resolve`, {
    method: 'POST',
    body,
    schema: serviceTicketSchema,
  });
