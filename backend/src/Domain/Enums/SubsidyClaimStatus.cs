namespace Domain.Enums;

/// <summary>
/// The state of a PM Surya Ghar central government rooftop solar subsidy application.
/// </summary>
public enum SubsidyClaimStatus
{
    /// <summary>Application paperwork submitted to the National Portal / DISCOM.</summary>
    DocumentsSubmitted,

    /// <summary>Utility / DISCOM site inspection cleared and net-meter installed.</summary>
    InspectionCleared,

    /// <summary>Subsidy amount successfully credited to homeowner's bank account.</summary>
    Disbursed,

    /// <summary>Application rejected or returned due to documentation or roof issues.</summary>
    Rejected
}
