using Application.Errors;
using Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Security;

namespace WebAPI.Controllers;

/// <summary>
/// Real-time toggleable demo mode generating and tearing down 400+ fully-interconnected solar projects.
/// Available across all staff roles (Admin, Technician, Sales).
/// </summary>
[Route("api/demo")]
[Authorize(Policy = Policies.Staff)]
public class DemoController(IDemoDataService demoDataService) : ApiControllerBase
{
    [HttpGet("status")]
    public async Task<ActionResult<DemoStatusDto>> GetStatus(CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await demoDataService.GetStatusAsync(ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPost("enable")]
    public async Task<ActionResult<DemoStatusDto>> EnableDemo(CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await demoDataService.EnableDemoModeAsync(ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPost("disable")]
    public async Task<ActionResult<DemoStatusDto>> DisableDemo(CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await demoDataService.DisableDemoModeAsync(ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }
}
