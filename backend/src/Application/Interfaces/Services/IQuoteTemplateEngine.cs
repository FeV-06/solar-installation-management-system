using Domain.Entities;
using Domain.Enums;

namespace Application.Interfaces.Services;

public interface IQuoteTemplateEngine
{
    Quote Generate(Installation installation, Survey? survey, decimal? requestedCapacityKw = null, SolarSystemType? requestedType = null);
}
