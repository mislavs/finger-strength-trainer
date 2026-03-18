using FluentValidation;

namespace TindeqTrainer.Application.Features.MaxWeights.Commands.CreateMaxWeightRecord;

public class CreateMaxWeightRecordValidator : AbstractValidator<CreateMaxWeightRecordCommand>
{
    public CreateMaxWeightRecordValidator()
    {
        RuleFor(x => x.WeightKg)
            .GreaterThan(0);
    }
}
