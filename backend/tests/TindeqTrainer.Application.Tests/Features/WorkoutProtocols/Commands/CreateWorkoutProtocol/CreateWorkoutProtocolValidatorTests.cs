using FluentAssertions;
using FluentValidation.TestHelper;
using TindeqTrainer.Application.Features.WorkoutProtocols;
using TindeqTrainer.Application.Features.WorkoutProtocols.Commands.CreateWorkoutProtocol;

namespace TindeqTrainer.Application.Tests.Features.WorkoutProtocols.Commands.CreateWorkoutProtocol;

public class CreateWorkoutProtocolValidatorTests
{
    private readonly CreateWorkoutProtocolValidator _sut = new();

    [Fact]
    public void Validate_WhenInputIsValid_ShouldNotHaveErrors()
    {
        var result = _sut.TestValidate(CreateValidCommand());

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_WhenItemsAreEmpty_ShouldHaveErrorForItems()
    {
        var result = _sut.TestValidate(CreateValidCommand() with { Items = [] });

        result.ShouldHaveValidationErrorFor(x => x.Items);
    }

    [Fact]
    public void Validate_WhenItemRepeaterProtocolIdIsEmpty_ShouldHaveError()
    {
        var command = CreateValidCommand() with
        {
            Items = [new WorkoutProtocolItemInput(Guid.Empty, 1, 90)],
        };

        var result = _sut.TestValidate(command);

        result.Errors.Should().Contain(x => x.PropertyName == "Items[0].RepeaterProtocolId");
    }

    private static CreateWorkoutProtocolCommand CreateValidCommand()
        => new(
            Name: "Workout A",
            Items:
            [
                new WorkoutProtocolItemInput(Guid.NewGuid(), 1, 90),
                new WorkoutProtocolItemInput(Guid.NewGuid(), 4, 90),
            ]);
}
