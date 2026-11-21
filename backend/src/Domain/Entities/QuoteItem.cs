using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// An itemized part in the bill of materials (BOM) for a quote.
/// </summary>
public class QuoteItem
{
    public int Id { get; set; }

    public int QuoteId { get; set; }
    public Quote Quote { get; set; } = null!;

    public BOMCategory Category { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Specification { get; set; } = string.Empty;

    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;

    public decimal UnitCostRupees { get; set; }
    public decimal TotalCostRupees { get; set; }
}
