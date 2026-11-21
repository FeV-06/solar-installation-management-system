using Application.DTOs.Quote;

namespace Application.DTOs.CustomerPortal;

public record CustomerQuoteSummary(
    int Id,
    string Status,
    string PropertyAddress,
    string PropertyType,
    string MonthlyBillRange,
    DateTime CreatedAt,
    DateTime? ContactedAt,
    DateTime? ClosedAt,
    string? Notes);

public record CustomerInstallationSummary(
    int Id,
    string Status,
    string TimeZone,
    DateTime CreatedAt);

public record CustomerHandoverProof(
    int InstallationId,
    decimal SystemCapacityKw,
    decimal TestedGenerationKw,
    bool GridConnected,
    string PanelArrayPhotoUrl,
    string InverterPhotoUrl,
    string MeterPhotoUrl,
    string CustomerSignatureData,
    string SignedByName,
    DateTime SignedAt);

public record CustomerPortalData(
    CustomerQuoteSummary? ActiveQuote,
    IReadOnlyList<CustomerQuoteSummary> Quotes,
    IReadOnlyList<CustomerInstallationSummary> Installations,
    QuoteDto? Proposal = null,
    IReadOnlyList<WarrantyDto>? Warranties = null,
    CustomerHandoverProof? HandoverProof = null);
