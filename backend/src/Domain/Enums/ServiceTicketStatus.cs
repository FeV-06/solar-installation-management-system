namespace Domain.Enums;

/// <summary>
/// Lifecycle status of a post-sales breakdown ticket (Scene 5).
/// </summary>
public enum ServiceTicketStatus
{
    Open,
    Reviewed,
    Approved,
    InProgress,
    ResolvedPendingCustomerConfirmation,
    Closed,
    Cancelled
}
