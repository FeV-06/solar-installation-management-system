using Application.Common.Models;
using Application.DTOs.Financial;

namespace Application.Interfaces.Services;

public interface IFinancialService
{
    Task<Result<DirectorOverviewDto>> GetOverviewAsync(string? period = null, CancellationToken ct = default);
    Task<Result<string>> GenerateCsvExportAsync(string? period = null, CancellationToken ct = default);
}
