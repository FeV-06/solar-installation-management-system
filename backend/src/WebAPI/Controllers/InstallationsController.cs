using Application.DTOs.Installations;
using Application.Interfaces.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Security;

namespace WebAPI.Controllers;

/// <summary>Read one installation for the office's survey scheduling workflow.</summary>
[Route("api/installations")]
[Authorize(Policy = Policies.Admin)]
public class InstallationsController(IInstallationRepo installations) : ApiControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<ActionResult<InstallationResponse>> GetById(int id)
    {
        var installation = await installations.GetWithSiteAsync(id);
        return installation is null ? Problem(Application.Errors.SurveyErrors.InstallationNotFound(id)) : Ok(InstallationResponse.From(installation));
    }
}
