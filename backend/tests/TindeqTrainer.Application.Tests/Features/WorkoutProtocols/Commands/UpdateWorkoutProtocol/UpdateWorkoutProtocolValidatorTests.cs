using FluentAssertions;
using FluentValidation.TestHelper;
using TindeqTrainer.Application.Features.WorkoutProtocols;
using TindeqTrainer.Application.Features.WorkoutProtocols.Commands.UpdateWorkoutProtocol;

namespace TindeqTrainer.Application.Tests.Features.WorkoutProtocols.Commands.UpdateWorkoutProtocol;

public class UpdateWorkoutProtocolValidatorTests
{
    private readonly UpdateWorkoutProtocolValidator _sut = new();

    [Fact]
    public void Validate_WhenInputIsValid_ShouldNotHaveErrors()
    {
        var result = _sut.TestValidate(CreateValidCommand());

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_WhenIdIsEmpty_ShouldHaveErrorForId()
    {
        var result = _sut.TestValidate(CreateValidCommand() with { Id = Guid.Empty });

        result.ShouldHaveValidationErrorFor(x => x.Id);
    }

    [Fact]
    public void Validate_WhenRepetitionsAreNotPositive_ShouldHaveError()
    {
        var command = CreateValidCommand() with
        {
            Items = [new WorkoutProtocolItemInput(Guid.NewGuid(), 0, 90)],
        };

        var result = _sut.TestValidate(command);

        result.Errors.Should().Contain(x => x.PropertyName == "Items[0].Repetitions");
    }

    private static UpdateWorkoutProtocolCommand CreateValidCommand()
        => new(
            Id: Guid.NewGuid(),
            Name: "Workout A",
            Items:
            [
                new WorkoutProtocolItemInput(Guid.NewGuid(), 1, 90),
                new WorkoutProtocolItemInput(Guid.NewGuid(), 4, 90),
            ]);
}
