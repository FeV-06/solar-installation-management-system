namespace Application.DTOs.Quote;

public record QuoteItemDto(
    int Id,
    string Category,
    string ItemName,
    string Specification,
    decimal Quantity,
    string Unit,
    decimal UnitCostRupees,
    decimal TotalCostRupees);

public record QuoteDto(
    int Id,
    int InstallationId,
    decimal SystemCapacityKw,
    string SystemType,
    decimal BasePriceRupees,
    decimal EstimatedSubsidyRupees,
    decimal TotalAmountRupees,
    decimal AdvancePercentage,
    decimal AdvanceRequiredRupees,
    decimal AmountPaidRupees,
    string Status,
    string PaymentStatus,
    string? Notes,
    string? PaymentReference,
    string? ReceiptPhotoUrl,
    DateTime CreatedAt,
    DateTime? SentAt,
    DateTime? AcceptedAt,
    DateTime? PaidAt,
    IReadOnlyList<QuoteItemDto> Items);

public record GenerateQuoteRequest(
    decimal? SystemCapacityKw,
    string? SystemType,
    string? Notes);

public record CustomerPayQuoteRequest(
    string PaymentType,
    string? ReceiptPhotoUrl = null); // "Advance" or "Full"

public record PackingOrderItemDto(
    int Id,
    string ItemName,
    string Category,
    decimal Quantity,
    string Unit,
    bool IsPacked,
    bool RequiresSerialNumber,
    string? SerialNumber);

public record PackingOrderDto(
    int Id,
    int InstallationId,
    int QuoteId,
    string Status,
    DateTime CreatedAt,
    DateTime? PackedAt,
    DateTime? DispatchedAt,
    DateTime? DeliveredAt,
    IReadOnlyList<PackingOrderItemDto> Items);

public record WarrantyDto(
    int Id,
    int InstallationId,
    int CustomerId,
    string CustomerName,
    string ItemName,
    string Category,
    string SerialNumber,
    int WarrantyYears,
    DateTime StartDate,
    DateTime ExpiryDate,
    string Status,
    bool IsCovered,
    int RemainingDays);

public record WarrantyLookupResultDto(
    string Query,
    bool Found,
    IReadOnlyList<WarrantyDto> Warranties);
