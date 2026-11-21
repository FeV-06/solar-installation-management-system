using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public class QuoteTemplateEngine : IQuoteTemplateEngine
{
    public Quote Generate(Installation installation, Survey? survey, decimal? requestedCapacityKw = null, SolarSystemType? requestedType = null)
    {
        var capacity = DetermineCapacity(requestedCapacityKw, survey);
        var systemType = DetermineSystemType(requestedType, survey);

        var quote = new Quote
        {
            InstallationId = installation.Id,
            SystemCapacityKw = capacity,
            SystemType = systemType,
            Status = QuoteStatus.Draft,
            PaymentStatus = PaymentStatus.Pending,
            AdvancePercentage = 20m,
            CreatedAt = DateTime.UtcNow
        };

        var items = new List<QuoteItem>();

        // 1. Solar Panels (550W Tier-1 Mono-PERC)
        var panelCount = (int)Math.Ceiling((capacity * 1000m) / 550m);
        if (panelCount % 2 != 0) panelCount++; // balance arrays in pairs
        var panelsCost = panelCount * 11000m;
        items.Add(new QuoteItem
        {
            Category = BOMCategory.SolarPanels,
            ItemName = "Mono-PERC Solar Panels (550W)",
            Specification = $"{panelCount}x 550W High-Efficiency Half-Cut Mono-PERC Modules ({panelCount * 0.55m:0.0} kWp)",
            Quantity = panelCount,
            Unit = "nos",
            UnitCostRupees = 11000m,
            TotalCostRupees = panelsCost
        });

        // 2. Inverter
        var inverterRating = capacity <= 1.0m ? 1.5m : capacity <= 2.0m ? 2.5m : capacity <= 3.0m ? 3.3m : capacity <= 4.0m ? 4.5m : 5.5m;
        var inverterCost = systemType == SolarSystemType.OnGrid
            ? (capacity <= 1.0m ? 18000m : capacity <= 2.0m ? 25000m : capacity <= 3.0m ? 32000m : capacity <= 4.0m ? 40000m : 48000m)
            : (capacity <= 1.0m ? 24000m : capacity <= 2.0m ? 32000m : capacity <= 3.0m ? 42000m : capacity <= 4.0m ? 52000m : 62000m);
        var inverterName = systemType == SolarSystemType.OnGrid
            ? $"{inverterRating} kVA Solar Grid-Tie String Inverter"
            : $"{inverterRating} kVA Hybrid/Off-Grid Inverter with Pure Sine Wave";

        items.Add(new QuoteItem
        {
            Category = BOMCategory.Inverter,
            ItemName = inverterName,
            Specification = $"MPPT efficiency >98%, IP65 rated, Wi-Fi telemetry enabled, {inverterRating} kW output",
            Quantity = 1,
            Unit = "nos",
            UnitCostRupees = inverterCost,
            TotalCostRupees = inverterCost
        });

        // 3. Battery Storage & Charge Controller (Off-Grid only)
        if (systemType == SolarSystemType.OffGrid)
        {
            var batteryKwh = capacity * 2.5m;
            var batteryCost = capacity <= 1.0m ? 35000m : capacity <= 2.0m ? 60000m : capacity <= 3.0m ? 85000m : capacity <= 4.0m ? 110000m : 135000m;
            items.Add(new QuoteItem
            {
                Category = BOMCategory.Battery,
                ItemName = $"{batteryKwh:0.0} kWh LiFePO4 Lithium Battery Storage Bank",
                Specification = $"48V modular LiFePO4 chemistry, 6000+ cycle life, built-in smart BMS",
                Quantity = 1,
                Unit = "set",
                UnitCostRupees = batteryCost,
                TotalCostRupees = batteryCost
            });

            var chargeControllerCost = capacity <= 2.0m ? 8000m : 12000m;
            var chargeAmps = capacity <= 2.0m ? 40 : 60;
            items.Add(new QuoteItem
            {
                Category = BOMCategory.ChargeController,
                ItemName = $"Solar MPPT Charge Controller (48V / {chargeAmps}A)",
                Specification = $"High-speed maximum power point tracking, 99% tracking efficiency",
                Quantity = 1,
                Unit = "nos",
                UnitCostRupees = chargeControllerCost,
                TotalCostRupees = chargeControllerCost
            });
        }

        // 4. Mounting Structure
        var structureCost = panelCount * 2500m;
        var tiltSpec = survey?.RoofTiltDegrees.HasValue == true ? $"{survey.RoofTiltDegrees.Value:0}° tilt" : "Standard 15°–25° tilt";
        items.Add(new QuoteItem
        {
            Category = BOMCategory.MountingStructure,
            ItemName = "Hot-Dip Galvanized Elevated Module Mounting Structure",
            Specification = $"Engineered for up to 150 km/h wind loads, corrosion-resistant HDG steel ({tiltSpec})",
            Quantity = panelCount,
            Unit = "nos",
            UnitCostRupees = 2500m,
            TotalCostRupees = structureCost
        });

        // 5. Cabling (derived from Survey cable distance)
        var cableDistance = survey?.CableDistanceMetres ?? 15m;
        var totalCableMeters = Math.Max(25m, Math.Round((cableDistance * 2m) + 10m));
        var cableCost = totalCableMeters * 80m;
        items.Add(new QuoteItem
        {
            Category = BOMCategory.Cabling,
            ItemName = "Solar DC UV-Resistant & AC Armoured Cabling Kit",
            Specification = $"4/6 sq mm cross-linked polyethylene insulated UV solar cable and copper AC connection ({totalCableMeters}m)",
            Quantity = totalCableMeters,
            Unit = "m",
            UnitCostRupees = 80m,
            TotalCostRupees = cableCost
        });

        // 6. Distribution & Safety Switchgear
        items.Add(new QuoteItem
        {
            Category = BOMCategory.ElectricalSafety,
            ItemName = "DC Combiner & Protection Box (AJB/DCDB)",
            Specification = "1000V DC Type 2 Surge Protection Device (SPD), high-voltage DC MCBs, IP65 enclosure",
            Quantity = 1,
            Unit = "set",
            UnitCostRupees = 4500m,
            TotalCostRupees = 4500m
        });

        items.Add(new QuoteItem
        {
            Category = BOMCategory.ElectricalSafety,
            ItemName = "AC Distribution Box (ACDB)",
            Specification = "Class II AC SPD, residual current circuit breaker (RCCB) and isolation switch",
            Quantity = 1,
            Unit = "set",
            UnitCostRupees = 3500m,
            TotalCostRupees = 3500m
        });

        // 7. Earthing & Lightning Protection
        items.Add(new QuoteItem
        {
            Category = BOMCategory.ElectricalSafety,
            ItemName = "Dual Chemical Earthing & Lightning Protection Kit",
            Specification = "Copper-bonded earth electrodes with low-resistivity compound & Class A lightning arrester",
            Quantity = 1,
            Unit = "set",
            UnitCostRupees = 8000m,
            TotalCostRupees = 8000m
        });

        // 8. Professional Installation & Grid Commissioning (Service)
        var serviceCost = capacity * 5000m;
        items.Add(new QuoteItem
        {
            Category = BOMCategory.Service,
            ItemName = "Turnkey Installation, Safety Testing & Commissioning",
            Specification = "On-site roof mounting, string cabling, generation testing, net-metering integration & safety signoff",
            Quantity = 1,
            Unit = "job",
            UnitCostRupees = serviceCost,
            TotalCostRupees = serviceCost
        });

        var basePrice = items.Sum(i => i.TotalCostRupees);
        var subsidy = CalculateSubsidy(capacity, systemType);
        var totalPayable = Math.Max(0m, basePrice - subsidy);
        var advanceRequired = Math.Round(totalPayable * 0.20m, 2);

        quote.BasePriceRupees = basePrice;
        quote.EstimatedSubsidyRupees = subsidy;
        quote.TotalAmountRupees = totalPayable;
        quote.AdvanceRequiredRupees = advanceRequired;
        quote.Items = items;

        return quote;
    }

    private static decimal DetermineCapacity(decimal? requested, Survey? survey)
    {
        if (requested.HasValue && requested.Value is >= 1.0m and <= 5.0m)
            return Math.Round(requested.Value, 1);

        if (survey?.MonthlyBillRupees is { } bill && bill > 0)
        {
            if (bill < 1500m) return 1.0m;
            if (bill < 2500m) return 2.0m;
            if (bill < 4000m) return 3.0m;
            if (bill < 5500m) return 4.0m;
            return 5.0m;
        }

        // Check roof area limitation (approx 8 sq m per kW)
        if (survey?.ShadowFreeRoofAreaSquareMetres is { } area && area > 0)
        {
            var maxFitting = Math.Floor(area / 8m);
            if (maxFitting >= 1m && maxFitting < 3m) return maxFitting;
        }

        return 3.0m; // Default benchmark system (SunPower scene: "The customer says yes to a 3 kW system")
    }

    private static SolarSystemType DetermineSystemType(SolarSystemType? requested, Survey? survey)
    {
        if (requested.HasValue) return requested.Value;
        if (survey?.GridSuitable == false) return SolarSystemType.OffGrid;
        return SolarSystemType.OnGrid;
    }

    private static decimal CalculateSubsidy(decimal capacityKw, SolarSystemType systemType)
    {
        if (systemType == SolarSystemType.OffGrid) return 0m;

        // PM Surya Ghar: Muft Bijli Yojana rooftop benchmarks
        if (capacityKw <= 1.0m) return 30000m;
        if (capacityKw <= 2.0m) return 60000m;
        return 78000m; // Capped at ₹78,000 for 3 kW and above
    }
}
