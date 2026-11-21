using Domain.Entities;
using FluentAssertions;

namespace UnitTests.Domain;

public class InstallationProofTests
{
    [Fact]
    public void LaborHours_CalculatesAccurately()
    {
        var start = new DateTime(2026, 11, 22, 9, 30, 0, DateTimeKind.Utc);
        var end = new DateTime(2026, 11, 22, 16, 15, 0, DateTimeKind.Utc);

        var proof = new InstallationProof
        {
            WorkStartedAt = start,
            WorkCompletedAt = end,
            SystemCapacityKw = 3.3m,
            TestedGenerationKw = 2.85m,
            GridConnected = true,
            SignedByName = "Aarav Sharma"
        };

        proof.LaborHours.Should().Be(6.75);
    }

    [Fact]
    public void LaborHours_MinimumHalfHour()
    {
        var start = new DateTime(2026, 11, 22, 10, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2026, 11, 22, 10, 5, 0, DateTimeKind.Utc);

        var proof = new InstallationProof
        {
            WorkStartedAt = start,
            WorkCompletedAt = end,
        };

        proof.LaborHours.Should().Be(0.5);
    }
}
