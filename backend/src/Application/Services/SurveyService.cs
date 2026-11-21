using Application.Common.Models;
using Application.DTOs.Common;
using Application.DTOs.Survey;
using Application.Errors;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public class SurveyService(
    ISurveyRepo surveys, IInstallationRepo installations, IUserRepo users, IUnitOfWork unitOfWork, TimeProvider time) : ISurveyService
{
    public async Task<PagedResponse<SurveyResponse>> GetPageAsync(SurveyPageRequest request, int userId, bool isAdmin)
    {
        var status = request.Status is null ? (SurveyStatus?)null : Enum.Parse<SurveyStatus>(request.Status);
        var (items, total) = await surveys.GetPageAsync(userId, isAdmin, status, request.InstallationId, request.Offset(), request.PageSize);
        return new PagedResponse<SurveyResponse>(items.Select(SurveyResponse.From).ToList(), request.Page, request.PageSize, total);
    }

    public async Task<Result<SurveyResponse>> GetAsync(int id, int userId, bool isAdmin)
    {
        var survey = await surveys.GetVisibleAsync(id, userId, isAdmin);
        return survey is null ? Result.Failure<SurveyResponse>(SurveyErrors.NotFound(id)) : Result.Success(SurveyResponse.From(survey));
    }

    public async Task<Result<SurveyResponse>> ScheduleAsync(int installationId, ScheduleSurveyRequest request, int userId)
    {
        var installation = await installations.GetWithSiteAsync(installationId);
        if (installation is null) return Result.Failure<SurveyResponse>(SurveyErrors.InstallationNotFound(installationId));
        if (installation.Status != InstallationStatus.Survey) return Result.Failure<SurveyResponse>(SurveyErrors.InstallationNotInSurvey);
        var technician = await users.GetByIdAsync(request.TechnicianId);
        if (!IsActiveTechnician(technician)) return Result.Failure<SurveyResponse>(SurveyErrors.InvalidTechnician);
        if (await surveys.HasActiveForInstallationAsync(installationId)) return Result.Failure<SurveyResponse>(SurveyErrors.ExistingSurvey);

        var survey = new Survey
        {
            InstallationId = installationId, Installation = installation, TechnicianId = technician!.Id, Technician = technician,
            ScheduledAt = request.ScheduledAt!.Value.UtcDateTime, Status = SurveyStatus.Scheduled,
            CreatedById = userId, CreatedAt = Now()
        };
        surveys.Add(survey);
        return await SaveAsync(survey);
    }

    public async Task<Result<SurveyResponse>> RescheduleAsync(int id, ScheduleSurveyRequest request, int userId)
    {
        var survey = await surveys.GetVisibleAsync(id, userId, isAdmin: true);
        if (survey is null) return Result.Failure<SurveyResponse>(SurveyErrors.NotFound(id));
        if (survey.Status != SurveyStatus.Scheduled) return Result.Failure<SurveyResponse>(SurveyErrors.InvalidState);
        var technician = await users.GetByIdAsync(request.TechnicianId);
        if (!IsActiveTechnician(technician)) return Result.Failure<SurveyResponse>(SurveyErrors.InvalidTechnician);
        survey.Technician = technician!;
        survey.TechnicianId = technician!.Id;
        survey.ScheduledAt = request.ScheduledAt!.Value.UtcDateTime;
        survey.Version++;
        return await SaveAsync(survey);
    }

    public async Task<Result<SurveyResponse>> SubmitAsync(int id, SubmitSurveyReportRequest request, int userId, bool isAdmin)
    {
        var survey = await surveys.GetVisibleAsync(id, userId, isAdmin);
        if (survey is null) return Result.Failure<SurveyResponse>(SurveyErrors.NotFound(id));
        if (survey.Status != SurveyStatus.Scheduled || survey.Installation.Status != InstallationStatus.Survey)
            return Result.Failure<SurveyResponse>(SurveyErrors.InvalidState);
        survey.ShadowFreeRoofAreaSquareMetres = request.ShadowFreeRoofAreaSquareMetres;
        survey.MonthlyBillRupees = request.MonthlyBillRupees;
        survey.GridSuitable = request.GridSuitable;
        survey.RoofDirectionDegrees = request.RoofDirectionDegrees;
        survey.RoofTiltDegrees = request.RoofTiltDegrees;
        survey.CableDistanceMetres = request.CableDistanceMetres;
        survey.Notes = NormalizeNotes(request.Notes);
        survey.SubmittedById = userId;
        survey.SubmittedAt = Now();
        survey.Status = SurveyStatus.Submitted;
        survey.Version++;
        return await SaveAsync(survey);
    }

    public async Task<Result<SurveyResponse>> ReviewAsync(int id, ReviewSurveyRequest request, int userId)
    {
        var survey = await surveys.GetVisibleAsync(id, userId, isAdmin: true);
        if (survey is null) return Result.Failure<SurveyResponse>(SurveyErrors.NotFound(id));
        if (survey.Status != SurveyStatus.Submitted || survey.Installation.Status != InstallationStatus.Survey)
            return Result.Failure<SurveyResponse>(SurveyErrors.InvalidState);
        survey.Status = request.Approved!.Value ? SurveyStatus.Approved : SurveyStatus.Rejected;
        survey.ReviewedById = userId;
        survey.ReviewedAt = Now();
        survey.ReviewNotes = NormalizeNotes(request.Notes);
        survey.Version++;
        if (request.Approved.Value) survey.Installation.Status = InstallationStatus.Design;
        return await SaveAsync(survey);
    }

    private async Task<Result<SurveyResponse>> SaveAsync(Survey survey) => (await unitOfWork.SaveAsync()) switch
    {
        SaveOutcome.Saved => Result.Success(SurveyResponse.From(survey)),
        SaveOutcome.Duplicate => Result.Failure<SurveyResponse>(SurveyErrors.ExistingSurvey),
        _ => Result.Failure<SurveyResponse>(SurveyErrors.Changed)
    };

    private static bool IsActiveTechnician(User? user) => user is { IsActive: true, Role: UserRole.Technician };
    private static string? NormalizeNotes(string? notes) => string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
    private DateTime Now() => time.GetUtcNow().UtcDateTime;
}
