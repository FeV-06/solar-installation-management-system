using Application.DTOs.Common;

namespace Application.DTOs.Survey;

public sealed class SurveyPageRequest : PageRequest
{
    public string? Status { get; set; }
}

public sealed class ScheduleSurveyRequest
{
    public int TechnicianId { get; set; }
    public DateTimeOffset? ScheduledAt { get; set; }
}

public sealed class SubmitSurveyReportRequest
{
    public decimal? ShadowFreeRoofAreaSquareMetres { get; set; }
    public decimal? MonthlyBillRupees { get; set; }
    public bool? GridSuitable { get; set; }
    public decimal? RoofDirectionDegrees { get; set; }
    public decimal? RoofTiltDegrees { get; set; }
    public decimal? CableDistanceMetres { get; set; }
    public string? Notes { get; set; }
}

public sealed class ReviewSurveyRequest
{
    public bool? Approved { get; set; }
    public string? Notes { get; set; }
}
