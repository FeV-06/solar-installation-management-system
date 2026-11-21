using Application.Interfaces.Repositories.Base;
using Domain.Entities;
using Domain.Enums;

namespace Application.Interfaces.Repositories;

public interface ISurveyRepo : IGenericRepo<Survey>
{
    Task<Survey?> GetVisibleAsync(int id, int userId, bool isAdmin);
    Task<(IReadOnlyList<Survey> Items, int TotalCount)> GetPageAsync(int userId, bool isAdmin, SurveyStatus? status, int? installationId, int skip, int take);
    Task<bool> HasActiveForInstallationAsync(int installationId);
}
