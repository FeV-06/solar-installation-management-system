namespace Domain.Entities;

public class CustomerOtp
{
    public Guid Id { get; set; }
    public string NormalizedEmail { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string OtpHash { get; set; } = string.Empty;
    public string Salt { get; set; } = string.Empty;
    public int FailedAttempts { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? ConsumedAtUtc { get; set; }
    public string? CreatedByIp { get; set; }

    public bool IsExpired(DateTime now) => now >= ExpiresAtUtc;
    public bool IsConsumed => ConsumedAtUtc.HasValue;
    public bool IsLockedOut => FailedAttempts >= 5;
}
