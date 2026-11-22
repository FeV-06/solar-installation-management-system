using Application.DTOs.Subsidy;
using Application.Errors;
using Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Security;

namespace WebAPI.Controllers;

/// <summary>
/// PM Surya Ghar central government rooftop solar subsidy claims pipeline.
/// </summary>
[Route("api")]
[Authorize(Policy = Policies.Staff)]
public class SubsidiesController(ISubsidyService subsidyService) : ApiControllerBase
{
    [HttpGet("subsidies")]
    public async Task<ActionResult<IReadOnlyList<SubsidyClaimDto>>> GetAll([FromQuery] string? status, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await subsidyService.GetAllAsync(status, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpGet("installations/{installationId:int}/subsidy")]
    public async Task<ActionResult<SubsidyClaimDto>> GetByInstallation(int installationId, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await subsidyService.GetByInstallationIdAsync(installationId, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPost("installations/{installationId:int}/subsidy")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<ActionResult<SubsidyClaimDto>> CreateOrUpdate(
        int installationId,
        [FromBody] CreateSubsidyClaimRequest request,
        CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await subsidyService.CreateOrUpdateClaimAsync(installationId, request, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPut("subsidies/{id:int}/status")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<ActionResult<SubsidyClaimDto>> UpdateStatus(
        int id,
        [FromBody] UpdateSubsidyStatusRequest request,
        CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await subsidyService.UpdateStatusAsync(id, request, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }
}
