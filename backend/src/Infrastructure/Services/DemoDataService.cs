using Application.Common.Models;
using Application.Interfaces.Services;
using Application.Services;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public class DemoDataService(AppDbContext db) : IDemoDataService
{
    private static readonly string[] FirstNames = [
        "Aarav", "Priya", "Rohan", "Ananya", "Rajesh", "Sneha", "Vikram", "Pooja", "Deepak", "Meera",
        "Arjun", "Kavita", "Manish", "Sunita", "Harpreet", "Gurpreet", "Neha", "Suresh", "Divya", "Kunal",
        "Swati", "Tarun", "Ritu", "Nikhil", "Shweta"
    ];

    private static readonly string[] Surnames = [
        "Sharma", "Patel", "Verma", "Gupta", "Singh", "Rao", "Iyer", "Nair", "Deshmukh", "Kapoor",
        "Bansal", "Joshi", "Tiwari", "Reddy", "Bhatia", "Saxena", "Agarwal", "Sen", "Dubey", "Choudhary"
    ];

    private record CityLocation(string Street, string City, string State, string ZipCode);
    private static readonly CityLocation[] Locations = [
        new("142 Model Town", "Amritsar", "Punjab", "143001"),
        new("58 Mall Road", "Ludhiana", "Punjab", "141001"),
        new("88 Urban Estate", "Jalandhar", "Punjab", "144001"),
        new("23 Baradari Gardens", "Patiala", "Punjab", "147001"),
        new("94 Phase 7", "Mohali", "Punjab", "160062"),
        new("12 Civil Lines", "Bathinda", "Punjab", "151001"),
        new("45 Barakhamba Road", "New Delhi", "Delhi", "110001"),
        new("19 Lajpat Nagar", "New Delhi", "Delhi", "110024"),
        new("72 Sector 14", "Gurugram", "Haryana", "122001"),
        new("104 Golf Course Ext Road", "Gurugram", "Haryana", "122018"),
        new("31 NIT", "Faridabad", "Haryana", "121001"),
        new("66 GT Road", "Panipat", "Haryana", "132103"),
        new("15 Malviya Nagar", "Jaipur", "Rajasthan", "302017"),
        new("82 Vaishali Nagar", "Jaipur", "Rajasthan", "302021"),
        new("27 Sardarpura", "Jodhpur", "Rajasthan", "342003"),
        new("53 Panchwati", "Udaipur", "Rajasthan", "313001"),
        new("91 Linking Road, Bandra", "Mumbai", "Maharashtra", "400050"),
        new("18 Shivaji Park, Dadar", "Mumbai", "Maharashtra", "400028"),
        new("74 Koregaon Park", "Pune", "Maharashtra", "411001"),
        new("41 Kothrud", "Pune", "Maharashtra", "411038"),
        new("112 Dharampeth", "Nagpur", "Maharashtra", "440010"),
        new("35 College Road", "Nashik", "Maharashtra", "422005"),
        new("60 CG Road", "Ahmedabad", "Gujarat", "380009"),
        new("92 Bodakdev", "Ahmedabad", "Gujarat", "380054"),
        new("48 Ghod Dod Road", "Surat", "Gujarat", "395007"),
        new("22 Alkapuri", "Vadodara", "Gujarat", "390007"),
        new("77 Indiranagar 100ft Road", "Bengaluru", "Karnataka", "560038"),
        new("105 Koramangala 4th Block", "Bengaluru", "Karnataka", "560034"),
        new("33 Gokulam", "Mysuru", "Karnataka", "570002"),
        new("86 Anna Nagar West", "Chennai", "Tamil Nadu", "600040"),
        new("14 T Nagar", "Chennai", "Tamil Nadu", "600017"),
        new("51 RS Puram", "Coimbatore", "Tamil Nadu", "641002"),
        new("99 Jubilee Hills Road No 36", "Hyderabad", "Telangana", "500033"),
        new("63 Banjara Hills Road No 12", "Hyderabad", "Telangana", "500034"),
        new("128 Gachibowli", "Hyderabad", "Telangana", "500032"),
        new("44 Gomti Nagar", "Lucknow", "Uttar Pradesh", "226010"),
        new("80 Sector 62", "Noida", "Uttar Pradesh", "201301"),
        new("29 Swaroop Nagar", "Kanpur", "Uttar Pradesh", "208002"),
        new("67 Arera Colony", "Bhopal", "Madhya Pradesh", "462016"),
        new("115 Vijay Nagar", "Indore", "Madhya Pradesh", "452010")
    ];

    public async Task<Result<DemoStatusDto>> GetStatusAsync(CancellationToken ct = default)
    {
        var demoLeads = await db.Leads.CountAsync(l => l.IsDemo, ct);
        var demoCustomers = await db.Customers.CountAsync(c => c.IsDemo, ct);
        var demoInstallations = await db.Installations.CountAsync(i => i.IsDemo, ct);

        var isEnabled = demoLeads > 0 || demoCustomers > 0 || demoInstallations > 0;
        return Result.Success(new DemoStatusDto(isEnabled, demoLeads, demoLeads, demoCustomers, demoInstallations));
    }

    public async Task<Result<DemoStatusDto>> EnableDemoModeAsync(CancellationToken ct = default)
    {
        // First clean up any leftover demo records
        await DisableDemoModeAsync(ct);

        var tech = await db.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Technician && u.IsActive, ct)
                   ?? await db.Users.FirstAsync(ct);
        var admin = await db.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Admin && u.IsActive, ct)
                    ?? await db.Users.FirstAsync(ct);

        var quoteEngine = new QuoteTemplateEngine();
        var now = DateTime.UtcNow;

        const int totalRecords = 400;

        for (int k = 0; k < totalRecords; k++)
        {
            var firstName = FirstNames[k % FirstNames.Length];
            var lastName = Surnames[(k / FirstNames.Length) % Surnames.Length];
            var loc = Locations[k % Locations.Length];
            var street = $"{loc.Street} #{k + 1}";
            var email = $"{firstName.ToLowerInvariant()}.{lastName.ToLowerInvariant()}{k + 1}@demo.sol.test";
            var phone = $"+9198{700 + (k % 280):D3}{1000 + (k % 9000):D4}";

            // 1. Address
            var address = new Address
            {
                Street = street,
                City = loc.City,
                State = loc.State,
                ZipCode = loc.ZipCode,
                Country = "India",
                UniqueAddressHash = Address.BuildHash(street, loc.City, loc.State, loc.ZipCode, "India"),
                IsDemo = true
            };
            db.Addresses.Add(address);

            // Determine Pipeline Stage:
            // 0..49 (50) -> Leads Only (25 New, 25 Contacted)
            // 50..109 (60) -> Survey Stage (30 Scheduled, 30 Submitted)
            // 110..179 (70) -> Design Stage (35 Draft, 35 Sent)
            // 180..259 (80) -> Installation Stage (30 Pending pack, 30 Packed, 20 Dispatched)
            // 260..399 (140) -> Active Commissioned Systems (with warranties, proofs, service tickets, subsidies)

            var isLeadOnly = k < 50;
            var isSurveyStage = k >= 50 && k < 110;
            var isDesignStage = k >= 110 && k < 180;
            var isInstallStage = k >= 180 && k < 260;
            var isActiveStage = k >= 260;

            var leadStatus = isLeadOnly
                ? (k < 25 ? LeadStatus.New : LeadStatus.Contacted)
                : LeadStatus.Converted;

            var lead = new Lead
            {
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                PhoneNumber = phone,
                Address = address,
                PropertyType = PropertyType.House,
                IsPropertyOwner = true,
                Status = leadStatus,
                CreatedAt = now.AddDays(-60 + (k % 55)),
                ContactedAt = leadStatus != LeadStatus.New ? now.AddDays(-55 + (k % 50)) : null,
                ClosedAt = leadStatus == LeadStatus.Converted ? now.AddDays(-50 + (k % 45)) : null,
                MonthlyBillRange = (k % 3 == 0) ? "2000-5000" : (k % 3 == 1) ? "5000-10000" : "10000plus",
                BestTimeToContact = "Evening",
                IsDemo = true
            };
            db.Leads.Add(lead);

            if (isLeadOnly) continue;

            // 2. Converted Customer
            var customer = new Customer
            {
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                NormalizedEmail = Emails.Normalize(email),
                PhoneNumber = phone,
                ContactAddress = address,
                Status = isActiveStage ? CustomerStatus.Active : CustomerStatus.Prospect,
                RegistrationDate = now.AddDays(-50 + (k % 45)),
                IsActive = true,
                IsDemo = true
            };
            db.Customers.Add(customer);
            lead.Customer = customer;

            // 3. Installation
            var installStatus = isSurveyStage
                ? InstallationStatus.Survey
                : isDesignStage
                ? InstallationStatus.Design
                : isInstallStage
                ? InstallationStatus.Installation
                : InstallationStatus.Active;

            var installation = new Installation
            {
                Customer = customer,
                Address = address,
                Lead = lead,
                Status = installStatus,
                TimeZone = "Asia/Kolkata",
                CreatedAt = now.AddDays(-50 + (k % 45)),
                IsDemo = true
            };
            db.Installations.Add(installation);

            // 4. Survey
            var isSurveyApproved = isDesignStage || isInstallStage || isActiveStage;
            var surveyStatus = isSurveyStage
                ? (k < 80 ? SurveyStatus.Scheduled : SurveyStatus.Submitted)
                : SurveyStatus.Approved;

            var survey = new Survey
            {
                Installation = installation,
                Technician = tech,
                TechnicianId = tech.Id,
                CreatedById = admin.Id,
                ScheduledAt = now.AddDays(-45 + (k % 40)),
                Status = surveyStatus,
                CreatedAt = now.AddDays(-50 + (k % 45)),
                ShadowFreeRoofAreaSquareMetres = 40m + (k % 30),
                MonthlyBillRupees = 3000m + ((k % 6) * 1200m),
                GridSuitable = true,
                RoofDirectionDegrees = 180m,
                RoofTiltDegrees = 24m + (k % 5),
                CableDistanceMetres = 12m + (k % 15),
                Notes = "Site roof in strong condition with South orientation.",
                SubmittedById = surveyStatus != SurveyStatus.Scheduled ? tech.Id : null,
                SubmittedAt = surveyStatus != SurveyStatus.Scheduled ? now.AddDays(-40 + (k % 35)) : null,
                ReviewedById = isSurveyApproved ? admin.Id : null,
                ReviewedAt = isSurveyApproved ? now.AddDays(-38 + (k % 33)) : null,
                ReviewNotes = isSurveyApproved ? "Approved by engineering." : null
            };
            db.Surveys.Add(survey);

            if (isSurveyStage) continue;

            // 5. Quote with BOM
            var capacityKw = 2.0m + ((k % 4) * 1.0m); // 2, 3, 4, 5 kW
            var systemType = (k % 7 == 0) ? SolarSystemType.OffGrid : SolarSystemType.OnGrid;

            var quote = quoteEngine.Generate(installation, survey, capacityKw, systemType);
            quote.Installation = installation;

            if (isDesignStage)
            {
                quote.Status = (k < 145) ? QuoteStatus.Draft : QuoteStatus.Sent;
                quote.SentAt = quote.Status == QuoteStatus.Sent ? now.AddDays(-30 + (k % 25)) : null;
                quote.PaymentStatus = PaymentStatus.Pending;
                quote.AmountPaidRupees = 0m;
            }
            else
            {
                // Installation or Active stage -> Accepted & Paid
                quote.Status = QuoteStatus.Accepted;
                quote.AcceptedAt = now.AddDays(-28 + (k % 20));
                quote.SentAt = now.AddDays(-30 + (k % 20));
                quote.PaymentReference = $"PAY-DEMO-{k + 1:D5}";

                if (isActiveStage)
                {
                    quote.PaymentStatus = (k % 5 == 0) ? PaymentStatus.AdvancePaid : PaymentStatus.FullyPaid;
                    quote.AmountPaidRupees = quote.PaymentStatus == PaymentStatus.FullyPaid
                        ? quote.TotalAmountRupees
                        : quote.AdvanceRequiredRupees;
                }
                else
                {
                    quote.PaymentStatus = PaymentStatus.AdvancePaid;
                    quote.AmountPaidRupees = quote.AdvanceRequiredRupees;
                }
            }
            db.Quotes.Add(quote);

            if (isDesignStage) continue;

            // 6. Packing Order
            var packingStatus = isInstallStage
                ? (k < 210 ? PackingStatus.Pending : k < 240 ? PackingStatus.Packed : PackingStatus.Dispatched)
                : PackingStatus.Delivered;

            var invSerial = $"INV-GROWATT-{k + 1000:D5}";
            var batSerial = systemType == SolarSystemType.OffGrid ? $"BAT-LFP48-{k + 2000:D5}" : null;

            var packingOrder = new PackingOrder
            {
                Installation = installation,
                Quote = quote,
                Status = packingStatus,
                CreatedAt = now.AddDays(-25 + (k % 20)),
                PackedAt = packingStatus != PackingStatus.Pending ? now.AddDays(-22 + (k % 18)) : null,
                DispatchedAt = packingStatus is PackingStatus.Dispatched or PackingStatus.Delivered ? now.AddDays(-20 + (k % 15)) : null,
                DeliveredAt = packingStatus == PackingStatus.Delivered ? now.AddDays(-18 + (k % 15)) : null,
                Items = quote.Items.Where(i => i.Category != BOMCategory.Service).Select(i => new PackingOrderItem
                {
                    ItemName = i.ItemName,
                    Category = i.Category,
                    Quantity = i.Quantity,
                    Unit = i.Unit,
                    IsPacked = packingStatus != PackingStatus.Pending,
                    RequiresSerialNumber = i.Category is BOMCategory.Inverter or BOMCategory.Battery or BOMCategory.ChargeController,
                    SerialNumber = i.Category == BOMCategory.Inverter ? invSerial : (i.Category == BOMCategory.Battery ? batSerial : null)
                }).ToList()
            };
            db.PackingOrders.Add(packingOrder);

            if (!isActiveStage) continue;

            // 7. Warranties (Active Systems)
            db.Warranties.Add(new Warranty
            {
                Installation = installation,
                Customer = customer,
                ItemName = $"{capacityKw} kVA Grid-Tie Inverter",
                Category = BOMCategory.Inverter,
                SerialNumber = invSerial,
                WarrantyYears = 2,
                StartDate = now.AddDays(-18 + (k % 15)),
                ExpiryDate = now.AddDays(-18 + (k % 15)).AddYears(2),
                Status = WarrantyStatus.Active,
                CreatedAt = now.AddDays(-18 + (k % 15))
            });

            db.Warranties.Add(new Warranty
            {
                Installation = installation,
                Customer = customer,
                ItemName = "Tier-1 Mono-PERC Solar Panels (550W)",
                Category = BOMCategory.SolarPanels,
                SerialNumber = $"PNL-SOLAR-BATCH-{(k % 10) + 101}",
                WarrantyYears = 20,
                StartDate = now.AddDays(-18 + (k % 15)),
                ExpiryDate = now.AddDays(-18 + (k % 15)).AddYears(20),
                Status = WarrantyStatus.Active,
                CreatedAt = now.AddDays(-18 + (k % 15))
            });

            // 8. Rooftop Installation Proof
            var workDurationHours = 4.5 + (k % 5) * 0.75;
            var installDate = now.AddDays(-15 + (k % 12));
            var proof = new InstallationProof
            {
                Installation = installation,
                Technician = tech,
                TechnicianId = tech.Id,
                WorkStartedAt = installDate,
                WorkCompletedAt = installDate.AddHours(workDurationHours),
                SystemCapacityKw = capacityKw,
                TestedGenerationKw = Math.Round(capacityKw * 0.88m, 2),
                GridConnected = true,
                PanelArrayPhotoUrl = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%230f172a'/><text x='10' y='55' fill='%2338bdf8'>Panels</text></svg>",
                InverterPhotoUrl = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%230f172a'/><text x='10' y='55' fill='%23f59e0b'>Inverter</text></svg>",
                MeterPhotoUrl = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%230f172a'/><text x='10' y='55' fill='%2322c55e'>NetMeter</text></svg>",
                CustomerSignatureData = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='80'><path d='M20 50 Q 80 10 140 45 T 180 30' fill='none' stroke='%23f59e0b' stroke-width='3'/></svg>",
                SignedByName = $"{firstName} {lastName}",
                SignedAt = installDate.AddHours(workDurationHours),
                CreatedAt = installDate.AddHours(workDurationHours)
            };
            db.InstallationProofs.Add(proof);

            // 9. Service Tickets (Post-sales breakdown claims for ~30 systems)
            if (k % 4 == 0 && k < 380)
            {
                var isResolved = (k % 8 != 0);
                var ticket = new ServiceTicket
                {
                    Installation = installation,
                    Customer = customer,
                    AssignedTechnician = tech,
                    AssignedTechnicianId = tech.Id,
                    SerialNumber = invSerial,
                    HardwareItem = $"{capacityKw} kVA Grid-Tie Inverter",
                    Category = BOMCategory.Inverter,
                    FaultCode = (k % 3 == 0) ? "E04 - Overheat Fault" : (k % 3 == 1) ? "E01 - Grid Voltage Out of Range" : "E08 - Earth Ground Leakage",
                    Description = "Inverter tripped during heavy rain; display showing red LED and zero export generation.",
                    DamageType = (k % 6 == 0) ? DamageType.AccidentalDamage : DamageType.EquipmentFailure,
                    IsWarrantyCovered = (k % 6 != 0),
                    PartsCostRupees = (k % 6 != 0) ? 0m : 32000m,
                    LaborCostRupees = (k % 6 != 0) ? 0m : 1500m,
                    TotalBilledRupees = (k % 6 != 0) ? 0m : 33500m,
                    Status = isResolved ? ServiceTicketStatus.Closed : ServiceTicketStatus.InProgress,
                    AdminNotes = "Assigned for high-priority field visit.",
                    ScheduledVisitAt = now.AddDays(-5),
                    CustomerApprovedAt = now.AddDays(-6),
                    ReplacementSerialNumber = isResolved ? $"INV-REPLACE-{k + 5000:D5}" : null,
                    TestedGenerationKw = isResolved ? Math.Round(capacityKw * 0.9m, 2) : null,
                    TechnicianResolutionNotes = isResolved ? "Replaced inverter with fresh unit. Grid synchronization verified." : null,
                    ResolvedAt = isResolved ? now.AddDays(-3) : null,
                    SignedByName = isResolved ? $"{firstName} {lastName}" : null,
                    TechnicianSignedAt = isResolved ? now.AddDays(-3) : null,
                    CustomerConfirmedAt = isResolved ? now.AddDays(-2) : null,
                    CreatedAt = now.AddDays(-8)
                };
                db.ServiceTickets.Add(ticket);
            }

            // 10. PM Surya Ghar Central Subsidy (for ~60 on-grid active systems)
            if (systemType == SolarSystemType.OnGrid && k % 2 == 0 && k >= 280)
            {
                var claimStatus = (k % 3 == 0)
                    ? SubsidyClaimStatus.DocumentsSubmitted
                    : (k % 3 == 1)
                    ? SubsidyClaimStatus.InspectionCleared
                    : SubsidyClaimStatus.Disbursed;

                var subsidyAmt = capacityKw <= 1.0m ? 30000m : capacityKw <= 2.0m ? 60000m : 78000m;
                var claim = new SubsidyClaim
                {
                    Installation = installation,
                    SubsidyAmountRupees = subsidyAmt,
                    ApplicationReference = $"PM-SG-2026-{loc.State[..Math.Min(2, loc.State.Length)].ToUpperInvariant()}-{k + 100:D4}",
                    Status = claimStatus,
                    SubmittedAt = now.AddDays(-20 + (k % 10)),
                    ClearedAt = claimStatus != SubsidyClaimStatus.DocumentsSubmitted ? now.AddDays(-10 + (k % 5)) : null,
                    DisbursedAt = claimStatus == SubsidyClaimStatus.Disbursed ? now.AddDays(-3) : null,
                    DisbursementReference = claimStatus == SubsidyClaimStatus.Disbursed ? $"DBT-NEFT-20261122-{k + 1:D4}" : null,
                    Notes = "National Rooftop Portal claim linked to DISCOM bi-directional net-meter."
                };
                db.SubsidyClaims.Add(claim);
            }
        }

        await db.SaveChangesAsync(ct);
        return await GetStatusAsync(ct);
    }

    public async Task<Result<DemoStatusDto>> DisableDemoModeAsync(CancellationToken ct = default)
    {
        // Execute atomic bulk cleanup of all demo entities without touching manual entries
        const string sql = """
            DELETE FROM outbox_messages WHERE lead_id IN (SELECT id FROM leads WHERE is_demo = true);
            DELETE FROM customer_otps WHERE email LIKE '%@demo.sol.test';
            DELETE FROM service_tickets WHERE installation_id IN (SELECT id FROM installations WHERE is_demo = true);
            DELETE FROM installation_proofs WHERE installation_id IN (SELECT id FROM installations WHERE is_demo = true);
            DELETE FROM subsidy_claims WHERE installation_id IN (SELECT id FROM installations WHERE is_demo = true);
            DELETE FROM warranties WHERE installation_id IN (SELECT id FROM installations WHERE is_demo = true);
            DELETE FROM packing_order_items WHERE packing_order_id IN (SELECT id FROM packing_orders WHERE installation_id IN (SELECT id FROM installations WHERE is_demo = true));
            DELETE FROM packing_orders WHERE installation_id IN (SELECT id FROM installations WHERE is_demo = true);
            DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE installation_id IN (SELECT id FROM installations WHERE is_demo = true));
            DELETE FROM quotes WHERE installation_id IN (SELECT id FROM installations WHERE is_demo = true);
            DELETE FROM surveys WHERE installation_id IN (SELECT id FROM installations WHERE is_demo = true);
            DELETE FROM installations WHERE is_demo = true;
            DELETE FROM leads WHERE is_demo = true;
            DELETE FROM customers WHERE is_demo = true;
            DELETE FROM addresses WHERE is_demo = true;
            """;

        await db.Database.ExecuteSqlRawAsync(sql, ct);
        return await GetStatusAsync(ct);
    }
}
