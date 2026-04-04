using FluentValidation;

namespace TindeqTrainer.Application.Features.WorkoutProtocols.Commands.UpdateWorkoutProtocol;

public class UpdateWorkoutProtocolValidator : AbstractValidator<UpdateWorkoutProtocolCommand>
{
    public UpdateWorkoutProtocolValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty();

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
