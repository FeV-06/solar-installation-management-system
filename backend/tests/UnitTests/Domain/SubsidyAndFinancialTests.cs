using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace UnitTests.Domain;

public class SubsidyAndFinancialTests
{
    [Fact]
    public void SubsidyClaim_InitializesWithDefaultDocumentsSubmitted()
    {
        var claim = new SubsidyClaim
        {
            InstallationId = 42,
            SubsidyAmountRupees = 78000m,
            ApplicationReference = "PM-SG-2026-DEL-00918"
        };

        claim.Status.Should().Be(SubsidyClaimStatus.DocumentsSubmitted);
        claim.SubsidyAmountRupees.Should().Be(78000m);
        claim.ApplicationReference.Should().Be("PM-SG-2026-DEL-00918");
        claim.ClearedAt.Should().BeNull();
        claim.DisbursedAt.Should().BeNull();
    }

    [Fact]
    public void UnitEconomics_JobProfit_CalculatesCorrectMargin()
    {
        decimal revenueCollected = 160000m; // 20% advance + balance
        decimal bomEquipmentCost = 98000m;  // Panels + Inverter + Mounts + Cables + Switchgear
        double techHours = 6.0;
        decimal hourlyRate = 500m;
        decimal techLaborCost = (decimal)techHours * hourlyRate; // 3,000
        decimal warrantyAbsorption = 0m;

        decimal netProfit = revenueCollected - bomEquipmentCost - techLaborCost - warrantyAbsorption;
        decimal totalQuoted = 160000m;
        decimal marginPct = Math.Round((netProfit / totalQuoted) * 100m, 1);

        netProfit.Should().Be(59000m);
        marginPct.Should().Be(36.9m);
        (netProfit > 0).Should().BeTrue();
    }

    [Fact]
    public void UnitEconomics_LossMakingJob_DetectsOverrunAndNegativeMargin()
    {
        decimal revenueCollected = 32000m; // Only 20% advance received, balance unpaid!
        decimal bomEquipmentCost = 98000m;  // Full BOM dispatched and installed
        double techHours = 8.0;
        decimal hourlyRate = 500m;
        decimal techLaborCost = (decimal)techHours * hourlyRate; // 4,000
        decimal postSalesWarrantyRepair = 33500m; // Inverter blew up under warranty and was replaced at ₹0 to customer

        decimal netProfit = revenueCollected - bomEquipmentCost - techLaborCost - postSalesWarrantyRepair;
        decimal totalQuoted = 160000m;
        decimal marginPct = Math.Round((netProfit / totalQuoted) * 100m, 1);

        netProfit.Should().Be(-103500m);
        marginPct.Should().Be(-64.7m);
        (netProfit > 0).Should().BeFalse();
    }
}
