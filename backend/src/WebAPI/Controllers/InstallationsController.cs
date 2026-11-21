using Application.DTOs.Installations;
using Application.Interfaces.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Security;

namespace WebAPI.Controllers;

/// <summary>Read installations for the office's workflow.</summary>
[Route("api/installations")]
[Authorize(Policy = Policies.Staff)]
public class InstallationsController(IInstallationRepo installations) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InstallationResponse>>> GetAll()
    {
        var items = await installations.GetAllWithSiteAsync();
        return Ok(items.Select(InstallationResponse.From).ToList());
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<ActionResult<InstallationResponse>> GetById(int id)
    {
        var installation = await installations.GetWithSiteAsync(id);
        return installation is null ? Problem(Application.Errors.SurveyErrors.InstallationNotFound(id)) : Ok(InstallationResponse.From(installation));
    }
}
