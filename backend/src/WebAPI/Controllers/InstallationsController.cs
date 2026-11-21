using Application.DTOs.Installations;
using Application.Errors;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI.Security;

namespace WebAPI.Controllers;

/// <summary>Read installations and submit field completion proofs for the office & technician workflow.</summary>
[Route("api/installations")]
[Authorize(Policy = Policies.Staff)]
public class InstallationsController(IInstallationRepo installations, AppDbContext context) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InstallationResponse>>> GetAll()
    {
        var items = await installations.GetAllWithSiteAsync();
        return Ok(items.Select(InstallationResponse.From).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<InstallationResponse>> GetById(int id)
    {
        var installation = await installations.GetWithSiteAsync(id);
        return installation is null ? Problem(SurveyErrors.InstallationNotFound(id)) : Ok(InstallationResponse.From(installation));
    }

    [HttpGet("{id:int}/proof")]
    public async Task<ActionResult<InstallationProofResponse>> GetProof(int id)
    {
        var proof = await context.InstallationProofs
            .Include(p => p.Technician)
            .FirstOrDefaultAsync(p => p.InstallationId == id);

        return proof is null ? NotFound() : Ok(InstallationProofResponse.From(proof));
    }

    [HttpPost("{id:int}/proof")]
    public async Task<ActionResult<InstallationProofResponse>> SubmitProof(int id, [FromBody] SubmitInstallationProofRequest request)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);

        var installation = await context.Installations
            .Include(i => i.Proof)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (installation is null)
            return Problem(SurveyErrors.InstallationNotFound(id));

        var technician = await context.Users.FindAsync(CurrentUserId.Value)
                         ?? await context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Technician)
                         ?? await context.Users.FirstAsync();

        var proof = installation.Proof;
        if (proof is null)
        {
            proof = new InstallationProof
            {
                InstallationId = id,
                TechnicianId = technician.Id,
                Technician = technician,
                WorkStartedAt = request.WorkStartedAt == default ? DateTime.UtcNow.AddHours(-6.75) : request.WorkStartedAt,
                WorkCompletedAt = request.WorkCompletedAt == default ? DateTime.UtcNow : request.WorkCompletedAt,
                SystemCapacityKw = request.SystemCapacityKw > 0 ? request.SystemCapacityKw : 3.3m,
                TestedGenerationKw = request.TestedGenerationKw > 0 ? request.TestedGenerationKw : 2.85m,
                GridConnected = request.GridConnected,
                PanelArrayPhotoUrl = request.PanelArrayPhotoUrl,
                InverterPhotoUrl = request.InverterPhotoUrl,
                MeterPhotoUrl = request.MeterPhotoUrl,
                CustomerSignatureData = request.CustomerSignatureData,
                SignedByName = string.IsNullOrWhiteSpace(request.SignedByName) ? "Customer" : request.SignedByName,
                SignedAt = request.SignedAt == default ? DateTime.UtcNow : request.SignedAt,
                CreatedAt = DateTime.UtcNow
            };
            context.InstallationProofs.Add(proof);
        }
        else
        {
            proof.WorkStartedAt = request.WorkStartedAt;
            proof.WorkCompletedAt = request.WorkCompletedAt;
            proof.SystemCapacityKw = request.SystemCapacityKw;
            proof.TestedGenerationKw = request.TestedGenerationKw;
            proof.GridConnected = request.GridConnected;
            if (!string.IsNullOrEmpty(request.PanelArrayPhotoUrl)) proof.PanelArrayPhotoUrl = request.PanelArrayPhotoUrl;
            if (!string.IsNullOrEmpty(request.InverterPhotoUrl)) proof.InverterPhotoUrl = request.InverterPhotoUrl;
            if (!string.IsNullOrEmpty(request.MeterPhotoUrl)) proof.MeterPhotoUrl = request.MeterPhotoUrl;
            if (!string.IsNullOrEmpty(request.CustomerSignatureData)) proof.CustomerSignatureData = request.CustomerSignatureData;
            proof.SignedByName = request.SignedByName;
            proof.SignedAt = request.SignedAt;
        }

        installation.Status = InstallationStatus.Active;
        await context.SaveChangesAsync();

        return Ok(InstallationProofResponse.From(proof));
    }
}
