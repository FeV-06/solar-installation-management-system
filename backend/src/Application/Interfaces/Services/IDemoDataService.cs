using Application.Common.Models;

namespace Application.Interfaces.Services;

public record DemoStatusDto(
    bool IsEnabled,
    int TotalDemoProjects,
    int DemoLeadsCount,
    int DemoCustomersCount,
    int DemoInstallationsCount
);

public interface IDemoDataService
{
    Task<Result<DemoStatusDto>> GetStatusAsync(CancellationToken ct = default);
    Task<Result<DemoStatusDto>> EnableDemoModeAsync(CancellationToken ct = default);
    Task<Result<DemoStatusDto>> DisableDemoModeAsync(CancellationToken ct = default);
}
