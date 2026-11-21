using Domain.Enums;

namespace Domain.Entities;

/// <summary>One assigned site visit. Rejected visits remain as history; another visit can then be scheduled.</summary>
public class Survey
{
    public int Id { get; set; }
    public int InstallationId { get; set; }
    public Installation Installation { get; set; } = null!;
    public int TechnicianId { get; set; }
    public User Technician { get; set; } = null!;
    public DateTime ScheduledAt { get; set; }
    public SurveyStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public int CreatedById { get; set; }
    public decimal? ShadowFreeRoofAreaSquareMetres { get; set; }
    public decimal? MonthlyBillRupees { get; set; }
    public bool? GridSuitable { get; set; }
    public decimal? RoofDirectionDegrees { get; set; }
    public decimal? RoofTiltDegrees { get; set; }
    public decimal? CableDistanceMetres { get; set; }
    public string? Notes { get; set; }
    public int? SubmittedById { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int? ReviewedById { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNotes { get; set; }
    /// <summary>Optimistic concurrency token, incremented on each change.</summary>
    public int Version { get; set; } = 1;
}
