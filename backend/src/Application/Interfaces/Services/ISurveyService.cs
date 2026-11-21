using Application.Common.Models;
using Application.DTOs.Common;
using Application.DTOs.Survey;

namespace Application.Interfaces.Services;

public interface ISurveyService
{
    Task<PagedResponse<SurveyResponse>> GetPageAsync(SurveyPageRequest request, int userId, bool isAdmin);
    Task<Result<SurveyResponse>> GetAsync(int id, int userId, bool isAdmin);
    Task<Result<SurveyResponse>> ScheduleAsync(int installationId, ScheduleSurveyRequest request, int userId);
    Task<Result<SurveyResponse>> RescheduleAsync(int id, ScheduleSurveyRequest request, int userId);
    Task<Result<SurveyResponse>> SubmitAsync(int id, SubmitSurveyReportRequest request, int userId);
    Task<Result<SurveyResponse>> ReviewAsync(int id, ReviewSurveyRequest request, int userId);
}
