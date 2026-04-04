using FluentValidation;

namespace TindeqTrainer.Application.Features.WorkoutProtocols.Commands.CreateWorkoutProtocol;

public class CreateWorkoutProtocolValidator : AbstractValidator<CreateWorkoutProtocolCommand>
{
    public CreateWorkoutProtocolValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(150);

        RuleFor(x => x.Items)
            .NotEmpty();

        RuleForEach(x => x.Items)
            .ChildRules(item =>
            {
                item.RuleFor(x => x.RepeaterProtocolId)
                    .NotEmpty();

                item.RuleFor(x => x.Repetitions)
                    .GreaterThan(0);

                item.RuleFor(x => x.RestAfterSeconds)
                    .GreaterThanOrEqualTo(0);
            });
    }
}
