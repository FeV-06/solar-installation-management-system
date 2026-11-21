using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// A line item in the warehouse packing order. High-value units (inverter, battery, charge controller)
/// require serial number scanning before dispatch (Scene 3).
/// </summary>
public class PackingOrderItem
{
    public int Id { get; set; }

    public int PackingOrderId { get; set; }
    public PackingOrder PackingOrder { get; set; } = null!;

    public string ItemName { get; set; } = string.Empty;
    public BOMCategory Category { get; set; }

    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;

    public bool IsPacked { get; set; }

    /// <summary>Whether this item requires a scanned serial number prior to warehouse dispatch.</summary>
    public bool RequiresSerialNumber { get; set; }

    /// <summary>Scanned unique serial number (recorded during dispatch).</summary>
    public string? SerialNumber { get; set; }
}
