using Application.DTOs.Common;

namespace Application.DTOs.Survey;

public sealed record SurveyResponse(
    int Id, int InstallationId, int CustomerId, string CustomerName, string CustomerPhone, AddressResponse Address,
    int TechnicianId, string TechnicianName, string Status,
    DateTime ScheduledAt, DateTime CreatedAt, int CreatedById,
    decimal? ShadowFreeRoofAreaSquareMetres, decimal? MonthlyBillRupees, bool? GridSuitable,
    decimal? RoofDirectionDegrees, decimal? RoofTiltDegrees, decimal? CableDistanceMetres, string? Notes,
    int? SubmittedById, DateTime? SubmittedAt, int? ReviewedById, DateTime? ReviewedAt, string? ReviewNotes, int Version)
{
    public static SurveyResponse From(Domain.Entities.Survey survey) => new(
        survey.Id, survey.InstallationId, survey.Installation.CustomerId, survey.Installation.Customer.FullName,
        survey.Installation.Customer.PhoneNumber, AddressResponse.From(survey.Installation.Address),
        survey.TechnicianId, survey.Technician.Name, survey.Status.ToString(),
        survey.ScheduledAt, survey.CreatedAt, survey.CreatedById,
        survey.ShadowFreeRoofAreaSquareMetres, survey.MonthlyBillRupees, survey.GridSuitable,
        survey.RoofDirectionDegrees, survey.RoofTiltDegrees, survey.CableDistanceMetres, survey.Notes,
        survey.SubmittedById, survey.SubmittedAt, survey.ReviewedById, survey.ReviewedAt, survey.ReviewNotes, survey.Version);
}
