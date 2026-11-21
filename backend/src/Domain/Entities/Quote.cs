using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// A commercial and technical proposal for an installation, including equipment sizing,
/// subsidy deduction and exact bill of materials.
/// </summary>
public class Quote
{
    public int Id { get; set; }

    public int InstallationId { get; set; }
    public Installation Installation { get; set; } = null!;

    /// <summary>System capacity in kilowatts (1 kW to 5 kW standard packages).</summary>
    public decimal SystemCapacityKw { get; set; }

    /// <summary>On-Grid or Off-Grid (with battery storage).</summary>
    public SolarSystemType SystemType { get; set; }

    /// <summary>Base hardware and installation cost in INR.</summary>
    public decimal BasePriceRupees { get; set; }

    /// <summary>Estimated central government subsidy (e.g. PM Surya Ghar) in INR.</summary>
    public decimal EstimatedSubsidyRupees { get; set; }

    /// <summary>Net customer payable in INR (BasePrice - Subsidy).</summary>
    public decimal TotalAmountRupees { get; set; }

    /// <summary>Required advance percentage before work starts (default 20%).</summary>
    public decimal AdvancePercentage { get; set; } = 20m;

    /// <summary>Minimum advance required in INR.</summary>
    public decimal AdvanceRequiredRupees { get; set; }

    /// <summary>Actual amount paid so far in INR.</summary>
    public decimal AmountPaidRupees { get; set; }

    public QuoteStatus Status { get; set; } = QuoteStatus.Draft;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

    public string? Notes { get; set; }
    public string? PaymentReference { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public DateTime? PaidAt { get; set; }

    public List<QuoteItem> Items { get; set; } = [];
    public PackingOrder? PackingOrder { get; set; }
}
