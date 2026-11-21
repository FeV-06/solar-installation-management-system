using Application.Common.Models;

namespace Application.Errors;

public static class SurveyErrors
{
    public static Error NotFound(int id) => new(ErrorKind.NotFound, "survey.not_found", $"Survey with ID {id} not found.");
    public static Error InstallationNotFound(int id) => new(ErrorKind.NotFound, "installation.not_found", $"Installation with ID {id} not found.");
    public static readonly Error InvalidTechnician = new(ErrorKind.Invalid, "survey.invalid_technician", "Select an active technician.", "TechnicianId");
    public static readonly Error InstallationNotInSurvey = new(ErrorKind.Conflict, "survey.installation_not_in_survey", "Surveys can only be scheduled for an installation in the Survey stage.");
    public static readonly Error ExistingSurvey = new(ErrorKind.Conflict, "survey.already_exists", "This installation already has a scheduled, submitted or approved survey.");
    public static readonly Error InvalidState = new(ErrorKind.Conflict, "survey.invalid_state", "This action is not allowed in the survey's current state.");
    public static readonly Error Changed = new(ErrorKind.Conflict, "survey.changed", "The survey or installation changed. Reload it and try again.");
}
