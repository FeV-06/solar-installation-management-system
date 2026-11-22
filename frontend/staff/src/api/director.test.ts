import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  directorOverviewSchema,
  subsidyClaimSchema,
  fetchDirectorOverview,
  fetchSubsidyClaims,
  updateSubsidyStatus,
} from './director';

const mockClaim = {
  id: 1,
  installationId: 42,
  customerName: 'Aarav Sharma',
  customerPhone: '+919876543210',
  customerEmail: 'aarav@example.com',
  propertyAddress: '12 Malviya Nagar',
  propertyCity: 'Jaipur',
  propertyState: 'Rajasthan',
  systemCapacityKw: 3.3,
  systemType: 'OnGrid',
  subsidyAmountRupees: 78000,
  applicationReference: 'PM-SG-2026-DEL-00918',
  status: 'DocumentsSubmitted',
  submittedAt: '2026-11-22T08:30:00Z',
  clearedAt: null,
  disbursedAt: null,
  disbursementReference: null,
  notes: 'Documents submitted on national portal',
};

const mockOverview = {
  period: 'all',
  generatedAt: '2026-11-22T10:00:00Z',
  summary: {
    cashCollectedRupees: 234000,
    accountsReceivableRupees: 936000,
    totalBOMEquipmentCostRupees: 680000,
    totalTechnicianLaborCostRupees: 24500,
    totalPostSalesRepairCostRupees: 0,
    netProfitRupees: -470500,
    netMarginPercentage: -40.2,
    totalSubsidyDisbursedRupees: 78000,
    totalSubsidyPendingRupees: 234000,
    totalJobsCount: 5,
    profitableJobsCount: 2,
    lossMakingJobsCount: 3,
  },
  jobEconomics: [
    {
      installationId: 42,
      customerName: 'Aarav Sharma',
      propertyCity: 'Jaipur',
      propertyState: 'Rajasthan',
      systemCapacityKw: 3.3,
      systemType: 'OnGrid',
      stage: 'Installation',
      quoteStatus: 'Accepted',
      paymentStatus: 'AdvancePaid',
      totalQuotedAmountRupees: 117000,
      estimatedSubsidyRupees: 78000,
      revenueCollectedRupees: 23400,
      accountsReceivableRupees: 93600,
      bomEquipmentCostRupees: 98000,
      technicianLaborCostRupees: 3500,
      technicianHours: 7.0,
      postSalesRepairCostRupees: 0,
      netProfitRupees: -78100,
      netMarginPercentage: -66.8,
      isProfitable: false,
      costOverrunReasons: ['Uncollected balance (₹93,600 pending from customer)'],
      createdAt: '2026-11-21T09:00:00Z',
      completedAt: null,
      testedGenerationKw: null,
    },
  ],
  subsidyPipeline: {
    totalClaims: 1,
    totalClaimedAmountRupees: 78000,
    documentsSubmittedCount: 1,
    documentsSubmittedAmountRupees: 78000,
    inspectionClearedCount: 0,
    inspectionClearedAmountRupees: 0,
    disbursedCount: 0,
    disbursedAmountRupees: 0,
    rejectedCount: 0,
    recentClaims: [mockClaim],
  },
  operationsBacklog: {
    pendingSurveysCount: 2,
    packingQueueCount: 1,
    scheduledRoofInstallsCount: 3,
    openWarrantyTicketsCount: 1,
    totalBacklogCount: 7,
  },
  crewPayroll: {
    hourlyRateRupees: 500,
    totalLoggedHours: 49.0,
    totalPayrollRupees: 24500,
    technicians: [
      {
        technicianId: 3,
        technicianName: 'Jamal Ortiz',
        email: 'jamal.ortiz@sol.test',
        surveysCompleted: 4,
        installationsCompleted: 2,
        serviceTicketsResolved: 1,
        totalLoggedHours: 21.5,
        totalPayRupees: 10750,
      },
    ],
  },
};

describe('director schemas', () => {
  it('parses valid subsidy claim', () => {
    expect(() => subsidyClaimSchema.parse(mockClaim)).not.toThrow();
  });

  it('parses valid director overview', () => {
    expect(() => directorOverviewSchema.parse(mockOverview)).not.toThrow();
  });
});

describe('director API calls', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchDirectorOverview requests /director/overview', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockOverview), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await fetchDirectorOverview('month');
    expect(result).toEqual(mockOverview);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/director/overview?period=month',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('fetchSubsidyClaims requests /subsidies', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([mockClaim]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await fetchSubsidyClaims('DocumentsSubmitted');
    expect(result).toEqual([mockClaim]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/subsidies?status=DocumentsSubmitted',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('updateSubsidyStatus sends PUT to /subsidies/:id/status', async () => {
    const updated = { ...mockClaim, status: 'InspectionCleared', clearedAt: '2026-11-22T11:00:00Z' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await updateSubsidyStatus(1, { status: 'InspectionCleared' });
    expect(result.status).toBe('InspectionCleared');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/subsidies/1/status',
      expect.objectContaining({ method: 'PUT' })
    );
  });
});
