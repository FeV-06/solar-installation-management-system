using Application.DTOs.Common;
using Application.DTOs.Survey;
using Application.Errors;
using Application.Interfaces.Services;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Security;

namespace WebAPI.Controllers;

/// <summary>Site surveys: office scheduling and review, and reports by the assigned technician.</summary>
[Route("api/surveys")]
[Authorize(Policy = Policies.Staff)]
public class SurveysController(ISurveyService service) : ApiControllerBase
{
    private bool IsAdmin => User.IsInRole(nameof(UserRole.Admin));

    [HttpGet]
    public async Task<ActionResult<PagedResponse<SurveyResponse>>> GetPage([FromQuery] SurveyPageRequest request)
    {
        if (CurrentUserId is not { } me) return Problem(AuthErrors.SignedOut);
        return Ok(await service.GetPageAsync(request, me, IsAdmin));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SurveyResponse>> GetById(int id)
    {
        if (CurrentUserId is not { } me) return Problem(AuthErrors.SignedOut);
        var result = await service.GetAsync(id, me, IsAdmin);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPost("/api/installations/{installationId:int}/surveys")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<ActionResult<SurveyResponse>> Schedule(int installationId, [FromBody] ScheduleSurveyRequest request)
    {
        if (CurrentUserId is not { } me) return Problem(AuthErrors.SignedOut);
        var result = await service.ScheduleAsync(installationId, request, me);
        return result.IsSuccess ? CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value) : Problem(result.Error);
    }

    [HttpPut("{id:int}/schedule")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<ActionResult<SurveyResponse>> Reschedule(int id, [FromBody] ScheduleSurveyRequest request)
    {
        if (CurrentUserId is not { } me) return Problem(AuthErrors.SignedOut);
        var result = await service.RescheduleAsync(id, request, me);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPut("{id:int}/report")]
    [Authorize(Policy = Policies.Technician)]
    public async Task<ActionResult<SurveyResponse>> Submit(int id, [FromBody] SubmitSurveyReportRequest request)
    {
        if (CurrentUserId is not { } me) return Problem(AuthErrors.SignedOut);
        var result = await service.SubmitAsync(id, request, me);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPost("{id:int}/review")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<ActionResult<SurveyResponse>> Review(int id, [FromBody] ReviewSurveyRequest request)
    {
        if (CurrentUserId is not { } me) return Problem(AuthErrors.SignedOut);
        var result = await service.ReviewAsync(id, request, me);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }
}
