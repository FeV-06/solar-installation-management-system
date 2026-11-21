using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// A post-sales warranty complaint or breakdown service ticket (Scene 5).
/// Invariant: Cannot be closed by staff alone; requires explicit customer confirmation of power restoration.
/// </summary>
public class ServiceTicket
{
    public int Id { get; set; }

    public int InstallationId { get; set; }
    public Installation Installation { get; set; } = null!;

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public int? AssignedTechnicianId { get; set; }
    public User? AssignedTechnician { get; set; }
    public DateTime? ScheduledVisitAt { get; set; }

    public string SerialNumber { get; set; } = string.Empty;
    public string HardwareItem { get; set; } = string.Empty;
    public BOMCategory Category { get; set; }

    public string FaultCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }

    public DamageType DamageType { get; set; } = DamageType.EquipmentFailure;
    public bool IsWarrantyCovered { get; set; }

    public decimal PartsCostRupees { get; set; }
    public decimal LaborCostRupees { get; set; }
    public decimal TotalBilledRupees { get; set; }

    public ServiceTicketStatus Status { get; set; } = ServiceTicketStatus.Open;

    public string? AdminNotes { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public DateTime? CustomerApprovedAt { get; set; }

    /// <summary>The replacement warehouse packing order generated upon customer approval.</summary>
    public int? ReplacementPackingOrderId { get; set; }
    public PackingOrder? ReplacementPackingOrder { get; set; }

    public string? ReplacementSerialNumber { get; set; }
    public decimal? TestedGenerationKw { get; set; }
    public string? ReplacementPhotoUrl { get; set; }
    public string? TechnicianResolutionNotes { get; set; }
    public DateTime? ResolvedAt { get; set; }

    /// <summary>Homeowner digital screen signature captured on-site upon physical swap.</summary>
    public string? CustomerSignatureData { get; set; }
    public string? SignedByName { get; set; }
    public DateTime? TechnicianSignedAt { get; set; }

    /// <summary>Final digital signoff by homeowner in Customer Portal confirming power restoration.</summary>
    public DateTime? CustomerConfirmedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}
