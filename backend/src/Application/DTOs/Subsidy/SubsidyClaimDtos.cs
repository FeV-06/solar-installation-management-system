namespace Application.DTOs.Subsidy;

public record SubsidyClaimDto(
    int Id,
    int InstallationId,
    string CustomerName,
    string CustomerPhone,
    string CustomerEmail,
    string PropertyAddress,
    string PropertyCity,
    string PropertyState,
    decimal SystemCapacityKw,
    string SystemType,
    decimal SubsidyAmountRupees,
    string ApplicationReference,
    string Status,
    DateTime SubmittedAt,
    DateTime? ClearedAt,
    DateTime? DisbursedAt,
    string? DisbursementReference,
    string? Notes
);

public record CreateSubsidyClaimRequest(
    decimal? SubsidyAmountRupees,
    string ApplicationReference,
    string? Notes
);

public record UpdateSubsidyStatusRequest(
    string Status,
    string? DisbursementReference,
    string? Notes
);
