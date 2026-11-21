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

public record CustomerPortalData(
    CustomerQuoteSummary? ActiveQuote,
    IReadOnlyList<CustomerQuoteSummary> Quotes,
    IReadOnlyList<CustomerInstallationSummary> Installations);
