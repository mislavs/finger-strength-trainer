using FluentValidation;

namespace TindeqTrainer.Application.Features.MaxWeights.Commands.CreateMaxWeightRecord;

public class CreateMaxWeightRecordValidator : AbstractValidator<CreateMaxWeightRecordCommand>
{
    public CreateMaxWeightRecordValidator()
    {
        RuleFor(x => x)
            .Must(x => x.LeftWeightKg is not null || x.RightWeightKg is not null)
            .WithMessage("At least one hand weight must be provided.");

        RuleFor(x => x.LeftWeightKg)
            .GreaterThan(0)
            .When(x => x.LeftWeightKg is not null);

        RuleFor(x => x.RightWeightKg)
            .GreaterThan(0)
            .When(x => x.RightWeightKg is not null);
    }
}
