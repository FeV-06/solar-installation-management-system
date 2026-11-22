using System.Text;
using Application.Common.Models;
using Application.DTOs.Financial;
using Application.DTOs.Subsidy;
using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public class FinancialService(AppDbContext db) : IFinancialService
{
    public const decimal DefaultHourlyRate = 500m; // Standard ₹500/hr technician rate
    public const double DefaultSurveyHours = 1.5;
    public const double DefaultServiceTicketHours = 2.0;

    public async Task<Result<DirectorOverviewDto>> GetOverviewAsync(string? period = null, CancellationToken ct = default)
    {
        var periodKey = string.IsNullOrWhiteSpace(period) ? "all" : period.Trim().ToLowerInvariant();
        var cutoff = GetPeriodCutoff(periodKey);

        // 1. Fetch Installations with all related economic records
        IQueryable<Installation> installationsQuery = db.Installations
            .Include(i => i.Customer)
            .Include(i => i.Address)
            .Include(i => i.Quotes)
                .ThenInclude(q => q.Items)
            .Include(i => i.Proof)
                .ThenInclude(p => p!.Technician)
            .Include(i => i.ServiceTickets)
                .ThenInclude(t => t.AssignedTechnician)
            .Include(i => i.SubsidyClaim)
            .AsNoTracking();

        if (cutoff.HasValue)
        {
            installationsQuery = installationsQuery.Where(i => i.CreatedAt >= cutoff.Value);
        }

        var installations = await installationsQuery
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(ct);

        // 2. Fetch surveys for survey hours calculation
        var allSurveys = await db.Surveys
            .AsNoTracking()
            .ToListAsync(ct);

        var surveysByInstallation = allSurveys
            .GroupBy(s => s.InstallationId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // 3. Compute Job Unit Economics
        var jobEconomics = new List<JobUnitEconomicsDto>();

        foreach (var inst in installations)
        {
            var quote = inst.Quotes
                .OrderByDescending(q => q.Status == QuoteStatus.Accepted ? 1 : 0)
                .ThenByDescending(q => q.CreatedAt)
                .FirstOrDefault();

            var totalQuoted = quote?.TotalAmountRupees ?? 0m;
            var estimatedSubsidy = quote?.EstimatedSubsidyRupees ?? 0m;
            var revenueCollected = quote?.AmountPaidRupees ?? 0m;
            var accountsReceivable = (quote != null && quote.Status == QuoteStatus.Accepted)
                ? Math.Max(0m, quote.TotalAmountRupees - quote.AmountPaidRupees)
                : 0m;

            // Direct BOM Hardware Cost (excludes service charges)
            var bomHardwareCost = quote?.Items
                .Where(i => i.Category != BOMCategory.Service)
                .Sum(i => i.TotalCostRupees) ?? 0m;

            // Technician Hours: Roof install proof + Survey + Service Tickets
            double proofHours = inst.Proof != null ? inst.Proof.LaborHours : 0.0;
            var hasCompletedSurvey = surveysByInstallation.TryGetValue(inst.Id, out var instSurveys)
                && instSurveys.Any(s => s.Status == SurveyStatus.Approved || s.Status == SurveyStatus.Submitted);
            double surveyHours = hasCompletedSurvey ? DefaultSurveyHours : 0.0;
            double ticketHours = inst.ServiceTickets.Count(t => t.ResolvedAt.HasValue) * DefaultServiceTicketHours;
            double totalTechHours = Math.Round(proofHours + surveyHours + ticketHours, 2);

            var technicianLaborCost = Math.Round((decimal)totalTechHours * DefaultHourlyRate, 2);

            // Post-sales internal warranty repair cost absorbed by the company
            var postSalesRepairCost = inst.ServiceTickets
                .Where(t => t.IsWarrantyCovered)
                .Sum(t => t.PartsCostRupees + t.LaborCostRupees);

            // True accounting formula:
            // Net Profit = Revenue Collected - Direct BOM Cost - Technician Labor Cost - Warranty Absorption
            var netProfit = revenueCollected - bomHardwareCost - technicianLaborCost - postSalesRepairCost;
            var netMarginPct = totalQuoted > 0
                ? Math.Round((netProfit / totalQuoted) * 100m, 1)
                : (netProfit < 0 ? -100.0m : 0m);

            var isProfitable = netProfit > 0;
            var overruns = new List<string>();

            if (accountsReceivable > 0)
            {
                overruns.Add($"Uncollected balance (₹{accountsReceivable:N0} pending from customer)");
            }
            if (postSalesRepairCost > 0)
            {
                overruns.Add($"Post-sales warranty replacement absorbed (₹{postSalesRepairCost:N0})");
            }
            if (proofHours > 5.5)
            {
                overruns.Add($"Extended rooftop labor duration ({proofHours:F1}h)");
            }
            var cablingCost = quote?.Items.Where(i => i.Category == BOMCategory.Cabling).Sum(i => i.TotalCostRupees) ?? 0m;
            if (cablingCost > 3000m)
            {
                overruns.Add($"Long cable distance run (BOM ₹{cablingCost:N0})");
            }
            if (revenueCollected == 0m && bomHardwareCost > 0m)
            {
                overruns.Add("Hardware allocated without advance payment");
            }

            jobEconomics.Add(new JobUnitEconomicsDto(
                inst.Id,
                inst.Customer?.FullName ?? "Customer",
                inst.Address?.City ?? "City",
                inst.Address?.State ?? "State",
                quote?.SystemCapacityKw ?? 3.0m,
                quote?.SystemType.ToString() ?? "OnGrid",
                inst.Status.ToString(),
                quote?.Status.ToString() ?? "None",
                quote?.PaymentStatus.ToString() ?? "Pending",
                totalQuoted,
                estimatedSubsidy,
                revenueCollected,
                accountsReceivable,
                bomHardwareCost,
                technicianLaborCost,
                totalTechHours,
                postSalesRepairCost,
                netProfit,
                netMarginPct,
                isProfitable,
                overruns,
                inst.CreatedAt,
                inst.Proof?.WorkCompletedAt,
                inst.Proof?.TestedGenerationKw
            ));
        }

        // 4. Compute High-Level Summary
        var cashCollectedTotal = jobEconomics.Sum(j => j.RevenueCollectedRupees);
        var receivablesTotal = jobEconomics.Sum(j => j.AccountsReceivableRupees);
        var bomCostTotal = jobEconomics.Sum(j => j.BOMEquipmentCostRupees);
        var laborCostTotal = jobEconomics.Sum(j => j.TechnicianLaborCostRupees);
        var repairCostTotal = jobEconomics.Sum(j => j.PostSalesRepairCostRupees);
        var netProfitTotal = cashCollectedTotal - bomCostTotal - laborCostTotal - repairCostTotal;

        var totalQuotedAll = jobEconomics.Sum(j => j.TotalQuotedAmountRupees);
        var netMarginTotalPct = totalQuotedAll > 0
            ? Math.Round((netProfitTotal / totalQuotedAll) * 100m, 1)
            : (netProfitTotal < 0 ? -100.0m : 0m);

        // 5. Subsidy Pipeline Summary
        IQueryable<SubsidyClaim> claimsQuery = db.SubsidyClaims
            .Include(s => s.Installation)
                .ThenInclude(i => i.Customer)
            .Include(s => s.Installation)
                .ThenInclude(i => i.Address)
            .Include(s => s.Installation)
                .ThenInclude(i => i.Quotes)
            .AsNoTracking();

        if (cutoff.HasValue)
        {
            claimsQuery = claimsQuery.Where(s => s.SubmittedAt >= cutoff.Value);
        }

        var allClaims = await claimsQuery.OrderByDescending(s => s.SubmittedAt).ToListAsync(ct);

        var totalClaimsCount = allClaims.Count;
        var totalClaimedAmount = allClaims.Sum(s => s.SubsidyAmountRupees);

        var submittedClaims = allClaims.Where(s => s.Status == SubsidyClaimStatus.DocumentsSubmitted).ToList();
        var clearedClaims = allClaims.Where(s => s.Status == SubsidyClaimStatus.InspectionCleared).ToList();
        var disbursedClaims = allClaims.Where(s => s.Status == SubsidyClaimStatus.Disbursed).ToList();
        var rejectedClaims = allClaims.Where(s => s.Status == SubsidyClaimStatus.Rejected).ToList();

        var disbursedAmount = disbursedClaims.Sum(s => s.SubsidyAmountRupees);
        var pendingAmount = totalClaimedAmount - disbursedAmount;

        var subsidyPipeline = new SubsidyPipelineSummaryDto(
            totalClaimsCount,
            totalClaimedAmount,
            submittedClaims.Count,
            submittedClaims.Sum(s => s.SubsidyAmountRupees),
            clearedClaims.Count,
            clearedClaims.Sum(s => s.SubsidyAmountRupees),
            disbursedClaims.Count,
            disbursedAmount,
            rejectedClaims.Count,
            allClaims.Take(15).Select(s => new SubsidyClaimDto(
                s.Id,
                s.InstallationId,
                s.Installation.Customer?.FullName ?? "Customer",
                s.Installation.Customer?.PhoneNumber ?? "",
                s.Installation.Customer?.NormalizedEmail ?? "",
                s.Installation.Address?.Street ?? "",
                s.Installation.Address?.City ?? "",
                s.Installation.Address?.State ?? "",
                s.Installation.Quotes.FirstOrDefault()?.SystemCapacityKw ?? 3.0m,
                s.Installation.Quotes.FirstOrDefault()?.SystemType.ToString() ?? "OnGrid",
                s.SubsidyAmountRupees,
                s.ApplicationReference,
                s.Status.ToString(),
                s.SubmittedAt,
                s.ClearedAt,
                s.DisbursedAt,
                s.DisbursementReference,
                s.Notes
            )).ToList()
        );

        // 6. Operations Backlog
        var pendingSurveys = await db.Surveys.CountAsync(s => s.Status == SurveyStatus.Scheduled, ct);
        var packingQueue = await db.PackingOrders.CountAsync(p => p.Status == PackingStatus.Pending || p.Status == PackingStatus.Packed, ct);
        var scheduledInstalls = await db.Installations.CountAsync(i => i.Status == InstallationStatus.Installation, ct);
        var openTickets = await db.ServiceTickets.CountAsync(t => t.Status != ServiceTicketStatus.Closed, ct);

        var backlog = new OperationsBacklogDto(
            pendingSurveys,
            packingQueue,
            scheduledInstalls,
            openTickets,
            pendingSurveys + packingQueue + scheduledInstalls + openTickets
        );

        // 7. Crew Payroll Aggregation
        var technicians = await db.Users
            .Where(u => u.Role == UserRole.Technician && u.IsActive)
            .OrderBy(u => u.Name)
            .ToListAsync(ct);

        var techPayrollList = new List<TechnicianPayrollDto>();

        foreach (var tech in technicians)
        {
            var surveysCount = allSurveys.Count(s => s.TechnicianId == tech.Id && (s.Status == SurveyStatus.Approved || s.Status == SurveyStatus.Submitted));
            var proofs = await db.InstallationProofs.Where(p => p.TechnicianId == tech.Id).ToListAsync(ct);
            var ticketsResolved = await db.ServiceTickets.CountAsync(t => t.AssignedTechnicianId == tech.Id && t.ResolvedAt != null, ct);

            double proofTotalHours = proofs.Sum(p => p.LaborHours);
            double surveyTotalHours = surveysCount * DefaultSurveyHours;
            double ticketsTotalHours = ticketsResolved * DefaultServiceTicketHours;

            double totalHours = Math.Round(proofTotalHours + surveyTotalHours + ticketsTotalHours, 2);
            decimal totalPay = Math.Round((decimal)totalHours * DefaultHourlyRate, 2);

            techPayrollList.Add(new TechnicianPayrollDto(
                tech.Id,
                tech.Name,
                tech.Email,
                surveysCount,
                proofs.Count,
                ticketsResolved,
                totalHours,
                totalPay
            ));
        }

        var totalLoggedCrewHours = techPayrollList.Sum(t => t.TotalLoggedHours);
        var totalPayrollAmount = techPayrollList.Sum(t => t.TotalPayRupees);

        var crewPayroll = new CrewPayrollSummaryDto(
            DefaultHourlyRate,
            totalLoggedCrewHours,
            totalPayrollAmount,
            techPayrollList
        );

        var summary = new FinancialSummaryDto(
            cashCollectedTotal,
            receivablesTotal,
            bomCostTotal,
            laborCostTotal,
            repairCostTotal,
            netProfitTotal,
            netMarginTotalPct,
            disbursedAmount,
            pendingAmount,
            jobEconomics.Count,
            jobEconomics.Count(j => j.IsProfitable),
            jobEconomics.Count(j => !j.IsProfitable)
        );

        var overview = new DirectorOverviewDto(
            periodKey,
            DateTime.UtcNow,
            summary,
            jobEconomics,
            subsidyPipeline,
            backlog,
            crewPayroll
        );

        return Result.Success(overview);
    }

    public async Task<Result<string>> GenerateCsvExportAsync(string? period = null, CancellationToken ct = default)
    {
        var overviewResult = await GetOverviewAsync(period, ct);
        if (!overviewResult.IsSuccess)
            return Result.Failure<string>(overviewResult.Error);

        var overview = overviewResult.Value;
        var sb = new StringBuilder();

        // CSV Header
        sb.AppendLine("Installation ID,Customer Name,City,State,Capacity (kW),System Type,Stage,Payment Status,Total Quoted (INR),Revenue Collected (INR),Accounts Receivable (INR),BOM Hardware Cost (INR),Technician Labor Pay (INR),Warranty Repair Cost (INR),Net Profit (INR),Margin %,Profitable,Cost Overrun Reasons");

        foreach (var job in overview.JobEconomics)
        {
            var reasons = string.Join(" | ", job.CostOverrunReasons).Replace("\"", " ");
            var isProf = job.IsProfitable ? "Yes" : "No";
            sb.AppendLine($"{job.InstallationId},\"{job.CustomerName}\",\"{job.PropertyCity}\",\"{job.PropertyState}\",{job.SystemCapacityKw},{job.SystemType},{job.Stage},{job.PaymentStatus},{job.TotalQuotedAmountRupees:0.00},{job.RevenueCollectedRupees:0.00},{job.AccountsReceivableRupees:0.00},{job.BOMEquipmentCostRupees:0.00},{job.TechnicianLaborCostRupees:0.00},{job.PostSalesRepairCostRupees:0.00},{job.NetProfitRupees:0.00},{job.NetMarginPercentage:0.0}%,{isProf},\"{reasons}\"");
        }

        sb.AppendLine();
        sb.AppendLine("--- PM SURYA GHAR SUBSIDY PIPELINE ---");
        sb.AppendLine("Claim ID,Installation ID,Customer Name,State,Capacity (kW),Subsidy Amount (INR),Status,Application Ref,Disbursement Ref,Submitted At,Disbursed At");
        foreach (var claim in overview.SubsidyPipeline.RecentClaims)
        {
            sb.AppendLine($"{claim.Id},{claim.InstallationId},\"{claim.CustomerName}\",\"{claim.PropertyState}\",{claim.SystemCapacityKw},{claim.SubsidyAmountRupees:0.00},{claim.Status},\"{claim.ApplicationReference}\",\"{claim.DisbursementReference}\",{claim.SubmittedAt:yyyy-MM-dd},{claim.DisbursedAt:yyyy-MM-dd}");
        }

        sb.AppendLine();
        sb.AppendLine("--- CREW PAYROLL LEDGER ---");
        sb.AppendLine("Technician ID,Name,Email,Surveys Completed,Installs Completed,Tickets Resolved,Total Hours Logged,Rate/Hr (INR),Total Pay (INR)");
        foreach (var tech in overview.CrewPayroll.Technicians)
        {
            sb.AppendLine($"{tech.TechnicianId},\"{tech.TechnicianName}\",\"{tech.Email}\",{tech.SurveysCompleted},{tech.InstallationsCompleted},{tech.ServiceTicketsResolved},{tech.TotalLoggedHours:0.00},{overview.CrewPayroll.HourlyRateRupees:0.00},{tech.TotalPayRupees:0.00}");
        }

        return Result.Success(sb.ToString());
    }

    private static DateTime? GetPeriodCutoff(string period)
    {
        var now = DateTime.UtcNow;
        return period switch
        {
            "today" => new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc),
            "week" => now.Date.AddDays(-7),
            "month" => now.Date.AddDays(-30),
            _ => null
        };
    }
}
