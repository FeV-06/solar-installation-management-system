import { z } from 'zod';
import { request } from './client';

export const quoteItemSchema = z.object({
  id: z.number().int(),
  category: z.string(),
  itemName: z.string(),
  specification: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitCostRupees: z.number(),
  totalCostRupees: z.number(),
});
export type QuoteItem = z.infer<typeof quoteItemSchema>;

export const quoteSchema = z.object({
  id: z.number().int(),
  installationId: z.number().int(),
  systemCapacityKw: z.number(),
  systemType: z.string(),
  basePriceRupees: z.number(),
  estimatedSubsidyRupees: z.number(),
  totalAmountRupees: z.number(),
  advancePercentage: z.number(),
  advanceRequiredRupees: z.number(),
  amountPaidRupees: z.number(),
  status: z.string(),
  paymentStatus: z.string(),
  notes: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
  createdAt: z.string(),
  sentAt: z.string().nullable().optional(),
  acceptedAt: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  items: z.array(quoteItemSchema),
});
export type Quote = z.infer<typeof quoteSchema>;

export const packingOrderItemSchema = z.object({
  id: z.number().int(),
  itemName: z.string(),
  category: z.string(),
  quantity: z.number(),
  unit: z.string(),
  isPacked: z.boolean(),
  requiresSerialNumber: z.boolean(),
  serialNumber: z.string().nullable().optional(),
});
export type PackingOrderItem = z.infer<typeof packingOrderItemSchema>;

export const packingOrderSchema = z.object({
  id: z.number().int(),
  installationId: z.number().int(),
  quoteId: z.number().int(),
  status: z.string(),
  createdAt: z.string(),
  packedAt: z.string().nullable().optional(),
  dispatchedAt: z.string().nullable().optional(),
  items: z.array(packingOrderItemSchema),
});
export type PackingOrder = z.infer<typeof packingOrderSchema>;

export const QUOTE_KEY = (installationId: number) => ['quote', installationId] as const;
export const PACKING_ORDER_KEY = (installationId: number) => ['packing-order', installationId] as const;

export const fetchInstallationQuote = (installationId: number, signal?: AbortSignal) =>
  request(`/installations/${installationId}/quote`, { schema: quoteSchema, signal });

export const generateQuote = (installationId: number, body: { systemCapacityKw?: number; systemType?: string; notes?: string }) =>
  request(`/installations/${installationId}/quote`, { method: 'POST', body, schema: quoteSchema });

export const sendQuote = (quoteId: number) =>
  request(`/quotes/${quoteId}/send`, { method: 'PUT', schema: quoteSchema });

export const fetchPackingOrder = (installationId: number, signal?: AbortSignal) =>
  request(`/installations/${installationId}/packing-order`, { schema: packingOrderSchema, signal });

export const updatePackingItem = (packingOrderId: number, itemId: number, isPacked: boolean, serialNumber?: string | null) =>
  request(`/packing-orders/${packingOrderId}/items/${itemId}`, {
    method: 'PUT',
    body: { isPacked, serialNumber: serialNumber || null },
    schema: packingOrderSchema,
  });
