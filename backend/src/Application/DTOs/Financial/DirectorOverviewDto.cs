using Application.DTOs.Subsidy;

namespace Application.DTOs.Financial;

public record DirectorOverviewDto(
    string Period,
    DateTime GeneratedAt,
    FinancialSummaryDto Summary,
    IReadOnlyList<JobUnitEconomicsDto> JobEconomics,
    SubsidyPipelineSummaryDto SubsidyPipeline,
    OperationsBacklogDto OperationsBacklog,
    CrewPayrollSummaryDto CrewPayroll
);

public record FinancialSummaryDto(
    decimal CashCollectedRupees,
    decimal AccountsReceivableRupees,
    decimal TotalBOMEquipmentCostRupees,
    decimal TotalTechnicianLaborCostRupees,
    decimal TotalPostSalesRepairCostRupees,
    decimal NetProfitRupees,
    decimal NetMarginPercentage,
    decimal TotalSubsidyDisbursedRupees,
    decimal TotalSubsidyPendingRupees,
    int TotalJobsCount,
    int ProfitableJobsCount,
    int LossMakingJobsCount
);

public record JobUnitEconomicsDto(
    int InstallationId,
    string CustomerName,
    string PropertyCity,
    string PropertyState,
    decimal SystemCapacityKw,
    string SystemType,
    string Stage,
    string QuoteStatus,
    string PaymentStatus,
    decimal TotalQuotedAmountRupees,
    decimal EstimatedSubsidyRupees,
    decimal RevenueCollectedRupees,
    decimal AccountsReceivableRupees,
    decimal BOMEquipmentCostRupees,
    decimal TechnicianLaborCostRupees,
    double TechnicianHours,
    decimal PostSalesRepairCostRupees,
    decimal NetProfitRupees,
    decimal NetMarginPercentage,
    bool IsProfitable,
    IReadOnlyList<string> CostOverrunReasons,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    decimal? TestedGenerationKw
);

public record SubsidyPipelineSummaryDto(
    int TotalClaims,
    decimal TotalClaimedAmountRupees,
    int DocumentsSubmittedCount,
    decimal DocumentsSubmittedAmountRupees,
    int InspectionClearedCount,
    decimal InspectionClearedAmountRupees,
    int DisbursedCount,
    decimal DisbursedAmountRupees,
    int RejectedCount,
    IReadOnlyList<SubsidyClaimDto> RecentClaims
);

public record OperationsBacklogDto(
    int PendingSurveysCount,
    int PackingQueueCount,
    int ScheduledRoofInstallsCount,
    int OpenWarrantyTicketsCount,
    int TotalBacklogCount
);

public record CrewPayrollSummaryDto(
    decimal HourlyRateRupees,
    double TotalLoggedHours,
    decimal TotalPayrollRupees,
    IReadOnlyList<TechnicianPayrollDto> Technicians
);

public record TechnicianPayrollDto(
    int TechnicianId,
    string TechnicianName,
    string Email,
    int SurveysCompleted,
    int InstallationsCompleted,
    int ServiceTicketsResolved,
    double TotalLoggedHours,
    decimal TotalPayRupees
);
