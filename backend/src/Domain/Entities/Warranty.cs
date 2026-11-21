using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// An equipment warranty record automatically created upon warehouse delivery (Scene 3 &amp; Scene 5).
/// Holds 2-year warranty for inverters, batteries, and charge controllers; 20-year warranty for solar modules.
/// </summary>
public class Warranty
{
    public int Id { get; set; }

    public int InstallationId { get; set; }
    public Installation Installation { get; set; } = null!;

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public string ItemName { get; set; } = string.Empty;
    public BOMCategory Category { get; set; }

    /// <summary>Unique hardware serial number or batch reference.</summary>
    public string SerialNumber { get; set; } = string.Empty;

    public int WarrantyYears { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime ExpiryDate { get; set; }

    public WarrantyStatus Status { get; set; } = WarrantyStatus.Active;

    public DateTime CreatedAt { get; set; }

    /// <summary>Checks whether this hardware is actively covered by warranty.</summary>
    public bool IsCovered(DateTime asOf) => Status == WarrantyStatus.Active && asOf >= StartDate && asOf <= ExpiryDate;

    /// <summary>Remaining days of warranty coverage.</summary>
    public int RemainingDays(DateTime asOf) => IsCovered(asOf) ? Math.Max(0, (int)(ExpiryDate - asOf).TotalDays) : 0;
}
