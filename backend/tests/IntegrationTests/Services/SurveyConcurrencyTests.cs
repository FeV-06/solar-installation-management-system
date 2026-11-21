using Application.Common.Models;
using Application.DTOs.Survey;
using Application.Services;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Data;
using Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using TestUtilities.Base;
using TestUtilities.Database;
using TestUtilities.Factories;

namespace IntegrationTests.Services;

public class SurveyConcurrencyTests(PostgresFixture database) : IntegrationTestBase(database)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ParallelScheduling_SavesExactlyOneSurvey()
    {
        var (installation, admin, technician) = await SeedProjectAsync();
        var contexts = Enumerable.Range(0, 8).Select(_ => CreateContext()).ToList();
        using var start = new SemaphoreSlim(0);
        var calls = contexts.Select(context => Task.Run(async () =>
        {
            await start.WaitAsync(Ct);
            return await Service(context).ScheduleAsync(installation.Id,
                new ScheduleSurveyRequest { TechnicianId = technician.Id, ScheduledAt = DateTimeOffset.UtcNow.AddDays(1) }, admin.Id);
        }, Ct)).ToArray();
        start.Release(contexts.Count);
        var results = await Task.WhenAll(calls);
        results.Count(r => r.IsSuccess).Should().Be(1);
        results.Where(r => !r.IsSuccess).Should().OnlyContain(r => r.Error!.Code == "survey.already_exists");
        (await Context.Surveys.CountAsync(Ct)).Should().Be(1);
        foreach (var context in contexts) await context.DisposeAsync();
    }

    [Fact]
    public async Task StaleSurveyUpdate_ConflictsInsteadOfOverwritingReport()
    {
        var (installation, admin, technician) = await SeedProjectAsync();
        var survey = new Survey
        {
            InstallationId = installation.Id, TechnicianId = technician.Id, CreatedById = admin.Id,
            ScheduledAt = DateTime.UtcNow.AddDays(1), CreatedAt = DateTime.UtcNow, Status = SurveyStatus.Scheduled
        };
        await SeedAsync(survey);
        await using var first = CreateContext();
        await using var second = CreateContext();
        var one = await new SurveyRepo(first).GetVisibleAsync(survey.Id, admin.Id, true);
        var two = await new SurveyRepo(second).GetVisibleAsync(survey.Id, admin.Id, true);
        one!.Status = SurveyStatus.Submitted;
        one.Notes = "first writer";
        one.Version++;
        (await new UnitOfWork(first).SaveAsync(Ct)).Should().Be(SaveOutcome.Saved);
        two!.Notes = "stale writer";
        two.Version++;
        (await new UnitOfWork(second).SaveAsync(Ct)).Should().Be(SaveOutcome.Conflict);
        var saved = await Context.Surveys.AsNoTracking().SingleAsync(Ct);
        (saved.Status, saved.Notes, saved.Version).Should().Be((SurveyStatus.Submitted, "first writer", 2));
    }

    [Fact]
    public async Task CompetingReview_UpdatesSurveyAndInstallationAtomically()
    {
        var (installation, admin, technician) = await SeedProjectAsync();
        var survey = new Survey
        {
            InstallationId = installation.Id, TechnicianId = technician.Id, CreatedById = admin.Id,
            ScheduledAt = DateTime.UtcNow.AddDays(1), CreatedAt = DateTime.UtcNow, Status = SurveyStatus.Submitted
        };
        await SeedAsync(survey);
        await using var first = CreateContext();
        await using var second = CreateContext();
        var one = await new SurveyRepo(first).GetVisibleAsync(survey.Id, admin.Id, true);
        var two = await new SurveyRepo(second).GetVisibleAsync(survey.Id, admin.Id, true);
        one!.Status = SurveyStatus.Approved;
        one.Installation.Status = InstallationStatus.Design;
        one.Version++;
        (await new UnitOfWork(first).SaveAsync(Ct)).Should().Be(SaveOutcome.Saved);
        two!.Status = SurveyStatus.Rejected;
        two.Version++;
        (await new UnitOfWork(second).SaveAsync(Ct)).Should().Be(SaveOutcome.Conflict);
        var saved = await Context.Surveys.AsNoTracking().Include(s => s.Installation).SingleAsync(Ct);
        (saved.Status, saved.Installation.Status).Should().Be((SurveyStatus.Approved, InstallationStatus.Design));
    }

    private static SurveyService Service(AppDbContext context) => new(new SurveyRepo(context), new InstallationRepo(context),
        new UserRepo(context), new UnitOfWork(context), new QuoteTemplateEngine(), TimeProvider.System);

    private async Task<(Installation Installation, User Admin, User Technician)> SeedProjectAsync()
    {
        var admin = new User { Name = "Admin", Email = "admin@example.test", NormalizedEmail = "ADMIN@EXAMPLE.TEST", PasswordHash = "not used", Role = UserRole.Admin, IsActive = true, CreatedAt = DateTime.UtcNow };
        var technician = new User { Name = "Technician", Email = "tech@example.test", NormalizedEmail = "TECH@EXAMPLE.TEST", PasswordHash = "not used", Role = UserRole.Technician, IsActive = true, CreatedAt = DateTime.UtcNow };
        await SeedAsync(admin, technician);
        var address = AddressFactory.CreateFakeAddress(id: 0, state: "TX");
        var lead = LeadFactory.CreateFakeLead(id: 0, status: LeadStatus.Converted, address: address);
        var customer = Customer.FromLead(lead, DateTime.UtcNow);
        await SeedAsync(lead);
        customer.ContactAddressId = address.Id;
        await SeedAsync(customer);
        var installation = Installation.ForConvertedLead(lead, customer.Id, "America/Chicago", DateTime.UtcNow);
        await SeedAsync(installation);
        return (installation, admin, technician);
    }
}
