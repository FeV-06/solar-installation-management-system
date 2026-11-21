namespace Application.DTOs.ServiceTickets;

public record CreateServiceTicketRequest(
    int InstallationId,
    string SerialNumber,
    string FaultCode,
    string Description,
    string? PhotoUrl = null);

public record ReviewServiceTicketRequest(
    string DamageType,
    bool IsWarrantyCovered,
    decimal PartsCostRupees,
    decimal LaborCostRupees,
    string? AdminNotes = null,
    int? AssignTechnicianId = null);

public record ApproveServiceTicketRequest(
    string? CustomerNotes = null);

public record ResolveServiceTicketRequest(
    string ReplacementSerialNumber,
    string ResolutionNotes,
    string CustomerSignatureData);

public record ConfirmServiceTicketRequest(
    string? HomeownerFeedback = null);

public record ServiceTicketDto(
    int Id,
    int InstallationId,
    int CustomerId,
    string CustomerName,
    string CustomerPhone,
    string CustomerEmail,
    string PropertyAddress,
    int? AssignedTechnicianId,
    string? AssignedTechnicianName,
    string SerialNumber,
    string HardwareItem,
    string Category,
    string FaultCode,
    string Description,
    string? PhotoUrl,
    string DamageType,
    bool IsWarrantyCovered,
    decimal PartsCostRupees,
    decimal LaborCostRupees,
    decimal TotalBilledRupees,
    string Status,
    string? AdminNotes,
    DateTime? ReviewedAt,
    DateTime? CustomerApprovedAt,
    int? ReplacementPackingOrderId,
    string? ReplacementSerialNumber,
    string? TechnicianResolutionNotes,
    DateTime? ResolvedAt,
    string? CustomerSignatureData,
    DateTime? TechnicianSignedAt,
    DateTime? CustomerConfirmedAt,
    DateTime CreatedAt);
