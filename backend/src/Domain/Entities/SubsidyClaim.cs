using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// A PM Surya Ghar central government rooftop solar subsidy claim linked to an installation.
/// Tracks application paperwork from national portal submission through DISCOM utility inspection
/// to direct bank disbursement.
/// </summary>
public class SubsidyClaim
{
    public int Id { get; set; }

    public int InstallationId { get; set; }
    public Installation Installation { get; set; } = null!;

    public decimal SubsidyAmountRupees { get; set; }
    public string ApplicationReference { get; set; } = string.Empty;

    public SubsidyClaimStatus Status { get; set; } = SubsidyClaimStatus.DocumentsSubmitted;

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClearedAt { get; set; }
    public DateTime? DisbursedAt { get; set; }
    public string? DisbursementReference { get; set; }
    public string? Notes { get; set; }
}
