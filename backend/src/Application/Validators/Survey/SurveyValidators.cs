using Application.DTOs.Survey;
using Application.Validators.Common;
using Domain.Enums;
using FluentValidation;

namespace Application.Validators.Survey;

public class SurveyPageRequestValidator : AbstractValidator<SurveyPageRequest>
{
    public SurveyPageRequestValidator()
    {
        Include(new PageRequestValidator());
        RuleFor(x => x.Status).IsEnumName(typeof(SurveyStatus), caseSensitive: true)
            .When(x => x.Status is not null)
            .WithMessage($"Status must be one of: {string.Join(", ", Enum.GetNames<SurveyStatus>())}");
        RuleFor(x => x.InstallationId).GreaterThan(0).When(x => x.InstallationId.HasValue);
    }
}

public class ScheduleSurveyRequestValidator : AbstractValidator<ScheduleSurveyRequest>
{
    public ScheduleSurveyRequestValidator()
    {
        RuleFor(x => x.TechnicianId).GreaterThan(0);
        RuleFor(x => x.ScheduledAt).NotNull();
    }
}

public class SubmitSurveyReportRequestValidator : AbstractValidator<SubmitSurveyReportRequest>
{
    public SubmitSurveyReportRequestValidator()
    {
        RuleFor(x => x.ShadowFreeRoofAreaSquareMetres).NotNull().GreaterThan(0).LessThanOrEqualTo(9999999999.99m).PrecisionScale(12, 2, true);
        RuleFor(x => x.MonthlyBillRupees).NotNull().GreaterThanOrEqualTo(0).LessThanOrEqualTo(9999999999.99m).PrecisionScale(12, 2, true);
        RuleFor(x => x.GridSuitable).NotNull();
        RuleFor(x => x.RoofDirectionDegrees).NotNull().GreaterThanOrEqualTo(0).LessThan(360).PrecisionScale(5, 2, true);
        RuleFor(x => x.RoofTiltDegrees).NotNull().InclusiveBetween(0, 90).PrecisionScale(4, 2, true);
        RuleFor(x => x.CableDistanceMetres).NotNull().GreaterThan(0).LessThanOrEqualTo(9999999999.99m).PrecisionScale(12, 2, true);
        RuleFor(x => x.Notes).MaximumLength(2000);
    }
}

public class ReviewSurveyRequestValidator : AbstractValidator<ReviewSurveyRequest>
{
    public ReviewSurveyRequestValidator()
    {
        RuleFor(x => x.Approved).NotNull();
        RuleFor(x => x.Notes).MaximumLength(2000);
    }
}
