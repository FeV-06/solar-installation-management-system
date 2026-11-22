using Application.Common.Models;

namespace Application.Errors;

public static class SubsidyErrors
{
    public static Error NotFound(int id) =>
        new(ErrorKind.NotFound, "subsidy.not_found", $"Subsidy claim #{id} not found.");

    public static readonly Error InstallationNotFound =
        new(ErrorKind.NotFound, "subsidy.installation_not_found", "The specified installation was not found.");

    public static readonly Error OffGridNotEligible =
        new(ErrorKind.Conflict, "subsidy.off_grid_ineligible", "Off-grid systems are not eligible for PM Surya Ghar central subsidy.");

    public static readonly Error InvalidStatus =
        new(ErrorKind.Conflict, "subsidy.invalid_status", "Invalid subsidy status transition.");

    public static readonly Error ReferenceRequired =
        new(ErrorKind.Invalid, "subsidy.reference_required", "Application reference is required.", "ApplicationReference");
}
