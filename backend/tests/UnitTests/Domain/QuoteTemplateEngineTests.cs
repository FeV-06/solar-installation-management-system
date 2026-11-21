using Application.Services;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;

namespace UnitTests.Domain;

public class QuoteTemplateEngineTests
{
    private readonly QuoteTemplateEngine _engine = new();

    [Fact]
    public void Generate_Standard3KwOnGrid_ProducesCompleteBOMAndCorrectPricing()
    {
        // Arrange
        var installation = new Installation { Id = 42 };
        var survey = new Survey
        {
            InstallationId = 42,
            Status = SurveyStatus.Approved,
            MonthlyBillRupees = 3200m,
            CableDistanceMetres = 20m,
            GridSuitable = true,
            RoofTiltDegrees = 20m
        };

        // Act
        var quote = _engine.Generate(installation, survey);

        // Assert
        quote.SystemCapacityKw.Should().Be(3.0m);
        quote.SystemType.Should().Be(SolarSystemType.OnGrid);
        quote.EstimatedSubsidyRupees.Should().Be(78000m);
        quote.AdvancePercentage.Should().Be(20m);
        quote.TotalAmountRupees.Should().Be(quote.BasePriceRupees - 78000m);
        quote.AdvanceRequiredRupees.Should().Be(Math.Round(quote.TotalAmountRupees * 0.20m, 2));

        // BOM checks
        quote.Items.Should().Contain(i => i.Category == BOMCategory.SolarPanels && i.Quantity == 6 && i.UnitCostRupees == 11000m);
        quote.Items.Should().Contain(i => i.Category == BOMCategory.Inverter && i.ItemName.Contains("Grid-Tie"));
        quote.Items.Should().Contain(i => i.Category == BOMCategory.MountingStructure && i.Quantity == 6);
        quote.Items.Should().Contain(i => i.Category == BOMCategory.Cabling && i.Quantity >= 50m);
        quote.Items.Should().Contain(i => i.Category == BOMCategory.ElectricalSafety && i.ItemName.Contains("DC"));
        quote.Items.Should().Contain(i => i.Category == BOMCategory.ElectricalSafety && i.ItemName.Contains("AC"));
        quote.Items.Should().Contain(i => i.Category == BOMCategory.ElectricalSafety && i.ItemName.Contains("Earthing"));
        quote.Items.Should().NotContain(i => i.Category == BOMCategory.Battery);
    }

    [Fact]
    public void Generate_OffGridSystem_IncludesBatteryAndChargeControllerWithZeroSubsidy()
    {
        // Arrange
        var installation = new Installation { Id = 10 };
        var survey = new Survey
        {
            InstallationId = 10,
            Status = SurveyStatus.Approved,
            GridSuitable = false,
            CableDistanceMetres = 15m
        };

        // Act
        var quote = _engine.Generate(installation, survey, requestedCapacityKw: 2.0m, requestedType: SolarSystemType.OffGrid);

        // Assert
        quote.SystemCapacityKw.Should().Be(2.0m);
        quote.SystemType.Should().Be(SolarSystemType.OffGrid);
        quote.EstimatedSubsidyRupees.Should().Be(0m);
        quote.Items.Should().Contain(i => i.Category == BOMCategory.Battery && i.ItemName.Contains("LiFePO4"));
        quote.Items.Should().Contain(i => i.Category == BOMCategory.ChargeController && i.ItemName.Contains("MPPT"));
        quote.Items.Should().Contain(i => i.Category == BOMCategory.Inverter && i.ItemName.Contains("Hybrid"));
    }

    [Theory]
    [InlineData(1.0, 30000)]
    [InlineData(2.0, 60000)]
    [InlineData(3.0, 78000)]
    [InlineData(5.0, 78000)]
    public void Generate_OnGridCapacities_CalculatesPmSuryaGharSubsidyTiers(decimal capacity, decimal expectedSubsidy)
    {
        var installation = new Installation { Id = 1 };
        var quote = _engine.Generate(installation, null, requestedCapacityKw: capacity, requestedType: SolarSystemType.OnGrid);

        quote.EstimatedSubsidyRupees.Should().Be(expectedSubsidy);
        quote.TotalAmountRupees.Should().Be(quote.BasePriceRupees - expectedSubsidy);
        quote.AdvanceRequiredRupees.Should().Be(Math.Round(quote.TotalAmountRupees * 0.20m, 2));
    }
}
