using Application.Common.Models;
using Application.DTOs.Subsidy;
using Application.Errors;
using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public class SubsidyService(AppDbContext db) : ISubsidyService
{
    public async Task<Result<IReadOnlyList<SubsidyClaimDto>>> GetAllAsync(string? status = null, CancellationToken ct = default)
    {
        var query = db.SubsidyClaims
            .Include(s => s.Installation)
                .ThenInclude(i => i.Customer)
            .Include(s => s.Installation)
                .ThenInclude(i => i.Address)
            .Include(s => s.Installation)
                .ThenInclude(i => i.Quotes)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<SubsidyClaimStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(s => s.Status == parsedStatus);
        }

        var claims = await query
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync(ct);

        var dtos = claims.Select(MapToDto).ToList();
        return Result.Success<IReadOnlyList<SubsidyClaimDto>>(dtos);
    }

    public async Task<Result<SubsidyClaimDto>> GetByInstallationIdAsync(int installationId, CancellationToken ct = default)
    {
        var claim = await db.SubsidyClaims
            .Include(s => s.Installation)
                .ThenInclude(i => i.Customer)
            .Include(s => s.Installation)
                .ThenInclude(i => i.Address)
            .Include(s => s.Installation)
                .ThenInclude(i => i.Quotes)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.InstallationId == installationId, ct);

        if (claim == null)
        {
            return Result.Failure<SubsidyClaimDto>(SubsidyErrors.NotFound(installationId));
        }

        return Result.Success(MapToDto(claim));
    }

    public async Task<Result<SubsidyClaimDto>> CreateOrUpdateClaimAsync(int installationId, CreateSubsidyClaimRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.ApplicationReference))
            return Result.Failure<SubsidyClaimDto>(SubsidyErrors.ReferenceRequired);

        var installation = await db.Installations
            .Include(i => i.Customer)
            .Include(i => i.Address)
            .Include(i => i.Quotes)
            .Include(i => i.SubsidyClaim)
            .FirstOrDefaultAsync(i => i.Id == installationId, ct);

        if (installation == null)
            return Result.Failure<SubsidyClaimDto>(SubsidyErrors.InstallationNotFound);

        var activeQuote = installation.Quotes
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefault();

        if (activeQuote?.SystemType == SolarSystemType.OffGrid)
            return Result.Failure<SubsidyClaimDto>(SubsidyErrors.OffGridNotEligible);

        var subsidyAmount = request.SubsidyAmountRupees ?? activeQuote?.EstimatedSubsidyRupees ?? 78000m;

        var claim = installation.SubsidyClaim;
        var now = DateTime.UtcNow;

        if (claim == null)
        {
            claim = new SubsidyClaim
            {
                InstallationId = installationId,
                SubsidyAmountRupees = subsidyAmount,
                ApplicationReference = request.ApplicationReference.Trim(),
                Status = SubsidyClaimStatus.DocumentsSubmitted,
                SubmittedAt = now,
                Notes = request.Notes?.Trim()
            };
            db.SubsidyClaims.Add(claim);
        }
        else
        {
            claim.ApplicationReference = request.ApplicationReference.Trim();
            claim.SubsidyAmountRupees = subsidyAmount;
            if (!string.IsNullOrWhiteSpace(request.Notes))
                claim.Notes = request.Notes.Trim();
        }

        await db.SaveChangesAsync(ct);

        // Reload for complete mapping
        claim.Installation = installation;
        return Result.Success(MapToDto(claim));
    }

    public async Task<Result<SubsidyClaimDto>> UpdateStatusAsync(int id, UpdateSubsidyStatusRequest request, CancellationToken ct = default)
    {
        if (!Enum.TryParse<SubsidyClaimStatus>(request.Status, true, out var newStatus))
            return Result.Failure<SubsidyClaimDto>(SubsidyErrors.InvalidStatus);

        var claim = await db.SubsidyClaims
            .Include(s => s.Installation)
                .ThenInclude(i => i.Customer)
            .Include(s => s.Installation)
                .ThenInclude(i => i.Address)
            .Include(s => s.Installation)
                .ThenInclude(i => i.Quotes)
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (claim == null)
            return Result.Failure<SubsidyClaimDto>(SubsidyErrors.NotFound(id));

        var now = DateTime.UtcNow;
        claim.Status = newStatus;

        if (newStatus == SubsidyClaimStatus.InspectionCleared && !claim.ClearedAt.HasValue)
        {
            claim.ClearedAt = now;
        }
        else if (newStatus == SubsidyClaimStatus.Disbursed)
        {
            claim.DisbursedAt = now;
            if (!string.IsNullOrWhiteSpace(request.DisbursementReference))
                claim.DisbursementReference = request.DisbursementReference.Trim();
            if (!claim.ClearedAt.HasValue)
                claim.ClearedAt = now;
        }

        if (!string.IsNullOrWhiteSpace(request.Notes))
            claim.Notes = request.Notes.Trim();

        await db.SaveChangesAsync(ct);
        return Result.Success(MapToDto(claim));
    }

    private static SubsidyClaimDto MapToDto(SubsidyClaim s)
    {
        var quote = s.Installation.Quotes.OrderByDescending(q => q.CreatedAt).FirstOrDefault();
        return new SubsidyClaimDto(
            s.Id,
            s.InstallationId,
            s.Installation.Customer?.FullName ?? "Customer",
            s.Installation.Customer?.PhoneNumber ?? "",
            s.Installation.Customer?.NormalizedEmail ?? "",
            s.Installation.Address?.Street ?? "",
            s.Installation.Address?.City ?? "",
            s.Installation.Address?.State ?? "",
            quote?.SystemCapacityKw ?? 3.0m,
            quote?.SystemType.ToString() ?? "OnGrid",
            s.SubsidyAmountRupees,
            s.ApplicationReference,
            s.Status.ToString(),
            s.SubmittedAt,
            s.ClearedAt,
            s.DisbursedAt,
            s.DisbursementReference,
            s.Notes
        );
    }
}
