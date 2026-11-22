import { z } from 'zod';
import { request } from './client';

export const subsidyClaimSchema = z.object({
  id: z.number().int(),
  installationId: z.number().int(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string(),
  propertyAddress: z.string(),
  propertyCity: z.string(),
  propertyState: z.string(),
  systemCapacityKw: z.number(),
  systemType: z.string(),
  subsidyAmountRupees: z.number(),
  applicationReference: z.string(),
  status: z.string(),
  submittedAt: z.string(),
  clearedAt: z.string().nullable().optional(),
  disbursedAt: z.string().nullable().optional(),
  disbursementReference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type SubsidyClaim = z.infer<typeof subsidyClaimSchema>;

export const jobUnitEconomicsSchema = z.object({
  installationId: z.number().int(),
  customerName: z.string(),
  propertyCity: z.string(),
  propertyState: z.string(),
  systemCapacityKw: z.number(),
  systemType: z.string(),
  stage: z.string(),
  quoteStatus: z.string(),
  paymentStatus: z.string(),
  totalQuotedAmountRupees: z.number(),
  estimatedSubsidyRupees: z.number(),
  revenueCollectedRupees: z.number(),
  accountsReceivableRupees: z.number(),
  bomEquipmentCostRupees: z.number(),
  technicianLaborCostRupees: z.number(),
  technicianHours: z.number(),
  postSalesRepairCostRupees: z.number(),
  netProfitRupees: z.number(),
  netMarginPercentage: z.number(),
  isProfitable: z.boolean(),
  costOverrunReasons: z.array(z.string()),
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
  testedGenerationKw: z.number().nullable().optional(),
});

export type JobUnitEconomics = z.infer<typeof jobUnitEconomicsSchema>;

export const technicianPayrollSchema = z.object({
  technicianId: z.number().int(),
  technicianName: z.string(),
  email: z.string(),
  surveysCompleted: z.number().int(),
  installationsCompleted: z.number().int(),
  serviceTicketsResolved: z.number().int(),
  totalLoggedHours: z.number(),
  totalPayRupees: z.number(),
});

export type TechnicianPayroll = z.infer<typeof technicianPayrollSchema>;

export const directorOverviewSchema = z.object({
  period: z.string(),
  generatedAt: z.string(),
  summary: z.object({
    cashCollectedRupees: z.number(),
    accountsReceivableRupees: z.number(),
    totalBOMEquipmentCostRupees: z.number(),
    totalTechnicianLaborCostRupees: z.number(),
    totalPostSalesRepairCostRupees: z.number(),
    netProfitRupees: z.number(),
    netMarginPercentage: z.number(),
    totalSubsidyDisbursedRupees: z.number(),
    totalSubsidyPendingRupees: z.number(),
    totalJobsCount: z.number().int(),
    profitableJobsCount: z.number().int(),
    lossMakingJobsCount: z.number().int(),
  }),
  jobEconomics: z.array(jobUnitEconomicsSchema),
  subsidyPipeline: z.object({
    totalClaims: z.number().int(),
    totalClaimedAmountRupees: z.number(),
    documentsSubmittedCount: z.number().int(),
    documentsSubmittedAmountRupees: z.number(),
    inspectionClearedCount: z.number().int(),
    inspectionClearedAmountRupees: z.number(),
    disbursedCount: z.number().int(),
    disbursedAmountRupees: z.number(),
    rejectedCount: z.number().int(),
    recentClaims: z.array(subsidyClaimSchema),
  }),
  operationsBacklog: z.object({
    pendingSurveysCount: z.number().int(),
    packingQueueCount: z.number().int(),
    scheduledRoofInstallsCount: z.number().int(),
    openWarrantyTicketsCount: z.number().int(),
    totalBacklogCount: z.number().int(),
  }),
  crewPayroll: z.object({
    hourlyRateRupees: z.number(),
    totalLoggedHours: z.number(),
    totalPayrollRupees: z.number(),
    technicians: z.array(technicianPayrollSchema),
  }),
});

export type DirectorOverview = z.infer<typeof directorOverviewSchema>;

export const DIRECTOR_OVERVIEW_KEY = (period: string) => ['director-overview', period] as const;
export const SUBSIDIES_KEY = (status?: string) => ['subsidies', status ?? 'all'] as const;

export const fetchDirectorOverview = (period: string = 'all', signal?: AbortSignal) =>
  request(`/director/overview?period=${encodeURIComponent(period)}`, {
    schema: directorOverviewSchema,
    signal,
  });

export const fetchSubsidyClaims = (status?: string, signal?: AbortSignal) =>
  request(status ? `/subsidies?status=${encodeURIComponent(status)}` : '/subsidies', {
    schema: z.array(subsidyClaimSchema),
    signal,
  });

export const fetchInstallationSubsidy = (installationId: number, signal?: AbortSignal) =>
  request(`/installations/${installationId}/subsidy`, {
    schema: subsidyClaimSchema,
    signal,
  });

export const createOrUpdateSubsidyClaim = (
  installationId: number,
  data: { subsidyAmountRupees?: number; applicationReference: string; notes?: string }
) =>
  request(`/installations/${installationId}/subsidy`, {
    method: 'POST',
    body: JSON.stringify(data),
    schema: subsidyClaimSchema,
  });

export const updateSubsidyStatus = (
  id: number,
  data: { status: string; disbursementReference?: string; notes?: string }
) =>
  request(`/subsidies/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(data),
    schema: subsidyClaimSchema,
  });
