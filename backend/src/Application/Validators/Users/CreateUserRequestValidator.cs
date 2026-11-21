using Application.DTOs.Users;
using FluentValidation;

namespace Application.Validators.Users;

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Name).IsAccountName();
        RuleFor(x => x.Email).IsAccountEmail();
        RuleFor(x => x.Password).FollowsPasswordRule();
        RuleFor(x => x.Role).Must(role => role is "Technician" or "Sales")
            .WithMessage("Choose Technician or Sales.");
    }
}
