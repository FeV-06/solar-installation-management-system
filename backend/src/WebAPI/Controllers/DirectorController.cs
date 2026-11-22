using System.Text;
using Application.DTOs.Financial;
using Application.Errors;
using Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Security;

namespace WebAPI.Controllers;

/// <summary>
/// Executive financial operations and month-end unit economics dashboard (Scene 6).
/// Restricted exclusively to Directors / Office Admins.
/// </summary>
[Route("api/director")]
[Authorize(Policy = Policies.Admin)]
public class DirectorController(IFinancialService financialService) : ApiControllerBase
{
    [HttpGet("overview")]
    public async Task<ActionResult<DirectorOverviewDto>> GetOverview([FromQuery] string? period, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await financialService.GetOverviewAsync(period, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv([FromQuery] string? period, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await financialService.GenerateCsvExportAsync(period, ct);
        if (!result.IsSuccess) return Problem(result.Error);

        var fileName = $"sol-director-financials-{period ?? "all"}-{DateTime.UtcNow:yyyyMMdd}.csv";
        return File(Encoding.UTF8.GetBytes(result.Value), "text/csv", fileName);
    }
}
