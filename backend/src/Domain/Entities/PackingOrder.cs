using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// A warehouse packing list generated upon order confirmation.
/// </summary>
public class PackingOrder
{
    public int Id { get; set; }

    public int InstallationId { get; set; }
    public Installation Installation { get; set; } = null!;

    public int QuoteId { get; set; }
    public Quote Quote { get; set; } = null!;

    public PackingStatus Status { get; set; } = PackingStatus.Pending;

    public DateTime CreatedAt { get; set; }
    public DateTime? PackedAt { get; set; }
    public DateTime? DispatchedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }

    public List<PackingOrderItem> Items { get; set; } = [];
}
