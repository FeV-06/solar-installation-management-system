using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace UnitTests.Domain;

public class WarrantyTests
{
    [Fact]
    public void IsCovered_ReturnsTrue_WhenWithinWarrantyDatesAndActive()
    {
        var start = new DateTime(2026, 11, 21, 0, 0, 0, DateTimeKind.Utc);
        var expiry = start.AddYears(2);
        var warranty = new Warranty
        {
            Status = WarrantyStatus.Active,
            StartDate = start,
            ExpiryDate = expiry,
            WarrantyYears = 2
        };

        warranty.IsCovered(start.AddMonths(6)).Should().BeTrue();
        warranty.IsCovered(expiry).Should().BeTrue();
        warranty.IsCovered(expiry.AddDays(1)).Should().BeFalse();
        warranty.IsCovered(start.AddDays(-1)).Should().BeFalse();
    }

    [Fact]
    public void IsCovered_ReturnsFalse_WhenStatusIsNotActive()
    {
        var start = new DateTime(2026, 11, 21, 0, 0, 0, DateTimeKind.Utc);
        var warranty = new Warranty
        {
            Status = WarrantyStatus.Void,
            StartDate = start,
            ExpiryDate = start.AddYears(2),
            WarrantyYears = 2
        };

        warranty.IsCovered(start.AddMonths(1)).Should().BeFalse();
    }

    [Fact]
    public void RemainingDays_ReturnsPositiveDays_WhenActive()
    {
        var start = new DateTime(2026, 11, 21, 0, 0, 0, DateTimeKind.Utc);
        var expiry = start.AddDays(100);
        var warranty = new Warranty
        {
            Status = WarrantyStatus.Active,
            StartDate = start,
            ExpiryDate = expiry,
            WarrantyYears = 2
        };

        warranty.RemainingDays(start.AddDays(40)).Should().Be(60);
        warranty.RemainingDays(expiry.AddDays(10)).Should().Be(0);
    }
}
