using Application.Interfaces.Repositories;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Infrastructure.Repositories.Base;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class LeadRepo(AppDbContext context) : GenericRepo<Lead>(context), ILeadRepo
{
    public Task<(IReadOnlyList<Lead> Items, int TotalCount)> GetPageAsync(
        IReadOnlyCollection<LeadStatus> statuses, int skip, int take) =>
        GetPageAsync(statuses, null, skip, take);

    public async Task<(IReadOnlyList<Lead> Items, int TotalCount)> GetPageAsync(IReadOnlyCollection<LeadStatus> statuses,
        string? search, int skip, int take)
    {
        // IDs grow with creation, so the highest ID is the newest lead.
        var query = Context.Leads
            .Include(x => x.Address)
            .AsNoTracking();

        if (statuses.Count > 0)
        {
            query = query.Where(x => statuses.Contains(x.Status));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim().Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_")}%";
            query = query.Where(x => EF.Functions.ILike(x.FirstName + " " + x.LastName, pattern, @"\")
                                     || EF.Functions.ILike(x.Email, pattern, @"\")
                                     || EF.Functions.ILike(x.PhoneNumber, pattern, @"\")
                                     || EF.Functions.ILike(x.Address.Street + " " + x.Address.City, pattern, @"\"));
        }

        var ordered = query.OrderByDescending(x => x.Id);
        return await ToPageAsync(ordered, skip, take);
    }

    public override async Task<Lead?> GetByIdAsync(int id)
    {
        return await Context.Leads
            .Include(x => x.Customer)
            .Include(x => x.Address)
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<int?> FindOpenIdByEmailAsync(string email, int? exceptId = null)
    {
        var normalized = Emails.Normalize(email);
        return await Context.Leads
            .Where(x => (x.Status == LeadStatus.New || x.Status == LeadStatus.Contacted)
                        && x.Email.Trim().ToUpper() == normalized
                        && x.Id != exceptId)
            .OrderBy(x => x.Id)
            .Select(x => (int?)x.Id)
            .FirstOrDefaultAsync();
    }
}
