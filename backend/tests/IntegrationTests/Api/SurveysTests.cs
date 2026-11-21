using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Application.DTOs.Lead;
using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TestUtilities.Database;

namespace IntegrationTests.Api;

public class SurveysTests(PostgresFixture database) : ApiTestBase(database)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private static object Schedule(int technicianId) => new { technicianId, scheduledAt = "2026-11-24T10:00:00+05:30" };
    private static object Report() => new
    {
        shadowFreeRoofAreaSquareMetres = 40.5m, monthlyBillRupees = 1200.75m, gridSuitable = true,
        roofDirectionDegrees = 180m, roofTiltDegrees = 25m, cableDistanceMetres = 12.5m, notes = "Measured on site"
    };

    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>(Ct);

    private async Task<int> CreateInstallation(HttpClient admin)
    {
        var created = await CreateClient().PostAsJsonAsync("/api/leads", ErrorResponseTests.ValidLead(), Ct);
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var leadId = (await Json(created)).GetProperty("id").GetInt32();
        var contacted = await admin.PutAsJsonAsync($"/api/leads/{leadId}/status", new UpdateLeadStatusRequest { Status = "Contacted" }, Ct);
        contacted.StatusCode.Should().Be(HttpStatusCode.OK);
        var converted = await admin.PostAsync($"/api/leads/{leadId}/convert", null, Ct);
        converted.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await Json(converted)).GetProperty("installationId").GetInt32();
    }

    private async Task<int> CreateSurvey(HttpClient admin, int installationId, int technicianId)
    {
        var response = await admin.PostAsJsonAsync($"/api/installations/{installationId}/surveys", Schedule(technicianId), Ct);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await Json(response)).GetProperty("id").GetInt32();
    }

    private async Task<HttpClient> OtherTechnician()
    {
        var other = new User
        {
            Name = "Other Technician", Email = "other.tech@sol.test", NormalizedEmail = User.NormalizeEmail("other.tech@sol.test"),
            PasswordHash = "not used", Role = UserRole.Technician, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        await SeedAsync(other);
        await using var scope = ApiServices.CreateAsyncScope();
        var token = scope.ServiceProvider.GetRequiredService<ISessionTokenIssuer>().Issue(other).Token;
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task InstallationDetailsAndSurveyFilter_RespectRoleAndProject()
    {
        var admin = await CreateClientAsAsync(UserRole.Admin);
        var technician = await CreateClientAsAsync(UserRole.Technician);
        var technicianId = await IdOfAsync(TestTechnician.Email);
        var installationId = await CreateInstallation(admin);
        var surveyId = await CreateSurvey(admin, installationId, technicianId);
        var details = await admin.GetAsync($"/api/installations/{installationId}", Ct);
        details.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(details)).GetProperty("customerName").GetString().Should().Be("Jane Doe");
        (await technician.GetAsync($"/api/installations/{installationId}", Ct)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await admin.GetAsync("/api/installations/9999", Ct)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var page = await Json(await admin.GetAsync($"/api/surveys?installationId={installationId}", Ct));
        page.GetProperty("items").EnumerateArray().Single().GetProperty("id").GetInt32().Should().Be(surveyId);
        (await Json(await admin.GetAsync("/api/surveys?installationId=9999", Ct))).GetProperty("totalCount").GetInt32().Should().Be(0);
        (await admin.GetAsync("/api/surveys?installationId=0", Ct)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var other = await OtherTechnician();
        (await Json(await other.GetAsync($"/api/surveys?installationId={installationId}", Ct))).GetProperty("totalCount").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task CustomerToApprovedSurvey_PersistsAndMovesInstallationToDesign()
    {
        var admin = await CreateClientAsAsync(UserRole.Admin);
        var technician = await CreateClientAsAsync(UserRole.Technician);
        var technicianId = await IdOfAsync(TestTechnician.Email);
        var adminId = await IdOfAsync(TestAdmin.Email);
        var installationId = await CreateInstallation(admin);
        var surveyId = await CreateSurvey(admin, installationId, technicianId);

        var queue = await technician.GetAsync("/api/surveys?status=Scheduled", Ct);
        queue.StatusCode.Should().Be(HttpStatusCode.OK);
        var item = (await Json(queue)).GetProperty("items").EnumerateArray().Single();
        item.GetProperty("id").GetInt32().Should().Be(surveyId);
        item.GetProperty("customerName").GetString().Should().Be("Jane Doe");
        item.GetProperty("address").GetProperty("street").GetString().Should().Be("100 Congress Ave");
        item.GetProperty("scheduledAt").GetDateTime().Should().Be(new DateTime(2026, 11, 24, 4, 30, 0, DateTimeKind.Utc));

        var submitted = await technician.PutAsJsonAsync($"/api/surveys/{surveyId}/report", Report(), Ct);
        submitted.StatusCode.Should().Be(HttpStatusCode.OK);
        var report = await Json(submitted);
        report.GetProperty("status").GetString().Should().Be("Submitted");
        report.GetProperty("submittedById").GetInt32().Should().Be(technicianId);
        report.GetProperty("gridSuitable").GetBoolean().Should().BeTrue();
        var reviewed = await admin.PostAsJsonAsync($"/api/surveys/{surveyId}/review", new { approved = true, notes = "Approved" }, Ct);
        reviewed.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await Json(reviewed);
        result.GetProperty("status").GetString().Should().Be("Approved");
        result.GetProperty("reviewedById").GetInt32().Should().Be(adminId);
        result.GetProperty("reviewNotes").GetString().Should().Be("Approved");
        var persisted = await Context.Surveys.AsNoTracking().Include(s => s.Installation).SingleAsync(Ct);
        persisted.Status.Should().Be(SurveyStatus.Approved);
        persisted.Installation.Status.Should().Be(InstallationStatus.Design);
        persisted.MonthlyBillRupees.Should().Be(1200.75m);
        persisted.SubmittedAt.Should().NotBeNull();
        persisted.ReviewedAt.Should().NotBeNull();
        (await admin.PostAsJsonAsync($"/api/surveys/{surveyId}/review", new { approved = true }, Ct)).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UnassignedTechnician_CannotReadOrSubmitAnotherPersonsSurvey()
    {
        var admin = await CreateClientAsAsync(UserRole.Admin);
        var assigned = await CreateClientAsAsync(UserRole.Technician);
        var id = await IdOfAsync(TestTechnician.Email);
        var installationId = await CreateInstallation(admin);
        var surveyId = await CreateSurvey(admin, installationId, id);
        var other = await OtherTechnician();
        (await other.GetAsync($"/api/surveys/{surveyId}", Ct)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await other.PutAsJsonAsync($"/api/surveys/{surveyId}/report", Report(), Ct)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await Json(await other.GetAsync("/api/surveys", Ct))).GetProperty("totalCount").GetInt32().Should().Be(0);
        (await assigned.PostAsJsonAsync($"/api/surveys/{surveyId}/review", new { approved = true }, Ct)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await CreateClient().GetAsync($"/api/surveys/{surveyId}", Ct)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ValidationAndStateTransitions_AreEnforced()
    {
        var admin = await CreateClientAsAsync(UserRole.Admin);
        var technician = await CreateClientAsAsync(UserRole.Technician);
        var technicianId = await IdOfAsync(TestTechnician.Email);
        var adminId = await IdOfAsync(TestAdmin.Email);
        var installationId = await CreateInstallation(admin);
        (await admin.PostAsJsonAsync("/api/installations/9999/surveys", Schedule(technicianId), Ct)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await admin.PostAsJsonAsync($"/api/installations/{installationId}/surveys", Schedule(adminId), Ct)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await admin.PostAsJsonAsync($"/api/installations/{installationId}/surveys", new { technicianId }, Ct)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var surveyId = await CreateSurvey(admin, installationId, technicianId);
        (await admin.PostAsJsonAsync($"/api/installations/{installationId}/surveys", Schedule(technicianId), Ct)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await admin.PostAsJsonAsync($"/api/surveys/{surveyId}/review", new { approved = true }, Ct)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await technician.PutAsJsonAsync($"/api/surveys/{surveyId}/report", new { }, Ct)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await technician.PutAsJsonAsync($"/api/surveys/{surveyId}/report", new
        {
            shadowFreeRoofAreaSquareMetres = -1, monthlyBillRupees = -1, gridSuitable = true,
            roofDirectionDegrees = 360, roofTiltDegrees = 91, cableDistanceMetres = 0
        }, Ct)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await admin.GetAsync("/api/surveys?status=NOT_A_STATUS", Ct)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await technician.PutAsJsonAsync($"/api/surveys/{surveyId}/report", Report(), Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await admin.PostAsJsonAsync($"/api/surveys/{surveyId}/review", new { }, Ct)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await admin.PutAsJsonAsync($"/api/surveys/{surveyId}/schedule", Schedule(technicianId), Ct)).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Rejection_RetainsHistoryAndAllowsNewVisit()
    {
        var admin = await CreateClientAsAsync(UserRole.Admin);
        var technician = await CreateClientAsAsync(UserRole.Technician);
        var technicianId = await IdOfAsync(TestTechnician.Email);
        var installationId = await CreateInstallation(admin);
        var surveyId = await CreateSurvey(admin, installationId, technicianId);
        (await technician.PutAsJsonAsync($"/api/surveys/{surveyId}/report", Report(), Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
        var review = await admin.PostAsJsonAsync($"/api/surveys/{surveyId}/review", new { approved = false, notes = "Revisit" }, Ct);
        review.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(review)).GetProperty("status").GetString().Should().Be("Rejected");
        var anotherId = await CreateSurvey(admin, installationId, technicianId);
        anotherId.Should().NotBe(surveyId);
        (await Context.Surveys.CountAsync(Ct)).Should().Be(2);
        (await Context.Installations.AsNoTracking().SingleAsync(Ct)).Status.Should().Be(InstallationStatus.Survey);
    }
}
