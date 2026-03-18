using FluentValidation;

namespace TindeqTrainer.Application.Features.Protocols.Commands.UpdateProtocol;

public class UpdateProtocolValidator : AbstractValidator<UpdateProtocolCommand>
{
    public UpdateProtocolValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty();

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(150);

        RuleFor(x => x.WeightPercentage)
            .InclusiveBetween(0, 100);

        RuleFor(x => x.RepsPerSet)
            .GreaterThan(0);

        RuleFor(x => x.NumberOfSets)
            .GreaterThan(0);

        RuleFor(x => x.WorkSeconds)
            .GreaterThan(0);

        RuleFor(x => x.RestSeconds)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.HandSwitchSeconds)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.SetRestSeconds)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.CountdownSeconds)
            .GreaterThanOrEqualTo(0);
    }
}
