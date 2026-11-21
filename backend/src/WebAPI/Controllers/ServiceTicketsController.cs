using Application.DTOs.ServiceTickets;
using Application.Errors;
using Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Security;

namespace WebAPI.Controllers;

/// <summary>
/// Breakdown and warranty claims management for post-sales support (Scene 5).
/// </summary>
[Route("api/service-tickets")]
[Authorize(Policy = Policies.Staff)]
public class ServiceTicketsController(IServiceTicketService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ServiceTicketDto>>> GetAll([FromQuery] string? status, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await service.GetAllAsync(status, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ServiceTicketDto>> GetById(int id, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await service.GetByIdAsync(id, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPut("{id:int}/review")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<ActionResult<ServiceTicketDto>> Review(int id, [FromBody] ReviewServiceTicketRequest request, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await service.ReviewTicketAsync(id, request, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPost("{id:int}/resolve")]
    public async Task<ActionResult<ServiceTicketDto>> Resolve(int id, [FromBody] ResolveServiceTicketRequest request, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await service.TechnicianResolveTicketAsync(id, CurrentUserId.Value, request, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }
}
