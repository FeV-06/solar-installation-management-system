using Application.DTOs.Lead;
using Application.Validators.Common;
using Domain.Common;
using Domain.Enums;
using FluentValidation;

namespace Application.Validators.Lead;

/// <summary>
/// The quote form's request. The fields the welcome email repeats (names, street, city, bill) can't hold a web or email
/// address (<see cref="WebAddressRule"/>); the note isn't repeated there, so it may.
/// </summary>
public class CreateLeadRequestValidator : AbstractValidator<CreateLeadRequest>
{
    public CreateLeadRequestValidator()
    {
        RuleFor(x => x.FirstName).IsLeadName("First name");
        RuleFor(x => x.LastName).IsLeadName("Last name");
        RuleFor(x => x.Email).IsLeadEmail();
        RuleFor(x => x.PhoneNumber).IsLeadPhone();

        RuleFor(x => x.PropertyStreet)
            .NotEmpty().WithMessage("Property street is required")
            .MaximumLength(255).WithMessage("Street cannot exceed 255 characters")
            .HasNoWebAddress("Street");

        RuleFor(x => x.PropertyCity)
            .NotEmpty().WithMessage("City is required")
            .MaximumLength(100).WithMessage("City cannot exceed 100 characters")
            .HasNoWebAddress("City");

        RuleFor(x => x.PropertyState)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("State is required")
            .Must((request, state) => string.Equals(request.PropertyCountry, "IN", StringComparison.OrdinalIgnoreCase)
                ? IndiaStates.IsCode(state) : UsStates.IsCode(state))
            .WithMessage("Choose a state or union territory valid for the property country");

        RuleFor(x => x.PropertyCountry)
            .Must(country => country is not null && (country.Equals("IN", StringComparison.OrdinalIgnoreCase) || country.Equals("US", StringComparison.OrdinalIgnoreCase)))
            .WithMessage("Country must be IN or US");

        RuleFor(x => x.PropertyZipCode)
            .NotEmpty().WithMessage("Postal code is required")
            .Must((request, code) => code is not null && (string.Equals(request.PropertyCountry, "IN", StringComparison.OrdinalIgnoreCase)
                ? System.Text.RegularExpressions.Regex.IsMatch(code, @"^[1-9]\d{5}$")
                : System.Text.RegularExpressions.Regex.IsMatch(code, @"^\d{5}(-\d{4})?$")))
            .WithMessage("Enter a valid postal code for the country");

        // Coordinates are optional, but come as a pair
        RuleFor(x => x.PropertyLatitude)
            .InclusiveBetween(-90m, 90m).WithMessage("Latitude must be between -90 and 90")
            .When(x => x.PropertyLatitude.HasValue);

        RuleFor(x => x.PropertyLongitude)
            .InclusiveBetween(-180m, 180m).WithMessage("Longitude must be between -180 and 180")
            .When(x => x.PropertyLongitude.HasValue);

        RuleFor(x => x.PropertyLongitude)
            .NotNull().WithMessage("Longitude is required when Latitude is provided")
            .When(x => x.PropertyLatitude.HasValue);

        RuleFor(x => x.PropertyLatitude)
            .NotNull().WithMessage("Latitude is required when Longitude is provided")
            .When(x => x.PropertyLongitude.HasValue);

        RuleFor(x => x.PropertyType)
            .NotEmpty().WithMessage("Property type is required")
            .Must(value => Enum.TryParse<PropertyType>(value, ignoreCase: true, out _))
            .WithMessage("Property type must be House, Apartment, or Commercial");

        RuleFor(x => x.IsPropertyOwner)
            .Equal(true).WithMessage("Solar installation is only available for property owners")
            .When(x => x.PropertyType != "Commercial");

        RuleFor(x => x.MonthlyBillRange)
            .NotEmpty().WithMessage("Monthly bill range is required")
            .HasNoWebAddress("Monthly bill range");

        RuleFor(x => x.BestTimeToContact)
            .NotEmpty().WithMessage("Best time to contact is required")
            .Must(x => new[] { "Morning", "Afternoon", "Evening" }.Contains(x))
            .WithMessage("Best time must be Morning, Afternoon, or Evening");
    }
}