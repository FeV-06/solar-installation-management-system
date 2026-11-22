using Application.Common.Models;
using Application.DTOs.Subsidy;

namespace Application.Interfaces.Services;

public interface ISubsidyService
{
    Task<Result<IReadOnlyList<SubsidyClaimDto>>> GetAllAsync(string? status = null, CancellationToken ct = default);
    Task<Result<SubsidyClaimDto>> GetByInstallationIdAsync(int installationId, CancellationToken ct = default);
    Task<Result<SubsidyClaimDto>> CreateOrUpdateClaimAsync(int installationId, CreateSubsidyClaimRequest request, CancellationToken ct = default);
    Task<Result<SubsidyClaimDto>> UpdateStatusAsync(int id, UpdateSubsidyStatusRequest request, CancellationToken ct = default);
}
