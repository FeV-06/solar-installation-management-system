using Application.Interfaces.Repositories;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Infrastructure.Repositories.Base;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class SurveyRepo(AppDbContext context) : GenericRepo<Survey>(context), ISurveyRepo
{
    public Task<Survey?> GetVisibleAsync(int id, int userId, bool isAdmin) =>
        Context.Surveys.Include(s => s.Technician).Include(s => s.Installation).ThenInclude(i => i.Customer)
            .Include(s => s.Installation).ThenInclude(i => i.Address)
            .FirstOrDefaultAsync(s => s.Id == id && (isAdmin || s.TechnicianId == userId));

    public Task<(IReadOnlyList<Survey> Items, int TotalCount)> GetPageAsync(int userId, bool isAdmin, SurveyStatus? status, int skip, int take)
    {
        var query = Context.Surveys.AsNoTracking().Include(s => s.Technician)
            .Include(s => s.Installation).ThenInclude(i => i.Customer)
            .Include(s => s.Installation).ThenInclude(i => i.Address)
            .Where(s => (isAdmin || s.TechnicianId == userId) && (!status.HasValue || s.Status == status.Value))
            .OrderBy(s => s.ScheduledAt).ThenBy(s => s.Id);
        return ToPageAsync(query, skip, take);
    }

    public Task<bool> HasActiveForInstallationAsync(int installationId) =>
        Context.Surveys.AnyAsync(s => s.InstallationId == installationId && s.Status != SurveyStatus.Rejected);
}
