using FluentValidation;

namespace TindeqTrainer.Application.Features.Protocols.Commands.CreateProtocol;

public class CreateProtocolValidator : AbstractValidator<CreateProtocolCommand>
{
    public CreateProtocolValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(150);

        RuleFor(x => x.WeightPercentage)
            .InclusiveBetween(0, 100);

        RuleFor(x => x.SetsPerHand)
            .GreaterThan(0);

        RuleFor(x => x.WorkSeconds)
            .GreaterThan(0);

        RuleFor(x => x.MaxWeightKg)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.RestSeconds)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.HandSwitchSeconds)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.CountdownSeconds)
            .GreaterThanOrEqualTo(0);
    }
}
